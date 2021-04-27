import { SEV, LEVEL } from '../../constants.js'
import { dedup, getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

// if fromHistory = true one branch is restored, if false one or more products are loaded in the tree
var fromHistory
var histArray
var runningThreadsCount
var unremovedMark

function composeRangeString1(id) {
	return `startkey=["${unremovedMark}","${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${unremovedMark}","${id}",${Number.MAX_SAFE_INTEGER}]`
}

function composeRangeString2(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

const state = {
	updateThisBoard: false,
	sprintId: undefined,
	team: undefined
}

const actions = {
	/*
	* Restore (fromHistory = true) one branch or product into the tree view for use by the synchronization.
	* This action is used by the synchronization to sync a remote removal undo.
	* The items are already unremoved by the remote session.
	* PBI and task documents, assigned to a sprint, are saved for restoring the planning board view, if openened.
	*/
	syncRestoreBranch({
		rootState,
		state,
		commit,
		dispatch
	}, payload) {
		fromHistory = true
		state.updateThisBoard = payload.updateThisBoard
		state.sprintId = payload.sprintId
		state.team = payload.team
		histArray = payload.histArray
		const removedDocId = histArray[0]
		const newRoles = histArray[6]
		runningThreadsCount = 0
		// get the removed document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + removedDocId
		}).then(res => {
			const doc = res.data
			unremovedMark = doc.unremovedMark
			if (unremovedMark) {
				// update the board if in view
				if (state.updateThisBoard && state.sprintId === doc.sprintId && state.team === doc.team) {
					if (doc.level === LEVEL.PBI) commit('addEmptyStoryToBoard', doc)
					if (doc.level === LEVEL.TASK) commit('addTaskToBoard', doc)
				}
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
					dispatch('loadChildNodes', { parentNode: newNode })

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
				} else {
					const msg = `syncRestoreBranch: Cannot restore item ${doc._id} and its ${histArray[1]} descendants in database ${rootState.userData.currentDb}. The parent node is missing`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				}
			} else {
				const msg = `syncRestoreBranch: Cannot restore item ${doc._id} and its ${histArray[1]} descendants in database ${rootState.userData.currentDb}. The unremovedMark is missing`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		}).catch(error => {
			const msg = `syncRestoreBranch: Could not load the removed document with id ${removedDocId} in database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* LoadProducts (fromHistory = false) is a special case of syncRestoreBranch and called when the default product changed. It can load multiple products */
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
				dispatch('loadChildNodes', { parentNode: newNode })
			}
		}).catch(error => {
			const msg = `loadProducts: Could not load products with ids ${payload.missingIds} in database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	loadChildNodes({
		rootState,
		dispatch
	}, payload) {
		runningThreadsCount++
		const url = fromHistory ? `${rootState.userData.currentDb}/_design/design1/_view/unremovedDocToParentMap?${composeRangeString1(payload.parentNode._id)}&include_docs=true` :
			`${rootState.userData.currentDb}/_design/design1/_view/docToParentMap?${composeRangeString2(payload.parentNode._id)}&include_docs=true`
		globalAxios({
			method: 'GET',
			url
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				dispatch('createChildNodes', { parentNode: payload.parentNode, results })
			} else {
				if (runningThreadsCount === 0) {
					// end of loop; the nodes are restored
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
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `loadChildNodes: Could not fetch the child documents of document with id ${payload.parentNode._id} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	createChildNodes({
		commit,
		dispatch
	}, payload) {
		for (const r of payload.results) {
			// add the child node
			const doc = r.doc
			const newParentNode = window.slVueTree.appendDescendantNode(payload.parentNode, doc)
			// also update the board if in view
			if (state.updateThisBoard && state.sprintId === doc.sprintId && state.team === doc.team) {
				if (doc.level === LEVEL.PBI) commit('addEmptyStoryToBoard', doc)
				if (doc.level === LEVEL.TASK) commit('addTaskToBoard', doc)
			}
			// scan next level
			dispatch('loadChildNodes', { parentNode: newParentNode })
		}
	}
}

export default {
	state,
	actions
}
