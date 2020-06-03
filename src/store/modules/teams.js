import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2

const actions = {
    /*
	* Load the team calendar by _id and if existing make it the current team's calendar.
	* If the team calendar does not exist replace the current calendat with the default calendar.
	*/
	loadTeamCalendar({
		rootState,
		rootGetters,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const doc = res.data
			if (doc.type === 'team') {
				if (doc.teamCalendar && doc.teamCalendar.length > 0) {
					// replace the defaultSprintCalendar or other team calendar with this team calendar
					rootState.sprintCalendar = doc.teamCalendar
				} else {
					// eslint-disable-next-line no-console
					console.log('loadTeamCalendar: No team calendar found')
					if (rootGetters.teamCalendarInUse) {
						// replace the team calendar with the default
						rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
					}
				}
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadTeamCalendar: document with _id ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadTeamCalendar: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	addTeamToDb({
		rootState,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		const teamName = payload.teamName
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams',
		}).then(res => {
			const teams = res.data.rows
			let teamExists = false
			for (let t of teams) {
				if (t.key === teamName) {
					teamExists = true
					break
				}
			}
			if (!teamExists) {
				const updatedDoc = {
					"_id": payload.id,
					"type": 'team',
					"teamName": teamName,
					"members": [],
					"history": [
						{
							"teamCreationEvent": [teamName],
							"by": rootState.userData.user,
							"timestamp": Date.now(),
							"distributeEvent": false
						}],
					"delmark": false
				}
				rootState.backendMessages = []
				dispatch('updateDoc', {
					dbName,
					updatedDoc,
					onSuccessCallback: () => {
						rootState.isTeamCreated = true
						rootState.allTeams[teamName] = { id: payload.id, members: [] }
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++, msg: `doCreateTeam: Team '${teamName}' is created in database '${dbName}'`
						})
					},
					onFailureCallback: () => {
						rootState.isTeamCreated = false
						rootState.backendMessages.push({
							seqKey: rootState.seqKey++, msg: `doCreateTeam: The creation of team '${teamName}' failed. See the log in database '${dbName}'`
						})
					}
				})
			} else {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++, msg: `addTeamToDb: Cannot add team name '${teamName}'. Reason: team already exist in database '${dbName}'`
				})
			}
		}).catch(error => {
			let msg = `'ddTeamToDb: Could not read the teams in database '${dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	removeTeamsFromDb({
		rootState,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		const teamNamesToRemove = payload.teamNamesToRemove
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams?include_docs=true',
		}).then(res => {
			const results = res.data.rows
			const docsToRemove = []
			for (let r of results) {
				const doc = r.doc
				if (teamNamesToRemove.includes(doc.teamName)) {
					doc.delmark = true
					docsToRemove.push(doc)
				}
			}
			dispatch('updateBulk', {
				dbName,
				docs: docsToRemove,
				onSuccessCallback: () => {
					rootState.areTeamsRemoved = true
					rootState.backendMessages.push({
						seqKey: rootState.seqKey++, msg: `removeTeamsFromDb: Teams [${teamNamesToRemove}] are removed from database '${dbName}'`
					})
				},
			})
		}).catch(error => {
			let msg = `'removeTeamsFromDb: Could not read the teams in database '${dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateTeamsInDb({
		rootState,
		rootGetters,
		dispatch
	}, payload) {
		const dbName = payload.dbName
		if (payload.oldTeam !== payload.newTeam) {
			globalAxios({
				method: 'GET',
				url: dbName + '/_design/design1/_view/teams?include_docs=true',
			}).then(res => {
				const rows = res.data.rows
				let oldTeamDoc
				let newTeamDoc
				for (let r of rows) {
					const doc = r.doc
					if (doc.teamName === payload.oldTeam) oldTeamDoc = doc
					if (doc.teamName === payload.newTeam) newTeamDoc = doc
				}
				if (oldTeamDoc && newTeamDoc) {
					const oldTeamDocNewMembers = []
					for (let m of oldTeamDoc.members) {
						if (m !== payload.userName) oldTeamDocNewMembers.push(m)
					}
					oldTeamDoc.members = oldTeamDocNewMembers
					if (!newTeamDoc.members.includes(payload.userName)) newTeamDoc.members.push(payload.userName)
					const leaveHist = {
						"leavingTeamEvent": [payload.userName],
						"by": rootState.userData.user,
						"timestamp": Date.now(),
						"distributeEvent": false
					}
					oldTeamDoc.history.unshift(leaveHist)
					dispatch('updateDoc', { dbName, updatedDoc: oldTeamDoc })

					const joinHist = {
						"joiningTeamEvent": [payload.userName],
						"by": rootState.userData.user,
						"timestamp": Date.now(),
						"distributeEvent": false
					}
					newTeamDoc.history.unshift(joinHist)
					dispatch('updateDoc', {
						dbName,
						updatedDoc: newTeamDoc,
						onSuccessCallback: () => {
							// update the team list in memory
							rootState.allTeams[payload.oldTeam].members = oldTeamDoc.members
							rootState.allTeams[payload.newTeam].members = newTeamDoc.members
							// update the team calendar
							if (newTeamDoc.teamCalendar && newTeamDoc.teamCalendar.length > 0) {
								// replace the defaultSprintCalendar or other team calendar with this team calendar
								rootState.sprintCalendar = newTeamDoc.teamCalendar
							} else {
								// eslint-disable-next-line no-console
								console.log('updateTeamsInDb: No team calendar found')
								if (rootGetters.teamCalendarInUse) {
									// replace the team calendar with the default
									rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
								}
							}
						},
					})
				}
			}).catch(error => {
				let msg = `updateTeamInDb: Could not read the teams in database '${dbName}', ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			})
		}
	},

}

export default {
	actions
}
