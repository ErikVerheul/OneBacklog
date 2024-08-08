import { SEV, STATE, LEVEL } from '../../constants.js'
import { uniTob64, b64ToUni } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

function concatMsg(oldMsg, newMsg) {
	if (newMsg === undefined) return oldMsg
	if (oldMsg === undefined || oldMsg.length === 0) return newMsg
	return oldMsg + ' ' + newMsg
}

/*
	* Toggle the subscription for email change notifications of the selected item.
	* Also update the current document to see an immediate update of the button text and the history.
	*/
const actions = {
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
					if (tmpFollowers[i].user === rootState.userData.user) {
						tmpFollowers.splice(i, 1)
					}
				}
				commit('addToEventList', { txt: `Sending change notices for this item is stopped`, severity: SEV.INFO })
			} else {
				tmpFollowers.push({ user: rootState.userData.user })
				commit('addToEventList', { txt: `Change notices for this item will be send to your e-mail address ${rootState.userData.email}`, severity: SEV.INFO })
			}
			const newHist = {
				subscribeEvent: [wasFollower],
				by: rootState.userData.user,
				email: rootState.userData.email,
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
			const msg = `changeSubsription: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* If the selected item is subscribed for email change notifications => unsubscribe that item and all of its descendants,
	* if not subscribed => subscribe that item and all of its descendants.
	*
	* Also update the current document to see an immediate update in the button text and the history
	*/

	changeSubsriptionsBulk({
		rootState,
		commit,
		rootGetters,
		dispatch
	}, payload) {
		const node = payload.node
		let currentNodeFollowers = []
		let currentNodeHist = {}
		const descendantsInfo = rootState.helpersRef.getDescendantsInfo(node)
		const docsToGet = [{ id: node._id }]
		for (const id of descendantsInfo.ids) {
			docsToGet.push({ id })
		}
		rootState.busyChangingSubscriptions = true
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const selectedItemWasFollowed = rootGetters.isFollower
			const results = res.data.results
			const docs = []
			for (const r of results) {
				let thisDocIsUpdated = false
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const tmpFollowers = doc.followers || []
					// ToDo: temporary patch, romove over time
					for (let i = 0; i < tmpFollowers.length; i++) {
						// remove 'old' email entries
						if (tmpFollowers[i].email) {
							tmpFollowers.splice(i, 1)
							thisDocIsUpdated = true
						}
					}
					if (selectedItemWasFollowed) {
						// set item to be unfollowed by the current user				
						for (let i = 0; i < tmpFollowers.length; i++) {
							if (tmpFollowers[i].user === rootState.userData.user) {
								tmpFollowers.splice(i, 1)
								thisDocIsUpdated = true
							}
						}
					} else {
						// set item to be followed by the current user
						let isAlreadyFollowing = false
						for (let i = 0; i < tmpFollowers.length; i++) {
							if (tmpFollowers[i].user === rootState.userData.user) {
								isAlreadyFollowing = true
							}
						}
						// include the users name to follow this item if not already
						if (!isAlreadyFollowing) {
							tmpFollowers.push({ user: rootState.userData.user })
							thisDocIsUpdated = true
						}
					}

					if (!thisDocIsUpdated) continue

					const newHist = {
						subscribeEvent: [selectedItemWasFollowed],
						by: rootState.userData.user,
						email: rootState.userData.email,
						timestamp: Date.now(),
						distributeEvent: false
					}
					if (doc._id === node._id) {
						currentNodeFollowers = tmpFollowers.slice(),
							currentNodeHist = Object.assign({}, newHist)
					}
					doc.followers = tmpFollowers
					doc.history.unshift(newHist)
					doc.lastChange = payload.timestamp
					docs.push(doc)
				}
			}
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb, docs, caller: 'changeSubsriptionsBulk', onSuccessCallback: () => {
					rootState.busyChangingSubscriptions = false
					commit('updateNodesAndCurrentDoc', { node, followers: currentNodeFollowers, lastChange: payload.timestamp, newHist: currentNodeHist })
				}
			})
		}).catch(e => {
			rootState.busyChangingSubscriptions = false
			const msg = 'changeSubsriptionsBulk: Could not read batch of documents: ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	setTsSize({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldTsSize = tmpDoc.tssize
			const newHist = {
				setSizeEvent: [oldTsSize, payload.newSizeIdx],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
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
					commit('updateNodesAndCurrentDoc', { node, tssize: payload.newSizeIdx, lastChange: payload.timestamp, newHist })
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: 'The T-shirt size of this item is changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTsSizeChange',
							oldTsSize,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else {
						commit('addToEventList', { txt: 'Change of item T-shirt size is undone', severity: SEV.INFO })
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setTsSize: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	setPersonHours({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldPersonHours = tmpDoc.spikepersonhours
			let updateBoards = undefined
			if (tmpDoc.sprintId) {
				updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
			}
			const newHist = {
				setHrsEvent: [oldPersonHours, payload.newHrs],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true,
				updateBoards
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
					commit('updateNodesAndCurrentDoc', { node, spikePersonHours: payload.newHrs, lastChange: payload.timestamp, newHist })
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: 'The maximum effort of this spike is changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoPersonHoursChange',
							oldPersonHours,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else {
						commit('addToEventList', { txt: 'Change of spike person hours is undone', severity: SEV.INFO })
						rootState.busyWithLastUndo = false
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setPersonHours: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	setStoryPoints({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// update size only
			const oldPoints = tmpDoc.spsize
			let updateBoards = undefined
			if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.PBI || tmpDoc.level === LEVEL.TASK)) {
				updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
			}
			const newHist = {
				setPointsEvent: [oldPoints, payload.newPoints],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true,
				updateBoards
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
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: 'The story points assigned to this item have changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoStoryPointsChange',
							oldPoints,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else {
						commit('addToEventList', { txt: 'Change of item story points is undone', severity: SEV.INFO })
						rootState.busyWithLastUndo = false
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setStoryPoints: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Change the state of an item.
	*	Warn for an inconsistent state:
	* - the node's new state cannot be higher than one of its descendants
	* - the node's state cannot be done if any of its descendants is not done
	* note: the new state will be set irrespective of the warning
	* note: the node's state can be set higher than any of its ancestors without warning
	* When called from the planning board the tree is aldo updated with the new state
	*/
	setState({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldState = tmpDoc.state
			let updateBoards = undefined
			if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.PBI || tmpDoc.level === LEVEL.TASK)) {
				updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
			}
			const newHist = {
				setStateEvent: [oldState, payload.newState, node.data.team],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true,
				updateBoards
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.state = payload.newState
			const prevLastStateChange = tmpDoc.lastStateChange
			tmpDoc.lastStateChange = payload.timestamp
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp

			// ToDo: if newState === onHold create a toDispatch to put all descendants also on hold

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'setState',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, state: payload.newState, sprintId: tmpDoc.sprintId, lastStateChange: payload.timestamp, newHist })
					let infoMsg = undefined
					let warnMsg = undefined
					// check on team
					const parentNode = rootState.helpersRef.getParentNode(node)
					if (parentNode && parentNode._id != 'root' && !rootGetters.isAPO && !rootGetters.isAdmin && tmpDoc.level >= LEVEL.FEATURE) {
						if (parentNode.data.team !== rootGetters.myTeam) {
							warnMsg = concatMsg(warnMsg, `The team of parent '${parentNode.title}' (${parentNode.data.team}) and your team (${rootGetters.myTeam}) do not match.
							Consider to assign team '${parentNode.data.team}' to this item`)
						}
					}
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
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
					} else {
						infoMsg = 'Change of item state is undone'
						rootState.busyWithLastUndo = false
					}
					// show warnings or infos
					if (warnMsg) {
						commit('addToEventList', { txt: warnMsg, severity: SEV.WARNING })
					} else {
						if (infoMsg) commit('addToEventList', { txt: infoMsg, severity: SEV.INFO })
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setState: Could not read document with id ${id}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Assign the item and its descendants to my team if the item is not done.
	* The assigned sprints, not done, are removed.
	* The items will be removed from the board of the 'old' team if in view.
	*/
	assignToMyTeam({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const descendantsInfo = rootState.helpersRef.getDescendantsInfo(node)
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldTeam = tmpDoc.team
			if (payload.newTeam != oldTeam) {
				let updateBoards = undefined
				if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.PBI || tmpDoc.level === LEVEL.TASK)) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setTeamOwnerEvent: [oldTeam, payload.newTeam, descendantsInfo.count],
					by: rootState.userData.user,
					email: rootState.userData.email,
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					distributeEvent: true,
					updateBoards
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastChange || 0
				if (tmpDoc.state !== STATE.DONE) {
					// set the team name and delete the spint assignment
					tmpDoc.team = payload.newTeam
					delete tmpDoc.sprintId
					tmpDoc.lastChange = payload.timestamp
				}
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

						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							if (descendantsInfo.count === 0) {
								commit('addToEventList', { txt: `The owning team of '${node.title}' is changed to '${rootGetters.myTeam}'.`, severity: SEV.INFO })
							} else commit('addToEventList', { txt: `The owning team of '${node.title}' and ${descendantsInfo.count} descendants is changed to '${rootGetters.myTeam}'.`, severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoChangeTeam',
								node,
								oldTeam,
								prevLastChange
							}
							rootState.changeHistory.unshift(entry)
						} else {
							rootState.busyWithLastUndo = false
							commit('addToEventList', { txt: 'Change of owning team is undone', severity: SEV.INFO })
						}
					}, onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					}
				})
			}
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `assignToMyTeam: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
					if (doc.state !== STATE.DONE) {
						const oldTeam = doc.team
						if (payload.newTeam != oldTeam) {
							const newHist = {
								setTeamEventDescendant: [oldTeam, payload.newTeam, payload.parentTitle],
								by: rootState.userData.user,
								email: rootState.userData.email,
								timestamp: Date.now(),
								sessionId: rootState.mySessionId,
								distributeEvent: false
							}
							doc.history.unshift(newHist)
							// set the team name and delete the spint assignment
							doc.team = payload.newTeam
							delete doc.sprintId
							doc.lastChange = Date.now()
							docs.push(doc)
						}
					}
				}
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'setTeamDescendantsBulk' })
		}).catch(e => {
			const msg = 'setTeamDescendantsBulk: Could not read batch of documents: ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	setDocTitle({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldTitle = tmpDoc.title
			let updateBoards = undefined
			if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.PBI || tmpDoc.level === LEVEL.TASK)) {
				updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
			}
			const newHist = {
				setTitleEvent: [oldTitle, payload.newTitle],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true,
				updateBoards
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
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: 'The item title is changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoTitleChange',
							oldTitle,
							prevLastContentChange
						}
						rootState.changeHistory.unshift(entry)
					} else {
						commit('addToEventList', { txt: 'Change of item title is undone', severity: SEV.INFO })
						rootState.busyWithLastUndo = false
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setDocTitle: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	setSubType({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			let updateBoards = undefined
			if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.PBI || tmpDoc.level === LEVEL.TASK)) {
				updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
			}
			const newHist = {
				setSubTypeEvent: [rootState.currentDoc.subtype, payload.newSubType],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true,
				updateBoards
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
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: 'The item type is changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoSelectedPbiType',
							node,
							oldSubType,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					} else {
						commit('addToEventList', { txt: 'Change of item type is undone', severity: SEV.INFO })
						rootState.busyWithLastUndo = false
					}
				}, onFailureCallback: () => {
					if (payload.isUndoAction) rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `setSubType: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	saveDescription({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// decode from base64
			const oldDescription = b64ToUni(tmpDoc.description)
			// encode to base64
			const newEncodedDescription = uniTob64(payload.newDescription)
			const newHist = {
				descriptionEvent: [tmpDoc.description, newEncodedDescription],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp
			tmpDoc.description = newEncodedDescription
			
			const onSuccessCallback = () => {
				rootState.isDescriptionEdited = false
				commit('updateNodesAndCurrentDoc', { node, description: payload.newDescription, lastContentChange: payload.timestamp, newHist })
				if (!payload.isUndoAction || payload.isUndoAction === undefined) {
					commit('addToEventList', { txt: `The description of item with short id ${id.slice(-5)} is changed`, severity: SEV.INFO })
					// create an entry for undoing the change in a last-in first-out sequence
					const entry = {
						node,
						type: 'undoDescriptionChange',
						oldDescription,
						prevLastContentChange
					}
					rootState.changeHistory.unshift(entry)
				} else {
					commit('addToEventList', { txt: 'Change of the item description is undone', severity: SEV.INFO })
					rootState.busyWithLastUndo = false
				}
			}

			const onFailureCallback = () => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
			}

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'saveDescription',
				onSuccessCallback,
				onFailureCallback,
				toDispatch: payload.toDispatch
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `saveDescription: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	saveAcceptance({
		rootState,
		commit,
		dispatch
	}, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// decode from base64
			const oldAcceptance = b64ToUni(tmpDoc.acceptanceCriteria)
			// encode to base64
			const newEncodedAcceptance = uniTob64(payload.newAcceptance)
			const newHist = {
				acceptanceEvent: [tmpDoc.acceptanceCriteria, newEncodedAcceptance],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastContentChange = tmpDoc.lastContentChange || 0
			tmpDoc.lastContentChange = payload.timestamp
			tmpDoc.lastChange = payload.timestamp
			tmpDoc.acceptanceCriteria = newEncodedAcceptance

			const onSuccessCallback = () => {
				rootState.isAcceptanceEdited = false
				commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: payload.newAcceptance, lastContentChange: payload.timestamp, newHist })
				if (!payload.isUndoAction || payload.isUndoAction === undefined) {
					commit('addToEventList', { txt: `The acceptance criteria  of item with short id ${id.slice(-5)} are changed`, severity: SEV.INFO })
					// create an entry for undoing the change in a last-in first-out sequence
					const entry = {
						node,
						type: 'undoAcceptanceChange',
						oldAcceptance,
						prevLastContentChange
					}
					rootState.changeHistory.unshift(entry)
				} else {
					commit('addToEventList', { txt: 'Change of the item acceptance criteria is undone', severity: SEV.INFO })
					rootState.busyWithLastUndo = false
				}
			}

			const onFailureCallback = () => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
			}

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'saveAcceptance',
				onSuccessCallback,
				onFailureCallback,			
				toDispatch: payload.toDispatch
			})
		}).catch(error => {
			if (payload.isUndoAction) rootState.busyWithLastUndo = false
			const msg = `saveAcceptance: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Comments are added to the comments array of the doc */
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
			const newHist = {
				ignoreEvent: ['A new comment was added'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			tmpDoc.history.unshift(newHist)
			tmpDoc.lastCommentAddition = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			const newComment = {
				addCommentEvent: [uniTob64(payload.comment)],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true
			}
			tmpDoc.comments.unshift(newComment)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'addComment',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, replaceComments: tmpDoc.comments })
				}
			})
		}).catch(error => {
			const msg = `addComment: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	replaceComment({
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
			// replace the comment in the document.comments array
			let couldReplace = false
			for (let i = 0; i < tmpDoc.comments.length; i++) {
				const uneditedCommentObj = tmpDoc.comments[i]
				if (Object.keys(uneditedCommentObj)[0] === 'addCommentEvent' && uneditedCommentObj.timestamp === payload.commentObjToBeReplaced.timestamp) {
					tmpDoc.comments[i].addCommentEvent = [uniTob64(payload.editedCommentText)]
					tmpDoc.comments[i].timestamp = Date.now()
					couldReplace = true
					break
				}
			}
			if (couldReplace) {
				const newHist = {
					replaceCommentEvent: [uniTob64(payload.editedCommentText)],
					by: rootState.userData.user,
					email: rootState.userData.email,
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					distributeEvent: true
				}
				tmpDoc.history.unshift(newHist)
			} else {
				const msg = `replaceComment: Could not find the comment to replace in document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
				return
			}

			tmpDoc.lastCommentAddition = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'replaceComment',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, replaceComments: tmpDoc.comments })
				}
			})
		}).catch(error => {
			const msg = `replaceComment: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	replaceHistComment({
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
			// replace the comment in the history array
			let couldReplace = false
			for (let i = 0; i < tmpDoc.history.length; i++) {
				if (Object.keys(tmpDoc.history[i])[0] === 'commentToHistoryEvent') {
					const uneditedCommentObj = tmpDoc.history[i]
					if (uneditedCommentObj.timestamp === payload.commentObjToBeReplaced.timestamp) {
						tmpDoc.history[i].commentToHistoryEvent = [uniTob64(payload.editedCommentText)]
						tmpDoc.history[i].timestamp = Date.now()
						couldReplace = true
						break
					}
				}
			}
			if (!couldReplace) {
				const msg = `replaceComment: Could not find the history comment to replace in document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
				return
			}

			// do not write a history entry here; we create a modified history entry with updated content and timestamp
			tmpDoc.lastCommentAddition = payload.timestamp
			tmpDoc.lastChange = payload.timestamp

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'replaceHistComment',
				onSuccessCallback: () => {
					commit('updateNodesAndCurrentDoc', { node, replaceHistory: tmpDoc.history })
				}
			})
		}).catch(error => {
			const msg = `replaceHistComment: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

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
			const newHist = {
				commentToHistoryEvent: [uniTob64(payload.comment)],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
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
			const msg = `addHistoryComment: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* 
	* When a user changes team, the tasks he ownes need to be assigned to his new team also 
	* Note that the doc's sptintId can be null if the task is removed from the sprint 
	*/
	updateTasksToNewTeam({
		rootState,
		commit,
		dispatch
	}, payload) {
		const dbName = rootState.userData.currentDb
		const taskOwner = payload.userName
		globalAxios({
			method: 'GET',
			url: dbName + `/_design/design1/_view/assignedTasksToUser?startkey=["${taskOwner}"]&endkey=["${taskOwner}"]&include_docs=true`
		}).then(res => {
			const results = res.data.rows
			const docsToUpdate = []
			for (const r of results) {
				const tmpDoc = r.doc
				tmpDoc.team = payload.newTeam
				const newHist = {
					itemToNewTeamEvent: [payload.newTeam],
					by: rootState.userData.user,
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					distributeEvent: true
				}
				tmpDoc.history.unshift(newHist)
				docsToUpdate.push(tmpDoc)
			}
			commit('addToEventList', { txt: `${docsToUpdate.length} of your tasks will be reassigned to team '${payload.newTeam}'`, severity: SEV.INFO })
			const toDispatch = [{ changeTeamAsync: { newTeam: payload.newTeam } }]
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb, docs: docsToUpdate, caller: 'updateTasksToNewTeam', toDispatch, onSuccessCallback: () => {
					const msg = `updateTasksToNewTeam: ${docsToUpdate.length} tasks from user '${taskOwner}' are assigned to team '${payload.newTeam}'`
					dispatch('doLog', { event: msg, level: SEV.INFO })
					if (rootState.currentView !== 'coarseProduct') {
						// the overview does not load the task level
						docsToUpdate.forEach(doc => {
							const node = rootState.helpersRef.getNodeById(doc._id)
							commit('updateNodesAndCurrentDoc', { node, team: payload.newTeam })
						})
					}
				}
			})
		}).catch(error => {
			const msg = `updateTasksToNewTeam: Could not read documents. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Create or update an existing document by creating a new revision.
	* Must call loadDoc on success to update the current doc visable to the user.
	* Executes a onSuccessCallback and onFailureCallback if provided in the payload.
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
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			// execute passed actions if provided
			dispatch('additionalActions', payload)
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback) payload.onFailureCallback()
			const msg = `updateDoc: (called by ${payload.caller}) Could not write document with url ${payload.dbName}/${id}. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Update or create multiple documents in bulk.
	* Executes a onSuccessCallback, onFailureCallback and additionalActions callback if provided in the payload.
	*/
	updateBulk({
		commit,
		dispatch
	}, payload) {
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_bulk_docs',
			data: { docs: payload.docs }
		}).then(res => {
			let updateOkCount = 0
			let updateConflictCount = 0
			let otherErrorCount = 0
			for (const result of res.data) {
				if (result.ok) updateOkCount++
				if (result.error === 'conflict') updateConflictCount++
				if (result.error && result.error != 'conflict') otherErrorCount++
			}
			if (updateConflictCount > 0 || otherErrorCount > 0) {
				const msg = `updateBulk: (called by ${payload.caller}) ${updateOkCount} documents are updated, ${updateConflictCount} updates have a conflict, ${otherErrorCount} updates failed on error`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
				// execute passed function if provided
				if (payload.onFailureCallback) {
					payload.onFailureCallback()
				} else commit('addToEventList', { txt: 'The update failed due to conflicts or errors. Try again after sign-out or contact your administrator', severity: SEV.WARNING })
			} else {
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback) payload.onFailureCallback()
			const msg = `updateBulk: (called by ${payload.caller}) Could not update batch of documents with ids ${payload.docs.map(doc => doc._id)}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
					if (rootGetters.getMyProductSubscriptions.includes(doc.productId)) {
						if (rows.length > 1) {
							commit('addToEventList', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed`, severity: SEV.INFO })
							let ids = ''
							for (let i = 0; i < rows.length; i++) {
								ids += rows[i].doc._id + ', '
							}
							const msg = 'Multiple documents found for shortId ' + shortId + ' The documents ids are ' + ids
							dispatch('doLog', { event: msg, level: SEV.WARNING })
						}
						commit('updateNodesAndCurrentDoc', { newDoc: doc })
					} else {
						commit('addToEventList', { txt: `The document with id ${doc._id} is found but not in your selected products. Select all products and try again`, severity: SEV.INFO })
					}
				} else {
					commit('addToEventList', { txt: `The document with id ${doc._id} is found but not in your assigned products`, severity: SEV.WARNING })
				}
			} else commit('addToEventList', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: SEV.WARNING })
		}).catch(() => {
			commit('addToEventList', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: SEV.WARNING })
		})
	},

	/* Create the document in the database, create the node, select it and add history to the parent document */
	createDocWithParentHist({
		rootState,
		dispatch,
		commit
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.newDoc.parentId
		}).then(res => {
			const parentDoc = res.data
			// create a history event for the parent to trigger an email message to followers
			const parentHist = {
				newChildEvent: [payload.newNode.level, payload.newNode.ind + 1],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: false
			}
			parentDoc.lastChange = Date.now()
			parentDoc.history.unshift(parentHist)
			const toDispatch = [{
				// create the new document
				updateDoc: {
					dbName: rootState.userData.currentDb,
					updatedDoc: payload.newDoc,
					onSuccessCallback: () => {
						// insert the new node in the tree and set the path and ind
						rootState.helpersRef.insertNodes(payload.newNodeLocation, [payload.newNode])[0]
						// the level, productId, parentId and priority are reset and should equal the preflight values; check the priority value only
						if (payload.newDoc.priority === payload.newNode.data.priority) {
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoNewNode',
								newNode: payload.newNode
							}
							rootState.changeHistory.unshift(entry)
							// select and show the new node
							commit('updateNodesAndCurrentDoc', { newNode: payload.newNode, newDoc: payload.newDoc })
							commit('addToEventList', { txt: `Item of type ${rootState.helpersRef.getLevelText(payload.newNode.level)} is inserted.`, severity: SEV.INFO })
						} else {
							// the priority has changed after the preflihgt insert; revert the change in the tree and database
							const msg = `createDocWithParentHist: doc priority ${payload.newDoc.priority} of document with id ${payload.newDoc._id} does not match node priority ${payload.newNode.data.priority}.
							The tree structure has changed while the new document was created. The insertion is undone.`
							dispatch('doLog', { event: msg, level: SEV.ERROR })
							// note: while this action is executed the user cannot undo other actions
							dispatch('removeBranch', { node: payload.newNode, undoOnError: true, isUndoAction: true })
						}
					}
				}
			}]
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: parentDoc, toDispatch, caller: 'createDocWithParentHist' })
		}).catch(error => {
			const msg = `createDocWithParentHist: Could not read parent document with id ${payload.newDoc.parentId}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Load document by _id and make it the current backlog item.
	* Executes a onSuccessCallback and onFailureCallback callback if provided in the payload.
	*/
	loadDoc({
		rootState,
		commit,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.id
		}).then(res => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with id ' + payload.id + ' is loaded.')
			commit('updateNodesAndCurrentDoc', { newDoc: res.data })
			// execute passed function if provided
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			// execute passed actions if provided
			dispatch('additionalActions', payload)
		}).catch(error => {
			// execute passed function if provided
			if (payload.onFailureCallback) payload.onFailureCallback()
			const msg = `loadDoc: Could not read document with _id ${payload.id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Send a message to other users online with access to the current product */
	sendMessageAsync({
		rootState,
		dispatch
	}, newHist) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/messenger'
		}).then(res => {
			const tmpDoc = res.data
			// add the productId this message applies to
			tmpDoc.productId = rootState.currentProductId
			// replace the history
			tmpDoc.history = [newHist]
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, caller: 'sendMessageAsync' })
		}).catch(error => {
			const msg = `sendMessageAsync: Could not read the 'messenger' document. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
