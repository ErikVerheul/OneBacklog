import globalAxios from 'axios'

const actions = {
	listenForChanges({
		rootState,
		dispatch
	}, since) {
		let url = rootState.currentDb + '/_changes?feed=longpoll'
		if (since) url += '&since=' + since
		globalAxios({
				method: 'GET',
				url: url,
				withCredentials: true,
			}).then(res => {
				let data = res.data
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
				if (node.data._id == id) {
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
		 */
		function getLocationInfo(node, newPrio, parentId) {
			let parentNode = getNodeById(parentId)
			let siblings = parentNode.children
			let i = 0
			while (i < siblings.length && siblings[i].data.priority > newPrio) {
				i++
			}
			return {
				prevNode: i == 0 ? parentNode : siblings[i - 1],
				newInd: i
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
				if (doc.type == 'backlogItem') {
					if (rootGetters.getUserAssignedProductIds.includes(doc.productId)) {
						// skip changes made by the user him/her self
						if (doc.history[0].sessionId != rootState.sessionId) {
							let parentNode = getNodeById(doc.parentId)
							//eslint-disable-next-line no-console
							if (rootState.debug) console.log('processDoc: doc.parentId = ' + doc.parentId + ' parent node title = ' + parentNode.title)
							let node = getNodeById(doc._id)
							if (node != null) {
								// the node exists (is not new)
								let locationInfo = getLocationInfo(node, doc.priority, doc.parentId)
								// update the node's priority after that the location info is determined
								node.data.priority = doc.priority
								let newInd = locationInfo.newInd
								if (newInd == node.ind) {
									// the node has not changed location w/r to its siblings
									updateFields(doc, node)
								} else {
									// move the node to the new position w/r to its siblings
									if (newInd == 0) {
										// the node is the first node under its parent; remove from old position
										window.slVueTree.remove([node.path])
										// insert under the parent
										window.slVueTree.insert({
											node: parentNode,
											placement: 'inside'
										}, node)
									} else {
										if (newInd < node.ind) {
											// move up: remove from old position
											window.slVueTree.remove([node.path])
											// insert after prevNode
											window.slVueTree.insert({
												node: locationInfo.prevNode,
												placement: 'after'
											}, node)
										} else {
											// move down: insert after prevNode
											window.slVueTree.insert({
												node: locationInfo.prevNode,
												placement: 'after'
											}, node)
											// remove from old position
											window.slVueTree.remove([node.path])
										}
									}
								}
							} else {
								// new node
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
	actions
}
