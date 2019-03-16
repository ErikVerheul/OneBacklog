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
		/* The configuration data can change over time with new versions of this program.
		 * Once a database is created it is tightly coupled with the configuration is was created with.
		 */
		const configData = {
			"_id": "config",
			"type": "config",
			"changedBy": "Erik",
			"changeDate": 1551940535871,

			"itemType": [
					"Database",
					"RequirementArea",
					"Product",
					"Epic",
					"Feature",
					"PBI"
				],

			"ItemTypeDefinitions": [
					"A requirement area is a categorization of the requirements leading to a different view of the Product Backlog",
					"Teams work on products rather than projects. A product has a life cycle from creation to eventually replacement",
					"An Epic is a major contribution to the product realisation and usually far to big to do in one sprint",
					"A Feature is a product enhancement usually recognizable and appricated bij the customer or user",
					"A Product Backlog Item is any piece of work which can be done within one sprint by one team. See also the subtypes"
				],

			"itemState": [
          "New",
          "Ready",
          "In progress",
          "On hold",
          "Done",
          "Removed"
        ],
			"itemStateDefinitions": [
          "The state New means that the item is created but not yet Ready for realization in a sprint. Further refinement is needed",
          "The state Ready means that the item is understood well enough by the team for realization in a sprint",
          "The state 'In progress' means that the item is worked on in a (past) sprint",
          "The state 'On hold' means that work at the item has stopped and will be resumed later or cancelled and Removed from the backlog",
          "The state Done means that the item is ready for deployment and meets all criteria set by the definition of done",
          "The state Removed means that work on the item will never start or was cancelled"
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
					"Extra-extra large effort involved",
					"Extra large effort involved",
					"Large effort involved",
					"Medium effort involved",
					"Small effort involved",
					"Extra small effort involved",
					"Almost none effort involved"
				],

			// For now the subtype field is used only for pbi's
			"subtype": [
          "User story",
          "Spike",
          "Defect"
        ],
			"subtypeDefinitions": [
          "The product backog item of type 'User story' is the regular type as described in the Scrum guide",
          "The product backog item of type Spike is an effort, limited in a set number of hours, to do an investigation. The purpose of that investigation is to be able to understand and estimate future work better",
          "The product backog item of type Defect is an effort to fix a breach with the functional or non-functional acceptance criteria. The defect was undetected in the sprint test suites or could not be fixed before the sprint end"
        ],

			// These are the roles known by this application despite settings in the _users database otherwise.
			"knownRoles": {
				"_admin": "_admin: Is the database administrator. Can setup and delete databases. See the CouchDB documentation. Is also a guest to all products.",
				"admin": "admin: Can create and assign users to products. Is also a guest to all products.",
				"superPO": "superPO: Can create and maintain products and epics for all products. Can change priorities at these levels.",
				"PO": "PO: Can create and maintain features and pbi's for the assigned products. Can change priorities at these levels.",
				"developer": "developer: Can create and maintain pbi's and features for the assigned products.",
				"guest": "guest: Can only view the items of the assigned products. Has no access to the requirements area view."
			},
		}

		this.commit('clearAll')
		// eslint-disable-next-line no-console
		console.log('Initialize DB: ' + payload.dbName)
		globalAxios({
				method: 'POST',
				url: payload.dbName,
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

		// Add the _design document
		globalAxios({
				method: 'PUT',
				url: payload.dbName + '/_design/design1',
				withCredentials: true,
				data: {
					"views": {
						/*
						 * Sort on productId first to separate items from different products. Sort on type to build the intem tree top down.
						 * Sort on the negative value of the priority so that the highest priority comes on top.
						 * Skip the requirements area documents with type 0 in this view. Requirements areas can overlook multiple products.
						 */
						"sortedFilter": {
							"map": 'function (doc) {if (doc.type > 0) emit([doc.productId, doc.type, doc.priority*-1], 1);}'
						}
					},
					"language": "javascript"
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

	setUsersDbPermissions({
		state
	}) {
		// eslint-disable-next-line no-console
		console.log('Start executing setUsersDbPermissions')
		globalAxios({
				method: 'PUT',
				url: '/_users/_security',
				withCredentials: true,
				data: usersDbPermissions
			}).then(res => {
				state.message = res.data
				// eslint-disable-next-line no-console
				console.log('_users DB permissions are set, response is: ' + res)
			})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			})
	},

	setDbPermissions({
		state
	}, payload) {
		// eslint-disable-next-line no-console
		console.log('Start executing setDbPermissions')
		globalAxios({
				method: 'PUT',
				url: payload.dbName + '/_security',
				withCredentials: true,
				data: dbPermissions
			}).then(res => {
				state.message = res.data
				// eslint-disable-next-line no-console
				console.log('DB permissions are set, response is: ' + res)
			})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			})
	}
}

