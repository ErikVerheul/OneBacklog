import { SEV, LEVEL, MISC } from '../../constants.js'
import { createId, getLevelText } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var removedDeps
var removedConds
var extDepsRemovedCount
var extCondsRemovedCount
var runningThreadsCount
var removedDocsCount
var sprintsAffected
var teamsAffected

function reset(rootState, payload) {
	rootState.busyRemovingBranch = false
	if (payload.isUndoAction) rootState.busyWithLastUndo = false
}

function composeRangeString(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

const actions = {
	/*
	* Remove a product or branch. When a product is removed also unassign the removed product from the user. Other user profiles are updated on sign-in.
	* Order of execution:
	* 1. removeBranch
	* 2. processItemsToRemove, dispatches getChildrenToRemove for every document
	* 3. getChildrenToRemove, dispatches processItemsToRemove for every parent id and dispatches removeExternalConds when all parent ids are processed
	* 4. removeExternalConds, dispatches removeExternalDeps
	* 5. removeExternalDeps, dispatches addHistToRemovedParent, or if a REQAREA item is removed then removeReqAreaAssignments is dispachted
	* 6. removeReqAreaAssignments, dispatches addHistToRemovedParent
	* 7. addHistToRemovedParent, dispatches addHistToRemovedDoc and adds history to the parent
	* 8. addHistToRemovedDoc, adds history to the removed item, updates the tree view and creates undo data
	* If payload.isUndoAction === true this action is used to undo a branch creation and no undo entry is created (no undo of an undo)
	*/

	removeBranch({
		rootState,
		dispatch
	}, payload) {
		removedDeps = {}
		removedConds = {}
		extDepsRemovedCount = 0
		extCondsRemovedCount = 0
		runningThreadsCount = 0
		removedDocsCount = 0
		sprintsAffected = []
		teamsAffected = []

		// while running this state is set upon a reset is called
		rootState.busyRemovingBranch = true
		if (payload.isUndoAction) rootState.busyWithLastUndo = true

		const id = payload.node._id
		const delmark = createId()
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			// note: when undoOnError === true a special message is displayed after removal telling the user that the removal was caused by an error condition
			dispatch('processItemsToRemove', { node: payload.node, results: [doc], delmark, isUndoAction: payload.isUndoAction, undoOnError: payload.undoOnError })
		}).catch(error => {
			reset(rootState, payload)
			const msg = `removeBranch: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Do not reset the busyWithLastUndo as one of the intances fails */
	processItemsToRemove({
		rootState,
		dispatch,
		commit
	}, payload) {
		const toDispatch = []
		const removedParentLevel = payload.node.level
		for (const doc of payload.results) {
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
			// mark for removal
			doc.delmark = payload.delmark

			// save the affected items on the boards
			if (doc.sprintId) {
				if (doc.level === LEVEL.PBI || doc.level === LEVEL.TASK) {
					if (!sprintsAffected.includes(doc.sprintId)) sprintsAffected.push(doc.sprintId)
					if (!teamsAffected.includes(doc.team)) teamsAffected.push(doc.team)
				}
			}

			const newHist = {
				ignoreEvent: ['removeDescendants'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)
			// multiple instances can be dispatched
			runningThreadsCount++
			toDispatch.push({ getChildrenToRemove: { node: payload.node, id: doc._id, delmark: payload.delmark, isUndoAction: payload.isUndoAction, undoOnError: payload.undoOnError } })
		}
		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs: payload.results, toDispatch, caller: 'processItemsToRemove', onSuccessCallback: () => {
				removedDocsCount += payload.results.length
				commit('startOrContinueShowProgress', `${removedDocsCount - 1} descendants are removed`)
			}
		})
	},

	/*
	* Executes processItemsToRemove on all descendants of the parent.
	* Starts removeExternalConds if all getChildrenToRemove threads have finished.
	* Do not reset the busyWithLastUndo as one of the instances fails.
	*/
	getChildrenToRemove({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.id) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('processItemsToRemove', { node: payload.node, results: results.map((r) => r.doc), delmark: payload.delmark, isUndoAction: payload.isUndoAction, undoOnError: payload.undoOnError })
			} else {
				if (runningThreadsCount === 0) {
					// db iteration ready; the items are updated in the database, remove the external dependencies & conditions
					dispatch('removeExternalConds', payload)
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `getChildrenToRemove: Could not fetch the child documents of document with id ${payload.id} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	removeExternalConds({
		rootState,
		dispatch
	}, payload) {
		const docIdsToGet = []
		for (const d of Object.keys(removedDeps)) {
			docIdsToGet.push({ id: d })
		}
		if (docIdsToGet.length > 0) {
			globalAxios({
				method: 'POST',
				url: rootState.userData.currentDb + '/_bulk_get',
				data: { docs: docIdsToGet }
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
							const newHist = {
								ignoreEvent: ['removeExternalConds'],
								timestamp: Date.now(),
								distributeEvent: false
							}
							doc.history.unshift(newHist)
							docs.push(doc)
						}
					}
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb, docs, toDispatch: [{ removeExternalDeps: payload }], caller: 'removeExternalConds', onFailureCallback: () => {
						reset(rootState, payload)
					}
				})
			}).catch(error => {
				reset(rootState, payload)
				const msg = `removeExternalConds: Could not read batch of documents. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		} else dispatch('removeExternalDeps', payload)
	},

	removeExternalDeps({
		rootState,
		dispatch
	}, payload) {
		const docIdsToGet = []
		for (const c of Object.keys(removedConds)) {
			docIdsToGet.push({ id: c })
		}
		if (docIdsToGet.length > 0) {
			globalAxios({
				method: 'POST',
				url: rootState.userData.currentDb + '/_bulk_get',
				data: { docs: docIdsToGet }
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
							const newHist = {
								ignoreEvent: ['removeExternalDeps'],
								timestamp: Date.now(),
								distributeEvent: false
							}
							doc.history.unshift(newHist)
							docs.push(doc)
						}
					}
				}
				// remove reqarea assignments when removing a requirement area
				const toDispatch = payload.node.productId === MISC.AREA_PRODUCTID ? [{ removeReqAreaAssignments: payload.node._id }] : [{ addHistToRemovedParent: payload }]
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'removeExternalDeps', onFailureCallback: () => {
						reset(rootState, payload)
					}
				})
			}).catch(error => {
				reset(rootState, payload)
				const msg = `removeExternalDeps: Could not read batch of documents. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		} else {
			if (payload.node.productId === MISC.AREA_PRODUCTID) {
				// remove reqarea assignments when removing a requirement area
				dispatch('removeReqAreaAssignments', payload)
			} else {
				dispatch('addHistToRemovedParent', payload)
			}
		}
	},

	/* Remove reqarea assignments when removing a requirement area */
	removeReqAreaAssignments({
		rootState,
		dispatch
	}, payload) {
		const reqArea = payload.node._id
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
			const toDispatch = [{ addHistToRemovedParent: payload }]
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb, docs: updatedDocs, toDispatch, caller: 'removeReqAreaAssignments', onFailureCallback: () => {
					reset(rootState, payload)
				}
			})
		}).catch(error => {
			reset(rootState, payload)
			const msg = `removeReqAreaAssignment: Could not read document with id ${reqArea}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add history to the parent of the removed item */
	addHistToRemovedParent({
		rootState,
		dispatch
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
					removedDocsCount,
					payload.node.data.subtype
				],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: doc, caller: 'addHistToRemovedParent', toDispatch: [{ addHistToRemovedDoc: payload }], onFailureCallback: () => {
					reset(rootState, payload)
				}
			})
		}).catch(error => {
			reset(rootState, payload)
			const msg = `addHistToRemovedDoc: Could not read the document with id ${id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add history to the removed item, update the tree view and creates undo data */
	addHistToRemovedDoc({
		rootState,
		rootGetters,
		dispatch,
		commit
	}, payload) {
		const removed_doc_id = payload.node._id
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + removed_doc_id
		}).then(res => {
			const updatedDoc = res.data
			const newHist = {
				removedWithDescendantsEvent: [removed_doc_id, removedDocsCount, extDepsRemovedCount, extCondsRemovedCount, sprintsAffected, payload.delmark],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true,
				updateBoards: { sprintsAffected, teamsAffected }
			}
			updatedDoc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc, caller: 'addHistToRemovedDoc', onSuccessCallback: () => {
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
					const removed = window.slVueTree.correctDependencies(payload.node)
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
							const removedNode = payload.node
							// remove the node and its children from the tree view
							if (window.slVueTree.removeNodes([removedNode])) {
								// remove the children; on restore the children are recovered from the database
								removedNode.children = []
								if (removedNode.level === LEVEL.PRODUCT) {
									// remove the product from the users product roles, subscriptions and product selection array and update the user's profile
									dispatch('removeFromMyProducts', { productId: removedNode._id })
								}

								if (!payload.isUndoAction || payload.isUndoAction === undefined) {
									// create an entry for undoing the remove in a last-in first-out sequence
									const entry = {
										type: 'undoRemove',
										delmark: payload.delmark,
										isProductRemoved: removedNode.level === LEVEL.PRODUCT,
										itemsRemovedFromReqArea,
										removedDescendantsCount: removedDocsCount - 1,
										removedExtConditions: removed.removedExtConditions,
										removedExtDependencies: removed.removedExtDependencies,
										removedIntConditions: removed.removedIntConditions,
										removedIntDependencies: removed.removedIntDependencies,
										removedNode,
										sprintIds: sprintsAffected
									}
									if (entry.isProductRemoved) {
										entry.removedProductRoles = rootGetters.getMyProductsRoles[removedNode._id]
									}
									rootState.changeHistory.unshift(entry)
									commit('showLastEvent', { txt: `The ${getLevelText(rootState.configData, removedNode.level)} '${removedNode.title}' and ${removedDocsCount - 1} descendants are removed`, severity: SEV.INFO })
								} else {
									if (payload.undoOnError) {
										commit('showLastEvent', { txt: `The tree structure has changed while the new document was created. The insertion is undone`, severity: SEV.ERROR })
									} else commit('showLastEvent', { txt: 'Item creation is undone', severity: SEV.INFO })
								}
							} else commit('showLastEvent', { txt: `Cannot remove remove node with title ${removedNode.title}`, severity: SEV.ERROR })
							// removeBranch is done
							reset(rootState, payload)
						}, onFailureCallback: () => {
							reset(rootState, payload)
						}
					})
				}
			})
		}).catch(error => {
			reset(rootState, payload)
			const msg = `addHistToRemovedDoc: Could not read the document with id ${removed_doc_id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
