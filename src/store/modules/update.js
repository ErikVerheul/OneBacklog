import globalAxios from 'axios'

var tmpDoc = null

const actions = {
	/*
	 * When updating the database first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
	setSize({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const oldSize = tmpDoc.tssize
					const newHist = {
						"setSizeEvent": [oldSize, payload.newSizeIdx],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.tssize = payload.newSizeIdx
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.tssize = payload.newSizeIdx
					this.state.load.currentDoc.history.push(newHist)
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSize: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setPersonHours({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const oldHrs = tmpDoc.spikepersonhours
					const newHist = {
						"setHrsEvent": [oldHrs, payload.newHrs],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spikepersonhours = payload.newHrs
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.spikepersonhours = payload.newHrs
					this.state.load.currentDoc.history.push(newHist)
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setPersonHours: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setStoryPoints({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const oldPoints = tmpDoc.spsize
					const newHist = {
						"setPointsEvent": [oldPoints, payload.newPoints],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spsize = payload.newPoints
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.spsize = payload.newPoints
					this.state.load.currentDoc.history.push(newHist)
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setStoryPoints: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setState({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const oldState = tmpDoc.state
					const newHist = {
						"setStateEvent": [oldState, payload.newState],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.state = payload.newState
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.state = payload.newState
					this.state.load.currentDoc.history.push(newHist)
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setState: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setDocTitle({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					const oldTitle = this.state.load.currentDoc.title
					tmpDoc = res.data
					const newHist = {
						"setTitleEvent": [oldTitle, payload.newTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.history.push(newHist)
					tmpDoc.title = payload.newTitle
					this.state.load.currentDoc.title = payload.newTitle
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setDocTitle: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setSubType({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const newHist = {
						"setSubTypeEvent": [this.state.load.currentDoc.subtype, payload.newSubType],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.history.push(newHist)
					tmpDoc.subtype = payload.newSubType
					this.state.load.currentDoc.subtype = payload.newSubType
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSubType: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	updateDropped({
		dispatch
	}, payload) {
		const _id = payload.newParentId
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					payload['newParentTitle'] = res.data.title
					dispatch('updateDropped2', payload)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped: Could not read parent document with _id ' + _id + '. Error = ' + error))
	},
	updateDropped2({
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const newHist = {
						"nodeDroppedEvent": [payload.oldLevel, payload.newLevel, payload.newInd, payload.newParentTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					this.state.load.currentDoc.history.push(newHist)
					tmpDoc.type = payload.newLevel
					tmpDoc.productId = payload.productId
					tmpDoc.parentId = payload.newParentId
					tmpDoc.priority = payload.priority
					this.state.load.currentDoc.type = payload.newLevel
					this.state.load.currentDoc.productId = payload.productId
					this.state.load.currentDoc.parentId = payload.newParentId
					this.state.load.currentDoc.priority = payload.priority
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped2: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	removeDoc({
		dispatch
	}, _id) {
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.delmark = true
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('removeDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	saveDescriptionAndLoadDoc({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
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
						tmpDoc.history.push(newHist)
						this.state.load.currentDoc.history.push(newHist)
						tmpDoc.description = newEncodedDescription
						dispatch('updateDocAndLoadNew', payload.newId)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveDescriptionAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	saveAcceptanceAndLoadDoc({
		dispatch
	}, payload) {
		const _id = this.state.load.currentDoc._id
		globalAxios({
				method: 'GET',
				url: this.state.load.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
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
						tmpDoc.history.push(newHist)
						this.state.load.currentDoc.history.push(newHist)
						tmpDoc.acceptanceCriteria = newEncodedAcceptance
						dispatch('updateDocAndLoadNew', payload.newId)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveAcceptanceAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	// Update current document
	updateDoc() {
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: this.state.load.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					console.log(res)
					// eslint-disable-next-line no-console
					console.log('updateDoc: document with _id + ' + _id + ' is updated.')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + this.state.load.currentDb + '/' + _id + '. Error = ' + error))
	},

	// Update current document and load new
	updateDocAndLoadNew({
		dispatch
	}, newId) {
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: this.state.load.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					console.log(res)
					// eslint-disable-next-line no-console
					console.log('updateDoc: document with _id + ' + _id + ' is updated.')
					dispatch('loadDoc', newId)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + this.state.load.currentDb + '/' + _id + '. Error = ' + error))
	},

}

export default {
	actions
}
