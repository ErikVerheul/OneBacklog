import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router'
import logging from './modules/logging'
import startup from './modules/startup'
import initdb from './modules/initdb'
import help from './modules/help'
import load from './modules/reload'
import clone from './modules/clone'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import attachments from './modules/attachments'
import move from './modules/move'
import undo from './modules/undo'
import remove from './modules/remove'
import utils from './modules/utils'
import restorebranches from './modules/restorebranches'
import loadproducts from './modules/load_detail.js'
import loadreqareas from './modules/load_coarse.js'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		// console log settings
		debug: true,
		showWatchdogInfo: false,
		isProductAssigned: false,
		// loading options
		autoCorrectUserProfile: true,
		// logging
		logState: {
			unsavedLogs: [],
			savedLogs: [],
			runningWatchdogId: null,
			logSavePending: false
		},
		//startup
		currentDefaultProductId: null,
		currentProductId: null,
		currentProductTitle: "",
		// loading
		treeNodes: [],
		// product view
		reqAreaMapper: {},
		// req areas view
		colorMapper: {},
		reqAreaOptions: [],
		// view settings
		currentView: 'products',
		// product view
		selectedForView: 'comments',
		changeHistory: [],
		filterForComment: "",
		filterForHistory: "",
		busyRemoving: false,
		// utilities for server Admin and admin
		seqKey: 0,
		areDatabasesFound: false,
		areProductsFound: false,
		areTeamsFound: false,
		backendMessages: [],
		databaseOptions: undefined,
		fetchedTeams: [],
		isDatabaseCreated: false,
		isCurrentDbChanged: false,
		isProductCreated: false,
		isPurgeReady: false,
		isTeamCreated: false,
		isUserFound: false,
		isUserCreated: false,
		isUserUpdated: false,
		isHistAndCommReset: false,
		selectedDatabaseName: '',
		warning: '',
		// app wide globals
		myProductOptions: [],
		demo: true,
		online: true,
		userData: {},
		showHeaderDropDowns: true,
		skipOnce: true,
		nodeSelected: null,
		moveOngoing: false,
		selectNodeOngoing: false,
		numberOfNodesSelected: 0,
		lastEvent: '',
		eventSyncColor: '#004466',
		eventBgColor: '#408FAE',
		filterText: 'Filter in tree view',
		filterOn: false,
		findIdOn: false,
		shortId: '',
		searchOn: false,
		keyword: '',
		cookieAutenticated: false,
		listenForChangesRunning: false,
		configData: null,
		currentDoc: null,
		runningCookieRefreshId: null,
		uploadDone: true
	},

	getters: {
		// note that the roles of _admin and admin are generic (not product specific)
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},
		isFollower(state) {
			if (!state.currentDoc.followers) return false

			const emails = state.currentDoc.followers.map(e => e.email)
			if (state.currentDoc) return emails.includes(state.userData.email)
		},
		isServerAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("_admin")
		},
		isAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("admin")
		},
		isPO(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("PO")
		},
		isAPO(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("APO")
		},
		isDeveloper(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		isGuest(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes.includes("guest")
		},
		canCreateComments(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isServerAdmin || getters.isAdmin ||
				getters.isAuthenticated && myCurrentProductRoles.includes("PO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("APO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		canUploadAttachments(state, getters) {
			// same as canCreateComments
			return this.canCreateComments(state, getters)
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
			state.currentDefaultProductId = null
			state.currentProductId = null
			state.currentProductTitle = ''
			state.isProductAssigned = false
			state.myProductOptions = []
			state.userData = {}
			state.changeHistory = []
			state.showHeaderDropDowns = true
			state.lastEvent = ''
			state.configData = null
			state.currentDoc = null
			state.warning = ''

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
				dispatch('doLog', { event: msg, level: CRITICAL })
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
				data: authData
			}).then(res => {
				// email, myTeam, currentDb, myProductSubscriptions, userAssignedProductIds, myProductsRoles and myFilterSettings are updated when otherUserData and config are read
				state.userData = {
					user: res.data.name,
					email: undefined,
					myTeam: undefined,
					password: authData.password,
					myDatabases: [],
					currentDb: undefined,
					sessionRoles: res.data.roles,
					myProductSubscriptions: [],
					userAssignedProductIds: [],
					myProductsRoles: {},
					myFilterSettings: undefined,
					sessionId: create_UUID()
				}
				state.cookieAutenticated = true
				// refresh the session cookie after 9 minutes (CouchDB defaults at 10 min.)
				dispatch('refreshCookieLoop', {
					timeout: 540
				})
				dispatch('getDatabases')
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

	// prevent getters.$refs.contextMenuRef return undefined after hot reload
	beforeDestroy(state) {
		clearInterval(state.runningCookieRefreshId)
		clearInterval(state.logging.runningWatchdogId)
	},

	modules: {
		startup,
		initdb,
		logging,
		help,
		load,
		clone,
		sync,
		useracc,
		update,
		attachments,
		move,
		undo,
		remove,
		utils,
		restorebranches,
		loadproducts,
		loadreqareas
	}

})
