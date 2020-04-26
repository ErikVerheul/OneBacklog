import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const INFO = 0
const WARNING = 1
var removedProducts = []

// returns a new array so that it is reactive
function addToArray(arr, item) {
	const newArr = []
	for (let el of arr) newArr.push(el)
	newArr.push(item)
	return newArr
}
// returns a new array so that it is reactive
function removeFromArray(arr, item) {
	const newArr = []
	for (let el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

/*
* Listen for any changes in the user subscribed products made by other users and update the products tree view.
* - Select from the changes in documents of type 'backlogItem' the items with a history or comments array and a first entry tagged for distribution (exluding config, log and possibly others)
* - When a user starts multiple sessions each session has a different sessionId. These sessions are not synced.
* - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/

const mutations = {
	updateBoard(state, payload) {
		for (let s of payload.rootState.stories) {
			if (s.storyId === payload.storyId) {
				const sourceColumn = s.tasks[payload.prevState]
				const targetColumn = s.tasks[payload.newState]
				let movedTask
				const newSourceColumn = []
				for (let t of sourceColumn) {
					if (t.id === payload.taskId) {
						movedTask = t
					} else newSourceColumn.push(t)
				}
				s.tasks[payload.prevState] = newSourceColumn
				if (payload.newTaskPosition) {
					targetColumn.splice(payload.newTaskPosition, 0, movedTask)
				} else targetColumn.unshift(movedTask)
			}
		}
	}
}

const actions = {
	listenForChanges({
		rootState,
		getters,
		commit,
		dispatch
	}) {
		/*
		 * When the parentNode exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the path of the location in the tree
		 * - the index in the array of siblings the node should have based on its priority
		 */
		function getLocationInfo(newPrio, parentNode) {
			let newPath = []
			if (parentNode.children && parentNode.children.length > 0) {
				let siblings = parentNode.children
				let i = 0
				while (i < siblings.length && siblings[i].data.priority > newPrio) i++
				let prevNode = null
				if (i === 0) {
					prevNode = parentNode
					newPath = parentNode.path.slice()
					newPath.push(0)
				} else {
					prevNode = siblings[i - 1]
					newPath = prevNode.path.slice(0, -1)
					newPath.push(i)
				}
				return {
					prevNode: prevNode,
					newPath: newPath,
					newInd: i
				}
			} else {
				parentNode.children = []
				newPath = parentNode.path.slice()
				newPath.push(0)
				return {
					prevNode: parentNode,
					newPath: newPath,
					newInd: 0
				}
			}
		}

		function reportOddTimestamp(timestamp, eventName, docId) {
			if (timestamp - Date.now() > 10000) {
				let msg = `An event ${event} older than 10 seconds from another user was received. The document id is ${docId}`
				commit('showLastEvent', { txt: msg, severity: WARNING })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: WARNING })
			}
		}

		function getLevelText(level, subtype = 0) {
			if (level < 0 || level > TASKLEVEL) {
				return 'Level not supported'
			}
			if (level === PBILEVEL) {
				return getSubType(subtype)
			}
			return rootState.configData.itemType[level]
		}

		function getSubType(idx) {
			if (idx < 0 || idx >= rootState.configData.subtype.length) {
				return 'Error: unknown subtype'
			}
			return rootState.configData.subtype[idx]
		}

		// stop listening if offline. watchdog will start it automatically when online again
		if (rootState.stopListenForChanges || !rootState.online) return

		let url = rootState.userData.currentDb + '/_changes?feed=longpoll&include_docs=true&since=now'
		rootState.listenForChangesRunning = true
		globalAxios({
			method: 'GET',
			url: url,
		}).then(res => {
			let data = res.data
			//eslint-disable-next-line no-console
			if (rootState.debug) console.log('listenForChanges: time = ' + new Date(Date.now()))
			for (let r of data.results) {
				let doc = r.doc
				// if (doc.type == "backlogItem") console.log('listenForChanges-test: document with _id ' + doc._id + ' is processed, priority = ' + doc.priority +
				// ' lastHistType = ' + Object.keys(doc.history[0])[0] + ' history timestamp = ' + String(new Date(doc.history[0].timestamp)).substring(0, 24) +
				// ' comments timestamp = ' + String(new Date(doc.comments[0].timestamp)).substring(0, 24) + ' title = ' + doc.title)

				if (doc.type == "backlogItem" && (doc.history[0].distributeEvent || doc.comments[0].distributeEvent)) {
					const lastHistObj = doc.history[0]
					// ToDo: remove this and solve it on the detail level
					if (rootState.currentView === 'coarseProduct' && doc.level > FEATURELEVEL) {
						// skip level changes above feature level when in products overview
						continue
					}
					if (doc.history[0].sessionId !== rootState.userData.sessionId &&
						rootState.userData.myProductSubscriptions.includes(doc.productId) ||
						removedProducts.map(item => item.id).indexOf(doc._id) !== -1) {

						dispatch('doBlinck', doc)

						const treeInview = rootState.currentView === 'coarseProduct' || rootState.currentView === 'detailProduct'
						const documentInView = treeInview && doc._id === rootState.currentDoc._id
						// get data from last history addition
						const lastHistoryTimestamp = lastHistObj.timestamp
						const histEvent = Object.keys(lastHistObj)[0]
						// show the history update
						if (documentInView) rootState.currentDoc.history = doc.history
						if (treeInview) {
							const node = window.slVueTree.getNodeById(doc._id)
							// process comments
							if (doc.comments[0].distributeEvent && (!lastHistObj.distributed || doc.comments[0].timestamp > lastHistoryTimestamp)) {
								const commentsEvent = Object.keys(doc.comments[0])[0]
								reportOddTimestamp(doc.comments[0].timestamp, commentsEvent, doc._id)
								switch (commentsEvent) {
									case 'addCommentEvent':
										node.data.lastCommentAddition = doc.comments[0].timestamp
										// show the comments update
										if (documentInView) rootState.currentDoc.comments = doc.comments
										break
								}
								// nothing else to do when processing a comments change
								continue
							}
							// check for exception
							if (node === null && histEvent !== 'docRestoredEvent' && histEvent !== 'createEvent') {
								commit('showLastEvent', { txt: `Another user changed item ${doc._id.slice(-5)} which is missing in your view`, severity: WARNING })
								let msg = 'sync: cannot find node with id = ' + doc._id
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log(msg)
								dispatch('doLog', { event: msg, level: WARNING })
								continue
							}
							reportOddTimestamp(doc.history[0].timestamp, histEvent, doc._id)
							// process other events for tree views
							switch (histEvent) {
								case 'acceptanceEvent':
									if (documentInView) {
										commit('updateCurrentDoc', { acceptanceCriteria: doc.acceptanceCriteria })
										node.data.lastContentChange = lastHistoryTimestamp
									}
									break
								case 'commentToHistoryEvent':
									if (documentInView) {
										rootState.currentDoc.history = doc.history
										node.data.lastCommentToHistory = doc.history[0].timestamp
									}
									break
								case 'createEvent':
									if (node === null) {
										// node is newly created
										const parentNode = window.slVueTree.getNodeById(doc.parentId)
										if (parentNode === null) {
											let msg = 'listenForChanges: no parent node available yet - doc.productId = ' +
												doc.productId + ' doc.parentId = ' + doc.parentId + ' doc._id = ' + doc._id + ' title = ' + doc.title
											// eslint-disable-next-line no-console
											if (rootState.debug) console.log(msg)
											dispatch('doLog', { event: msg, level: WARNING })
											continue
										}
										// create the node
										const locationInfo = getLocationInfo(doc.priority, parentNode)
										let newNode = {
											"path": locationInfo.newPath,
											"pathStr": JSON.stringify(locationInfo.newPath),
											"ind": locationInfo.newInd,
											"level": locationInfo.newPath.length,

											"productId": doc.productId,
											"parentId": doc.parentId,
											"sprintId": doc.sprintId,
											"_id": doc._id,
											"shortId": doc._id.slice(-5),
											"dependencies": doc.dependencies || [],
											"conditionalFor": doc.conditionalFor || [],
											"title": doc.title,
											"isLeaf": (locationInfo.newPath.length < getters.leafLevel) ? false : true,
											"children": [],
											"isSelected": false,
											"isExpanded": true,
											"savedIsExpanded": true,
											"isSelectable": true,
											"isDraggable": doc.level > PRODUCTLEVEL,
											"doShow": true,
											"savedDoShow": true,
											"data": {
												state: doc.state,
												subtype: 0,
												priority: undefined,
												team: doc.team,
												lastPositionChange: 0,
												lastStateChange: 0,
												lastContentChange: 0,
												lastCommentAddition: 0,
												lastAttachmentAddition: 0,
												lastCommentToHistory: 0,
												lastChange: lastHistoryTimestamp
											}
										}
										window.slVueTree.insert({
											nodeModel: locationInfo.prevNode,
											placement: locationInfo.newInd === 0 ? 'inside' : 'after'
										}, [newNode])
									}
									break
								case 'conditionRemovedEvent':
									{
										const removedCondId = doc._id
										const node = window.slVueTree.getNodeById(removedCondId)
										if (node === null) break

										const newCons = []
										for (let id of doc.conditionalFor) {
											if (id !== removedCondId) newCons.push(id)
										}
										node.conditionalFor = newCons
										const removedIds = lastHistObj.conditionRemovedEvent[0]
										// update the dependencies in the tree
										for (let id of removedIds) {
											const node = window.slVueTree.getNodeById(id)
											if (node === null) break

											const depsIdArray = []
											for (let depId of node.dependencies) {
												if (depId !== removedCondId) depsIdArray.push(depId)
											}
											node.dependencies = depsIdArray
										}
									}
									break
								case 'dependencyRemovedEvent':
									{
										const removedDepId = doc._id
										const node = window.slVueTree.getNodeById(removedDepId)
										if (node === null) break

										const newDeps = []
										for (let id of doc.dependencies) {
											if (id !== removedDepId) newDeps.push(id)
										}
										node.dependencies = newDeps
										const removedIds = lastHistObj.dependencyRemovedEvent[0]
										// update the conditions in the tree
										for (let id of removedIds) {
											const node = window.slVueTree.getNodeById(id)
											if (node === null) break

											const conIdArray = []
											for (let condId of node.conditionalFor) {
												if (condId !== removedDepId) conIdArray.push(condId)
											}
											node.conditionalFor = conIdArray
										}
									}
									break
								case 'descriptionEvent':
									if (documentInView) {
										commit('updateCurrentDoc', { description: doc.description })
										node.data.lastContentChange = lastHistoryTimestamp
									}
									break
								case 'docRestoredEvent':
									{	// node	is restored from a previous removal
										if (lastHistObj.by === rootState.userData.user) {
											// re-enter the product to the users product roles, subscriptions, product ids and product selection array
											commit('showLastEvent', { txt: `You restored a removed ${getLevelText(doc.level, doc.subtype)} in another session`, severity: INFO })
											rootState.userData.myProductsRoles[doc._id] = lastHistObj['docRestoredEvent'][5]
											rootState.userData.myProductSubscriptions = addToArray(rootState.userData.myProductSubscriptions, doc._id)
											rootState.userData.userAssignedProductIds = addToArray(rootState.userData.userAssignedProductIds, doc._id)
											rootState.myProductOptions.push({
												value: doc._id,
												text: doc.title
											})
										} else commit('showLastEvent', { txt: `Another user restored a removed ${getLevelText(doc.level, doc.subtype)}`, severity: INFO })
										dispatch('restoreBranch', doc)
									}
									break
								case 'nodesMovedEvent':
									{
										const targetParentId = lastHistObj['nodesMovedEvent'][0]
										// console.log("sync.nodesMovedEvent: lastHistObj['nodesMovedEvent'] = " + JSON.stringify(lastHistObj['nodesMovedEvent'], null, 2))
										const parentNode = window.slVueTree.getNodeById(targetParentId)
										if (parentNode === null) return false

										for (let item of lastHistObj['nodesMovedEvent'][1]) {
											const node = window.slVueTree.getNodeById(item.id)
											let locationInfo = getLocationInfo(item.newlyCalculatedPriority, parentNode)
											if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) !== 0) {
												// move the node to the new position w/r to its siblings; first remove the node, then insert
												window.slVueTree.remove([node])
												node.data.priority = item.newlyCalculatedPriority
												// do not recalculate the priority during insert
												if (locationInfo.newInd === 0) {
													window.slVueTree.insert({
														nodeModel: locationInfo.prevNode,
														placement: 'inside'
													}, [node], false)
												} else {
													// insert after prevNode
													window.slVueTree.insert({
														nodeModel: locationInfo.prevNode,
														placement: 'after'
													}, [node], false)
												}
												if (lastHistObj['nodesMovedEvent'][2] == 'move') node.data.lastPositionChange = lastHistoryTimestamp
												if (lastHistObj['nodesMovedEvent'][2] == 'undoMove') node.data.lastPositionChange = 0
											}
										}
									}
									break
								case 'removeAttachmentEvent':
									node.data.lastAttachmentAddition = 0
									break
								case 'updateParentHistEvent':
									if (doc.delmark) {
										// remove any dependency references to/from outside the removed items
										window.slVueTree.correctDependencies(lastHistObj.updateParentHistEvent[0], lastHistObj.updateParentHistEvent[1])
										if (node) {
											window.slVueTree.remove([node])
											if (lastHistObj.by === rootState.userData.user) {
												commit('showLastEvent', {
													txt: `You removed a ${getLevelText(doc.level, doc.subtype)} in another session`, severity: INFO
												})
												if (node.level === PRODUCTLEVEL) {
													// save some data of the removed product for restore at undo.
													removedProducts.unshift({ id: node._id, productRoles: rootState.userData.myProductsRoles[node._id] })
													// remove the product from the users product roles, subscriptions and product selection array
													delete rootState.userData.myProductsRoles[node._id]
													if (rootState.userData.myProductSubscriptions.includes(node._id)) {
														rootState.userData.myProductSubscriptions = removeFromArray(rootState.userData.myProductSubscriptions, node._id)
														rootState.userData.userAssignedProductIds = removeFromArray(rootState.userData.userAssignedProductIds, node._id)
														const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(node._id)
														rootState.myProductOptions.splice(removeIdx, 1)
													}
												}
											} else commit('showLastEvent', { txt: `Another user removed a ${getLevelText(doc.level, doc.subtype)}`, severity: INFO })
										}
										// nothing else to do after removing the node
										continue
									}
									break
								case 'setConditionsEvent':
									node.conditionalFor = doc.conditionalFor
									if (documentInView) rootState.currentDoc.conditionalFor = doc.conditionalFor
									break
								case 'setDependenciesEvent':
									node.dependencies = doc.dependencies
									if (documentInView) rootState.currentDoc.dependencies = doc.dependencies
									break
								case 'setHrsEvent':
									if (documentInView) rootState.currentDoc.spikepersonhours = doc.spikepersonhours
									break
								case 'setPointsEvent':
									if (documentInView) rootState.currentDoc.spsize = doc.spsize
									break
								case 'setSizeEvent':
									if (documentInView) rootState.currentDoc.tssize = doc.tssize
									break
								case 'setStateEvent':
									node.data.state = doc.state
									node.data.lastStateChange = lastHistoryTimestamp
									if (documentInView) rootState.currentDoc.state = doc.state
									break
								case 'setSubTypeEvent':
									node.data.subtype = doc.subtype
									if (documentInView) rootState.currentDoc.subtype = doc.subtype
									break
								case 'setTeamOwnerEvent':
									node.data.team = doc.team
									if (documentInView) rootState.currentDoc.team = doc.team
									break
								case 'setTitleEvent':
									node.title = doc.title
									node.data.lastContentChange = lastHistoryTimestamp
									if (documentInView) rootState.currentDoc.title = doc.title
									break
								case 'uploadAttachmentEvent':
									node.data.lastAttachmentAddition = lastHistoryTimestamp
									break
								case 'addSprintIdsEvent':
									node.sprintId = doc.sprintId
									if (documentInView) rootState.currentDoc.sprintId = doc.sprintId
									break
								case 'removeSprintIdsEvent':
									node.sprintId = undefined
									if (documentInView) rootState.currentDoc.sprintId = undefined
									break
								default:
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('sync.detailProduct: event not found, name = ' + histEvent)
							}
						}
						// process events for the planning board
						if (rootState.currentView === 'planningBoard') {
							switch (histEvent) {
								case 'updateTaskOrderEvent':
									{
										const taskUpdates = lastHistObj['updateTaskOrderEvent']
										rootState.stories[taskUpdates.idx].tasks[taskUpdates.id] = taskUpdates.tasks
									}
									break
								case 'setStateEvent':
									{
										const prevState = lastHistObj.setStateEvent[0]
										const newTaskPosition = lastHistObj.setStateEvent[3]
										commit('updateBoard', { rootState, storyId: doc.parentId, taskId: doc._id, prevState, newState: doc.state, newTaskPosition })
									}
									break
								default:
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('sync.planningBoard: event not found, name = ' + histEvent)
							}
						}
					}
				}
			} // end of loop
			// recurse
			dispatch('listenForChanges')
		}).catch(error => {
			let msg = 'Listening for changes made by other users failed with ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: WARNING })
			rootState.listenForChangesRunning = false
		})
	},

	doBlinck({
		rootState
	}, doc) {
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('listenForChanges: document with _id ' + doc._id + ' is processed, priority = ' + doc.priority +
			' lastHistType = ' + Object.keys(doc.history[0])[0] + ' history timestamp = ' + String(new Date(doc.history[0].timestamp)).substring(0, 24) +
			' comments timestamp = ' + String(new Date(doc.comments[0].timestamp)).substring(0, 24) + ' title = ' + doc.title)
		rootState.eventSyncColor = '#e6f7ff'
		setTimeout(function () {
			rootState.eventSyncColor = '#004466'
		}, 1000)
	}
}

export default {
	mutations,
	actions
}
