import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const WARNING = 1
const ERROR = 2
const REMOVED = 0
const ON_HOLD = 1
const DONE = 6
const TASKLEVEL = 6

function getLevelText(configData, level) {
    if (level < 0 || level > TASKLEVEL) {
        return 'Level not supported'
    }
    return configData.itemType[level]
}

const actions = {
	/* Update the req area of the item (null for no req area set) */
	//ToDo: create undo
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
				"timestamp": payload.timestamp,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastChange = payload.timestamp
			// add to payload
			payload.oldParentReqArea = oldDocArea
			const toDispatch = { 'updateReqAreaChildren': payload }
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { reqarea: payload.reqarea, lastChange: payload.timestamp, newHist })
				}
			})
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
		const childIds = payload.node.children.map((n) => n._id)
		const docsToGet = []
		for (let c of childIds) {
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
			const oldParentReqArea = payload.oldParentReqArea
			const newReqArea = payload.reqarea
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const currentReqArea = doc.reqarea
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
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb, docs, onSuccessCallback: () => {
					// set reqarea for the child nodes
					const childNodes = payload.node.children
					for (let c of childNodes) {
						const currentReqArea = c.data.reqarea
						if (newReqArea !== null) {
							// set: set for items which have no req area set yet
							if (!currentReqArea || currentReqArea === oldParentReqArea) {
								c.data.reqarea = newReqArea
							}
						} else {
							// remove: if reqarea was set and equal to old req area of the parent delete it
							if (currentReqArea && currentReqArea === oldParentReqArea) {
								c.data.reqarea = null
							}
						}
					}
				}
			})
		}).catch(e => {
			let msg = 'updateReqAreaChildren: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// ToDo: create undo
	updateColorDb({
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
			// update the req area document
			tmpDoc.color = payload.newColor
			const newHist = {
				"ignoreEvent": ['updateColorDb'],
				"timestamp": payload.timestamp,
				"distributeEvent": false
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { reqAreaItemcolor: payload.newColor, lastChange: payload.timestamp, newHist })
					payload.recreateColorMapper()
				}
			})
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
	}, payload) {
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
				"timestamp": payload.timestamp,
				"distributeEvent": false
			}
			tmpDoc.followers = tmpFollowers
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { followers: tmpFollowers, lastChange: payload.timestamp, newHist })
				}
			})
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
			const oldTsSize = tmpDoc.tssize
			const newHist = {
				"setSizeEvent": [oldTsSize, payload.newSizeIdx],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.tssize = payload.newSizeIdx
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					node.data.tssize = payload.newSizeIdx
					commit('showLastEvent', { txt: `The T-shirt size of this item is changed`, severity: INFO })
					commit('updateNodesAndCurrentDoc', { tssize: payload.newSizeIdx, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTsSizeChange',
							oldTsSize,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item T-shirt size is undone`, severity: INFO })
				}
			})
		}).catch(error => {
			let msg = 'setTsSize: Could not read document with _id ' + id + ', ' + error
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
			const oldPersonHours = tmpDoc.spikepersonhours
			const newHist = {
				"setHrsEvent": [oldPersonHours, payload.newHrs],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.spikepersonhours = payload.newHrs
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('showLastEvent', { txt: `The maximum effort of this spike is changed`, severity: INFO })
					commit('updateNodesAndCurrentDoc', { spikepersonhours: payload.newHrs, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoPersonHoursChange',
							oldPersonHours,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of spike person hours is undone`, severity: INFO })
				}
			})
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
			// update size only
			const oldPoints = tmpDoc.spsize
			const newHist = {
				"setPointsEvent": [oldPoints, payload.newPoints],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)

			tmpDoc.spsize = payload.newPoints
			const prevLastChange = tmpDoc.lastChange || 0
			tmpDoc.lastChange = payload.timestamp
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { spsize: payload.newPoints, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoStoryPointsChange',
							oldPoints,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item story points is undone`, severity: INFO })
				}
			})
		}).catch(error => {
			let msg = 'setStoryPoints: Could not read document with _id ' + id + ',' + error
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
			tmpDoc.history.unshift(newHist)
			const prevLastStateChange = tmpDoc.lastStateChange
			tmpDoc.lastStateChange = payload.timestamp
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.state = payload.newState
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { state: payload.newState, lastStateChange: payload.timestamp, newHist })
					// recalculate and (re)set the inconsistency state of the parent item
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
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoStateChange',
							node,
							oldState,
							prevLastStateChange,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					}
					if (payload.showUndoneMsg) commit('showLastEvent', { txt: `Change of item state is undone`, severity: INFO })
				}
			})
		}).catch(error => {
			let msg = 'setState: Could not read document with id ' + id + ',' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	assignToMyTeam({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const descendantsInfo = window.slVueTree.getDescendantsInfo(node)
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		}).then(res => {
			let tmpDoc = res.data
			const oldTeam = tmpDoc.team
			if (payload.newTeam != oldTeam) {
				const newHist = {
					"setTeamOwnerEvent": [oldTeam, payload.newTeam, descendantsInfo.count],
					"by": rootState.userData.user,
					"timestamp": payload.timestamp,
					"sessionId": rootState.userData.sessionId,
					"distributeEvent": true
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastChange || 0
				tmpDoc.lastChange = payload.timestamp

				tmpDoc.team = payload.newTeam
				const toDispatch = descendantsInfo.count > 0 ? {
					'setTeamDescendantsBulk': { newTeam: payload.newTeam, parentTitle: rootState.currentDoc.title, descendants: descendantsInfo.descendants }
				} : undefined

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch,
					onSuccessCallback: () => {
						// update the tree
						node.data.team = payload.newTeam
						for (let d of descendantsInfo.descendants) {
							d.data.team = payload.newTeam
						}
						commit('updateNodesAndCurrentDoc', { team: payload.newTeam, lastChange: payload.timestamp, newHist })

						if (descendantsInfo.count === 0) {
							commit('showLastEvent', { txt: `The owning team of '${node.title}' is changed to '${rootState.userData.myTeam}'.`, severity: INFO })
						} else commit('showLastEvent', { txt: `The owning team of '${node.title}' and ${descendantsInfo.count} descendants is changed to '${rootState.userData.myTeam}'.`, severity: INFO })

						if (payload.createUndo) {
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoChangeTeam',
								node,
								oldTeam,
								prevLastChange
							}
							rootState.changeHistory.unshift(entry)
						} else commit('showLastEvent', { txt: `Change of owning team is undone`, severity: INFO })
					}
				})
			}
		}).catch(error => {
			let msg = 'assignToMyTeam: Could not read document with _id ' + id + ',' + error
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
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.title = payload.newTitle
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { title: payload.newTitle, lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTitleChange',
							oldTitle,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item title is undone`, severity: INFO })
				}
			})
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
			const prevLastChange = tmpDoc.lastChange || 0
			tmpDoc.lastChange = payload.timestamp

			const oldSubType = tmpDoc.subtype
			tmpDoc.subtype = payload.newSubType
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { subtype: payload.newSubType, lastChange: tmpDoc.lastChange, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoSelectedPbiType',
							node,
							oldSubType,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item type is undone`, severity: INFO })
				}
			})
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
			// decode from base64
			const oldDescription = window.atob(tmpDoc.description)
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
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.description = newEncodedDescription
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoDescriptionChange',
							oldDescription,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item description type is undone`, severity: INFO })
				}
			})
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
			// decode from base64
			const oldAcceptance = window.atob(tmpDoc.acceptanceCriteria)
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
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.acceptanceCriteria = newEncodedAcceptance
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoAcceptanceChange',
							oldAcceptance,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: `Change of item acceptance criteria type is undone`, severity: INFO })
				}
			})
		}).catch(error => {
			let msg = 'saveAcceptance: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// ToDo: create indo?
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
			tmpDoc.lastCommentAddition = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { newComment, lastCommentAddition: payload.timestamp })
				}
			})
		}).catch(error => {
			let msg = 'addComment: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// ToDo: create undo?
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
			const newCommentToHistory = window.btoa(payload.comment)
			const newHist = {
				"commentToHistoryEvent": [newCommentToHistory],
				"by": rootState.userData.user,
				"timestamp": payload.timestamp,
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastCommentToHistory = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { lastCommentToHistory: payload.timestamp, newHist })
				}
			})
		}).catch(error => {
			let msg = 'addHistoryComment: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Create or update an existing document by creating a new revision.
	*/
	updateDoc({
		rootState,
		dispatch
	}, payload) {
		const id = payload.updatedDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + id + ' in database ' + payload.dbName)
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + id,
			data: payload.updatedDoc
		}).then(() => {
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
			const msg = 'updateDoc: Could not write document with url ' + payload.dbName + '/' + id + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateBulk({
		rootState,
		commit,
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
				// execute passed function if provided
				if (payload.onFailureCallback !== undefined) {
					payload.onFailureCallback()
				} else commit('showLastEvent', { txt: `The update failed due to conflicts or errors. Try again after sign-out or contact your administrator`, severity: WARNING })
			} else {
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
					commit('updateNodesAndCurrentDoc', { newDoc: doc })
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('loadItemByShortId: document with _id ' + doc._id + ' is loaded.')
				} else {
					commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your assigned products.`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with id ${shortId} is NOT found in the database.`, severity: WARNING })
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('loadItemByShortId: Could not read a batch of documents from database ' + rootState.userData.currentDb + ',' + error))
	},

	/* Add history to the parent and than save the document */
	createDocWithParentHist({
		rootState,
		dispatch,
		commit
	}, payload) {
		const _id = payload.newDoc.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const updatedDoc = res.data
			// create a history event for the parent to trigger an email message to followers
			const parentHist = {
				"newChildEvent": [payload.newNode.level, payload.newNode.ind + 1],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"distributeEvent": false
			}
			updatedDoc.lastChange = Date.now()
			updatedDoc.history.unshift(parentHist)
			const toDispatch = {
				'updateDoc': {
					dbName: rootState.userData.currentDb, updatedDoc: payload.newDoc, onSuccessCallback: () => {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoNewNode',
							newNode: payload.newNode
						}
						rootState.changeHistory.unshift(entry)
						// select and show the new node
						commit('updateNodesAndCurrentDoc', { newNode: payload.newNode, newDoc: payload.newDoc })
						commit('showLastEvent', { txt: `Item of type ${getLevelText(rootState.configData, payload.newNode.level)} is inserted.`, severity: INFO })
					}
				}
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc, toDispatch })
		}).catch(error => {
			let msg = 'createDocWithParentHist: Could not read parent document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load document by _id and make it the current backlog item */
	loadDoc({
		rootState,
		commit,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.id,
		}).then(res => {
			commit('updateNodesAndCurrentDoc', { newDoc: res.data })
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with id ' + payload.id + ' is loaded.')
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			let msg = 'loadDoc: Could not read document with _id ' + payload.id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
