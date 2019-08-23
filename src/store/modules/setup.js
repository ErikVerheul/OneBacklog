import globalAxios from 'axios'

let text2004 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras placerat ut mauris quis porttitor. Nulla scelerisque turpis vel ultrices suscipit. Integer hendrerit neque vitae nisi tempor tincidunt. Aenean sit amet est vel mauris maximus semper ac ut risus. Quisque non molestie leo. Curabitur at aliquet dolor, id imperdiet enim. Fusce vehicula, ipsum a ultricies sollicitudin, metus nisl consectetur risus, non aliquam metus magna et massa. In maximus placerat scelerisque. Etiam interdum ante a imperdiet pulvinar. Suspendisse potenti. Nam bibendum egestas purus, id rhoncus felis ullamcorper a. Donec aliquam ante ut tincidunt pulvinar. Donec tincidunt eros felis, ut consequat nibh suscipit ut. Cras lectus sem, interdum non arcu ut, auctor congue justo. Proin lobortis purus vitae nunc condimentum imperdiet. Cras in dolor mauris. Nulla facilisi. In sollicitudin libero ac dui suscipit, at tincidunt elit accumsan. Suspendisse ac bibendum ligula. Donec varius nulla eu tortor dignissim ultrices sit amet quis enim. In laoreet consequat nibh, in vehicula arcu dictum eget. In ac pretium nulla. Phasellus interdum pulvinar odio, nec porta nulla maximus a. Vestibulum condimentum congue lectus in semper. Proin efficitur scelerisque ante sed iaculis. Suspendisse elementum lorem vitae lorem consectetur, id convallis ligula scelerisque. Nam non mattis risus. Integer dapibus pulvinar laoreet. Sed facilisis dui vitae quam dictum, sit amet semper tortor malesuada. Quisque at risus eu velit luctus vestibulum. Sed id luctus turpis, sed lobortis tellus. Curabitur semper id urna sed congue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Curabitur vitae purus ex. Fusce tellus metus, viverra blandit ipsum in, aliquam facilisis dui. Quisque venenatis tempus eros, quis interdum nisi suscipit malesuada. Aliquam id ipsum commodo, ornare lorem in, sodales leo. Fusce ac pellentesque nisi. Pellentesque condimentum a tortor in sodales. Nulla scelerisque orci nullam."

// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
function newId() {
	return Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
}

