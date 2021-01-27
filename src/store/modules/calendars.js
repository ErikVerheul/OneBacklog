import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const actions = {
	/* Get the default sprint calendar of a specific database (for admin use only) */
	fetchDefaultSprintCalendar({
		rootState,
		dispatch
	}, payload) {
		rootState.isDefaultCalendarFound = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config'
		}).then(res => {
			if (res.data.defaultSprintCalendar) {
				rootState.currentCalendar = res.data.defaultSprintCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchDefaultSprintCalendar: success, ${res.data.defaultSprintCalendar.length} sprint periods are read` })
				rootState.isDefaultCalendarFound = true
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'fetchDefaultSprintCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `fetchDefaultSprintCalendar: Could not read config document of database '${payload.dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Save or update the default sprint calendar of a specific database */
	saveDefaultSprintCalendar({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config'
		}).then(res => {
			const updatedDoc = res.data
			updatedDoc.defaultSprintCalendar = payload.newSprintCalendar
			dispatch('updateDoc', {
				dbName: payload.dbName,
				updatedDoc,
				caller: 'saveDefaultSprintCalendar',
				onSuccessCallback: () => {
					rootState.currentCalendar = payload.newSprintCalendar
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `saveDefaultSprintCalendar: success, calendar with ${payload.newSprintCalendar.length} sprint periods is saved` })
					rootState.isCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = 'saveDefaultSprintCalendar: Could not read config document of database ' + payload.dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Get the team sprint calendar of a specific team in a specific database */
	fetchTeamCalendar({
		rootState,
		dispatch
	}, payload) {
		rootState.isTeamCalendarFound = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId
		}).then(res => {
			if (res.data.teamCalendar) {
				rootState.currentCalendar = res.data.teamCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchTeamCalendar: success, ${res.data.teamCalendar.length} sprint periods are read` })
				rootState.isTeamCalendarFound = true
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'fetchTeamCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `fetchTeamCalendar: Could not read team document with id ${payload.teamId} in database '${payload.dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},
}

export default {
	actions
}
