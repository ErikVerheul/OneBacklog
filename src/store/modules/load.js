import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

import router from '../../router'

var batch = []
const INFO = 0
const WARNING = 1
const ERROR = 2
const AREALEVEL = 0
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var parentNodes = {}

function setChangeTimestamps(doc) {
	// search history for the last changes within the last hour
	let lastPositionChange = 0
	let lastStateChange = 0
	let lastContentChange = 0
	let lastCommentAddition = 0
	let lastAttachmentAddition = 0
	let lastCommentToHistory = 0
	let nodeUndoMoveEventWasIssued = false
	for (let histItem of doc.history) {
		if (Date.now() - histItem.timestamp > HOURINMILIS) {
			// skip events longer than a hour ago
			break
		}
		const event = Object.keys(histItem)[0]
		// get the most recent change of position
		if (lastPositionChange === 0 && event === 'nodeDroppedEvent') {
			if (!nodeUndoMoveEventWasIssued) {
				lastPositionChange = histItem.timestamp
				nodeUndoMoveEventWasIssued = false
			} else {
				lastPositionChange = 0
			}
		}
		// reset the timestamp when undoing the change of position
		if (event === 'nodeUndoMoveEvent') {
			nodeUndoMoveEventWasIssued = true
		}
		// get the most recent change of state
		if (lastStateChange === 0 && (event === 'setStateEvent') || event === 'createEvent') {
			lastStateChange = histItem.timestamp
		}
		// get the most recent change of content
		if (lastContentChange === 0 && (event === 'setTitleEvent') || event === 'descriptionEvent' || event === 'acceptanceEvent') {
			lastContentChange = histItem.timestamp
		}
		// get the most recent addition of comments to the history
		if (lastAttachmentAddition === 0 && event === 'uploadAttachmentEvent') {
			lastAttachmentAddition = histItem.timestamp
		}
		// get the most recent addition of comments to the history
		if (lastCommentToHistory === 0 && event === 'commentToHistoryEvent') {
			lastCommentToHistory = histItem.timestamp
		}
	}
	// get the last time a comment was added; comments have their own array
	if (doc.comments && doc.comments.length > 0) {
		lastCommentAddition = doc.comments[0].timestamp
	}
	return {
		lastPositionChange,
		lastStateChange,
		lastContentChange,
		lastCommentAddition,
		lastAttachmentAddition,
		lastCommentToHistory
	}
}

const state = {
	treeNodes: [],
	docsCount: 0,
	itemsCount: 0,
	orphansCount: 0,
	currentDefaultProductId: null,
	currentProductId: null,
	productIdLoading: null,
	processedProducts: 0,
	currentProductTitle: "",
	rangeString: '',
	orphansFound: { userData: null, orphans: [] }
}

const getters = {
	/*
	* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
	* Note that the AreaPO level is 0 and root of the tree starts with level 1.
	* Note that admins and guests have no write permissions.
	* See documentation.txt for the role definitions.
	*
	* Note that rootState MUST be the third argument. The fourth argument is rootGetters.
	*/
	haveWritePermission(state, getters, rootState, rootGetters) {
		let levels = []
		for (let i = AREALEVEL; i <= PBILEVEL; i++) {
			// initialize with false
			levels.push(false)
		}
		if (rootState.userData.userAssignedProductIds.includes(state.currentProductId)) {
			// assing specific write permissions for the current product only if that product is assigned the this user
			let myCurrentProductRoles = rootState.userData.myProductsRoles[state.currentProductId]
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(`haveWritePermission: For productId ${state.currentProductId} my roles are ${myCurrentProductRoles}`)
			if (!myCurrentProductRoles || myCurrentProductRoles.length === 0) {
				// my roles are not defined -> no write permission on any level
				return levels
			}

			if (myCurrentProductRoles.includes('areaPO')) {
				levels[AREALEVEL] = true
				levels[FEATURELEVEL] = true
			}

			if (myCurrentProductRoles.includes('PO')) {
				levels[EPICLEVEL] = true
				levels[FEATURELEVEL] = true
				levels[PBILEVEL] = true
			}
			if (myCurrentProductRoles.includes('developer')) {
				levels[FEATURELEVEL] = true
				levels[PBILEVEL] = true
			}
		}
		// assign specific write permissions to any product even if that product is not assigned to this user
		if (rootGetters.isSuperPO) {
			levels[PRODUCTLEVEL] = true
			levels[EPICLEVEL] = true
		}

		if (rootGetters.isServerAdmin) {
			levels[DATABASELEVEL] = true
		}
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log(`haveWritePermission: My write levels are [AREALEVEL, DATABASELEVEL, PRODUCTLEVEL, EPICLEVEL, FEATURELEVEL, PBILEVEL]: ${levels}`)
		return levels
	},
}

