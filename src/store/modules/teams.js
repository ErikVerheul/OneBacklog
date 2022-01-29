import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const actions = {
	changeTeam({
		rootState,
		dispatch
	}, newTeam) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			const oldTeam = tmpUserData.myDatabases[res.data.currentDb].myTeam
			tmpUserData.myDatabases[res.data.currentDb].myTeam = newTeam
			const toDispatch = [{ updateTeamsInDb: { dbName: rootState.userData.currentDb, userName: rootState.userData.user, oldTeam, newTeam } }]
			dispatch('updateUserAction', { data: tmpUserData, toDispatch })
		}).catch(error => {
			const msg = `changeTeam: Could not change team for user ${rootState.userData.user}. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	createTeamCalendarAction({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId
		}).then(res => {
			const teamDoc = res.data
			// copy the default team calendar to this team
			teamDoc.teamCalendar = rootState.configData.defaultSprintCalendar
			dispatch('updateDoc', {
				dbName: payload.dbName,
				updatedDoc: teamDoc,
				caller: 'createTeamCalendarAction',
				onSuccessCallback: () => {
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `createTeamCalendarAction: success, the team calendar for team '${payload.teamName}' is created` })
					rootState.isCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = `createTeamCalendarAction: Could not read the team with id ${payload.teamId} in database '${payload.dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	updateTeamCalendarAction({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId
		}).then(res => {
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
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `updateTeamCalendarAction: success, the team calendar for team '${payload.teamName}' is updated` })
					rootState.isCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = `updateTeamCalendarAction: Could not read the team with id ${payload.teamId} in database '${payload.dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	addTeamAction({
		rootState,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		const teamName = payload.teamName
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams'
		}).then(res => {
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
					history: [
						{
							teamCreationEvent: [teamName],
							by: rootState.userData.user,
							timestamp: Date.now(),
							distributeEvent: false
						}]
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
							seqKey: rootState.seqKey++, msg: `addTeamAction: Team '${teamName}' is created in database '${dbName}'`
						})
					},
					onFailureCallback: () => {
						rootState.isTeamCreated = false
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++, msg: `addTeamAction: The creation of team '${teamName}' failed. See the log in database '${dbName}'`
						})
					}
				})
			} else {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++, msg: `addTeamAction: Cannot add team name '${teamName}'. Reason: team already exist in database '${dbName}'`
				})
			}
		}).catch(error => {
			const msg = `addTeamAction: Could not read the teams in database '${dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	fetchTeamsAction({
		rootState,
		dispatch
	}, payload) {
		rootState.areTeamsFound = false
		rootState.backendMessages = []
		rootState.fetchedTeams = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/teams'
		}).then(res => {
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
		}).catch(error => {
			const msg = `fetchTeamsAction: Could not read the documents from database '${payload.dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	removeTeamsAction({
		rootState,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		const teamNamesToRemove = payload.teamNamesToRemove
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams?include_docs=true'
		}).then(res => {
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
						seqKey: rootState.seqKey++, msg: `removeTeamsAction: Teams [${teamNamesToRemove}] are removed from database '${dbName}'`
					})
				}
			})
		}).catch(error => {
			const msg = `removeTeamsAction: Could not read the teams in database '${dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add deceased † symbol to the team names of retired teams in the database and tree model */
	retireTeams({
		rootState,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		const teamNamesToRetire = payload.teamNamesToRetire
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/ownedByTeam?include_docs=true'
		}).then(res => {
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
				}
			})
		}).catch(error => {
			const msg = `retireTeams: Could not read the items from database ${dbName}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	updateTeamsInDb({
		rootState,
		commit,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		if (payload.oldTeam !== payload.newTeam) {
			globalAxios({
				method: 'GET',
				url: dbName + '/_design/design1/_view/teams?include_docs=true'
			}).then(res => {
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
							commit('showLastEvent', { txt: `Team '${newTeamDoc.teamName}' ran out of sprints. You cannot join this team until your Admin creates new sprints`, severity: SEV.WARNING })
							return
						}
					}

					const oldTeamDocNewMembers = []
					for (const m of oldTeamDoc.members) {
						if (m !== payload.userName) oldTeamDocNewMembers.push(m)
					}
					oldTeamDoc.members = oldTeamDocNewMembers
					if (!newTeamDoc.members.includes(payload.userName)) newTeamDoc.members.push(payload.userName)
					const now = Date.now()
					const leaveHist = {
						leavingTeamEvent: [payload.userName],
						by: rootState.userData.user,
						timestamp: now,
						distributeEvent: false
					}
					oldTeamDoc.history.unshift(leaveHist)

					const joinHist = {
						joiningTeamEvent: [payload.userName],
						by: rootState.userData.user,
						timestamp: now,
						distributeEvent: false
					}
					newTeamDoc.history.unshift(joinHist)

					const toDispatch = [{
						updateDoc: {
							dbName,
							updatedDoc: newTeamDoc,
							onSuccessCallback: () => {
								// update the team list in memory
								rootState.allTeams[payload.oldTeam].members = oldTeamDoc.members
								rootState.allTeams[payload.newTeam].members = newTeamDoc.members
								// update the team calendar
								if (newTeamDoc.teamCalendar && newTeamDoc.teamCalendar.length > 0) {
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('updateTeamsInDb: A team calendar is found, use this sprint calendar')
									rootState.myCurrentSprintCalendar = newTeamDoc.teamCalendar
								} else {
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('updateTeamsInDb: No team calendar found, use the default sprint calendar')
									rootState.myCurrentSprintCalendar = rootState.configData.defaultSprintCalendar
								}
								// update the user data, the planningBoard.vue listens to this change and will re-render if in view
								commit('updateTeam', payload.newTeam)
								const msg = 'changeTeam: User ' + rootState.userData.user + ' changed to team ' + payload.newTeam
								dispatch('doLog', { event: msg, level: SEV.INFO })
							}
						}
					}]
					dispatch('updateDoc', { dbName, updatedDoc: oldTeamDoc, toDispatch, caller: 'updateTeamsInDb' })
				} else {
					if (!oldTeamDoc) commit('showLastEvent', { txt: `Team '${payload.oldTeam}' is missing in the database. You cannot join this team until fixed by your Admin`, severity: SEV.WARNING })
					if (!newTeamDoc) commit('showLastEvent', { txt: `Team '${payload.newTeam}' is missing in the database. You cannot join this team until fixed by your Admin`, severity: SEV.WARNING })
				}
			}).catch(error => {
				const msg = `updateTeamInDb: Could not read the teams in database '${dbName}'. ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		}
	}
}

export default {
	actions
}
