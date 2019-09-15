import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

var batch = []
const INFO = 0
const WARNING = 1
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
var parentNodes = {}
var productPageLounched = false
var defaultProductIsSelected = false

const state = {
	docsCount: 0,
	itemsCount: 0,
	orphansCount: 0,
	currentDefaultProductId: null,
	currentProductId: null,
	productIdLoading: null,
	processedProducts: 0,
	currentProductTitle: "",
	databases: [],
	myTeams: [],
	myCurrentTeam: "",
	email: null,
	treeNodes: [],
	userAssignedProductIds: [],
	myProductsRoles: {},
	myProductOptions: [],
	myProductSubscriptions: [],
	rangeString: ''
}

const getters = {
	/*
	* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
	* Note that the AreaPO level is 0 and root of the tree starts with level 1
	* Note that rootState MUST be the third argument. The fourth argument is rootGetters.
	*/
	canWriteLevels(state, getters, rootState, rootGetters) {
		let levels = []
		if (state.currentProductId) {
			if (state.userAssignedProductIds.includes(state.currentProductId)) {
				let myRoles = state.myProductsRoles[state.currentProductId]
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('canWriteLevels: For ProductId ' + state.currentProductId + ' myRoles are ' + myRoles)
				for (let i = 0; i <= PBILEVEL; i++) {
					levels.push(false)
				}
				if (myRoles.includes('areaPO')) {
					levels[0] = true
					levels[4] = true
				}
				if (myRoles.includes('superPO')) {
					for (let i = 2; i <= 3; i++) {
						levels[i] = true
					}
				}
				if (myRoles.includes('PO')) {
					for (let i = 3; i <= PBILEVEL; i++) {
						levels[i] = true
					}
				}
				if (myRoles.includes('developer')) {
					for (let i = 4; i <= PBILEVEL; i++) {
						levels[i] = true
					}
				}
			}
		}
		// A special case, the user is 'admin'. A products admin can create and delete products
		if (rootGetters.isProductsAdmin) {
			levels[1] = true
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
	processProduct(state) {
		for (let i = 0; i < batch.length; i++) {
			state.docsCount++
			// load the items of the products the user is authorized to
			if (state.userAssignedProductIds.includes(batch[i].doc.productId)) {
				const level = batch[i].doc.level
				const parentId = batch[i].doc.parentId
				const delmark = batch[i].doc.delmark
				// expand the tree of the default product up to feature level
				const isExpanded = (batch[i].doc.productId === state.currentDefaultProductId && batch[i].doc.level < FEATURELEVEL) ? true : false
				// select the default product
				const isSelected = (batch[i].doc._id === state.currentDefaultProductId) ? true : false
				const isDraggable = (level > PRODUCTLEVEL) && this.getters.canWriteLevels[level]
				const doShow = batch[i].doc.level <= PRODUCTLEVEL || batch[i].doc.productId === state.currentDefaultProductId
				if (isSelected) defaultProductIsSelected = true
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
							isLeaf: (level === PBILEVEL) ? true : false,
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
						// ToDo: add this to the log
						console.log('processProduct: orphan found with parentId = ' + parentId + ' and productId = ' + batch[i].doc.productId)
					}
				}
			}
		}
		state.processedProducts++
	}
}

