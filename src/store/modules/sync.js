import globalAxios from 'axios'

const PRODUCTLEVEL = 2
const PBILEVEL = 5
const INFO = 0
const WARNING = 1
var remoteRemoved = []
var removedProducts = []

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
		function testEmail(data) {
			const interestingHistoryEvents = ["setSizeEvent", "setPointsEvent", "setHrsEvent", "setStateEvent", "setTeamEvent", "setTitleEvent", "setSubTypeEvent",
				"descriptionEvent", "acceptanceEvent", "nodeDroppedEvent", "nodeUndoMoveEvent", "parentDocRemovedEvent", "docRestoredInsideEvent", "uploadAttachmentEvent",
				"commentToHistoryEvent", "removeAttachmentEvent", "setDependenciesEvent", "setConditionsEvent"]
			const results = data.results
			for (let r of results) {
				let doc = r.doc
				if (doc.followers) {
					if (doc.comments[0].timestamp > doc.history[0].timestamp) {
						// process new comment
						for (let f of doc.followers) {
							console.log('testEmail: send to ' + f + ' comment from ' + doc.comments[0].by)
						}
					} else {
						// process new history
						for (let f of doc.followers) {
							const event = Object.keys(doc.history[0])[0]
							if (interestingHistoryEvents.includes(event)) {
								console.log('testEmail: send to ' + f + ' history of event ' + event + ' from ' + doc.history[0].by)
							}
						}
					}
				}
			}
		}

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

		// stop listening if offline. watchdog will start it automatically when online again
		if (!rootState.online) return

		let url = rootState.userData.currentDb + '/_changes?feed=longpoll&include_docs=true&filter=_view&view=design1/changesFilter&since=now'
		// set this state as early as possible so that the watchdog does not start a second instance
		rootState.listenForChangesRunning = true
		globalAxios({
			method: 'GET',
			url: url,
		}).then(res => {
			let data = res.data
			//eslint-disable-next-line no-console
			if (rootState.debug) console.log('listenForChanges: time = ' + new Date(Date.now()))
			// test email software here
			testEmail(data)
			const results = data.results
			for (let r of results) {
				let doc = r.doc
				if (doc.history[0].sessionId !== rootState.userData.sessionId &&
					rootState.userData.myProductSubscriptions.includes(doc.productId) || removedProducts.map(item => item.id).indexOf(doc._id) !== -1) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('listenForChanges[processChangedDocs]: document with _id ' + doc._id + ' is processed, priority = ' +
						doc.priority + ' lastHistType = ' + Object.keys(doc.history[0])[0] + ' distributeEvent = ' + doc.history[0].distributeEvent +
						' timestamp = ' + doc.history[0].timestamp + ' title = ' + doc.title)
					dispatch('doBlinck')
					// get the timestamps
					const lastHistoryChange = doc.history && doc.history.length > 0 ? doc.history[0].timestamp : 0
					const lastCommentChange = doc.comments && doc.comments.length > 0 ? doc.comments[0].timestamp : 0
					// update the current doc if in view
					if (doc._id === rootState.currentDoc._id) {
						rootState.currentDoc = doc
						// decode from base64 + replace the encoded data
						rootState.currentDoc.description = window.atob(doc.description)
						rootState.currentDoc.acceptanceCriteria = window.atob(doc.acceptanceCriteria)
					}
					let node = window.slVueTree.getNodeById(doc._id)
					if (node !== null) {
						// the node exists (is not new)
						if (doc.delmark) {
							// remove the node and its children
							window.slVueTree.remove([node])
							commit('showLastEvent', { txt: 'Another user removed an item', severity: INFO })
							// save the node for later restoration
							remoteRemoved.unshift(node)
							if (node.level === PRODUCTLEVEL) {
								// save some data of the removed product for restore at undo
								removedProducts.unshift({ id: node._id, productRoles: rootState.userData.myProductsRoles[node._id] })
								// remove the product from the users product roles, subscriptions and product selection array
								delete rootState.userData.myProductsRoles[node._id]
								if (rootState.userData.myProductSubscriptions.includes(node._id)) {
									const position = rootState.userData.myProductSubscriptions.indexOf(node._id)
									rootState.userData.myProductSubscriptions.splice(position, 1)
									const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(node._id)
									rootState.myProductOptions.splice(removeIdx, 1)
								}
							}
							continue
						}
						// set the specific dates of the events and the date of the last change in history or comments
						if (lastHistoryChange > lastCommentChange) {
							switch (Object.keys(doc.history[0])[0]) {
								case 'setStateEvent':
									node.data.lastStateChange = lastHistoryChange
									break
								case 'setTitleEvent' || 'descriptionEvent' || 'acceptanceEvent':
									node.data.lastContentChange = lastHistoryChange
									break
								case 'uploadAttachmentEvent':
									node.data.lastAttachmentAddition = lastHistoryChange
									break
								case 'commentToHistory':
									node.data.lastCommentToHistory = lastHistoryChange
									break
							}
							node.data.lastChange = lastHistoryChange
						} else {
							node.data.lastCommentAddition = lastCommentChange
							node.data.lastChange = lastCommentChange
						}
						// check if the node has moved location
						let parentNode = window.slVueTree.getNodeById(doc.parentId)
						let locationInfo = getLocationInfo(doc.priority, parentNode)
						if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) === 0) {
							// the node has not changed parent nor changed location w/r to its siblings; update possible changes
							node.productId = doc.productId
							node.title = doc.title
							node.dependencies = doc.dependencies
							node.conditionalFor = doc.conditionalFor
							node.data.state = doc.state
							node.data.team = doc.team
							node.data.subtype = doc.subtype
						} else {
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
					} else {
						// the node is new
						if (doc.delmark) {
							// do not insert a removed node
							continue
						}
						if (doc.history[0].docRestoredInsideEvent) {
							// node	is restored from a previous removal
							commit('showLastEvent', { txt: 'Another user restored a removed item', severity: INFO })
							// console.log('sync: remoteRemoved = ' + JSON.stringify(remoteRemoved, null, 2))
							// lookup in remove history
							for (let i = 0; i < remoteRemoved.length; i++) {
								const node = remoteRemoved[i]
								if (node._id === doc._id) {
									if (node.level === PRODUCTLEVEL) {
										// re-enter the product to the users product roles, subscriptions and product selection array
										rootState.userData.myProductsRoles[node._id] = removedProducts[0].productRoles
										rootState.userData.myProductSubscriptions.push(node._id)
										rootState.myProductOptions.push({
											value: node._id,
											text: node.title
										})
										// remove the entry
										removedProducts.splice(0, 1)
									}
									// remove from the array
									remoteRemoved.splice(i, 1)
									const parentNode = window.slVueTree.getNodeById(node.parentId)
									if (parentNode) {
										let path
										if (window.slVueTree.comparePaths(parentNode.path, node.path.slice(0, -1)) === 0) {
											// the removed node path has not changed
											path = node.path
										} else {
											// the removed node path has changed; correct it for the new parent path
											path = parentNode.path.concat(node.path.slice(-1))
										}
										const prevNode = window.slVueTree.getPreviousNode(path)
										if (path.slice(-1)[0] === 0) {
											// the previous node is the parent
											const cursorPosition = {
												nodeModel: prevNode,
												placement: 'inside'
											}
											window.slVueTree.insert(cursorPosition, [node])
										} else {
											// the previous node is a sibling
											const cursorPosition = {
												nodeModel: prevNode,
												placement: 'after'
											}
											window.slVueTree.insert(cursorPosition, [node])
										}
									} else {
										commit('showLastEvent', { txt: 'Cannot restore a removed item. Sign out and -in to see the change.', severity: WARNING })
										let msg = 'Sync: a remote restore of the tree view failed. The item id is ' + node._id
										// eslint-disable-next-line no-console
										if (rootState.debug) console.log(msg)
										dispatch('doLog', { event: msg, level: WARNING })
									}
								}
							}
						} else {
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
							// initialize the node; to be finalized by updatePath and assignNewPrios in sl-vue-tree
							const locationInfo = getLocationInfo(doc.priority, parentNode)
							let node = {
								"path": locationInfo.newPath,
								"pathStr": JSON.stringify(locationInfo.newPath),
								"ind": locationInfo.newInd,
								"level": locationInfo.newPath.length,

								"productId": doc.productId,
								"parentId": doc.parentId,
								"_id": doc._id,
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
									sessionId: rootState.userData.sessionId,
									distributeEvent: false,
									lastStateChange: lastHistoryChange
								}
							}
							window.slVueTree.insert({
								nodeModel: locationInfo.prevNode,
								placement: locationInfo.newInd === 0 ? 'inside' : 'after'
							}, [node])
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
	}) {
		rootState.eventSyncColor = '#e6f7ff'
		setTimeout(function () {
			rootState.eventSyncColor = '#004466'
		}, 1000)
	}
}

export default {
	actions
}
