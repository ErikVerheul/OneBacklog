import { SEV, LEVEL, MISC } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

var docsRemovedIds
var removedDeps
var removedConds
var extDepsRemovedCount
var extCondsRemovedCount
var removedSprintIds
var getChildrenDispatched
var getChildrenReady

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

function getLevelText(configData, level) {
	if (level < 0 || level > LEVEL.TASK) {
		return 'Level not supported'
	}
	return configData.itemType[level]
}

const actions = {
/*
* Order of execution:
* 1. removeBranch
* 2. processItemsToRemove, dispatches getChildrenToRemove for every document
* 3. getChildrenToRemove, dispatches processItemsToRemove for every parent id and removeExternalConds when all parent ids are processed
* 4. removeExternalConds, dispatches removeExternalDeps
* 5. removeExternalDeps, dispatches addRemoveHist
* 6. addRemoveHist, adds history to the removed items and dispatches addRemoveHist2. If a REQAREA item is removed then removeReqAreaAssignments is dispachted
* 7. addRemoveHist2 adds history to the parent and updates the tree view and created undo data
*/
	processItemsToRemove({
		rootState,
		dispatch
	}, payload) {
		const toDispatch = []
		const removedParentLevel = payload.node.level
		for (const doc of payload.results) {
			docsRemovedIds.push(doc._id)
			if (doc.dependencies && doc.dependencies.length > 0) {
				for (const d of doc.dependencies) {
					removedDeps[d] = { dependentOn: doc._id, level: doc.level, removedParentLevel }
				}
			}
			if (doc.conditionalFor && doc.conditionalFor.length > 0) {
				for (const c of doc.conditionalFor) {
					removedConds[c] = { conditionalFor: doc._id, level: doc.level, removedParentLevel }
				}
			}
			if (doc.sprintId) {
				if (!removedSprintIds.includes(doc.sprintId)) removedSprintIds.push(doc.sprintId)
			}
			// mark for removal
			doc.delmark = true

			const newHist = {
				ignoreEvent: ['removeDescendents'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)
			// multiple instances can be dispatched
			getChildrenDispatched++
			toDispatch.push({ getChildrenToRemove: { node: payload.node, id: doc._id, createUndo: payload.createUndo } })
		}
		dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: payload.results, toDispatch, caller: 'processItemsToRemove' })
	},

	getChildrenToRemove({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.id) + '&include_docs=true'
		}).then(res => {
			getChildrenReady++
			const results = res.data.rows
			// console.log('getChildrenToRemove: results.length = ' + results.length + ', getChildrenDispatched = ' + getChildrenDispatched + ', getChildrenReady = ' + getChildrenReady + ', diff = ' + (getChildrenDispatched - getChildrenReady))
			if (results.length > 0) {
				// process next level
				dispatch('processItemsToRemove', { node: payload.node, results: results.map((r) => r.doc), createUndo: payload.createUndo })
			} else {
				if (getChildrenDispatched - getChildrenReady === 0) {
					// db iteration ready
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getChildrenToRemove: dispatching removeExternalConds')
					dispatch('removeExternalConds', payload)
				}
			}
		}).catch(error => {
			const msg = 'removeBranch.getChildrenToRemove: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* The entry point for the remove actions */
	removeBranch({
		rootState,
		dispatch
	}, payload) {
		docsRemovedIds = []
		removedDeps = {}
		removedConds = {}
		extDepsRemovedCount = 0
		extCondsRemovedCount = 0
		removedSprintIds = []
		getChildrenDispatched = 0
		getChildrenReady = 0

		const id = payload.node._id
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			dispatch('processItemsToRemove', { node: payload.node, results: [doc], createUndo: payload.createUndo })
		}).catch(error => {
			const msg = `removeBranch: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	removeExternalConds({
		rootState,
		dispatch
	}, payload) {
		const docsToGet = []
		for (const d of Object.keys(removedDeps)) {
			docsToGet.push({ id: d })
		}
		if (docsToGet.length > 0) {
			globalAxios({
				method: 'POST',
				url: rootState.userData.currentDb + '/_bulk_get',
				data: { docs: docsToGet }
			}).then(res => {
				const results = res.data.results
				const docs = []
				for (const r of results) {
					const doc = r.docs[0].ok
					if (doc) {
						if (doc.level <= removedDeps[doc._id].removedParentLevel && doc.level < removedDeps[doc._id].level) {
							const newConditionalFor = []
							for (const c of doc.conditionalFor) {
								if (c !== removedDeps[doc._id].dependentOn) newConditionalFor.push(c)
							}
							doc.conditionalFor = newConditionalFor
							extCondsRemovedCount++
							docs.push(doc)
						}
					}
				}
				const toDispatch = [{ removeExternalDeps: payload }]
				dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'removeExternalConds' })
			}).catch(e => {
				const msg = 'removeExternalConds: Could not read batch of documents: ' + e
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		} else dispatch('removeExternalDeps', payload)
	},

	removeExternalDeps({
		rootState,
		dispatch
	}, payload) {
		const docsToGet = []
		for (const c of Object.keys(removedConds)) {
			docsToGet.push({ id: c })
		}
		if (docsToGet.length > 0) {
			globalAxios({
				method: 'POST',
				url: rootState.userData.currentDb + '/_bulk_get',
				data: { docs: docsToGet }
			}).then(res => {
				const results = res.data.results
				const docs = []
				for (const r of results) {
					const doc = r.docs[0].ok
					if (doc) {
						if (doc.level <= removedConds[doc._id].removedParentLevel && doc.level < removedConds[doc._id].level) {
							const newDependencies = []
							for (const d of doc.dependencies) {
								if (d !== removedConds[doc._id].conditionalFor) newDependencies.push(d)
							}
							doc.dependencies = newDependencies
							extDepsRemovedCount++
							docs.push(doc)
						}
					}
				}
				const toDispatch = [{ addRemoveHist: { node: payload.node, createUndo: payload.createUndo } }]
				dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'removeExternalDeps' })
			}).catch(e => {
				const msg = 'removeExternalDeps: Could not read batch of documents: ' + e
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		} else dispatch('addRemoveHist', { node: payload.node, createUndo: payload.createUndo })
	},

	/* Add history to the removed item it self */
	addRemoveHist({
		rootState,
		dispatch
	}, payload) {
		const id = payload.node._id
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			const newHist = {
				removedWithDescendantsEvent: [
					id,
					docsRemovedIds,
					extDepsRemovedCount,
					extCondsRemovedCount,
					removedSprintIds
				],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			doc.history.unshift(newHist)

			const toDispatch = [{ addRemoveHist2: payload }]
			if (payload.node.productId === MISC.AREA_PRODUCTID) {
				// remove reqarea assignments
				toDispatch.push({ removeReqAreaAssignments: id })
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: doc, toDispatch, caller: 'addRemoveHist' })
		}).catch(error => {
			const msg = `addRemoveHist: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add history to the parent of the removed item */
	addRemoveHist2({
		rootState,
		rootGetters,
		dispatch,
		commit
	}, payload) {
		const id = payload.node.parentId
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data

			const newHist = {
				removedFromParentEvent: [
					payload.node.level,
					payload.node.title,
					docsRemovedIds.length - 1,
					payload.node.data.subtype
				],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: false
			}
			doc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: doc,
				caller: 'addRemoveHist2',
				onSuccessCallback: () => {
					// FOR PRODUCTS OVERVIEW ONLY: when removing a requirement area, items assigned to this area should be updated
					const itemsRemovedFromReqArea = []
					if (payload.node.productId === MISC.AREA_PRODUCTID) {
						window.slVueTree.traverseModels((nm) => {
							if (nm.data.reqarea === payload.node._id) {
								delete nm.data.reqarea
								itemsRemovedFromReqArea.push(nm._id)
							}
						})
					}

					// remove any dependency references to/from outside the removed items; note: these cannot be undone
					const removed = window.slVueTree.correctDependencies(payload.node.productId, docsRemovedIds)
					// before removal select the predecessor of the removed node (sibling or parent)
					const prevNode = window.slVueTree.getPreviousNode(payload.node.path)
					let nowSelectedNode = prevNode
					if (prevNode.level === LEVEL.DATABASE) {
						// if a product is to be removed and the previous node is root, select the next product
						const nextProduct = window.slVueTree.getNextSibling(payload.node.path)
						if (nextProduct === null) {
							// there is no next product; cannot remove the last product; note that this action is already blocked with a warming
							return
						}
						nowSelectedNode = nextProduct
					}
					commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode })
					// load the new selected item
					dispatch('loadDoc', {
						id: nowSelectedNode._id, onSuccessCallback: () => {
							// remove the node and its children from the tree view
							window.slVueTree.remove([payload.node])

							if (payload.node.level === LEVEL.PRODUCT) {
								// remove the product from the users product roles, subscriptions and product selection array and update the user's profile
								dispatch('removeFromMyProducts', { productId: payload.node._id })
							}

							if (payload.createUndo) {
								// create an entry for undoing the remove in a last-in first-out sequence
								const entry = {
									type: 'undoRemove',
									removedNode: payload.node,
									isProductRemoved: payload.node.level === LEVEL.PRODUCT,
									docsRemovedIds,
									removedIntDependencies: removed.removedIntDependencies,
									removedIntConditions: removed.removedIntConditions,
									removedExtDependencies: removed.removedExtDependencies,
									removedExtConditions: removed.removedExtConditions,
									sprintIds: removedSprintIds,
									itemsRemovedFromReqArea
								}
								if (entry.isProductRemoved) {
									entry.removedProductRoles = rootGetters.getMyProductsRoles[payload.node._id]
								}
								rootState.changeHistory.unshift(entry)
								commit('showLastEvent', { txt: `The ${getLevelText(rootState.configData, payload.node.level)} and ${docsRemovedIds.length - 1} descendants are removed`, severity: SEV.INFO })
							} else {
								commit('showLastEvent', { txt: 'Item creation is undone', severity: SEV.INFO })
							}
						}
					})
				}
			})
		}).catch(error => {
			const msg = `addRemoveHist: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	removeReqAreaAssignments({
		rootState,
		dispatch
	}, reqArea) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/assignedToReqArea?' + `startkey="${reqArea}"&endkey="${reqArea}"&include_docs=true`
		}).then(res => {
			const updatedDocs = []
			const results = res.data.rows
			for (const r of results) {
				const doc = r.doc
				delete doc.reqarea
				const newHist = {
					ignoreEvent: ['removeReqAreaAssignments'],
					timestamp: Date.now(),
					distributeEvent: false
				}
				doc.history.unshift(newHist)
				updatedDocs.push(doc)
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: updatedDocs, caller: 'removeReqAreaAssignments' })
		}).catch(error => {
			const msg = 'removeReqAreaAssignment: Could not read document with id ' + reqArea + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
