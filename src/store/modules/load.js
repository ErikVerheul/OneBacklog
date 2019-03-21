import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

var tmpDoc = null
const batchSize = 3
var batch = []
var lastType = 0
var lastInsertedNodeParent = null
var lastInsertedNode = null
const leafType = 5

const state = {
	config: null,
	currentDb: null,
	currentDoc: null,
	currentProductId: null,
	databases: [],
	myTeams: [],
	email: null,
	offset: 0,
	treeNodes: [],
	userAssignedProductIds: [],
}

const getters = {
	getCurrentItemId(state) {
		if (state.currentDoc != null) return state.currentDoc._id
	},
	getCurrentItemAcceptanceCriteria(state) {
		if (state.currentDoc != null) return state.currentDoc.acceptanceCriteria
	},
	getCurrentItemAttachments(state) {
		if (state.currentDoc != null) return state.currentDoc.attachments
	},
	getCurrentItemComments(state) {
		if (state.currentDoc != null) return state.currentDoc.comments
	},
	getCurrentItemDescription(state) {
		if (state.currentDoc != null) return state.currentDoc.description
	},
	getCurrentItemFollowers(state) {
		if (state.currentDoc != null) return state.currentDoc.followers
	},
	getCurrentItemHistory(state) {
		if (state.currentDoc != null) return state.currentDoc.history
	},
	getCurrentItemPriority(state) {
		if (state.currentDoc != null) return state.currentDoc.priority
	},
	getCurrentItemProductId(state) {
		if (state.currentDoc != null) return state.currentDoc.productId
	},
	getCurrentItemReqArea(state) {
		if (state.currentDoc != null) return state.currentDoc.reqarea
	},
	getCurrentItemSpSize(state) {
		if (state.currentDoc != null) return state.currentDoc.spsize
	},
	getCurrentItemState(state) {
		if (state.currentDoc != null) return state.currentDoc.state
	},
	getCurrentItemSubType(state) {
		if (state.currentDoc != null) return state.currentDoc.subtype
	},
	getCurrentItemTeam(state) {
		if (state.currentDoc != null) return state.currentDoc.team
	},
	getCurrentItemTitle(state) {
		if (state.currentDoc != null) return state.currentDoc.title
	},
	getCurrentItemTsSize(state) {
		if (state.currentDoc != null) return state.config.tsSize[state.currentDoc.tssize]
	},
	getCurrentItemType(state) {
		if (state.currentDoc != null) return state.currentDoc.type
	},
	getCurrentPersonHours() {
		if (state.currentDoc != null) return state.currentDoc.spikepersonhours
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
	},
	getTeams(state) {
		if (state.myTeams != null) {
			return state.myTeams
		} else {
			return []
		}
	},
	getTreeNodes(state) {
		return state.treeNodes
	}
}

const mutations = {
	/*
	 * Compute the type the new node is at
	 * Note that the database is at type 0 and requirement area documents are skipped in the database view
	 */
	processBatch: (state) => {
		for (let i = 0; i < batch.length; i++) {
			let type = batch[i].doc.type
			let delmark = batch[i].doc.delmark
			// Skip the requirent area types
			if (type != 1 && !delmark) {
				/*
				 * Compute the type the PBI is at
				 * Note that for now the PBI type is the lowest type (highest type number)
				 * This will change when tasks become the lowest type
				 */
				if (type == 2) {
					// Found a new type 2 item, usually a product
					lastInsertedNodeParent = state.treeNodes[0]
					lastInsertedNode = state.treeNodes[0]
				}
				let newNode = {
					title: batch[i].doc.title,
					isLeaf: (type == leafType) ? true : false, // for now PBI's have no children
					children: [],
					isExpanded: (type < leafType) ? true : false, // expand the tree up to the feature type
					isdraggable: true,
					isSelectable: true,
					// As the product document is initially loaded show it as selected
					isSelected: (batch[i].doc._id == state.currentProductId) ? true : false,
					data: {
						_id: batch[i].doc._id,
						priority: batch[i].doc.priority
					}
				}

				if (type == lastType) {
					// New node is a sibling placed below (after = same type) the selected node
					lastInsertedNodeParent.children.push(newNode)
				} else {
					// New node is a child placed a type lower (inside = higher type) than the selected node
					lastInsertedNode.children.push(newNode)
					lastInsertedNodeParent = lastInsertedNode
				}

				lastType = type
				lastInsertedNode = newNode
			}
		}
	}
}

