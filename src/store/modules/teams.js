import { LEVEL, MISC, STATE, SEV } from '../../constants.js'
import { encodeHtml } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const actions = {
	changeTeamAction({ rootState, dispatch }, payload) {
		const newTeam = payload.newTeam
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user,
		})
			.then((res) => {
				const tmpUserData = res.data
				// replace the team name in the users record
				const oldTeam = tmpUserData.myDatabases[res.data.currentDb].myTeam
				tmpUserData.myDatabases[res.data.currentDb].myTeam = newTeam
				const toDispatch = [
					// Update the 'team' documents and check if the teamcalendar needs to be extended
					{ updateTeamsInDb: { dbName: rootState.userData.currentDb, userName: rootState.userData.user, oldTeam, newTeam } },
				]
				dispatch('updateUserDb', { data: tmpUserData, toDispatch })
			})
			.catch((error) => {
				const msg = `changeTeam: Could not change team for user ${rootState.userData.user}. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	createTeamCalendarAction({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId,
		})
			.then((res) => {
				const teamDoc = res.data
				// copy the default team calendar to this team
				teamDoc.teamCalendar = rootState.configData.defaultSprintCalendar
				dispatch('updateDoc', {
					dbName: payload.dbName,
					updatedDoc: teamDoc,
					caller: 'createTeamCalendarAction',
					onSuccessCallback: () => {
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++,
							msg: `createTeamCalendarAction: success, the team calendar for team '${payload.teamName}' is created`,
						})
						rootState.isCalendarSaved = true
					},
				})
			})
			.catch((error) => {
				const msg = `createTeamCalendarAction: Could not read the team with id ${payload.teamId} in database '${payload.dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	updateTeamCalendarAction({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId,
		})
			.then((res) => {
				const teamDoc = res.data
				// update the team calendar
				teamDoc.teamCalendar = payload.newSprintCalendar
				dispatch('updateDoc', {
					dbName: payload.dbName,
					updatedDoc: teamDoc,
					caller: 'updateTeamCalendarAction',
					onSuccessCallback: () => {
						// if updating the team calendar of my current team in my current database, update myCurrentSprintCalendar
						if (payload.dbName === rootState.userData.currentDb && teamDoc.teamName === rootState.userData.myTeam) {
							rootState.myCurrentSprintCalendar = payload.newSprintCalendar
						}
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++,
							msg: `updateTeamCalendarAction: success, the team calendar for team '${payload.teamName}' is updated`,
						})
						rootState.isCalendarSaved = true
					},
				})
			})
			.catch((error) => {
				const msg = `updateTeamCalendarAction: Could not read the team with id ${payload.teamId} in database '${payload.dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	addTeamAction({ rootState, dispatch }, payload) {
		const dbName = payload.dbName
		const teamName = payload.teamName
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams',
		})
			.then((res) => {
				const teams = res.data.rows
				let teamExists = false
				for (const t of teams) {
					if (t.key === teamName) {
						teamExists = true
						break
					}
				}
				if (!teamExists) {
					const newDoc = {
						_id: payload.id,
						type: 'team',
						teamName: teamName,
						members: [],
						// Note: this event is not a regular history event
						history: [
							{
								teamCreationEvent: [teamName],
								by: rootState.userData.user,
								email: rootState.userData.email,
								timestamp: Date.now(),
								distributeEvent: false,
							},
						],
					}
					rootState.backendMessages = []
					dispatch('updateDoc', {
						dbName,
						updatedDoc: newDoc,
						caller: 'addTeamAction',
						onSuccessCallback: () => {
							rootState.isTeamCreated = true
							rootState.allTeams[teamName] = { id: payload.id, members: [], hasTeamCalendar: false }
							rootState.backendMessages.push({
								seqKey: rootState.seqKey++,
								msg: `addTeamAction: Team '${teamName}' is created in database '${dbName}'`,
							})
						},
						onFailureCallback: () => {
							rootState.isTeamCreated = false
							rootState.backendMessages.push({
								seqKey: rootState.seqKey++,
								msg: `addTeamAction: The creation of team '${teamName}' failed. See the log in database '${dbName}'`,
							})
						},
					})
				} else {
					rootState.backendMessages.push({
						seqKey: rootState.seqKey++,
						msg: `addTeamAction: Cannot add team name '${teamName}'. Reason: team already exist in database '${dbName}'`,
					})
				}
			})
			.catch((error) => {
				const msg = `addTeamAction: Could not read the teams in database '${dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	fetchTeamsAction({ rootState, dispatch }, payload) {
		rootState.areTeamsFound = false
		rootState.backendMessages = []
		rootState.fetchedTeams = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/teams',
		})
			.then((res) => {
				const rows = res.data.rows
				for (const r of rows) {
					const teamId = r.id
					const teamName = r.key
					const members = r.value[0]
					const hasTeamCalendar = r.value[1]
					rootState.fetchedTeams.push({ teamId, teamName, members, hasTeamCalendar })
				}
				// execute passed callback if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()

				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchTeamsAction: success, ${rootState.fetchedTeams.length} team names are read` })
				rootState.areTeamsFound = true
			})
			.catch((error) => {
				const msg = `fetchTeamsAction: Could not read the documents from database '${payload.dbName}', ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	removeTeamsAction({ rootState, dispatch }, payload) {
		const dbName = payload.dbName
		const teamNamesToRemove = payload.teamNamesToRemove
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams?include_docs=true',
		})
			.then((res) => {
				const results = res.data.rows
				const docsToRemove = []
				for (const r of results) {
					const doc = r.doc
					if (teamNamesToRemove.includes(doc.teamName)) {
						doc.delmark = 'true'
						docsToRemove.push(doc)
					}
				}
				if (payload.onSuccessCallback) payload.onSuccessCallback()

				const toDispatch = [{ retireTeams: { dbName, teamNamesToRetire: teamNamesToRemove } }]
				dispatch('updateBulk', {
					dbName,
					docs: docsToRemove,
					toDispatch,
					caller: 'removeTeamsAction',
					onSuccessCallback: () => {
						rootState.areTeamsRemoved = true
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++,
							msg: `removeTeamsAction: Teams [${teamNamesToRemove}] are removed from database '${dbName}'`,
						})
					},
				})
			})
			.catch((error) => {
				const msg = `removeTeamsAction: Could not read the teams in database '${dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Add deceased † symbol to the team names of retired teams in the database and tree model */
	retireTeams({ rootState, dispatch }, payload) {
		const dbName = payload.dbName
		const teamNamesToRetire = payload.teamNamesToRetire
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/ownedByTeam?include_docs=true',
		})
			.then((res) => {
				const results = res.data.rows
				const docs = []
				for (const r of results) {
					const doc = r.doc
					if (teamNamesToRetire.includes(doc.team)) {
						doc.team = doc.team + '†'
						docs.push(doc)
					}
				}
				// write back and update tree model
				dispatch('updateBulk', {
					dbName,
					docs,
					caller: 'retireTeams',
					onSuccessCallback: () => {
						rootState.helpersRef.traverseModels((nm) => {
							if (nm.data.team && teamNamesToRetire.includes(nm.data.team)) {
								nm.data.team = nm.data.team + '†'
							}
						})
					},
				})
			})
			.catch((error) => {
				const msg = `retireTeams: Could not read the items from database ${dbName}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Register the team membership and history in the teammembers document */
	updateTeamsInDb({ rootState, commit, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		if (payload.oldTeam !== payload.newTeam) {
			globalAxios({
				method: 'GET',
				url: dbName + '/_design/design1/_view/teams?include_docs=true',
			})
				.then((res) => {
					const rows = res.data.rows
					let oldTeamDoc
					let newTeamDoc
					for (const r of rows) {
						const doc = r.doc
						if (doc.teamName === payload.oldTeam) oldTeamDoc = doc
						if (doc.teamName === payload.newTeam) newTeamDoc = doc
					}
					if (oldTeamDoc && newTeamDoc) {
						if (newTeamDoc.teamCalendar && newTeamDoc.teamCalendar.length > 0) {
							// check if the teamcalendar needs to be extended
							const lastTeamSprint = newTeamDoc.teamCalendar.slice(-1)[0]
							if (lastTeamSprint.startTimestamp - lastTeamSprint.sprintLength < Date.now()) {
								commit('addToEventList', {
									txt: `Team '${newTeamDoc.teamName}' ran out of sprints. You cannot join this team until your Admin creates new sprints`,
									severity: SEV.WARNING,
								})
								return
							}
						}

						// update the received messages from the new team
						rootState.teamMessages = newTeamDoc.messages || []

						const oldTeamDocNewMembers = []
						for (const m of oldTeamDoc.members) {
							if (m !== payload.userName) oldTeamDocNewMembers.push(m)
						}
						oldTeamDoc.members = oldTeamDocNewMembers
						if (!newTeamDoc.members.includes(payload.userName)) newTeamDoc.members.push(payload.userName)
						const now = Date.now()
						// Note: this event is not a regular history event
						const leaveHist = {
							leavingTeamEvent: [payload.userName],
							by: rootState.userData.user,
							email: rootState.userData.email,
							timestamp: now,
						}
						oldTeamDoc.history.unshift(leaveHist)
						// Note: this event is not a regular history event
						const joinHist = {
							joiningTeamEvent: [payload.userName],
							by: rootState.userData.user,
							email: rootState.userData.email,
							timestamp: now,
						}
						newTeamDoc.history.unshift(joinHist)

						// create a trigger to update any open planningboards of the old team to the new team
						const trigger = {
							teamChangeEvent: [payload.oldTeam, payload.newTeam],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.mySessionId,
							distributeEvent: true,
							updateBoards: { sprintsAffected: undefined, teamsAffected: [payload.oldTeam, payload.newTeam] },
						}

						// sending this trigger must be the last action in the chain of events
						const toDispatch2 = [{ sendMessageAsync: trigger }]

						const toDispatch = [
							{
								updateDoc: {
									dbName,
									updatedDoc: newTeamDoc,
									caller: 'updateTeamsInDb',
									toDispatch: toDispatch2,
									onSuccessCallback: () => {
										// update the team list in memory
										rootState.allTeams[payload.oldTeam].members = oldTeamDoc.members
										rootState.allTeams[payload.newTeam].members = newTeamDoc.members
										// update the reference to myTeam document
										rootState.myTeamId = newTeamDoc._id
										// update the team calendar
										if (newTeamDoc.teamCalendar && newTeamDoc.teamCalendar.length > 0) {
											if (rootState.debug) console.log('updateTeamsInDb: A team calendar is found, use this sprint calendar')
											rootState.myCurrentSprintCalendar = newTeamDoc.teamCalendar
										} else {
											if (rootState.debug) console.log('updateTeamsInDb: No team calendar found, use the default sprint calendar')
											rootState.myCurrentSprintCalendar = rootState.configData.defaultSprintCalendar
										}
										// update the user data, the planningBoard.vue listens to this change and will re-render if in view
										commit('updateTeam', payload.newTeam)
										commit('addToEventList', { txt: `You changed to team ${payload.newTeam}`, severity: SEV.INFO })
									},
								},
							},
						]
						dispatch('updateDoc', { dbName, updatedDoc: oldTeamDoc, toDispatch, caller: 'updateTeamsInDb' })
					} else {
						if (!oldTeamDoc)
							commit('addToEventList', {
								txt: `Team '${payload.oldTeam}' is missing in the database. You cannot join this team until fixed by your Admin`,
								severity: SEV.WARNING,
							})
						if (!newTeamDoc)
							commit('addToEventList', {
								txt: `Team '${payload.newTeam}' is missing in the database. You cannot join this team until fixed by your Admin`,
								severity: SEV.WARNING,
							})
					}
				})
				.catch((error) => {
					const msg = `updateTeamInDb: Could not read the teams in database '${dbName}'. ${error}`
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				})
		}
	},

	/*
	 * Assign the item and its descendants to my team if the item is not done.
	 * The assigned sprints, not done, are removed.
	 * The items will be removed from the board of the 'old' team if in view.
	 */
	assignToMyTeam({ rootState, rootGetters, commit, dispatch }, payload) {
		const node = payload.node
		const descendantsInfo = rootState.helpersRef.getDescendantsInfo(node)
		const id = node._id
		if (payload.isUndoAction) rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = res.data
				const oldTeam = tmpDoc.team
				if (payload.newTeam != oldTeam) {
					let updateBoards = undefined
					if (tmpDoc.sprintId && (tmpDoc.level === LEVEL.US || tmpDoc.level === LEVEL.TASK)) {
						updateBoards = { sprintsAffected: [tmpDoc.sprintId], teamsAffected: [tmpDoc.team] }
					}
					const newHist = {
						setTeamOwnerEvent: [oldTeam, payload.newTeam, descendantsInfo.count],
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
					if (tmpDoc.state !== STATE.DONE) {
						// set the team name and delete the spint assignment
						tmpDoc.team = payload.newTeam
						delete tmpDoc.sprintId
						tmpDoc.lastOtherChange = payload.timestamp
					}
					const toDispatch =
						descendantsInfo.count > 0
							? [{ setTeamDescendantsBulk: { newTeam: payload.newTeam, parentTitle: rootState.currentDoc.title, descendants: descendantsInfo.descendants } }]
							: undefined

					dispatch('updateDoc', {
						dbName: rootState.userData.currentDb,
						updatedDoc: tmpDoc,
						toDispatch,
						caller: 'assignToMyTeam',
						onSuccessCallback: () => {
							// update the tree
							for (const d of descendantsInfo.descendants) {
								commit('updateNodewithDocChange', { node: d, team: payload.newTeam, lastOtherChange: payload.timestamp })
							}
							commit('updateNodewithDocChange', { node, team: payload.newTeam, lastOtherChange: payload.timestamp })

							if (!payload.isUndoAction || payload.isUndoAction === undefined) {
								if (descendantsInfo.count === 0) {
									commit('addToEventList', { txt: `The owning team of '${node.title}' is changed to '${rootGetters.myTeam}'.`, severity: SEV.INFO })
								} else
									commit('addToEventList', {
										txt: `The owning team of '${node.title}' and ${descendantsInfo.count} descendants is changed to '${rootGetters.myTeam}'.`,
										severity: SEV.INFO,
									})
								// create an entry for undoing the change in a last-in first-out sequence
								const entry = {
									type: 'undoChangeTeam',
									node,
									oldTeam,
									prevLastChange,
								}
								rootState.changeHistory.unshift(entry)
							} else {
								rootState.busyWithLastUndo = false
								commit('addToEventList', { txt: 'Change of owning team is undone', severity: SEV.INFO })
							}
						},
						onFailureCallback: () => {
							if (payload.isUndoAction) rootState.busyWithLastUndo = false
						},
					})
				}
			})
			.catch((error) => {
				if (payload.isUndoAction) rootState.busyWithLastUndo = false
				const msg = `assignToMyTeam: Could not read document with id ${id}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Change the team of the descendants to the users team */
	setTeamDescendantsBulk({ rootState, dispatch }, payload) {
		const docIdsToGet = []
		for (const desc of payload.descendants) {
			docIdsToGet.push({ id: desc._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
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
									timestamp: Date.now(),
									isListed: true,
									distributeEvent: false,
								}
								doc.history.unshift(newHist)
								// set the team name and delete the spint assignment
								doc.team = payload.newTeam
								delete doc.sprintId
								doc.lastOtherChange = Date.now()
								docs.push(doc)
							}
						}
					}
				}
				dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'setTeamDescendantsBulk' })
			})
			.catch((e) => {
				const msg = 'setTeamDescendantsBulk: Could not read batch of documents: ' + e
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* When a user changes team, the tasks he ownes need to be assigned to his new team also */
	updateTasksToNewTeam({ rootState, commit, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		const taskOwner = payload.userName
		globalAxios({
			method: 'GET',
			url: dbName + `/_design/design1/_view/assignedTasksToUser?startkey=["${taskOwner}"]&endkey=["${taskOwner}"]&include_docs=true`,
		})
			.then((res) => {
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
						distributeEvent: true,
					}
					tmpDoc.history.unshift(newHist)
					docsToUpdate.push(tmpDoc)
				}
				commit('addToEventList', { txt: `${docsToUpdate.length} of your tasks will be reassigned to team '${payload.newTeam}'`, severity: SEV.INFO })
				const toDispatch = [{ changeTeamAction: { newTeam: payload.newTeam } }]
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb,
					docs: docsToUpdate,
					caller: 'updateTasksToNewTeam',
					toDispatch,
					onSuccessCallback: () => {
						commit('addToEventList', { txt: `${docsToUpdate.length} of your tasks are assigned to team '${payload.newTeam}'`, severity: SEV.INFO })
						docsToUpdate.forEach((doc) => {
							const node = rootState.helpersRef.getNodeById(doc._id)
							commit('updateNodewithDocChange', { node, team: payload.newTeam })
						})
					},
				})
			})
			.catch((error) => {
				const msg = `updateTasksToNewTeam: Could not read the task backlog items for task owner ${taskOwner}. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Refresh the loaded team messages and the message count */
	getMyTeamMessagesAction({ rootState, commit, dispatch }) {
		globalAxios({
			method: 'GET',
			url: `${rootState.userData.currentDb}/${rootState.myTeamId}`,
		})
			.then((res) => {
				const teamDoc = res.data
				rootState.teamMessages = teamDoc.messages || []
				commit('addToEventList', {
					txt: `You have received '${rootState.msgBlinkIds.length}' new message(s)`,
					severity: SEV.INFO,
				})
			})
			.catch((error) => {
				const msg = `getMyTeamMessagesAction: Could not read the team with id ${rootState.myTeamId} in database '${rootState.userData.currentDb}'. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Refresh the loaded messages of my team and add the new message */
	saveMyTeamMessageAction({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: `${payload.dbName}/${rootState.myTeamId}`,
		})
			.then((res) => {
				const teamDoc = res.data
				const newMessage = {
					teamMessage: [],
					title: payload.newTitle,
					encodedTeamMsg: encodeHtml(payload.newMessage),
					encoding: 'escaped',
					by: rootState.userData.user,
					timestamp: Date.now(),
				}
				// initiate array if non-existant
				if (!teamDoc.messages) teamDoc.messages = []
				// add new message
				teamDoc.messages.unshift(newMessage)
				// create a trigger to warn my team members that a new message is received
				const trigger = {
					messageReceivedEvent: [],
					by: rootState.userData.user,
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				// sending this trigger must be the last action in the chain of events and save the current number of messages in my profile
				const toDispatch = [{ sendMessageAsync: trigger }, { saveMyMessagesNumberAction: { teamName: teamDoc.teamName, currentNumberOfMessages: teamDoc.messages.length } }]
				dispatch('updateDoc', {
					dbName: payload.dbName,
					updatedDoc: teamDoc,
					toDispatch,
					onSuccessCallback: () => {
						rootState.newMsgTitle = ''
						rootState.myNewMessage = MISC.EMPTYQUILL
						// refresh my team messages
						rootState.teamMessages = teamDoc.messages || []
					},
					caller: 'saveMyTeamMessageAction',
				})
			})
			.catch((error) => {
				const msg = `saveMyTeamMessageAction: Could not read the team with id ${rootState.myTeamId} in database '${payload.dbName}'. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	updateMyTeamMessageAction({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'GET',
			url: `${payload.dbName}/${rootState.myTeamId}`,
		})
			.then((res) => {
				const teamDoc = res.data
				const updatedMessage = {
					replacedTeamMessage: [],
					title: payload.newTitle,
					encodedTeamMsg: encodeHtml(payload.newMessage),
					encoding: 'escaped',
					by: rootState.userData.user,
					timestamp: Date.now(),
				}

				// replace the message
				let couldReplace = false
				for (let i = 0; i < teamDoc.messages.length; i++) {
					if (teamDoc.messages[i].timestamp === payload.timestamp) {
						teamDoc.messages[i] = updatedMessage
						couldReplace = true
						break
					}
				}
				if (couldReplace) {
					// create a trigger to warn my team members that an updated message is received
					const trigger = {
						messageReplacedEvent: [],
						by: rootState.userData.user,
						timestamp: Date.now(),
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					// sending this trigger must be the last action in the chain of events and save the current number of messages in my profile
					const toDispatch = [{ sendMessageAsync: trigger }, { saveMyMessagesNumberAction: { teamName: teamDoc.teamName, currentNumberOfMessages: teamDoc.messages.length } }]
					dispatch('updateDoc', {
						dbName: payload.dbName,
						updatedDoc: teamDoc,
						toDispatch,
						onSuccessCallback: () => {
							// reset input fields
							rootState.newMsgTitle = ''
							rootState.myNewMessage = MISC.EMPTYQUILL
							// reset replace mode
							rootState.replaceMessage = false
							rootState.replaceMessageTimestamp = undefined
							// refresh my team messages
							rootState.teamMessages = teamDoc.messages || []
						},
						caller: 'updateMyTeamMessageAction',
					})
				} else {
					const msg = `updateMyTeamMessageAction: Could not find the message to replace in document with id ${teamDoc._id}.`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				}
			})
			.catch((error) => {
				const msg = `updateMyTeamMessageAction: Could not read the team with id ${rootState.myTeamId} in database '${payload.dbName}'. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},
}

export default {
	actions,
}
