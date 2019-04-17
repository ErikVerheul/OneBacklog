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
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					let tmpDoc = res.data
					const wasFollower = rootGetters.isFollower
					let tmpFollowers = tmpDoc.followers
					if (rootGetters.isFollower) {
						for (let i = 0; i < tmpFollowers.length; i++) {
							if (tmpFollowers[i] == rootGetters.getEmail) {
								tmpFollowers.splice(i, 1)
							}
						}
					} else {
						tmpFollowers.push(rootGetters.getEmail)
					}
					const newHist = {
						"subscribeEvent": [wasFollower],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.followers = tmpFollowers
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.followers = tmpFollowers
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('changeSubsription: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const oldSize = tmpDoc.tssize
					const newHist = {
						"setSizeEvent": [oldSize, payload.newSizeIdx],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.tssize = payload.newSizeIdx
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.tssize = payload.newSizeIdx
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSize: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const oldHrs = tmpDoc.spikepersonhours
					const newHist = {
						"setHrsEvent": [oldHrs, payload.newHrs],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spikepersonhours = payload.newHrs
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.spikepersonhours = payload.newHrs
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setPersonHours: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const oldPoints = tmpDoc.spsize
					const newHist = {
						"setPointsEvent": [oldPoints, payload.newPoints],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spsize = payload.newPoints
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.spsize = payload.newPoints
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setStoryPoints: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const oldState = tmpDoc.state
					const newHist = {
						"setStateEvent": [oldState, payload.newState],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.state = payload.newState
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.state = payload.newState
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setState: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					const oldTitle = rootState.currentDoc.title
					let tmpDoc = res.data
					const newHist = {
						"setTitleEvent": [oldTitle, payload.newTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					tmpDoc.title = payload.newTitle
					rootState.currentDoc.title = payload.newTitle
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setDocTitle: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const newHist = {
						"setSubTypeEvent": [rootState.currentDoc.subtype, payload.newSubType],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					tmpDoc.subtype = payload.newSubType
					rootState.currentDoc.subtype = payload.newSubType
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSubType: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	updateDropped({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.newParentId
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					payload['newParentTitle'] = res.data.title
					payload['nrOfDescendants'] = payload.descendants.length
					dispatch('updateDropped2', payload)
					for (let i = 0; i < payload.descendants.length; i++) {
						let descendantPayload = {
							"_id": payload.descendants[i].data._id,
							"oldParentTitle": payload.oldParentTitle,
							"productId": payload.productId,
							"newLevel": payload.descendants[i].level,
							"userName": payload.userName,
							"email": payload.email
						}
						dispatch('updateDescendant', descendantPayload)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped: Could not read parent document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const newHist = {
						"nodeDroppedEvent": [payload.oldLevel, payload.newLevel, payload.newInd, payload.newParentTitle, payload.nrOfDescendants],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					tmpDoc.type = payload.newLevel
					tmpDoc.productId = payload.productId
					tmpDoc.parentId = payload.newParentId
					tmpDoc.priority = payload.newPriority
					rootState.currentDoc.type = payload.newLevel
					rootState.currentDoc.productId = payload.productId
					rootState.currentDoc.parentId = payload.newParentId
					rootState.currentDoc.priority = payload.priority
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped2: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	updateDescendant({
		rootState,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					let tmpDoc = res.data
					const newHist = {
						"descendantMoved": [payload.oldParentTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					tmpDoc.type = payload.newLevel
					tmpDoc.productId = payload.productId
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDescendant: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					tmpDoc.delmark = true
					dispatch('updateDoc', tmpDoc)
					if (payload.doRegHist) {
						dispatch('registerRemoveHist', payload)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('removeDoc: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					const newHist = {
						"nodeRemoveEvent": [payload.node.level, payload.node.title, payload.descendantsCount],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('registerRemoveHist: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					// encode to base64
					const newEncodedDescription = window.btoa(payload.newDescription)
					// update only when changed
					if (newEncodedDescription != res.data.description) {
						const newHist = {
							"descriptionEvent": [res.data.description, newEncodedDescription],
							"by": payload.userName,
							"email": payload.email,
							"timestamp": Date.now()
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
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveDescriptionAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					// encode to base64
					const newEncodedAcceptance = window.btoa(payload.newAcceptance)
					// update only when changed
					if (newEncodedAcceptance != res.data.acceptanceCriteria) {
						const newHist = {
							"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
							"by": payload.userName,
							"email": payload.email,
							"timestamp": Date.now()
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
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveAcceptanceAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
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
			}).then(res => {
				if (res.status == 200) {
					let tmpDoc = res.data
					// encode to base64
					const newComment = window.btoa(payload.comment)
					const newEntry = {
						"comment": [newComment],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.comments.unshift(newEntry)
					rootState.currentDoc.comments.unshift(newEntry)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('addComment: Could not read document with _id ' + _id + '. Error = ' + error))
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
				if (res.status == 200) {
					let tmpDoc = res.data
					// encode to base64
					const newComment = window.btoa(payload.comment)
					const newHist = {
						"comment": [newComment],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.unshift(newHist)
					rootState.currentDoc.history.unshift(newHist)
					dispatch('updateDoc', tmpDoc)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('addHistoryComment: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	// Update current document
	updateDoc({
		rootState
	}, tmpDoc) {
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: rootState.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log(res)
					// eslint-disable-next-line no-console
					console.log('updateDoc: document with _id + ' + _id + ' is updated.')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + rootState.currentDb + '/' + _id + '. Error = ' + error))
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
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log(res)
					// eslint-disable-next-line no-console
					console.log('updateDocAndLoadNew: document with _id + ' + _id + ' is updated.')
					dispatch('loadDoc', newId)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + rootState.currentDb + '/' + _id + '. Error = ' + error))
	},

}

export default {
	actions
}
