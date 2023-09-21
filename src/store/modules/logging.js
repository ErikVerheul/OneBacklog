import { SEV } from '../../constants.js'
import { localTimeAndMilis } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const LOGDOCNAME = 'log'
const MAXLOGSIZE = 1000

const state = {
	logSessionSeq: 0
}

const actions = {
	/*
	 * Logging is not possible without network connection to the database.
	 * When logging fails the entries are stored in the unsavedLogs array.
	 */

	/* Create a log entry and let watchdog save it. */
	doLog({
		rootState,
		state,
	}, payload) {
		state.logSessionSeq++
		const newLog = {
			sessionSeq: state.logSessionSeq,
			sessionId: rootState.mySessionId,
			event: payload.event,
			level: payload.level,
			by: rootState.userData.user,
			timestamp: Date.now()
		}
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log(`logging => ${localTimeAndMilis()}: ${payload.event}`)
		// push the new log entry to the unsaved logs
		rootState.unsavedLogs.push(newLog)
	},

	saveLog({
		rootState,
		dispatch
	}) {
		if (!rootState.signedOut && rootState.unsavedLogs.length > 0) {
			if (rootState.userData.currentDb) {
				// try to store all unsaved logs
				globalAxios({
					method: 'GET',
					url: rootState.userData.currentDb + '/' + LOGDOCNAME
				}).then(res => {
					const log = res.data
					// eslint-disable-next-line no-console
					if (rootState.debugConnectionAndLogging) console.log(`saveLog: The log is fetched`)
					for (const logEntry of rootState.unsavedLogs) {
						// add the save time for debugging
						logEntry.saveTime = Date.now()
						log.entries.unshift(logEntry)
					}
					dispatch('replaceLog', log)
				}).catch(error => {
					const msg = `saveLog: Could not read the log. Pushed log entry to unsavedLogs. A retry is pending. ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				})
			} else {
				const msg = `saveLog: Could not read the log. A retry is pending, the database name is undefined yet`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		}
	},

	replaceLog({
		rootState,
		dispatch
	}, log) {
		// limit the number of saved log entries
		log.entries = log.entries.slice(0, MAXLOGSIZE)
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + LOGDOCNAME,
			data: log
		}).then(() => {
			// delete the logs now they are saved
			rootState.unsavedLogs = []
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`replaceLog: The log is saved`)
		}).catch(error => {
			const msg = `replaceLog: Could not save the log. A retry is pending. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	state,
	actions
}
