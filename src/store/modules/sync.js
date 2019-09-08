import globalAxios from 'axios'

const PRODUCTLEVEL = 2
const PBILEVEL = 5
var fistCallAfterSignin = true

/*
* Listen for any changes in the user subscribed products made by other users and update the products tree view.
*
* Note: When a user starts multiple sessions each session has a different sessionId. These sessions are not synced.
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/
const actions = {
	listenForChanges({
		rootState,
		rootGetters,
		dispatch
	}, since) {
		/*
		 * When the node exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the index in the array of siblings the node should have based on its priority
		 * Note: when the node travels to a new parent that parent can have no children
		 */
		function getLocationInfo(newPrio, parentId) {
			let parentNode = window.slVueTree.getNodeById(parentId)
			let newPath = []
			if (parentNode.children.length > 0) {
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
					newLevel: newPath.length,
					newInd: i
				}
			} else {
				newPath = parentNode.path.slice()
				newPath.push(0)
				return {
					prevNode: parentNode,
					newPath: newPath,
					newLevel: newPath.length,
					newInd: 0
				}
			}
		}

		function updateFields(doc, node) {
			node.productId = doc.productId
			node.title = doc.title
			node.data.subtype = doc.subtype
			node.data.state = doc.state
		}

		function updateProductIds(nodes, productId) {
			window.slVueTree.traverseModels((nodeModel) => {
				nodeModel.productId = productId
			}, nodes)
		}

		// stop listening if offline. watchdog will start it automatically when online again
		if (!rootState.online) return

		let url = rootState.currentDb + '/_changes?feed=longpoll&filter=_view&view=design1/changesFilter&include_docs=true'
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
			let data = res.data
			rootState.lastSyncSeq = data.last_seq
			//eslint-disable-next-line no-console
			if (rootState.debug) console.log('listenForChanges: time = ' + new Date(Date.now()))
			if (since && !fistCallAfterSignin) {
				for (let i = 0; i < data.results.length; i++) {
					let doc = data.results[i].doc
					// Select only documents which are a product backlog item, belong to the the user subscribed products and
					// changes not made by the user him/her self in a parallel session and
					// ment for distribution (if not filtered out by the CouchDB _design filter)
					if (doc.type === 'backlogItem' &&
						doc.history[0].distributeEvent == true &&
						doc.history[0].sessionId !== rootState.sessionId &&
						rootState.load.myProductSubscriptions.includes(doc.productId)) {
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log('processChangedDocs: document with _id ' + doc._id + ' is processed')
						dispatch('doBlinck')
						let node = window.slVueTree.getNodeById(doc._id)
						if (node !== null) {
							// the node exists (is not new)
							if (doc.delmark) {
								// remove the node and its children
								window.slVueTree.remove([node])
								continue
							}
							let locationInfo = getLocationInfo(doc.priority, doc.parentId)
							// in case
							if (!locationInfo) {
								// eslint-disable-next-line no-console
								console.log('listenForChanges: calling getLocationInfo failed - doc.productId = ' + doc.productId + ' doc.parentId = ' + doc.parentId)
								continue
							}
							// update priority, parent and product
							node.data.priority = doc.priority
							node.parentId = doc.parentId
							if (node.productId !== doc.productId) {
								node.productId = doc.productId
								if (node.children && node.children.length > 0) {
									updateProductIds(node.children, doc.productId)
								}
							}
							// set lastChange to now
							node.data.lastChange = Date.now()
							if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) === 0) {
								// the node has not changed parent nor changed location w/r to its siblings
								updateFields(doc, node)
							} else {
								// move the node to the new position w/r to its siblings; first remove the node and its children, then insert
								window.slVueTree.remove([node])
								if (locationInfo.newInd === 0) {
									window.slVueTree.insert({
										nodeModel: locationInfo.prevNode,
										placement: 'inside'
									}, [node])
								} else {
									// insert after prevNode
									window.slVueTree.insert({
										nodeModel: locationInfo.prevNode,
										placement: 'after'
									}, [node])
								}
							}
						} else {
							if (doc.delmark) {
								// do not insert a removed node
								continue
							}
							// new node
							let locationInfo = getLocationInfo(doc.priority, doc.parentId)

							let node = {
								"path": locationInfo.newPath,
								"pathStr": JSON.stringify(locationInfo.newPath),
								"ind": locationInfo.newInd,
								"level": locationInfo.newPath.length,
								"productId": doc.productId,
								"parentId": doc.parentId,
								"_id": doc._id,
								"title": doc.title,
								"children": [],
								"isSelected": false,
								"isExpanded": true,
								"savedIsExpanded": true,
								"isSelectable": true,
								"isDraggable": doc.level > PRODUCTLEVEL && rootGetters.canWriteLevels[doc.level],
								"doShow": true,
								"savedDoShow": true,
								"data": {
									"state": doc.state,
									"subtype": 0,
									"lastChange": Date.now(),
									"sessionId": rootState.sessionId,
									"distributeEvent": true
								}
							}

							// set priority and isLeaf field
							node.data.priority = doc.priority
							node.isLeaf = (locationInfo.newLevel < PBILEVEL) ? false : true
							if (locationInfo.newInd === 0) {
								window.slVueTree.insert({
									nodeModel: locationInfo.prevNode,
									placement: 'inside'
								}, [node])
							} else {
								window.slVueTree.insert({
									nodeModel: locationInfo.prevNode,
									placement: 'after'
								}, [node])
							}
						}
					}
				} // end of loop
			}
			fistCallAfterSignin = false
			// recurse
			dispatch('listenForChanges', rootState.lastSyncSeq)
		})
			.catch(error => {
				let msg = 'Listening for changes made by other users failed with ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "WARNING"
				})
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
