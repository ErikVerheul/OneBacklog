import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const LOGDOCNAME = 'log'
const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 5

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
		commit,
		dispatch
	}) {
		function consoleLogStatus() {
			if (rootState.debugConnectionAndLogging) {
				// eslint-disable-next-line no-console
				console.log('watchdog:' +
					'\nOnline = ' + rootState.online +
					'\nlogsToSaveCount = ' + rootState.logState.unsavedLogs.length +
					'\ncookieAuthenticated = ' + rootState.authentication.cookieAuthenticated +
					'\nListenForChangesRunning = ' + rootState.listenForChangesRunning +
					'\ntimestamp = ' + new Date().toString())
			}
		}
		function restartLoops() {
			commit('showLastEvent', { txt: 'You are online again', severity: SEV.INFO })
			const toDispatch = [
				{ refreshCookieLoop: null },
				{ listenForChanges: null },
				{ recoverLog: null }
			]
			dispatch('refreshCookie', { onSuccessCallback: () => consoleLogStatus(), onFailureCallback: () => consoleLogStatus(), toDispatch })
		}

		// test the connection every WATCHDOGINTERVAL seconds
		rootState.logState.runningWatchdogId = setInterval(() => {
			const wasOffline = !rootState.online
			globalAxios({
				method: 'HEAD'
			}).then(() => {
				rootState.online = true
				if (wasOffline) {
					restartLoops()
				} else {
					consoleLogStatus()
					// if returning from a computer sleep state, restart listenForChanges
					if (!rootState.listenForChangesRunning) {
						dispatch('listenForChanges')
					}
				}
			}).catch(error => {
				rootState.online = false
				commit('showLastEvent', { txt: 'You are offline. Restore the connection or wait to continue', severity: SEV.WARNING })
				// eslint-disable-next-line no-console
				if (rootState.debugConnectionAndLogging) console.log(`watchdog: no connection @ ${new Date()}, ${error}`)
				// if error status 401 is returned we are online again despite the error condition (no authentication)
				if (error.message.includes('401')) {
					rootState.online = true
					restartLoops()
				} else consoleLogStatus()
			})
		}, WATCHDOGINTERVAL * 1000)
	},

	recoverLog({
		rootState,
		dispatch
	}) {
		// catch up the logging
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + LOGDOCNAME
		}).then(res => {
			const log = res.data
			// save the stored logs
			let msg
			if (rootState.logState.unsavedLogs.length > 0) {
				for (const l of rootState.logState.unsavedLogs) {
					log.entries.unshift(l)
				}
				msg = `Watchdog rectified the network error, found ${rootState.logState.unsavedLogs.length} unsaved log entries and saved them`
				rootState.logState.unsavedLogs = []
			} else {
				msg = 'Watchdog rectified the network error'
			}
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(msg)
			const newLog = {
				event: msg,
				level: SEV.INFO,
				by: rootState.userData.user,
				timestamp: Date.now()
			}
			log.entries.unshift(newLog)
			log.entries = log.entries.slice(0, MAXLOGSIZE)
			dispatch('saveLog', { log, caller: 'watchdog' })
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`recoverLog: Could not read the log. ${error}`)
		})
	},

	/* Load the log. Note that currentDb must be set before calling this action. */
	doLog({
		rootState,
		dispatch
	}, payload) {
		const newLog = {
			event: payload.event,
			level: payload.level,
			by: rootState.userData.user,
			timestamp: Date.now()
		}
		// push the new log entry to the unsaved logs
		rootState.logState.unsavedLogs.push(newLog)
		if (rootState.authentication.cookieAuthenticated) {
			if (rootState.userData.currentDb) {
				if (!rootState.logState.logSavePending) {
					// try to store all unsaved logs
					globalAxios({
						method: 'GET',
						url: rootState.userData.currentDb + '/' + LOGDOCNAME
					}).then(res => {
						const log = res.data
						// eslint-disable-next-line no-console
						if (rootState.debugConnectionAndLogging) console.log(`doLog: The log is fetched`)

						if (rootState.logState.unsavedLogs.length > 0) {
							rootState.logState.savedLogs = []
							for (const logEntry of rootState.logState.unsavedLogs) {
								log.entries.unshift(logEntry)
								// save the log entries for recovery in case saveLog fails
								rootState.logState.savedLogs.push(logEntry)
							}
							rootState.logState.unsavedLogs = []
							log.entries = log.entries.slice(0, MAXLOGSIZE)
							rootState.logState.logSavePending = true
							dispatch('saveLog', { log, caller: 'doLog' })
						}
					}).catch(error => {
						// eslint-disable-next-line no-console
						if (rootState.debugConnectionAndLogging) console.log(`doLog: Could not read the log. Pushed log entry to unsavedLogs. A retry is pending. ${error}`)
					})
				}
			} else {
				// eslint-disable-next-line no-console
				if (rootState.debugConnectionAndLogging) console.log(`doLog: Could not read the log. A retry is pending , the database name is undefined yet`)
			}
		} else {
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`doLog: Could not read the log. A retry is pending , you are not authenticated yet`)
		}
	},

	// save the log
	saveLog({
		rootState
	}, payload) {
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + LOGDOCNAME,
			data: payload.log
		}).then(() => {
			rootState.logState.logSavePending = false
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`saveLog: The log is saved by ${payload.caller}`)
		}).catch(error => {
			rootState.logState.unsavedLogs = rootState.logState.savedLogs
			// eslint-disable-next-line no-console
			if (rootState.debugConnectionAndLogging) console.log(`saveLog: Could not save the log. A retry is pending. ${error}`)
		})
	}
}

export default {
	actions
}
