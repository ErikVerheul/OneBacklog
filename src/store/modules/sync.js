import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const PRODUCTLEVEL = 2
const PBILEVEL = 5
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
* The documents are fltered by the view=design1/changesFilter filter.
* Subsequent filtering in doe in this routine:
* - When a user starts multiple sessions each session has a different sessionId. These sessions are not synced.
* - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/

const actions = {
	listenForChanges({
		rootState,
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

		// stop listening if offline. watchdog will start it automatically when online again
		if (!rootState.online) return

		let url = rootState.userData.currentDb + '/_changes?feed=longpoll&include_docs=true&filter=_view&view=design1/changesFilter&since=now'
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
				if (doc.history[0].sessionId !== rootState.userData.sessionId &&
					rootState.userData.myProductSubscriptions.includes(doc.productId) ||
					removedProducts.map(item => item.id).indexOf(doc._id) !== -1) {

					dispatch('doBlinck', doc)

					const node = window.slVueTree.getNodeById(doc._id)
					const documentInView = doc._id === rootState.currentDoc._id
					// process comments
					if (doc.comments[0].distributeEvent && (!doc.history[0].distributed || doc.comments[0].timestamp > doc.history[0].timestamp)) {
						const commentsEvent = Object.keys(doc.comments[0])[0]
						reportOddTimestamp(doc.comments[0].timestamp, commentsEvent, doc._id)
						switch (commentsEvent) {
							case 'addCommentEvent':
								// show the comments update
								if (documentInView) rootState.currentDoc.comments = doc.comments
								node.data.lastCommentAddition = doc.comments[0].timestamp
								break
						}
						// nothing else to do when processing a comments change
						continue
					}
					// process history
					const lastHistObj = doc.history[0]
					// console.log('sync: lastHistObj = ' + JSON.stringify(lastHistObj, null, 2))
					const lastHistoryTimestamp = lastHistObj.timestamp
					const histEvent = Object.keys(lastHistObj)[0]
					if (node === null && histEvent !== 'docRestoredEvent' && histEvent !== 'createEvent') {
						commit('showLastEvent', { txt: `Another user changed item ${doc._id.slice(-5)} which is missing in your view`, severity: WARNING })
						let msg = 'sync: cannot find node with id = ' + doc._id
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log(msg)
						dispatch('doLog', { event: msg, level: WARNING })
						continue
					}
					reportOddTimestamp(doc.history[0].timestamp, histEvent, doc._id)
					switch (histEvent) {
						case 'acceptanceEvent':
							if (documentInView) {
								rootState.currentDoc.acceptanceCriteria = window.atob(doc.acceptanceCriteria)
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
									"_id": doc._id,
									"shortId": doc.shortId,
									"dependencies": doc.dependencies || [],
									"conditionalFor": doc.conditionalFor || [],
									"title": doc.title,
									"isLeaf": (locationInfo.newPath.length < PBILEVEL) ? false : true,
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
										lastStateChange: lastHistoryTimestamp,
										lastContentChange: lastHistoryTimestamp,
										lastCommentAddition: lastHistoryTimestamp,
										lastAttachmentAddition: lastHistoryTimestamp,
										lastCommentToHistory: lastHistoryTimestamp,
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
								node.data.lastChange = lastHistoryTimestamp
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
									node.data.lastChange = lastHistoryTimestamp
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
								node.data.lastChange = lastHistoryTimestamp
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
									node.data.lastChange = lastHistoryTimestamp
								}
							}
							break
						case 'descriptionEvent':
							if (documentInView) {
								rootState.currentDoc.description = window.atob(doc.description)
								node.data.lastContentChange = lastHistoryTimestamp
							}
							break
						case 'docRestoredEvent':
							{	// node	is restored from a previous removal
								commit('showLastEvent', { txt: 'Another user restored a removed item', severity: INFO })
								// re-enter the product to the users product roles, subscriptions, product ids and product selection array
								rootState.userData.myProductsRoles[doc._id] = lastHistObj['docRestoredEvent'][5]
								rootState.userData.myProductSubscriptions = addToArray(rootState.userData.myProductSubscriptions, doc._id)
								rootState.userData.userAssignedProductIds = addToArray(rootState.userData.userAssignedProductIds, doc._id)
								rootState.myProductOptions.push({
									value: doc._id,
									text: doc.title
								})
								dispatch('restoreBranch', doc)
							}
							break
						case 'nodeDroppedEvent':
						case 'nodeUndoMoveEvent':
							{	// check if the node has moved location
								let parentNode = window.slVueTree.getNodeById(doc.parentId)
								if (node === null) break

								let locationInfo = getLocationInfo(doc.priority, parentNode)
								if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) !== 0) {
									// the node has not changed parent nor changed location w/r to its siblings
									// move the node to the new position w/r to its siblings; first remove the node and its children, then insert
									window.slVueTree.remove([node])
									node.data.priority = doc.priority
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
								}
							}
							break
						case 'removeAttachmentEvent':
							node.data.lastAttachmentAddition = 0
							node.data.lastChange = lastHistoryTimestamp
							break
						case 'removeParentEvent':
							if (doc.delmark) {
								// remove any dependency references to/from outside the removed items
								window.slVueTree.correctDependencies(lastHistObj.removeParentEvent[0], lastHistObj.removeParentEvent[1])
								if (node) {
									window.slVueTree.remove([node])
									commit('showLastEvent', { txt: 'Another user removed an item', severity: INFO })
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
								}
								// nothing else to do after removing the node
								continue
							}
							break
						case 'setConditionsEvent':
							node.conditionalFor = doc.conditionalFor
							node.data.lastChange = lastHistoryTimestamp
							if (documentInView) rootState.currentDoc.conditionalFor = doc.conditionalFor
							break
						case 'setDependenciesEvent':
							node.dependencies = doc.dependencies
							node.data.lastChange = lastHistoryTimestamp
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
							node.data.lastChange = lastHistoryTimestamp
							if (documentInView) rootState.currentDoc.state = doc.state
							break
						case 'setSubTypeEvent':
							node.data.subtype = doc.subtype
							node.data.lastChange = lastHistoryTimestamp
							if (documentInView) rootState.currentDoc.subtype = doc.subtype
							break
						case 'setTeamOwnerEvent':
							node.data.team = doc.team
							node.data.lastChange = lastHistoryTimestamp
							if (documentInView) rootState.currentDoc.team = doc.team
							break
						case 'setTitleEvent':
							node.title = doc.title
							node.data.lastContentChange = lastHistoryTimestamp
							if (documentInView) rootState.currentDoc.title = doc.title
							break
						case 'uploadAttachmentEvent':
							node.data.lastAttachmentAddition = lastHistoryTimestamp
							node.data.lastChange = lastHistoryTimestamp
							break
						default:
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log('sync: not found, event = ' + histEvent)
					}
					// show the history update
					if (documentInView) rootState.currentDoc.history = doc.history
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
	actions
}
