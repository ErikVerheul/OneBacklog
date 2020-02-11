import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const LOGDOCNAME = 'log'
const MAXLOGSIZE = 1000
const WATCHDOGINTERVAL = 30
const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

const actions = {
	/* Check if database access is possible. Restart the cookie authentication if timed out. */
	checkConnection({
		rootState,
		dispatch
	}) {
		function restoreAuthentication() {
			let msg = "CheckConnection restarted cookie authentication"
			// refresh the authorzation cookie immediately
			dispatch('refreshCookie')
			// and start the refresh loop
			dispatch('refreshCookieLoop', {
				timeout: 540
			})
			let newLog = {
				"event": msg,
				"level": "INFO",
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString()
			}
			rootState.logState.unsavedLogs.push(newLog)
		}

		globalAxios({
			method: 'HEAD',
		}).then(() => {
			rootState.online = true
			if (!rootState.cookieAutenticated) restoreAuthentication()
		}).catch(error => {
			rootState.online = false
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('checkConnection: error.message = ' + error.message)
			// only when the cookie authentication timed out and error status 401 is returned we are online again despite the error condition
			if (error.message.includes('401')) {
				rootState.online = true
				// if not authorized to access the database restart the cookie authentication
				restoreAuthentication()
			}
		})
	},

	/*
	 * Logging is not possible without network connection to the database.
	 * When logging fails the entries are stored in the unsavedLogs array.
	 * This watchdog tests in intervals if the browser becomes online. If so then:
	 * - saves the stored log entries if available
	 * - restarts the cookie authentication service if timed out
	 * - restarts the synchronization service if stopped
	 */
	watchdog({
		rootState,
		dispatch
	}) {
		rootState.logState.runningWatchdogId = setInterval(() => {
			let logsToSave = rootState.logState.unsavedLogs.length
			if (rootState.showWatchdogInfo) {
				// eslint-disable-next-line no-console
				console.log('watchdog:' +
					'\nOnline = ' + rootState.online +
					'\nunsavedLogs = ' + logsToSave +
					'\ncookieAutenticated = ' + rootState.cookieAutenticated +
					'\nListenForChangesRunning = ' + rootState.listenForChangesRunning +
					'\ntimestamp = ' + new Date().toString())
			}
			if (rootState.online) {
				// catch up the logging and/or restart listening for changes
				if (logsToSave > 0 || !rootState.listenForChangesRunning) {
					globalAxios({
						method: 'GET',
						url: rootState.userData.currentDb + '/' + LOGDOCNAME,
					}).then(res => {
						let log = res.data
						// save the stored logs
						if (logsToSave > 0) {
							for (let i = 0; i < rootState.logState.unsavedLogs.length; i++) {
								log.entries.unshift(rootState.logState.unsavedLogs[i])
							}
							let newLog = {
								"event": "Watchdog found " + logsToSave + ' unsaved log entries and saved them',
								"level": "INFO",
								"by": rootState.userData.user,
								"timestamp": Date.now(),
								"timestampStr": new Date().toString()
							}
							log.entries.unshift(newLog)
							rootState.logState.unsavedLogs = []
						}
						// we have a working connection to the database; restart synchronization if needed
						if (!rootState.listenForChangesRunning) {
							dispatch('listenForChanges')
							let msg = "Watchdog restarted listening for changes"
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log(msg)
							let newLog = {
								"event": msg,
								"level": "INFO",
								"by": rootState.userData.user,
								"timestamp": Date.now(),
								"timestampStr": new Date().toString()
							}
							log.entries.unshift(newLog)
						}
						log.entries = log.entries.slice(0, MAXLOGSIZE)
						dispatch('saveLog', log)
					}).catch(error => {
						// eslint-disable-next-line no-console
						console.log('watchdog: Could not read the log, ' + error)
					})
				}
			}
			// check the connection including the authentication status
			dispatch('checkConnection')
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
			"by": rootState.userData.user,
			"timestamp": now,
			"timestampStr": new Date(now).toString()
		}
		// push the new log entry to the unsaved logs
		rootState.logState.unsavedLogs.push(newLog)

		if (rootState.userData.currentDb) {
			if (!rootState.logState.logSavePending) {
				// store all unsaved logs
				globalAxios({
					method: 'GET',
					url: rootState.userData.currentDb + '/' + LOGDOCNAME,
				}).then(res => {
					let log = res.data
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log("doLog: The log is fetched")

					if (rootState.logState.unsavedLogs.length > 0) {
						rootState.logState.savedLogs = []
						for (let l of rootState.logState.unsavedLogs) {
							log.entries.unshift(l)
							// save the log entries for recovery in case saveLog fails
							rootState.logState.savedLogs.push(l)
						}
						rootState.logState.unsavedLogs = []
						log.entries = log.entries.slice(0, MAXLOGSIZE)
						rootState.logState.logSavePending = true
						dispatch('saveLog', log)
						// check if the cause of one of the log entries is the loss of connection to the database
						dispatch('checkConnection')
					}
				}).catch(error => {
					//eslint-disable-next-line no-console
					if (rootState.debug) console.log('doLog: Pushed log entry to unsavedLogs:')
					rootState.logState.unsavedLogs.push(newLog)
					// eslint-disable-next-line no-console
					console.log('doLog: Could not read the log. A retry is pending , ' + error)
				})
			}
		} else {
			rootState.logState.unsavedLogs.push(newLog)
			// eslint-disable-next-line no-console
			console.log('doLog: Could not read the log. A retry is pending , the database name is undefined yet')
		}
	},

	// save the log
	saveLog({
		rootState
	}, log) {
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + LOGDOCNAME,
			data: log
		}).then(() => {
			rootState.logState.logSavePending = false
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log("saveLog: The log is saved")
		})
			// eslint-disable-next-line no-console
			.catch(error => {
				if (error.response.status === 409) {
					// revision conflict
					rootState.logState.unsavedLogs = rootState.logState.savedLogs
					// eslint-disable-next-line no-console
					console.log('saveLog: Could not save the log. A retry is pending, ' + error)
				} else
					// eslint-disable-next-line no-console
					console.log('saveLog: Could not save the log. The log entry is lost, ' + error)
			})
	}
}

export default {
	actions
}
