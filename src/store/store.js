import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../router'
import load from './modules/load'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import setup from './modules/setup'

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
		sessionId: null,
		canWriteLevels: [],
		config: null,
		currentDb: null,
		currentDoc: null,
		debug: true,
		demo: false,
		myRoles: [],
		runningTimeout: null,
		user: null
	},

	getters: {
		getUser(state) {
			return state.user
		},
		getMyRoles(state) {
			return state.myRoles
		},
		isAuthenticated(state) {
			return state.user !== null
		},
		isDemoVersion(state) {
			return state.demo
		},
		isFollower(state) {
			if (state.currentDoc) return state.currentDoc.followers.includes(state.load.email)
		},
		isServerAdmin(state) {
			return state.myRoles.includes("_admin")
		},
		canWriteLevels(state) {
			return state.canWriteLevels
		},
		canCreateComments(state) {
			return state.myRoles.includes("_admin") || state.myRoles.includes("areaPO") || state.myRoles.includes("admin") || state.myRoles.includes("superPO") || state.myRoles.includes("PO") || state.myRoles.includes("developer")
		},
		getCurrentDb(state) {
			return state.currentDb
		},
		getCurrentItemId(state) {
			if (state.currentDoc) return state.currentDoc._id
		},
		getCurrentItemAcceptanceCriteria(state) {
			if (state.currentDoc) return state.currentDoc.acceptanceCriteria
		},
		getCurrentItemAttachments(state) {
			if (state.currentDoc) return state.currentDoc.attachments
		},
		getCurrentItemComments(state) {
			if (state.currentDoc) return state.currentDoc.comments
		},
		getCurrentItemDescription(state) {
			if (state.currentDoc) return state.currentDoc.description
		},
		getCurrentItemFollowers(state) {
			if (state.currentDoc) return state.currentDoc.followers
		},
		getCurrentItemHistory(state) {
			if (state.currentDoc) return state.currentDoc.history
		},
		getCurrentItemPriority(state) {
			if (state.currentDoc) return state.currentDoc.priority
		},
		getCurrentItemProductId(state) {
			if (state.currentDoc) return state.currentDoc.productId
		},
		getCurrentItemReqArea(state) {
			if (state.currentDoc) return state.currentDoc.reqarea
		},
		getCurrentItemSpSize(state) {
			if (state.currentDoc) return state.currentDoc.spsize
		},
		getCurrentItemState(state) {
			if (state.currentDoc) return state.currentDoc.state
		},
		getCurrentItemSubType(state) {
			if (state.currentDoc) return state.currentDoc.subtype
		},
		getCurrentItemTeam(state) {
			if (state.currentDoc) return state.currentDoc.team
		},
		getCurrentItemTitle(state) {
			if (state.currentDoc) return state.currentDoc.title
		},
		getCurrentItemTsSize(state) {
			if (state.config) return state.config.tsSize[state.currentDoc.tssize]
		},
		getCurrentItemLevel(state) {
			if (state.currentDoc) return state.currentDoc.level
		},
		getCurrentPersonHours(state) {
			if (state.currentDoc) return state.currentDoc.spikepersonhours
		},
		onDebug(state) {
			return state.debug
		}
	},

	mutations: {
		authUser(state, userData) {
			state.sessionId = userData.sessionId

			const maxLevel = 5
			state.user = userData.user
			state.myRoles = userData.roles
			let levels = []
			for (let i = 0; i <= maxLevel; i++) {
				levels.push(false)
			}
			if (state.myRoles.includes('areaPO')) {
				levels[0] = true
				levels[4] = true
			}
			if (state.myRoles.includes('superPO')) {
				for (let i = 2; i <= 3; i++) {
					levels[i] = true
				}
			}
			if (state.myRoles.includes('PO')) {
				for (let i = 3; i <= maxLevel; i++) {
					levels[i] = true
				}
			}
			if (state.myRoles.includes('developer')) {
				for (let i = 4; i <= maxLevel; i++) {
					levels[i] = true
				}
			}
			state.canWriteLevels = levels
		},

		resetData(state) {
			state.load.docsCount = 0
			state.load.itemsCount = 0
			state.load.orphansCount = 0
			state.load.lastEvent = ''
			state.load.currentUserProductId = null
			state.load.currentProductId = null
			state.load.currentProductTitle = ''
			state.load.databases = []
			state.load.myTeams = []
			state.load.myCurrentTeam = ''
			state.load.email = null
			state.load.offset = 0
			state.load.treeNodes = []
			state.load.userAssignedProductIds = []

			state.canWriteLevels = []
			state.config = null
			state.currentDb = null
			state.currentDoc = null
			state.myRoles = []
			state.user = null

			clearTimeout(state.runningTimeout)
		}
	},

	actions: {
		refreshCookie({
			dispatch,
			state
		}, payload) {
			// eslint-disable-next-line no-console
			if (state.debug) console.log("refreshcookie: afterSeconds= " + payload.afterSeconds)
			state.runningTimeout = setTimeout(() => {
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
						if (state.debug) console.log("recurse refreshCookie")
						//Recurse
						dispatch('refreshCookie', payload)
					})
					// eslint-disable-next-line no-console
					.catch(error => console.log(error))
			}, payload.afterSeconds * 1000)
		},

		login({
			commit,
			dispatch,
			state
		}, authData) {

			function create_UUID() {
				var dt = new Date.now()
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
					//Refresh the session cookie after 50 seconds
					dispatch('refreshCookie', {
						authData,
						loggedOut: state.loggedOut,
						afterSeconds: 50
					})
				})
				// eslint-disable-next-line no-console
				.catch(error => console.log(error))
		},

		logout({
			commit
		}) {
			commit('resetData')
			router.replace('/')
		}
	},

	modules: {
		load,
		sync,
		useracc,
		update,
		setup
	}

})