const mutations = {
	composeRangeString(state) {
		state.rangeString = 'startkey=["' + state.productIdLoading + '",0]&endkey=["' + state.productIdLoading + '",' + (PBILEVEL + 1) + ']'
	},

	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view
	 * The root and the top level product nodes are not draggable
	 */
	processProduct(state, userAssignedProductIds) {
		for (let b of batch) {
			let doc = b.doc
			state.docsCount++
			// load the items of the products the user is authorized to
			if (userAssignedProductIds.includes(doc.productId)) {
				const level = doc.level
				const parentId = doc.parentId
				// expand the tree up to the feature level
				let isExpanded = doc.level < FEATURELEVEL
				// select the default product
				const isSelected = doc._id === state.currentDefaultProductId
				const isDraggable = level > PRODUCTLEVEL
				// show the product level nodes and all nodes of the current default product
				const doShow = doc.level <= PRODUCTLEVEL || doc.productId === state.currentDefaultProductId
				if (doc.productId !== state.currentDefaultProductId && doc.level === PRODUCTLEVEL) isExpanded = false
				if (parentNodes[parentId] !== undefined) {
					const parentNode = parentNodes[parentId]
					const ind = parentNode.children.length
					const parentPath = parentNode.path
					const path = parentPath.concat(ind)
					const changeTimes = setChangeTimestamps(doc)

					let newNode = {
						path,
						pathStr: JSON.stringify(path),
						ind,
						level: path.length,
						productId: doc.productId,
						parentId,
						_id: doc._id,
						shortId: doc.shortId,
						dependencies: doc.dependencies || [],
						conditionalFor: doc.conditionalFor || [],
						title: doc.title,
						isLeaf: level === PBILEVEL,
						children: [],
						isExpanded,
						savedIsExpanded: isExpanded,
						isSelectable: true,
						isDraggable,
						isSelected,
						doShow,
						savedDoShow: doShow,
						data: {
							priority: doc.priority,
							state: doc.state,
							inconsistentState: false,
							team: doc.team,
							lastPositionChange: changeTimes.lastPositionChange,
							lastStateChange: changeTimes.lastStateChange,
							lastContentChange: changeTimes.lastContentChange,
							lastCommentAddition: changeTimes.lastCommentAddition,
							lastAttachmentAddition: changeTimes.lastAttachmentAddition,
							lastCommentToHistory: changeTimes.lastCommentToHistory,
							subtype: doc.subtype,
							lastChange: Date.now()
						}
					}

					state.itemsCount++

					parentNode.children.push(newNode)
					parentNodes[doc._id] = newNode
				} else {
					state.orphansCount++
					state.orphansFound.orphans.push({ id: doc._id, parentId, productId: doc.productId })
					// eslint-disable-next-line no-console
					console.log('processProduct: orphan found with _id = ' + doc._id + ', parentId = ' + parentId + ' and productId = ' + doc.productId)
				}
			}
		}
		state.processedProducts++
	}
}