// Calculate the priority with lower idx highest
function calcPrio(idx, n) {
	let step = Math.floor(Number.MAX_SAFE_INTEGER / (n + 1)) * 2
	return Number.MAX_SAFE_INTEGER - (idx + 1) * step
}

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

	// Create new product
	createNewProduct({
		rootState,
		dispatch
	}, payload) {
		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"type": "backlogItem",
			"productId": _id,
			"parentId": 'root',
			"team": "not assigned yet",
			"level": 2,
			"subtype": 0,
			"state": 0,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": payload.productName,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [2, rootState.currentDb],
				"by": rootState.user,
				"email": rootState.load.email,
				"timestamp": Date.now(),
				"sessionId": rootState.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewProduct: Product document with _id + ' + _id + ' is created.')
			// note that a curious fix was needed to get correct priority numbers: Math.floor(payload.epics) instead of payload.epics
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				features: payload.features,
				userStories: payload.userStories,
				counter1: 0,
				epicsNumber: Math.floor(payload.epics)
			}
			dispatch('createNewEpics', newPayload)
		})
			.catch(error => {
				let msg = 'createNewProduct: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	createNewEpics({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter1 >= payload.epicsNumber) return
		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 3,
			"subtype": 0,
			"state": 0,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created epic " + payload.counter1,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter1, payload.epicsNumber),
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [3, payload.parentName],
				"by": rootState.user,
				"email": rootState.load.email,
				"timestamp": Date.now(),
				"sessionId": rootState.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewEpics: Epic document with _id + ' + _id + ' is created. Counter1 = ' + payload.counter1)
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				userStories: payload.userStories,
				counter2: 0,
				featuresNumber: Math.floor(Math.random() * payload.features * 2) + 1
			}
			dispatch('createNewFeatures', newPayload)
			// recurse, execute sequentially
			payload.counter1++
			dispatch('createNewEpics', payload)
		})
			.catch(error => {
				let msg = 'createNewEpics: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	createNewFeatures({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter2 >= payload.featuresNumber) return

		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 4,
			"subtype": 0,
			"state": 0,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created feature " + payload.counter2,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter2, payload.featuresNumber),
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [4, payload.parentName],
				"by": rootState.user,
				"email": rootState.load.email,
				"timestamp": Date.now(),
				"sessionId": rootState.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewFeatures: document with _id + ' + _id + ' is created. Counter2 = ' + payload.counter2)
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				counter3: 0,
				storiesNumber: Math.floor(Math.random() * payload.userStories * 2) + 1
			}
			dispatch('createNewStories', newPayload)
			// recurse, execute sequentially
			payload.counter2++
			dispatch('createNewFeatures', payload)
		})
			.catch(error => {
				let msg = 'createNewFeatures: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	createNewStories({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter3 >= payload.storiesNumber) return

		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 5,
			"subtype": 0,
			"state": 0,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created user story " + payload.counter3,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter3, payload.storiesNumber),
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [5, payload.parentName],
				"by": rootState.user,
				"email": rootState.load.email,
				"timestamp": Date.now(),
				"sessionId": rootState.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewStories: document with _id + ' + _id + ' is created. Counter3 = ' + payload.counter3)
			// recurse, execute sequentially
			payload.counter3++
			dispatch('createNewStories', payload)
		})
			.catch(error => {
				let msg = 'createNewStories: Could not write document with url ' + rootState.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	creRdmProduct({
		rootState,
		state,
		dispatch
	}, payload) {
		this.commit('clearAll')
		if (rootState.currentDb) {
			state.message = 'Creating product ' + payload.productName + ' in database ' + rootState.currentDb
		} else {
			state.message = 'Please select or create the database first'
			return
		}
		// create product
		dispatch('createNewProduct', payload)
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
			rootState.currentDb = dbName
			state.comment = 'New database ' + dbName + ' is created. Note that subsequent actions will be performed on this database'
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
		}).then(() => {
			rootState.currentDb = dbName
			state.comment = 'The database ' + dbName + ' exists already. Note that subsequent actions will be performed on this database'
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

	copyDB({
		state,
		dispatch
	}, payload) {
		this.commit('clearAll')
		// eslint-disable-next-line no-console
		let copyData = {
			"create_target": true,
			"source": payload.dbSourceName,
			"target": payload.dbTargetName
		}
		// eslint-disable-next-line no-console
		console.log('Copy DB: from ' + payload.dbSourceName + ' to ' + payload.dbTargetName)
		globalAxios({
			method: 'POST',
			url: "_replicate",
			withCredentials: true,
			data: copyData
		}).then(res => {
			state.message = res.data
			// eslint-disable-next-line no-console
			console.log(res)
			dispatch('setDbPermissions', {
				dbName: payload.dbTargetName
			})
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
				"RequirementArea",
				"Database",
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
					 * Sort on productId first to separate items from different products. Sort on level to build the intem tree top down.
					 * Select the 'backlogitem' document type and skip removed, requirements-area and database description documents (level 0 and 1).
					 */
					"sortedFilter": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && !doc.delmark && doc.level > 1) emit([doc.productId, doc.level, doc.priority*-1], 1);}'
					},
					/*
					 * Filter on document type 'backlogItem', then filter the changes which need distributed to other users.
					 */
					"changesFilter": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && doc.history[0].distributeEvent) emit(doc._id, 1);}'
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
			url: payload.dbName + '/' + payload._id,
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
		state,
		rootState
	}, payload) {
		this.commit('clearAll')
		const initData = {
			"docs": [
				{
					"_id": "log",
					"type": "logging",
					"entries": [
						{
							"event": "example event",
							"level": "INFO",
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552140438968,
							"distributeEvent": true
						},
					]
				},
				{
					"_id": "root",
					"type": "backlogItem",
					"level": 1,
					"title": "The root of all products in this database",
					"followers": [],
					"description": "PHA+ZGVtb2RiPC9wPg==",
					"acceptanceCriteria": "PHA+PC9wPg==",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [1, "demodb"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552140438968,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "1552140438968e1e9",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "1552139972020f641",
					"team": "Ghost busters",
					"level": 5,
					"subtype": 0,
					"state": 4,
					"tssize": 0,
					"spsize": 5,
					"spikepersonhours": 0,
					"reqarea": "15521397677068926",
					"title": "Use modals for item insertion and deletion",
					"followers": [],
					"description": "PHA+QXMgUE8gb3IgZGV2ZWxvcGVyIEkgd2FudCB0byBjcmVhdGUgbmV3IGl0ZW1zIHJpZ2h0IGF0IHRoZSBzcG90IHdpdGggdGhlIGFudGljaXBhdGVkIHByaW9yaXR5PC9wPg==",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": 4503599627370495,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [5, "The tree structure"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552140438968,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "15521397677068926",
					"type": "backlogItem",
					"productId": null,
					"parentId": "root",
					"team": "Ghost busters",
					"level": 0,
					"state": 0,
					"tssize": 0,
					"title": "The cross product...",
					"followers": [],
					"description": "PHA+RGVzY3JpYmUgeW91ciByZXF1aXJlbWVudHMgYXJlYSBoZXJlLi4uPC9wPg==",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [0, "demodb"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552139767706,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "15521398069875394",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "root",
					"team": "Ghost busters",
					"level": 2,
					"subtype": null,
					"state": 1,
					"tssize": 1,
					"spsize": null,
					"spikepersonhours": 0,
					"title": "One Backlog: the ultimate solution for multiteam companies",
					"followers": [],
					"description": "PHA+QXMgc3VwZXIgUE8gSSBuZWVkIG9uZSBpbnRlZ3JhdGVkIHRvb2wgdG8gbWFuYWdlIHRoZSBwcm9kdWN0IGJhY2tsb2cgb2YgYWxsIG15IHByb2R1Y3RzIHNvIHRoYXQ6IGV0Yy48L3A+",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": 3002399751580330,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [2, "demodb"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552139806987,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "15521399035145bef",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "15521398069875394",
					"team": "Ghost busters",
					"level": 3,
					"subtype": null,
					"state": 2,
					"tssize": 3,
					"spsize": null,
					"spikepersonhours": 0,
					"title": "The GUI",
					"followers": [],
					"description": "PHA+QXMgUE8gSSB3YW50IHRvIHNlZSBhIE1WUCB2ZXJzaW9uIG9mIHRoZSBHVUkgc28gdGhhdCBJIGNhbiBmZWVsIHRoZSBwcm9kdWN0IGFuZCBjb21lIHdpdGggaW1wcm92ZW1lbnRzPC9wPg==",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": -3002399751580331,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [3, "One Backlog: the ultimate solution for multiteam companies"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552139903514,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "15537241758603a32",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "15521398069875394",
					"team": "Ghost busters",
					"level": 3,
					"subtype": null,
					"state": 2,
					"tssize": 3,
					"spsize": null,
					"spikepersonhours": 0,
					"title": "User feedback",
					"followers": [],
					"description": "PHA+QXMgUE8gYW5kIGRldmVsb3BlciBJIGFtIGludGVyZXN0ZWQgaW4gdXNlciBmZWVkYmFjayBmb3IgcHJvZHVjdCBlbmhhbmNlbWVudC48L3A+",
					"acceptanceCriteria": "PHA+VGhlIGlkZWEgbXVzdCBiZSBmZWFzaWJsZSBhbmQgb2YgdmFsdWUgZm9yIHRoZSBtYWpvcml0eSBvZiB1c2Vycy4gT3IgaXQgY2FuIGJlIGEgZmVhdHVyZSBmb3IgaGVhdnkgdXNlcnMgYnV0IHRoZSBpbXBsZW1lbnRhdGlvbiBzaG91bGQgaHVydCB0aGUgZWFzZSBvZiB1c2UgZm9yIHRoZSBvdGhlciB1c2Vycy48L3A+",
					"priority": 3002399751580330,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [3, "One Backlog: the ultimate solution for multiteam companies"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1553724175860,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "1552139972020f641",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "15521399035145bef",
					"team": "Ghost busters",
					"level": 4,
					"subtype": null,
					"state": 4,
					"tssize": 3,
					"spikepersonhours": 0,
					"spsize": null,
					"reqarea": "15521397677068926",
					"title": "The tree structure",
					"followers": [],
					"description": "PHA+QXMgYSBQTyBJIHdhbnQgYSB0cmVlIHN0cnVjdHVyZSB0byB3YWxrIG92ZXIgdGhlIHByb2R1Y3RzIGFuZCBhbGwgb2YgaXRzIGRlc2NlbmRhbnRzPC9wPg==",
					"acceptanceCriteria": "PHA+TXVzdCBiZSBhYmxlIHRvIHNvcnQsIGNyZWF0ZSBuZXcsIGFuZCBkZWxldGUgaXRlbXMuIFdhbnQgdG8gdG8gYmUgYWJsZSB0byB1cCBvciBkb3duZ3JhZGUgYW4gaXRlbSBvdmVyIDEgbGV2ZWw6IGVnLiBhIHBiaSB0byBhIGZlYXR1cmUsIG9yIGEgZXBpYyB0byBhIGZlYXR1cmUuIFdhcm4gdGhlIHVzZXIgYmVmb3JlIGRlbGV0aW9uLiBGb3Igbm93IHRoZXJlIGlzIG51IHVuZG8gZnVuY3Rpb24uPC9wPg==",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [4, "The GUI"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552139972020,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "1552139986318cf68",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "1552139972020f641",
					"team": "Ghost busters",
					"level": 5,
					"subtype": 0,
					"state": 4,
					"tssize": 0,
					"spsize": 5,
					"spikepersonhours": 0,
					"reqarea": "15521397677068926",
					"title": "Enable item insertion",
					"followers": [],
					"description": "PHA+QXMgYSB1c2VyIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb24gSSB3YW50IHRvIGNyZWF0ZSBuZXcgaXRlbXM8L3A+",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [5, "The tree structure"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552139986318,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "1552406429497867d",
					"type": "backlogItem",
					"productId": "15521398069875394",
					"parentId": "1552139972020f641",
					"team": "Ghost busters",
					"level": 5,
					"subtype": 0,
					"state": 4,
					"tssize": 0,
					"spsize": 5,
					"spikepersonhours": 0,
					"reqarea": "15521397677068926",
					"title": "Enable item deletion",
					"followers": [],
					"description": "PHA+QXMgYSB1c2VyIHdpdGggdGhlIGFwcHJvcHJpYXRlIHBlcm1pc3Npb24gSSB3YW50IHRvIGRlbGV0ZSBpdGVtczwvcD4=",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": -4503599627370495,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [5, "The tree structure"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552406429497,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},

				{
					"_id": "1552152600149c2ac",
					"type": "backlogItem",
					"productId": "1552152600149c2ac",
					"parentId": "root",
					"team": "A-team",
					"level": 2,
					"subtype": null,
					"state": 0,
					"tssize": 1,
					"spsize": null,
					"spikepersonhours": 0,
					"title": "Another great product",
					"followers": [],
					"description": "PHA+QXMgdGhlIENFTyBJIHdhbnQgLi4uIHNvIHRoYXQgd2UgYXMgYSBjb21wYW55IGNhbiAuLi48L3A+",
					"acceptanceCriteria": "PHA+TXVzdCBiZSBhd2Vzb21lPC9wPg==",
					"priority": -3002399751580331,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [2, "demodb"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552152600149,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "155215264241301dd",
					"type": "backlogItem",
					"productId": "1552152600149c2ac",
					"parentId": "1552152600149c2ac",
					"team": "A-team",
					"level": 3,
					"subtype": null,
					"state": 0,
					"tssize": 3,
					"spsize": null,
					"spikepersonhours": 0,
					"title": "Epic nr.1 for awesome",
					"followers": [],
					"description": "PHA+VGhlIGZpc3QgRXBpYyBmb3IgdGhpcyBhd2Vzb21lIHByb2R1Y3Q8L3A+",
					"acceptanceCriteria": "PHA+UGxlYXNlIGRvbid0IGZvcmdldDwvcD4=",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [3, "Another great product"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552152642413,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
				{
					"_id": "1552152658206bb2f",
					"type": "backlogItem",
					"productId": "1552152600149c2ac",
					"parentId": "155215264241301dd",
					"team": "A-team",
					"level": 4,
					"subtype": null,
					"state": 0,
					"tssize": 3,
					"spsize": null,
					"spikepersonhours": 0,
					"reqarea": "15521397677068926",
					"title": "First awesome feature",
					"followers": [],
					"description": "PHA+Q3JlYXRlIGFuIGF3ZXNvbWUgbG9naW4gc28gdGhhdCBpdCBpcyBzdXBlciBlYXN5IHRvIGRvLlg8L3A+",
					"acceptanceCriteria": "PHA+SnVzdCBiZSBhd2Vzb21lPC9wPg==",
					"priority": 0,
					"attachments": [],
					"comments": [],
					"history": [
						{
							"createEvent": [4, "Epic nr.1 for awesome"],
							"by": "Erik",
							"email": "erik@mycompany.nl",
							"timestamp": 1552152658206,
							"sessionId": rootState.sessionId,
							"distributeEvent": false
						},
					],
					"delmark": false
				},
			]
		}
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
	},

	createShortIds({
		state,
		dispatch
	}, payload) {
		this.commit('clearAll')
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_all_docs',
			withCredentials: true,
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log(res.data)
			const docsToUpdate = []
			for (let i = 0; i < res.data.rows.length; i++) {
				docsToUpdate.push({ "id": res.data.rows[i].id })
			}
			dispatch('updateWithShortIds', docsToUpdate)
		})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			})
	},

	updateWithShortIds({
		rootState,
		dispatch
	}, docsToUpdate) {
		globalAxios({
			method: 'POST',
			url: rootState.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToUpdate },
		}).then(res => {
			// console.log('updateWithShortIds: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					// mark for removal
					let shortId = results[i].docs[0].ok._id.slice(-5)
					results[i].docs[0].ok["shortId"] = shortId
					ok.push(results[i].docs[0].ok)
					// console.log('updateWithShortIds: results[i].docs[0].ok.shortId = ' + results[i].docs[0].ok.shortId)
				}
			}
			dispatch('updateBulk', ok)
		})
			.catch(error => {
				let msg = 'updateWithShortIds: Could not read batch of documents: ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

}

/* Below some data to create a sample database */
const initUsers = {
	"data": [
		{
			"name": "demoUser",
			"password": "demoUser",
			"teams": ["Ghost busters", "A-team"],
			"currentTeamsIdx": 0,
			"roles": ["superPO", "PO", "developer", "guest"],
			"type": "user",
			"email": "demouser@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"superPO",
					"PO",
					"developer",
					"guest"
				],
				"15521398069875394": [
					"guest"
				]
			},
			"subscriptions": [
				"1552152600149c2ac",
				"15521398069875394"
			]
		},
		{
			"name": "Jan Klaassen",
			"password": "Jan",
			"teams": ["Ghost busters", "A-team"],
			"currentTeamsIdx": 0,
			"roles": ["admin", "superPO", "guest"],
			"type": "user",
			"email": "jan@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"admin",
					"superPO"
				],
				"15521398069875394": [
					"guest"
				]
			},
			"subscriptions": [
				"1552152600149c2ac",
				"15521398069875394"
			]
		},
		{
			"name": "Herman",
			"password": "Herman",
			"teams": ["Ghost busters", "A-team"],
			"currentTeamsIdx": 0,
			"roles": ["PO", "guest"],
			"type": "user",
			"email": "herman@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"PO"
				],
				"15521398069875394": [
					"guest"
				]
			},
			"subscriptions": [
				"1552152600149c2ac",
				"15521398069875394"
			]
		},
		{
			"name": "Piet",
			"password": "Piet",
			"teams": ["Ghost busters"],
			"currentTeamsIdx": 0,
			"roles": ["areaPO", "guest"],
			"type": "user",
			"email": "piet@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"areaPO"
				],
				"15521398069875394": [
					"guest"
				]
			},
			"subscriptions": [
				"1552152600149c2ac",
				"15521398069875394"
			]
		},
		{
			"name": "Mechteld",
			"password": "Mechteld",
			"teams": ["Ghost busters"],
			"currentTeamsIdx": 0,
			"roles": ["developer", "guest"],
			"type": "user",
			"email": "mechteld@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"developer"
				],
				"15521398069875394": [
					"guest"]
			},
			"subscriptions": [
				"1552152600149c2ac",
				"15521398069875394"
			]
		},
		{
			"name": "Henk",
			"password": "Henk",
			"roles": ["guest"],
			"type": "user",
			"email": "henk@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"15521398069875394": [
					"guest"
				]
			},
			"subscriptions": [
				"15521398069875394"
			]
		},
		{
			"name": "guest",
			"password": "guest",
			"roles": ["guest"],
			"type": "user",
			"email": "guest@mycompany.nl",
			"currentDb": 'demodb',
			"productsRoles": {
				"1552152600149c2ac": [
					"guest"
				]
			},
			"subscriptions": [
				"1552152600149c2ac"
			]
		}]
}

const usersDbPermissions = {
	"admins": {
		"names": [],
		"roles": ["admin"]
	},
	"members": {
		"names": [],
		"roles": []
	}
}

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

export default {
	state,
	getters,
	mutations,
	actions
}
