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
        "roles": payload.role.split(',').map(Function.prototype.call, String.prototype.trim),
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
        state.comment = 'New database is created. Note that subsequent actions will be performed on this database'
      }
      // eslint-disable-next-line no-console
      console.log(res)
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log(error)
      state.message = error.response.data
      state.errorMessage = error.message
    })
  },

  chooseOrCreateDB({state, dispatch}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload,
      withCredentials: true,
    }).then(res => {
      if (res.status == 200) {
        localStorage.setItem('dbName', payload)
        state.comment = 'The database exists already. Note that subsequent actions will be performed on this database'
      }
    }).catch(error => {
      dispatch("createDB", payload)
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

  assignUser({dispatch}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'GET',
      url: payload.dbName + '/_security',
      withCredentials: true,
    }).then(res => {
      var newPermissions = res.data
      // If no permissions are set CouchDB returns an empty object
      // Also only the admins or members can be set
      if (!newPermissions.hasOwnProperty('admins'))  {
        newPermissions['admins'] = { "names": [], "roles": [] }
      }
      if (!newPermissions.hasOwnProperty('members'))  {
        newPermissions['members'] = { "names": [], "roles": [] }
      }
      //prevent adding empty string when user field was left empty
      if (payload.memberNames.length > 0) {
        // assign to                 = the original                  +   members of array of strings splitted by the comma and trimmed from spaces
        newPermissions.members.names = newPermissions.members.names.concat(payload.memberNames.split(',').map(Function.prototype.call, String.prototype.trim))
      }
      if (payload.memberRoles.length > 0) {
        newPermissions.members.roles = newPermissions.members.roles.concat(payload.memberRoles.split(',').map(Function.prototype.call, String.prototype.trim))
      }
      //prevent adding empty string when user field was left empty
      if (payload.adminNames.length > 0) {
        newPermissions.admins.names = newPermissions.admins.names.concat(payload.adminNames.split(',').map(Function.prototype.call, String.prototype.trim))
      }
      if (payload.adminRoles.length > 0) {
        newPermissions.admins.roles = newPermissions.admins.roles.concat(payload.adminRoles.split(',').map(Function.prototype.call, String.prototype.trim))
      }

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

  initializeDB({state}, payload) {
    this.commit('clearAll')
    globalAxios({
      method: 'POST',
      url: payload.dbName + '/_bulk_docs',
      withCredentials: true,
      data: initData
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

const initUsers = {"data": [
  {
    //https://127.0.0.1:6984/_users/org.couchdb.user:Jan
    "name": "Jan",
    "password": "Jan",
    "roles": ["admin","superPO"],
    "type": "user",
    "email": "jan@mycompany.nl"
  },
  {
    "name": "Herman",
    "password": "Herman",
    "roles": ["admin","PO"],
    "type": "user",
    "email": "herman@mycompany.nl"
  },
  {
    "name": "Piet",
    "password": "Piet",
    "roles": ["developer"],
    "type": "user",
    "email": "piet@mycompany.nl"
  },
  {
    "name": "Mechteld",
    "password": "Mechteld",
    "roles": ["developer"],
    "type": "developer",
    "email": "mechteld@mycompany.nl"
  },
  {
    "name": "Henk",
    "password": "Henk",
    "roles": ["viewer"],
    "type": "user",
    "email": ""
  },
  {
    "name": "guest",
    "password": "guest",
    "roles": ["guest"],
    "type": "user",
    "email": ""
  }
]}

const initSecurity = {"data":
  {
    "admins": {
      "names": ["Jan","Herman"],
      "roles": ["superPO", "admin"]
    },
    "members": {
      "names": ["Piet","Mechteld","Henk"],
      "roles": ["PO","viewer"]
    }
  }
}

const initData = {"docs": [
  {
    "_id": "config-v1",
    "type": "config",
    "followers": [],
    "history": [
      {
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "status": [
          "New",
          "Ready",
          "In progress",
          "On hold",
          "Done",
          "Removed"
        ],
        "statusDefinition": [
          "The status New means that the item is created but not yet Ready for realization in a sprint. Further refinement is needed",
          "The status Ready means that the item is understood well enough by the team for realization in a sprint",
          "The status 'In progress' means that the item is worked on in a (past) sprint",
          "The status 'On hold' means that work at the item has stopped and will be resumed later or cancelled and Removed from the backlog",
          "The status Done means that the item is ready for deployment and meets all criteria set by the definition of done",
          "The status Removed means that work on the item will never start or was cancelled"
        ],
        "pbi-type": [
          "User story",
          "Spike",
          "Defect"
        ],
        "pbi-typeDefinition": [
          "The product backog item of type 'User story' is the regular type as described in the Scrum guide",
          "The product backog item of type Spike is an effort, limited in a set number of hours, to do an investigation. The purpose of that investigation is to be able to understand and estimate future work better",
          "The product backog item of type Defect is an effort to fix a breach with the functional or non-functional acceptance criteria. The defect was undetected in the sprint test suites or could not be fixed before the sprint end"
        ]
      }
    ]
  },

  {
    "_id": "product-template-v1",
    "type": "product",
    "followers": [],
    "history": [
      {
        "users":[],
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "description": "Describe your business case here...",
        "acceptanceCriteria": "Please don't forget",
        "state": 0,
        "priority": "TBD",
        "size": null,
        "comments": []
      }
    ]
  },

  {
    "_id": "requirements-area-template-v1",
    "type": "requirementsArea",
    "followers": [],
    "history": [
      {
        "users":[],
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "description": "Describe your requirements area here...",
        "acceptanceCriteria": "Please don't forget",
        "state": 0,
        "priority": "TBD",
        "size": null,
        "comments": []
      }
    ]
  },

  {
    "_id": "epic-template-v1",
    "followers": [],
    "history": [
      {
        "type": "epic",
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "product": "product-template-v1",
        "description": "Describe your business case here...",
        "acceptanceCriteria": "Please don't forget",
        "state": 0,
        "priority": "TBD",
        "size": null,
        "comments": []
      }
    ]
  },

  {
    "_id": "feature-template-v1",
    "followers": [],
    "history": [
      {
        "type": "feature",
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "product": "product-template-v1",
        "requirementsArea": "requirements-area-v1",
        "epic": "epic-template-v1",
        "description": "As <my role> I want ... so that I can ...",
        "acceptanceCriteria": "Please don't forget",
        "state": 0,
        "priority": "TBD",
        "size": null,
        "comments": []
      }
    ]
  },

  {
    "_id": "product-backlog-item-template-v1",
    "followers": [],
    "history": [
      {
        "type": "pbi",
        "changedBy": "Jan",
        "changeDate": 1546005201189,
        "product": "product-template-v1",
        "epic": "epic-template-v1",
        "feature": "feature-template-v1",
        "subtype": 0,
        "description": "As <my role> I want ... so that I can ...",
        "acceptanceCriteria": "Please don't forget",
        "state": 0,
        "priority": "TBD",
        "size": null,
        "comments": []
      }
    ]
  }
]}

export default {
  state,
  getters,
  mutations,
  actions
}
