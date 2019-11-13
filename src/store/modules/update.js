import globalAxios from 'axios'

const WARNING = 1
const ERROR = 2

const state = {
	busyRemoving: false
}

const actions = {
	/*
	 * When updating the database, first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
	changeSubsription({
		rootState,
		rootGetters,
		dispatch
	}) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const wasFollower = rootGetters.isFollower
			let tmpFollowers = tmpDoc.followers
			if (rootGetters.isFollower) {
				for (let i = 0; i < tmpFollowers.length; i++) {
					if (tmpFollowers[i] === rootState.userData.email) {
						tmpFollowers.splice(i, 1)
					}
				}
			} else {
				tmpFollowers.push(rootState.userData.email)
			}
			const newHist = {
				"subscribeEvent": [wasFollower],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.followers = tmpFollowers
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.followers = tmpFollowers
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'changeSubsription: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setSize({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const oldSize = tmpDoc.tssize
			const newHist = {
				"setSizeEvent": [oldSize, payload.newSizeIdx],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.tssize = payload.newSizeIdx
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.tssize = payload.newSizeIdx
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setSize: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setPersonHours({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const oldHrs = tmpDoc.spikepersonhours
			const newHist = {
				"setHrsEvent": [oldHrs, payload.newHrs],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.spikepersonhours = payload.newHrs
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.spikepersonhours = payload.newHrs
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setPersonHours: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setStoryPoints({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const oldPoints = tmpDoc.spsize
			const newHist = {
				"setPointsEvent": [oldPoints, payload.newPoints],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.spsize = payload.newPoints
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.spsize = payload.newPoints
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setStoryPoints: Could not read document with _id ' + _id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setState({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const oldState = tmpDoc.state
			const newHist = {
				"setStateEvent": [oldState, payload.newState, payload.team],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.state = payload.newState
			// also set the team
			tmpDoc.team = payload.team
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.state = payload.newState
			rootState.currentDoc.team = payload.team
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setState: Could not read document with _id ' + _id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setTeam({
		rootState,
		dispatch
	}, descendants) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const oldTeam = tmpDoc.team
			const newTeam = rootState.userData.myTeam
			if (newTeam != oldTeam) {
				const newHist = {
					"setTeamEvent": [oldTeam, newTeam, descendants.length],
					"by": rootState.userData.user,
					"email": rootState.userData.email,
					"timestamp": Date.now(),
					"timestampStr": new Date().toString(),
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.team = newTeam
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.team = newTeam
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			}
			// process the descendants even if the parent team has not changed
			if (descendants.length > 0) dispatch('setTeamDescendantsBulk', descendants)
		}).catch(error => {
			let msg = 'setTeam: Could not read document with _id ' + _id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	/* Change the team of the descendants to the users team */
	setTeamDescendantsBulk({
		rootState,
		dispatch
	}, descendants) {
		const docsToGet = []
		for (let desc of descendants) {
			docsToGet.push({ "id": desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			const newTeam = rootState.userData.myTeam
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const oldTeam = results[i].docs[0].ok.team
					if (newTeam != oldTeam) {
						const newHist = {
							"setTeamEventDescendant": [oldTeam, newTeam],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"timestampStr": new Date().toString(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": true
						}
						results[i].docs[0].ok.history.unshift(newHist)
						// set the team name
						results[i].docs[0].ok.team = newTeam
						ok.push(results[i].docs[0].ok)
					}
				}
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'setTeamDescendantsBulk: These documents cannot change team: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			if (ok.length > 0) dispatch('updateBulk', ok)
		}).catch(error => {
			let msg = 'setTeamDescendantsBulk: Could not read batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setDocTitle({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			const oldTitle = rootState.currentDoc.title
			let tmpDoc = res.data
			const newHist = {
				"setTitleEvent": [oldTitle, payload.newTitle],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.history.unshift(newHist)
			tmpDoc.title = payload.newTitle
			rootState.currentDoc.title = payload.newTitle
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setDocTitle: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	setSubType({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"setSubTypeEvent": [rootState.currentDoc.subtype, payload.newSubType],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.history.unshift(newHist)
			tmpDoc.subtype = payload.newSubType
			rootState.currentDoc.subtype = payload.newSubType
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setSubType: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Dispatch the update of the moved nodes and the update of the history of their descendants */
	updateDropped({
		dispatch
	}, payload) {
		if (payload.next >= payload.payloadArray.length) return

		let payloadItem = payload.payloadArray[payload.next]
		payloadItem['nrOfDescendants'] = payloadItem.descendants.length
		dispatch('updateMovedItems', payloadItem)
		let payloadArray2 = []
		for (let i = 0; i < payloadItem.descendants.length; i++) {
			const payloadItem2 = {
				"_id": payloadItem.descendants[i]._id,
				"oldProductTitle": payloadItem.oldProductTitle,
				"oldParentTitle": payloadItem.oldParentTitle,
				"productId": payloadItem.productId,
				"newLevel": payloadItem.descendants[i].level
			}
			payloadArray2.push(payloadItem2)
		}
		dispatch('updateDroppedDescendantsBulk', payloadArray2)
		payload.next++
		// recurse
		dispatch('updateDropped', payload)
	},

	/* Update the dropped node */
	updateMovedItems({
		rootState,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"nodeDroppedEvent": [payload.oldLevel, payload.newLevel, payload.newInd, payload.newParentTitle, payload.nrOfDescendants, payload.oldProductTitle, payload.placement],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.level = payload.newLevel
			tmpDoc.productId = payload.productId
			tmpDoc.parentId = payload.newParentId
			tmpDoc.priority = payload.newPriority
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'updateMovedItems: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateDroppedDescendantsBulk({
		rootState,
		dispatch
	}, payload) {
		// Lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (let i = 0; i < payload.length; i++) {
				if (payload[i]._id === id) {
					return payload[i]
				}
			}
		}
		const docsToGet = []
		for (let i = 0; i < payload.length; i++) {
			docsToGet.push({ "id": payload[i]._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('updateDroppedDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const payloadItem = getPayLoadItem(results[i].docs[0].ok._id)
					const doc = results[i].docs[0].ok
					// change the document
					const newHist = {
						"descendantMoved": [payloadItem.oldParentTitle],
						"by": rootState.userData.user,
						"email": rootState.userData.email,
						"timestamp": Date.now(),
						"timestampStr": new Date().toString(),
						"sessionId": rootState.userData.sessionId,
						"distributeEvent": false
					}
					doc.history.unshift(newHist)
					doc.level = payloadItem.newLevel
					doc.productId = payloadItem.productId
					ok.push(doc)
				}
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'updateDroppedDescendantsBulk: These descendants cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', ok)
		}).catch(error => {
			let msg = 'updateDroppedDescendantsBulk: Could not read decendants in bulk. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	removeDoc({
		state,
		rootState,
		dispatch
	}, payload) {
		state.busyRemoving = true
		const _id = payload.node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"parentDocRemovedEvent": [payload.descendants.length],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.delmark = true
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			dispatch('registerRemoveHistInParent', payload)
		}).catch(error => {
			let msg = 'removeDoc: Could not read document with _id ' + _id + ',' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	/* Check if restoration is possible: the parent to store under must not be removed */
	unDoRemove({
		rootState,
		commit,
		dispatch
	}, entry) {
		const _id = entry.grandParentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let grandParentDoc = res.data
			if (!grandParentDoc.delmark) {
				const newHist = {
					"grandParentDocRestoredEvent": [entry.removedNode.level, entry.removedNode.title, entry.descendants.length],
					"by": rootState.userData.user,
					"email": rootState.userData.email,
					"timestamp": Date.now(),
					"timestampStr": new Date().toString(),
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": false
				}
				grandParentDoc.history.unshift(newHist)
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc })
				dispatch('restoreParentFirst', entry)
				if (entry.isProductRemoved) {
					// remove the product from the list of removed products
					dispatch('removeFromRemovedProducts', entry.removedNode._id)
				}
			} else {
				commit('showLastEvent', { txt: `You cannot restore under the removed item with title '${grandParentDoc.title}'`, severity: WARNING })
			}
		}).catch(error => {
			let msg = 'unDoRemove: Could not read document with _id ' + _id + ',' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	restoreParentFirst({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"docRestoredInsideEvent": [payload.descendants.length],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.delmark = false
			dispatch('undoRemovedParent', { tmpDoc: tmpDoc, entry: payload })
		}).catch(error => {
			let msg = 'restoreParentFirst: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	// update the parent and restore the descendants
	undoRemovedParent({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.tmpDoc._id
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('undoRemovedParent: updating document with _id = ' + _id)
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
			data: payload.tmpDoc
		}).then(() => {
			dispatch('restoreDescendantsBulk', payload.entry)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('undoRemovedParent: document with _id ' + _id + ' is updated.')
		}).catch(error => {
			let msg = 'undoRemovedParent: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	/* Mark the descendants of the parent for removal. Do not distribute this event as distributing the parent removal will suffice */
	removeDescendantsBulk({
		state,
		rootState,
		dispatch
	}, payload) {
		const docsToGet = []
		for (let desc of payload.descendants) {
			docsToGet.push({ "id": desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('removeDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const newHist = {
						"docRemovedEvent": [payload.node.title],
						"by": rootState.userData.user,
						"email": rootState.userData.email,
						"timestamp": Date.now(),
						"timestampStr": new Date().toString(),
						"sessionId": rootState.userData.sessionId,
						"distributeEvent": false
					}
					results[i].docs[0].ok.history.unshift(newHist)
					// mark for removal
					results[i].docs[0].ok.delmark = true
					ok.push(results[i].docs[0].ok)
				}
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				state.busyRemoving = false
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'removeDescendantsBulk: These documents cannot be marked for removal: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', ok)
		}).catch(error => {
			state.busyRemoving = false
			let msg = 'removeDescendantsBulk: Could not read batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	/* Unmark the removed item and its descendants for removal. Do distribute this event and set the selfUpdate property to have the tree updated */
	restoreDescendantsBulk({
		rootState,
		dispatch
	}, payload) {
		const docsToGet = []
		for (let desc of payload.descendants) {
			docsToGet.push({ "id": desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('restoreDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const newHist = {
						"docRestoredEvent": [results[i].docs[0].ok.title],
						"by": rootState.userData.user,
						"email": rootState.userData.email,
						"timestamp": Date.now(),
						"timestampStr": new Date().toString(),
						"sessionId": rootState.userData.sessionId,
						"distributeEvent": false
					}
					results[i].docs[0].ok.history.unshift(newHist)
					// unmark for removal
					results[i].docs[0].ok.delmark = false
					ok.push(results[i].docs[0].ok)
				}
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'restoreDescendantsBulk: These documents cannot be UNmarked for removal: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', ok)
		}).catch(error => {
			let msg = 'restoreDescendantsBulk: Could not read batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	updateBulk({
		state,
		rootState,
		dispatch
	}, docs) {
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_docs',
			withCredentials: true,
			data: { "docs": docs },
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log('updateBulk: ' + res.data.length + ' documents are updated')
			// has effect when removing a branche, otherwise no effect
			state.busyRemoving = false
		}).catch(error => {
			// has effect when removing a branche, otherwise no effect
			state.busyRemoving = false
			let msg = 'updateBulk: Could not update batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	registerRemoveHistInParent({
		rootState,
		state,
		dispatch
	}, payload) {
		const _id = payload.node.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"removedFromParentEvent": [payload.node.level, payload.node.title, payload.descendants.length],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (payload.descendants.length > 0) {
				dispatch('removeDescendantsBulk', payload)
			} else state.busyRemoving = false
		}).catch(error => {
			state.busyRemoving = false
			let msg = 'registerRemoveHistInParent: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	saveDescription({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedDescription = window.btoa(payload.newDescription)
			const newHist = {
				"descriptionEvent": [res.data.description, newEncodedDescription],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.history.unshift(newHist)
			tmpDoc.description = newEncodedDescription
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'saveDescription: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	saveAcceptance({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedAcceptance = window.btoa(payload.newAcceptance)
			const newHist = {
				"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.history.unshift(newHist)
			tmpDoc.acceptanceCriteria = newEncodedAcceptance
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'saveAcceptance: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	addComment({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then((res) => {
			let tmpDoc = res.data
			// encode to base64
			const newComment = window.btoa(payload.comment)
			const newEntry = {
				"comment": [newComment],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.comments.unshift(newEntry)
			rootState.currentDoc.comments.unshift(newEntry)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'addComment: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	addHistoryComment({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newComment = window.btoa(payload.comment)
			const newHist = {
				"comment": [newComment],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'addHistoryComment: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	addToRemovedProducts({
		rootState,
		dispatch
	}, productId) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
			withCredentials: true,
		}).then(res => {
			const tmpConfig = res.data
			if (tmpConfig.removedProducts) {
				tmpConfig.removedProducts.push(productId)
			} else {
				tmpConfig.removedProducts = [productId]
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpConfig })
		}).catch(error => {
			let msg = 'addToRemovedProducts: Could not read config document ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	removeFromRemovedProducts({
		rootState,
		dispatch
	}, productId) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
			withCredentials: true,
		}).then(res => {
			const tmpConfig = res.data
			if (tmpConfig.removedProducts) {
				for (let i = 0; i < tmpConfig.removedProducts.length; i++) {
					if (tmpConfig.removedProducts[i] === productId) {
						tmpConfig.removedProducts.splice(i, 1)
					}
				}
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpConfig })
		}).catch(error => {
			const msg = 'removeFromRemovedProducts: Could not read config document ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	addTeamToDatabase({
		rootState,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		rootState.backendSuccess = false
		rootState.teamCreated = false
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config',
			withCredentials: true,
		}).then(res => {
			const tmpConfig = res.data
			if (!tmpConfig.teams.includes(payload.newTeam)) {
				tmpConfig.teams.push(payload.newTeam)
				dispatch('updateDoc', { dbName: payload.dbName, updatedDoc: tmpConfig })
				// assume updateDoc succeeds
				rootState.backendMessages.push("addTeamToDatabase: Team '" + payload.newTeam + "' is created in database " + payload.dbName)
				rootState.teamCreated = true
			} else {
				rootState.backendMessages.push("addTeamToDatabase: Cannot add team name '" + payload.newTeam + "'. Reason: team already exist in database " + payload.dbName)
			}
		}).catch(error => {
			const msg = 'addTeamToDatabase: Could not read config document ' + error
			rootState.backendMessages.push(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// update document by creating a new revision
	updateDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.updatedDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + _id,
			withCredentials: true,
			data: payload.updatedDoc
		}).then(() => {
			rootState.backendSuccess = true
			// ToDo: uncomment this statement when also cleared and used in product view
			// rootState.backendMessages.push('updateDoc: document with _id ' + _id + ' is updated in database ' + payload.dbName)
		}).catch(error => {
			const msg = 'updateDoc: Could not write document with url ' + payload.dbName + '/' + _id + ', ' + error
			rootState.backendMessages.push(msg)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

}

export default {
	state,
	actions
}
