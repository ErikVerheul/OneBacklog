import { SEV, LEVEL } from '../../constants.js'
import { getLevelText, getLocationInfo, createId } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

// these vars are initiated when the product is loaded
var newProductId
var orgProductTitle
var newProductTitle

var runningThreadsCount
var clonedRootDoc
var clonedRootNode
var clonedDocsCount

function composeRangeString1(id) {
	return `startkey="${id}"&endkey="${id}"`
}

/* Return all documents with the document with id as parent in order of priority */
function composeRangeString2(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

/* Return a priority that places the new product as the last product in the tree view */
function calcNewProductPriority() {
	const lastProductNode = window.slVueTree.getRootNode().children.slice(-1)[0]
	return Math.floor(lastProductNode.data.priority / 2 + Number.MIN_SAFE_INTEGER / 2)
}

/* Return a priority that places the cloned item above the original */
function calcNewClonePriority(node) {
	const prevNode = window.slVueTree.getPreviousNode(node.path)
	let newPrio
	// place the clone above the original
	if (prevNode.level < node.level) {
		// the previous node is the parent
		newPrio = Math.floor(Number.MAX_SAFE_INTEGER / 2 + node.data.priority / 2)
	} else {
		// the previous node is a sibling
		newPrio = Math.floor(prevNode.data.priority / 2 + node.data.priority / 2)
	}
	return newPrio
}

function showProduct(docs, leafLevel) {
	const parentNodes = { root: window.slVueTree.getNodeById('root') }
	for (const doc of docs) {
		const parentId = doc.parentId
		if (parentNodes[parentId] !== undefined) {
			const itemLevel = doc.level
			const isDraggable = itemLevel >= LEVEL.PRODUCT
			const isExpanded = itemLevel < LEVEL.FEATURE
			const doShow = itemLevel <= LEVEL.PRODUCT
			const parentNode = parentNodes[parentId]
			// position as last child
			const ind = parentNode.children.length
			const parentPath = parentNode.path
			const path = parentPath.concat(ind)
			let lastChange
			if (doc.history[0].resetCommentsEvent && !doc.history[0].resetHistoryEvent) {
				lastChange = doc.history[0].timestamp
			} else if (doc.history[0].resetHistoryEvent && !doc.history[0].resetCommentsEvent) {
				lastChange = doc.comments[0].timestamp
			} else lastChange = doc.history[0].timestamp > doc.comments[0].timestamp ? doc.history[0].timestamp : doc.comments[0].timestamp
			const newNode = {
				path,
				pathStr: JSON.stringify(path),
				ind,
				level: itemLevel,
				productId: doc.productId,
				parentId,
				sprintId: doc.sprintId,
				_id: doc._id,
				dependencies: doc.dependencies || [],
				conditionalFor: doc.conditionalFor || [],
				title: doc.title,
				isLeaf: itemLevel === leafLevel,
				children: [],
				isExpanded,
				isSelectable: true,
				isDraggable,
				isSelected: false,
				doShow,
				data: {
					priority: doc.priority,
					state: doc.state,
					reqarea: doc.reqarea,
					reqAreaItemColor: doc.color,
					team: doc.team,
					subtype: doc.subtype,
					lastChange
				},
				tmp: {}
			}
			parentNode.children.push(newNode)
			parentNodes[doc._id] = newNode
		}
	}
}

const actions = {
	/*

	* Clone a product document and all its descendants.
	* History and attachments are not copied.
	* The event is not distributed to other on-line users.
	*/
	cloneProduct({
		rootState,
		getters,
		dispatch
	}, node) {
		const productId = node.productId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/productItems?' + composeRangeString1(productId) + '&include_docs=true'
		}).then(res => {
			// extract the documents
			const docs = []
			for (const r of res.data.rows) {
				const doc = r.doc
				// remove the revision
				delete doc._rev
				// must remove _attachments stub to avoid CouchDB error 412 'Precondition failed'
				delete doc._attachments
				docs.push(doc)
			}
			// patch the documents
			for (let i = 0; i < docs.length; i++) {
				// compute a new id, remember old id
				const oldId = docs[i]._id
				const newId = createId()
				// the first document is the product
				if (i === 0) {
					newProductId = newId
					docs[0].parentId = 'root'
					docs[0].priority = calcNewProductPriority()
					orgProductTitle = docs[0].title
					newProductTitle = 'CLONE: ' + orgProductTitle
					docs[0].title = newProductTitle
				}
				docs[i]._id = newId
				docs[i].productId = newProductId
				docs[i].history = [{
					cloneEvent: [docs[i].level, docs[i].subtype, orgProductTitle],
					by: rootState.userData.user,
					timestamp: Date.now(),
					distributeEvent: false
				}]
				// fix references to oldId in parentId
				for (let j = i + 1; j < docs.length; j++) {
					if (docs[j].parentId === oldId) docs[j].parentId = newId
				}
			}
			// save the new product in the database
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb, docs, caller: 'cloneProduct', onSuccessCallback: () => {
					const newProductOption = {
						value: newProductId,
						text: newProductTitle
					}
					// copy the assigned roles
					const userRoles = rootState.userData.myDatabases[rootState.userData.currentDb].productsRoles[productId]
					// update the current user's profile with the cloned product;
					dispatch('assignProductToUserAction', { dbName: rootState.userData.currentDb, selectedUser: rootState.userData.user, newProductOption, userRoles })
					// show the product clone in the tree view
					showProduct(docs, getters.leafLevel)
				}
			})
		}).catch(error => {
			const msg = `cloneProduct: Could not read a product from database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Order of execution:
	* 1. cloneBranch, dispatches processItemsToClone for the root document of the items to be cloned (the selected node)
	* 2. processItemsToClone, dispatches getChildrenToClone for every document in the passed results array
	* 3. getChildrenToClone, dispatches processItemsToClone for every parent id and dispatches addHistToClonedDoc when all parent ids are processed
	* 4. addHistToClonedDoc, adds history to the cloned item, updates the tree view and creates undo data
	* Attachments, dependencies, conditions, sprintId, color (reqarea items), delmark, unremovedMark are not copied.
	* The event is not distributed to other on-line users.
	*/
	cloneBranch({
		rootState,
		dispatch
	}, originalNode) {
		runningThreadsCount = 0
		clonedDocsCount = 0
		const id = originalNode._id
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			// pass the cloneParentNode as undefined; the root node will be inserted in the tree view after all decendants are attached
			dispatch('processItemsToClone', { originalNode, results: [doc], newParentId: doc.parentId, cloneParentId: doc.parentId, cloneParentNode: undefined })
		}).catch(error => {
			const msg = `cloneBranch: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	processItemsToClone({
		rootState,
		dispatch,
		commit
	}, payload) {
		const toDispatch = []
		const clonedDocs = []
		for (const doc of payload.results) {
			// note that attachments, dependencies, conditions, sprintId, color (reqarea items), delmark, unremovedMark are not copied
			const clonedDoc = {
				_id: createId(),
				type: 'backlogItem',
				productId: doc.productId,
				parentId: payload.cloneParentId,
				team: doc.team,
				taskOwner: doc.taskOwner,
				level: doc.level,
				subtype: doc.subtype,
				state: doc.state,
				tssize: doc.tssize,
				spikepersonhours: doc.spikepersonhours,
				reqarea: doc.reqarea,
				spsize: doc.spsize,
				title: doc._id === payload.originalNode._id ? 'Clone of ' + doc.title : doc.title,
				description: doc.description,
				acceptanceCriteria: doc.acceptanceCriteria,
				priority: doc._id === payload.originalNode._id ? calcNewClonePriority(payload.originalNode) : doc.priority,
				comments: doc.comments,
				history: doc.history,
				delmark: false,
				// add last changes
				lastPositionChange: doc.lastPositionChange,
				lastStateChange: doc.lastStateChange,
				lastContentChange: Date.now(),
				lastCommentAddition: doc.lastCommentAddition,
				lastAttachmentAddition: doc.lastAttachmentAddition,
				lastAttachmentRemoval: doc.lastAttachmentRemoval,
				lastCommentToHistory: doc.lastCommentToHistory,
				lastChange: Date.now(),
			}
			const clonedNode = window.slVueTree.createNode(clonedDoc)
			if (doc._id === payload.originalNode._id) {
				clonedRootDoc = clonedDoc
				// save the root node of the new branch
				clonedRootNode = clonedNode
			}
			// add history to the created clone
			const newHist = {
				ignoreEvent: ['cloneDescendants'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			clonedDoc.history.unshift(newHist)
			clonedDocs.push(clonedDoc)
			runningThreadsCount++
			// attach child node to the parent; note that the retrieved children are sorted on priority
			if (payload.cloneParentNode) payload.cloneParentNode.children.push(clonedNode)
			// multiple instances can be dispatched
			toDispatch.push({
				getChildrenToClone: { originalNode: payload.originalNode, parentId: doc._id, cloneParentId: clonedDoc._id, cloneParentNode: clonedNode }
			})
		}

		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs: clonedDocs, toDispatch, caller: 'processItemsToClone', onSuccessCallback: () => {
				clonedDocsCount += clonedDocs.length
				commit('startOrContinueShowProgress', `${clonedDocsCount - 1} descendants are cloned`)
			}
		})
	},

	getChildrenToClone({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString2(payload.parentId) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('processItemsToClone',
					{ originalNode: payload.originalNode, results: results.map((r) => r.doc), newParentId: payload.parentId, cloneParentId: payload.cloneParentId, cloneParentNode: payload.cloneParentNode })
			} else {
				if (runningThreadsCount === 0) {
					// db iteration ready
					dispatch('addHistToClonedDoc', payload)
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `getChildrenToClone: Could not fetch the child documents of document with id ${payload.parentId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add history to the item that was cloned */
	addHistToClonedDoc({
		rootState,
		dispatch
	}, payload) {
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.originalNode._id
		}).then(res => {
			const updatedDoc = res.data
			const newHist = {
				clonedBranchEvent: [payload.originalNode.level, payload.originalNode.subtype],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: false
			}
			updatedDoc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc, caller: 'addHistToClonedDoc', onSuccessCallback: () => {
					dispatch('showBranch', payload)
				}
			})
		}).catch(error => {
			const msg = `addHistToClonedDoc: Could not read the document with id ${payload.originalNode._id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Show the cloned nodes in the tree view and add an entry to undo the clone */
	showBranch({
		rootState,
		commit,
	}, payload) {
		const parentNode = window.slVueTree.getNodeById(payload.originalNode.parentId)
		const locationInfo = getLocationInfo(clonedRootDoc.priority, parentNode)
		// insert the cloned root node in the tree above the original
		window.slVueTree.insertNodes({
			nodeModel: locationInfo.prevNode,
			placement: locationInfo.newInd === 0 ? 'inside' : 'after'
		}, [clonedRootNode], { skipUpdateProductId: true })
		// select the cloned node
		const nowSelectedNode = window.slVueTree.getNodeById(clonedRootDoc._id)
		commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode })
		// create an entry for undoing the clone in a last-in first-out sequence
		const entry = {
			type: 'undoBranchClone',
			newNode: clonedRootNode
		}
		rootState.changeHistory.unshift(entry)
		commit('showLastEvent', { txt: `The ${getLevelText(rootState.configData, payload.originalNode.level)} '${payload.originalNode.title}' and ${clonedDocsCount - 1} descendants are cloned`, severity: SEV.INFO })
	}
}

export default {
	actions
}