/* Below some data to create a sample database */
const initUsers = {
	"data": [
		{
			"name": "Jan Klaassen",
			"password": "Jan",
			"roles": ["admin", "superPO"],
			"type": "user",
			"email": "jan@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["15521398069875394", "1552152600149c2ac"],
			"currentProductIdx": 0
		},
		{
			"name": "Herman",
			"password": "Herman",
			"roles": ["admin", "PO"],
			"type": "user",
			"email": "herman@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["15521398069875394", "1552152600149c2ac"],
			"currentProductIdx": 1
		},
		{
			"name": "Piet",
			"password": "Piet",
			"roles": ["developer"],
			"type": "user",
			"email": "piet@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["15521398069875394", "1552152600149c2ac"],
			"currentProductIdx": 0
		},
		{
			"name": "Mechteld",
			"password": "Mechteld",
			"roles": ["developer"],
			"type": "user",
			"email": "mechteld@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["15521398069875394", "1552152600149c2ac"],
			"currentProductIdx": 0
		},
		{
			"name": "Henk",
			"password": "Henk",
			"roles": ["guest"],
			"type": "user",
			"email": "henk@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["15521398069875394"],
			"currentProductIdx": 0
		},
		{
			"name": "guest",
			"password": "guest",
			"roles": ["guest"],
			"type": "user",
			"email": "guest@mycompany.nl",
			"currentDb": 'demodb',
			"products": ["1552152600149c2ac"],
			"currentProductIdx": 0
		}]
}

const usersDbPermissions = {
	"admins": {
		"names": [],
		"roles": ["admin"]
	},
	"members": {
		"names": [],
		"roles": ['superPO', 'PO', 'developer', 'guest']
	}
}

const dbPermissions = {
	"admins": {
		"names": ["Jan", "Herman"],
		"roles": ["superPO", "admin"]
	},
	"members": {
		"names": ["Piet", "Mechteld", "Henk"],
		"roles": ["PO", "guest"]
	}
}

