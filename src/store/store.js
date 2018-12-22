import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router'
import demos from './modules/demos'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: null,
    roles: [],
    runningTimeout: null,
  },

  getters: {
    user (state) {
      return state.user
    },
    roles (state) {
      return state.roles
    },
    isSuperAdmin (state) {
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
      clearTimeout(state.runningTimeout)
    }
  },

  actions: {
    refreshCookie ({commit, dispatch, state}, payload) {
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
          console.log("refreshCookie is executed")
          //Recurse
          dispatch('refreshCookie', payload)
        })
        // eslint-disable-next-line no-console
        .catch(error => console.log(error))
      }, payload.afterSeconds * 1000)
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
          localStorage.setItem('user', res.data.name)
          commit('authUser', {
            user: res.data.name,
            roles: res.data.roles
          })
          commit('storeUser', res.data.name)
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
        localStorage.removeItem('user')
        router.replace('/')
      }
    },

    modules: {
      demos
    }

  })