const actions = {
	/*
	 * When updating the database first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
	setSize({
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
					const oldSize = tmpDoc.tssize
					const newHist = {
						"setSizeEvent": [oldSize, payload.newSizeIdx],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.tssize = payload.newSizeIdx
					tmpDoc.history.push(newHist)
					state.currentDoc.tssize = payload.newSizeIdx
					state.currentDoc.history.push(newHist)
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setPersonHours({
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
					const oldHrs = tmpDoc.spikepersonhours
					const newHist = {
						"setHrsEvent": [oldHrs, payload.newHrs],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spikepersonhours = payload.newHrs
					tmpDoc.history.push(newHist)
					state.currentDoc.spikepersonhours = payload.newHrs
					state.currentDoc.history.push(newHist)
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setStoryPoints({
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
					const oldPoints = tmpDoc.spsize
					const newHist = {
						"setPointsEvent": [oldPoints, payload.newPoints],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.spsize = payload.newPoints
					tmpDoc.history.push(newHist)
					state.currentDoc.spsize = payload.newPoints
					state.currentDoc.history.push(newHist)
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setState({
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
					const oldState = tmpDoc.state
					const newHist = {
						"setStateEvent": [oldState, payload.newState],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.state = payload.newState
					tmpDoc.history.push(newHist)
					state.currentDoc.state = payload.newState
					state.currentDoc.history.push(newHist)
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setDocTitle({
		state
	}, payload) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					const oldTitle = state.currentDoc.title
					tmpDoc = res.data
					const newHist = {
						"setTitleEvent": [oldTitle, payload.newTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					state.currentDoc.history.push(newHist)
					tmpDoc.title = payload.newTitle
					state.currentDoc.title = payload.newTitle
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setSubType({
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
					tmpDoc.subtype = payload.newSubType
					state.currentDoc.subtype = payload.newSubType
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setDescription({
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
					// encode to base64
					tmpDoc.description = window.btoa(payload.newDescription)
					state.currentDoc.description = payload.newDescription
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setAcceptanceCriteria({
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
					// encode to base64
					tmpDoc.acceptanceCriteria = window.btoa(payload.newAcceptanceCriteria)
					state.currentDoc.acceptanceCriteria = payload.newAcceptanceCriteria
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setPriority({
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
					state.currentDoc.priority = payload.priority
					this.dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read document with _id ' + _id + '. Error = ' + error))
	},
	removeDoc({
		state
	}) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.delmark = true
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
				state.myTeams = res.data.teams
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
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					batch = res.data.rows
					commit('processBatch')
					if (batch.length == batchSize) {
						state.offset += batchSize
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
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					batch = res.data.rows
					commit('processBatch')
					if (batch.length == batchSize) {
						state.offset += batchSize
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
					// decode from base64
					state.currentDoc.description = window.atob(res.data.description)
					state.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
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

	// Create document and reload it to currentDoc
	createDoc({
		state,
		dispatch
	}, payload) {
		const _id = payload._id
		// eslint-disable-next-line no-console
		console.log('createDoc: creating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
				data: payload.initData
			}).then(res => {
				if (res.status == 201) {
					// eslint-disable-next-line no-console
					console.log(res)
					// eslint-disable-next-line no-console
					console.log('createDoc: document with _id + ' + _id + ' is created.')
					dispatch('loadDoc', _id)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not create document with url ' + state.currentDb + '/' + _id + '. Error = ' + error))
	},

}

export default {
	state,
	getters,
	mutations,
	actions
}
