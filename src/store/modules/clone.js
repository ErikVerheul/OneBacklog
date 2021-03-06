import { SEV, LEVEL } from '../../constants.js'
import { createId } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

// these vars are initiated when the product is loaded
var newProductId
var orgProductTitle
var newProductTitle

function composeRangeString(id) {
	return `startkey=["${id}",${LEVEL.PRODUCT},${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${LEVEL.TASK},${Number.MAX_SAFE_INTEGER}]`
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
		* Load the current product document and all its descendants.
		* History and attachments are not copied
		*/
	cloneProduct({
		rootState,
		dispatch
	}, node) {
		const productId = node.productId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/details?' + composeRangeString(productId) + '&include_docs=true'
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
					// use the negative creation date as the priority of the new product so that sorting on priority gives the same result as sorting on id
					docs[0].priority = -Date.now()
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
			dispatch('storeProduct', { docs, clonedProductId: productId })
		}).catch(error => {
			const msg = 'cloneProduct: Could not read a product from database ' + rootState.userData.currentDb + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	storeProduct({
		rootState,
		getters,
		dispatch
	}, payload) {
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_docs',
			data: { docs: payload.docs }
		}).then(res => {
			const newProductOption = {
				value: newProductId,
				text: newProductTitle
			}
			// copy the assigned roles
			const userRoles = rootState.userData.myDatabases[rootState.userData.currentDb].productsRoles[payload.clonedProductId]
			// update the current user's profile with the cloned product;
			dispatch('assignProductToUser', { dbName: rootState.userData.currentDb, selectedUser: rootState.userData.user, newProductOption, userRoles })
			// show the product clone in the tree view
			showProduct(payload.docs, getters.leafLevel)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('storeProduct: ' + res.data.length + ' documents are processed')
		}).catch(error => {
			const msg = 'storeProduct: Could not update batch of documents: ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
