import { SEV } from '../../constants.js'
import { localTimeAndMilis } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const LOGDOCNAME = 'log'
const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 5

const state = {
	logSessionSeq: 0,
	runningWatchdogId: null,
	unsavedLogs: []
}

const actions = {
	/*
	 * Logging is not possible without network connection to the database.
	 * When logging fails the entries are stored in the unsavedLogs array.
	 * This watchdog tests in intervals if the browser becomes online. If so then the action:
	 * - restarts the cookie authentication service
	 * - restarts the synchronization service
	 * - saves the stored log entries if available
	 */
	watchdog({
		rootState,
		state,
		commit,
		dispatch
	}) {
		function consoleLogStatus() {
			if (rootState.debugConnectionAndLogging) {
				// eslint-disable-next-line no-console
				console.log('watchdog:' +
					'\nOnline = ' + rootState.online +
					'\nlogsToSaveCount = ' + state.unsavedLogs.length +
					'\ncookieAuthenticated = ' + rootState.authentication.cookieAuthenticated +
					'\nListenForChangesRunning = ' + rootState.listenForChangesRunning +
					'\ntimestamp = ' + new Date().toString())
			}
		}
		function restartLoops() {
			const msg = `restartLoops: Watchdog attemps to rectify the connection error.`
			dispatch('refreshCookie', {
				caller: 'restartLoops',
				onSuccessCallback: () => {
					consoleLogStatus()
					commit('showLastEvent', { txt: 'You are online again', severity: SEV.INFO })
				},
				onFailureCallback: () => consoleLogStatus(),
				toDispatch: [{ refreshCookieLoop: null }, { listenForChanges: null }, { doLog: { event: msg, level: SEV.INFO } }]
			})
		}

		// test the connection and authentication status every WATCHDOGINTERVAL seconds
		state.runningWatchdogId = setInterval(() => {
			const wasOffline = !rootState.online
			globalAxios({
				method: 'HEAD',
				url: rootState.userData.currentDb + '/' + LOGDOCNAME
			}).then(() => {
				rootState.online = true
				if (wasOffline) {
					restartLoops()
				} else {
					if (rootState.authentication.cookieAuthenticated) {
						consoleLogStatus()
						// save any pending log messages
						if (state.unsavedLogs.length > 0) dispatch('saveLog')
						// if returning from a computer sleep state, restart listenForChanges
						if (!rootState.listenForChangesRunning) {
							dispatch('listenForChanges')
						}
					} else {
						// refresh the authorization cookie and wait for the next watchdog cycle to restart listenForChanges
						dispatch('refreshCookie', { caller: 'watchdog', toDispatch: [{ refreshCookieLoop: null }] })
					}
				}
			}).catch(error => {
				if (error.response && error.response.status === 401) {
					// stop the cookie refresh loop and let watchdog start a new one in the next watchdog cycle
					clearInterval(rootState.authentication.runningCookieRefreshId)
					rootState.authentication.cookieAuthenticated = false
					// if error status 401 is returned we are online again despite the error condition (no authentication)
					rootState.online = true
				} else {
					rootState.online = false
					commit('showLastEvent', { txt: 'You are offline. Restore the connection or wait to continue', severity: SEV.WARNING })
				}
				consoleLogStatus()
			})
		}, WATCHDOGINTERVAL * 1000)
	},

	/* Create a log entry and save it. */
	doLog({
		rootState,
		state,
		dispatch
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
		state.unsavedLogs.push(newLog)
		if (rootState.online && rootState.authentication.cookieAuthenticated) dispatch('saveLog')
	},

	saveLog({
		rootState,
		dispatch
	}) {
		if (state.unsavedLogs.length > 0) {
			if (rootState.authentication.cookieAuthenticated) {
				if (rootState.userData.currentDb) {
					// try to store all unsaved logs
					globalAxios({
						method: 'GET',
						url: rootState.userData.currentDb + '/' + LOGDOCNAME
					}).then(res => {
						const log = res.data
						// eslint-disable-next-line no-console
						if (rootState.debugConnectionAndLogging) console.log(`saveLog: The log is fetched`)
						for (const logEntry of state.unsavedLogs) {
							log.entries.unshift(logEntry)
						}
						dispatch('replaceLog', {
							log, caller: 'saveLog', onSuccessCallback: () => {
								// delete the unsaved logs after a successful save only
								state.unsavedLogs = []
							}
						})
					}).catch(error => {
						// eslint-disable-next-line no-console
						if (rootState.debugConnectionAndLogging) console.log(`saveLog: Could not read the log. Pushed log entry to unsavedLogs. A retry is pending. ${error}`)
					})
				} else {
					// eslint-disable-next-line no-console
					if (rootState.debugConnectionAndLogging) console.log(`saveLog: Could not read the log. A retry is pending, the database name is undefined yet`)
				}
			} else {
				// eslint-disable-next-line no-console
				if (rootState.debugConnectionAndLogging) console.log(`saveLog: Could not read the log. A retry is pending, you are not authenticated yet`)
			}
		} else {
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`saveLog: Skipped, nothing to log`)
		}
	},

	// save the log
	replaceLog({
		rootState
	}, payload) {
		// limit the number of saved log entries
		payload.log.entries = payload.log.entries.slice(0, MAXLOGSIZE)
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + LOGDOCNAME,
			data: payload.log
		}).then(() => {
			// execute passed function if provided
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`replaceLog: The log is saved by ${payload.caller}`)
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`replaceLog: Could not save the log. A retry is pending. ${error}`)
		})
	}
}

export default {
	state,
	actions
}
