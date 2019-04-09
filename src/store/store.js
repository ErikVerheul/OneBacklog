import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../router'
import load from './modules/load'
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
 *	"reqArea": {
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
		user: null,
		myRoles: [],
		canWriteLevels: [],
		runningTimeout: null,
		config: null,
		currentDb: null,
		currentDoc: null,
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
		isServerAdmin(state) {
			return state.myRoles.includes("_admin")
		},
		canWriteLevels(state) {
			return state.canWriteLevels
		},
		getCurrentDb(state) {
			return state.currentDb
		},
		getCurrentItemId(state) {
			return state.currentDoc._id
		},
		getCurrentItemAcceptanceCriteria(state) {
			return state.currentDoc.acceptanceCriteria
		},
		getCurrentItemAttachments(state) {
			return state.currentDoc.attachments
		},
		getCurrentItemComments(state) {
			return state.currentDoc.comments
		},
		getCurrentItemDescription(state) {
			return state.currentDoc.description
		},
		getCurrentItemFollowers(state) {
			return state.currentDoc.followers
		},
		getCurrentItemHistory(state) {
			return state.currentDoc.history
		},
		getCurrentItemPriority(state) {
			return state.currentDoc.priority
		},
		getCurrentItemProductId(state) {
			return state.currentDoc.productId
		},
		getCurrentItemReqArea(state) {
			return state.currentDoc.reqarea
		},
		getCurrentItemSpSize(state) {
			return state.currentDoc.spsize
		},
		getCurrentItemState(state) {
			return state.currentDoc.state
		},
		getCurrentItemSubType(state) {
			return state.currentDoc.subtype
		},
		getCurrentItemTeam(state) {
			return state.currentDoc.team
		},
		getCurrentItemTitle(state) {
			return state.currentDoc.title
		},
		getCurrentItemTsSize(state) {
			return state.config.tsSize[state.currentDoc.tssize]
		},
		getCurrentItemType(state) {
			return state.currentDoc.type
		},
		getCurrentPersonHours(state) {
			return state.currentDoc.spikepersonhours
		}
	},

	mutations: {
		authUser(state, userData) {
			const maxLevel = 5
			state.user = userData.user
			state.myRoles = userData.roles
			var levels = []
			for (let i = 0; i <= maxLevel; i++) {
				levels.push(false)
			}
			if (state.myRoles.includes('reqArea')) {
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

		clearAuthData(state) {
			state.load.docsCount = 0
			state.load.itemsCount = 0
			state.load.orphansCount = 0
			state.user = null
			state.load.teams = null
			state.myRoles = []
			state.load.config = null
			state.currentDb = null
			state.currentDoc = null
			state.load.databases = []
			state.load.email = null
			state.load.offset = 0,
			state.load.treeNodes = []
			state.load.userAssignedProductIds = []

			clearTimeout(state.runningTimeout)
		}
	},

	actions: {
		refreshCookie({
			dispatch,
			state
		}, payload) {
			// eslint-disable-next-line no-console
			console.log("refreshcookie: afterSeconds= " + payload.afterSeconds)
			state.runningTimeout = setTimeout(() => {
				globalAxios({
						method: 'POST',
						url: '/_session',
						withCredentials: true,
						data: {
							name: payload.authData.name,
							password: payload.authData.password
						}
					}).then(res => {
						// eslint-disable-next-line no-console
						console.log(res)
						// eslint-disable-next-line no-console
						console.log("recurse refreshCookie")
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
			globalAxios({
					method: 'POST',
					url: '/_session',
					withCredentials: true,
					data: {
						name: authData.name,
						password: authData.password
					}
				}).then(res => {
					// eslint-disable-next-line no-console
					console.log(res)
					if (res.status == 200) {
						state.user = res.data.name
						commit('authUser', {
							user: res.data.name,
							roles: res.data.roles
						})
						dispatch('getOtherUserData')
						//Refresh the session cookie after 6 minutes
						dispatch('refreshCookie', {
							authData,
							loggedOut: state.loggedOut,
							afterSeconds: 360
						})
					}
				})
				// eslint-disable-next-line no-console
				.catch(error => console.log(error))
		},


		logout({
			commit
		}) {
			commit('clearAuthData')
			router.replace('/')
		}
	},

	modules: {
		load,
		useracc,
		update,
		setup
	}

})
