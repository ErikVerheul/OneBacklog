import globalAxios from 'axios'

const ERROR = 2
const BACKUPSONLY = 1
const ALLBUTSYSTEM = 2
const ALLBUTSYSTEMANDBACKUPS = 3

const state = {
  backupBusy: false
}

const actions = {
  /* Get all database names */
  getAllDatabases({
    rootState,
    dispatch
  }, selected) {
    rootState.backendMessages = []
    rootState.backendSuccess = false
    globalAxios({
      method: 'GET',
      url: '/_all_dbs',
      withCredentials: true
    }).then(res => {
      rootState.backendSuccess = true
      rootState.databaseOptions = []
      switch (selected) {
        case BACKUPSONLY:
          for (let dbName of res.data) {
            if (dbName.includes('-backup-')) rootState.databaseOptions.push(dbName)
          }
          break
        case ALLBUTSYSTEM:
          for (let dbName of res.data) {
            if (!dbName.startsWith('_')) rootState.databaseOptions.push(dbName)
          }
          break
        case ALLBUTSYSTEMANDBACKUPS:
          for (let dbName of res.data) {
            if (!dbName.startsWith('_') && !dbName.includes('backup')) rootState.databaseOptions.push(dbName)
          }
          // preset with the current database or else the first entry
          if (rootState.databaseOptions.includes(rootState.userData.currentDb)) {
            rootState.selectedDatabaseName = rootState.userData.currentDb
          } else rootState.selectedDatabaseName = rootState.databaseOptions[0]
      }
    }).catch(error => {
      let msg = 'getAllDatabases: Could not load all database names. Error = ' + error
      rootState.backendMessages.push(msg)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  setUsersDatabasePermissions({
    rootState
  }, user) {
    const userDbPermissions = {
      "admins": {
        "names": [user],
        "roles": ["admin"]
      },
      "members": {
        "names": [],
        "roles": ["areaPO", "superPO", "PO", "developer", "guest"]
      }
    }
    // eslint-disable-next-line no-console
    if (rootState.debug) console.log('Start executing setUsersDatabasePermissions')
    globalAxios({
      method: 'PUT',
      url: '/_users/_security',
      withCredentials: true,
      data: userDbPermissions
    }).then(() => {
      rootState.backendSuccess = true
      rootState.backendMessages.push('setUsersDatabasePermissions: Success, system permissions for _users database are set')
    }).catch(error => {
      rootState.backendMessages.push('setUsersDatabasePermissions: Could not set users database permissions, ' + error)
    })
  },

  copyDB({
    rootState,
    state,
    dispatch
  }, payload) {
    rootState.backendSuccess = false
    rootState.backendMessages = []
    const copyData = {
      "create_target": true,
      "source": payload.dbSourceName,
      "target": payload.dbTargetName
    }
    state.backupBusy = true
    // eslint-disable-next-line no-console
    console.log('Copy DB: from ' + payload.dbSourceName + ' to ' + payload.dbTargetName)
    globalAxios({
      method: 'POST',
      url: "_replicate",
      withCredentials: true,
      data: copyData
    }).then(() => {
      state.backupBusy = false
      rootState.backendMessages.push('copyDB: Success, ' + payload.dbSourceName + ' is copied to ' + payload.dbTargetName)
      dispatch('setDatabasePermissions', {
        dbName: payload.dbTargetName
      })
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      rootState.backendMessages.push('copyDB: Failure, ' + payload.dbSourceName + ' is NOT copied to ' + payload.dbTargetName + ', ' + error)
    })
  },

  overwriteDB({
    rootState,
    dispatch
  }, payload) {
    rootState.backendSuccess = false
    rootState.backendMessages = []
    globalAxios({
      method: 'DELETE',
      url: payload.dbTargetName,
      withCredentials: true,
    }).then(() => {
      rootState.backendSuccess = true
      rootState.backendMessages.push('Database ' + payload.dbTargetName + ' has been deleted')
      dispatch('copyDB', payload)
    }).catch(error => {
      if (error.response.status === 404) {
        // database does not exist
        dispatch('copyDB', payload)
      } else rootState.backendMessages.push('Deletion of database ' + payload.dbTargetName + ' gave unexpected error, ' + error + '. Operation aborted.')
    })
  },

  collectRemoved({
    rootState,
    dispatch
  }, dbName) {
    globalAxios({
      method: 'GET',
      url: dbName + '/_design/design1/_view/removed',
      withCredentials: true
    }).then(res => {
      const removed = res.data.rows
      // console.log('collectRemoved: removed = ' + JSON.stringify(removed, null, 2))
      const data = []
      for (let r of removed) {
        data.push({ [r.id]: [r.key] })
      }
      rootState.isPurgeReady = false
      rootState.backendSuccess = false
      rootState.backendMessages = []
      dispatch('purgeDb', { dbName, data, idx: 0, number: removed.length })
      rootState.backendMessages.push('Purge started ' + removed.length + ' documents will be deleted. Please wait ...')
    }).catch(error => {
      rootState.backendMessages.push('Could not find any removed documents in database ' + dbName + '. Error = ' + error)
    })
  },

  purgeDb({
    rootState,
    dispatch
  }, payload) {
    if (payload.idx >= payload.number) {
      rootState.backendMessages.push(payload.number + ' removed documents in database ' + payload.dbName + ' have been purged, start compacting')
      dispatch('compactDb', payload)
      return
    }
    globalAxios({
      method: 'POST',
      url: payload.dbName + '/_purge',
      data: payload.data[payload.idx],
      withCredentials: true,
    }).then(() => {
      // recurse
      payload.idx++
      dispatch('purgeDb', payload)
    }).catch(error => {
      rootState.backendMessages.push('Purge of documents in database ' + payload.dbName + ' failed at index ' + payload.idx + ', ' + error)
    })
  },

  /* Must add an (empty) data field to avoid the Content-Type to be removed by the browser */
  compactDb({
    rootState
  }, payload) {
    globalAxios({
      method: 'POST',
      url: payload.dbName + '/_compact',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {},
      withCredentials: true,
    }).then(() => {
      rootState.backendSuccess = true
      rootState.isPurgeReady = true
      rootState.backendMessages.push('Compacting the database ' + payload.dbName + ' succeeded')
    }).catch(error => {
      rootState.backendMessages.push('Compacting the database ' + payload.dbName + ' failed, ' + error)
    })
  },

  deleteDb({
    rootState
  }, dbName) {
    rootState.backendSuccess = false
    rootState.backendMessages = []
    globalAxios({
      method: 'DELETE',
      url: dbName,
      withCredentials: true,
    }).then(() => {
      rootState.backendSuccess = true
      rootState.backendMessages.push('Database ' + dbName + ' has been deleted')
    }).catch(error => {
      rootState.backendMessages.push('Database ' + dbName + ' coud not be deleted,' + error)
    })
  },

  getTeamNames({
    rootState,
    dispatch
  }, dbName) {
    rootState.backendSuccess = false
    rootState.backendMessages = []
    rootState.fetchedTeams = []
    globalAxios({
      method: 'GET',
      url: dbName + '/config',
      withCredentials: true,
    }).then(res => {
      rootState.backendSuccess = true
      if (res.data.teams) rootState.fetchedTeams = res.data.teams
      rootState.backendMessages.push('getTeamNames: success, ' + rootState.fetchedTeams.length + ' team names are read')
    }).catch(error => {
      let msg = 'getTeamNames: Could not read config document of database ' + dbName + ', ' + error
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
