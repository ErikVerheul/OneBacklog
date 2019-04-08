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

export default new Vuex.Store({

	state: {
		user: null,
		myRoles: [],
		runningTimeout: null,
		config: null,
		currentDb: null,
		currentDoc: null
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
		canChangePriorities(state) {
			if (state.currentDoc != null) {
				// ToDo: for now everyone can do all
				return true
			}
		},
		getCurrentDb(state) {
			return state.currentDb
		},
		getCurrentItemId(state) {
			if (state.currentDoc != null) return state.currentDoc._id
		},
		getCurrentItemAcceptanceCriteria(state) {
			if (state.currentDoc != null) return state.currentDoc.acceptanceCriteria
		},
		getCurrentItemAttachments(state) {
			if (state.currentDoc != null) return state.currentDoc.attachments
		},
		getCurrentItemComments(state) {
			if (state.currentDoc != null) return state.currentDoc.comments
		},
		getCurrentItemDescription(state) {
			if (state.currentDoc != null) return state.currentDoc.description
		},
		getCurrentItemFollowers(state) {
			if (state.currentDoc != null) return state.currentDoc.followers
		},
		getCurrentItemHistory(state) {
			if (state.currentDoc != null) return state.currentDoc.history
		},
		getCurrentItemPriority(state) {
			if (state.currentDoc != null) return state.currentDoc.priority
		},
		getCurrentItemProductId(state) {
			if (state.currentDoc != null) return state.currentDoc.productId
		},
		getCurrentItemReqArea(state) {
			if (state.currentDoc != null) return state.currentDoc.reqarea
		},
		getCurrentItemSpSize(state) {
			if (state.currentDoc != null) return state.currentDoc.spsize
		},
		getCurrentItemState(state) {
			if (state.currentDoc != null) return state.currentDoc.state
		},
		getCurrentItemSubType(state) {
			if (state.currentDoc != null) return state.currentDoc.subtype
		},
		getCurrentItemTeam(state) {
			if (state.currentDoc != null) return state.currentDoc.team
		},
		getCurrentItemTitle(state) {
			if (state.currentDoc != null) return state.currentDoc.title
		},
		getCurrentItemTsSize(state) {
			if (state.currentDoc != null) return state.config.tsSize[state.currentDoc.tssize]
		},
		getCurrentItemType(state) {
			if (state.currentDoc != null) return state.currentDoc.type
		},
		getCurrentPersonHours(state) {
			if (state.currentDoc != null) return state.currentDoc.spikepersonhours
		}
	},

	mutations: {
		authUser(state, userData) {
			state.user = userData.user
			state.myRoles = userData.roles
		},

		clearAuthData(state) {
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
