import { SEV, LEVEL } from '../../constants.js'
import { dedup, getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

var fromHistory
var histArray
var startRestore
var loadTasksRunning

function composeRangeString(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

const actions = {
	/* Restore one branch or product from the removed items */
	restoreBranch({
		dispatch
	}, payload) {
		fromHistory = true
		histArray = payload.doc.history[0].docRestoredEvent
		startRestore = true
		loadTasksRunning = 0
		const doc = payload.doc
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
			// load the children of the node
			dispatch('loadChildren', { parentNode: newNode })
		}
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
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.parentNode._id) + '&include_docs=true'
		}).then(res => {
			loadTasksRunning--
			const results = res.data.rows
			if (results.length > 0) {
				dispatch('processResults', { parentNode: payload.parentNode, results })
			} else startRestore = false

			if (!startRestore && loadTasksRunning === 0) {
				// nodes are restored
				if (fromHistory) {
					// restore external dependencies
					const dependencies = dedup(histArray[2])
					for (const d of dependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					// restore external conditions
					const conditionalFor = dedup(histArray[4])
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
			// scan next level
			dispatch('loadChildren', { parentNode: newParentNode })
		}
	},
}

export default {
	actions
}
