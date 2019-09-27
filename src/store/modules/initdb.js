import globalAxios from 'axios'

const state = {
	createDatabaseResult: '',
	createDatabaseError: '',
	createProductResult: '',
	createProductError: '',
	createFirstUserResult: '',
	createFirstUserError: '',
	dbCreated: false,
	productCreated: false,
	userCreated: false
}

const actions = {

	createDatabase({
		state
	}, dbName) {
		state.createDatabaseResult = ''
		state.createDatabaseError = ''
		// eslint-disable-next-line no-console
		console.log('create database')
		globalAxios({
			method: 'PUT',
			url: dbName,
			withCredentials: true,
		}).then(res => {
			state.createDatabaseError = res.data
			state.dbCreated = true
			state.createDatabaseResult = 'New database ' + dbName + ' is created. Note that subsequent actions will be performed on this database'
		}).catch(error => {
			state.createDatabaseError = error.response.data
		})
	},

	createLog({
		dispatch
	}, payload) {
		const logDoc = {
			"_id": "log",
			"type": "logging",
			"entries": [
				{
					"event": "Log initialization",
					"level": "INFO",
					"by": payload.user,
					"email": payload.email,
					"timestamp": Date.now(),
					"timestampStr": new Date().toString()
				},
			]
		}
		// eslint-disable-next-line no-console
		console.log('create log document')
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/log',
			withCredentials: true,
			data: logDoc
		}).then(res => {
			dispatch('initializeDatabase', payload)
			// eslint-disable-next-line no-console
			console.log(res)
		}).catch(error => {
			// eslint-disable-next-line no-console
			console.log(error)
		})
	},

	// Create new product
	createProduct({
		rootState,
		dispatch
	}, payload) {
		// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 digit alphanumerical random value
		function newId() {
			return Date.now().toString() + Math.random().toString(36).replace('0.', '').substr(0, 5)
		}
		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": _id.slice(-5),
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
			"title": payload.productName,
			"followers": [],
			"description": window.btoa("<p>" + 'First created product' + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + '' + "</p>"),
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [2, payload.dbName],
				"by": payload.user,
				"email": payload.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}
		// eslint-disable-next-line no-console
		console.log('create new product')
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log(res)
			state.productCreated = true
			state.createProductResult = 'Product with _id ' + _id + ' is created.'
			payload.productId = _id
			dispatch('createFirstUser', payload)
		}).catch(error => {
			// eslint-disable-next-line no-console
			console.log(error)
			state.createProductError = 'Could not write document with url ' + payload.dbName + '/' + _id + ', ' + error
		})
	},

	createFirstUser({
		state
	}, payload) {
		const productsRoles = {
			[payload.productId]: payload.roles
		}
		// eslint-disable-next-line no-console
		console.log('create first user')
		globalAxios({
			method: 'PUT',
			url: '_users/org.couchdb.user:' + payload.user,
			withCredentials: true,
			data: {
				"name": payload.user,
				"password": payload.password,
				"teams": ['no team assigned'],
				"currentTeamsIdx": 0,
				"roles": payload.roles,
				"type": "user",
				"email": payload.email,
				"currentDb": payload.dbName,
				"subscriptions": [payload.productId],
				"productsRoles": productsRoles
			}
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log(res)
			state.userCreated = true
			state.createFirstUserResult = 'User ' + payload.user + ' is created.'
		}).catch(error => {
			// eslint-disable-next-line no-console
			console.log(error)
			state.createFirstUserError = 'Could not create user ' + payload.user + ', ' + error
		})
	},

	initializeDatabase({
		dispatch
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

		// eslint-disable-next-line no-console
		console.log('Initialize DB: install configuration file')
		globalAxios({
			method: 'POST',
			url: payload.dbName,
			withCredentials: true,
			data: configData
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log(res)
		})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
			})

		// eslint-disable-next-line no-console
		console.log('Initialize DB: install design documents')
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
					},
					/*
					 * Filter on document type 'backlogItem', then sort on shortId.
					 */
					"shortIdFilter": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && doc.level > 1) emit([doc.shortId], 1);}'
					}

				},
				"language": "javascript"
			}
		}).then(res => {
			dispatch('createProduct', payload)
			// eslint-disable-next-line no-console
			console.log(res)
		})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
			})
	},
}

export default {
	state,
	actions
}
