import globalAxios from 'axios'

const DATABASELEVEL = 1
const ERROR = 2
const BACKUPSONLY = 1
const ALLBUTSYSTEM = 2
const ALLBUTSYSTEMANDBACKUPS = 3

const dbPermissions = {
  "admins": {
    "names": [],
    "roles": ["admin"]
  },
  "members": {
    "names": [],
    "roles": ["areaPO", "superPO", "PO", "developer", "guest"]
  }
}

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
      dispatch('doLog', {
        event: msg,
        level: ERROR
      })
    })
  },

  createDatabase({
    rootState,
    dispatch
  }, payload) {
    rootState.backendSuccess = false
    rootState.backendMessages = []
    // eslint-disable-next-line no-console
    console.log('create database ' + payload.dbName)
    globalAxios({
      method: 'PUT',
      url: payload.dbName,
      withCredentials: true,
    }).then(() => {
      dispatch('setDatabasePermissions', payload)
      if (payload.doSetUsersDatabasePermissions) {
        // also makes this user admin
        dispatch('setUsersDatabasePermissions', rootState.userData.user)
      }
    }).catch(error => {
      rootState.backendMessages.push('createDatabase: failed. ' + error)
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
    }).catch(error => {
      rootState.backendMessages.push('setUsersDatabasePermissions: Could not set users database permissions, ' + error)
    })
  },

  setDatabasePermissions({
		rootState,
		dispatch
	}, payload) {
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('Start executing setDatabasePermissions for ' + payload.dbName)
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_security',
			withCredentials: true,
			data: dbPermissions
		}).then(() => {
      rootState.backendSuccess = true
      rootState.backendMessages.push('setDatabasePermissions: Success, database permissions for ' + payload.dbName + ' are set')
			if (payload.createRootDoc) dispatch('createRoot', payload)
		}).catch(error => {
      rootState.backendSuccess = false
			rootState.backendMessages.push('setDatabasePermissions: Could not set database permissions, ' + error)
		})
	},

	createRoot({
		rootState
	}, payload) {
    // create root document
    const rootDoc = {
      "_id": "root",
      "shortId": "root",
      "type": "backlogItem",
      "level": DATABASELEVEL,
      "title": "The root of all products in this database",
      "followers": [],
      "description": window.btoa("<p>Database root document</p>"),
      "acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
      "priority": 0,
      "attachments": [],
      "comments": [],
      "history": [{
        "createEvent": [DATABASELEVEL, payload.dbName],
        "by": rootState.userData.user,
        "email": payload.email,
        "timestamp": Date.now(),
        "timestampStr": new Date().toString(),
        "sessionId": rootState.userData.sessionId,
        "distributeEvent": false
      }],
      "delmark": false
    }
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/root',
			withCredentials: true,
			data: rootDoc
		}).then(() => {
			rootState.backendSuccess = true
			rootState.backendMessages.push('New database ' + payload.dbName + ' and root document are created')
		}).catch(error => {
      rootState.backendSuccess = false
			rootState.backendMessages.push('createRoot: Could not create the root document, ' + error)
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
    }).then(res => {
      state.backupBusy = false
      rootState.backendMessages.push('copyDB: success, ' + payload.dbSourceName + ' is copied to ' + payload.dbTargetName)
      // eslint-disable-next-line no-console
      console.log(res)
      dispatch('setDatabasePermissions', {
        dbName: payload.dbTargetName
      })
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      rootState.backendMessages.push('copyDB: failure, ' + payload.dbSourceName + ' is NOT copied to ' + payload.dbTargetName +', ' + error)
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
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},
}

export default {
  state,
  actions
}
