import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router'
import logging from './modules/logging'
import initdb from './modules/initdb'
import help from './modules/help'
import load from './modules/load'
import clone from './modules/clone'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import attachments from './modules/attachments'
import move from './modules/move'
import undo from './modules/undo'
import remove from './modules/remove'
import utils from './modules/utils'
import restorebranch from './modules/restorebranch'

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
		// logging
		logState: {
			unsavedLogs: [],
			savedLogs: [],
			runningWatchdogId: null,
			logSavePending: false
		},
		// load
		isProductAssigned: false,
		// options
		autoCorrectUserProfile: true,
		// product view
		selectedForView: 'comments',
		changeHistory: [],
		filterForComment: "",
		filterForHistory: "",
		busyRemoving: false,
		// utilities for superAdmin, admin and superPO
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
		// note that the roles of _admin, superPO, areaPO and admin are generic (not product specific)
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},
		isFollower(state) {
			const emails = state.currentDoc.followers.map(e => e.email)
			if (state.currentDoc) return emails.includes(state.userData.email)
		},
		isServerAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("_admin")
		},
		isSuperPO(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("superPO")
		},
		isAreaPO(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("areaPO")
		},
		isAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("admin")
		},
		isPO(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.load.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("PO")
		},
		isDeveloper(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.load.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		isGuest(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.load.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes.includes("guest")
		},
		canCreateComments(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.load.currentProductId]
			return getters.isAdmin || getters.issuperPO || getters.isareaPO || getters.isadmin ||
				getters.isAuthenticated && myCurrentProductRoles.includes("PO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		canUploadAttachments(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.load.currentProductId]
			return getters.issuperPO || getters.isareaPO ||
				getters.isAuthenticated && myCurrentProductRoles.includes("PO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("developer")
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
			state.load.currentDefaultProductId = null
			state.load.currentProductTitle = ''
			state.load.treeNodes = []
			state.load.productIdLoading = null
			state.load.processedProducts = 0

			state.isProductAssigned = false
			state.myProductOptions = []
			state.userData = {}
			state.changeHistory = []
			state.showHeaderDropDowns = true
			state.skipOnce = true
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
		restorebranch
	}

})
