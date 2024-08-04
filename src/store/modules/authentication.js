import { SEV } from '../../constants.js'
import globalAxios from 'axios'

// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

// refresh authentication every 9 minutes (CouchDB defaults at 10 min.)
const COOKIE_REFRESH_INTERVAL = 540000

const state = {
	sessionAuthData: undefined,
	cookieAuthenticated: false,
	runningCookieRefreshId: null,
}

const actions = {
	/* Refresh the authentication cookie; passed functions and actions are executed when defined in the payload */
	refreshCookie({
		rootState,
		dispatch,
		state
	}, payload) {
		if (rootState.online) {
			globalAxios({
				method: 'POST',
				url: '/_session',
				data: state.sessionAuthData
			}).then(() => {
				state.cookieAuthenticated = true
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}).catch(error => {
				// execute passed function if provided
				if (payload.onFailureCallback) payload.onFailureCallback()
				// stop the interval function and wait for the watchDog to start again
				clearInterval(state.runningCookieRefreshId)
				state.cookieAuthenticated = false
				dispatch('doLog', { event: `Refresh of the authentication cookie failed. ${error}`, level: SEV.CRITICAL })
			})
		}
	},

	/* Refresh the authentication cookie in a continuous loop starting after the timeout value */
	refreshCookieLoop({
		rootState,
		state,
		dispatch
	}) {
		if (rootState.online) {
			if (rootState.debugConnectionAndLogging) dispatch('doLog', { event: `The authentication cookie refresh loop is started.`, level: SEV.INFO })
			state.runningCookieRefreshId = setInterval(() => {
				dispatch('refreshCookie', { caller: 'refreshCookieLoop' })
			}, COOKIE_REFRESH_INTERVAL)
		}
	},

	/* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refreshed within 10 minutes */
	signin({
		rootState,
		state,
		dispatch
	}, authData) {
		function create_UUID() {
			let dt = Date.now()
			const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				const r = (dt + Math.random() * 16) % 16 | 0
				dt = Math.floor(dt / 16)
				return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
			})
			return uuid
		}
		globalAxios({
			method: 'POST',
			url: '/_session',
			data: authData
		}).then(res => {
			rootState.online = true
			rootState.signedOut = false
			rootState.mySessionId = create_UUID()
			state.sessionAuthData = authData
			rootState.iAmAssistAdmin = res.data.roles.includes('assistAdmin')
			rootState.iAmAdmin = res.data.roles.includes('admin')
			rootState.iAmAPO = res.data.roles.includes('APO')
			rootState.iAmServerAdmin = res.data.roles.includes('_admin')
			// email, myTeam, currentDb, myDatabases and myFilterSettings are updated after otherUserData and config are read
			rootState.userData = {
				user: res.data.name,
				email: undefined,
				myTeam: undefined,
				password: authData.password,
				currentDb: undefined,
				roles: res.data.roles,
				myDatabases: {},
				myFilterSettings: undefined
			}
			// set the session cookie and get all non-backup and non system database names
			const toDispatch = [
				{ refreshCookieLoop: null },
				{ getDatabases: null }
			]
			dispatch('refreshCookie', { caller: 'authentication:signin', toDispatch })
		}).catch(error => {
			// cannot log failure here as the database name is unknown yet
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('Sign in failed with ' + error)
		})
	}
}

export default {
	state,
	actions
}
