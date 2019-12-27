import globalAxios from 'axios'
//Here ../router/index is imported
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

const state = {
	docsCount: 0,
	itemsCount: 0,
	orphansCount: 0,
	currentDefaultProductId: null,
	currentProductId: null,
	currentProductsEnvelope: [],
	productIdLoading: null,
	processedProducts: 0,
	currentProductTitle: "",
	rangeString: '',
	orphansFound: { userData: null, orphans: [] }
}

const getters = {
	/*
	* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
	* Note that the AreaPO level is 0 and root of the tree starts with level 1
	* Note that rootState MUST be the third argument. The fourth argument is rootGetters.
	*
	* See documentation.txt for the role definitions.
	*/
	haveWritePermission(state, getters, rootState, rootGetters) {
		let levels = []
		// initialize with false
		for (let i = AREALEVEL; i <= PBILEVEL; i++) {
			levels.push(false)
		}
		if (state.currentProductId) {
			if (rootState.userData.userAssignedProductIds.includes(state.currentProductId)) {
				let myRoles = rootState.userData.myProductsRoles[state.currentProductId]
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('haveWritePermission: For productId ' + state.currentProductId + ' my roles are ' + myRoles)

				if (!myRoles) {
					// my roles are not defined
					return []
				}

				if (myRoles.includes('PO')) {
					for (let i = EPICLEVEL; i <= PBILEVEL; i++) {
						levels[i] = true
					}
				}
				if (myRoles.includes('developer')) {
					for (let i = FEATURELEVEL; i <= PBILEVEL; i++) {
						levels[i] = true
					}
				}
			}
		}
		// the user is 'superPO'. A superPO has write permissions in all products
		if (rootGetters.isSuperPO) {
			levels[PRODUCTLEVEL] = true
			levels[EPICLEVEL] = true
		}
		// the user is 'areaPO'. An areaPO has write permissions in all products
		if (rootGetters.isAreaPO) {
			levels[AREALEVEL] = true
			levels[FEATURELEVEL] = true
		}
		// the user is server admin. A server admin can change the root document of the databases
		if (rootGetters.isServerAdmin) {
			levels[DATABASELEVEL] = true
		}
		return levels
	}
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
		const aboutNow = Date.now()
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
					// search history for the last changes within the last hour
					let lastStateChange = 0
					let lastContentChange = 0
					let lastCommentAddition = 0
					let lastAttachmentAddition = 0
					let lastCommentToHistory = 0
					for (let histItem of doc.history) {
						if (aboutNow - histItem.timestamp > HOURINMILIS) {
							// skip events longer than a hour ago
							break
						}
						const keys = Object.keys(histItem)
						// get the most recent change of state
						if (lastStateChange === 0 && (keys.includes('setStateEvent') || keys.includes('createEvent'))) {
							lastStateChange = histItem.timestamp
						}
						// get the most recent change of content
						if (lastContentChange === 0 && (keys.includes('setTitleEvent') || keys.includes('descriptionEvent') || keys.includes('acceptanceEvent'))) {
							lastContentChange = histItem.timestamp
						}
						// get the most recent addition of comments to the history
						if (lastAttachmentAddition === 0 && keys.includes('lastAttachmentAddition')) {
							lastAttachmentAddition = histItem.timestamp
						}
						// get the most recent addition of comments to the history
						if (lastCommentToHistory === 0 && keys.includes('commentToHistory')) {
							lastCommentToHistory = histItem.timestamp
						}
					}
					// get the last time a comment was added; comments have their own array
					if (doc.comments && doc.comments.length > 0) {
						lastCommentAddition = doc.comments[0].timestamp
					}

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
						isSelected: isSelected,
						doShow,
						savedDoShow: doShow,
						data: {
							priority: doc.priority,
							state: doc.state,
							inconsistentState: false,
							team: doc.team,
							lastStateChange,
							lastContentChange,
							lastCommentAddition,
							lastAttachmentAddition,
							lastCommentToHistory,
							subtype: doc.subtype,
							lastChange: doc.history[0].timestamp
						}
					}

					state.itemsCount++

					parentNode.children.push(newNode)
					parentNodes[doc._id] = newNode
				} else {
					state.orphansCount++
					state.orphansFound.orphans.push({ parentId: parentId, productId: doc.productId })
					// eslint-disable-next-line no-console
					console.log('processProduct: orphan found with parentId = ' + parentId + ' and productId = ' + doc.productId)
				}
			}
		}
		state.processedProducts++
	}
}

