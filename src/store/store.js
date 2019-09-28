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
		listenForChangesRunning: false,
		lastSyncSeq: null,
		sessionId: null,
		config: null,
		currentDb: null,
		currentDoc: null,
		debug: true,
		demo: true,
		myDefaultRoles: [],
		runningCookieRefreshId: null,
		user: null,
		moveOngoing: false,
		password: undefined
	},

	getters: {
		isAuthenticated(state) {
			return state.user !== null
		},
		isFollower(state) {
			if (state.currentDoc) return state.currentDoc.followers.includes(state.load.email)
		},
		isServerAdmin(state) {
			return state.myDefaultRoles.includes("_admin")
		},
		isAreaPO(state) {
			return state.myDefaultRoles.includes("areaPO")
		},
		isSuperPO(state) {
			return state.myDefaultRoles.includes("superPO")
		},
		isAdmin(state) {
			return state.myDefaultRoles.includes("admin")
		},
		canCreateComments(state) {
			return state.myDefaultRoles.includes("_admin") || state.myDefaultRoles.includes("areaPO") || state.myDefaultRoles.includes("admin") || state.myDefaultRoles.includes("superPO") || state.myDefaultRoles.includes("PO") || state.myDefaultRoles.includes("developer")
		},
		getCurrentItemTsSize(state) {
			if (state.config) return state.config.tsSize[state.currentDoc.tssize]
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

		authUser(state, userData) {
			state.user = userData.user
			state.myDefaultRoles = userData.roles
			state.sessionId = userData.sessionId
		},

		resetData(state) {
			state.load.docsCount = 0
			state.load.itemsCount = 0
			state.load.orphansCount = 0
			state.load.currentUserProductId = null
			state.load.currentProductId = null
			state.load.currentProductTitle = ''
			state.load.databases = []
			state.load.myTeams = []
			state.load.myCurrentTeam = ''
			state.load.email = null
			state.load.treeNodes = []
			state.load.userAssignedProductIds = []
			state.load.productIdLoading = null
			state.load.processedProducts = 0
			state.load.myProductsRoles = {}
			state.load.myProductOptions = [],
			state.load.myProductSubscriptions = [],

			state.showHeaderDropDowns = true,
			state.skipOnce = true,
			state.lastEvent = ''
			state.config = null
			state.currentDb = null
			state.currentDoc = null
			state.myDefaultRoles = []
			state.user = null
			state.password = undefined

			clearInterval(state.runningCookieRefreshId)
			clearInterval(state.logging.runningWatchdogId)
		}
	},

	actions: {
		refreshCookie({
			rootState,
			dispatch,
			state
		}, payload) {
			// eslint-disable-next-line no-console
			if (state.debug) console.log("refreshcookie: afterSeconds= " + payload.afterSeconds)
			state.runningCookieRefreshId = setInterval(() => {
				globalAxios({
					method: 'POST',
					url: '/_session',
					withCredentials: true,
					data: {
						name: payload.authData.name,
						password: payload.authData.password
					}
				}).then(() => {
					// eslint-disable-next-line no-console
					if (state.debug) console.log("refreshCookie: Authentication cookie refresh.")
				})
					.catch(error => {
						let msg = 'Refresh of the authentication cookie failed with ' + error
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log(msg)
						if (rootState.currentDb) dispatch('doLog', {
							event: msg,
							level: CRITICAL
						})
					})
			}, payload.afterSeconds * 1000)
		},

		/*
		* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refrehed within 10 minutes
		*/
		signin({
			commit,
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

			// store the password
			state.password = authData.password

			globalAxios({
				method: 'POST',
				url: '/_session',
				withCredentials: true,
				data: {
					name: authData.name,
					password: authData.password
				}
			}).then(res => {
				state.user = res.data.name
				commit('authUser', {
					user: res.data.name,
					roles: res.data.roles,
					sessionId: create_UUID()
				})
				// refresh the session cookie after 9 minutes (CouchDB defaults at 10 min.)
				dispatch('refreshCookie', {
					authData,
					loggedOut: state.loggedOut,
					afterSeconds: 540
				})
				dispatch('getOtherUserData')
			})
				// cannot log failure here as the database name is unknown yet
				// eslint-disable-next-line no-console
				.catch(error => console.log('Sign in failed with ' + error))
		},

		signout({commit}) {
			commit('resetData')
			router.replace('/')
		}
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
