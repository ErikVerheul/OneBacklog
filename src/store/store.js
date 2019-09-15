import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../router'
import logging from './modules/logging'
import help from './modules/help'
import load from './modules/load'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import setup from './modules/setup'

const INFO = 0
const WARNING = 1
const ERROR = 2
const DEBUG = 3

Vue.use(Vuex)
/* These are the roles known by this application despite settings in the _users database otherwise.
 * Write access is dependant on role and level. Write access includes deletion.
 * For readability the access the role dependant values are hard coded.
 *
 * type ...............in database level ....... in tree
 * -----------------------------------------------------------------------
 * RequirementArea ........ 0 ................... n/a
 * Database ............... 1 ................... n/a
 * Product ................ 2 ................... 2
 * Epic .. ................ 3 ................... 3
 * Feature ................ 4 ................... 4
 * PBI ... ................ 5 ................... 5
 *
 *"knownRoles":
 *	"_admin": {
 *		description: "Is the database administrator. Can setup and delete databases. See the CouchDB documentation. Is also a guest to all products.",
 *		products: "all",
 *		writeAccessLevel: null,
 *		maintainUsers: true
 *	},
 *	"areaPO": {
 *		description: "Can access the requirements area with write access to the level 0 requirements area items and can prioritise features (level 4).
 *    Is also a guest to all products.",
 *		products: "all",
 *		writeAccessLevel: 0,4
 *		maintainUsers: false
 *	},
 *	"admin": {
 *		description: "Can create and assign users to products. Is also a guest to all products.",
 *		products: "all",
 *		writeAccessLevel: null,
 *		maintainUsers: true
 *	},
 *	"superPO": {
 *		description: "Can create and maintain products and epics for all products. Can change priorities at these levels. Is also a guest to all products.",
 *		products: "all",
 *		writeAccessLevel: 2,3
 *		maintainUsers: false
 *	},
 *	"PO": {
 *		description: "Can create and maintain epics, features and pbi's for the assigned products. Can change priorities at these levels.",
 *		products: "assigned",
 *		writeAccessLevel: 3,4,5
 *		maintainUsers: false
 *	},
 *	"developer": {
 *		description: "Can create and maintain pbi's and features for the assigned products.",
 *		products: "assigned",
 *		writeAccessLevel: 4,5
 *		maintainUsers: false
 *	},
 *	"guest": {
 *		description: "Can only view the items of the assigned products. Has no access to the requirements area view.",
 *		products: "assigned",
 *		writeAccessLevel: null,
 *		maintainUsers: false
 *	}
 */

export default new Vuex.Store({

	state: {
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
		passwordHash: undefined
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
		isProductsAdmin(state) {
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
		// a copy of the showLastEvent mixin which van not be used here
		showLastEvent(state, payload) {
            switch (payload.severity) {
                case INFO:
                    state.eventBgColor = '#408FAE'
                    break
                case WARNING:
                    state.eventBgColor = 'orange'
                    break
                case ERROR:
                    state.eventBgColor = 'red'
                    break
                case DEBUG:
                    state.eventBgColor = 'yellow'
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

			state.lastEvent = ''
			state.config = null
			state.currentDb = null
			state.currentDoc = null
			state.myDefaultRoles = []
			state.user = null
			state.passwordHash = undefined

			clearInterval(state.runningCookieRefreshId)
			clearInterval(state.logging.runningWatchdogId)
		},

		storePwHash(state, pw) {
			/* A direct replacement for Java’s String.hashCode() method implemented in Javascript */
			function hashCode(s) {
				var hash = 0, i, chr
				if (s.length === 0) return hash
				for (i = 0; i < s.length; i++) {
					chr = s.charCodeAt(i)
					hash = ((hash << 5) - hash) + chr;
					hash |= 0 // Convert to 32bit integer
				}
				return hash
			}
			state.passwordHash = hashCode(pw)
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
						console.log(msg)
						if (rootState.currentDb) dispatch('doLog', {
							event: msg,
							level: "CRITICAL"
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

			// store the password hash
			commit('storePwHash', authData.password)

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
					dispatch('getOtherUserData')
					// refresh the session cookie after 9 minutes (CouchDB defaults at 10 min.)
					dispatch('refreshCookie', {
						authData,
						loggedOut: state.loggedOut,
						afterSeconds: 540
					})
				})
				// Cannot log failure here as the database name is unknown yet
				// eslint-disable-next-line no-console
				.catch(error => console.log('Sign in failed with ' + error))
		},

		signout({
			commit
		}) {
			commit('resetData')
			router.replace('/')
		}
	},

	modules: {
		logging,
		help,
		load,
		sync,
		useracc,
		update,
		setup
	}

})
