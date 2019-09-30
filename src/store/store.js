import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../router'
import logging from './modules/logging'
import initdb from './modules/initdb'
import help from './modules/help'
import load from './modules/load'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import setup from './modules/setup'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		debug: true,
		demo: true,

		userData: {},
		showHeaderDropDowns: true,
		skipOnce: true,
		nodeSelected: null,
		numberOfNodesSelected: 0,
		lastEvent: '',
		online: true,
		eventSyncColor: '#004466',
		eventBgColor: '#408FAE',
		filterText: 'Recent changes',
		filterOn: false,
		findIdOn: false,
		shortId: '',
		searchOn: false,
		keyword: '',
		cookieAutenticated: false,
		listenForChangesRunning: false,
		lastSyncSeq: null,
		configData: null,
		currentDoc: null,
		runningCookieRefreshId: null,
		moveOngoing: false
	},

	getters: {
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},
		isFollower(state) {
			if (state.currentDoc) return state.currentDoc.followers.includes(state.userData.email)
		},
		isServerAdmin(state) {
			return state.userData.roles.includes("_admin")
		},
		isAreaPO(state) {
			return state.userData.roles.includes("areaPO")
		},
		isSuperPO(state) {
			return state.userData.roles.includes("superPO")
		},
		isAdmin(state) {
			return state.userData.roles.includes("admin")
		},
		canCreateComments(state) {
			return state.userData.roles.includes("_admin") ||
				state.userData.roles.includes("areaPO") ||
				state.userData.roles.includes("admin") ||
				state.userData.roles.includes("superPO") ||
				state.userData.roles.includes("PO") ||
				state.userData.roles.includes("developer")
		},
		getCurrentItemTsSize(state) {
			if (state.configData) return state.configData.tsSize[state.currentDoc.tssize]
		},
		getCurrentItemLevel(state) {
			if (state.currentDoc) return state.currentDoc.level
		}
	},

	mutations: {
		// a copy of the showLastEvent mixin which can not be used here
		showLastEvent(state, payload) {
			switch (payload.severity) {
				case DEBUG:
					state.eventBgColor = 'yellow'
					break
				case INFO:
					state.eventBgColor = '#408FAE'
					break
				case WARNING:
					state.eventBgColor = 'orange'
					break
				case ERROR:
					state.eventBgColor = 'red'
					break
				case CRITICAL:
					state.eventBgColor = '#ff5c33'
			}
			state.lastEvent = payload.txt
		},

		resetData(state) {
			state.load.docsCount = 0
			state.load.itemsCount = 0
			state.load.orphansCount = 0
			state.load.currentProductId = null
			state.load.currentProductTitle = ''
			state.load.treeNodes = []
			state.load.productIdLoading = null
			state.load.processedProducts = 0
			state.load.myProductOptions = [],

			state.userData = {}
			state.showHeaderDropDowns = true,
			state.skipOnce = true,
			state.lastEvent = ''
			state.configData = null
			state.currentDoc = null

			clearInterval(state.runningCookieRefreshId)
			clearInterval(state.logging.runningWatchdogId)
		}
	},

	actions: {
		/* Refresh the autentication cookie */
		refreshCookie({
			dispatch,
			state
		}) {
			globalAxios({
				method: 'POST',
				url: '/_session',
				withCredentials: true,
				data: { name: state.userData.user, password: state.userData.password }
			}).then(() => {
				state.cookieAutenticated = true
				// eslint-disable-next-line no-console
				if (state.debug) console.log("refreshCookie: Authentication cookie refresh is running.")
			}).catch(error => {
				// stop the interval function and wait for the watchDog to start again
				clearInterval(state.runningCookieRefreshId)
				state.cookieAutenticated = false
				let msg = 'refreshCookie: Refresh of the authentication cookie failed with ' + error
				// eslint-disable-next-line no-console
				if (state.debug) console.log(msg)
				if (state.userData.currentDb) dispatch('doLog', {
					event: msg,
					level: CRITICAL
				})
			})
		},

		/* Refresh the authentication cookie in a contineous loop starting after the timeout value */
		refreshCookieLoop({
			state,
			dispatch
		}, payload) {
			state.runningCookieRefreshId = setInterval(() => {
				dispatch('refreshCookie')
			}, payload.timeout * 1000)
		},

		/* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refrehed within 10 minutes */
		signin({
			dispatch,
			state
		}, authData) {

			function create_UUID() {
				var dt = Date.now()
				var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					let r = (dt + Math.random() * 16) % 16 | 0
					dt = Math.floor(dt / 16)
					return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
				})
				return uuid
			}

			globalAxios({
				method: 'POST',
				url: '/_session',
				withCredentials: true,
				data: authData
			}).then(res => {
				// email, myTeams, myCurrentTeam, currentDb, myProductsRoles, myProductSubscriptions and userAssignedProductIds
				// are updated when otherUserData and config are read.
				state.userData = {
					user: res.data.name,
					email: '',
					myTeams: [],
					myCurrentTeam: 'none assigned',
					password: authData.password,
					currentDb: '',
					roles: res.data.roles,
					myProductSubscriptions: [],
					userAssignedProductIds: [],
					myProductsRoles: {},
					sessionId: create_UUID()
				}
				state.cookieAutenticated = true
				// refresh the session cookie after 9 minutes (CouchDB defaults at 10 min.)
				dispatch('refreshCookieLoop', {
					timeout: 540
				})
				dispatch('getOtherUserData')
			})
				// cannot log failure here as the database name is unknown yet
				// eslint-disable-next-line no-console
				.catch(error => console.log('Sign in failed with ' + error))
		},

		signout({ commit }) {
			commit('resetData')
			router.replace('/')
		},
	},

	// prevent this.$refs.contextMenuRef return undefined after hot reload
	beforeDestroy(state) {
		clearInterval(state.runningCookieRefreshId)
		clearInterval(state.logging.runningWatchdogId)
	},

	modules: {
		initdb,
		logging,
		help,
		load,
		sync,
		useracc,
		update,
		setup
	}

})
