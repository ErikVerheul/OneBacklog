import globalAxios from 'axios'

const LOGFILENAME = 'log'
const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 30
var unsavedLogs = []
const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

const state = {
	runningWatchdogId: null
}

const actions = {
	/*
	 * Logging is not possible without network connection to the database.
	 * When logging fails the entries are stored in the unsavedLogs array.
	 * This watchdog tests in intervals if the browser becomes online. If so then:
	 * - saves the stored log entries if available
	 * - restarts the synchronization service if stopped
	 */
	watchdog({
		rootState,
		state,
		dispatch
	}) {
		state.runningWatchdogId = setInterval(function () {
			rootState.online = navigator.onLine
			let logsToSave = unsavedLogs.length
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('watchdog:' +
				'\nOnline = ' + rootState.online +
				'\nUnsavedLogs = ' + logsToSave +
				'\nListenForChangesRunning = ' + rootState.listenForChangesRunning)
			if (rootState.online) {
				// catch up the logging
				if (logsToSave > 0 || !rootState.listenForChangesRunning) {
					globalAxios({
						method: 'GET',
						url: rootState.currentDb + '/' + LOGFILENAME,
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
								"event": "Watchdog found " + logsToSave + ' unsaved log entries and saved them',
								"level": "INFO",
								"by": rootState.user,
								"email": rootState.load.email,
								"timestamp": now,
								"timestampStr": new Date(now).toString()
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
								"timestampStr": new Date(now).toString()
							}
							log.entries.unshift(newLog)
						}
						log.entries = log.entries.slice(0, MAXLOGSIZE)
						dispatch('saveLog', log)
					})
						.catch(error => {
							// eslint-disable-next-line no-console
							console.log('watchdog: Could not read the log from ' + (rootState.currentDb + ' ' + LOGFILENAME) + ', ' + error)
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
		let severity = ''
		switch (payload.level) {
			case DEBUG:
				severity = 'DEBUG'
				break
			case INFO:
				severity = 'INFO'
				break
			case WARNING:
				severity = 'WARNING'
				break
			case ERROR:
				severity = 'ERROR'
				break
			case CRITICAL:
				severity = 'CRITICAL'
		}
		const now = Date.now()
		const newLog = {
			"event": payload.event,
			"level": payload.level,
			"levelStr": severity,
			"by": rootState.user,
			"email": rootState.load.email,
			"timestamp": now,
			"timestampStr": new Date(now).toString()
		}
		globalAxios({
			method: 'GET',
			url: rootState.currentDb + '/' + LOGFILENAME,
			withCredentials: true,
		}).then(res => {
			let log = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log("doLog: The log is fetched.")

			log.entries.unshift(newLog)
			log.entries = log.entries.slice(0, MAXLOGSIZE)
			dispatch('saveLog', log)
		})
			.catch(error => {
				//eslint-disable-next-line no-console
				if (rootState.debug) console.log('doLog: Pushed log entry to unsavedLogs:')
				unsavedLogs.push(newLog)
				// eslint-disable-next-line no-console
				console.log('doLog: Could not read the log from ' + (rootState.currentDb + ' ' + LOGFILENAME) + ' A retry is pending , ' + error)
			})
	},

	// Save the log
	saveLog({
		rootState
	}, log) {
		globalAxios({
			method: 'PUT',
			url: rootState.currentDb + '/' + LOGFILENAME,
			withCredentials: true,
			data: log
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log("saveLog: The log is saved.")
		})
			// eslint-disable-next-line no-console
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log('saveLog: Could not save the log. The log entry is lost, ' + error)
			})
	},

}

export default {
	state,
	actions
}
