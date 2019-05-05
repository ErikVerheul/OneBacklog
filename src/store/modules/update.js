import globalAxios from 'axios'

const actions = {
	/*
	 * When updating the database first load the document with the actual revision number and changes by other users.
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
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const wasFollower = rootGetters.isFollower
				let tmpFollowers = tmpDoc.followers
				if (rootGetters.isFollower) {
					for (let i = 0; i < tmpFollowers.length; i++) {
						if (tmpFollowers[i] === rootGetters.getEmail) {
							tmpFollowers.splice(i, 1)
						}
					}
				} else {
					tmpFollowers.push(rootGetters.getEmail)
				}
				const newHist = {
					"subscribeEvent": [wasFollower],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.followers = tmpFollowers
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.followers = tmpFollowers
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'changeSubsription: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setSize({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const oldSize = tmpDoc.tssize
				const newHist = {
					"setSizeEvent": [oldSize, payload.newSizeIdx],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.tssize = payload.newSizeIdx
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.tssize = payload.newSizeIdx
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setSize: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setPersonHours({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const oldHrs = tmpDoc.spikepersonhours
				const newHist = {
					"setHrsEvent": [oldHrs, payload.newHrs],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.spikepersonhours = payload.newHrs
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.spikepersonhours = payload.newHrs
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setPersonHours: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setStoryPoints({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const oldPoints = tmpDoc.spsize
				const newHist = {
					"setPointsEvent": [oldPoints, payload.newPoints],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.spsize = payload.newPoints
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.spsize = payload.newPoints
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setStoryPoints: Could not read document with _id ' + _id + '. Error = ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setState({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const oldState = tmpDoc.state
				const newHist = {
					"setStateEvent": [oldState, payload.newState],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.state = payload.newState
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.state = payload.newState
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setState: Could not read document with _id ' + _id + '. Error = ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setDocTitle({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				const oldTitle = rootState.currentDoc.title
				let tmpDoc = res.data
				const newHist = {
					"setTitleEvent": [oldTitle, payload.newTitle],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": true
				}
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.history.unshift(newHist)
				tmpDoc.title = payload.newTitle
				rootState.currentDoc.title = payload.newTitle
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setDocTitle: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	setSubType({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const newHist = {
					"setSubTypeEvent": [rootState.currentDoc.subtype, payload.newSubType],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": true
				}
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.history.unshift(newHist)
				tmpDoc.subtype = payload.newSubType
				rootState.currentDoc.subtype = payload.newSubType
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'setSubType: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	updateDropped({
		rootState,
		dispatch
	}, payload) {
		if (payload.next >= payload.payloadArray.length) return

		let payloadItem = payload.payloadArray[payload.next]
		const _id = payloadItem.newParentId

		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				payloadItem['newParentTitle'] = res.data.title
				payloadItem['nrOfDescendants'] = payloadItem.descendants.length
				dispatch('updateDropped2', payloadItem)
				let payloadArray2 = []
				for (let i = 0; i < payloadItem.descendants.length; i++) {
					const payloadItem2 = {
						"_id": payloadItem.descendants[i].data._id,
						"oldParentTitle": payloadItem.oldParentTitle,
						"productId": payloadItem.productId,
						"newLevel": payloadItem.descendants[i].level
					}
					payloadArray2.push(payloadItem2)
				}
				dispatch('updateDescendants', {
					next: 0,
					payloadArray: payloadArray2
				})
				payload.next++
				// recurse
				dispatch('updateDropped', payload)
			})
			.catch(error => {
				let msg = 'updateDropped: Could not read parent document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	updateDropped2({
		rootState,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const newHist = {
					"nodeDroppedEvent": [payload.oldLevel, payload.newLevel, payload.newInd, payload.newParentTitle, payload.nrOfDescendants],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": true
				}
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.history.unshift(newHist)
				tmpDoc.level = payload.newLevel
				tmpDoc.productId = payload.productId
				tmpDoc.parentId = payload.newParentId
				tmpDoc.priority = payload.newPriority
				rootState.currentDoc.level = payload.newLevel
				rootState.currentDoc.productId = payload.productId
				rootState.currentDoc.parentId = payload.newParentId
				rootState.currentDoc.priority = payload.priority
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'updateDropped2: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	updateDescendants({
		rootState,
		dispatch
	}, payload) {
		if (payload.next >= payload.payloadArray.length) return

		let payloadItem = payload.payloadArray[payload.next]
		const _id = payloadItem._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const newHist = {
					"descendantMoved": [payloadItem.oldParentTitle],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.history.unshift(newHist)
				tmpDoc.level = payloadItem.newLevel
				tmpDoc.productId = payloadItem.productId
				dispatch('updateDoc', tmpDoc)
				payload.next++
				// recurse
				dispatch('updateDescendants', payload)
			})
			.catch(error => {
				let msg = 'updateDescendants: Could not read document with _id ' + _id + '. Error = ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	removeDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.node.data._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const newHist = {
					"docRemoved": [tmpDoc.title],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": true
				}
				tmpDoc.delmark = true
				tmpDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
				if (payload.doRegHist) {
					dispatch('registerRemoveHist', payload)
				}
			})
			.catch(error => {
				let msg = 'removeDoc: Could not read document with _id ' + _id + ',' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	registerRemoveHist({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.node.data.parentId
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				const newHist = {
					"nodeRemoveEvent": [payload.node.level, payload.node.title, payload.descendantsCount],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'registerRemoveHist: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	saveDescriptionAndLoadDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				// encode to base64
				const newEncodedDescription = window.btoa(payload.newDescription)
				// update only when changed
				if (newEncodedDescription != res.data.description) {
					const newHist = {
						"descriptionEvent": [res.data.description, newEncodedDescription],
						"by": rootState.user,
						"email": rootState.load.email,
						"timestamp": Date.now(),
						"sessionId": rootState.sessionId,
						"distributeEvent": false
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					tmpDoc.description = newEncodedDescription
					const newPayload = {
						newId: payload.newId,
						doc: tmpDoc
					}
					dispatch('updateDocAndLoadNew', newPayload)
				}
			})
			.catch(error => {
				let msg = 'saveDescriptionAndLoadDoc: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	saveAcceptanceAndLoadDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				// encode to base64
				const newEncodedAcceptance = window.btoa(payload.newAcceptance)
				// update only when changed
				if (newEncodedAcceptance != res.data.acceptanceCriteria) {
					const newHist = {
						"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
						"by": rootState.user,
						"email": rootState.load.email,
						"timestamp": Date.now(),
						"sessionId": rootState.sessionId,
						"distributeEvent": false
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					tmpDoc.acceptanceCriteria = newEncodedAcceptance
					const newPayload = {
						newId: payload.newId,
						doc: tmpDoc
					}
					dispatch('updateDocAndLoadNew', newPayload)
				}
			})
			.catch(error => {
				let msg = 'saveAcceptanceAndLoadDoc: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	addComment({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then((res) => {
				let tmpDoc = res.data
				// encode to base64
				const newComment = window.btoa(payload.comment)
				const newEntry = {
					"comment": [newComment],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.comments.unshift(newEntry)
				rootState.currentDoc.comments.unshift(newEntry)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'addComment: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},
	addHistoryComment({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				let tmpDoc = res.data
				// encode to base64
				const newComment = window.btoa(payload.comment)
				const newHist = {
					"comment": [newComment],
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": Date.now(),
					"sessionId": rootState.sessionId,
					"distributeEvent": false
				}
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', tmpDoc)
			})
			.catch(error => {
				let msg = 'addHistoryComment: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	// Update current document
	updateDoc({
		rootState,
		dispatch
	}, tmpDoc) {
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: rootState.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(() => {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('updateDoc: document with _id + ' + _id + ' is updated.')
			})
			.catch(error => {
				let msg = 'updateDoc: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	// Update current document and load new
	updateDocAndLoadNew({
		rootState,
		dispatch
	}, payload) {
		const newId = payload.newId
		let tmpDoc = payload.doc
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDocAndLoadNew: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: rootState.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(() => {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('updateDocAndLoadNew: document with _id + ' + _id + ' is updated.')
				dispatch('loadDoc', newId)
			})
			.catch(error => {
				let msg = 'updateDocAndLoadNew: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

}

export default {
	actions
}
