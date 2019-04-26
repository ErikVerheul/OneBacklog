import globalAxios from 'axios'

const PBILEVEL = 5

const state = {
	eventSyncColor: '#004466'
}

const actions = {
	listenForChanges({
		rootState,
		dispatch
	}, since) {
		let url = rootState.currentDb + '/_changes?feed=longpoll'
		if (since) url += '&since=' + since
		else {
			// initially get the last change only
			url += '&descending=true&limit=1'
		}
		globalAxios({
				method: 'GET',
				url: url,
				withCredentials: true,
			}).then(res => {
				let data = res.data
				let dateStr = new Date(Date.now())
				//eslint-disable-next-line no-console
				if (rootState.debug) console.log('listenForChanges time = ' + dateStr)
				for (var prop in data) {
					//eslint-disable-next-line no-console
					if (rootState.debug) console.log('listenForChanges -> ' + prop, data[prop])
				}
				let changedIds = []
				if (since && data.results.length > 0) {
					for (let i = 0; i < data.results.length; i++) {
						changedIds.push(data.results[i].id)
					}
					const payload = {
						changedIds: changedIds,
						next: 0
					}
					dispatch('processDocs', payload)
				}
				// recurse
				dispatch('listenForChanges', data.last_seq)
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('listenForChanges: Error = ' + error))
	},

	doBlinck({
		state
	}) {
		state.eventSyncColor = '#e6f7ff'
		setTimeout(function () {
			state.eventSyncColor = '#004466'
		}, 1000)
	},

	processDocs({
		rootState,
		rootGetters,
		dispatch
	}, payload) {

		let _id = payload.changedIds[payload.next]

		/*
		 * Returns the node or null when it does not exist
		 */
		function getNodeById(id) {
			let resultNode = null
			window.slVueTree.traverse((node) => {
				if (node.data._id === id) {
					resultNode = node
					return false
				}
			})
			return resultNode
		}

		/*
		 * When the node exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the index in the array of siblings the node should have based on its priority
		 * Note: when the node travels to a new parent that parent can have no children
		 */
		function getLocationInfo(node, newPrio, parentId) {
			let parentNode = getNodeById(parentId)
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
			let newData = Object.assign(node.data)
			newData.subtype = doc.subtype
			window.slVueTree.updateNode(node.path, {
				"title": doc.title,
				"data": newData
			})
		}

		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let doc = res.data
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('processDoc: document with _id + ' + _id + ' is loaded.')
				// process only documents which are a product backlog item
				if (doc.type === 'backlogItem') {
					if (rootGetters.getUserAssignedProductIds.includes(doc.productId)) {
						// only process changes not made by the user him/her self and ment for distribution
						if (doc.history[0].sessionId != rootState.sessionId && doc.history[0].distributeEvent) {
							dispatch('doBlinck')
							let node = getNodeById(doc._id)
							if (node != null) {
								// the node exists (is not new)
								if (!doc.delmark) {
									// update the parent as it can be changed
									let locationInfo = getLocationInfo(node, doc.priority, doc.parentId)
									// update priority, parent and product
									node.data.priority = doc.priority
									node.data.parentId = doc.parentId
									node.data.productId = doc.productId
									if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) === 0) {
										// the node has not changed parent nor changed location w/r to its siblings
										updateFields(doc, node)
									} else {
										// move the node to the new position w/r to its siblings
										if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) === -1) {
											// move up: remove from old position first
											node.isLeaf = (locationInfo.newLevel < PBILEVEL) ? false : true
											window.slVueTree.remove([node.path])
											if (locationInfo.newInd === 0) {
												window.slVueTree.insert({
													node: locationInfo.prevNode,
													placement: 'inside'
												}, node)
											} else {
												// insert after prevNode
												window.slVueTree.insert({
													node: locationInfo.prevNode,
													placement: 'after'
												}, node)
											}
										} else {
											// move down: insert first
											node.isLeaf = (locationInfo.newLevel < PBILEVEL) ? false : true
											if (locationInfo.newInd === 0) {
												window.slVueTree.insert({
													node: locationInfo.prevNode,
													placement: 'inside'
												}, node)
											} else {
												window.slVueTree.insert({
													node: locationInfo.prevNode,
													placement: 'after'
												}, node)
											}
											// remove from old position
											window.slVueTree.remove([node.path])
										}
									}
								} else {
									// remove the node
									window.slVueTree.remove([node.path])
								}
							} else {
								// new node
								let node = {
									"title": doc.title,
									"isSelected": false,
									"isExpanded": true,
									"children": [],
									"data": {
										"_id": doc._id,
										"productId": doc.productId,
										"parentId": doc.parentId,
										"subtype": 0,
										"sessionId": rootState.sessionId,
										"distributeEvent": true
									}
								}
								let locationInfo = getLocationInfo(node, doc.priority, doc.parentId)
								// update priority
								node.data.priority = doc.priority
								node.isLeaf = (locationInfo.newLevel < PBILEVEL) ? false : true
								if (locationInfo.newInd === 0) {
									window.slVueTree.insert({
										node: locationInfo.prevNode,
										placement: 'inside'
									}, node)
								} else {
									window.slVueTree.insert({
										node: locationInfo.prevNode,
										placement: 'after'
									}, node)
								}
							}
						}
					}
				}
				payload.next++
				if (payload.next < payload.changedIds.length) {
					// recurse
					dispatch('processDocs', payload)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('processDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},
}

export default {
	state,
	actions
}
