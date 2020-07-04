import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be processed again)

const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const INFO = 0
const WARNING = 1
const REMOVED = 0
const ON_HOLD = 1
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
* - When a user starts multiple sessions each session has a different sessionId. These sessions are synced also.
* - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone.
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/

const actions = {
	processDoc({
		rootState,
		getters,
		commit,
		dispatch
	}, doc) {
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
					prevNode,
					newPath,
					newInd: i
				}
			} else {
				parentNode.children = []
				newPath = parentNode.path.slice()
				newPath.push(0)
				return {
					prevNode: parentNode,
					newPath,
					newInd: 0
				}
			}
		}

		function reportOddTimestamp(event, docId) {
			if (Date.now() - event.timestamp > 1000) {
				let msg = `Received event '${Object.keys(event)[0]}' from user ${event.by}. The event is older than 1 second.`
				commit('showLastEvent', { txt: msg, severity: WARNING })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg + ` The document id is ${docId}.`)
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

		async function doProc(doc) {
			try {
				const updateTree = histEvent !== 'ignoreEvent' && doc.level <= rootState.loadedTreeDepth
				// update the tree only for documents available in the currently loaded tree model
				const updateBoard = histEvent !== 'ignoreEvent' && rootState.currentView === 'planningBoard' &&
					(doc.team === rootState.userData.myTeam || histEvent === 'setTeamOwnerEvent' || histEvent === 'triggerBoardReload')
				// update the board only if loaded and the item represented by the document is assigned to my team. Exceptions for events:
				// - setTeamOwnerEvent: also update the board if an item changes team (the doc is assigned to another team or no team)
				// - triggerBoardReload: also trigger a reload from the feature level (the doc is the feature parent and has no team ownership)

				if (updateTree) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('sync:updateTree with event ' + histEvent)
					// process events on tree items that are loaded (eg. 'products overview' has no pbi and task items)
					const isCurrentDocument = doc._id === rootState.currentDoc._id
					if (isCurrentDocument) {
						// replace the history of the currently opened document
						rootState.currentDoc.history = doc.history
					}
					let node = window.slVueTree.getNodeById(doc._id)
					// process comments
					if (doc.comments[0].distributeEvent && (!lastHistObj.distributed || doc.comments[0].timestamp > lastHistoryTimestamp)) {
						const commentsEvent = Object.keys(doc.comments[0])[0]
						reportOddTimestamp(doc.comments[0], doc._id)
						switch (commentsEvent) {
							case 'addCommentEvent':
								node.data.lastCommentAddition = doc.comments[0].timestamp
								// show the comments update
								if (isCurrentDocument) rootState.currentDoc.comments = doc.comments
								break
						}
						// nothing else to do when processing a comments change
						return
					}
					// check for exception
					if (node === null && histEvent !== 'docRestoredEvent' && histEvent !== 'createEvent' && histEvent !== 'createTaskEvent') {
						commit('showLastEvent', { txt: `Another user changed item ${doc._id.slice(-5)} which is missing in your view`, severity: WARNING })
						dispatch('doLog', { event: 'sync: cannot find node with id = ' + doc._id, level: WARNING })
						return
					}
					reportOddTimestamp(doc.history[0], doc._id)
					// process other events for tree views
					switch (histEvent) {
						case 'acceptanceEvent':
							commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: doc.acceptanceCriteria, lastContentChange: doc.lastContentChange })
							break
						case 'commentToHistoryEvent':
							commit('updateNodesAndCurrentDoc', { node, lastCommentToHistory: doc.lastCommentToHistory })
							break
						case 'createTaskEvent':
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
									return
								}
								// create the node
								const locationInfo = getLocationInfo(doc.priority, parentNode)
								node = {
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
										sprintId: doc.sprintId,
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
								}, [node])
								// not committing any changes to the tree model. As the user has to navigate to the new node the data will be loaded.
							}
							break
						case 'conditionRemovedEvent':
							commit('updateNodesAndCurrentDoc', { node, conditionsremoved: doc.conditionalFor, lastChange: doc.lastChange })
							break
						case 'dependencyRemovedEvent':
							commit('updateNodesAndCurrentDoc', { node, dependenciesRemoved: doc.dependencies, lastChange: doc.lastChange })
							break
						case 'descriptionEvent':
							commit('updateNodesAndCurrentDoc', { node, description: doc.description, lastHistoryTimestamp: node.data.lastContentChange })
							break
						case 'docRestoredEvent':
							{
								commit('showLastEvent', { txt: `Busy restoring ${getLevelText(doc.level, doc.subtype)} as initiated in another session...`, severity: INFO })
								let toDispatch = undefined
								if (updateBoard && doc.level !== TASKLEVEL) {
									// postpone the board update until the document is restored
									toDispatch = { 'loadPlanningBoard': { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam } }
								}
								dispatch('restoreBranch', {
									doc, toDispatch, onSuccessCallback: () => {
										if (doc.level === PRODUCTLEVEL) {
											// re-enter the product to the users product roles, subscriptions, product ids and product selection array
											rootState.userData.myProductsRoles[doc._id] = lastHistObj.docRestoredEvent[5]
											rootState.userData.myProductSubscriptions = addToArray(rootState.userData.myProductSubscriptions, doc._id)
											rootState.userData.userAssignedProductIds = addToArray(rootState.userData.userAssignedProductIds, doc._id)
											rootState.myProductOptions.push({
												value: doc._id,
												text: doc.title
											})
										}
										if (lastHistObj.by === rootState.userData.user) {
											commit('showLastEvent', { txt: `You restored a removed ${getLevelText(doc.level, doc.subtype)} in another session`, severity: INFO })
										} else commit('showLastEvent', { txt: `Another user restored a removed ${getLevelText(doc.level, doc.subtype)}`, severity: INFO })
									}
								})
							}
							break
						case 'nodeMovedEvent':
							{
								const parentNode = window.slVueTree.getNodeById(doc.parentId)
								if (parentNode === null) break
								const item = lastHistObj.nodeMovedEvent
								if (item[1] > rootState.loadedTreeDepth) {
									// skip items that are not available in the tree
									return
								}
								const node = window.slVueTree.getNodeById(doc._id)
								if (node.level === PBILEVEL || node.level === TASKLEVEL) node.data.sprintId = item[12]
								let locationInfo = getLocationInfo(item[10], parentNode)
								if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) !== 0) {
									// move the node to the new position w/r to its siblings; first remove the node, then insert
									window.slVueTree.remove([node])
									node.data.priority = item[10]
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
									if (item[13] == 'move') commit('updateNodesAndCurrentDoc', { node, lastPositionChange: lastHistoryTimestamp })
									if (item[13] == 'undoMove') commit('updateNodesAndCurrentDoc', { node, lastPositionChange: item[14] })
								}
							}
							break
						case 'removeAttachmentEvent':
							commit('updateNodesAndCurrentDoc', { node, lastAttachmentAddition: 0 })
							break
						case 'removedWithDescendantsEvent':
							if (node && doc.delmark) {
								// remove any dependency references to/from outside the removed items
								window.slVueTree.correctDependencies(lastHistObj.removedWithDescendantsEvent[0], lastHistObj.removedWithDescendantsEvent[1])
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
								window.slVueTree.remove([node])
								if (lastHistObj.by === rootState.userData.user) {
									commit('showLastEvent', { txt: `You removed a ${getLevelText(doc.level, doc.subtype)} in another session`, severity: INFO })
								} else commit('showLastEvent', { txt: `Another user removed a ${getLevelText(doc.level, doc.subtype)}`, severity: INFO })
							}
							break
						case 'setConditionEvent':
							if (lastHistObj.setConditionEvent[2]) {
								// undo single addition
								commit('updateNodesAndCurrentDoc', { node, removeLastConditionalFor: null, lastChange: doc.lastChange })
							} else commit('updateNodesAndCurrentDoc', { node, addConditionalFor: doc.conditionalFor.slice(-1), lastChange: doc.lastChange })
							break
						case 'setDependencyEvent':
							if (lastHistObj.setDependencyEvent[2]) {
								// undo single addition
								commit('updateNodesAndCurrentDoc', { node, removeLastDependencyOn: null, lastChange: doc.lastChange })
							} else commit('updateNodesAndCurrentDoc', { node, addDependencyOn: doc.dependencies.slice(-1), lastChange: doc.lastChange })
							break
						case 'setHrsEvent':
							commit('updateNodesAndCurrentDoc', { node, spikepersonhours: doc.spikepersonhours, lastChange: doc.lastChange })
							break
						case 'setPointsEvent':
							commit('updateNodesAndCurrentDoc', { node, spsize: doc.spsize, lastChange: doc.lastChange })
							break
						case 'setSizeEvent':
							commit('updateNodesAndCurrentDoc', { node, tssize: doc.tssize, lastChange: doc.lastChange })
							break
						case 'setStateEvent':
							commit('updateNodesAndCurrentDoc', { node, state: doc.state, lastStateChange: doc.lastStateChange })
							break
						case 'setSubTypeEvent':
							commit('updateNodesAndCurrentDoc', { node, subtype: doc.subtype, lastChange: doc.lastChange })
							break
						case 'setTeamOwnerEvent':
							commit('updateNodesAndCurrentDoc', { node, team: doc.team, lastChange: doc.lastChange })
							break
						case 'setTitleEvent':
							commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
							break
						case 'uploadAttachmentEvent':
							commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastAttachmentAddition: doc.lastAttachmentAddition })
							break
						case 'addSprintIdsEvent':
							commit('updateNodesAndCurrentDoc', { node, sprintId: doc.sprintId, lastChange: doc.lastChange })
							break
						case 'removeSprintIdsEvent':
							commit('updateNodesAndCurrentDoc', { node, sprintId: undefined, lastChange: doc.lastChange })
							break
						/////////////////////////////// changes originating from planning board ///////////////////////////////////////////////////////
						case 'taskRemovedEvent':
							commit('updateNodesAndCurrentDoc', { node, state: REMOVED, lastStateChange: Date.now() })
							break
						case 'updateTaskOrderEvent':
							if (rootState.lastTreeView === 'detailProduct') {
								// update the position of the tasks of the story and update the index and priority values in the tree
								const afterMoveIds = lastHistObj.updateTaskOrderEvent.afterMoveIds
								const storyNode = window.slVueTree.getNodeById(doc._id)
								if (!storyNode) return

								const mapper = []
								for (let c of storyNode.children) {
									if (afterMoveIds.includes(c._id)) {
										mapper.push({ child: c, priority: c.data.priority, reordered: true })
									} else mapper.push({ child: c, reordered: false })
								}
								const newTreeChildren = []
								let ind = 0
								let afterMoveIdx = 0
								for (let m of mapper) {
									if (!m.reordered) {
										newTreeChildren.push(m.child)
									} else {
										for (let c of storyNode.children) {
											if (c._id === afterMoveIds[afterMoveIdx]) {
												c.ind = ind
												c.data.priority = m.priority
												newTreeChildren.push(c)
												afterMoveIdx++
												break
											}
										}
									}
									ind++
								}
								storyNode.children = newTreeChildren
							}
							break
						default:
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log('sync.trees: event not found, name = ' + histEvent)
					}
				}

				if (updateBoard) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('sync:updateBoard with event ' + histEvent)
					// process events for the planning board
					switch (histEvent) {
						case 'createEvent':
						case 'createTaskEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								if (doc.level === TASKLEVEL) {
									// a new task is created on another user's product details view or board
									commit('addTaskToBoard', doc)
								} else if (doc.level === PBILEVEL) {
									// a user story is created
									dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
								}
							}
							break
						case 'docRestoredEvent':
							{
								const involvedSprintIds = [doc.sprintId].concat(lastHistObj.docRestoredEvent[6])
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// one or more of the removed items or their descendants assigned to the loaded sprint are restored
									if (doc.level === TASKLEVEL) {
										// a task removal is undone from a user story currently on the planning board
										commit('addTaskToBoard', doc)
									}
								}
							}
							break
						case 'nodeMovedEvent':
							{
								const item = lastHistObj.nodeMovedEvent
								const sourceSprintId = item[11]
								const targetSprintId = item[12]
								const involvedSprintIds = [doc.sprintId].concat([sourceSprintId]).concat([targetSprintId]).concat(window.slVueTree.getDescendantsInfoOnId(doc._id).sprintIds)
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// the item is moved in, within or out of the loaded sprint
									const sourceLevel = item[0]
									const targetLevel = item[1]
									const sourceParentId = item[7]
									const targetParentId = item[8]
									const newlyCalculatedPriority = item[10]

									if (sourceLevel === TASKLEVEL && targetLevel === TASKLEVEL && sourceParentId === targetParentId) {
										// move position of items within the same user story
										let tasks
										for (let s of rootState.stories) {
											if (s.storyId === targetParentId) {
												const columnKeys = Object.keys(s.tasks)
												for (let ck of columnKeys) {
													if (targetSprintId === rootState.loadedSprintId) {
														for (let t of s.tasks[ck]) {
															// move position of the item within the same task column
															if (t.id === doc._id) {
																t.priority = newlyCalculatedPriority
																tasks = s.tasks[ck]
																break
															}
														}
													}
												}
												if (tasks) break
											}
										}
										tasks.sort((a, b) => b.priority - a.priority)
									} else {
										// the item was moved to another user story in or out of this sprint
										dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
									}
								}
							}
							break
						case 'removedWithDescendantsEvent':
							{
								const involvedSprintIds = [doc.sprintId].concat(lastHistObj.removedWithDescendantsEvent[4])
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// REMOVED state items are not on the board anyway
									if (doc.state !== REMOVED) {
										// the item or its descendants are no longer assigned to the loaded sprint and must be removed from the board
										if (doc.level === TASKLEVEL) {
											// a task is removed from a user story currently displayed on the planning board
											for (let s of rootState.stories) {
												if (s.storyId === doc.parentId) {
													const newArray = []
													for (let t of s.tasks[doc.state]) {
														if (t.id !== doc._id) newArray.push(t)
													}
													s.tasks[doc.state] = newArray
													break
												}
											}
										} else {
											// a user story is removed from the planning board
											dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
										}
									}
								}
							}
							break
						case 'updateTaskOrderEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								const taskUpdates = lastHistObj.updateTaskOrderEvent.taskUpdates
								rootState.stories[taskUpdates.idx].tasks[taskUpdates.state] = taskUpdates.tasks
							}
							break
						case 'setPointsEvent':
							if (doc.sprintId === rootState.loadedSprintId && doc.level === PBILEVEL) {
								for (let s of rootState.stories) {
									if (s.storyId === doc._id) {
										s.size = doc.spsize
										break
									}
								}
							}
							break
						case 'setStateEvent':
							if (doc.sprintId === rootState.loadedSprintId && doc.level === TASKLEVEL) {
								const prevState = lastHistObj.setStateEvent[0]
								if (prevState === REMOVED || prevState === ON_HOLD) {
									commit('addTaskToBoard', doc)
								} else if (doc.state === REMOVED || doc.state === ON_HOLD) {
									commit('removeTaskFromBoard', { prevState, doc })
								} else {
									const newTaskPosition = lastHistObj.setStateEvent[3]
									for (let s of rootState.stories) {
										if (s.storyId === doc.parentId) {
											const sourceColumn = s.tasks[prevState]
											const targetColumn = s.tasks[doc.state]
											let movedTask
											const newSourceColumn = []
											for (let t of sourceColumn) {
												if (t.id === doc._id) {
													movedTask = t
												} else newSourceColumn.push(t)
											}
											if (movedTask) {
												s.tasks[prevState] = newSourceColumn
												if (newTaskPosition !== 0) {
													targetColumn.splice(newTaskPosition, 0, movedTask)
												} else targetColumn.unshift(movedTask)
											}
											break
										}
									}
								}
							}
							break
						case 'setSubTypeEvent':
							if (doc.sprintId === rootState.loadedSprintId && doc.level === PBILEVEL) {
								for (let s of rootState.stories) {
									if (s.storyId === doc._id) {
										s.subType = doc.subtype
										break
									}
								}
							}
							break
						case 'setTeamOwnerEvent':
							// the item is now owned by my team. ToDo: if the item is a task, insert direct without reload
							dispatch('loadPlanningBoard', { sprintId: doc.sprintId, team: rootState.userData.myTeam })
							break
						case 'setTitleEvent':
							if (doc.sprintId === rootState.loadedSprintId)
								switch (doc.level) {
									case FEATURELEVEL:
										for (let s of rootState.stories) {
											if (s.featureId === doc._id) {
												s.featureName = doc.title
												break
											}
										}
										break
									case PBILEVEL:
										for (let s of rootState.stories) {
											if (s.storyId === doc._id) {
												s.title = doc.title
												break
											}
										}
										break
									case TASKLEVEL:
										for (let s of rootState.stories) {
											if (s.storyId === doc.parentId) {
												const tasks = s.tasks
												const targetColumn = tasks[doc.state]
												for (let t of targetColumn) {
													if (t.id === doc._id) {
														t.title = doc.title
														break
													}
												}
												break
											}
										}
										break
								}
							break
						case 'taskRemovedEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								const prevState = lastHistObj.taskRemovedEvent[1]
								commit('removeTaskFromBoard', { prevState, doc })
							}
							break
						default:
							if (doc.sprintId === rootState.loadedSprintId) {
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log('sync.planningBoard: event not found, name = ' + histEvent)
							}
					}
				}
			} catch (error) {
				let msg = 'Listening for changes made by other users failed while processing document with id ' + doc._id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: WARNING })
			}
		}

		const lastHistObj = doc.history[0]
		// get data from last history addition
		const lastHistoryTimestamp = lastHistObj.timestamp
		const histEvent = Object.keys(lastHistObj)[0]

		// boardReloadEvent: this event is passed via the 'messenger' dummy backlogitem, the team name is in the message not in the doc
		if (histEvent === 'boardReloadEvent') {
			// always process this event
			const sprintId = lastHistObj.boardReloadEvent[0]
			const team = lastHistObj.boardReloadEvent[1]
			if (sprintId === rootState.loadedSprintId && team === rootState.userData.myTeam) {
				dispatch('doBlinck', doc)
				dispatch('loadPlanningBoard', { sprintId, team: rootState.userData.myTeam })
			}
		} else if (rootState.userData.myProductSubscriptions.includes(doc.productId) || removedProducts.map(item => item.id).indexOf(doc._id) !== -1) {
			// only load product items the user is authorised to including products that are restored from deletion by this user
			dispatch('doBlinck', doc)
			doProc(doc)
		}
	},

	doBlinck({
		rootState
	}, doc) {
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('listenForChanges: document with _id ' + doc._id + ' is processed, current view = ' + rootState.currentView + ' priority = ' + doc.priority +
			' lastHistType = ' + Object.keys(doc.history[0])[0] + ' history timestamp = ' + String(new Date(doc.history[0].timestamp)).substring(0, 24) +
			' comments timestamp = ' + String(new Date(doc.comments[0].timestamp)).substring(0, 24) + ' title = ' + doc.title)
		rootState.eventSyncColor = '#e6f7ff'
		setTimeout(function () {
			rootState.eventSyncColor = '#004466'
		}, 1000)
	},

	/* Listen for document changes and process in parallel */
	listenForChanges({
		rootState,
		dispatch
	}) {
		// stop listening if offline. watchdog will start it automatically when online again
		if (rootState.stopListenForChanges || !rootState.online) return

		let url = rootState.userData.currentDb + '/_changes?feed=longpoll&include_docs=true&since=now'
		rootState.listenForChangesRunning = true
		globalAxios({
			method: 'GET',
			url: url,
		}).then(res => {
			// to avoid missing changes immediately check for additional changes
			dispatch('listenForChanges')
			let data = res.data
			for (let r of data.results) {
				let doc = r.doc
				if (doc.type == "backlogItem" && (doc.history[0].sessionId !== rootState.userData.sessionId && (doc.history[0].distributeEvent || doc.comments[0].distributeEvent))) {
					// filter on distributed events in backlog items from other sessions (not the session that created the events)
					dispatch('processDoc', doc)
				}
			}
		}).catch(error => {
			let msg = 'Listening for changes made by other users failed with ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: WARNING })
			rootState.listenForChangesRunning = false
		})
	}
}

export default {
	actions
}