const actions = {
	/*
	* Order of execution:
	* 1. getDatabases
	* 2. getOtherUserData
	* 3. getAllProducts - calls updateUser if databases or products are missing
	* 4. getConfig
	* 5. getRoot
	* 6. loadCurrentProduct
	* 7. getFirstProduct - opens the products view - starts listenForChanges if no other products
	* 8. getNextProduct - starts listenForChanges if not already started
	*/

	/* Get all non-backup or system database names */
	getDatabases({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: '/_all_dbs',
		}).then(res => {
			const foundDbNames = []
			for (let dbName of res.data) {
				if (!dbName.startsWith('_') && !dbName.includes('backup')) foundDbNames.push(dbName)
			}
			dispatch('getOtherUserData', foundDbNames)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getDatabases: Database names are loaded: ' + foundDbNames)
		}).catch(error => {
			let msg = 'getDatabases: Could not load the database names. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get the current DB name etc for this user. Note that the user global roles are already fetched */
	getOtherUserData({
		rootState,
		dispatch
	}, foundDbNames) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.userData.user,
		}).then(res => {
			let allUserData = res.data
			// check if the default user database exists
			if (!foundDbNames.includes(allUserData.currentDb)) {
				alert('getOtherUserData: FATAL ERROR - default user database ' + allUserData.currentDb + ' does not exist!')
				return
			}
			// check if the user has productsroles defined for the default database
			if (!Object.keys(allUserData.myDatabases).includes(allUserData.currentDb)) {
				alert('getOtherUserData: FATAL ERROR - no roles defined for default user database ' + allUserData.currentDb)
				return
			}
			// correct the profile for removed databases, if any
			rootState.userData.myDatabases = []
			for (let name of Object.keys(allUserData.myDatabases)) {
				if (!foundDbNames.includes(name)) {
					delete allUserData.myDatabases[name]
				} else rootState.userData.myDatabases.push(name)
			}
			rootState.userData.currentDb = allUserData.currentDb
			rootState.userData.email = allUserData.email
			const currentDbSettings = allUserData.myDatabases[allUserData.currentDb]
			rootState.userData.myTeam = currentDbSettings.myTeam
			rootState.userData.myFilterSettings = allUserData.filterSettings
			dispatch('watchdog')
			let msg = "getOtherUserData: '" + rootState.userData.user + "' has logged in"
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			// now that the database is known the log file is available
			dispatch('doLog', { event: msg, level: INFO })
			dispatch('getAllProducts', { dbName: rootState.userData.currentDb, allUserData, currentDbSettings })
		}).catch(error => {
			if (error.response.status === 404) {
				// the user profile does not exist; if online start one time initialization of a new database if a server admin signed in
				if (rootState.online && rootState.userData.sesionRoles.includes("_admin")) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('Server admin logged in but has no profile in users database. Start init')
					rootState.showHeaderDropDowns = false
					router.push('/init')
					return
				}
			}
			let msg = 'getOtherUserData: Could not read user date for user ' + rootState.userData.user + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get all products of the current database and correct the data from the user profile with the actual available products */
	getAllProducts({
		rootState,
		state,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/products',
		}).then(res => {
			const currentProductsEnvelope = res.data.rows
			const availableProductIds = []
			// correct the data from the user profile with the actual available products
			for (let product of currentProductsEnvelope) {
				let id = product.id
				availableProductIds.push(id)
				// can only have productsRoles of products that are available
				if (Object.keys(payload.currentDbSettings.productsRoles).includes(id)) {
					rootState.userData.myProductsRoles[id] = payload.currentDbSettings.productsRoles[id]
				}
			}
			let screenedSubscriptions = []
			for (let p of payload.currentDbSettings.subscriptions) {
				if (availableProductIds.includes(p)) {
					screenedSubscriptions.push(p)
				}
			}
			if (screenedSubscriptions.length === 0) {
				// if no default is set assign the first defined product from the productsRoles
				screenedSubscriptions = [Object.keys(payload.currentDbSettings.productsRoles)[0]]
			}
			rootState.userData.myProductSubscriptions = screenedSubscriptions

			// set the users product options to select from
			for (let product of currentProductsEnvelope) {
				if (Object.keys(payload.currentDbSettings.productsRoles).includes(product.id)) {
					rootState.myProductOptions.push({
						value: product.id,
						text: product.value
					})
				}
			}
			// update the user profile for missing products
			const missingProductRolesIds = []
			for (let id of Object.keys(payload.currentDbSettings.productsRoles)) {
				if (!availableProductIds.includes(id)) {
					missingProductRolesIds.push(id)
				}
			}
			if (rootState.autoCorrectUserProfile) {
				let newUserData = payload.allUserData
				for (let id of missingProductRolesIds) {
					delete newUserData.myDatabases[rootState.userData.currentDb].productsRoles[id]
				}
				for (let id of missingProductRolesIds) {
					const position = newUserData.myDatabases[rootState.userData.currentDb].subscriptions.indexOf(id)
					if (position !== -1) newUserData.myDatabases[rootState.userData.currentDb].subscriptions.splice(position, 1)
				}
				dispatch('updateUser', { data: newUserData })
			}
			if (rootState.userData.myProductsRoles && Object.keys(rootState.userData.myProductsRoles).length > 0) {
				rootState.isProductAssigned = true
				rootState.userData.userAssignedProductIds = Object.keys(rootState.userData.myProductsRoles)
				// the first (index 0) product in myProductSubscriptions is by definition the default product
				state.currentDefaultProductId = rootState.userData.myProductSubscriptions[0]
			}
			// postpone the warning message for 'no product found' until the configuration is loaded
			dispatch('getConfig')
		}).catch(error => {
			let msg = 'getAllProducts: Could not find products in database ' + rootState.userData.currentDb + '. Error = ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load the config document from this database */
	getConfig({
		rootState,
		rootGetters,
		dispatch,
		commit
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
		}).then(res => {
			rootState.configData = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The configuration is loaded')
			if (!rootState.isProductAssigned) {
				if (rootGetters.isServerAdmin) { router.replace('/serveradmin') } else
					if (rootGetters.isSuperPO) { router.replace('/superpo') } else
						if (rootGetters.isAreaPO) { router.replace('/adareapo') } else
							if (rootGetters.isAdmin) { router.replace('/admin') } else {
								alert("Error: No default product is set. Consult your adminstrator. The application will exit.")
								commit('resetData', null, { root: true })
								router.replace('/')
							}
			} else
				dispatch('getRoot')
		}).catch(error => {
			let msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get the root of the backlog items */
	getRoot({
		rootState,
		dispatch,
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/root',
		}).then(res => {
			rootState.currentDoc = res.data
			// decode from base64 + replace the encoded data
			rootState.currentDoc.description = window.atob(res.data.description)
			rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
			// prepare for loading the first batch; create the root node
			state.treeNodes = [
				{
					"path": [0],
					"pathStr": '[0]',
					"ind": 0,
					"level": 1,
					"productId": res.data._id,
					"parentId": null,
					"_id": 'root',
					"shortId": "0",
					"dependencies": [],
					"conditionalFor": [],
					"title": res.data.title,
					"isLeaf": false,
					"children": [],
					"isExpanded": true,
					"savedIsExpanded": true,
					"isSelectable": true,
					"isDraggable": false,
					"isSelected": false,
					"doShow": true,
					"savedDoShow": true,
					"data": {
						"state": res.data.state,
						"team": res.data.team,
						"priority": res.data.priority,
						"lastChange": 0
					}
				},
			]
			parentNodes.root = state.treeNodes[0]
			// load the current product document
			dispatch('loadCurrentProduct')
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log("The root document is read")
		}).catch(error => {
			let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
			if (error.response.status === 404) {
				msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load current user product and start loading the tree */
	loadCurrentProduct({
		rootState,
		state,
		commit,
		dispatch
	}) {
		let _id = state.currentDefaultProductId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			state.currentProductId = _id
			state.currentProductTitle = res.data.title
			rootState.currentDoc = res.data
			// decode from base64 + replace the encoded data
			rootState.currentDoc.description = window.atob(res.data.description)
			rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadCurrentProduct: product document with _id ' + _id + ' is loaded from database ' + rootState.userData.currentDb)
			// initialize load parameters in case getFirstProduct is called without signing out first
			batch = []
			state.docsCount = 0
			state.itemsCount = 0
			state.orphansCount = 0
			// set the range of the documents to load
			state.productIdLoading = state.currentDefaultProductId
			commit('composeRangeString')
			dispatch('getFirstProduct')
		}).catch(error => {
			let msg = `loadCurrentProduct: Could not read current product document with id ${_id} from database ${rootState.userData.currentDb}`
			if (!error.response || error.response.status === 404) {
				msg += `, is your default product deleted?`
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load next products from the database */
	getNextProduct({
		rootState,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/sortedFilter?' + state.rangeString + '&include_docs=true',
		}).then(res => {
			batch = res.data.rows
			commit('processProduct', rootState.userData.userAssignedProductIds)
			commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
			// log any detected orphans if present
			if (state.orphansFound.orphans.length > 0) {
				for (let o of state.orphansFound.orphans) {
					const msg = 'Orphan found with Id = ' + o.id + ', parentId = ' + o.parentId + ' and  productId = ' + o.productId
					let newLog = {
						"event": msg,
						"level": "CRITICAL",
						"by": state.orphansFound.userData.user,
						"timestamp": Date.now(),
						"timestampStr": new Date().toString()
					}
					rootState.logState.unsavedLogs.push(newLog)
				}
			}
			// process other products here
			if (rootState.userData.myProductSubscriptions.length > 1 && state.processedProducts < rootState.userData.myProductSubscriptions.length) {
				state.productIdLoading = rootState.userData.myProductSubscriptions[state.processedProducts]
				commit('composeRangeString')
				dispatch('getNextProduct')
			} else {
				// do not start again after sign-out/in
				if (!rootState.listenForChangesRunning) {
					dispatch('listenForChanges')
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getNextProduct: listenForChanges started')
				}
				// reset load parameters
				parentNodes = {}
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('Another product of ' + batch.length + ' documents is loaded')
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getNextProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	/* Load the current product first */
	getFirstProduct({
		rootState,
		state,
		commit,
		dispatch
	}) {
		// add a reference to the userData for logging
		state.orphansFound.userData = rootState.userData
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/sortedFilter?' + state.rangeString + '&include_docs=true',
		}).then(res => {
			batch = res.data.rows
			commit('processProduct', rootState.userData.userAssignedProductIds)
			commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
			// log any detected orphans if present
			if (state.orphansFound.orphans.length > 0) {
				for (let o of state.orphansFound.orphans) {
					const msg = 'Orphan found with Id = ' + o.id + ', parentId = ' + o.parentId + ' and  productId = ' + o.productId
					let newLog = {
						"event": msg,
						"level": "CRITICAL",
						"by": state.orphansFound.userData.user,
						"timestamp": Date.now(),
						"timestampStr": new Date().toString()
					}
					rootState.logState.unsavedLogs.push(newLog)
				}
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('Current product with ' + batch.length + ' documents is loaded')
			// process other products here
			if (rootState.userData.myProductSubscriptions.length > 1 && state.processedProducts < rootState.userData.myProductSubscriptions.length) {
				state.productIdLoading = rootState.userData.myProductSubscriptions[state.processedProducts]
				commit('composeRangeString')
				dispatch('getNextProduct')
			} else {
				// current product is read, there are no other products; do not start listenForChanges again after sign-out/in
				if (!rootState.listenForChangesRunning) {
					dispatch('listenForChanges')
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getFirstProduct: listenForChanges started')
				}
				// reset load parameters
				parentNodes = {}
			}
			router.push('/product')
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getFirstProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	/* Load a backlog item by short id */
	loadItemByShortId({
		rootState,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = '/_design/design1/_view/shortIdFilter?startkey=["' + shortId + '"]&endkey=["' + shortId + '"]&include_docs=true'
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr,
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (rootState.userData.userAssignedProductIds.includes(doc.productId)) {
					if (rows.length === 1) {
						commit('showLastEvent', { txt: `The document with id ${shortId} is found but not in your view. Did you select the product?`, severity: WARNING })
					} else {
						commit('showLastEvent', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed.`, severity: INFO })
						let ids = ''
						for (let i = 0; i < rows.length; i++) {
							ids += rows[i].doc._id + ', '
						}
						const msg = 'Multiple documents found for shortId ' + shortId + ' The documents ids are ' + ids
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log(msg)
						dispatch('doLog', { event: msg, level: WARNING })
					}
					rootState.currentDoc = doc
					// decode from base64 + replace the encoded data
					rootState.currentDoc.description = window.atob(doc.description)
					rootState.currentDoc.acceptanceCriteria = window.atob(doc.acceptanceCriteria)
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('loadItemByShortId: document with _id ' + doc._id + ' is loaded.')
				} else {
					commit('showLastEvent', { txt: `The document with id ${shortId} is found but not in your assigned products.`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with id ${shortId} is NOT found in the database.`, severity: WARNING })
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('loadItemByShortId: Could not read a batch of documents from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	/* Read the parent title before creating the document */
	createDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.newDoc.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const tmpDoc = res.data
			tmpDoc.history.unshift(payload.parentHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			dispatch('saveAndReload', payload.newDoc)
		}).catch(error => {
			let msg = 'createDoc: Could not read parent document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Create the document and reload it to currentDoc */
	saveAndReload({
		rootState,
		dispatch
	}, newDoc) {
		const _id = newDoc._id
		// eslint-disable-next-line no-console
		console.log('saveAndReload: creating document with _id = ' + _id)
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('saveAndReload: document with _id ' + _id + ' is created.')
			dispatch('loadDoc', _id)
		}).catch(error => {
			let msg = 'saveAndReload: Could not create document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load document by _id and make it the current backlog item */
	loadDoc({
		rootState,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			rootState.currentDoc = res.data
			// decode from base64 + replace the encoded data
			rootState.currentDoc.description = window.atob(res.data.description)
			rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with _id ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadDoc: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	state,
	getters,
	mutations,
	actions
}
