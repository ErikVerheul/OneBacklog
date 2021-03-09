import { LEVEL, MISC } from '../../constants.js'
import { createId } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const actions = {
	/*
	* Order of execution:
	* 0. initUserDb - one time initialization of the user database when the Couchdb instance is created
	* 1. createDatabases - also calls setDatabasePermissions and createUserIfNotExistent and set isDatabaseInitiated to false
	* 2. createLog
	* 3. createConfig
	* 4. installDesignViews
	* 5. installDesignFilters
	* 6. createRootDoc & createReqAreasParent
	* 7. createDefaultTeam
	* 8. createFirstProduct
	* 9. assignProductToUser in useracc.js and set isDatabaseInitiated to true when successful
	* 10. createMessenger
	*/

	initUserDb({
		rootState
	}) {
		// allow the admin roles to access the _users database (the _users db is shared over all databases in a Couchdb instance)
		const dbPermissions = {
			admins: {
				names: [],
				roles: ['assistAdmin', 'admin', '_admin']
			},
			members: {
				names: [],
				roles: []
			}
		}
		globalAxios({
			method: 'PUT',
			url: '_users/_security',
			data: dbPermissions
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, database permissions for the _users database are set' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Failure, could not set permissions on the _users database, ' + error })
		})

		// install a view on the _users database
		globalAxios({
			method: 'PUT',
			url: '_users/_design/Users',
			data: {
				views: {
					/* List all users with their current db and team name */
					"list-all": {
						map: `function(doc) {
							var myTeam = doc.myDatabases[doc.currentDb].myTeam
							if (!doc.delmark) emit(doc._id, [doc.currentDb, myTeam]);
						}`
					},
					/* Filter on removed items of any type, then emit the product _rev of the removed documents. */
					"removed": {
						map: 'function (doc) {if (doc.delmark || doc._deleted) emit(doc._rev, 1);}'
					},
				},
				language: 'javascript'
			}
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, the view on the _users database is created' })
		}).catch(error => {
			if (error.response && error.response.status === 409) {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, the view on the _users database already exits' })
			} else
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Failure, cannot create the view on the _users database, ' + error })
		})
	},

	createDatabase({
		rootState,
		dispatch
	}, payload) {
		rootState.isDatabaseInitiated = false
		rootState.backendMessages = []
		globalAxios({
			method: 'PUT',
			url: payload.dbName
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDatabase: Success, empty database ' + payload.dbName + ' is created' })
			dispatch('setDatabasePermissions', payload)
			dispatch('createLog', payload)
			if (payload.createUser) {
				const userData = {
					name: rootState.userData.user,
					roles: ['admin'],
					type: 'user',
					email: payload.email,
					currentDb: payload.dbName,
					myDatabases: {
						[payload.dbName]: {
							myTeam: 'not assigned yet',
							subscriptions: [],
							productsRoles: {}
						}
					}
				}
				dispatch('createUserAction', userData)
			}
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDatabase: Failed to create ' + payload.dbName + ', ' + error })
		})
	},

	setDatabasePermissions({
		rootState
	}, payload) {
		// set the persmissions on the database holding the documents
		const dbPermissions = {
			admins: {
				names: [],
				roles: ['admin']
			},
			members: {
				names: [],
				roles: ['assistAdmin', 'PO', 'APO', 'developer', 'guest']
			}
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_security',
			data: dbPermissions
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Success, database permissions for ' + payload.dbName + ' are set' })
			if (payload.reportRestoreSuccess) {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Success, the database restore is ready' })
				rootState.isRestoreReady = true
			}
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Failure, could not set permissions on database ' + payload.dbName + ', ' + error })
		})
	},

	createLog({
		rootState,
		dispatch
	}, payload) {
		const logDoc = {
			_id: 'log',
			type: 'logging',
			entries: [
				{
					event: 'Log initialization',
					level: 'INFO',
					by: rootState.userData.user,
					timestamp: Date.now()
				}
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
			_id: 'config',
			type: 'config',
			changedBy: 'Erik',
			changeDate: 1594020747501,

			itemType: [
				'RequirementArea',
				'Database',
				'Product',
				'Epic',
				'Feature',
				'PBI',
				'Task'
			],

			ItemTypeDefinitions: [
				'A requirement area is a categorization of the requirements leading to a different view of the Product Backlog',
				'Teams work on products rather than projects. A product has a life cycle from creation to eventually replacement',
				'An Epic is a major contribution to the product realisation and usually far to big to do in one sprint',
				'A Feature is a product enhancement usually recognizable and appricated bij the customer or user',
				'A Product Backlog Item is any piece of work which can be done within one sprint by one team. See also the subtypes',
				'A task is a piece of work to get the PBI done. Tasks are defined at the start of a sprint.'
			],

			itemState: [
				'not in use',
				'On hold',
				'New',
				'Ready',
				'In progress',
				'Ready for test/review',
				'Done'
			],
			taskState: [
				'not in use',
				'On hold',
				'ToDo',
				'ToDo',
				'In progress',
				'Ready for test/review',
				'Done'
			],

			itemStateDefinitions: [
				'The state New means that the item is created but not yet Ready for realization in a sprint. Further refinement is needed',
				'The state Ready means that the item is understood well enough by the team for realization in a sprint',
				"The state 'In progress' means that the item is worked on in a (past) sprint",
				"The state 'On hold' means that work at the item has stopped and will be resumed later or cancelled and Removed from the backlog",
				'The state Done means that the item is ready for deployment and meets all criteria set by the definition of done'
			],

			tsSize: [
				'XXL',
				'XL',
				'L',
				'M',
				'S',
				'XS',
				'XXS'
			],
			tsSizeDefinitions: [
				'Extra-extra large effort involved',
				'Extra large effort involved',
				'Large effort involved',
				'Medium effort involved',
				'Small effort involved',
				'Extra small effort involved',
				'Almost none effort involved'
			],

			// For now the subtype field is used only for pbi's
			subtype: [
				'User story',
				'Spike',
				'Defect'
			],
			subtypeDefinitions: [
				"The product backog item of type 'User story' is the regular type as described in the Scrum guide",
				'The product backog item of type Spike is an effort, limited in a set number of hours, to do an investigation. The purpose of that investigation is to be able to understand and estimate future work better',
				'The product backog item of type Defect is an effort to fix a breach with the functional or non-functional acceptance criteria. The defect was undetected in the sprint test suites or could not be fixed before the sprint end'
			]
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
		// install views on the database holding the documents
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_design/design1',
			data: {
				views: {
					/* Filter on items with assigned requirement area */
					assignedToReqArea: {
						map: `function(doc) {
							if (doc.type == "backlogItem" && !doc.delmark && doc.reqarea) emit(doc.reqarea, 1);
						}`
					},
					/*
					 * Sort on productId first to separate items from different products. Sort on level to build the intem tree top down.
					 * Select the 'backlogitem' document type and skip removed documents.
					 * History items older than one hour or of type 'ignoreEvent' are removed but at least one item (the most recent) must be selected.
					 */
					details: {
						map: `function(doc) {
							if (doc.type == "backlogItem" && !doc.delmark) emit([doc.productId, doc.level, doc.priority * -1],
								[doc.reqarea, doc.parentId, doc.state, doc.title, doc.team, doc.subtype, doc.dependencies, doc.conditionalFor, doc.history[0], doc.comments[0], doc.color, doc.sprintId,
								doc.lastAttachmentAddition, doc.lastChange, doc.lastCommentAddition, doc.lastCommentToHistory, doc.lastContentChange, doc.lastPositionChange, doc.lastStateChange]);
						}`
					},
					/* Filter on parentIds to map documents to their parent */
					docToParentMap: {
						map: `function(doc) {
							if (doc.type == "backlogItem" && !doc.delmark) emit([doc.parentId, doc.priority * -1]);
						}`
					},
					/* Filter up to and including the feature level */
					overview: {
						map: `function(doc) {
							const pbiLevel = 5
							if (doc.type == "backlogItem" && !doc.delmark && doc.level < pbiLevel) emit([doc.productId, doc.level, doc.priority * -1],
								[doc.reqarea, doc.parentId, doc.state, doc.title, doc.team, doc.subtype, doc.dependencies, doc.conditionalFor, doc.history[0], doc.comments[0], doc.color, doc.sprintId,
								doc.lastAttachmentAddition, doc.lastChange, doc.lastCommentAddition, doc.lastCommentToHistory, doc.lastContentChange, doc.lastPositionChange, doc.lastStateChange]);
						}`
					},
					/* Filter and sort documents by team. */
					ownedByTeam: {
						map: 'function (doc) {if (doc.type == "backlogItem" && !doc.delmark && doc.team) emit(doc.team, 1);}'
					},
					/* Filter on document type 'backlogItem' but skip the dummy req areas product, then emit the product id and title. */
					products: {
						map: `function(doc) {
							const productLevel = 2
							if (doc.type == "backlogItem" && !doc.delmark && doc.level === productLevel && doc._id !== "requirement-areas") emit(doc._id, doc.title);
						}`
					},
					/* Filter on removed items of any type, then emit the product _rev of the removed documents. */
					removed: {
						map: 'function (doc) {if (doc.delmark || doc._deleted) emit(doc._rev, 1);}'
					},
					/* Filter on delmark and parentId to map removed documents to their parent in order of priority */
					removedDocToParentMap: {
						map: `function(doc) {
							if (doc.type == "backlogItem" && doc.delmark) emit([doc.delmark, doc.parentId, doc.priority * -1]);
						}`
					},
					/* Filter on document type 'backlogItem', then sort on shortId. */
					shortIdFilter: {
						map: `function(doc) {
							const databaseLevel = 1
							if (doc.type == "backlogItem" && doc.level > databaseLevel) emit([doc._id.slice(-5)], 1);
						}`
					},
					/* Filter on document type 'backlogItem', then emit sprintId, team level and (minus) priority to load the tasks in order as represented in the tree view */
					sprints: {
						map: `function(doc) {
							const pbiLevel = 5
							if (doc.type == "backlogItem" && !doc.delmark && doc.level >= pbiLevel && doc.sprintId) emit([doc.sprintId, doc.team, doc.productId, doc.parentId, doc.level, doc.priority * -1], [doc.title, doc.subtype, doc.state, doc.spsize, doc.taskOwner]);
						}`
					},
					/* Filter on tasks assigned to sprints not done */
					tasksNotDone: {
						map: `function(doc) {
							const taskLevel = 6
							const doneSate = 6
							if (doc.type == "backlogItem" && !doc.delmark && doc.level === taskLevel && doc.sprintId && doc.state < doneSate) emit([doc.team, doc.sprintId, doc.productId, doc.parentId, doc.priority * -1], doc._id);
						}`
					},
					/* Filter on teams */
					teams: {
						map: `function(doc) {
							if (doc.type ==='team' && !doc.delmark) emit(doc.teamName, doc.members);
						}`
					}
				},
				/* Filter on unremovedMark and parentId to map unremoved documents to their parent in order of priority */
				unremovedDocToParentMap: {
					map: `function(doc) {
							if (doc.type == "backlogItem" && doc.unremovedMark) emit([doc.unremovedMark, doc.parentId, doc.priority * -1]);
						}`
				},
				language: 'javascript'
			}
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignViews: Success, the views on database ' + payload.dbName + ' are created' })
			dispatch('installDesignFilters', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignViews: Failure, cannot create the views on database ' + payload.dbName + ', ' + error })
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
				filters: {
					/* Filter on changes with subscribed followers */
					email_filter: 'function(doc, req) { return doc.type === \'backlogItem\' && (doc.followers && doc.followers.length > 0) }',
					/* Filter on changes to backlog items that changed with an event tagged for distribution */
					sync_filter: "function(doc, req) { return doc.type === 'backlogItem' && (doc.comments[0].distributeEvent && doc.comments[0].timestamp > doc.history[0].timestamp || doc.history[0].distributeEvent && doc.comments[0].timestamp <= doc.history[0].timestamp) }"
				},
				language: 'javascript'
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
		const doc = {
			_id: 'root',
			type: 'backlogItem',
			level: LEVEL.DATABASE,
			state: 2,
			title: 'The root of all products in this database',
			team: 'server admins',
			followers: [],
			description: window.btoa('<p>Database root document</p>'),
			acceptanceCriteria: window.btoa('<p>not applicable</p>'),
			priority: 0,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			// do not distribute this event; other users have no access rights yet
			history: [{
				createRootEvent: [payload.dbName],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}]
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/root',
			data: doc
		}).then(() => {
			dispatch('createDefaultTeam', payload.dbName)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Success, the root document is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Failure, cannot create the root document, ' + error })
		})
	},

	createDefaultTeam({
		rootState,
		dispatch
	}, dbName) {
		const _id = createId()
		const defaultTeam = 'not assigned yet'
		// create a new document and store it
		const newDoc = {
			_id: _id,
			type: 'team',
			teamName: defaultTeam,
			members: [],
			history: [
				{
					teamCreationEvent: [defaultTeam],
					by: rootState.userData.user,
					timestamp: Date.now(),
					distributeEvent: false
				}]
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: newDoc
		}).then(() => {
			dispatch('createFirstProduct', dbName)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDefaultTeam: Success, default team with _id ' + _id + ' is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDefaultTeam: Failure, cannot create the default team, ' + error })
		})
	},

	createReqAreasParent({
		rootState
	}, payload) {
		// create parent document
		const doc = {
			_id: 'requirement-areas',
			type: 'backlogItem',
			parentId: 'root',
			team: 'n/a',
			level: 2,
			subtype: null,
			state: 2,
			tssize: 1,
			spsize: null,
			spikepersonhours: 0,
			title: 'Requirement areas overview',
			followers: [],
			description: window.btoa('<p>To insert one or more requirement areas inside this node right-click on this nodes title in the tree view.</p>'),
			acceptanceCriteria: window.btoa('<p>n/a</p>'),
			priority: 0,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			// do not distribute this event; other users have no access rights yet
			history: [{
				createRootEvent: [payload.dbName],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}]
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + MISC.AREA_PRODUCTID,
			data: doc
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
		const _id = createId()
		const title = 'First product'
		// create a new document and store it
		const doc = {
			_id: _id,
			type: 'backlogItem',
			productId: _id,
			parentId: 'root',
			team: 'not assigned yet',
			level: LEVEL.PRODUCT,
			state: 2,
			reqarea: null,
			title,
			followers: [],
			description: window.btoa(''),
			acceptanceCriteria: window.btoa('<p>Please do not neglect</p>'),
			priority: 0,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			// do not distribute this event; other users have no access rights yet
			history: [{
				createEvent: [LEVEL.PRODUCT, 'root', 1],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}]
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: doc
		}).then(() => {
			const newProductOption = {
				value: _id,
				text: title
			}
			// add the new product to the current user's profile without assigning roles
			dispatch('assignProductToUser', { dbName, selectedUser: rootState.userData.user, newProductOption, userRoles: [] })
			dispatch('createMessenger', dbName)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createFirstProduct: Success, product with _id ' + _id + ' is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createFirstProduct: Failure, cannot create first product, ' + error })
		})
	},

	createMessenger({
		rootState
	}, dbName) {
		const _id = 'messenger'
		// create a new document and store it
		const newDoc = {
			_id: 'messenger',
			type: 'backlogItem',
			title: 'A dummy backlogIten to pass messages to other users. The first element of the history array is used to pass the event to all other open sessions',
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
					distributeEvent: false
				}
			],
			history: [
				{
					ignoreEvent: ['messenger'],
					distributeEvent: false
				}
			]
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: newDoc
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createMessenger: Success, messenger document is created' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createMessenger: Failure, cannot create messenger document, ' + error })
		})
	}
}

export default {
	actions
}
