import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

var batch = []
const INFO = 0
const WARNING = 1
const ERROR = 2
const AREALEVEL = 0
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
var parentNodes = {}

const state = {
	docsCount: 0,
	itemsCount: 0,
	orphansCount: 0,
	currentDefaultProductId: null,
	currentProductId: null,
	productIdLoading: null,
	processedProducts: 0,
	currentProductTitle: "",
	myProductOptions: [],
	rangeString: '',
	orphansFound: {userData: null, orphans: []}
}

const getters = {
	/*
	* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
	* Note that the AreaPO level is 0 and root of the tree starts with level 1
	* Note that rootState MUST be the third argument. The fourth argument is rootGetters.
	*
	* These are the roles known by this application despite settings in the _users database otherwise.
	* Write access is dependant on role and level. Write access includes deletion.
	* All roles have read access to their assigned database (only one) and assigned products in that database.
	*
	* type ...............in database level ....... in tree
	* -----------------------------------------------------------------------
	* RequirementArea ........ 0 ................... n/a
	* Database ............... 1 ................... n/a
	* Product ................ 2 ................... 2
	* Epic .. ................ 3 ................... 3
	* Feature ................ 4 ................... 4
	* PBI ... ................ 5 ................... 5
	*
	*"knownRoles":
	*	"_admin": {
	*		description: "Is the database administrator. Can setup and delete databases. See the CouchDB documentation.",
	*		products: "n/a",
	*		writeAccessLevel: null,
	*	},
	*	"admin": {
	*		description: "Can create and remove users and teams. Can assign products to teams. The user administration is a permission on the _users database
	*		products: "n/a",
	*		writeAccessLevel: null,
	*	},
	*	"areaPO": {
	*		description: "Can access the requirements area with write access to the level 0 requirements area items and can prioritise features (level 4)",
	*		products: "all",
	*		writeAccessLevel: 0,4
	*	},
	*	"superPO": {
	*		description: "Can create, maintain and remove products and epics for all products. Can change priorities at these levels.",
	*		products: "all",
	*		writeAccessLevel: 2,3
	*	},
	*	"PO": {
	*		description: "Can create, maintain and remove epics, features and pbi's for the assigned products. Can change priorities at these levels.",
	*		products: "assigned",
	*		writeAccessLevel: 3,4,5
	*	},
	*	"developer": {
	*		description: "Can create and maintain pbi's and features for the assigned products.",
	*		products: "assigned",
	*		writeAccessLevel: 4,5
	*	},
	*	"guest": {
	*		description: "Can only view the items of the assigned products. Has no access to the requirements area view.",
	*		products: "assigned",
	*		writeAccessLevel: null,
	*	}
	*
	*	Note that this getter returns permissions for the current product or all products (superPO and areaPO)
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
		for (let i = 0; i < batch.length; i++) {
			state.docsCount++
			// load the items of the products the user is authorized to
			if (userAssignedProductIds.includes(batch[i].doc.productId)) {
				const level = batch[i].doc.level
				const parentId = batch[i].doc.parentId
				const delmark = batch[i].doc.delmark
				// expand the tree of the default product up to feature level
				const isExpanded = batch[i].doc.productId === state.currentDefaultProductId && batch[i].doc.level < FEATURELEVEL
				// select the default product
				const isSelected = batch[i].doc._id === state.currentDefaultProductId
				const isDraggable = level > PRODUCTLEVEL
				const doShow = batch[i].doc.level <= PRODUCTLEVEL || batch[i].doc.productId === state.currentDefaultProductId
				if (parentNodes[parentId] !== undefined) {
					const parentNode = parentNodes[parentId]
					const ind = parentNode.children.length
					const parentPath = parentNode.path
					const path = parentPath.concat(ind)
					// skip the database/requirement area level and the removed items
					if (level > 1 && !delmark) {
						let newNode = {
							path,
							pathStr: JSON.stringify(path),
							ind,
							level: path.length,
							productId: batch[i].doc.productId,
							parentId,
							_id: batch[i].doc._id,
							shortId: batch[i].doc.shortId,
							title: batch[i].doc.title,
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
								priority: batch[i].doc.priority,
								state: batch[i].doc.state,
								subtype: batch[i].doc.subtype,
								lastChange: batch[i].doc.history[0].timestamp
							}
						}

						state.itemsCount++

						parentNode.children.push(newNode)
						parentNodes[batch[i].doc._id] = newNode
					} else {
						state.orphansCount++
						state.orphansFound.orphans.push({parentId: parentId, productId: batch[i].doc.productId})
						// eslint-disable-next-line no-console
						console.log('processProduct: orphan found with parentId = ' + parentId + ' and productId = ' + batch[i].doc.productId)
					}
				}
			}
		}
		state.processedProducts++
	}
}

const actions = {
	// Load the config document from this database
	getConfig({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
			withCredentials: true,
		}).then(res => {
			rootState.configData = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The configuration is loaded')
			// process removed products if any
			if (res.data.removedProducts && res.data.removedProducts.length > 0) {
				const sanatizedProductRoles = {}
				const productIds = Object.keys(rootState.userData.myProductsRoles)
				for (let i = 0; i < productIds.length; i++) {
					if (!res.data.removedProducts.includes(productIds[i])) {
						sanatizedProductRoles[productIds[i]] = rootState.userData.myProductsRoles[productIds[i]]
					}
				}
				rootState.userData.myProductsRoles = sanatizedProductRoles

				const sanatizedProductSubscriptions = []
				for (let i = 0; i < rootState.userData.myProductSubscriptions.length; i++) {
					if (!res.data.removedProducts.includes(rootState.userData.myProductSubscriptions[i])) {
						sanatizedProductSubscriptions.push(rootState.userData.myProductSubscriptions[i])
					}
				}
				rootState.userData.myProductSubscriptions = sanatizedProductSubscriptions
			}

			rootState.userData.userAssignedProductIds = Object.keys(rootState.userData.myProductsRoles)
			// set the array of options to make a selection of products for the next load on sign-in
			dispatch("setMyProductOptions")
			// the first (index 0) product is by definition the default product
			state.currentDefaultProductId = rootState.userData.myProductSubscriptions[0]

			// prepare for loading the first batch; add the root node for the database name
			state.treeNodes = [
				{
					"path": [0],
					"pathStr": '[0]',
					"ind": 0,
					"level": 1,
					"productId": 'root',
					"parentId": null,
					"_id": 'root',
					"shortId": "0",
					"title": rootState.userData.currentDb,
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
						"priority": null,
						"lastChange": 0
					}
				},
			]
			parentNodes.root = state.treeNodes[0]
			// load the current product document
			dispatch('loadCurrentProduct')
		}).catch(error => {
			let msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
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
			if (rootState.debug) console.log('loadCurrentProduct: product document with _id + ' + _id + ' is loaded.')
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
			let msg = 'loadCurrentProduct: Could not read product root document with _id ' + _id + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},

	/*
	* Set the options to select one or more products
	* Assume error results are 'not found' instances and ignore them
	*/
	setMyProductOptions({
		rootState,
		state,
		dispatch
	}) {
		const docsToGet = []
		for (let i = 0; i < rootState.userData.userAssignedProductIds.length; i++) {
			docsToGet.push({ "id": rootState.userData.userAssignedProductIds[i] })
		}

		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('setMyProductOptions: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			for (let i = 0; i < results.length; i++) {
				const doc = results[i].docs[0].ok
				// skip undefined and removed products
				if (doc && !doc.delMark) {
					state.myProductOptions.push({
						value: doc._id,
						text: doc.title
					})
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('setMyProductOptions: The title of document with _id + ' + results[i].docs[0].ok._id + ' is loaded.')
				}
			}
		}).catch(error => {
			let msg = 'setMyProductOptions: Could not read product titles' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},

	// Get the current DB name etc. for this user. Note that the user roles are already fetched
	getOtherUserData({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true
		}).then(res => {
			rootState.userData.myProductsRoles = res.data.productsRoles
			rootState.userData.myProductSubscriptions = res.data.subscriptions
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getOtherUserData called for user = ' + rootState.userData.user)
			if (res.data.teams && res.data.teams.length > 0) {
				rootState.userData.myTeams = res.data.teams
				rootState.userData.myCurrentTeam = res.data.teams[res.data.currentTeamsIdx]
			}
			rootState.userData.email = res.data.email
			rootState.userData.currentDb = res.data.currentDb
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getOtherUserData: database ' + rootState.userData.currentDb + ' is set for user ' + rootState.userData.user)
			let msg = rootState.userData.user + ' has logged in and the watchdog is started to recover from network outings.'
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			// now that the database is known the log file is available
			dispatch('doLog', {
				"event": msg,
				"level": INFO
			})
			dispatch('watchdog')
			dispatch('getConfig')
		}).catch(error => {
			if (error.message.includes("404")) {
				// the document does not exist; start one time initialization of a new database
				if (rootState.userData.roles.includes("_admin")) {
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
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
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
				commit('logOrphansFound', null, {root: true})
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
				commit('logOrphansFound', null, {root: true})
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
						dispatch('doLog', {
							event: msg,
							level: WARNING
						})
					}
					rootState.currentDoc = doc
					// decode from base64 + replace the encoded data
					rootState.currentDoc.description = window.atob(doc.description)
					rootState.currentDoc.acceptanceCriteria = window.atob(doc.acceptanceCriteria)
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('loadItemByShortId: document with _id + ' + doc._id + ' is loaded.')
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
			if (rootState.debug) console.log('loadDoc: document with _id + ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadDoc: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
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
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
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
			if (rootState.debug) console.log('createDoc2: document with _id + ' + _id + ' is created.')
			dispatch('loadDoc', _id)
		}).catch(error => {
			let msg = 'createDoc2: Could not create document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	}
}

export default {
	state,
	getters,
	mutations,
	actions
}
