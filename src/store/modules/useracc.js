import globalAxios from 'axios'
const INFO = 0
const ERROR = 2

const state = {
  fetchedUserData: null,
  userIsAdmin: 'no',
  userIsSuperPO: 'no',
  dbProducts: undefined,
}

const actions = {
  getUser({
    rootState,
    state,
    dispatch
  }, userName) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + userName,
      withCredentials: true
    }).then(res => {
      state.fetchedUserData = res.data
      state.userIsAdmin = state.fetchedUserData.roles.includes('admin') ? 'yes' : 'no'
      state.userIsSuperPO = state.fetchedUserData.roles.includes('superPO') ? 'yes' : 'no'
      rootState.databaseOptions = Object.keys(state.fetchedUserData.myDatabases)
      // preset with the current database of the user
      rootState.selectedDatabaseName = state.fetchedUserData.currentDb
      rootState.backendMessages.push('Successfully fetched user ' + userName)
    }).catch(error => {
      let msg = 'getUser: Could not find user "' + userName + '". ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Get al products of a database and if presetExistingRoles === true set the assigned roles*/
  getDbProducts({
    rootState,
    state,
    dispatch
  }, payload) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_design/design1/_view/products',
      withCredentials: true
    }).then(res => {
      rootState.backendSuccess = true
      state.dbProducts = res.data.rows
      // add a roles array to each product
      for (let prod of state.dbProducts) {
        if (payload.presetExistingRoles) {
          const userProductsRoles = state.fetchedUserData.myDatabases[payload.dbName].productsRoles
          const userProductIds = Object.keys(userProductsRoles)
          // extend each product with the currently assigned users roles
          if (userProductIds.includes(prod.id)) {
            prod.roles = userProductsRoles[prod.id] || []
          } else prod.roles = []
        } else prod.roles = []
      }
    }).catch(error => {
      let msg = 'getDbProducts: Could not find products of database ' + payload.dbName + '. Error = ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  saveMyProductViewFilterSettings({
    rootState,
    dispatch
  }) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      let tmpUserData = res.data
      tmpUserData.myProductViewFilterSettings = rootState.userData.myProductViewFilterSettings
      dispatch("updateUser", tmpUserData)
      let msg = 'saveProductViewFilters: User ' + rootState.userData.user + ' saved the productview filter settings'
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: INFO })
    }).catch(error => {
      let msg = 'saveProductViewFilters: User ' + rootState.userData.user + ' cannot save the productview filter settings. Error = ' + error
      rootState.backendMessages.push(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },
  changeTeam({
    rootState,
    dispatch
  }, newTeam) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      rootState.userData.myTeam = newTeam
      let tmpUserData = res.data
      tmpUserData.myDatabases[res.data.currentDb].myTeam = newTeam
      dispatch("updateUser", tmpUserData)
      let msg = 'changeTeam: User ' + rootState.userData.user + ' changed to team ' + newTeam
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: INFO })
    }).catch(error => {
      let msg = 'changeTeam: Could not change team for user ' + rootState.userData.user + '. Error = ' + error
      rootState.backendMessages.push(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },
  changePassword({
    rootState,
    dispatch
  }, newPassword) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      rootState.backendSuccess = true
      rootState.userData.password = newPassword
      let tmpUserData = res.data
      tmpUserData["password"] = newPassword
      dispatch("updateUser", tmpUserData)
    }).catch(error => {
      let msg = 'changePW: Could not change password for user ' + rootState.userData.user + '. Error = ' + error
      rootState.backendMessages.push(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  addProductToUser({
    rootState,
    dispatch
  }, payload) {
    // copy all roles except 'admin' and 'superPO' which are a generic roles
    function copyRoles(roles) {
      let copiedRoles = []
      for (let r of roles) {
        if (r !== 'admin' && r !== 'superPO') copiedRoles.push(r)
      }
      return copiedRoles
    }
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      rootState.backendSuccess = true
      let tmpUserData = res.data
      if (Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
        tmpUserData.myDatabases[payload.dbName].subscriptions.push(payload.productId)
        // add all user roles to the new product
        tmpUserData.myDatabases[payload.dbName].productsRoles[payload.productId] = copyRoles(tmpUserData.roles)
      } else {
        // add all user roles to the new product
        const newDb = {
          myteam: 'not assigned yet',
          subscriptions: [payload.productId],
          productsRoles: {
            [payload.productId]: copyRoles(tmpUserData.roles)
          }
        }
        tmpUserData.myDatabases[payload.dbName] = newDb
      }
      dispatch("updateUser", tmpUserData)
      rootState.backendMessages.push('The product with Id ' + payload.productId + ' is added to your profile with roles ' + tmpUserData.roles)
    }).catch(error => {
      let msg = 'addProductToUser: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  updateSubscriptions({
    rootState,
    dispatch
  }, newSubscriptions) {
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      let tmpUserData = res.data
      tmpUserData.myDatabases[res.data.currentDb].subscriptions = newSubscriptions
      dispatch("updateUser", tmpUserData)
    }).catch(error => {
      let msg = 'updateSubscriptions: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Get all products of the database in case they are needed to be registered for this user */
  changeCurrentDb1({
    rootState,
    dispatch
  }, dbName) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: dbName + '/_design/design1/_view/products',
      withCredentials: true
    }).then(res => {
      const ids = []
      for (let prod of res.data.rows) {
        ids.push(prod.id)
      }
      dispatch('changeCurrentDb2', { dbName: dbName, productIds: ids })
    }).catch(error => {
      let msg = 'changeCurrentDb1: Could not find the products of database ' + dbName + '. Error = ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /*
  * Change the current database to the new value +
  * If the user is not subscibed to this database, make the user 'guest' for all products in that database or
  * If the database is newly created and has no products, register the database without products
  */
  changeCurrentDb2({
    rootState,
    dispatch
  }, payload) {
    rootState.isCurrentDbChanged = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
      withCredentials: true
    }).then(res => {
      let tmpUserData = res.data
      const newDbEntry = {
        myTeam: 'not assigned yet',
        subscriptions: [],
        productsRoles: {}
      }
      tmpUserData.currentDb = payload.dbName
      if (!Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
        // the user is not subscribed to this database
        if (payload.productIds.length > 0) {
          // make the user 'guest' of all existing products
          for (let id of payload.productIds) {
            newDbEntry.subscriptions.push(id)
            newDbEntry.productsRoles[id] = ['guest']
          }
        }
        tmpUserData.myDatabases[payload.dbName] = newDbEntry
      }
      dispatch("updateUser", tmpUserData)
      rootState.isCurrentDbChanged = true
      const msg = "changeCurrentDb2: The default database of user '" + rootState.userData.user + "' is changed to " + payload.dbName
      rootState.backendMessages.push(msg)
      dispatch('doLog', { event: msg, level: INFO })
    }).catch(error => {
      const msg = 'changeCurrentDb2: Could not update the default database for user ' + rootState.userData.user + ', ' + error
      rootState.backendMessages.push(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  updateUser({
    rootState,
    dispatch
  }, newUserData) {
    rootState.userUpdated = false
    globalAxios({
      method: 'PUT',
      url: '/_users/org.couchdb.user:' + newUserData.name,
      withCredentials: true,
      data: newUserData
    }).then(() => {
      rootState.userUpdated = true
      rootState.backendMessages.push("updateUser: The profile of user '" + newUserData.name + "' is updated successfully")
    }).catch(error => {
      let msg = "updateUser: Could not update the profile of user '" + newUserData.name + "', " + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  createUser1({
    rootState,
    dispatch
  }, payload) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + payload.name,
      withCredentials: true
    }).then(res => {
      let msg = 'createUser1: Cannot create user "' + res.data.name + '" that already exists'
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    }).catch(error => {
      if (error.message.includes("404")) {
        dispatch('createUser2', payload)
      } else {
        let msg = 'createUser1: While checking if user "' + payload.user + '" exist an error occurred, ' + error
        rootState.backendMessages.push(msg)
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log(msg)
        dispatch('doLog', { event: msg, level: ERROR })
      }
    })
  },

  createUser2({
    rootState,
    dispatch
  }, payload) {
    globalAxios({
      method: 'PUT',
      url: '/_users/org.couchdb.user:' + payload.name,
      withCredentials: true,
      data: payload
    }).then(() => {
      rootState.backendSuccess = true
      rootState.backendMessages.push('Successfully created user ' + payload.name)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log('createUser2: user "' + payload.name + '" is created')
    }).catch(error => {
      let msg = 'createUser2: Could not create user "' + payload.user + '", ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

}

export default {
  state,
  actions
}
