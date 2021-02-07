import { SEV, LEVEL } from '../../constants.js'
import { dedup, getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

var fromHistory
var histArray
var productIdToSelect
var startRestore
var getChildrenRunning

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

function convertToResults(docs) {
	const results = []
	for (const d of docs) {
		const res = {}
		res.id = d._id
		res.key = d.parentId
		res.value = []
		res.value.push(d.reqarea)
		res.value.push(d.productId)
		res.value.push(d.priority)
		res.value.push(d.level)
		res.value.push(d.state)
		res.value.push(d.title)
		res.value.push(d.team)
		res.value.push(d.subtype)
		res.value.push(d.dependencies)
		res.value.push(d.conditionalFor)
		res.value.push(d.history[0])
		res.value.push(d.comments[0])
		res.value.push(d.color)
		res.value.push(d.sprintId)
		res.value.push(d.lastAttachmentAddition)
		res.value.push(d.lastAttachmentAddition)
		res.value.push(d.lastAttachmentAddition)
		res.value.push(d.lastChange)
		res.value.push(d.lastCommentAddition)
		res.value.push(d.lastCommentToHistory)
		res.value.push(d.lastContentChange)
		res.value.push(d.lastPositionChange)
		res.value.push(d.lastStateChange)

		results.push(res)
	}
	return results
}

const actions = {
	restoreItems({
		rootGetters,
		dispatch,
		commit
	}, payload) {
		for (const item of payload.results) {
			const _id = item.id
			const parentId = item.key
			const reqarea = item.value[0] || null
			const productId = item.value[1]
			const priority = item.value[2]
			const itemLevel = item.value[3]
			const itemState = item.value[4]
			const title = item.value[5]
			const team = item.value[6]
			const subtype = item.value[7]
			const dependencies = dedup(item.value[8])
			const conditionalFor = dedup(item.value[9])
			// for future use:
			// const lastHistoryEntry = item.value[10]
			// const lastCommentEntry = item.value[11]
			const reqAreaItemColor = item.value[12] || null
			const sprintId = item.value[13]
			const lastAttachmentAddition = item.value[14] || 0
			const lastChange = item.value[15] || 0
			const lastCommentAddition = item.value[16] || 0
			const lastCommentToHistory = item.value[17] || 0
			const lastContentChange = item.value[18] || 0
			const lastPositionChange = item.value[19] || 0
			const lastStateChange = item.value[20] || 0

			const parentNode = window.slVueTree.getNodeById(parentId)
			if (parentNode) {
				// create the node
				const locationInfo = getLocationInfo(priority, parentNode)
				const isExpanded = productId === rootGetters.getCurrentDefaultProductId ? itemLevel < LEVEL.FEATURE : itemLevel < LEVEL.PRODUCT
				const newNode = {
					path: locationInfo.newPath,
					pathStr: JSON.stringify(locationInfo.newPath),
					ind: locationInfo.newInd,
					level: itemLevel,
					productId,
					parentId,
					_id,
					dependencies,
					conditionalFor,
					title,
					isLeaf: itemLevel === rootGetters.leafLevel,
					children: [],
					isSelected: false,
					isExpanded,
					savedIsExpanded: isExpanded,
					isSelectable: true,
					isDraggable: itemLevel > LEVEL.PRODUCT,
					doShow: true,
					savedDoShow: true,
					data: {
						lastAttachmentAddition,
						lastChange,
						lastCommentAddition,
						lastCommentToHistory,
						lastContentChange,
						lastPositionChange,
						lastStateChange,
						priority,
						reqarea,
						reqAreaItemColor,
						sprintId,
						state: itemState,
						subtype,
						team
					}
				}
				window.slVueTree.insert({
					nodeModel: locationInfo.prevNode,
					placement: locationInfo.newInd === 0 ? 'inside' : 'after'
				}, [newNode], false)
				if (!fromHistory) {
					// select the product node in the tree
					if (_id === productIdToSelect) window.slVueTree.selectNodeById(productIdToSelect)
				}
				dispatch('getChildrenToRestore', { _id, toDispatch: payload.toDispatch, onSuccessCallback: payload.onSuccessCallback })
			} else {
				commit('showLastEvent', { txt: 'Cannot restore a removed item. Sign out and -in to see the change.', severity: SEV.WARNING })
				const msg = 'restoreItems: a remote restore of the tree view failed. Cannot find the parent of ' + parentId
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		}
	},

	getChildrenToRestore({
		rootState,
		dispatch
	}, payload) {
		getChildrenRunning++
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMapValues?' + composeRangeString(payload._id)
		}).then(res => {
			getChildrenRunning--
			const results = res.data.rows
			// console.log('getChildrenToRestore: results.map((item) => item.value[5] = ' + results.map((item) => item.value[5]))
			if (results.length > 0) {
				// process next level
				dispatch('restoreItems', { results, toDispatch: payload.toDispatch, onSuccessCallback: payload.onSuccessCallback })
			} else startRestore = false

			if (!startRestore && getChildrenRunning === 0) {
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
			const msg = 'restorebranches.getChildrenToRestore: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	restoreBranch({
		dispatch
	}, payload) {
		fromHistory = true
		startRestore = true
		histArray = payload.doc.history[0].docRestoredEvent
		getChildrenRunning = 0
		dispatch('restoreItems', { results: convertToResults([payload.doc]), toDispatch: payload.toDispatch, onSuccessCallback: payload.onSuccessCallback })
	},

	restorebranches({
		dispatch
	}, docs) {
		fromHistory = false
		dispatch('restoreItems', { results: convertToResults(docs) })
	},

	/* LoadProducts uses restoreBranches to load a product as a branch */
	loadProducts({
		rootState,
		dispatch
	}, payload) {
		productIdToSelect = payload.productIdToSelect
		const docsToGet = []
		for (const id of payload.missingIds) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const doc = r.docs[0].ok
				// no need to add history here as the data is only used to update the tree model (no update of the database)
				docs.push(doc)
			}
			dispatch('restorebranches', docs)
		}).catch(e => {
			const msg = 'loadProducts: Could not load products with ids ' + payload.missingIds + ' in database ' + rootState.userData.currentDb + '. Error = ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
