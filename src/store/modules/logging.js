import globalAxios from 'axios'

const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 30
var unsavedLogs = []

const state = {
	runningWatchdogId: null
}

const actions = {
	/*
	 * Logging is not possible without network connection to the database.
	 * When logging fails the entries are stored in the unsavedLogs array.
	 * This watchdog test in intervals if the browser is online. If so then:
	 * - saves the stored log entries
	 * - restarts the synchronization service if stopped
	 */
	watchdog({
		rootState,
		state,
		dispatch
	}) {
		state.runningWatchdogId = setInterval(function () {
			let online = navigator.onLine
			let logsToSave = unsavedLogs.length
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('watchdog: online = ' + online +
				'\nunsavedLogs = ' + logsToSave +
				'\nrootState.listenForChangesRunning = ' + rootState.listenForChangesRunning)
			if (online) {
				// catch up the logging
				if (logsToSave > 0 || !rootState.listenForChangesRunning) {
					globalAxios({
							method: 'GET',
							url: rootState.currentDb + '/log',
							withCredentials: true,
						}).then(res => {
							let log = res.data
							// save the stored logs
							if (logsToSave > 0) {
								for (let i = 0; i < unsavedLogs.length; i++) {
									log.entries.unshift(unsavedLogs[i])
								}
								let now = Date.now()
								let newLog = {
									"event": "Watchdog found " + logsToSave + ' unsaved log entries and saved them now',
									"level": "INFO",
									"by": rootState.user,
									"email": rootState.load.email,
									"timestamp": now,
									"timestampStr": new Date(now)
								}
								log.entries.unshift(newLog)
								unsavedLogs = []
							}
							// restart synchronization if needed
							if (!rootState.listenForChangesRunning) {
								dispatch('listenForChanges', rootState.lastSyncSeq)
								let msg = "Watchdog restarted listening for changes."
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log(msg)
								let now = Date.now()
								let newLog = {
									"event": msg,
									"level": "INFO",
									"by": rootState.user,
									"email": rootState.load.email,
									"timestamp": now,
									"timestampStr": new Date(now)
								}
								log.entries.unshift(newLog)
							}
							log.entries = log.entries.slice(0, MAXLOGSIZE)
							dispatch('saveLog', log)
						})
						.catch(error => {
							// eslint-disable-next-line no-console
							console.log('watchdog: Could not read the log from ' + (rootState.currentDb + ' log') + ', ' + error)
						})
				}

			}
		}, WATCHDOGINTERVAL * 1000)
	},

	/*
	 * Load the log.
	 * Note that currentDb must be set before calling this action.
	 */
	doLog({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/log',
				withCredentials: true,
			}).then(res => {
				let log = res.data
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log("doLog: The log is fetched.")
				let now = Date.now()
				let newLog = {
					"event": payload.event,
					"level": payload.level,
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": now,
					"timestampStr": new Date(now)
				}
				log.entries.unshift(newLog)
				log.entries = log.entries.slice(0, MAXLOGSIZE)
				dispatch('saveLog', log)
			})
			.catch(error => {
				let now = Date.now()
				let newLog = {
					"event": payload.event,
					"level": payload.level,
					"by": rootState.user,
					"email": rootState.load.email,
					"timestamp": now,
					"timestampStr": new Date(now)
				}
				//eslint-disable-next-line no-console
				if (rootState.debug) console.log('doLog: pushed to unsavedLogs:')
				unsavedLogs.push(newLog)
				// eslint-disable-next-line no-console
				console.log('doLog: Could not read the log from ' + (rootState.currentDb + ' log') + ' A retry is pending , ' + error)
			})
	},

	// Save the log
	saveLog({
		rootState
	}, log) {
		globalAxios({
				method: 'PUT',
				url: rootState.currentDb + '/log',
				withCredentials: true,
				data: log
			}).then(() => {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log("saveLog: The log is saved.")
			})
			// eslint-disable-next-line no-console
			.catch(error => {
				// no attempt is made to store an unsaved log entry here
				// eslint-disable-next-line no-console
				console.log('saveLog: Could not save the log. The log entry is lost, ' + error)
			})
	},

}

export default {
	state,
	actions
}
