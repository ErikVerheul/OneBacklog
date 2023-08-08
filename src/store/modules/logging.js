import { SEV } from '../../constants.js'
import { localTimeAndMilis } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const LOGDOCNAME = 'log'
const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 5000

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
				rootState.authentication.cookieAuthenticated = true
				// update the current time
				rootState.currentTime = Date.now()
				if (wasOffline) {
					restartLoops()
				} else {
					consoleLogStatus()
					// save the log on every watchdog cycle
					dispatch('saveLog')
					// if returning from a computer sleep state, restart listenForChanges
					if (!rootState.signedOut && !rootState.listenForChangesRunning) {
						dispatch('listenForChanges')
					}
				}
			}).catch(error => {
				if (error.response && error.response.status === 401) {
					rootState.authentication.cookieAuthenticated = false
					// if error status 401 is returned we are online again despite the error condition (no authentication)
					rootState.online = true
					commit('showLastEvent', { txt: 'You are online again. The cookie authorization refresh loop is started', severity: SEV.INFO })
					// restart the cookie authorization refresh loop and wait for the next watchdog cycle to restart listenForChanges
					clearInterval(rootState.authentication.runningCookieRefreshId)
					dispatch('refreshCookie', { caller: 'watchdog', toDispatch: [{ refreshCookieLoop: null }] })
				} else {
					rootState.online = false
					commit('showLastEvent', { txt: 'You are offline. Restore the connection or wait to continue', severity: SEV.WARNING })
				}
				consoleLogStatus()
			})
		}, WATCHDOGINTERVAL)
	},

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
		state.unsavedLogs.push(newLog)
	},

	saveLog({
		rootState,
		state,
		dispatch
	}) {
		if (state.unsavedLogs.length > 0) {
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
		state,
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
			state.unsavedLogs = []
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
