import { LEVEL, MISC } from '../../constants.js'
import { uniTob64, createId } from '../../common_functions.js'
import globalAxios from 'axios'

// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

/* Must be CouchDb Server admin to be able to change the a _security object */
const actions = {
	/*
	 * Order of execution:
	 * 0. initCouchDb - set three CouchDb config options first
	 * 1. initUserDb - one time initialization of the user database when the Couchdb instance is created
	 * 2. createDatabase - also calls setDatabasePermissions and createUserIfNotExistentAction and set isDatabaseInitiated to false
	 * 3. createLog
	 * 4. createConfig
	 * 5. installDesignViews
	 * 6. installDesignFilters
	 * 7. createRootDoc & createReqAreasParent
	 * 8. createDefaultTeam
	 * 9. createFirstProduct
	 * 10. assignProductToUserAction in useracc.js and set isDatabaseInitiated to true when successful
	 * 11. createMessenger
	 */

	/* Allow all users to list the database names */
	setConfigAllDbs({ rootState }) {
		globalAxios({
			method: 'PUT',
			url: '/_node/_local/_config/chttpd/admin_only_all_dbs',
			data: '"false"',
		})
			.then((res) => {
				console.log(res.data)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setConfigAllDbs: Could not update the config. Error = ' + error })
			})
	},

	/* Be conservative considering cross-site requests */
	setConfigSameSite({ rootState }) {
		globalAxios({
			method: 'PUT',
			url: '/_node/_local/_config/chttpd_auth/same_site',
			data: '"strict"',
		})
			.then((res) => {
				console.log(res.data)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setConfigSameSite: Could not update the config. Error = ' + error })
			})
	},

	/* Allow to modify the _users database security object. Note: deprecated, not available in CouchDb 4.0! */
	setConfigUsersDbSecurityEditable({ rootState }) {
		globalAxios({
			method: 'PUT',
			url: '/_node/_local/_config/couchdb/users_db_security_editable',
			data: '"true"',
		})
			.then((res) => {
				console.log(res.data)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setConfigUsersDbSecurityEditable: Could not update the config. Error = ' + error })
			})
	},

	initCouchDb({ dispatch }) {
		// set three CouchDb config options
		dispatch('setConfigAllDbs')
		dispatch('setConfigSameSite')
		dispatch('setConfigUsersDbSecurityEditable')

		dispatch('initUserDb')
	},

	initUserDb({ rootState }) {
		// allow the admin roles to access the _users database (the _users db is shared over all databases in a Couchdb instance)
		const dbPermissions = {
			admins: {
				names: [],
				roles: ['assistAdmin', 'admin', '_admin'],
			},
			members: {
				names: [],
				roles: [],
			},
		}
		globalAxios({
			method: 'PUT',
			url: '_users/_security',
			data: dbPermissions,
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, database permissions for the _users database are set' })
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Failure, could not set permissions on the _users database, ' + error })
			})

		// install two views on the _users database
		globalAxios({
			method: 'PUT',
			url: '_users/_design/Users',
			data: {
				views: {
					/* List all users with their current db and team name */
					'list-all': {
						map: `function(doc) {
							var myTeam = doc.myDatabases[doc.currentDb].myTeam
							if (!doc.delmark) emit(doc._id, [doc.currentDb, myTeam])
						}`,
					},
					/* Filter on removed items of any type, then emit the product _rev of the removed documents. */
					removed: {
						map: 'function (doc) {if (doc.delmark || doc._deleted) emit(doc._rev, 1)}',
					},
				},
				language: 'javascript',
			},
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, the view on the _users database is created' })
			})
			.catch((error) => {
				if (error.response && error.response.status === 409) {
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Success, the view on the _users database already exits' })
				} else
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'initUserDb: Failure, cannot create the view on the _users database, ' + error })
			})
	},

	/* Create a database with a given name and initialize the log, the config data, the design views and filters etc. */
	createDatabase({ rootState, dispatch }, payload) {
		rootState.isDatabaseInitiated = false
		rootState.backendMessages = []
		globalAxios({
			method: 'PUT',
			url: payload.dbName,
		})
			.then(() => {
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
								productsRoles: {},
							},
						},
					}
					// create a user account for the CouchDb server administrator
					dispatch('createUserAction', userData)
				}
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDatabase: Failed to create ' + payload.dbName + ', ' + error })
			})
	},

	setDatabasePermissions({ rootState, commit }, payload) {
		// set the persmissions on the database holding the documents
		const dbPermissions = {
			admins: {
				names: [],
				roles: ['assistAdmin', 'admin', '_admin'],
			},
			members: {
				names: [],
				roles: ['PO', 'APO', 'developer', 'guest'],
			},
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_security',
			data: dbPermissions,
		})
			.then(() => {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: 'setDatabasePermissions: Success, database permissions for ' + payload.dbName + ' are set',
				})
				if (payload.reportRestoreSuccess) {
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'setDatabasePermissions: Success, the database restore is ready' })
					rootState.isRestoreReady = true
				}
				if (payload.autoSignOut) {
					commit('endSession', 'initdb: setDatabasePermissions')
				}
			})
			.catch((error) => {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: 'setDatabasePermissions: Failure, could not set permissions on database ' + payload.dbName + ', ' + error,
				})
			})
	},

	createLog({ rootState, dispatch }, payload) {
		const logDoc = {
			_id: 'log',
			type: 'logging',
			entries: [
				{
					event: 'Log initialization',
					level: 'INFO',
					by: rootState.userData.user,
					email: rootState.userData.email,
					timestamp: Date.now(),
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/log',
			data: logDoc,
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createLog: Success, log for database ' + payload.dbName + ' is created' })
				dispatch('createConfig', payload)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createLog: Failure, could not create log document, ' + error })
			})
	},

	createConfig({ rootState, dispatch }, payload) {
		/*
		 * The configuration data can change over time with new versions of this program.
		 * Once a database is created it is tightly coupled with the configuration is was created with.
		 */
		const configData = {
			_id: 'config',
			type: 'config',
			changedBy: 'Erik',
			changeDate: 1724012868428,

			itemType: ['RequirementArea', 'Database', 'Product', 'Epic', 'Feature', 'User story', 'Task'],

			ItemTypeDefinitions: [
				'A requirement area is a categorization of the requirements leading to a different view of the Product Backlog',
				'Teams work on products rather than projects. A product has a life cycle from creation to eventually replacement',
				'An Epic is a major contribution to the product realisation and usually far to big to do in one sprint',
				'A Feature is a product enhancement usually recognizable and appricated bij the customer or user',
				'A User story is any piece of work which can be done within one sprint by one team. See also the subtypes',
				'A task is a piece of work to get the PBI done. Tasks are defined at the start of a sprint.',
			],

			itemState: ['state not in use', 'On hold', 'New', 'Ready', 'In progress', 'Ready for test/review', 'Done'],
			taskState: ['state not in use', 'On hold', 'ToDo', 'ToDo', 'In progress', 'Ready for test/review', 'Done'],

			itemStateDefinitions: [
				'The state New means that the item is created but not yet Ready for realization in a sprint. Further refinement is needed',
				'The state Ready means that the item is understood well enough by the team for realization in a sprint',
				"The state 'In progress' means that the item is worked on in a (past) sprint",
				"The state 'On hold' means that work at the item has stopped and will be resumed later or cancelled and Removed from the backlog",
				'The state Done means that the item is ready for deployment and meets all criteria set by the definition of done',
			],

			tsSize: ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
			tsSizeDefinitions: [
				'Extra-extra large effort involved',
				'Extra large effort involved',
				'Large effort involved',
				'Medium effort involved',
				'Small effort involved',
				'Extra small effort involved',
				'Almost none effort involved',
			],

			// For now the subtype field is used only for pbi's
			subtype: ['User story', 'Spike', 'Defect'],
			subtypeDefinitions: [
				"The product backog item of type 'User story' is the regular type as described in the Scrum guide",
				'The product backog item of type Spike is an effort, limited in a set number of hours, to do an investigation. The purpose of that investigation is to be able to understand and estimate future work better',
				'The product backog item of type Defect is an effort to fix a breach with the functional or non-functional acceptance criteria. The defect was undetected in the sprint test suites or could not be fixed before the sprint end',
			],
		}
		globalAxios({
			method: 'POST',
			url: payload.dbName,
			data: configData,
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createConfig: Success, the configuration document is created' })
				dispatch('installDesignViews', payload)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createConfig: Failure, could not create the configuration document, ' + error })
			})
	},

	installDesignViews({ rootState, dispatch }, payload) {
		// install views on the database holding the documents
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_design/design1',
			data: {
				views: {
					/* Filter on items with assigned requirement area */
					assignedTasksToUser: {
						map: `function(doc) {
							const TASKLEVEL = 6
							const DONESTATE = 6
							if (doc.type === "backlogItem" && !doc.delmark && doc.level === TASKLEVEL && doc.taskOwner && doc.state !== DONESTATE) emit([doc.taskOwner], 1)
						}`,
					},
					/* Filter on items with assigned requirement area */
					assignedToReqArea: {
						map: `function(doc) {
							if (doc.type == "backlogItem" && !doc.delmark && doc.reqarea) emit(doc.reqarea, 1)
						}`,
					},
					/*
					 * Sort on productId first to separate items from different products. Sort on level to build the intem tree top down.
					 * Select the 'backlogitem' document type and skip removed documents.
					 * History items older than one hour or of type 'ignoreEvent' are removed but at least one item (the most recent) must be selected.
					 */
					details: {
						map: `function(doc) {
							const PRODUCTLEVEL = 2
							const seq = doc.level === PRODUCTLEVEL ? null : doc.productId
							// negate priority to sort the highest abosolute priority value on top
							if (doc.type == "backlogItem" && !doc.delmark && doc.level) emit([doc.level, seq, -doc.priority],
								[doc.productId, doc.reqarea, doc.parentId, doc.state, doc.title, doc.team, doc.subtype, doc.dependencies, doc.conditionalFor, doc.color, doc.sprintId,
								doc.lastAttachmentAddition, doc.lastChange, doc.lastCommentAddition, doc.lastContentChange, doc.lastPositionChange, doc.lastStateChange])
						}`,
					},
					/* Filter on parentIds to map documents to their parent */
					docToParentMap: {
						map: `function(doc) {
							// use doc.priority to order the results when on the same doc.level
							if (doc.type == "backlogItem" && !doc.delmark) emit([doc.parentId, -doc.priority], 1)
						}`,
					},
					/* Filter on tasks assigned to sprints not done */
					itemsNotDone: {
						map: `function(doc) {
							const PBILEVEL = 5
							const DONESTATE = 6
							if (doc.type == "backlogItem" && !doc.delmark && doc.level >= PBILEVEL && doc.sprintId && doc.state < DONESTATE) emit([doc.team, doc.sprintId, doc.productId, doc.parentId, -doc.priority], doc.level)
						}`,
					},
					/* Filter and sort documents by team. */
					ownedByTeam: {
						map: 'function (doc) {if (doc.type == "backlogItem" && !doc.delmark && doc.team) emit(doc.team, 1)}',
					},
					/* Filter on document type 'backlogItem' but skip the dummy req areas product. Emit the product id and title. */
					products: {
						map: `function(doc) {
							const PRODUCTLEVEL = 2
							if (doc.type == "backlogItem" && !doc.delmark && doc.level === PRODUCTLEVEL && doc._id !== "requirement-areas") emit(doc._id, doc.title)
						}`,
					},
					/* Filter on removed items of any type, then emit the product _rev of the removed documents. */
					removed: {
						map: 'function (doc) {if (doc.delmark || doc._deleted) emit(doc._rev, 1)}',
					},
					/* Filter on delmark and parentId to map removed documents to their parent in order of priority */
					removedDocToParentMap: {
						map: `function(doc) {
							// doc.delmark can be undefined or an id; doc.priority is used to order the results when on the same doc.level
  						if (doc.type == "backlogItem" && doc.delmark) emit([doc.delmark, doc.parentId, -doc.priority])
						}`,
					},
					/* Filter on document type 'backlogItem', then sort on shortId. */
					shortIdFilter: {
						map: `function(doc) {
							const DATABASELEVEL = 1
							if (doc.type == "backlogItem" && doc.level > DATABASELEVEL) emit([doc._id.slice(-5)], 1)
						}`,
					},
					/* Filter on document type 'backlogItem', then emit sprintId, team level and (minus) priority to load the tasks in order as represented in the tree view */
					sprints: {
						map: `function(doc) {
							const PBILEVEL = 5
							if (doc.type == "backlogItem" && !doc.delmark && doc.level >= PBILEVEL && doc.sprintId) emit([doc.sprintId, doc.team, doc.productId, doc.parentId, doc.level, -doc.priority], [doc.title, doc.subtype, doc.state, doc.spsize, doc.spikepersonhours, doc.taskOwner])
						}`,
					},
					/* Filter on teams */
					teams: {
						map: `function(doc) {
							if (doc.type ==='team' && !doc.delmark) emit(doc.teamName, [doc.members, doc.teamCalendar !== undefined, doc.messages || []])
						}`,
					},
					/* Filter on unremovedMark and parentId to map unremoved documents to their parent in order of priority */
					unremovedDocToParentMap: {
						map: `function(doc) {
							// doc.unremovedMark can be undefined or an id; doc.priority is used to order the results when on the same doc.level
  						if (doc.type == "backlogItem" && doc.unremovedMark) emit([doc.unremovedMark, doc.parentId, -doc.priority])
						}`,
					},
				},
				language: 'javascript',
			},
		})
			.then(() => {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: 'installDesignViews: Success, the views on database ' + payload.dbName + ' are created',
				})
				dispatch('installDesignFilters', payload)
			})
			.catch((error) => {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: 'installDesignViews: Failure, cannot create the views on database ' + payload.dbName + ', ' + error,
				})
			})
	},

	installDesignFilters({ rootState, dispatch }, payload) {
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/_design/filters',
			data: {
				filters: {
					/* Filter on changes with subscribed followers */
					email_filter: "function(doc, req) { return doc.type === 'backlogItem' && (doc.followers && doc.followers.length > 0) }",
					/* Filter on changes to backlog items that changed and have history with an event that is not a 'ignoreEvent' and tagged for distribution */
					sync_filter:
						"function(doc, req) { return doc.type === 'backlogItem' && (doc.history && Object.keys(doc.history[0])[0] !== 'ignoreEvent') && doc.history[0].distributeEvent }",
				},
				language: 'javascript',
			},
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignFilters: Success, the design document is created' })
				dispatch('createRootDoc', payload)
				dispatch('createReqAreasParent', payload)
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'installDesignFilters: Failure, cannot create the design document, ' + error })
			})
	},

	createRootDoc({ rootState, dispatch }, payload) {
		// create root document
		const doc = {
			_id: 'root',
			type: 'backlogItem',
			level: LEVEL.DATABASE,
			state: 2,
			title: 'The root of all products in this database',
			team: 'n/a',
			followers: [],
			description: uniTob64('<p>Database root document</p>'),
			acceptanceCriteria: uniTob64('<p>not applicable</p>'),
			priority: 0,
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
				},
			],
			// do not distribute this event; other users have no access rights yet
			history: [
				{
					createRootEvent: [payload.dbName],
					by: rootState.userData.user,
					timestamp: Date.now(),
					isListed: true,
					distributeEvent: false,
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/root',
			data: doc,
		})
			.then(() => {
				dispatch('createDefaultTeam', payload.dbName)
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Success, the root document is created' })
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createRootDoc: Failure, cannot create the root document, ' + error })
			})
	},

	createDefaultTeam({ rootState, dispatch }, dbName) {
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
					distributeEvent: false,
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: newDoc,
		})
			.then(() => {
				dispatch('createFirstProduct', dbName)
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDefaultTeam: Success, default team with _id ' + _id + ' is created' })
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createDefaultTeam: Failure, cannot create the default team, ' + error })
			})
	},

	createReqAreasParent({ rootState }, payload) {
		// create parent document
		const doc = {
			_id: MISC.AREA_PRODUCTID,
			type: 'backlogItem',
			productId: MISC.AREA_PRODUCTID,
			parentId: 'root',
			team: 'n/a',
			level: 2,
			subtype: null,
			state: 2,
			tssize: 1,
			spsize: null,
			spikepersonhours: 0,
			title: 'REQUIREMENT AREAS',
			followers: [],
			description: uniTob64('<p>To insert one or more requirement areas inside this node right-click on this nodes title in the tree view.</p>'),
			acceptanceCriteria: uniTob64('<p>n/a</p>'),
			// do not set a priority, must be null
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
				},
			],
			// do not distribute this event; other users have no access rights yet
			history: [
				{
					createRootEvent: [payload.dbName],
					by: rootState.userData.user,
					timestamp: Date.now(),
					isListed: true,
					distributeEvent: false,
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + MISC.AREA_PRODUCTID,
			data: doc,
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createReqAreasParent: Success, the parent document is created' })
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createReqAreasParent: Failure, cannot create the parent document, ' + error })
			})
	},

	createFirstProduct({ rootState, dispatch }, dbName) {
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
			description: uniTob64(MISC.EMPTYQUILL),
			acceptanceCriteria: uniTob64('<p>Please do not neglect</p>'),
			priority: 0,
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
				},
			],
			// do not distribute this event; other users have no access rights yet
			history: [
				{
					ignoreEvent: ['createFirstProduct'],
					timestamp: Date.now(),
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: doc,
		})
			.then(() => {
				const newProductOption = {
					value: _id,
					text: title,
				}
				// add the new product to the current user's profile without assigning roles
				dispatch('assignProductToUserAction', { dbName, selectedUser: rootState.userData.user, newProductOption, userRoles: [] })
				dispatch('createMessenger', dbName)
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createFirstProduct: Success, product with _id ' + _id + ' is created' })
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createFirstProduct: Failure, cannot create first product, ' + error })
			})
	},

	/*
	 * A dummy backlogIten to pass messages to other users. The first element of the history array is used to pass the event to all other open sessions.
	 * Usage: Load this document, add the field "productId" with value currentProductId and replace the history with the event you want to distribute.
	 */
	createMessenger({ rootState }, dbName) {
		const _id = 'messenger'
		// create a new document and store it
		const newDoc = {
			_id: 'messenger',
			type: 'backlogItem',
			title: 'A dummy backlogIten to pass messages to other users',
			level: 0,
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
				},
			],
			history: [
				{
					ignoreEvent: ['messenger'],
					timestamp: Date.now(),
				},
			],
		}
		globalAxios({
			method: 'PUT',
			url: dbName + '/' + _id,
			data: newDoc,
		})
			.then(() => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createMessenger: Success, messenger document is created' })
				rootState.isDatabaseCreated = true
			})
			.catch((error) => {
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createMessenger: Failure, cannot create messenger document, ' + error })
			})
	},
}

export default {
	actions,
}
