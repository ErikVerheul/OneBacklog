import globalAxios from 'axios'

const PRODUCTLEVEL = 2
const PBILEVEL = 5
const INFO = 0
const WARNING = 1
var fistCallAfterSignin = true
var remoteRemoved = []

/*
* Listen for any changes in the user subscribed products made by other users and update the products tree view.
*
* Note: When a user starts multiple sessions each session has a different sessionId. These sessions are not synced.
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/
const actions = {
	listenForChanges({
		rootState,
		commit,
		dispatch
	}, since) {
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

		let url = rootState.userData.currentDb + '/_changes?feed=longpoll&include_docs=true'
		if (since) url += '&since=' + since
		else {
			// initially get the last change only
			url += '&descending=true&limit=1'
		}
		// set this state as early as possible so that the watchdog does not start a second instance
		rootState.listenForChangesRunning = true
		globalAxios({
			method: 'GET',
			url: url,
			withCredentials: true
		}).then(res => {
			function isDifferentSession(doc) {
				if (doc.history[0].sessionId === rootState.userData.sessionId) return false
				if (doc.comments && doc.comments[0]) {
					// there is a least one comment
					if (doc.comments[0].sessionId === rootState.userData.sessionId) return false
				}
				return true
			}
			let data = res.data
			rootState.lastSyncSeq = data.last_seq
			//eslint-disable-next-line no-console
			if (rootState.debug) console.log('listenForChanges: time = ' + new Date(Date.now()))
			if (since && !fistCallAfterSignin) {
				const results = data.results
				for (let i = 0; i < results.length; i++) {
					let doc = results[i].doc
					// Select only documents which are a product backlog item, belong to the user subscribed products and changes not made
					// by the user him/her self in a parallel session and ment for distribution (is filtered out by the CouchDB _design filter)
					if (doc.type === 'backlogItem' &&
						isDifferentSession(doc) &&
						rootState.userData.myProductSubscriptions.includes(doc.productId)) {
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log('listenForChanges[processChangedDocs]: document with _id ' + doc._id + ' is processed, priority = ' + doc.priority + ' title = ' + doc.title)
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
								// save the node for later restoration
								remoteRemoved.unshift(node)
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
								commit('showLastEvent', { txt: 'Another user restored a removed item.', severity: INFO })
								// lookup in remove history
								for (let i = 0; i < remoteRemoved.length; i++) {
									const node = remoteRemoved[i]
									if (node._id === doc._id) {
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
			}
			fistCallAfterSignin = false
			// recurse
			dispatch('listenForChanges', rootState.lastSyncSeq)
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
