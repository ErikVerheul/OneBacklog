import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const WARNING = 1
const ERROR = 2
const ON_HOLD = 1
const DONE = 6
const TASKLEVEL = 6
const NEW_STATE = 2
const DONE_STATE = 6

function getLevelText(configData, level) {
	if (level < 0 || level > TASKLEVEL) {
		return 'Level not supported'
	}
	return configData.itemType[level]
}
function concatMsg(oldMsg, newMsg) {
	if (newMsg === undefined) return oldMsg
	if (oldMsg === undefined || oldMsg.length === 0) return newMsg
	return oldMsg + ' ' + newMsg
}

const actions = {
	/* Update the req area of the item (null for no req area set) */
	// ToDo: create undo
	updateReqArea({
		rootState,
		commit,
		dispatch
	}, payload) {
		const id = payload.node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldDocArea = tmpDoc.reqarea
			tmpDoc.reqarea = payload.reqarea
			const newHist = {
				ignoreEvent: ['updateReqArea'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastChange = payload.timestamp
			// add to payload
			payload.oldParentReqArea = oldDocArea
			const toDispatch = [{ updateReqAreaChildren: payload }]
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				toDispatch,
				caller: 'updateReqArea',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node: payload.node, reqarea: payload.reqarea, lastChange: payload.timestamp, newHist })
				}
			})
		}).catch(error => {
			const msg = 'updateReqArea: Could not read document with _id ' + id + ', ' + error
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
		for (const c of childIds) {
			docsToGet.push({ id: c })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const oldParentReqArea = payload.oldParentReqArea
			const newReqArea = payload.reqarea
			for (const r of results) {
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
							ignoreEvent: ['updateReqAreaChildren'],
							timestamp: Date.now(),
							distributeEvent: false
						}
						doc.history.unshift(newHist)
						docs.push(doc)
					}
				}
			}
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs,
				caller: 'updateReqAreaChildren',
				onSuccessCallback: () => {
					// set reqarea for the child nodes
					const childNodes = payload.node.children
					for (const c of childNodes) {
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
			const msg = 'updateReqAreaChildren: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateColorDb({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// update the req area document
			const prevColor = tmpDoc.color
			tmpDoc.color = payload.newColor
			const newHist = {
				changeReqAreaColorEvent: [prevColor, payload.newColor],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'updateColorDb',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, reqAreaItemColor: payload.newColor, newHist })
					commit('updateColorMapper', { id, newColor: payload.newColor })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoReqAreaColorChange',
							prevColor
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of requirement area color indication is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setColor: Could not read document with _id ' + id + ', ' + error
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
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const wasFollower = rootGetters.isFollower
			const tmpFollowers = tmpDoc.followers
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
				subscribeEvent: [wasFollower],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			tmpDoc.followers = tmpFollowers
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'changeSubsription',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, followers: tmpFollowers, lastChange: payload.timestamp, newHist })
				}
			})
		}).catch(error => {
			const msg = 'changeSubsription: Could not read document with _id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldTsSize = tmpDoc.tssize
			const newHist = {
				setSizeEvent: [oldTsSize, payload.newSizeIdx],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.tssize = payload.newSizeIdx
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setTsSize',
				onSuccessCallback: () => {
					commit('showLastEvent', { txt: 'The T-shirt size of this item is changed', severity: INFO })
					commit('updateNodesAndCurrentDoc', { node, tssize: payload.newSizeIdx, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTsSizeChange',
							oldTsSize,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item T-shirt size is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setTsSize: Could not read document with _id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldPersonHours = tmpDoc.spikepersonhours
			const newHist = {
				setHrsEvent: [oldPersonHours, payload.newHrs],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.spikepersonhours = payload.newHrs
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setPersonHours',
				onSuccessCallback: () => {
					commit('showLastEvent', { txt: 'The maximum effort of this spike is changed', severity: INFO })
					commit('updateNodesAndCurrentDoc', { node, spikepersonhours: payload.newHrs, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoPersonHoursChange',
							oldPersonHours,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of spike person hours is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setPersonHours: Could not read document with id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// update size only
			const oldPoints = tmpDoc.spsize
			const newHist = {
				setPointsEvent: [oldPoints, payload.newPoints],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)

			tmpDoc.spsize = payload.newPoints
			const prevLastChange = tmpDoc.lastChange || 0
			tmpDoc.lastChange = payload.timestamp
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setStoryPoints',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, spsize: payload.newPoints, lastChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoStoryPointsChange',
							oldPoints,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item story points is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setStoryPoints: Could not read document with _id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* When called from the planning board the tree is aldo updated with the new state */
	setState({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldState = tmpDoc.state
			const newHist = {
				setStateEvent: [oldState, payload.newState, payload.newTeam, payload.position],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.state = payload.newState
			const prevLastStateChange = tmpDoc.lastStateChange
			tmpDoc.lastStateChange = payload.timestamp
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setState',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, state: payload.newState, sprintId: tmpDoc.sprintId, lastStateChange: payload.timestamp, newHist })
					let infoMsg = undefined
					let warnMsg = undefined
					const descendants = window.slVueTree.getDescendantsInfo(node).descendants
					// check on inconsistent state
					if (descendants.length > 0) {
						let highestState = NEW_STATE
						let allDone = true
						for (const d of descendants) {
							if (d.data.state > highestState) highestState = d.data.state
							if (d.data.state < DONE_STATE) allDone = false
						}
						if (payload.newState > highestState || payload.newState === DONE_STATE && !allDone) {
							// node has a higher state than any of its descendants or set to done while one of its descendants is not done
							commit('updateNodesAndCurrentDoc', { node, inconsistentState: true })
							if (payload.newState === DONE_STATE && !allDone) {
								warnMsg = 'You are assigning an inconsistant state to this item. Not all descendants are done.'
							} else warnMsg = 'You are assigning an inconsistant state to this item. None of the item\'s descendants reached this state.'
						} else {
							commit('updateNodesAndCurrentDoc', { node, inconsistentState: false })
						}
					}
					// check on team
					const parentNode = window.slVueTree.getParentNode(node)
					if (parentNode._id != 'root' && !rootGetters.isAPO && !rootGetters.isAdmin) {
						if (parentNode.data.team !== rootGetters.myTeam) {
							warnMsg = concatMsg(warnMsg, `The team of parent '${parentNode.title}' (${parentNode.data.team}) and your team (${rootGetters.myTeam}) do not match.
							Consider to assign team '${parentNode.data.team}' to this item`)
						}
					}
					// recalculate and (re)set the inconsistency state of the parent item
					if (parentNode && parentNode.data.state === DONE) {
						const descendants = window.slVueTree.getDescendantsInfo(parentNode).descendants
						let hasInconsistentState = false
						for (const d of descendants) {
							if (d.data.state === ON_HOLD) continue
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
						infoMsg = 'Item state has changed'
					} else infoMsg = 'Change of item state is undone'
					// show warnings or infos
					if (warnMsg) {
						commit('showLastEvent', { txt: warnMsg, severity: WARNING })
					} else {
						if (infoMsg) commit('showLastEvent', { txt: infoMsg, severity: INFO })
					}
				}
			})
		}).catch(error => {
			const msg = 'setState: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	assignToMyTeam({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const descendantsInfo = window.slVueTree.getDescendantsInfo(node)
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldTeam = tmpDoc.team
			if (payload.newTeam != oldTeam) {
				const newHist = {
					setTeamOwnerEvent: [oldTeam, payload.newTeam, descendantsInfo.count],
					by: rootState.userData.user,
					timestamp: Date.now(),
					sessionId: rootState.userData.sessionId,
					distributeEvent: true
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastChange || 0
				tmpDoc.lastChange = payload.timestamp

				tmpDoc.team = payload.newTeam
				const toDispatch = descendantsInfo.count > 0 ? [
					{ setTeamDescendantsBulk: { newTeam: payload.newTeam, parentTitle: rootState.currentDoc.title, descendants: descendantsInfo.descendants } }
				] : undefined

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					toDispatch,
					caller: 'assignToMyTeam',
					onSuccessCallback: () => {
						// update the tree
						for (const d of descendantsInfo.descendants) {
							commit('updateNodesAndCurrentDoc', { node: d, team: payload.newTeam, lastChange: payload.timestamp, newHist })
						}
						commit('updateNodesAndCurrentDoc', { node, team: payload.newTeam, lastChange: payload.timestamp, newHist })

						if (descendantsInfo.count === 0) {
							commit('showLastEvent', { txt: `The owning team of '${node.title}' is changed to '${rootGetters.myTeam}'.`, severity: INFO })
						} else commit('showLastEvent', { txt: `The owning team of '${node.title}' and ${descendantsInfo.count} descendants is changed to '${rootGetters.myTeam}'.`, severity: INFO })

						if (payload.createUndo) {
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoChangeTeam',
								node,
								oldTeam,
								prevLastChange
							}
							rootState.changeHistory.unshift(entry)
						} else commit('showLastEvent', { txt: 'Change of owning team is undone', severity: INFO })
					}
				})
			}
		}).catch(error => {
			const msg = 'assignToMyTeam: Could not read document with _id ' + id + ', ' + error
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
		for (const desc of payload.descendants) {
			docsToGet.push({ id: desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const oldTeam = doc.team
					if (payload.newTeam != oldTeam) {
						const newHist = {
							setTeamEventDescendant: [oldTeam, payload.newTeam, payload.parentTitle],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.userData.sessionId,
							distributeEvent: false
						}
						doc.history.unshift(newHist)
						// set the team name
						doc.team = payload.newTeam
						docs.push(doc)
					}
				}
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'setTeamDescendantsBulk' })
		}).catch(e => {
			const msg = 'setTeamDescendantsBulk: Could not read batch of documents: ' + e
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const oldTitle = rootState.currentDoc.title
			const tmpDoc = res.data
			const newHist = {
				setTitleEvent: [oldTitle, payload.newTitle],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.title = payload.newTitle
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setDocTitle',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, title: payload.newTitle, lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						commit('showLastEvent', { txt: 'The item title is changed', severity: INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTitleChange',
							oldTitle,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item title is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setDocTitle: Could not read document with id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const newHist = {
				setSubTypeEvent: [rootState.currentDoc.subtype, payload.newSubType],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange || 0
			tmpDoc.lastChange = payload.timestamp

			const oldSubType = tmpDoc.subtype
			tmpDoc.subtype = payload.newSubType
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setSubType',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, subtype: payload.newSubType, lastChange: tmpDoc.lastChange, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoSelectedPbiType',
							node,
							oldSubType,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item type is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'setSubType: Could not read document with id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// decode from base64
			const oldDescription = window.atob(tmpDoc.description)
			// encode to base64
			const newEncodedDescription = window.btoa(payload.newDescription)
			const newHist = {
				descriptionEvent: [tmpDoc.description, newEncodedDescription],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.description = newEncodedDescription
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'saveDescription',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, description: payload.newDescription, lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoDescriptionChange',
							oldDescription,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item description type is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'saveDescription: Could not read document with id ' + id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// decode from base64
			const oldAcceptance = window.atob(tmpDoc.acceptanceCriteria)
			// encode to base64
			const newEncodedAcceptance = window.btoa(payload.newAcceptance)
			const newHist = {
				acceptanceEvent: [tmpDoc.acceptanceCriteria, newEncodedAcceptance],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			tmpDoc.acceptanceCriteria = newEncodedAcceptance
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'saveAcceptance',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: payload.newAcceptance, lastContentChange: payload.timestamp, newHist })
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoAcceptanceChange',
							oldAcceptance,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of item acceptance criteria type is undone', severity: INFO })
				}
			})
		}).catch(error => {
			const msg = 'saveAcceptance: Could not read document with id ' + id + ', ' + error
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
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then((res) => {
			const tmpDoc = res.data
			const newComment = {
				addCommentEvent: window.btoa(payload.comment),
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.comments.unshift(newComment)
			tmpDoc.lastCommentAddition = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'addComment',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, newComment, lastCommentAddition: payload.timestamp })
				}
			})
		}).catch(error => {
			const msg = 'addComment: Could not read document with _id ' + id + ', ' + error
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
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const newCommentToHistory = window.btoa(payload.comment)
			const newHist = {
				commentToHistoryEvent: [newCommentToHistory],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.userData.sessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastCommentToHistory = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'addHistoryComment',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, lastCommentToHistory: payload.timestamp, newHist })
				}
			})
		}).catch(error => {
			const msg = 'addHistoryComment: Could not read document with _id ' + id + ', ' + error
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
		if (rootState.debug) console.log('updateDoc: updating document with _id = ' + id + ' in database ' + payload.dbName)
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + id,
			data: payload.updatedDoc
		}).then(() => {
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			// execute passed action if provided
			if (payload.toDispatch) {
				// additional dispatches
				for (const td of payload.toDispatch) {
					const name = Object.keys(td)[0]
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateBulk: dispatching ' + name)
					dispatch(name, td[name])
				}
			}
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			const msg = `updateDoc: (called by ${payload.caller}) Could not write document with url ${payload.dbName}/${id}, ${error}`
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
			data: { docs: payload.docs }
		}).then(res => {
			let updateOk = 0
			let updateConflict = 0
			let otherError = 0
			for (const result of res.data) {
				if (result.ok) updateOk++
				if (result.error === 'conflict') updateConflict++
				if (result.error && result.error != 'conflict') otherError++
			}
			// eslint-disable-next-line no-console
			const msg = 'updateBulk: ' + updateOk + ' documents are updated, ' + updateConflict + ' updates have a conflict, ' + otherError + ' updates failed on error'
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			if (updateConflict > 0 || otherError > 0) {
				dispatch('doLog', { event: msg, level: WARNING })
				// execute passed function if provided
				if (payload.onFailureCallback !== undefined) {
					payload.onFailureCallback()
				} else commit('showLastEvent', { txt: 'The update failed due to conflicts or errors. Try again after sign-out or contact your administrator', severity: WARNING })
			} else {
				// execute passed function if provided
				if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
				// execute passed action if provided
				if (payload.toDispatch) {
					// additional dispatches
					for (const td of payload.toDispatch) {
						const name = Object.keys(td)[0]
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log('updateBulk: dispatching ' + name)
						dispatch(name, td[name])
					}
				}
			}
		}).catch(error => {
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			const msg = `updateBulk: (called by ${payload.caller}) Could not update batch of documents, ${error}`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load a backlog item by short id */
	loadItemByShortId({
		rootState,
		rootGetters,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = `/_design/design1/_view/shortIdFilter?startkey=["${shortId}"]&endkey=["${shortId}"]&include_docs=true`
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (rootGetters.getMyAssignedProductIds.includes(doc.productId)) {
					if (rows.length > 1) {
						commit('showLastEvent', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed`, severity: INFO })
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
					commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your selected products`, severity: INFO })
				} else {
					commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your assigned products`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: WARNING })
		}).catch(() => {
			commit('showLastEvent', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: WARNING })
		})
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
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			const parentDoc = res.data
			// create a history event for the parent to trigger an email message to followers
			const parentHist = {
				newChildEvent: [payload.newNode.level, payload.newNode.ind + 1],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			parentDoc.lastChange = Date.now()
			parentDoc.history.unshift(parentHist)
			const toDispatch = [{
				updateDoc: {
					dbName: rootState.userData.currentDb,
					updatedDoc: payload.newDoc,
					onSuccessCallback: () => {
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
			}]
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: parentDoc, toDispatch, caller: 'createDocWithParentHist' })
		}).catch(error => {
			const msg = 'createDocWithParentHist: Could not read parent document with id ' + _id + ', ' + error
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
			url: rootState.userData.currentDb + '/' + payload.id
		}).then(res => {
			commit('updateNodesAndCurrentDoc', { newDoc: res.data })
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with id ' + payload.id + ' is loaded.')
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			const msg = 'loadDoc: Could not read document with _id ' + payload.id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
