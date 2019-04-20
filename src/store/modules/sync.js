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
									let newInd = getNewChildIndex(doc.parentId, doc.priority)
									//eslint-disable-next-line no-console
									if (rootState.debug) console.log('processDoc: doc._id = ' + doc._id + ' new ind = ' + newInd)
									if (newInd == node.ind) {
										// the node has not changed location w/r to its siblings
										updateFields(doc, node)
									} else {
										// move the node to the new position w/r to its siblings
										if (newInd == 0) {
											// the node is the first node under its parent

										}

									}
								}
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
