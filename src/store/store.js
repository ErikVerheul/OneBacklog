import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router' //Here ../router/index is imported
import load from './modules/load'
import setup from './modules/setup'

Vue.use(Vuex)

export default new Vuex.Store({

	state: {
		user: null,
		roles: [],
		email: null,
		runningTimeout: null,
	},

	getters: {
		getUser(state) {
			return state.user
		},
		getRoles(state) {
			return state.roles
		},
		isServerAdmin(state) {
			return state.roles.includes("_admin")
		},
		isAuthenticated(state) {
			return state.user !== null
		},

	},

	mutations: {
		authUser(state, userData) {
			state.user = userData.user
			state.roles = userData.roles
		},

		clearAuthData(state) {
			state.user = null
			state.roles = []
			state.load.databases = []
			state.load.currentDb = null
			state.load.offset = 0
			state.load.nodes = []
			state.email = null
			state.load.config = null
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
		setup
	}

})
