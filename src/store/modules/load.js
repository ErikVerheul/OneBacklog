import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

const testNodes = [{
	"title": "Database-1",
	"isSelected": false,
	"isExpanded": true,
	"children": [{
			"title": "Product-1",
			"isExpanded": true,
			"children": [{
					"title": "Epic-A",
					"children": [{
						"title": "Feature-A1",
						"children": [{
								"title": "PBI-A1-1",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-A1-2",
								"children": [],
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": false
											},
							{
								"title": "PBI-A1-3",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-A1-4",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false,
						"isExpanded": true
									}],
					"isSelected": false
								},
				{
					"title": "Epic-B",
					"isExpanded": true,
					"isSelected": false,
					"children": [{
						"title": "Feature-B1",
						"children": [{
								"title": "PBI-B1-1",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-2",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-3",
								"children": [],
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": true
											},
							{
								"title": "PBI-B1-4",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-5",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false
									}]
								}
							],
			"isSelected": false
						},
		{
			"title": "Product-2",
			"isExpanded": true,
			"children": [{
					"title": "Epic-C",
					"children": [{
						"title": "Feature-C1",
						"children": [{
								"title": "PBI-C1-1",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-C1-2",
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": false
											},
							{
								"title": "PBI-C1-3",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-C1-4",
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false,
						"isExpanded": true
									}],
					"isSelected": false
								},
				{
					"title": "Epic-D",
					"isExpanded": true,
					"isSelected": false,
					"children": [{
						"title": "Feature-D1",
						"children": [{
								"title": "PBI-D1-1",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-2",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-3",
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": true
											},
							{
								"title": "PBI-D1-4",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-5",
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false
									}]
								}
							],
			"isSelected": false
						},
					]
				}, ]
var tmpDoc = null
const batchSize = 3
var offset = 0
var batch = []
var lastLevel = 0
var lastInsertedNodeParent = null
var lastInsertedNode = null

const state = {
	config: null,
	currentDb: null,
	currentDoc: null,
	currentProductId: null,
	databases: [],
	email: null,
	treeNodes: [],
	userAssignedProductIds: [],
}

const getters = {
	getCurrentDocId(state) {
		if (state.currentDoc != null) return state.currentDoc._id
	},
	getCurrentDocAcceptanceCriteria(state) {
		if (state.currentDoc != null) return state.currentDoc.acceptanceCriteria
	},
	getCurrentDocAttachments(state) {
		if (state.currentDoc != null) return state.currentDoc.attachments
	},
	getCurrentDocComments(state) {
		if (state.currentDoc != null) return state.currentDoc.comments
	},
	getCurrentDocDescription(state) {
		if (state.currentDoc != null) return state.currentDoc.description
	},
	getCurrentDocFollowers(state) {
		if (state.currentDoc != null) return state.currentDoc.followers
	},
	getCurrentDocHistory(state) {
		if (state.currentDoc != null) return state.currentDoc.history
	},
	getCurrentDocPriority(state) {
		if (state.currentDoc != null) return state.currentDoc.priority
	},
	getCurrentDocProductId(state) {
		if (state.currentDoc != null) return state.currentDoc.productId
	},
	getCurrentDocReqArea(state) {
		if (state.currentDoc != null) return state.currentDoc.reqarea
	},
	getCurrentDocSpSize(state) {
		if (state.currentDoc != null) return state.currentDoc.spsize
	},
	getCurrentDocState(state) {
		if (state.currentDoc != null) return state.currentDoc.state
	},
	getCurrentDocSubType(state) {
		if (state.currentDoc != null) return state.currentDoc.subtype
	},
	getCurrentDocTitle(state) {
		if (state.currentDoc != null) return state.currentDoc.title
	},
	getCurrentDocTsSize(state) {
		if (state.currentDoc != null) {
			return state.config.tsSize[state.currentDoc.tssize]
		}
	},
	getCurrentDocType(state) {
		if (state.currentDoc != null) return state.currentDoc.type
	},
	getCurrentDb(state) {
		return state.currentDb
	},
	getCurrentProductId(state) {
		return state.currentProductId
	},
	getEmail(state) {
		return state.email
	},
	getProductIds(state) {
		return state.userAssignedProductIds
	}
}

const mutations = {
	processBatch: (state) => {
		for (let i = 0; i < batch.length; i++) {
			/*
			 * Compute the level the new node is at
			 * Note that the database is at level 0 and requirement area documents are skipped in the database view
			 */
			let level = batch[i].doc.type
			/*
			 * Compute the level the PBI is at
			 * Note that for now the PBI level is the lowest level (highest type number)
			 * This will change when tasks become the lowest level
			 */
			let pbiLevel = state.config.itemType.length - 1
			if (level == 1) {
				// Found a new level 1 item, usually a product
				lastInsertedNodeParent = state.treeNodes[0]
				lastInsertedNode = state.treeNodes[0]
			}
			let newNode = {
				title: batch[i].doc.title,
				isLeaf: (level < pbiLevel) ? false : true, // for now PBI's have no children
				children: [],
				isExpanded: (level < pbiLevel - 1) ? true : false, // expand the tree up to the feature level (assuming the feature level is 1 above the PBI level)
				isdraggable: true,
				isSelectable: true,
				// As the product document is initially loaded show it as selected
				isSelected: (batch[i].doc._id == state.currentProductId) ? true : false,
				data: {
					_id: batch[i].doc._id,
					priority: batch[i].doc.priority
				}
			}

			if (level == lastLevel) {
				// New node is a sibling placed below (after = same level) the selected node
				lastInsertedNodeParent.children.push(newNode)
			} else {
				// New node is a child placed a level lower (inside = higher level) than the selected node
				lastInsertedNode.children.push(newNode)
				lastInsertedNodeParent = lastInsertedNode
			}

			lastLevel = level
			lastInsertedNode = newNode
		}
	}
}

const actions = {
	/*
	 * When updating the database first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
	setCurrentDocTitle({
		state
	}, payload) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.title = payload.newTitle
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setCurrentDescription({
		state
	}, payload) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.description = payload.newDescription
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setCurrentAcceptanceCriteria({
		state
	}, payload) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.acceptanceCriteria = payload.newAcceptanceCriteria
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setNewPriority({
		state
	}, payload) {
		const _id = payload._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.priority = payload.priority
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},

	// Load the config file from this database
	getConfig({
		state,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/config',
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.config = res.data
					// eslint-disable-next-line no-console
					console.log('The configuration is loaded')
					// prepare for loading the first batch; add the root node for the database name
					state.treeNodes = [
						{
							"title": state.currentDb,
							"isSelected": false,
							"isExpanded": true,
							"children": []
						},
					]
					lastInsertedNodeParent = state.treeNodes[0]
					lastInsertedNode = state.treeNodes[0]
					dispatch('getFirstDocsBatch')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Config doc missing in database ' + state.currentDb + '. Error = ' + error))
	},

	// Get the current DB name etc. for this user. Note that the user roles are already fetched
	getOtherUserData({
		rootState,
		state,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: '_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				// eslint-disable-next-line no-console
				console.log(res)
				// eslint-disable-next-line no-console
				console.log('getOtherUserData called for user = ' + rootState.user)
				state.email = res.data.email
				state.databases = res.data.databases
				state.currentDb = res.data.currentDb
				state.userAssignedProductIds = res.data.products
				state.currentProductId = state.userAssignedProductIds[res.data.currentProductIdx]
				// load the current product document
				dispatch('loadDoc', state.currentProductId)
				// eslint-disable-next-line no-console
				console.log('getOtherUserData: database ' + state.currentDb + ' is set for user ' + rootState.user)
				dispatch('getConfig')
			})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log('getOtherUserData error= ', error)
			})
	},

	// Load next #batchSize documents from this database skipping #offset
	getNextDocsBatch({
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					batch = res.data.rows
					commit('processBatch')
					if (batch.length == batchSize) {
						offset += batchSize
						// recurse until all read
						dispatch('getNextDocsBatch')
					}
					// eslint-disable-next-line no-console
					console.log('Another batch of ' + batch.length + ' documents is loaded')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read a batch of documents ' + state.currentDb + '. Error = ' + error))
	},

	// Load #batchSize documents from this database skipping #offset
	getFirstDocsBatch({
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					batch = res.data.rows
					commit('processBatch')
					if (batch.length == batchSize) {
						offset += batchSize
						dispatch('getNextDocsBatch')
					}
					// eslint-disable-next-line no-console
					console.log('A first batch of ' + batch.length + ' documents is loaded. Move to the product page')
					router.push('/product')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read a batch of documents from database ' + state.currentDb + '. Error = ' + error))
	},

	// Load current document by _id
	loadDoc({
		state
	}, _id) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.currentDoc = res.data
					// eslint-disable-next-line no-console
					console.log('loadDoc: document with _id + ' + _id + ' is loaded.')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},

	// Update current document
	updateDoc({
		state
	}) {
		const _id = tmpDoc._id
		// eslint-disable-next-line no-console
		console.log('updateDoc: updating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: state.currentDb + '/' + tmpDoc._id,
				withCredentials: true,
				data: tmpDoc
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					console.log(res)
					// eslint-disable-next-line no-console
					console.log('updateDoc: document with _id + ' + _id + ' is updated.')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + state.currentDb + '/' + _id + '. Error = ' + error))
	},

}

export default {
	state,
	getters,
	mutations,
	actions
}
