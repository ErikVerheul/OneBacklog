import { SEV, LEVEL } from '../../constants.js'
import { applyRetention, uniTob64, b64ToUni, prepareDocForPresentation } from '../../common_functions.js'
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
	changeSubsription({ rootState, commit, rootGetters, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
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
					tmpFollowers.push({ user: rootState.userData.user, email: rootState.userData.email })
					commit('addToEventList', { txt: `Change notices for this item will be send to your e-mail address ${rootState.userData.email}`, severity: SEV.INFO })
				}
				const newHist = {
					subscribeEvent: [wasFollower],
					by: rootState.userData.user,
					timestamp: Date.now(),
					isListed: true,
					distributeEvent: false,
				}
				tmpDoc.followers = tmpFollowers
				tmpDoc.history.unshift(newHist)
				tmpDoc.lastOtherChange = payload.timestamp

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'changeSubsription',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, followers: tmpFollowers, lastOtherChange: payload.timestamp })
					},
				})
			})
			.catch((error) => {
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

	changeSubsriptionsBulk({ rootState, commit, rootGetters, dispatch }, payload) {
		const node = payload.node
		let currentNodeFollowers = []
		const descendantsInfo = rootState.helpersRef.getDescendantsInfo(node)
		const docIdsToGet = [{ id: node._id }]
		for (const id of descendantsInfo.ids) {
			docIdsToGet.push({ id })
		}
		rootState.busyChangingSubscriptions = true
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
				const selectedItemWasFollowed = rootGetters.isFollower
				const results = res.data.results
				const docs = []
				for (const r of results) {
					let thisDocIsUpdated = false
					const envelope = r.docs[0]
					if (envelope.ok) {
						const doc = envelope.ok
						const tmpFollowers = doc.followers || []
						if (selectedItemWasFollowed) {
							// set item to be unfollowed by the current user
							for (let i = 0; i < tmpFollowers.length; i++) {
								if (tmpFollowers[i].user === rootState.userData.user) {
									tmpFollowers.splice(i, 1)
									thisDocIsUpdated = true
								}
							}
						} else {
							// set item to be followed by the current user if not already following
							let isAlreadyFollowing = false
							for (let i = 0; i < tmpFollowers.length; i++) {
								if (tmpFollowers[i].user === rootState.userData.user) {
									isAlreadyFollowing = true
								}
							}
							// include the users name and email to follow this item if not already
							if (!isAlreadyFollowing) {
								tmpFollowers.push({ user: rootState.userData.user, email: rootState.userData.email })
								thisDocIsUpdated = true
							}
						}

						if (!thisDocIsUpdated) continue

						const newHist = {
							subscribeEvent: [selectedItemWasFollowed],
							by: rootState.userData.user,
							timestamp: Date.now(),
							isListed: true,
							distributeEvent: false,
						}
						if (doc._id === node._id) {
							currentNodeFollowers = tmpFollowers.slice()
						}
						doc.followers = tmpFollowers
						doc.history.unshift(newHist)
						doc.lastOtherChange = payload.timestamp
						docs.push(doc)
					}
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb,
					docs,
					caller: 'changeSubsriptionsBulk',
					onSuccessCallback: () => {
						rootState.busyChangingSubscriptions = false
						commit('updateNodewithDocChange', { node, followers: currentNodeFollowers, lastOtherChange: payload.timestamp })
					},
				})
			})
			.catch((e) => {
				rootState.busyChangingSubscriptions = false
				const msg = 'changeSubsriptionsBulk: Could not read batch of documents: ' + e
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	setTsSize({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const oldTsSize = tmpDoc.tssize
				const newHist = {
					setSizeEvent: [oldTsSize, payload.newSizeIdx],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastOtherChange
				tmpDoc.lastOtherChange = payload.timestamp

				tmpDoc.tssize = payload.newSizeIdx
				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setTsSize',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, lastOtherChange: payload.timestamp })
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							commit('addToEventList', { txt: 'The T-shirt size of this item is changed', severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								node,
								type: 'undoTsSizeChange',
								oldTsSize,
								prevLastChange,
							}
							rootState.changeHistory.unshift(entry)
						} else {
							commit('addToEventList', { txt: 'Change of item T-shirt size is undone', severity: SEV.INFO })
							if (payload.isUndoAction) rootState.busyWithLastUndo = false
						}
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `setTsSize: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	setPersonHours({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const oldPersonHours = tmpDoc.spikepersonhours
				let updateBoards = undefined
				if (tmpDoc.sprintId) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setHrsEvent: [oldPersonHours, payload.newHrs],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
					updateBoards,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastOtherChange
				tmpDoc.lastOtherChange = payload.timestamp

				tmpDoc.spikepersonhours = payload.newHrs
				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setPersonHours',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, lastOtherChange: payload.timestamp })
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							commit('addToEventList', { txt: 'The maximum effort of this spike is changed', severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								node,
								type: 'undoPersonHoursChange',
								oldPersonHours,
								prevLastChange,
							}
							rootState.changeHistory.unshift(entry)
						} else {
							commit('addToEventList', { txt: 'Change of spike person hours is undone', severity: SEV.INFO })
							rootState.busyWithLastUndo = false
						}
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `setPersonHours: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	setStoryPoints({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				// update size only
				const oldPoints = tmpDoc.spsize
				let updateBoards = undefined
				if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.US || tmpDoc.level === LEVEL.TASK)) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setPointsEvent: [oldPoints, payload.newPoints],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
					updateBoards,
				}
				tmpDoc.history.unshift(newHist)

				tmpDoc.spsize = payload.newPoints
				const prevLastChange = tmpDoc.lastOtherChange || 0
				tmpDoc.lastOtherChange = payload.timestamp
				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setStoryPoints',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, lastOtherChange: payload.timestamp })
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							commit('addToEventList', { txt: 'The story points assigned to this item have changed', severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								node,
								type: 'undoStoryPointsChange',
								oldPoints,
								prevLastChange,
							}
							rootState.changeHistory.unshift(entry)
						} else {
							commit('addToEventList', { txt: 'Change of item story points is undone', severity: SEV.INFO })
							rootState.busyWithLastUndo = false
						}
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
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
	 * When called from the planning board the tree is also updated with the new state
	 */
	setState({ rootState, rootGetters, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const oldState = tmpDoc.state
				let updateBoards = undefined
				if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.US || tmpDoc.level === LEVEL.TASK)) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setStateEvent: [oldState, payload.newState, node.data.team],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
					updateBoards,
				}
				tmpDoc.history.unshift(newHist)
				tmpDoc.state = payload.newState
				const prevLastStateChange = tmpDoc.lastStateChange
				tmpDoc.lastStateChange = payload.timestamp
				const prevLastChange = tmpDoc.lastOtherChange
				tmpDoc.lastOtherChange = payload.timestamp

				// ToDo: if newState === onHold create a toDispatch to put all descendants also on hold

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setState',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, state: payload.newState, sprintId: tmpDoc.sprintId, lastStateChange: payload.timestamp })
						let infoMsg = undefined
						let warnMsg = undefined
						// check on team
						const parentNode = rootState.helpersRef.getParentNode(node)
						if (parentNode && parentNode._id != 'root' && !rootGetters.isAPO && !rootGetters.isAdmin && tmpDoc.level >= LEVEL.FEATURE) {
							if (parentNode.data.team !== rootGetters.myTeam) {
								warnMsg = concatMsg(
									warnMsg,
									`The team of parent '${parentNode.title}' (${parentNode.data.team}) and your team (${rootGetters.myTeam}) do not match.
							Consider to assign team '${parentNode.data.team}' to this item`,
								)
							}
						}
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoStateChange',
								node,
								oldState,
								prevLastStateChange,
								prevLastChange,
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
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `setState: Could not read document with id ${id}, ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	setDocTitle({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const oldTitle = tmpDoc.title
				let updateBoards = undefined
				if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.US || tmpDoc.level === LEVEL.TASK)) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setTitleEvent: [oldTitle, payload.newTitle],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
					updateBoards,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastContentChange = tmpDoc.lastContentChange || 0
				tmpDoc.lastContentChange = payload.timestamp

				tmpDoc.title = payload.newTitle
				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setDocTitle',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, title: payload.newTitle, lastContentChange: payload.timestamp })
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							commit('addToEventList', { txt: 'The item title is changed', severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								node,
								type: 'undoTitleChange',
								oldTitle,
								prevLastContentChange,
							}
							rootState.changeHistory.unshift(entry)
						} else {
							commit('addToEventList', { txt: 'Change of item title is undone', severity: SEV.INFO })
							rootState.busyWithLastUndo = false
						}
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `setDocTitle: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	setSubType({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				let updateBoards = undefined
				if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.US || tmpDoc.level === LEVEL.TASK)) {
					updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
				}
				const newHist = {
					setSubTypeEvent: [rootState.currentDoc.subtype, payload.newSubType],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
					updateBoards,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastOtherChange || 0
				tmpDoc.lastOtherChange = payload.timestamp

				const oldSubType = tmpDoc.subtype
				tmpDoc.subtype = payload.newSubType
				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'setSubType',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, subtype: payload.newSubType, lastOtherChange: tmpDoc.lastOtherChange })
						if (!payload.isUndoAction || payload.isUndoAction === undefined) {
							commit('addToEventList', { txt: 'The item type is changed', severity: SEV.INFO })
							// create an entry for undoing the change in a last-in first-out sequence
							const entry = {
								type: 'undoselectedUsType',
								node,
								oldSubType,
								prevLastChange,
							}
							rootState.changeHistory.unshift(entry)
						} else {
							commit('addToEventList', { txt: 'Change of item type is undone', severity: SEV.INFO })
							rootState.busyWithLastUndo = false
						}
					},
					onFailureCallback: () => {
						if (payload.isUndoAction) rootState.busyWithLastUndo = false
					},
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `setSubType: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	saveDescription({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				// decode from base64
				rootState.oldDescription = b64ToUni(tmpDoc.description)
				// encode to base64
				const newEncodedDescription = uniTob64(payload.newDescription)
				const newHist = {
					descriptionEvent: [tmpDoc.description, newEncodedDescription],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastContentChange = tmpDoc.lastContentChange || 0
				tmpDoc.lastContentChange = payload.timestamp
				tmpDoc.lastOtherChange = payload.timestamp
				tmpDoc.description = newEncodedDescription

				const onSuccessCallback = () => {
					commit('updateNodewithDocChange', { node, lastContentChange: payload.timestamp })
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: `The description of item with short id ${id.slice(-5)} is changed`, severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoDescriptionChange',
							oldDescription: rootState.oldDescription,
							prevLastContentChange,
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
					toDispatch: payload.toDispatch,
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `saveDescription: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	saveAcceptance({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				// decode from base64
				rootState.oldAcceptance = b64ToUni(tmpDoc.acceptanceCriteria)
				// encode to base64
				const newEncodedAcceptance = uniTob64(payload.newAcceptance)
				const newHist = {
					acceptanceEvent: [tmpDoc.acceptanceCriteria, newEncodedAcceptance],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastContentChange = tmpDoc.lastContentChange || 0
				tmpDoc.lastContentChange = payload.timestamp
				tmpDoc.lastOtherChange = payload.timestamp
				tmpDoc.acceptanceCriteria = newEncodedAcceptance

				const onSuccessCallback = () => {
					commit('updateNodewithDocChange', { node, lastContentChange: payload.timestamp })
					if (!payload.isUndoAction || payload.isUndoAction === undefined) {
						commit('addToEventList', { txt: `The acceptance criteria  of item with short id ${id.slice(-5)} are changed`, severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoAcceptanceChange',
							oldAcceptance: rootState.oldAcceptance,
							prevLastContentChange,
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
					toDispatch: payload.toDispatch,
				})
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `saveAcceptance: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Comments are added to the comments array of the doc; a newComment event is added to the history */
	addComment({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const newHist = {
					newCommentEvent: ['A new comment was added'],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)

				const newComment = {
					addCommentEvent: [uniTob64(payload.comment)],
					by: rootState.userData.user,
					timestamp: Date.now(),
				}
				tmpDoc.comments.unshift(newComment)
				tmpDoc.lastCommentAddition = payload.timestamp
				tmpDoc.lastOtherChange = payload.timestamp

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'addComment',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', { node, lastOtherChange: tmpDoc.lastOtherChange })
					},
				})
			})
			.catch((error) => {
				const msg = `addComment: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Edited comments are replaced; the original comment is overwritten to protect privacy*/
	replaceComment({ rootState, commit, dispatch }, payload) {
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				// replace the comment in the document.comments array
				let couldReplace = false
				let originalTimestamp
				let amendedCommentIdx
				for (let i = 0; i < tmpDoc.comments.length; i++) {
					const uneditedCommentObj = tmpDoc.comments[i]
					const eventName = Object.keys(uneditedCommentObj)[0]
					if (
						(eventName === 'addCommentEvent' || eventName === 'replaceCommentEvent') &&
						uneditedCommentObj.timestamp === payload.commentObjToBeReplaced.timestamp
					) {
						originalTimestamp = tmpDoc.comments[i].timestamp
						// replace the comment with the amended version and a new timestamp
						tmpDoc.comments[i] = {
							replaceCommentEvent: [uniTob64(payload.editedCommentText)],
							by: rootState.userData.user,
							timestamp: Date.now(),
						}
						amendedCommentIdx = i
						couldReplace = true
						break
					}
				}
				if (couldReplace) {
					const newHist = {
						commentAmendedEvent: [amendedCommentIdx, originalTimestamp],
						by: rootState.userData.user,
						email: rootState.userData.email,
						doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
						timestamp: Date.now(),
						isListed: true,
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					tmpDoc.history.unshift(newHist)
					tmpDoc.lastCommentAddition = payload.timestamp
					tmpDoc.lastOtherChange = payload.timestamp
					dispatch('updateDoc', {
						dbName: rootState.userData.currentDb,
						updatedDoc: tmpDoc,
						caller: 'replaceComment',
						onSuccessCallback: () => {
							commit('updateNodewithDocChange', { node, lastOtherChange: tmpDoc.lastOtherChange })
						},
					})
				} else {
					const msg = `replaceComment: Could not find the comment to replace in document with id ${id}.`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				}
			})
			.catch((error) => {
				const msg = `replaceComment: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/*
	 * Create or update an existing document by creating a new revision.
	 * Must call loadDoc on success to update the current doc visable to the user.
	 * Updates the current doc if the id matches the currentlt loaded doc
	 * Executes a onSuccessCallback and onFailureCallback if provided in the payload.
	 */
	updateDoc({ rootState, dispatch }, payload) {
		const id = payload.updatedDoc._id

		if (rootState.debug) console.log(`updateDoc: called by ${payload.caller} is updating document with _id ${id} in database ${payload.dbName}`)
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + id,
			data: payload.updatedDoc,
		})
			.then(() => {
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				if (rootState.currentDoc && id === rootState.currentDoc._id) {
					// apply changes on the currently selected document
					rootState.currentDoc = prepareDocForPresentation(payload.updatedDoc)
				}
				// execute passed actions if provided
				dispatch('dispatchAdditionalActions', payload)
			})
			.catch((error) => {
				// execute passed function if provided
				if (payload.onFailureCallback) payload.onFailureCallback()
				const msg = `updateDoc: (called by ${payload.caller}) Could not write document with url ${payload.dbName}/${id}. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/*
	 * Update or create multiple documents in bulk.
	 * Updates the current doc if the id matches the currentlt loaded doc
	 * Executes a onSuccessCallback, onFailureCallback and dispatchAdditionalActions callback if provided in the payload.
	 */
	updateBulk({ rootState, commit, dispatch }, payload) {
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_bulk_docs',
			data: { docs: payload.docs },
		})
			.then((res) => {
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
					} else
						commit('addToEventList', {
							txt: 'The update failed due to conflicts or errors. Try again after sign-out or contact your administrator',
							severity: SEV.WARNING,
						})
				} else {
					// execute passed function if provided
					if (payload.onSuccessCallback) payload.onSuccessCallback()
					for (const doc of payload.docs) {
						if (doc._id === rootState.currentDoc._id) {
							// apply changes on the currently selected document
							rootState.currentDoc = prepareDocForPresentation(doc)
						}
					}
					// execute passed actions if provided
					dispatch('dispatchAdditionalActions', payload)
				}
			})
			.catch((error) => {
				// execute passed function if provided
				if (payload.onFailureCallback) payload.onFailureCallback()
				const msg = `updateBulk: (called by ${payload.caller}) Could not update batch of documents with ids ${payload.docs.map((doc) => doc._id)}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Create the document in the database, create the node, select it and add history to the parent document */
	createDocWithParentHist({ rootState, dispatch, commit }, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.newDoc.parentId,
		})
			.then((res) => {
				const parentDoc = applyRetention(rootState, res.data)
				// create a history event for the parent to trigger an email message to followers
				const parentHist = {
					newChildEvent: [payload.newNode.level, payload.newNode.ind + 1],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: false,
				}
				parentDoc.lastOtherChange = Date.now()
				parentDoc.history.unshift(parentHist)
				const toDispatch = [
					{
						// create the new document
						updateDoc: {
							dbName: rootState.userData.currentDb,
							updatedDoc: payload.newDoc,
							caller: 'createDocWithParentHist-2',
							onSuccessCallback: () => {
								// insert the new node in the tree and set the path and ind
								rootState.helpersRef.insertNodes(payload.newNodeLocation, [payload.newNode], { createNew: true })
								// the level, productId, parentId and priority are reset and should equal the preflight values; check the priority value only
								if (payload.newDoc.priority === payload.newNode.data.priority) {
									// create an entry for undoing the change in a last-in first-out sequence
									const entry = {
										type: 'undoNewNode',
										newNode: payload.newNode,
									}
									rootState.changeHistory.unshift(entry)
									// select and show the new node
									commit('renewSelectedNodes', payload.newNode)
									rootState.currentDoc = payload.newDoc
									commit('addToEventList', { txt: `Item of type ${rootState.helpersRef.getLevelText(payload.newNode.level)} is inserted.`, severity: SEV.INFO })
								} else {
									// the priority has changed after the preflight insert; revert the change in the tree and database
									const msg = `createDocWithParentHist: doc priority ${payload.newDoc.priority} of document with id ${payload.newDoc._id} does not match node priority ${payload.newNode.data.priority}. The tree structure has changed while the new document was created. The insertion is undone.`
									dispatch('doLog', { event: msg, level: SEV.ERROR })
									// note: while this action is executed the user cannot undo other actions
									dispatch('removeBranch', { node: payload.newNode, undoOnError: true, isUndoAction: true })
								}
							},
						},
					},
				]
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: parentDoc, toDispatch, caller: 'createDocWithParentHist-1' })
			})
			.catch((error) => {
				const msg = `createDocWithParentHist: Could not read parent document with id ${payload.newDoc.parentId}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/*
	 * Load document by _id and make it the current backlog item and update the tree scructure.
	 * Executes a onSuccessCallback and onFailureCallback callback if provided in the payload.
	 */
	loadDoc({ rootState, commit, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.id,
		})
			.then((res) => {
				if (rootState.debug) console.log('loadDoc: document with id ' + payload.id + ' is loaded.')
				commit('updateNodewithDocChange', { newDoc: applyRetention(rootState, res.data) })
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('dispatchAdditionalActions', payload)
			})
			.catch((error) => {
				// execute passed function if provided
				if (payload.onFailureCallback) payload.onFailureCallback()
				const msg = `loadDoc: Could not read document with _id ${payload.id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Send a message to other users online with access to the current product */
	sendMessageAsync({ rootState, dispatch }, trigger) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/messenger',
		})
			.then((res) => {
				const tmpDoc = res.data
				// add the productId this message applies to
				tmpDoc.productId = rootState.currentProductId
				// replace the history
				tmpDoc.history = [trigger]
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, caller: 'sendMessageAsync' })
			})
			.catch((error) => {
				const msg = `sendMessageAsync: Could not read the 'messenger' document. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Update the history retention settings in the config document */
	updateRetentionSettings({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config',
		})
			.then((res) => {
				const configData = res.data
				configData.historyRetention = { maxHistoryDays: payload.maxHistoryDays, maxHistoryEvents: payload.maxHistoryEvents }
				dispatch('saveConfig', { dbName: payload.dbName, newConfig: configData })
			})
			.catch((error) => {
				const msg = `updateRetentionSettings: Could not read config document of database '${payload.dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	saveConfig({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/config',
			data: payload.newConfig,
		})
			.then(() => {
				// update the in-memory copy
				rootState.configData.historyRetention = payload.newConfig.historyRetention
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: `saveConfig: The config document is successfully save in database '${payload.dbName}'`,
				})
			})
			.catch((error) => {
				const msg = `saveConfig: Could not write config document to database '${payload.dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},
}

export default {
	actions,
}
