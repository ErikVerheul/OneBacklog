import globalAxios from 'axios'
//Here ../router/index is imported
import router from '../../router'

var tmpDoc = null
const batchSize = 3
var batch = []
const leafType = 5
var parentNodes = {}
var docsCount = 0
var itemsCount = 0
var orphansCount = 0

const state = {
	lastEvent: '',
	config: null,
	currentDb: null,
	currentDoc: null,
	currentUserProductId: null,
	currentProductId: null,
	currentProductTitle: "",
	databases: [],
	myTeams: [],
	email: null,
	offset: 0,
	treeNodes: [],
	userAssignedProductIds: [],
}

const getters = {
	canChangePriorities(state) {
		if (state.currentDoc != null) return true
	},
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
	getCurrentProductTitle(state) {
		return state.currentProductTitle
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
	 * The database is sorted by productId, type (level) and priority.
	 * The documents are read top down by type. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of type 0, and requirement area documents of type 1 are excluded in the database view
	 */
	processBatch: (state) => {
		for (let i = 0; i < batch.length; i++) {
			docsCount++
			// Load the items of the products the user is authorized to
			//ToDo: restore this
			//			if (state.userAssignedProductIds.includes(batch[i].doc.productId)) {
			let type = batch[i].doc.type
			let parentId = batch[i].doc.parentId
			let delmark = batch[i].doc.delmark
			// Skip the database/requirement area types and the removed items
			if (type > 1 && !delmark) {
				let newNode = {
					title: batch[i].doc.title,
					// for now PBI's have no children
					isLeaf: (type == leafType) ? true : false,
					children: [],
					// expand the tree up to the feature type
					isExpanded: (type < leafType) ? true : false,
					isdraggable: true,
					isSelectable: true,
					// As the product document is initially loaded show it as selected
					isSelected: (batch[i].doc._id == state.currentUserProductId) ? true : false,
					data: {
						_id: batch[i].doc._id,
						priority: batch[i].doc.priority,
						productId: batch[i].doc.productId,
						parentId: parentId
					}
				}
				//				console.log('processBatch: Adding batch[i].doc._id = ' + batch[i].doc._id + ", parentId = " + parentId)
				if (parentNodes[parentId] != null) {
					itemsCount++
					let parentNode = parentNodes[parentId]
					parentNode.children.push(newNode)
					parentNodes[batch[i].doc._id] = newNode
				} else {
					orphansCount++
					console.log('processBatch: orphan detected with _id = ' + batch[i].doc._id + ' The missing parent has _id = ' + parentId)
				}
			}
			//			}
		}
	}
}

const actions = {
	/*
	 * When updating the database first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
	setSize({
		state,
		dispatch
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
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSize: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setPersonHours({
		state,
		dispatch
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
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setPersonHours: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setStoryPoints({
		state,
		dispatch
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
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setStoryPoints: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setState({
		state,
		dispatch
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
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setState: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setDocTitle({
		state,
		dispatch
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
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setDocTitle: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	setSubType({
		state,
		dispatch
	}, payload) {
		const _id = state.currentDoc._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const newHist = {
						"setSubTypeEvent": [state.currentDoc.subtype, payload.newSubType],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					state.currentDoc.history.push(newHist)
					tmpDoc.subtype = payload.newSubType
					state.currentDoc.subtype = payload.newSubType
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('setSubType: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	updateDropped({
		state,
		dispatch
	}, payload) {
		const _id = payload.newParentId
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					payload['newParentTitle'] = res.data.title
					dispatch('updateDropped2', payload)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped: Could not read parent document with _id ' + _id + '. Error = ' + error))
	},
	updateDropped2({
		state,
		dispatch
	}, payload) {
		const _id = payload._id
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					const newHist = {
						"nodeDroppedEvent": [payload.oldLevel, payload.newLevel, payload.newInd, payload.newParentTitle],
						"by": payload.userName,
						"email": payload.email,
						"timestamp": Date.now()
					}
					tmpDoc.history.push(newHist)
					state.currentDoc.history.push(newHist)
					tmpDoc.type = payload.newLevel
					tmpDoc.productId = payload.productId
					tmpDoc.parentId = payload.newParentId
					tmpDoc.priority = payload.priority
					state.currentDoc.type = payload.newLevel
					state.currentDoc.productId = payload.productId
					state.currentDoc.parentId = payload.newParentId
					state.currentDoc.priority = payload.priority
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateDropped2: Could not read document with _id ' + _id + '. Error = ' + error))
	},
	removeDoc({
		state,
		dispatch
	}, _id) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					tmpDoc = res.data
					tmpDoc.delmark = true
					dispatch('updateDoc')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('removeDoc: Could not read document with _id ' + _id + '. Error = ' + error))
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
							"children": [],
							"data": {
								"_id": "root"
							}
						},
					]
					parentNodes.root = state.treeNodes[0]
					dispatch('getFirstDocsBatch')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getConfig:Config doc missing in database ' + state.currentDb + '. Error = ' + error))
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
				// eslint-disable-next-line no-console
				console.log(res)
				// eslint-disable-next-line no-console
				console.log('getOtherUserData called for user = ' + rootState.user)
				state.myTeams = res.data.teams
				state.email = res.data.email
				state.databases = res.data.databases
				state.currentDb = res.data.currentDb
				state.userAssignedProductIds = res.data.products
				state.currentUserProductId = state.userAssignedProductIds[res.data.currentProductIdx]
				// load the current product document
				dispatch('loadDoc', state.currentUserProductId)
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
					} else {
						// done, release memory
						parentNodes = null
					}
					state.lastEvent = `${docsCount} docs are read. ${itemsCount} items are inserted. ${orphansCount} orphans are skipped`
					// eslint-disable-next-line no-console
					console.log('Another batch of ' + batch.length + ' documents is loaded')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getNextDocsBatch: Could not read a batch of documents ' + state.currentDb + '. Error = ' + error))
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
					state.lastEvent = `${docsCount} docs are read. ${itemsCount} items are inserted. ${orphansCount} orphans are skipped`
					router.push('/product')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('getFirstDocsBatch: Could not read a batch of documents from database ' + state.currentDb + '. Error = ' + error))
	},

	saveDescriptionAndLoadDoc({
		state,
		dispatch
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
					const newEncodedDescription = window.btoa(payload.newDescription)
					// update only when changed
					if (newEncodedDescription != res.data.description) {
						const newHist = {
							"descriptionEvent": [res.data.description, newEncodedDescription],
							"by": payload.userName,
							"email": payload.email,
							"timestamp": Date.now()
						}
						tmpDoc.history.push(newHist)
						state.currentDoc.history.push(newHist)
						tmpDoc.description = newEncodedDescription
						dispatch('updateDocAndLoadNew', payload.newId)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveDescriptionAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	saveAcceptanceAndLoadDoc({
		state,
		dispatch
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
					const newEncodedAcceptance = window.btoa(payload.newAcceptance)
					// update only when changed
					if (newEncodedAcceptance != res.data.acceptanceCriteria) {
						const newHist = {
							"acceptanceEvent": [res.data.acceptanceCriteria, newEncodedAcceptance],
							"by": payload.userName,
							"email": payload.email,
							"timestamp": Date.now()
						}
						tmpDoc.history.push(newHist)
						state.currentDoc.history.push(newHist)
						tmpDoc.acceptanceCriteria = newEncodedAcceptance
						dispatch('updateDocAndLoadNew', payload.newId)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('saveAcceptanceAndLoadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
	},

	// Read the current product title
	readProduct({
		state
	}, product_id) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + product_id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.currentProductTitle = res.data.title
					state.currentProductId = res.data.productId
					// eslint-disable-next-line no-console
					console.log('loadDoc: current product name + ' + res.data.title + ' is fetched.')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('readProduct: Could not read document with _id ' + product_id + '. Error = ' + error))
	},

	// Load current document by _id
	loadDoc({
		state,
		dispatch
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
					// decode from base64 + replace the encoded data
					state.currentDoc.description = window.atob(res.data.description)
					state.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
					// eslint-disable-next-line no-console
					console.log('loadDoc: document with _id + ' + _id + ' is loaded.')
					// read the current product title if not available
					if (res.data.productId != state.currentProductId) {
						dispatch('readProduct', res.data.productId)
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('loadDoc: Could not read document with _id ' + _id + '. Error = ' + error))
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

	// Update current document and load new
	updateDocAndLoadNew({
		state,
		dispatch
	}, newId) {
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
					dispatch('loadDoc', newId)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not write document with url ' + state.currentDb + '/' + _id + '. Error = ' + error))
	},

	// Read the parent title before creating the document
	createDoc({
		state,
		dispatch
	}, payload) {
		const _id = payload.initData.parentId
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					payload.initData.history[0]['createEvent'] = [payload.initData.type, res.data.title]
					dispatch('createDoc2', payload)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('createDoc: Could not read parent document with id ' + _id + '. Error = ' + error))
	},
	// Create document and reload it to currentDoc
	createDoc2({
		state,
		dispatch
	}, payload) {
		const _id = payload.initData._id
		// eslint-disable-next-line no-console
		console.log('createDoc2: creating document with _id = ' + _id)
		globalAxios({
				method: 'PUT',
				url: state.currentDb + '/' + _id,
				withCredentials: true,
				data: payload.initData
			}).then(res => {
				if (res.status == 201) {
					console.log('createDoc2: got history with payload.initData.history[0]["createEvent"][0] = ' + payload.initData.history[0]['createEvent'][0] +
											'\nand payload.initData.history[0]["createEvent"][0] = ' + payload.initData.history[0]['createEvent'][1])
					// eslint-disable-next-line no-console
					console.log(res)
					// eslint-disable-next-line no-console
					console.log('createDoc2: document with _id + ' + _id + ' is created.')
					dispatch('loadDoc', _id)
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('createDoc2: Could not create document with id ' + _id + '. Error = ' + error))
	},

}

export default {
	state,
	getters,
	mutations,
	actions
}
