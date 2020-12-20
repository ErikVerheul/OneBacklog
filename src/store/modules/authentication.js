import globalAxios from 'axios'
import router from '../../router'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const CRITICAL = 3

const state = {
	sessionAuthData: undefined,
	cookieAuthenticated: false,
	runningCookieRefreshId: null,
}

const actions = {
	/* Refresh the authentication cookie */
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
				// eslint-disable-next-line no-console
				if (rootState.debugConnectionAndLogging) console.log('refreshCookie: Authentication cookie refresh is running')
				// execute passed function if provided
				if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
				// execute passed action if provided
				if (payload.toDispatch) {
					// additional dispatches
					for (const td of payload.toDispatch) {
						const name = Object.keys(td)[0]
						// eslint-disable-next-line no-console
						if (rootState.debugConnectionAndLogging) console.log('refreshCookie: dispatching ' + name)
						dispatch(name, td[name])
					}
				}
			}).catch(error => {
				// execute passed function if provided
				if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
				// stop the interval function and wait for the watchDog to start again
				clearInterval(state.runningCookieRefreshId)
				state.cookieAuthenticated = false
				rootState.stopListenForChanges = true
				rootState.online = false
				const msg = 'Refresh of the authentication cookie failed with ' + error
				// eslint-disable-next-line no-console
				if (rootState.debugConnectionAndLogging) console.log(msg)
				// do not try to save the log if a network error is detected, just queue the log
				const skipSaving = error.message = 'Network error'
				dispatch('doLog', { event: msg, level: CRITICAL, skipSaving })
			})
		}
	},

	/* Refresh the authentication cookie in a continuous loop starting after the timeout value */
	refreshCookieLoop({
		rootState,
		state,
		dispatch
	}, payload) {
		if (rootState.online) {
			state.runningCookieRefreshId = setInterval(() => {
				dispatch('refreshCookie')
			}, payload.timeout * 1000)
		}
	},

	/* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refrehed within 10 minutes */
	signin({
		rootState,
		state,
		dispatch,
		commit
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
			commit('resetData')
			state.sessionAuthData = authData
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
				myFilterSettings: undefined,
				sessionId: create_UUID()
			}
			// set the session cookie and refresh every 9 minutes (CouchDB defaults at 10 min.); on success also get the databases
			const toDispatch = [{ refreshCookieLoop: { timeout: 540 } }, { getDatabases: null }]
			dispatch('refreshCookie', { toDispatch })
		})
			// cannot log failure here as the database name is unknown yet
			// eslint-disable-next-line no-console
			.catch(error => console.log('Sign in failed with ' + error))
	},

	signout({ commit }) {
		commit('resetData')
		router.replace('/')
	}
}

export default {
	state,
	actions
}
