import globalAxios from 'axios'

const PRODUCTLEVEL = 2

const actions = {
	initDatabase({
		rootState,
		dispatch
	}, payload) {
    rootState.backendMessages = []
		rootState.backendSuccess = false
		const logDoc = {
			"_id": "log",
			"type": "logging",
			"entries": [
				{
					"event": "Log initialization",
					"level": "INFO",
					"by": rootState.userData.user,
					"email": payload.email,
					"timestamp": Date.now(),
					"timestampStr": new Date().toString()
				},
			]
		}
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('create log document')
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/log',
			withCredentials: true,
			data: logDoc
		}).then(() => {
			dispatch('initializeDatabase', payload)
		}).catch(error => {
			rootState.backendMessages.push('initDatabase: Could not create log document, ' + error)
		})
	},

	initializeDatabase({
		rootState,
		dispatch
	}, payload) {
		/*
		 * The configuration data can change over time with new versions of this program.
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
		if (rootState.debug) console.log('Initialize DB: install configuration file')
		globalAxios({
			method: 'POST',
			url: payload.dbName,
			withCredentials: true,
			data: configData
		}).then(() => {
			dispatch('installDesignDoc', payload)
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(error)
		})
	},

	installDesignDoc({
		rootState,
		dispatch
	}, payload) {
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('Initialize DB: install design documents')
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
					},
					/*
					 * Filter on document type 'backlogItem', then emit the product id and title.
					 */
					"products": {
						"map": 'function (doc) {if (!doc.delmark && doc.type == "backlogItem" && doc.level === 2) emit(doc._id, doc.title);}'
					}
				},
				"language": "javascript"
			}
		}).then(() => {
			dispatch('createProduct', payload)
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(error)
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
			"team": "not in a team",
			"level": PRODUCTLEVEL,
			"state": 0,
			"title": payload.productName,
			"followers": [],
			"description": window.btoa(""),
			"acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
			"priority": 0,
			"attachments": [],
			"comments": [],
			"history": [{
				"createEvent": [PRODUCTLEVEL, payload.dbName],
				"by": rootState.userData.user,
				"email": payload.email,
				"timestamp": Date.now(),
				"timestampStr": new Date().toString(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": false
			}],
			"delmark": false
		}
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('create new product')
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + _id,
			withCredentials: true,
			data: newDoc
		}).then(() => {
			rootState.backendMessages.push('Product with _id ' + _id + ' is created.')
			payload.productId = _id
			if (payload.updateExistingProfile) {
				dispatch('addProductToUser', { dbName: payload.dbName, productId: _id })
			} else dispatch('createFirstUser', payload)
		}).catch(error => {
			rootState.backendMessages.push('Could not write document with url ' + payload.dbName + '/' + _id + ', ' + error)
		})
	},

	/* Note that the _admin user is made admin (globally) and guest to the first created product */
	createFirstUser({
		rootState
	}, payload) {
		const productsRoles = {
			[payload.productId]: ['guest']
		}
		// Change the userName here for testing in an existing instance of OneBacklog
		const userName = rootState.userData.user
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log("create first user '" + userName + "'")
		globalAxios({
			method: 'PUT',
			url: '_users/org.couchdb.user:' + userName,
			withCredentials: true,
			data: {
				"name": userName,
				"password": rootState.userData.password,
				"type": "user",
				"roles": ['admin'],
				"email": payload.email,
				"currentDb": payload.dbName,
				"myDatabases": {
					[payload.dbName]: {
						"myTeam": 'not in a team',
						"subscriptions": [payload.productId],
						"productsRoles": productsRoles
					}
				}
			}
		}).then(() => {
			rootState.backendSuccess = true
			rootState.backendMessages.push("User '" + userName + "' is created")
		}).catch(error => {
			rootState.backendMessages.push("Could not create user '" + userName + "', " + error)
		})
	},
}

export default {
	actions
}
