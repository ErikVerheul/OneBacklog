import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const WARNING = 1
const ERROR = 2

const actions = {
	changeSubsription({
		rootState,
		rootGetters,
		dispatch
	}) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			const wasFollower = rootGetters.isFollower
			let tmpFollowers = tmpDoc.followers
			if (rootGetters.isFollower) {
				for (let i = 0; i < tmpFollowers.length; i++) {
					if (tmpFollowers[i].email === rootState.userData.email) {
						tmpFollowers.splice(i, 1)
					}
				}
			} else {
				tmpFollowers.push({ email: rootState.userData.email })
			}
			const newHist = {
				"subscribeEvent": [wasFollower],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
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
		}).then(res => {
			let tmpDoc = res.data
			const oldSize = tmpDoc.tssize
			const newHist = {
				"setSizeEvent": [oldSize, payload.newSizeIdx],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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

	SetDepAndCond({
		rootState,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"setDependenciesEvent": [tmpDoc.dependencies, payload.dependencies],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.dependencies = payload.dependencies
			tmpDoc.history.unshift(newHist)
			if (_id === rootState.currentDoc._id) rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch: { setConditions: payload.conditionalForPayload } })
		}).catch(error => {
			let msg = 'SetDepAndCond: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setConditions({
		rootState,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"setConditionsEvent": [tmpDoc.conditionalFor, payload.conditionalFor],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.conditionalFor = payload.conditionalFor
			tmpDoc.history.unshift(newHist)
			if (_id === rootState.currentDoc._id) rootState.currentDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setConditions: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Update the dependencies and the corresponding conditions in the database. */
	updateDep({
		rootState,
		dispatch
	}, payload) {
		const dbName = rootState.userData.currentDb
		const _id = payload._id
		globalAxios({
			method: 'GET',
			url: dbName + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			tmpDoc.dependencies = payload.newDeps
			const newHist = {
				"dependencyRemovedEvent": [payload.removedIds],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch: { removeConditions: { ref: _id, depOnDocuments: payload.removedIds } } })
		}).catch(error => {
			let msg = 'updateDep: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Update the conditions and the corresponding dependencies in the database. */
	updateCon({
		rootState,
		dispatch
	}, payload) {
		const dbName = rootState.userData.currentDb
		const _id = payload._id
		globalAxios({
			method: 'GET',
			url: dbName + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			tmpDoc.conditionalFor = payload.newCons
			const newHist = {
				"conditionRemovedEvent": [payload.removedIds],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch: { removeDependencies: { ref: _id, condForDocuments: payload.removedIds } } })
		}).catch(error => {
			let msg = 'updateCon: Could not read document with _id ' + _id + ', ' + error
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
		}).then(res => {
			let tmpDoc = res.data
			const oldHrs = tmpDoc.spikepersonhours
			const newHist = {
				"setHrsEvent": [oldHrs, payload.newHrs],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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
		}).then(res => {
			let tmpDoc = res.data
			const oldPoints = tmpDoc.spsize
			const newHist = {
				"setPointsEvent": [oldPoints, payload.newPoints],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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
		}).then(res => {
			let tmpDoc = res.data
			const oldState = tmpDoc.state
			const newHist = {
				"setStateEvent": [oldState, payload.newState, payload.team],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.state = payload.newState
			// also set the team if provided
			if (payload.team) {
				rootState.currentDoc.team = payload.team
				tmpDoc.team = payload.team
			}
			tmpDoc.history.unshift(newHist)
			rootState.currentDoc.state = payload.newState
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
		}).then(res => {
			let tmpDoc = res.data
			const oldTeam = tmpDoc.team
			const newTeam = rootState.userData.myTeam
			if (newTeam != oldTeam) {
				const newHist = {
					"setTeamOwnerEvent": [oldTeam, newTeam, descendants.length],
					"by": rootState.userData.user,
					"email": rootState.userData.email,
					"timestamp": Date.now(),
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.team = newTeam
				tmpDoc.history.unshift(newHist)
				rootState.currentDoc.team = newTeam
				rootState.currentDoc.history.unshift(newHist)
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			}
			// Todo: why? process the descendants even if the parent team has not changed
			if (descendants.length > 0) dispatch('setTeamDescendantsBulk', { parentTitle: rootState.currentDoc.title, descendants })
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
	}, payload) {
		const docsToGet = []
		for (let desc of payload.descendants) {
			docsToGet.push({ "id": desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const newTeam = rootState.userData.myTeam
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				let doc = r.docs[0].ok
				if (doc) {
					const oldTeam = doc.team
					if (newTeam != oldTeam) {
						const newHist = {
							"setTeamEventDescendant": [oldTeam, newTeam, payload.parentTitle],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": true
						}
						doc.history.unshift(newHist)
						// set the team name
						doc.team = newTeam
						docs.push(doc)
					}
				}
				if (doc.error) error.push(doc.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
				let msg = 'setTeamDescendantsBulk: These documents cannot change team: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
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
		}).then(res => {
			const oldTitle = rootState.currentDoc.title
			let tmpDoc = res.data
			const newHist = {
				"setTitleEvent": [oldTitle, payload.newTitle],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
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
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"setSubTypeEvent": [rootState.currentDoc.subtype, payload.newSubType],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
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

	saveDescription({
		rootState,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedDescription = window.btoa(payload.newDescription)
			const newHist = {
				"descriptionEvent": [res.data.description, newEncodedDescription],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedAcceptance = window.btoa(payload.newAcceptance)
			const newHist = {
				"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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
		}).then((res) => {
			let tmpDoc = res.data
			const newHist = {
				"addCommentEvent": window.btoa(payload.comment),
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.comments.unshift(newHist)
			rootState.currentDoc.comments.unshift(newHist)
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
		}).then(res => {
			let tmpDoc = res.data
			const newComment = window.btoa(payload.comment)
			const newHist = {
				"commentToHistoryEvent": [newComment],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
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

	addTeamToDatabase({
		rootState,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		rootState.isTeamCreated = false
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config',
		}).then(res => {
			const tmpConfig = res.data
			if (!tmpConfig.teams.includes(payload.newTeam)) {
				tmpConfig.teams.push(payload.newTeam)
				dispatch('updateDoc', {
					dbName: payload.dbName,
					updatedDoc: tmpConfig,
					onSuccessCallback: function() {
						rootState.backendMessages.push({
							randKey: Math.floor(Math.random() * 100000), msg: "addTeamToDatabase: Team '" + payload.newTeam + "' is created in database " + payload.dbName
						})
					}
				})
			} else {
				rootState.backendMessages.push({
					randKey: Math.floor(Math.random() * 100000), msg: "addTeamToDatabase: Cannot add team name '" + payload.newTeam + "'. Reason: team already exist in database " + payload.dbName
				})
			}
		}).catch(error => {
			const msg = 'addTeamToDatabase: Could not read config document ' + error
			rootState.backendMessages.push({ randKey: Math.floor(Math.random() * 100000), msg })
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
			data: payload.updatedDoc
		}).then((res) => {
			if (rootState.currentDoc._id === res.data.id) {
				// update the revision of the current document
				rootState.currentDoc._rev = res.data.rev
			}
			rootState.isTeamCreated = true
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) {
				const nrOfParameters = payload.onSuccessCallback.length
				if (nrOfParameters === 0) payload.onSuccessCallback()
				if (nrOfParameters === 1) payload.onSuccessCallback(payload.updatedDoc)
			}
			// additional dispatches
			if (payload.toDispatch) {
				for (let name of Object.keys(payload.toDispatch)) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateDoc: calling ' + name)
					dispatch(name, payload.toDispatch[name])
				}
			}
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback !== undefined) {
				const nrOfParameters = payload.onFailureCallback.length
				if (nrOfParameters === 0) payload.onFailureCallback()
				if (nrOfParameters === 1) payload.onFailureCallback(payload.updatedDoc)
			}
			const msg = 'updateDoc: Could not write document with url ' + payload.dbName + '/' + _id + ', ' + error
			rootState.backendMessages.push({ randKey: Math.floor(Math.random() * 100000), msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateBulk({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_bulk_docs',
			data: { "docs": payload.docs },
		}).then(res => {
			let updateOk = 0
			let updateConflict = 0
			let otherError = 0
			for (let result of res.data) {
				if (result.ok) updateOk++
				if (result.error === 'conflict') updateConflict++
				if (result.error && result.error != 'conflict') otherError++
			}
			// eslint-disable-next-line no-console
			let msg = 'updateBulk: ' + updateOk + ' documents are updated, ' + updateConflict + ' updates have a conflict, ' + otherError + ' updates failed on error'
			if (payload.caller) msg += `\nupdateBulk was called by ${payload.caller}`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			if (updateConflict > 0 || otherError > 0) {
				dispatch('doLog', { event: msg, level: WARNING })
			}
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) {
				const nrOfParameters = payload.onSuccessCallback.length
				if (nrOfParameters === 0) payload.onSuccessCallback()
				if (nrOfParameters === 1) payload.onSuccessCallback(payload.docs)

			}
			// additional dispatches
			if (payload.toDispatch) {
				for (let name of Object.keys(payload.toDispatch)) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateBulk: calling ' + name)
					dispatch(name, payload.toDispatch[name])
				}
			}
		}).catch(error => {
			if (payload.onFailureCallback !== undefined) {
				const nrOfParameters = payload.onFailureCallback.length
				if (nrOfParameters === 0) payload.onFailureCallback()
				if (nrOfParameters === 1) payload.onFailureCallback(payload.docs)
			}
			let msg = 'updateBulk: Could not update batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
