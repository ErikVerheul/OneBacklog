import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const ERROR = 2

const actions = {
	/*
	* Order of execution:
	* 1. createDatabase - also calls setDatabasePermissions and createUserIfNotExistent and set isDatabaseCreated to false
	* 2. createLog
	* 3. createConfig
	* 4. installDesignViews
	* 5. installDesignFilters
	* 6. createRootDoc & createReqAreasParent
	* 7. createFirstProduct
	* 8. addProductToUser in useracc.js and set isDatabaseCreated to true
	*/
	createDatabase({
		rootState,
		dispatch
	}, payload) {
		rootState.isDatabaseCreated = false
		rootState.backendMessages = []
		globalAxios({
			method: 'PUT',
			url: payload.dbName,
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDatabase: Success, empty database ' + payload.dbName + ' is created' })
			dispatch('setDatabasePermissions', payload)
			dispatch('createLog', payload)
			if (payload.createUser) {
				const userData = {
					name: rootState.userData.user,
					roles: ["admin"],
					type: "user",
					email: payload.email,
					currentDb: payload.dbName,
					myDatabases: {
						[payload.dbName]: {
							"myTeam": 'not assigned yet',
							subscriptions: [],
							productsRoles: {}
						}
					}
				}
				dispatch('createUserAsync', userData)
			}
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDatabase: Failed to create ' + payload.dbName + ', ' + error })
		})
	},

	setDatabasePermissions({
		rootState
	}, payload) {
		const dbPermissions = {
			"admins": {
				"names": [rootState.userData.user],
				"roles": ["admin"]
			},
			"members": {
				"names": [],
				"roles": ["areaPO", "superPO", "PO", "developer", "guest"]
			}
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_security',
			data: dbPermissions
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Success, database permissions for ' + payload.dbName + ' are set' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Failure, could not set database permissions, ' + error })
		})
	},

	createLog({
		rootState,
		dispatch
	}, payload) {
		const logDoc = {
			"_id": "log",
			"type": "logging",
			"entries": [
				{
					"event": "Log initialization",
					"level": "INFO",
					"by": rootState.userData.user,
					"timestamp": Date.now(),
					"timestampStr": new Date().toString()
				},
			]
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/log',
			data: logDoc
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createLog: Success, log for database ' + payload.dbName + ' is created' })
			dispatch('createConfig', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createLog: Failure, could not create log document, ' + error })
		})
	},

	createConfig({
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
			"changeDate": 1575036814777,

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
			"teams": [],
		}
		globalAxios({
			method: 'POST',
			url: payload.dbName,
			data: configData
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createConfig: Success, the configuration document is created' })
			dispatch('installDesignViews', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createConfig: Failure, could not create the configuration document, ' + error })
		})
	},

	installDesignViews({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_design/design1',
			data: {
				"views": {
					/*
					 * Sort on productId first to separate items from different products. Sort on level to build the intem tree top down.
					 * Select the 'backlogitem' document type and skip removed documents. Note: productId '0' is not in use for the req areas view only
					 * History items older than one hour or of type 'ignoreEvent' are removed but at least one item (the most recent) must be selected
					 */
					"allItemsFilter": {
						"map": `function(doc) {
							const hour = 3600000
							const now = Date.now()
							const cleanedHist = []
							for (var i = 0; i < doc.history.length; i++) {
								if ((now - doc.history[i].timestamp < hour) && Object.keys(doc.history[i])[0] !== 'ignoreEvent') cleanedHist.push(doc.history[i])
							}
							if (cleanedHist.length === 0) cleanedHist.push(doc.history[0])
							if (doc.type == "backlogItem" && !doc.delmark) emit([doc.productId, doc.level, doc.priority * -1],
								[doc.reqarea, doc.parentId, doc.state, doc.title, doc.team, doc.subtype, doc.dependencies, doc.conditionalFor, cleanedHist, doc.comments[0], doc.color]);
						}`
					},
					/* Filter up to and including the feature level */
					"areaFilter": {
						"map": `function(doc) {
							const hour = 3600000
							const now = Date.now()
							const cleanedHist = []
							for (var i = 0; i < doc.history.length; i++) {
								if ((now - doc.history[i].timestamp < hour) && Object.keys(doc.history[i])[0] !== 'ignoreEvent') cleanedHist.push(doc.history[i])
							}
							if (cleanedHist.length === 0) cleanedHist.push(doc.history[0])
							if (doc.type == "backlogItem" && !doc.delmark && doc.level < 5) emit([doc.productId, doc.level, doc.priority * -1],
								[doc.reqarea, doc.parentId, doc.state, doc.title, doc.team, doc.subtype, doc.dependencies, doc.conditionalFor, cleanedHist, doc.comments[0], doc.color]);
						}`
					},
					/* Filter on document type 'backlogItem', then filter the changes which need distributed to other users. */
					"changesFilter": {
						"map": `function(doc) {
							if (doc.type == "backlogItem") {
								if (doc.history[0].distributeEvent || doc.comments[0].distributeEvent) {
									emit(doc._id, 1);
								}
							}
						}`
					},
					/* Filter on parentIds to map documents to their parent */
					"parentIds": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && !doc.delmark && doc.level > 1) emit(doc.parentId, 1);}'
					},
					/* Filter on document type 'backlogItem', then sort on shortId.*/
					"shortIdFilter": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && doc.level > 1) emit([doc.shortId], 1);}'
					},
					/* Filter on document type 'backlogItem' but skip the dummy req areas product, then emit the product id and title.*/
					"products": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && !doc.delmark && doc.level === 2 && doc._id !== "0") emit(doc._id, doc.title);}'
					},
					/* Filter on document type 'backlogItem', then emit the product _rev of the removed documents.*/
					"removed": {
						"map": 'function (doc) {if (doc.type == "backlogItem" && doc.delmark || doc._deleted) emit(doc._rev, 1);}'
					}
				},
				"language": "javascript"
			}
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignViews: Success, the design document is created' })
			dispatch('installDesignFilters', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignViews: Failure, cannot create the design document, ' + error })
		})
	},

	installDesignFilters({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_design/filters',
			data: {
				"filters": {
					/* Filter on changes with subscribed followers */
					"email_filter": `function(doc, req) {\n return doc.type === 'backlogItem' && (doc.followers && doc.followers.length > 0) }`
				},
				"language": "javascript"
			}
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignFilters: Success, the design document is created' })
			dispatch('createRootDoc', payload)
			dispatch('createReqAreasParent', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignFilters: Failure, cannot create the design document, ' + error })
		})
	},

	createRootDoc({
		rootState,
		dispatch
	}, payload) {
		// create root document
		const rootDoc = {
			"_id": "root",
			"shortId": "root",
			"type": "backlogItem",
			"level": DATABASELEVEL,
			"state": 2,
			"title": "The root of all products in this database",
			"team": "server admins",
			"followers": [],
			"description": window.btoa("<p>Database root document</p>"),
			"acceptanceCriteria": window.btoa("<p>not applicable</p>"),
			"priority": 0,
			"comments": [{
				"ignoreEvent": 'comments initiated',
				"timestamp": 0,
				"distributeEvent": false
			}],
			// do not distribute this event; other users have no access rights yet
			"history": [{
				"createRootEvent": [payload.dbName],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/root',
			data: rootDoc
		}).then(() => {
			dispatch('createFirstProduct', payload.dbName)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Success, the root document is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Failure, cannot create the root document, ' + error })
		})
	},

	createReqAreasParent({
		rootState,
	}, payload) {
		// create parent document
		const rootDoc = {
			"_id": "0",
			"type": "backlogItem",
			"productId": "0",
			"parentId": "root",
			"team": "n/a",
			"level": 2,
			"subtype": null,
			"state": 2,
			"tssize": 1,
			"spsize": null,
			"spikepersonhours": 0,
			"title": "Requirement areas overview",
			"followers": [],
			"description": window.btoa("<p>To insert one or more requirement areas inside this node right-click on this nodes title in the tree view.</p>"),
			"acceptanceCriteria": window.btoa("<p>n/a</p>"),
			"priority": 0,
			"attachments": [],
			"comments": [{
				"ignoreEvent": 'comments initiated',
				"timestamp": 0,
				"distributeEvent": false
			}],
			// do not distribute this event; other users have no access rights yet
			"history": [{
				"createRootEvent": [payload.dbName],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/0',
			data: rootDoc
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createReqAreasParent: Success, the parent document is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createReqAreasParent: Failure, cannot create the parent document, ' + error })
		})
	},

	createFirstProduct({
		rootState,
		dispatch
	}, dbName) {
		// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
		const shortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
		const _id = Date.now().toString().concat(shortId)
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": shortId,
			"type": "backlogItem",
			"productId": _id,
			"parentId": "root",
			"team": "not assigned yet",
			"level": PRODUCTLEVEL,
			"state": 2,
			"reqarea": null,
			"title": "First product",
			"followers": [],
			"description": window.btoa(""),
			"acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
			"priority": 0,
			"comments": [{
				"ignoreEvent": 'comments initiated',
				"timestamp": 0,
				"distributeEvent": false
			}],
			// do not distribute this event; other users have no access rights yet
			"history": [{
				"createEvent": [PRODUCTLEVEL, dbName, 1],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: newDoc
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createFirstProduct: Product with _id ' + _id + ' is created' })
			dispatch('addProductToUser', { dbName, productId: _id, userRoles: ['*'] })
		}).catch(error => {
			let msg = 'createFirstProduct: Could not create document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
