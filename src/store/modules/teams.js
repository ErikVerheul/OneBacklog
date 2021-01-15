import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const INFO = 0
const WARNING = 1
const ERROR = 2

const actions = {
  changeTeam ({
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
      dispatch('updateUser', { data: tmpUserData, toDispatch })
    }).catch(error => {
      const msg = 'changeTeam: Could not change team for user ' + rootState.userData.user + ', ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  addTeamToDb ({
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
            }],
          delmark: false
        }
        rootState.backendMessages = []
        dispatch('updateDoc', {
          dbName,
          updatedDoc: newDoc,
          caller: 'addTeamToDb',
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
      const msg = `'ddTeamToDb: Could not read the teams in database '${dbName}'. ${error}`
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
	},


	fetchTeamMembers({
		rootState,
		dispatch
	}, dbName) {
		rootState.areTeamsFound = false
		rootState.teamsToRemoveOptions = []
		rootState.backendMessages = []
		rootState.fetchedTeams = []
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams'
		}).then(res => {
			const rows = res.data.rows
			for (const r of rows) {
				const teamId = r.id
				const teamName = r.key
				const members = r.value
				rootState.fetchedTeams.push({ teamId, teamName, members })
				if (members.length === 0) {
					rootState.teamsToRemoveOptions.push(teamName)
				}
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchTeamMembers: success, ${rootState.fetchedTeams.length} team names are read, ${rootState.teamsToRemoveOptions.length} team(s) have no members` })
			rootState.areTeamsFound = true
		}).catch(error => {
			const msg = `fetchTeamMembers: Could not read the documents from database '${dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

  removeTeamsFromDb ({
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
          doc.delmark = true
          docsToRemove.push(doc)
        }
      }
      const toDispatch = [{ retireTeams: { dbName, teamNamesToRetire: teamNamesToRemove } }]
      dispatch('updateBulk', {
        dbName,
        docs: docsToRemove,
        toDispatch,
        caller: 'removeTeamsFromDb',
        onSuccessCallback: () => {
          rootState.areTeamsRemoved = true
          rootState.backendMessages.push({
            seqKey: rootState.seqKey++, msg: `removeTeamsFromDb: Teams [${teamNamesToRemove}] are removed from database '${dbName}'`
          })
        }
      })
    }).catch(error => {
      const msg = `'removeTeamsFromDb: Could not read the teams in database '${dbName}'. ${error}`
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Add deceased † symbol to the team names of retired teams in the database and tree model */
  retireTeams ({
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
          window.slVueTree.traverseModels((nm) => {
            if (nm.data.team && teamNamesToRetire.includes(nm.data.team)) {
              nm.data.team = nm.data.team + '†'
            }
          })
        }
      })
    }).catch(error => {
      const msg = 'retireTeams: Could not read the items from database ' + dbName + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  updateTeamsInDb ({
    rootState,
    rootGetters,
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
              commit('showLastEvent', { txt: `Team '${newTeamDoc.teamName}' ran out of sprints. You cannot join this team until your Admin creates new sprints`, severity: WARNING })
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
                  // replace the defaultSprintCalendar or other team calendar with this team calendar
                  rootState.sprintCalendar = newTeamDoc.teamCalendar
                } else {
                  // eslint-disable-next-line no-console
                  if (rootState.debug) console.log('updateTeamsInDb: No team calendar found')
                  if (rootGetters.teamCalendarInUse) {
                    // replace the team calendar with the default
                    rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
                  }
                }
                // update the user data, the planningBoard.vue listens to this change and will repaint if in view
                commit('updateTeam', payload.newTeam)
                const msg = 'changeTeam: User ' + rootState.userData.user + ' changed to team ' + payload.newTeam
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: INFO })
              }
            }
          }]
          dispatch('updateDoc', { dbName, updatedDoc: oldTeamDoc, toDispatch, caller: 'updateTeamsInDb' })
        } else {
          if (!oldTeamDoc) commit('showLastEvent', { txt: `Team '${payload.oldTeam}' is missing in the database. You cannot join this team until fixed by your Admin`, severity: WARNING })
          if (!newTeamDoc) commit('showLastEvent', { txt: `Team '${payload.newTeam}' is missing in the database. You cannot join this team until fixed by your Admin`, severity: WARNING })
        }
      }).catch(error => {
        const msg = `updateTeamInDb: Could not read the teams in database '${dbName}', ${error}`
        rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log(msg)
        dispatch('doLog', { event: msg, level: ERROR })
      })
    }
  }
}

export default {
  actions
}
