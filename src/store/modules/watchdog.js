import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const LOGDOCNAME = 'log'
const WATCHDOGINTERVAL = 5000

const state = {
	runningWatchdogId: null,
}

const actions = {
	/*
	 * This watchdog tests in intervals if the browser becomes online. If so then the action:
	 * - restarts the cookie authentication service
	 * - restarts the synchronization service
	 * - saves the stored log entries if available
	 */
	watchdog({ rootState, state, commit, dispatch }) {
		function consoleDebugStatus() {
			if (rootState.debugConnectionAndLogging) {
				console.log(
					'watchdog:' +
						'\nOnline = ' +
						rootState.online +
						'\nlogsToSaveCount = ' +
						rootState.unsavedLogs.length +
						'\ncookieAuthenticated = ' +
						rootState.authentication.cookieAuthenticated +
						'\nListenForChangesRunning = ' +
						rootState.listenForChangesRunning +
						'\ntimestamp = ' +
						new Date().toString(),
				)
			}
		}

		// test the connection and authentication status every WATCHDOGINTERVAL seconds
		state.runningWatchdogId = setInterval(() => {
			const wasOffline = rootState.online === false
			globalAxios({
				method: 'HEAD',
				url: rootState.userData.currentDb + '/' + LOGDOCNAME,
			})
				.then(() => {
					rootState.online = true
					rootState.authentication.cookieAuthenticated = true
					if (wasOffline) {
						dispatch('doLog', { event: `The application is online again.`, level: SEV.INFO })
						commit('addToEventList', { txt: 'You are online again', severity: SEV.INFO })
					}
					// start listenForChanges if needed
					if (!rootState.listenForChangesRunning) {
						if (rootState.debugConnectionAndLogging) dispatch('doLog', { event: `Watchdog attemps to (re)start the listener for changes.`, level: SEV.INFO })
						dispatch('listenForChanges')
					}
					// save the log on every watchdog cycle
					dispatch('saveLog')
					consoleDebugStatus()
				})
				.catch((error) => {
					if (error.response && error.response.status === 401) {
						rootState.authentication.cookieAuthenticated = false
						// if error status 401 is returned we are online again despite the error condition (no authentication)
						rootState.online = true
						commit('addToEventList', { txt: 'You are online again. The cookie authorization refresh loop is started', severity: SEV.INFO })
						// restart the cookie authorization refresh loop and wait for the next watchdog cycle to restart listenForChanges
						clearInterval(rootState.authentication.runningCookieRefreshId)
						dispatch('refreshCookie', { caller: 'watchdog', toDispatch: [{ refreshCookieLoop: null }] })
					} else {
						rootState.online = false
						// no idea if still authenticated
						rootState.authentication.cookieAuthenticated = undefined
						if (!wasOffline) commit('addToEventList', { txt: 'You are offline. Restore the connection or wait to continue', severity: SEV.WARNING })
					}
					consoleDebugStatus()
				})
		}, WATCHDOGINTERVAL)
	},
}

export default {
	state,
	actions,
}