const initData = {
	"docs": [
		{
			"_id": "1552140438968e1e9",
			"productId": "15521398069875394",
			"type": 5,
			"subtype": 0,
			"state": 4,
			"tssize": 0,
			"spsize": 5,
			"spikepersonhours": 0,
			"reqarea": null,
			"title": "Use modals for item insertion and deletion",
			"followers": [],
			"description": "As PO or developer I want to create new items right at the spot with the anticipated priority",
			"acceptanceCriteria": "Please don't forget",
			"priority": 4503599627370495,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552140438969
			}]
		},
		{
			"_id": "15521397677068926",
			"productId": null,
			"type": 1,
			"state": 0,
			"tssize": 0,
			"title": "The 'One Backlog' user interface",
			"followers": [],
			"description": "Describe your requirements area here...",
			"acceptanceCriteria": "Please don't forget",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139767707
			}],
		},
		{
			"_id": "15521398069875394",
			"productId": "15521398069875394",
			"type": 2,
			"subtype": null,
			"state": 1,
			"tssize": 1,
			"spsize": null,
			"spikepersonhours": 0,
			"reqarea": null,
			"title": "One Backlog: the ultimate solution for multiteam companies",
			"followers": [],
			"description": "As super PO I need one integrated tool to manage the product backlog of all my products so that: etc.",
			"acceptanceCriteria": "Please don't forget",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139806988,
			}]
		},
		{
			"_id": "15521399035145bef",
			"productId": "15521398069875394",
			"type": 3,
			"subtype": null,
			"state": 2,
			"tssize": 3,
			"spsize": null,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "The GUI",
			"followers": [],
			"description": "As PO I want to see a MVP version of the GUI so that I can feel the product and come with improvements",
			"acceptanceCriteria": "Please don't forget",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139903514,
			}]
		},
		{
			"_id": "1552139972020f641",
			"productId": "15521398069875394",
			"type": 4,
			"subtype": null,
			"state": 4,
			"tssize": 3,
			"spikepersonhours": 0,
			"spsize": null,
			"reqarea": "15521397677068926",
			"title": "The tree structure",
			"followers": [],
			"description": "As a PO I want a tree structure to walk over the products and all of its descendants",
			"acceptanceCriteria": "Must be able to sort, create new, and delete items. Want to to be able to up or downgrade an item over 1 level: eg. a pbi to a feature, or a epic to a feature. Warn the user before deletion. For now there is nu undo function.",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139972020,
			}]
		},
		{
			"_id": "1552139986318cf68",
			"productId": "15521398069875394",
			"type": 5,
			"subtype": 0,
			"state": 4,
			"tssize": 0,
			"spsize": 5,
			"spikepersonhours": 0,
			"reqarea": null,
			"title": "Enable item insertion",
			"followers": [],
			"description": "As a user with the appropriate permission I want to create new items",
			"acceptanceCriteria": "Please don't forget",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139986318,
			}]
		},
		{
			"_id": "1552406429497867d",
			"productId": "15521398069875394",
			"type": 5,
			"subtype": 0,
			"state": 4,
			"tssize": 0,
			"spsize": 5,
			"spikepersonhours": 0,
			"reqarea": null,
			"title": "Enable item deletion",
			"followers": [],
			"description": "As a user with the appropiate permission I want to delete items",
			"acceptanceCriteria": "Please don't forget",
			"priority": -4503599627370495,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552406429497,
			}]
		},

		{
			"_id": "1552152600149c2ac",
			"productId": "1552152600149c2ac",
			"type": 2,
			"subtype": null,
			"state": 1,
			"tssize": 1,
			"spsize": null,
			"spikepersonhours": 0,
			"reqarea": null,
			"title": "Another great product",
			"followers": [],
			"description": "As the CEO I want ... so that we as a company can ...",
			"acceptanceCriteria": "Must be awesome",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139806988,
			}]
		},
		{
			"_id": "155215264241301dd",
			"productId": "1552152600149c2ac",
			"type": 3,
			"subtype": null,
			"state": 2,
			"tssize": 3,
			"spsize": null,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Epic nr.1 for awesome",
			"followers": [],
			"description": "The fist Epic for this awesome product",
			"acceptanceCriteria": "Please don't forget",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139903514,
			}]
		},
		{
			"_id": "1552152658206bb2f",
			"productId": "1552152600149c2ac",
			"type": 4,
			"subtype": null,
			"state": 4,
			"tssize": 3,
			"spsize": null,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "First awesome feature",
			"followers": [],
			"description": "Create an awesome login so that it is super easy to do.",
			"acceptanceCriteria": "Just be awesome",
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createdBy": "erik@mycompany.nl",
				"creationDate": 1552139972020,
			}]
		},
	]
}
/* Above some data to create a sample database */

export default {
	state,
	getters,
	mutations,
	actions
}