const actions = {
	// Get the current DB name etc. for this user. Note that the user global roles are already fetched
	getOtherUserData({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true
		}).then(res => {
			rootState.userData.currentDb = res.data.currentDb
			rootState.userData.email = res.data.email
			rootState.userData.myDatabases = Object.keys(res.data.myDatabases)
			const currentDbSettings = res.data.myDatabases[res.data.currentDb]
			rootState.userData.myTeam = currentDbSettings.myTeam
			rootState.userData.myFilterSettings = res.data.filterSettings
			dispatch('watchdog')
			let msg = "getOtherUserData: '" + rootState.userData.user + "' has logged in."
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			// now that the database is known the log file is available
			dispatch('doLog', { event: msg, level: ERROR })
			dispatch('getAllProducts', currentDbSettings)
		}).catch(error => {
			if (error.response.status === 404) {
				// the user profile does not exist; if online start one time initialization of a new database if a server admin signed in
				if (rootState.online && rootState.userData.roles.includes("_admin")) {
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

	/* Get all products of the current database */
	getAllProducts({
		rootState,
		state,
		dispatch
	}, currentDbSettings) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/products',
			withCredentials: true
		}).then(res => {
			state.currentProductsEnvelope = res.data.rows
			// correct the data from the user profile with the actual available products
			for (let product of state.currentProductsEnvelope) {
				let id = product.id
				if (Object.keys(currentDbSettings.productsRoles).includes(id)) rootState.userData.myProductsRoles[id] = currentDbSettings.productsRoles[id]
				if (currentDbSettings.subscriptions.includes(id)) rootState.userData.myProductSubscriptions.push(id)
			}
			// set the users product options to select from
			for (let product of state.currentProductsEnvelope) {
				if (Object.keys(currentDbSettings.productsRoles).includes(product.id)) {
					rootState.myProductOptions.push({
						value: product.id,
						text: product.value
					})
				}
			}
			// ToDo: correct the user profile
			const isAnyProductAssigned = Object.keys(rootState.userData.myProductsRoles).length > 0
			rootState.userData.userAssignedProductIds = Object.keys(rootState.userData.myProductsRoles)
			// the first (index 0) product in myProductsRoles is by definition the default product
			state.currentDefaultProductId = rootState.userData.myProductSubscriptions[0] || undefined
			// postpone the warning message for 'no product found' until the product view is rendered
			dispatch('getConfig', isAnyProductAssigned)
		}).catch(error => {
			let msg = 'getAllProducts: Could not find products in database ' + rootState.userData.currentDb + '. Error = ' + error
			rootState.backendMessages.push(msg)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// Load the config document from this database
	getConfig({
		rootState,
		dispatch
	}, isAnyProductAssigned) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
			withCredentials: true,
		}).then(res => {
			rootState.configData = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The configuration is loaded')
			dispatch('getRoot', isAnyProductAssigned)
		}).catch(error => {
			let msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	getRoot({
		rootState,
		commit,
		dispatch
	}, isAnyProductAssigned) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/root',
			withCredentials: true,
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
			if (isAnyProductAssigned) {
				// load the current product document
				dispatch('loadCurrentProduct')
			} else {
				commit('showLastEvent', { txt: `The root document is read. No products are found. A SuperPO can create products.`, severity: INFO })
				// show only the root node and the message
				router.push('/product')
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log("The root document is read")
		}).catch(error => {
			// ToDo: if 404 the database could have been deleted
			let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// Load current user product and start loading the tree
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
			withCredentials: true,
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
			// ToDo: if 404 the database could have been deleted
			let msg = 'loadCurrentProduct: Could not read current product document with _id ' + _id + ' from database ' + rootState.userData.currentDb + '. ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	// Load next products from the database
	getNextProduct({
		rootState,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/sortedFilter?' + state.rangeString + '&include_docs=true',
			withCredentials: true,
		}).then(res => {
			batch = res.data.rows
			commit('processProduct', rootState.userData.userAssignedProductIds)
			// log any detected orphans if present
			if (state.orphansFound.orphans.length > 0) {
				rootState.logging.orphansFound = state.orphansFound
				commit('logOrphansFound', null, { root: true })
				state.orphansFound.orphans = []
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
			commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('Another product of ' + batch.length + ' documents is loaded')
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getNextProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	// Load the current product first
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
			withCredentials: true,
		}).then(res => {
			batch = res.data.rows
			commit('processProduct', rootState.userData.userAssignedProductIds)
			// log any detected orphans if present
			if (state.orphansFound.orphans.length > 0) {
				rootState.logging.orphansFound = state.orphansFound
				commit('logOrphansFound', null, { root: true })
				state.orphansFound.orphans = []
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
			commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
			router.push('/product')
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getFirstProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	loadItemByShortId({
		rootState,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = '/_design/design1/_view/shortIdFilter?startkey=["' + shortId + '"]&endkey=["' + shortId + '"]&include_docs=true'
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr,
			withCredentials: true,
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (rootState.userData.userAssignedProductIds.includes(doc.productId)) {
					if (rows.length === 1) {
						commit('showLastEvent', { txt: `The document with id ${shortId} is found but not in your selected products.`, severity: WARNING })
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

	// Load current document by _id
	loadDoc({
		rootState,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
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
	},

	// Read the parent title before creating the document
	createDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.initData.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			payload.initData.history[0]['createEvent'] = [payload.initData.level, res.data.title]
			dispatch('createDoc2', payload)
		}).catch(error => {
			let msg = 'createDoc: Could not read parent document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
	// Create document and reload it to currentDoc
	createDoc2({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.initData._id
		// eslint-disable-next-line no-console
		console.log('createDoc2: creating document with _id = ' + _id)
		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
			data: payload.initData
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createDoc2: document with _id ' + _id + ' is created.')
			dispatch('loadDoc', _id)
		}).catch(error => {
			let msg = 'createDoc2: Could not create document with id ' + _id + ', ' + error
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
