import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const INFO = 0
const ERROR = 2

const state = {
  fetchedUserData: null,
  userIsAdmin: false,
  dbProducts: [],
  allUsers: []
}

const actions = {
  getUser({
    rootState,
    state,
    dispatch
  }, userName) {
    rootState.backendMessages = []
    rootState.isUserFound = false
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + userName,
    }).then(res => {
      state.fetchedUserData = res.data
      state.userIsAdmin = state.fetchedUserData.roles.includes('admin') ? true : false
      rootState.userDatabaseOptions = Object.keys(state.fetchedUserData.myDatabases)
      // preset with the current database of the user
      rootState.selectedDatabaseName = state.fetchedUserData.currentDb
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Successfully fetched user ' + userName })
      rootState.isUserFound = true
    }).catch(error => {
      let msg = 'getUser: Could not find user "' + userName + '". ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Only admins have the access rights to this call */
  getAllUsers({
    rootState,
    state,
    dispatch
  }) {
    rootState.backendMessages = []
    rootState.isUserFound = false
    state.allUsers = []
    globalAxios({
      method: 'GET',
      url: '_users/_design/_auth/_view/list-all',
    }).then(res => {
      const rows = res.data.rows
      if (rows.length > 0) {
        for (let u of rows) {
          const colonIdx = u.id.indexOf(':')
          if (colonIdx > 0) {
            const name = u.id.substring(colonIdx + 1)
            const userRec = {
              name,
              currentDb: u.value[0],
              team: u.value[1]
            }
            state.allUsers.push(userRec)
          }
        }
      }
      // populate the userOptions array
      rootState.userOptions = []
      for (let u of state.allUsers) {
        rootState.userOptions.push(u.name)
      }
    }).catch(error => {
      let msg = 'getAllUsers: Could not read the _users database:' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /*
  * Get all products of a database and if createNewUser === true set the assigned roles
  * By default all users are guest of all products
  */
  getDbProducts({
    rootState,
    state,
    dispatch
  }, payload) {
    rootState.areProductsFound = false
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_design/design1/_view/products',
    }).then(res => {
      rootState.areProductsFound = true
      state.dbProducts = res.data.rows
      // add a roles array to each product
      for (let prod of state.dbProducts) {
        if (!payload.createNewUser) {
          const userProductsRoles = state.fetchedUserData.myDatabases[payload.dbName].productsRoles
          const userProductIds = Object.keys(userProductsRoles)
          // extend each product with the currently assigned users roles, guest is the default
          if (userProductIds.includes(prod.id)) {
            prod.roles = userProductsRoles.length === 0 ? ['guest'] : userProductsRoles[prod.id]
          } else prod.roles = []
        } else prod.roles = ['guest']
      }

    }).catch(error => {
      let msg = 'getDbProducts: Could not find products of database ' + payload.dbName + '. Error = ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  saveMyFilterSettings({
    rootState,
    dispatch
  }, newFilterSettings) {
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
    }).then(res => {
      let tmpUserData = res.data
      rootState.userData.myFilterSettings = newFilterSettings
      tmpUserData.myDatabases[rootState.userData.currentDb].filterSettings = newFilterSettings
      dispatch('updateUser', { data: tmpUserData })
    }).catch(error => {
      let msg = 'saveMyFilterSettings: User ' + rootState.userData.user + ' cannot save the product filter settings. Error = ' + error
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  changeTeam({
    rootState,
    commit,
    dispatch
  }, newTeam) {
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
    }).then(res => {
      // update the user data, the planningBoard.vue listens to this change and will repaint if in view
      commit('updateTeam', newTeam)
      let tmpUserData = res.data
      const oldTeam = tmpUserData.myDatabases[res.data.currentDb].myTeam
      tmpUserData.myDatabases[res.data.currentDb].myTeam = newTeam
      dispatch('updateUser', { data: tmpUserData })
      // update the team membership
      dispatch('updateTeamsInDb', { dbName: rootState.userData.currentDb, userName: rootState.userData.user, oldTeam, newTeam })
      let msg = 'changeTeam: User ' + rootState.userData.user + ' changed to team ' + newTeam
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: INFO })
    }).catch(error => {
      let msg = 'changeTeam: Could not change team for user ' + rootState.userData.user + '. Error = ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  changePassword({
    rootState,
    dispatch
  }, newPassword) {
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
    }).then(res => {
      rootState.userData.password = newPassword
      let tmpUserData = res.data
      tmpUserData["password"] = newPassword
      dispatch('updateUser', { data: tmpUserData })
    }).catch(error => {
      let msg = 'changePW: Could not change password for user ' + rootState.userData.user + '. Error = ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  addProductToUser({
    rootState,
    dispatch
  }, payload) {
    // copy all roles except 'admin' which is a generic roles
    function copyRoles(roles) {
      // by default is the user guest
      let copiedRoles = ['guest']
      for (let r of roles) {
        if (r !== 'admin') copiedRoles.push(r)
      }
      return copiedRoles
    }
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
    }).then(res => {
      rootState.isDatabaseInitiated = true
      rootState.isDatabaseCreated = true
      rootState.isProductCreated = true
      let tmpUserData = res.data
      if (Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
        tmpUserData.myDatabases[payload.dbName].subscriptions.push(payload.productId)
        if (payload.userRoles[0] === '*') {
          // add all user roles to the new product
          tmpUserData.myDatabases[payload.dbName].productsRoles[payload.productId] = copyRoles(tmpUserData.roles)
        } else tmpUserData.myDatabases[payload.dbName].productsRoles[payload.productId] = payload.userRoles
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
      dispatch('updateUser', { data: tmpUserData })
      rootState.backendMessages.push({
        seqKey: rootState.seqKey++,
        msg: 'addProductToUser: The product with Id ' + payload.productId + ' is added to your profile with roles ' + tmpUserData.roles
      })
    }).catch(error => {
      let msg = 'addProductToUser: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
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
    }).then(res => {
      const tmpUserData = res.data
      tmpUserData.myDatabases[rootState.userData.currentDb].subscriptions = newSubscriptions
      dispatch('updateUser', { data: tmpUserData })
    }).catch(error => {
      const msg = 'updateSubscriptions: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  changeCurrentDb({
    rootState,
    dispatch
  }, dbName) {
    globalAxios({
      method: 'GET',
      url: dbName + '/_design/design1/_view/products',
    }).then(res => {
      const currentProductsEnvelope = res.data.rows
      const availableProductIds = []
      for (let product of currentProductsEnvelope) {
        let id = product.id
        availableProductIds.push(id)
      }
      dispatch('changeDbInProfile', { dbName, productIds: availableProductIds })
    }).catch(error => {
      let msg = 'changeCurrentDb: Could not find products in database ' + rootState.userData.currentDb + '. Error = ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
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
  changeDbInProfile({
    rootState,
    dispatch
  }, payload) {
    rootState.isCurrentDbChanged = false
    rootState.backendMessages = []
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
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
      dispatch('updateUser', {
        data: tmpUserData,
        onSuccessCallback: function () {
          rootState.isCurrentDbChanged = true
          const msg = "changeDbInProfile: The default database of user '" + rootState.userData.user + "' is changed to " + payload.dbName
          rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
        }
      }).catch(error => {
        const msg = 'changeDbInProfile: Could not update the default database for user ' + rootState.userData.user + ', ' + error
        rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
        dispatch('doLog', { event: msg, level: ERROR })
      })
    })
  },

  registerNoSprintImport({
    rootState,
    dispatch
  }, sprintId) {
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + rootState.userData.user,
    }).then(res => {
      const tmpUserData = res.data
      if (tmpUserData.doNotAskForImport) {
        tmpUserData.doNotAskForImport.push(sprintId)
      } else tmpUserData.doNotAskForImport = [sprintId]
      // update the current user data
      rootState.userData.doNotAskForImport = tmpUserData.doNotAskForImport
      dispatch('updateUser', { data: tmpUserData })
    }).catch(error => {
      const msg = 'registerNoSprintImport: Could not update do not ask for import for user ' + rootState.userData.user + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  updateUser({
    rootState,
    dispatch
  }, payload) {
    rootState.isUserUpdated = false
    globalAxios({
      method: 'PUT',
      url: '/_users/org.couchdb.user:' + payload.data.name,
      data: payload.data
    }).then(() => {
      rootState.isUserUpdated = true
      // execute passed callback if provided
      if (payload.onSuccessCallback !== undefined) {
        const nrOfParameters = payload.onSuccessCallback.length
        if (nrOfParameters === 0) payload.onSuccessCallback()
        if (nrOfParameters === 1) payload.onSuccessCallback(payload.updatedDoc)
      }
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: "updateUser: The profile of user '" + payload.data.name + "' is updated successfully" })
    }).catch(error => {
      // execute passed callback if provided
      if (payload.onFailureCallback !== undefined) {
        const nrOfParameters = payload.onFailureCallback.length
        if (nrOfParameters === 0) payload.onFailureCallback()
        if (nrOfParameters === 1) payload.onFailureCallback(payload.updatedDoc)
      }
      let msg = "updateUser: Could not update the profile of user '" + payload.data.name + "', " + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Create user if not existent already */
  createUserIfNotExistent({
    rootState,
    dispatch
  }, userData) {
    rootState.backendMessages = []
    globalAxios({
      method: 'GET',
      url: '/_users/org.couchdb.user:' + userData.name,
    }).then(() => {
      let msg = 'createUserIfNotExistent: Cannot create user "' + userData.name + '" that already exists'
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    }).catch(error => {
      if (error.message.includes("404")) {
        dispatch('createUserAsync', userData)
      } else {
        let msg = 'createUserIfNotExistent: While checking if user "' + userData.name + '" exists an error occurred, ' + error
        rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log(msg)
        dispatch('doLog', { event: msg, level: ERROR })
      }
    })
  },

  createUserAsync({
    rootState,
    dispatch
  }, userData) {
    rootState.isUserCreated = false
    rootState.backendMessages = []
    globalAxios({
      method: 'PUT',
      url: '/_users/org.couchdb.user:' + userData.name,
      data: userData
    }).then(() => {
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createUser: Successfully created user ' + userData.name })
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log('createUserAsync: user "' + userData.name + '" is created')
      rootState.isUserCreated = true
    }).catch(error => {
      let msg = 'createUserAsync: Could not create user "' + userData.name + '", ' + error
      rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
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
