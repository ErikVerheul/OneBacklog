import globalAxios from 'axios'

const state = {
	test: 'Erik'
}

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
				if (res.status == 200) {
					let data = res.data
					let changedIds = []
					for (var prop in data) {
						//eslint-disable-next-line no-console
						if (rootState.debug) console.log('listenForChanges -> ' + prop, data[prop])
					}
					if (since && data.results.length > 0) {
						for (let i = 0; i < data.results.length; i++) {
							changedIds.push(data.results[i].id)
						}
						const payload = {
							ids: changedIds
						}
						dispatch('processChanges', payload)
					}
					// recurse
					dispatch('listenForChanges', data.last_seq)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('listenForChanges: Error = ' + error))
	},

	processChanges({
		rootState,
		dispatch
	}, payload) {
		for (let i = 0; i < payload.ids.length; i++) {
			//eslint-disable-next-line no-console
			if (rootState.debug) console.log('processChanges: id to update = ' + payload.ids[i])
			dispatch('processDoc', payload.ids[i])
		}
	},

	processDoc({
		rootState,
		rootGetters
	}, _id) {
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
		 * Returns the index of the sibling with the same priority else
		 * 1 higher than the first sibling with a lower priority
		 */
		function getNewChildIndex(parentId, priority) {
			let siblings = getNodeById(parentId).children
			let i = 0
			while (siblings[i].data.priority > priority && i < siblings.length) i++
			return i
		}

		/*
		 * When the node exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the index in the array of siblings the node should have based on its priority
		 */
		function getLocationInfo(node, newPrio) {
			let parentNode = getNodeById(node.data.parentId)
			let siblings = parentNode.children
			let i = 0
			console.log('getLocationInfo: siblings[i].data.priority > newPrio -> ' + siblings[i].data.priority + ' > ' + newPrio)
			while (i < siblings.length && siblings[i].data.priority > newPrio) {
				console.log('getLocationInfo: siblings[i].data.priority > newPrio -> ' + siblings[i].data.priority + ' > ' + newPrio)
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

		function updatePriority(doc, node) {
			let newData = Object.assign(node.data)
			newData.priority = doc.priority
			window.slVueTree.updateNode(node.path, {
				"data": newData
			})
		}

		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					let doc = res.data
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('processDoc: document with _id + ' + _id + ' is loaded.')
					// process only documents which are a product backlog item
					if (doc.type == 'backlogItem') {
						// skip changes made by the user him/her self
						if (doc.history[0].email != rootGetters.getEmail) {
							let parentNode = getNodeById(doc.parentId)
							//eslint-disable-next-line no-console
							if (rootState.debug) console.log('processDoc: doc.parentId = ' + doc.parentId + ' parent node title = ' + parentNode.title)
							let node = getNodeById(doc._id)
							if (node != null) {
								// the node exists (is not new)
								if (doc.parentId == node.data.parentId) {
									// the node has not changed parent


									let locationInfo = getLocationInfo(node, doc.priority)
									node.data.priority = doc.priority

									let newInd = locationInfo.newInd
									console.log('processDoc: newInd = ' + newInd + ' node.ind = ' + node.ind)
									if (newInd == node.ind) {
										// the node has not changed location w/r to its siblings
										updateFields(doc, node)
									} else {
										// move the node to the new position w/r to its siblings
										if (newInd == 0) {
											// the node is the first node under its parent; remove from old position
											window.slVueTree.remove([node.path])
											// insert under the parent
											let position = {
												node: parentNode,
												placement: 'inside'
											}
											window.slVueTree.insert(position, node)
										} else {
											if (newInd < node.ind) {
												// move up; remove from old position
												window.slVueTree.remove([node.path])
												// insert under prevNode
												window.slVueTree.insert({
													node: locationInfo.prevNode,
													placement: 'after'
												}, node)
											} else {
												// move down
												let prevNode = locationInfo.prevNode
												console.log('processDoc: prevNode.title = ' + prevNode)
												// insert under prevNode
												window.slVueTree.insert({
													node: prevNode,
													placement: 'after'
												}, node)
												// remove from old position
												console.log('processDoc: remove from node.path = ' + node.path)
												window.slVueTree.remove([node.path])
											}
										}
									}
								} else {
									// move to other parent
								}
							} else {
								// new node
							}
						}
					}
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
