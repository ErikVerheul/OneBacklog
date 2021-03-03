import { SEV, LEVEL } from '../../constants.js'
import { dedup, getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

var fromHistory
var histArray
var startRestore
var loadTasksRunning

function composeRangeString1(unremovedMark, id) {
	return `startkey=["${unremovedMark}","${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${unremovedMark}","${id}",${Number.MAX_SAFE_INTEGER}]`
}

function composeRangeString2(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

const actions = {
	/* Restore one branch or product into the tree view. This action is used by the synchronization to sync a remote removal undo. The items are already unremoved by the remote session */
	restoreBranch({
		rootState,
		commit,
		dispatch
	}, payload) {
		fromHistory = true
		histArray = payload.histArray
		const removedDocId = histArray[0]
		const newRoles = histArray[6]
		startRestore = true
		loadTasksRunning = 0
		// get the removed document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + removedDocId
		}).then(res => {
			const doc = res.data
			const unremovedMark = doc.unremovedMark
			if (unremovedMark) {
				console.log('restoreBranch: unremovedMark = ' + unremovedMark)
				// no need to add history here as the data is only used to update the tree model (no update of the database)
				const parentNode = window.slVueTree.getNodeById(doc.parentId)
				if (parentNode) {
					const locationInfo = getLocationInfo(doc.priority, parentNode)
					const newNode = window.slVueTree.createNode(doc)
					const options = doc.level === LEVEL.PRODUCT ? { skipUpdateProductId: true } : { skipUpdateProductId: false }
					// insert the parent node in the tree
					window.slVueTree.insertNodes({
						nodeModel: locationInfo.prevNode,
						placement: locationInfo.newInd === 0 ? 'inside' : 'after'
					}, [newNode], options)
					console.log('restoreBranch: added to tree ' + doc.title)
					// load the children of the node
					dispatch('loadChildren', { unremovedMark, parentNode: newNode })
					dispatch('additionalActions', payload)

					if (payload.restoreReqArea) {
						// restore references to the requirement area
						const reqAreaId = doc._id
						const itemsRemovedFromReqArea = histArray[8]
						window.slVueTree.traverseModels((nm) => {
							if (itemsRemovedFromReqArea.includes(nm._id)) {
								nm.data.reqarea = reqAreaId
							}
						})
						window.slVueTree.setDescendantsReqArea()
					} else {
						if (doc.level === LEVEL.PRODUCT) {
							// re-enter all the current users product roles, and update the user's subscriptions and product selection arrays with the removed product
							dispatch('addToMyProducts', { newRoles, productId: doc._id, productTitle: doc.title, isSameUserInDifferentSession: payload.isSameUserInDifferentSession })
						}
					}
					commit('showLastEvent', { txt: `The items removed in another session are restored`, severity: SEV.INFO })
				}
			} else {
				const msg = `restoreBranch: Cannot restore item ${doc._id} and its ${histArray[1]} descendants in database ${rootState.userData.currentDb}. The unremovedMark is missing`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		}).catch(error => {
			const msg = `restoreBranch: Could not load the removed document with id ${removedDocId} in database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* LoadProducts is a special case of restoreBranch. It can load multiple products */
	loadProducts({
		rootState,
		dispatch
	}, payload) {
		fromHistory = false
		const docIdsToGet = []
		for (const id of payload.missingIds) {
			docIdsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet }
		}).then(res => {
			const results = res.data.results
			for (const r of results) {
				const doc = r.docs[0].ok
				// no need to add history here as the data is only used to update the tree model (no update of the database)
				const parentNode = window.slVueTree.getRootNode()
				const locationInfo = getLocationInfo(doc.priority, parentNode)
				const newNode = window.slVueTree.createNode(doc)
				// insert the product node in the tree
				window.slVueTree.insertNodes({
					nodeModel: locationInfo.prevNode,
					placement: locationInfo.newInd === 0 ? 'inside' : 'after'
				}, [newNode], { skipUpdateProductId: true })
				// load the children of the nodes
				dispatch('loadChildren', { parentNode: newNode })
			}
		}).catch(error => {
			const msg = `loadProducts: Could not load products with ids ${payload.missingIds} in database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	loadChildren({
		rootState,
		dispatch
	}, payload) {
		loadTasksRunning++
		const url = fromHistory ? `${rootState.userData.currentDb}/_design/design1/_view/unremovedDocToParentMap?${composeRangeString1(payload.unremovedMark, payload.parentNode._id)}&include_docs=true` :
			`${rootState.userData.currentDb}/_design/design1/_view/docToParentMap?${composeRangeString2(payload.parentNode._id)}&include_docs=true`
		globalAxios({
			method: 'GET',
			url
		}).then(res => {
			loadTasksRunning--
			const results = res.data.rows
			console.log('loadChildren: results = ' + JSON.stringify(results, null, 2))
			if (results.length > 0) {
				dispatch('processResults', { parentNode: payload.parentNode, results })
			} else startRestore = false

			if (!startRestore && loadTasksRunning === 0) {
				// nodes are restored
				if (fromHistory) {
					// restore external dependencies
					const dependencies = dedup(histArray[3])
					for (const d of dependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					// restore external conditions
					const conditionalFor = dedup(histArray[5])
					for (const c of conditionalFor) {
						const node = window.slVueTree.getNodeById(c.id)
						if (node !== null) node.conditionalFor.push(c.conditionalFor)
					}
				}
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}
		}).catch(error => {
			const msg = `loadChildren: Could not scan the descendants of document with id ${payload.parentNode._id}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	processResults({
		dispatch
	}, payload) {
		for (const r of payload.results) {
			// add the child node
			const newParentNode = window.slVueTree.insertDescendantNode(payload.parentNode, r.doc)
			console.log('loadChildren: added to tree ' + r.doc.title)
			// scan next level
			dispatch('loadChildren', { parentNode: newParentNode })
		}
	},
}

export default {
	actions
}
