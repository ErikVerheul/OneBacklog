import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router' //Here ../router/index is imported
import setup from './modules/setup'

Vue.use(Vuex)

export default new Vuex.Store({

  state: {
    user: null,
    roles: [],
    databases: [],
    currentDb: null,
    email: null,
    config: null,
    runningTimeout: null,
  },

  getters: {
    user (state) {
      return state.user
    },
		getCurrendDb (state) {
			return state.currentDb
		},
    roles (state) {
      return state.roles
    },
    isServerAdmin (state) {
      return state.roles.includes("_admin")
    },
    isAuthenticated (state) {
      return state.user !== null
    }
  },

  mutations: {
    authUser (state, userData) {
      state.user = userData.user
      state.roles = userData.roles
    },
    storeUser (state, user) {
      state.user = user
      // eslint-disable-next-line no-console
      console.log("storeUser: user= " + state.user)
    },
    clearAuthData (state) {
      state.user = null
      state.roles = []
      state.databases = []
      state.currentDb = null
      state.email = null
      state.config = null
      clearTimeout(state.runningTimeout)
    },
    setConfig (state, config) {
      state.config = config
    }
  },

  actions: {
    refreshCookie ({dispatch, state}, payload) {
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
        }).then (res => {
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

    // Load the config file from this database
    getConfig({state, commit}) {
      globalAxios({
        method: 'GET',
        url: state.currentDb + '/config',
        withCredentials: true,
      }).then (res => {
        if (res.status == 200) {
          commit('setConfig', 'res.data')
          // eslint-disable-next-line no-console
          console.log('The configuration is loaded')
        }
      })
      // eslint-disable-next-line no-console
      .catch(error => console.log('Config doc missing in database ' + state.currentDb + '. Error = ' + error))
    },

    // Get the current DB name etc. for this user. Note that the user roles are already fetched
    getOtherUserData({state, dispatch}) {
      this.commit('clearAll')
      globalAxios({
        method: 'GET',
        url: '_users/org.couchdb.user:' + state.user,
        withCredentials: true
      }).then(res => {
        // eslint-disable-next-line no-console
        console.log('getOtherUserData called for user = ' + state.user)
        state.email = res.data.email
        state.databases = res.data.databases
        state.currentDb = res.data.currentDb
				// eslint-disable-next-line no-console
				console.log('getOtherUserData: database ' + state.currentDb + ' is set for user ' + state.user)
        dispatch('getConfig')
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.log('getOtherUserData error= ', error)
      })
    },

    login({commit, dispatch, state}, authData) {
      globalAxios({
        method: 'POST',
        url: '/_session',
        withCredentials: true,
        data: {
          name: authData.name,
          password: authData.password
        }
      }).then (res => {
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
          })}
        })
        // eslint-disable-next-line no-console
        .catch(error => console.log(error))
      },


      logout ({commit}) {
        commit('clearAuthData')
        router.replace('/')
      }
    },

    modules: {
      setup
    }

  })
