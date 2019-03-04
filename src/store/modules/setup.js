import globalAxios from 'axios'

const state = {
	message: '',
	comment: '',
	errorMessage: ''
}

const getters = {
	returnMessage(state) {
		return state.message
	},
	returnComment(state) {
		return state.comment
	},
	returnErrorMsg(state) {
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
	showCreds({
		state
	}) {
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

	updateUser({
		state
	}, payload) {
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

	changePW({
		dispatch,
		state
	}, payload) {
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
				state.comment = "As a 'server admin' you cannot change your password here. Use Fauxton instead"
			})
	},

	createUser({
		state
	}, payload) {
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

	createDB({
		state,
		rootState
	}, dbName) {
		this.commit('clearAll')
		globalAxios({
			method: 'PUT',
			url: dbName,
			withCredentials: true,
		}).then(res => {
			state.message = res.data
			if (res.status == 201) {
				rootState.currentDb = dbName
				state.comment = 'New database ' + dbName + ' is created. Note that subsequent actions will be performed on this database'
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

	chooseOrCreateDB({
		state,
		dispatch,
		rootState
	}, dbName) {
		this.commit('clearAll')
		globalAxios({
			method: 'GET',
			url: dbName,
			withCredentials: true,
		}).then(res => {
			if (res.status == 200) {
				rootState.currentDb = dbName
				state.comment = 'The database ' + dbName + ' exists already. Note that subsequent actions will be performed on this database'
			}
		}).catch(error => {
			if (error.response.status === 404) {
				dispatch("createDB", dbName)
			} else {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			}
		})
	},

	replacePermissions({
		state
	}, payload) {
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

	assignUser({
		dispatch
	}, payload) {
		this.commit('clearAll')
		globalAxios({
				method: 'GET',
				url: payload.dbName + '/_security',
				withCredentials: true,
			}).then(res => {
				var newPermissions = res.data
				// If no permissions are set CouchDB returns an empty object
				// Also only the admins or members can be set
				if (!newPermissions.hasOwnProperty('admins')) {
					newPermissions['admins'] = {
						"names": [],
						"roles": []
					}
				}
				if (!newPermissions.hasOwnProperty('members')) {
					newPermissions['members'] = {
						"names": [],
						"roles": []
					}
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

	showDBsec({
		state
	}, payload) {
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

	initializeDB({
		state
	}, payload) {
		this.commit('clearAll')
		// eslint-disable-next-line no-console
		console.log('Initialize DB: ' + payload.dbName)
		globalAxios({
				method: 'POST',
				url: payload.dbName + '/_bulk_docs',
				withCredentials: true,
				data: configData
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

	showAllDocs({
		state
	}, payload) {
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

	showDoc({
		state
	}, payload) {
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

	delDB({
		state
	}, payload) {
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

	createExampleDB({
		state
	}, payload) {
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

	createUsers({
		state
	}) {
		this.commit('clearAll')
		initUsers.data.forEach(function (el) {
			globalAxios({
					method: 'PUT',
					url: '_users/org.couchdb.user:' + el.name,
					withCredentials: true,
					data: el
				}).then(res => {
					state.message = res.data
					// eslint-disable-next-line no-console
					console.log(res)
				})
				.catch(error => {
					if (error.response.status === 409) {
						state.comment = state.comment + 'User ' + el.name + ' already exists, '
					} else {
						// eslint-disable-next-line no-console
						console.log(error)
						state.message = error.response.data
						state.errorMessage = error.message
					}
				})
		});
	},

	setUsersDbSecurity({
		state
	}) {
		globalAxios({
				method: 'PUT',
				url: '/_users/_security',
				withCredentials: true,
				data: initUsersDbSecurity
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

	setSecurity({
		state
	}, payload) {
		globalAxios({
				method: 'PUT',
				url: payload.dbName + '/_security',
				withCredentials: true,
				data: initSecurity
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
	}
}

const initUsers = {
	"data": [
		{
			"name": "Jan Klaassen",
			"password": "Jan",
			"roles": ["admin", "superPO"],
			"type": "user",
			"email": "jan@mycompany.nl",
			"databases": ['a', 'b'],
			"currentDb": 'a'
		},
		{
			"name": "Herman",
			"password": "Herman",
			"roles": ["admin", "PO"],
			"type": "user",
			"email": "herman@mycompany.nl",
			"databases": ['a', 'b'],
			"currentDb": 'a'
		},
		{
			"name": "Piet",
			"password": "Piet",
			"roles": ["developer"],
			"type": "user",
			"email": "piet@mycompany.nl",
			"databases": ['a', 'b'],
			"currentDb": 'a'
		},
		{
			"name": "Mechteld",
			"password": "Mechteld",
			"roles": ["developer"],
			"type": "user",
			"email": "mechteld@mycompany.nl",
			"databases": ['a', 'b'],
			"currentDb": 'a'
		},
		{
			"name": "Henk",
			"password": "Henk",
			"roles": ["viewer"],
			"type": "user",
			"email": "henk@mycompany.nl",
			"databases": ['a', 'b'],
			"currentDb": 'a'
		},
		{
			"name": "guest",
			"password": "guest",
			"roles": ["guest"],
			"type": "user",
			"email": "guest@mycompany.nl",
			"databases": ['a'],
			"currentDb": 'a'
		}]
}

const initUsersDbSecurity = {
	"admins": {
		"names": [],
		"roles": ["admin", 'superPO']
	},
	"members": {
		"names": [],
		"roles": ['PO', 'developer', 'viewer', 'guest']
	}
}

const initSecurity = {
	"admins": {
		"names": ["Jan", "Herman"],
		"roles": ["superPO", "admin"]
	},
	"members": {
		"names": ["Piet", "Mechteld", "Henk"],
		"roles": ["PO", "viewer"]
	}
}

const configData = {
	"docs": [
		{
			"_id": "config",
			"type": "config",
			"data": {
				"changedBy": "Erik",
				"changeDate": 1546005201189,

				"itemState": [
          "New",
          "Ready",
          "In progress",
          "On hold",
          "Done",
          "Removed"
        ],
				"itemStateDefinitions": [
          "0-The state New means that the item is created but not yet Ready for realization in a sprint. Further refinement is needed",
          "1-The state Ready means that the item is understood well enough by the team for realization in a sprint",
          "2-The state 'In progress' means that the item is worked on in a (past) sprint",
          "3-The state 'On hold' means that work at the item has stopped and will be resumed later or cancelled and Removed from the backlog",
          "4-The state Done means that the item is ready for deployment and meets all criteria set by the definition of done",
          "5-The state Removed means that work on the item will never start or was cancelled"
        ],

				"tsSize": [
					"XXL",
					"XL",
					"L",
					"M",
					"S",
					"XS",
					"XXS"
				],
				"tsSizeDefinitions": [
					"0-XXL Extra-extra large effort involved",
					"1-XL  Extra large effort involved",
					"2-L   Large effort involved",
					"3-M   Medium effort involved",
					"4-S   Small effort involved",
					"5-XS  Extra small effort involved",
					"6-XXS Almost none effort involved"
				],

				// For now the subtype field is used only for pbi's
				"subtype": [
          "User story",
          "Spike",
          "Defect"
        ],
				"subtypeDefinitions": [
          "0-The product backog item of type 'User story' is the regular type as described in the Scrum guide",
          "1-The product backog item of type Spike is an effort, limited in a set number of hours, to do an investigation. The purpose of that investigation is to be able to understand and estimate future work better",
          "2-The product backog item of type Defect is an effort to fix a breach with the functional or non-functional acceptance criteria. The defect was undetected in the sprint test suites or could not be fixed before the sprint end"
        ],

				"knownRoles": [
          '_admin',
          'admin',
          'superPO',
          'PO',
          'developer',
          'guest',
        ],
				"knownRolesDefinitions": [
          "0-_admin: Is the database administrator. Can setup and delete databases. See the CouchDB documentation. Is also a guest to all products.",
					"1-admin: Can create and assign users to products. Is also a guest to all products.",
					"2-superPO: Can create and maintain products and epics for all products. Can change priorities at these levels.",
					"3-PO: Can create and maintain features and pbi's for the assigned products. Can change priorities at these levels.",
					"4-developer: Can create and maintain pbi's and features for the assigned products.",
					"5-guest: Can only view the items of the assigned products. Has no access to the requirements area view."
        ]
			}
    }
  ]
}

const initData = {
	"docs": [
		{
			"_id": "onebacklog-a480",
			"parentid": null,
			"type": "product",
			"subtype": null,
			"state": 2,
			"tssize": 1,
			"spsize": null,
			"reqarea": null,
			"title": "One Backlog: the ultimate solution for multiteam companies",
			"followers": [],
			"description": "As super PO I need one integrated tool to manage the product backlog of all my products so that: etc.",
			"acceptanceCriteria": "Please don't forget",
			"priority": 4503599627370500,
			"attachments": [],
			"comments": [],
			"history": []
		},
		{
			"_id": "onebacklog-b319",
			"parentid": null,
			"type": "requirementsArea",
			"state": 0,
			"tssize": 0,
			"title": "The 'One Backlog' user interface",
			"followers": [],
			"description": "Describe your requirements area here...",
			"acceptanceCriteria": "Please don't forget",
			"attachments": [],
			"comments": [],
			"history": [],
		},
		{
			"_id": "onebacklog-102b",
			"parentid": "onebacklog-a480",
			"type": "epic",
			"subtype": null,
			"state": 2,
			"tssize": 3,
			"spsize": null,
			"reqarea": "onebacklog-b319",
			"title": "The GUI",
			"followers": [],
			"description": "As PO I want to see a MPV version of the GUI so that I can feel the product and come with improvements",
			"acceptanceCriteria": "Please don't forget",
			"priority": 4503599627370500,
			"attachments": [],
			"comments": [],
			"history": []
		},
		{
			"_id": "onebacklog-2e30",
			"parentid": "onebacklog-102b",
			"type": "feature",
			"subtype": null,
			"state": 4,
			"tssize": 3,
			"spsize": null,
			"reqarea": "onebacklog-b319",
			"title": "The tree structure",
			"followers": [],
			"description": "As a PO I want a tree structure to walk over the products and all of its decendants",
			"acceptanceCriteria": "Must be able to sort, create new, and delete items. Want to to be able to up or downgrade an item over 1 level: eg. a pbi to a feature, or a epic to a feature",
			"priority": 4503599627370500,
			"attachments": [],
			"comments": [],
			"history": []
		},
		{
			"_id": "onebacklog-f5b8",
			"parentid": "onebacklog-2e30",
			"type": "pbi",
			"subtype": 0,
			"state": 4,
			"tssize": 0,
			"spsize": 5,
			"reqarea": null,
			"title": "Enable item insertion",
			"followers": [],
			"description": "As PO or developer I want to create new items right at the spot with the anticipated priority",
			"acceptanceCriteria": "Please don't forget",
			"priority": 4503599627370500,
			"attachments": [],
			"comments": [],
			"history": []
		}]
}

export default {
	state,
	getters,
	mutations,
	actions
}
