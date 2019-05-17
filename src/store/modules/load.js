import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

const batchSize = 250
var batch = []
const leafLevel = 5
var parentNodes = []

const state = {
	docsCount: 0,
	itemsCount: 0,
	orphansCount: 0,
	lastEvent: '',
	currentDefaultProductId: null,
	currentProductId: null,
	currentProductTitle: "",
	databases: [],
	myTeams: [],
	myCurrentTeam: "",
	email: null,
	offset: 0,
	treeNodes: [],
	userAssignedProductIds: [],
	myProductsRoles: {}
}

const getters = {
	canWriteLevels(state, rootState) {
		const maxLevel = 5
		let levels = []

		if (state.currentProductId) {
			if (state.userAssignedProductIds.includes(state.currentProductId)) {
				let myRoles = state.myProductsRoles[state.currentProductId]
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('canWriteLevels: for ProductId ' + state.currentProductId + ' myRoles are ' + myRoles)
				for (let i = 0; i <= maxLevel; i++) {
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
					for (let i = 3; i <= maxLevel; i++) {
						levels[i] = true
					}
				}
				if (myRoles.includes('developer')) {
					for (let i = 4; i <= maxLevel; i++) {
						levels[i] = true
					}
				}
			}
		}
		return levels
	},

	getCurrentProductId(state) {
		return state.currentProductId
	},
	getCurrentProductTitle(state) {
		return state.currentProductTitle
	},
	getEmail(state) {
		return state.email
	},
	getUserAssignedProductIds(state) {
		return state.userAssignedProductIds
	},
	getMyTeams(state) {
		return state.myTeams
	},
	getMyCurrentTeam(state) {
		return state.myCurrentTeam
	}
}

const mutations = {
	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view
	 */
	processBatch(state, myDefaultRoles) {
		for (let i = 0; i < batch.length; i++) {
			state.docsCount++
			// Load the items of the products the user is authorized to
			if (myDefaultRoles.includes('_admin') || myDefaultRoles.includes('areaPO') || myDefaultRoles.includes('admin') || myDefaultRoles.includes('superPO') || state.userAssignedProductIds.includes(batch[i].doc.productId)) {
				let level = batch[i].doc.level
				let parentId = batch[i].doc.parentId
				let delmark = batch[i].doc.delmark
				// Skip the database/requirement area levels and the removed items
				if (level > 1 && !delmark) {
					let newNode = {
						title: batch[i].doc.title,
						// for now PBI's have no children
						isLeaf: (level === leafLevel) ? true : false,
						children: [],
						// expand the tree of the default product
						isExpanded: (batch[i].doc.productId === state.currentDefaultProductId) ? true : false,
						isDraggable: getters.canWriteLevels[batch[i].doc.level],
						isSelectable: true,
						// select the default product
						isSelected: (batch[i].doc._id === state.currentDefaultProductId) ? true : false,
						data: {
							_id: batch[i].doc._id,
							priority: batch[i].doc.priority,
							productId: batch[i].doc.productId,
							parentId: parentId,
							state: batch[i].doc.state,
							subtype: batch[i].doc.subtype
						}
					}
					if (parentNodes[parentId] !== undefined) {
						state.itemsCount++
						let parentNode = parentNodes[parentId]
						parentNode.children.push(newNode)
						parentNodes[batch[i].doc._id] = newNode
					} else {
						state.orphansCount++
					}
				}
			}
		}
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
				// prepare for loading the first batch; add the root node for the database name
				state.treeNodes = [
					{
						"title": rootState.currentDb,
						"isSelected": false,
						"isExpanded": true,
						"children": [],
						"data": {
							"_id": "root",
							"productId": "root",
							"parentId": null,
							"priority": null
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
				console.log(msg)
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
		dispatch
	}) {
		let _id = state.currentDefaultProductId
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				state.currentProductId = _id
				rootState.currentDoc = res.data
				// decode from base64 + replace the encoded data
				rootState.currentDoc.description = window.atob(res.data.description)
				rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadCurrentProduct: product root document with _id + ' + _id + ' is loaded.')
				// initialize load parameters in case getFirstDocsBatch is called without signing out first
				batch = []
				state.docsCount = 0
				state.itemsCount = 0
				state.orphansCount = 0
				state.offset = 0
				dispatch('getFirstDocsBatch')
			})
			.catch(error => {
				let msg = 'loadCurrentProduct: Could not read product root document with _id ' + _id + '. Error = ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
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

				state.userAssignedProductIds = Object.keys(res.data.productsRoles)
				state.currentDefaultProductId = state.userAssignedProductIds[res.data.currentProductsIdx]
				dispatch('getConfig')
			})
			.catch(error => {
				let msg = 'getOtherUserData: Could not read user date for user ' + rootState.user + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	// Load next #batchSize documents from this database skipping #offset
	getNextDocsBatch({
		rootState,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				batch = res.data.rows
				commit('processBatch', rootState.myDefaultRoles)
				if (batch.length === batchSize) {
					state.offset += batchSize
					// recurse until all read
					dispatch('getNextDocsBatch')
				} else {
					dispatch('listenForChanges')
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getNextDocsBatch: listenForChanges started')
					// reset load parameters
					parentNodes = []
					this.offset = 0
				}
				state.lastEvent = `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('Another batch of ' + batch.length + ' documents is loaded')
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getNextDocsBatch: Could not read a batch of documents ' + rootState.currentDb + '. Error = ' + error))
	},

	// Load #batchSize documents from this database skipping #offset
	getFirstDocsBatch({
		rootState,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				batch = res.data.rows
				commit('processBatch', rootState.myDefaultRoles)
				if (batch.length === batchSize) {
					state.offset += batchSize
					dispatch('getNextDocsBatch')
				} else {
					// all documents are read
					dispatch('listenForChanges')
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getFirstDocsBatch: listenForChanges started')
					// reset load parameters
					parentNodes = []
					this.offset = 0
				}
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('A first batch of ' + batch.length + ' documents is loaded. Move to the product page')
				state.lastEvent = `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`
				router.push('/product')
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getFirstDocsBatch: Could not read a batch of documents from database ' + rootState.currentDb + '. Error = ' + error))
	},


	// Read the current product title
	readProductTitle({
		rootState,
		state,
		dispatch
	}, product_id) {
		globalAxios({
				method: 'GET',
				url: rootState.currentDb + '/' + product_id,
				withCredentials: true,
			}).then(res => {
				state.currentProductTitle = res.data.title
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log("readProductTitle: current product name '" + res.data.title + "' is fetched.")
			})
			.catch(error => {
				let msg = 'readProductTitle: Could not read document for thr product with _id ' + product_id + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
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
				console.log(msg)
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
				console.log(msg)
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
				console.log(msg)
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