const actions = {
	// Load the config file from this database
	getConfig({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.currentDb + '/config',
			withCredentials: true,
		}).then(res => {
			rootState.config = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The configuration is loaded')
			// process removed products if any
			if (res.data.removedProducts && res.data.removedProducts.length > 0) {
				const sanatizedProductRoles = {}
				const productIds = Object.keys(state.myProductsRoles)
				for (let i = 0; i < productIds.length; i++) {
					if (!res.data.removedProducts.includes(productIds[i])) {
						sanatizedProductRoles[productIds[i]] = state.myProductsRoles[productIds[i]]
					}
				}
				state.myProductsRoles = sanatizedProductRoles

				const sanatizedProductSubscriptions = []
				for (let i = 0; i < state.myProductSubscriptions.length; i++) {
					if (!res.data.removedProducts.includes(state.myProductSubscriptions[i])) {
						sanatizedProductSubscriptions.push(state.myProductSubscriptions[i])
					}
				}
				state.myProductSubscriptions = sanatizedProductSubscriptions
			}

			state.userAssignedProductIds = Object.keys(state.myProductsRoles)
			// set the array of options to make a selection of products for the next load on sign-in
			dispatch("setMyProductOptions")
			// the first (index 0) product is by definition the default product
			state.currentDefaultProductId = state.myProductSubscriptions[0]

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
					"title": rootState.currentDb,
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
		})
			.catch(error => {
				let msg = 'getConfig: Config doc missing in database ' + rootState.currentDb + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
			url: rootState.currentDb + '/' + _id,
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
		})
			.catch(error => {
				let msg = 'loadCurrentProduct: Could not read product root document with _id ' + _id + '. Error = ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
		for (let i = 0; i < state.userAssignedProductIds.length; i++) {
			docsToGet.push({ "id": state.userAssignedProductIds[i] })
		}

		globalAxios({
			method: 'POST',
			url: rootState.currentDb + '/_bulk_get',
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
		})
			.catch(error => {
				let msg = 'setMyProductOptions: Could not read product titles' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	// Get the current DB name etc. for this user. Note that the user roles are already fetched
	getOtherUserData({
		state,
		dispatch,
		rootState
	}) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.user,
			withCredentials: true
		}).then(res => {
			state.myProductsRoles = res.data.productsRoles
			state.myProductSubscriptions = res.data.subscriptions
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getOtherUserData called for user = ' + rootState.user)
			if (res.data.teams !== undefined) {
				state.myTeams = res.data.teams
				state.myCurrentTeam = res.data.teams[res.data.currentTeamsIdx]
			} else {
				state.myTeams = []
				state.myCurrentTeam = "none assigned"
			}
			state.email = res.data.email
			state.databases = res.data.databases
			rootState.currentDb = res.data.currentDb
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getOtherUserData: database ' + rootState.currentDb + ' is set for user ' + rootState.user)
			let msg = rootState.user + ' has logged in and the watchdog is started to recover from network outings.'
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			// now that the database is known the log file is available
			dispatch('doLog', {
				"event": msg,
				"level": 'INFO'
			})
			dispatch('watchdog')
			dispatch('getConfig')
		})
			.catch(error => {
				let msg = 'getOtherUserData: Could not read user date for user ' + rootState.user + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
			url: rootState.currentDb + '/_design/design1/_view/sortedFilter?' + state.rangeString + '&include_docs=true',
			withCredentials: true,
		}).then(res => {
			batch = res.data.rows
			commit('processProduct')
			// process other products here
			if (state.myProductSubscriptions.length > 1 && state.processedProducts < state.myProductSubscriptions.length) {
				state.productIdLoading = state.myProductSubscriptions[state.processedProducts]
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
			if (!productPageLounched && defaultProductIsSelected) {
				router.push('/product')
				// reset before new login
				productPageLounched = false
				defaultProductIsSelected = false
			}
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getNextProduct: Could not read a batch of documents ' + rootState.currentDb + '. Error = ' + error))
	},

	// Load the current product first
	getFirstProduct({
		rootState,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.currentDb + '/_design/design1/_view/sortedFilter?' + state.rangeString + '&include_docs=true',
			withCredentials: true,
		}).then(res => {
			batch = res.data.rows
			commit('processProduct')
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('Current product with ' + batch.length + ' documents is loaded')
			// process other products here
			if (state.myProductSubscriptions.length > 1 && state.processedProducts < state.myProductSubscriptions.length) {
				state.productIdLoading = state.myProductSubscriptions[state.processedProducts]
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
				commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
				if (!productPageLounched && defaultProductIsSelected) {
					router.push('/product')
					// reset before new login
					productPageLounched = false
					defaultProductIsSelected = false
				}
			}
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getFirstProduct: Could not read a batch of documents from database ' + rootState.currentDb + '. Error = ' + error))
	},

	getItemByShortId({
		rootState,
		state,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = '/_design/design1/_view/shortIdFilter?startkey=["' + shortId + '"]&endkey=["' + shortId + '"]&include_docs=true'
		globalAxios({
			method: 'GET',
			url: rootState.currentDb + rangeStr,
			withCredentials: true,
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('getItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (state.userAssignedProductIds.includes(doc.productId)) {
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
						if (rootState.currentDb) dispatch('doLog', {
							event: msg,
							level: "WARNING"
						})
					}
					rootState.currentDoc = doc
					// decode from base64 + replace the encoded data
					rootState.currentDoc.description = window.atob(doc.description)
					rootState.currentDoc.acceptanceCriteria = window.atob(doc.acceptanceCriteria)
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getItemByShortId: document with _id + ' + doc._id + ' is loaded.')
				} else {
					commit('showLastEvent', { txt: `The document with id ${shortId} is found but not in your assigned products.`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with id ${shortId} is NOT found in the database.`, severity: WARNING })
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getItemByShortId: Could not read a batch of documents from database ' + rootState.currentDb + '. Error = ' + error))
	},

	// Load current document by _id
	loadDoc({
		rootState,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			rootState.currentDoc = res.data
			// decode from base64 + replace the encoded data
			rootState.currentDoc.description = window.atob(res.data.description)
			rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with _id + ' + _id + ' is loaded.')
		})
			.catch(error => {
				let msg = 'loadDoc: Could not read document with _id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			payload.initData.history[0]['createEvent'] = [payload.initData.level, res.data.title]
			dispatch('createDoc2', payload)
		})
			.catch(error => {
				let msg = 'createDoc: Could not read parent document with id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
			url: rootState.currentDb + '/' + _id,
			withCredentials: true,
			data: payload.initData
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createDoc2: document with _id + ' + _id + ' is created.')
			dispatch('loadDoc', _id)
		})
			.catch(error => {
				let msg = 'createDoc2: Could not create document with id ' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
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
