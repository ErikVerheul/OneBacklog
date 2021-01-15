import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2

const actions = {
	/* Get the default sprint calendar of a specific database (for admin use only) */
	getDbDefaultSprintCalendar({
		rootState,
		dispatch
	}, dbName) {
		rootState.isSprintCalendarFound = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: dbName + '/config'
		}).then(res => {
			if (res.data.defaultSprintCalendar) {
				rootState.defaultSprintCalendar = res.data.defaultSprintCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `getDbDefaultSprintCalendar: success, ${res.data.defaultSprintCalendar.length} sprint periods are read` })
				rootState.isSprintCalendarFound = true
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'getDbDefaultSprintCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `getDbDefaultSprintCalendar: Could not read config document of database '${dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Save the default sprint calendar of a specific database (for admin use only) */
	saveDbDefaultSprintCalendar({
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
				caller: 'saveDbDefaultSprintCalendar',
				onSuccessCallback: () => {
					rootState.defaultSprintCalendar = payload.newSprintCalendar
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'saveDbDefaultSprintCalendar: calendar is saved' })
					rootState.isDefaultSprintCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = 'saveDbDefaultSprintCalendar: Could not read config document of database ' + payload.dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
}

export default {
	actions
}
