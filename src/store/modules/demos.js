import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'

const state = {
  message: '',
  comment: '',
  errorMessage: ''
}

const getters = {
  returnMessage (state) {
    return state.message
  },
  returnComment (state) {
    return state.comment
  },
  returnErrorMsg (state) {
    return state.errorMessage
  }
}

const mutations = {
  clearAll: state => {
    state.message = ''
    state.comment = ''
    state.errorMessage = ''
  },
}

const actions = {
  showCreds({state}) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: '/_session',
      withCredentials: true
    }).then(res => {
      // eslint-disable-next-line no-console
      console.log(res)
      state.message = res.data
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  updateUser({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'PUT',
      url: '/_users/org.couchdb.user:' + this.state.user,
      withCredentials: true,
      data: payload.userData
    }).then(res => {
      // eslint-disable-next-line no-console
      console.log(res)
      state.message = res.data
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  changePW({dispatch, state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + this.state.user,
      withCredentials: true
    }).then(res => {
      // eslint-disable-next-line no-console
      console.log(res)
      var newUserData = res.data
      newUserData["password"] = payload.newPW
      payload.userData = newUserData
      dispatch("updateUser", payload)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
      state.comment = "As a 'superadmin' you cannot change your password here. Use Fauxton instead"
    })
  },

  createUser({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'PUT',
      url: '_users/org.couchdb.user:' + payload.name,
      withCredentials: true,
      data: {
        "name": payload.name,
        "password": payload.name,
        "roles": [payload.role],
        "type": "user"
      }
    }).then(res => {
      state.message = res.data
      state.comment = 'Note that the password is made identical to the user name'
      // eslint-disable-next-line no-console
      console.log(res)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  createDB({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'PUT',
      url: payload,
      withCredentials: true,
    }).then(res => {
      state.message = res.data
      if (res.status == 201) {
        localStorage.setItem('dbName', payload)
        state.comment = 'Note that subsequent actions will be performed on this database'
      }
      // eslint-disable-next-line no-console
      console.log(res)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  replacePermissions({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'PUT',
      url: payload.dbName + '/_security',
      withCredentials: true,
      data: payload.permissions
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  assignUser({dispatch, state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_security',
      withCredentials: true,
    }).then(res => {
      var newPermissions = res.data
      //if no permissions are set CouchDB returns an empty object
      if (Object.keys(newPermissions).length === 0) {
        newPermissions = {
           "members": { "names": [], "roles": [] }
        }
      }
      newPermissions.members.names.push(payload.name)
      newPermissions.members.roles.push(payload.role)
      payload.permissions = newPermissions
      dispatch("replacePermissions", payload)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
    })
  },

  showDBsec({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_security',
      withCredentials: true,
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res.data)
      //if no permissions are set CouchDB returns an empty object
      if (Object.keys(res.data).length === 0) {
        state.message = "If no permissions are set CouchDB returns an empty object"
      }
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  createDoc({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'PUT',
      url: payload.dbName + '/' + payload.docName,
      withCredentials: true,
      data: {
        description: "A newly created dodument created in database " + payload.dbName,
        [payload.fieldName]: payload.fieldValue,
        creationDate: new Date().toISOString()
      }
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  showAllDocs({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_all_docs',
      withCredentials: true,
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res.data)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  showDoc({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/' + payload.id,
      withCredentials: true,
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res.data)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  delDB({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'DELETE',
      url: payload.dbName,
      withCredentials: true,
    }).then(res => {
      state.message = res.data
      // eslint-disable-next-line no-console
      console.log(res.data)
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },
}

export default {
  state,
  getters,
  mutations,
  actions
}
