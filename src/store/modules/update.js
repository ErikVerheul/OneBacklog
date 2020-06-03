import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const WARNING = 1
const ERROR = 2
const PRODUCTLEVEL = 2
const REMOVED = 0
const ON_HOLD = 1
const DONE = 6

/* Remove 'ignoreEvent' elements from history */
function cleanHistory(doc) {
	const cleanedHistory = []
	for (let h of doc.history) {
		if (Object.keys(h)[0] !== 'ignoreEvent') cleanedHistory.push(h)
	}
	doc.history = cleanedHistory
	return doc
}

const actions = {
	/* Update the req area of the item (null for no req area set) */
	updateReqArea({
		rootState,
		commit,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			const oldDocArea = tmpDoc.reqarea
			tmpDoc.reqarea = payload.reqarea
			const newHist = {
				"ignoreEvent": ['updateReqArea'],
				"timestamp": Date.now(),
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			commit('updateCurrentDoc', { reqarea: payload.reqarea, newHist })
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			payload.oldParentReqArea = oldDocArea
			if (payload.childIds.length > 0) dispatch('updateReqAreaChildren', payload)
		}).catch(error => {
			let msg = 'updateReqArea: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* If the item is an epic also assign this req area to the children which have no req area assigned yet / when removing do the reverse.
	* When the parent req area is changed the children change too.
    */
	updateReqAreaChildren({
		rootState,
		dispatch
	}, payload) {
		const docsToGet = []
		for (let c of payload.childIds) {
			docsToGet.push({ "id": c })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const currentReqArea = doc.reqarea
					const oldParentReqArea = payload.oldParentReqArea
					const newReqArea = payload.reqarea
					let updated = false
					if (newReqArea !== null) {
						// set: set for items which have no req area set yet
						if (!currentReqArea || currentReqArea === oldParentReqArea) {
							doc.reqarea = newReqArea
							updated = true
						}
					} else {
						// remove: if reqarea was set and equal to old req area of the parent delete it
						if (currentReqArea && currentReqArea === oldParentReqArea) {
							delete doc.reqarea
							updated = true
						}
					}
					if (updated) {
						const newHist = {
							"ignoreEvent": ['updateReqAreaChildren'],
							"timestamp": Date.now(),
							"distributeEvent": false
						}
						doc.history.unshift(newHist)
						docs.push(doc)
					}
				}
				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'updateReqAreaChildren: These documents cannot change requirement area: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'updateReqAreaChildren: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateColorDb({
		rootState,
		commit,
		dispatch
	}, newColor) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			// update the req area document
			tmpDoc.color = newColor
			const newHist = {
				"ignoreEvent": ['updateColorDb'],
				"timestamp": Date.now(),
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			commit('updateCurrentDoc', { color: newColor, newHist })
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setColor: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	changeSubsription({
		rootState,
		commit,
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
				"timestamp": Date.now(),
				"distributeEvent": false
			}
			tmpDoc.followers = tmpFollowers
			tmpDoc.history.unshift(newHist)
			// show the followers and history update in the current opened item
			commit('updateCurrentDoc', { followers: tmpFollowers, newHist })
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'changeSubsription: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setTsSize({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const oldSize = tmpDoc.tssize
			const newHist = {
				"setSizeEvent": [oldSize, payload.newSizeIdx],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.tssize = payload.newSizeIdx
			tmpDoc.history.unshift(newHist)
			node.data.tssize = payload.newSizeIdx
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { tssize: payload.newSizeIdx, newHist })
			}
		}).catch(error => {
			let msg = 'setTsSize: Could not read document with _id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setDepAndCond({
		rootState,
		commit,
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
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.dependencies = payload.dependencies
			tmpDoc.history.unshift(newHist)
			if (_id === rootState.currentDoc._id) commit('updateCurrentDoc', { newHist })
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch: { setConditions: payload.conditionalForPayload } })
		}).catch(error => {
			let msg = 'setDepAndCond: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setConditions({
		rootState,
		commit,
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
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.conditionalFor = payload.conditionalFor
			tmpDoc.history.unshift(newHist)
			if (_id === rootState.currentDoc._id) commit('updateCurrentDoc', { newHist })
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
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const oldHrs = tmpDoc.spikepersonhours
			const newHist = {
				"setHrsEvent": [oldHrs, payload.newHrs],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.spikepersonhours = payload.newHrs
			tmpDoc.history.unshift(newHist)
			node.data.lastChange = payload.timestamp
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { spikepersonhours: payload.newHrs, newHist })
			}
		}).catch(error => {
			let msg = 'setPersonHours: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setStoryPoints({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			if (payload.newState && (tmpDoc.state || payload.newState)) {
				// also change state
				const oldPoints = tmpDoc.spsize
				const oldState = tmpDoc.state
				const oldTeam = tmpDoc.team
				const newHist = {
					"setPointsAndStatusEvent": [oldPoints, payload.newPoints, oldState, payload.newState, oldTeam, payload.newTeam],
					"by": rootState.userData.user,
					"timestamp": payload.timestamp,
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.history.unshift(newHist)
				tmpDoc.spsize = payload.newPoints
				tmpDoc.state = payload.newState
				tmpDoc.team = payload.newTeam
				node.data.state = payload.newState
				if (oldTeam !== payload.newTeam) {
					// also change team
					node.data.team = payload.newTeam
					if (payload.descendants.length > 0) dispatch('setTeamDescendantsBulk', { newTeam: payload.newTeam, parentTitle: payload.node.title, descendants: payload.descendants })
				}
			} else {
				const oldPoints = tmpDoc.spsize
				const newHist = {
					"setPointsEvent": [oldPoints, payload.newPoints],
					"by": rootState.userData.user,
					"timestamp": payload.timestamp,
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.spsize = payload.newPoints
				tmpDoc.history.unshift(newHist)
				commit('updateCurrentDoc', { spsize: payload.newPoints, newHist })
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setStoryPoints: Could not read document with _id ' + id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* When called from the planning board the tree is aldo updated with the new state */
	setState({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		// recalculate and (re)set the inconsistency state of the parent item
		function checkParentState() {
			const parentNode = window.slVueTree.getParentNode(node)
			if (parentNode && parentNode.data.state === DONE) {
				const descendants = window.slVueTree.getDescendantsInfo(parentNode).descendants
				let hasInconsistentState = false
				for (let d of descendants) {
					if (d.data.state === REMOVED || d.data.state === ON_HOLD) continue
					if (d.data.state !== DONE) {
						hasInconsistentState = true
						break
					}
				}
				parentNode.data.inconsistentState = hasInconsistentState
			}
		}
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const oldState = tmpDoc.state
			const newHist = {
				"setStateEvent": [oldState, payload.newState, payload.newTeam, payload.position],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.state = payload.newState
			// also set the team if provided
			if (payload.newTeam) {
				tmpDoc.team = payload.newTeam
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			node.data.state = payload.newState
			if (payload.newTeam) node.data.team = payload.newTeam
			node.data.lastStateChange = payload.timestamp
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { state: payload.newState, team: payload.newTeam, newHist })
			}
			checkParentState()
		}).catch(error => {
			let msg = 'setState: Could not read document with id ' + id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setTeam({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const oldTeam = tmpDoc.team
			if (payload.newTeam != oldTeam) {
				// update the tree
				node.data.team = payload.newTeam
				for (let desc of payload.descendants) {
					desc.data.team = payload.newTeam
				}
				const newHist = {
					"setTeamOwnerEvent": [oldTeam, payload.newTeam, payload.descendants.length],
					"by": rootState.userData.user,
					"timestamp": Date.now(),
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.team = payload.newTeam
				tmpDoc.history.unshift(newHist)
				commit('updateCurrentDoc', { team: payload.newTeam, newHist })
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
				if (payload.descendants.length > 0) dispatch('setTeamDescendantsBulk', { newTeam: payload.newTeam, parentTitle: rootState.currentDoc.title, descendants: payload.descendants })
			}
		}).catch(error => {
			let msg = 'setTeam: Could not read document with _id ' + id + '. Error = ' + error
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
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const oldTeam = doc.team
					if (payload.newTeam != oldTeam) {
						const newHist = {
							"setTeamEventDescendant": [oldTeam, payload.newTeam, payload.parentTitle],
							"by": rootState.userData.user,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": false
						}
						doc.history.unshift(newHist)
						// set the team name
						doc.team = payload.newTeam
						docs.push(doc)
					}
				}
				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'setTeamDescendantsBulk: These documents cannot change team: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'setTeamDescendantsBulk: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setDocTitle({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			const oldTitle = rootState.currentDoc.title
			let tmpDoc = res.data
			const newHist = {
				"setTitleEvent": [oldTitle, payload.newTitle],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.title = payload.newTitle
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			node.title = payload.newTitle
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { title: payload.newTitle, newHist })
			}
		}).catch(error => {
			let msg = 'setDocTitle: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	setSubType({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"setSubTypeEvent": [rootState.currentDoc.subtype, payload.newSubType],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.subtype = payload.newSubType
			node.data.subtype = payload.newSubType
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { subtype: payload.newSubType, newHist })
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setSubType: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	saveDescription({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedDescription = window.btoa(payload.newDescription)
			const newHist = {
				"descriptionEvent": [res.data.description, newEncodedDescription],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.description = newEncodedDescription
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { newHist })
			}
		}).catch(error => {
			let msg = 'saveDescription: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	saveAcceptance({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			// encode to base64
			const newEncodedAcceptance = window.btoa(payload.newAcceptance)
			const newHist = {
				"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.acceptanceCriteria = newEncodedAcceptance
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (rootState.currentDoc._id === id) {
				commit('updateCurrentDoc', { newHist })
			}
		}).catch(error => {
			let msg = 'saveAcceptance: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	addComment({
		rootState,
		commit,
		dispatch
	}, payload) {
		const _id = rootState.currentDoc._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then((res) => {
			let tmpDoc = res.data
			const newComment = {
				"addCommentEvent": window.btoa(payload.comment),
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.comments.unshift(newComment)
			commit('updateCurrentDoc', { newComment })
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
		commit,
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
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			commit('updateCurrentDoc', { newHist })
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'addHistoryComment: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Create or update an existing document by creating a new revision.
	* Update the currentDoc in memory if forceUpdateCurrentDoc = true or if the updated document has the same id as the currentDoc.
	*/
	updateDoc({
		rootState,
		commit,
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
			if (payload.forceUpdateCurrentDoc || rootState.currentDoc && (rootState.currentDoc._id === res.data.id)) {
				// create/update the current document in memory with the new revision number
				commit('updateCurrentDoc', { newDoc: payload.updatedDoc, _rev: res.data.rev })
			}
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			// additional dispatches
			if (payload.toDispatch) {
				for (let name of Object.keys(payload.toDispatch)) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateDoc: dispatching ' + name)
					dispatch(name, payload.toDispatch[name])
				}
			}
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			const msg = 'updateDoc: Could not write document with url ' + payload.dbName + '/' + _id + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
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
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			if (updateConflict > 0 || otherError > 0) {
				dispatch('doLog', { event: msg, level: WARNING })
			}
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			// additional dispatches
			if (payload.toDispatch) {
				for (let name of Object.keys(payload.toDispatch)) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateBulk: dispatching ' + name)
					dispatch(name, payload.toDispatch[name])
				}
			}
		}).catch(error => {
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			let msg = 'updateBulk: Could not update batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load a backlog item by short id */
	loadItemByShortId({
		rootState,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = `/_design/design1/_view/shortIdFilter?startkey=["${shortId}"]&endkey=["${shortId}"]&include_docs=true`
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr,
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (rootState.userData.userAssignedProductIds.includes(doc.productId)) {
					if (rows.length === 1) {
						commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your view. Did you select the product?`, severity: WARNING })
					} else {
						commit('showLastEvent', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed.`, severity: INFO })
						let ids = ''
						for (let i = 0; i < rows.length; i++) {
							ids += rows[i].doc._id + ', '
						}
						const msg = 'Multiple documents found for shortId ' + shortId + ' The documents ids are ' + ids
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log(msg)
						dispatch('doLog', { event: msg, level: WARNING })
					}
					commit('updateCurrentDoc', { newDoc: cleanHistory(doc) })
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('loadItemByShortId: document with _id ' + doc._id + ' is loaded.')
				} else {
					commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your assigned products.`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with id ${shortId} is NOT found in the database.`, severity: WARNING })
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('loadItemByShortId: Could not read a batch of documents from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	/* Add history to the parent and than save the document */
	createDocWithParentHist({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.newDoc.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const updatedDoc = res.data
			updatedDoc.history.unshift(payload.parentHist)
			const toDispatch = { 'updateDoc': { dbName: rootState.userData.currentDb, updatedDoc: payload.newDoc, forceUpdateCurrentDoc: true } }
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc, toDispatch, caller: 'createDocWithParentHist' })
		}).catch(error => {
			let msg = 'createDocWithParentHist: Could not read parent document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Load document by _id and make it the current backlog item
	* On success, update the current product title
	*/
	loadDoc({
		rootState,
		commit,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			commit('updateCurrentDoc', { newDoc: cleanHistory(res.data) })
			if (rootState.currentDoc.level === PRODUCTLEVEL) rootState.currentProductTitle = rootState.currentDoc.title
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with _id ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadDoc: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
