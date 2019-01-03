import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router' //Here ../router/index is imported
import demos from './modules/demos'

Vue.use(Vuex)

export default new Vuex.Store({

  state: {
    user: null,
    roles: [],
    // These are the known roles:
    //   '_admin': the default CouchDB administrator allowing all tasks for all databases
    //   'admin': allow administrator tasks for all products in this database only
    //   'superPo': allow all PO tasks for all products in this database only
    //   'po': allow PO tasks for this product
    //   'developer': allow developer tasks for this product only
    //   'viewer': allow read-only view for this product only
    //   'guest': no password required, can only read a text on how to become a user
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
    },
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
