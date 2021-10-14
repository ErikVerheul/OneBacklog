import { SEV, LEVEL, MISC } from '../../constants.js'
import { getLevelText } from '../../common_functions.js'

import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var globalEntry
var runningThreadsCount
var updatedParentDoc
var descendantNodesRestoredCount
var sprintsAffected
var teamsAffected

function composeRangeString(delmark, parentId) {
	return `startkey=["${delmark}","${parentId}",${Number.MIN_SAFE_INTEGER}]&endkey=["${delmark}","${parentId}",${Number.MAX_SAFE_INTEGER}]`
}

const actions = {
	/*
	* Undo removal of a branch
	* Order of execution:
	* 1. unremove the parent
	* 2. unremove the descendants
	* 3. restore the external dependencies & conditions
	* 4. if a req area item is restored, restore the removed references to the requirement area
	* 5. add history to the parent's parent to trigger the distribution (distributeEvent: true)
	* 6. update the tree view
	* If any of these steps fail the next steps are not executed but not undone
	*/

	/* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
	restoreItemAndDescendants({
		rootState,
		dispatch
	}, entry) {
		globalEntry = entry
		const _id = globalEntry.removedNode._id
		runningThreadsCount = 0
		descendantNodesRestoredCount = 0
		sprintsAffected = []
		teamsAffected = []
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			updatedParentDoc = res.data
			const newHist = {
				itemRestoredEvent: [updatedParentDoc.level, updatedParentDoc.subtype],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			updatedParentDoc.history.unshift(newHist)
			updatedParentDoc.unremovedMark = updatedParentDoc.delmark
			delete updatedParentDoc.delmark

			// save the affected items on the boards
			if (updatedParentDoc.sprintId) {
				if (updatedParentDoc.level === LEVEL.PBI || updatedParentDoc.level === LEVEL.TASK) {
					if (!sprintsAffected.includes(updatedParentDoc.sprintId)) sprintsAffected.push(updatedParentDoc.sprintId)
					if (!teamsAffected.includes(updatedParentDoc.team)) teamsAffected.push(updatedParentDoc.team)
				}
			}

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: updatedParentDoc,
				toDispatch: [{ restoreDescendants: { parentId: globalEntry.removedNode._id } }],
				caller: 'restoreItemAndDescendants',
			})
		}).catch(error => {
			rootState.busyWithLastUndo = false
			const msg = `restoreItemAndDescendants: Could not read document with _id ${_id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Executes the passed action on all removed descendants of the parent */
	restoreDescendants({
		rootState,
		dispatch
	}, payload) {
		runningThreadsCount++
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/removedDocToParentMap?' + composeRangeString(globalEntry.delmark, payload.parentId) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('loopUndoResults', { results })
			} else {
				if (runningThreadsCount === 0) {
					// db iteration ready; the items are updated in the database, restore the external dependencies & conditions
					dispatch('restoreExtDepsAndConds')
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `restoreDescendants: Could not fetch the child documents of document with id ${payload.parentId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	loopUndoResults({
		dispatch
	}, payload) {
		for (const r of payload.results) {
			dispatch('restoreDescendants', { parentId: r.id })
		}
		// execute unremove for these results
		dispatch('unremoveDescendants', { results: payload.results })
	},

	/* Unmark the removed item and its descendants for removal. Create nodes from the retrieved docs and add then to the removed node */
	unremoveDescendants({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, payload) {
		function getParentNode(id) {
			let parentNode
			// traverse the node to find the parent node for the item with this id
			window.slVueTree.traverseModels((nm) => {
				if (nm._id === id) {
					parentNode = nm
					return false
				}
			}, [globalEntry.removedNode])
			return parentNode
		}

		const results = payload.results
		const docs = results.map(r => r.doc)
		// all docs have the same parent and level
		const sharedDocLevel = docs[0].level
		let parentNode = undefined
		if (sharedDocLevel <= rootGetters.leafLevel) {
			// get the parentNode if a node needs to be recovered
			parentNode = getParentNode(docs[0].parentId)
		}
		for (const doc of docs) {
			const newHist = {
				ignoreEvent: ['unremoveDescendants'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)
			// restore removed dependencies if the array exists (when not the dependency cannot be removed from this document)
			if (doc.dependencies) {
				for (const d of globalEntry.removedIntDependencies) {
					if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
				}
			}
			// restore removed conditions if the array exists (when not the condition cannot be removed from this document)
			if (doc.conditionalFor) {
				for (const c of globalEntry.removedIntConditions) {
					if (c.id === doc._id) doc.conditionalFor.push(c.conditionalFor)
				}
			}
			// set the unremovedMark and unmark the removal
			doc.unremovedMark = doc.delmark
			delete doc.delmark

			// save the affected items on the boards
			if (doc.sprintId) {
				if (doc.level === LEVEL.PBI || doc.level === LEVEL.TASK) {
					if (!sprintsAffected.includes(doc.sprintId)) sprintsAffected.push(doc.sprintId)
					if (!teamsAffected.includes(doc.team)) teamsAffected.push(doc.team)
				}
			}

			// create a node and insert it in the removed node
			if (parentNode && parentNode.level < rootGetters.leafLevel) {
				// restore the node as child of the parent up to leafLevel
				window.slVueTree.appendDescendantNode(parentNode, doc)
				descendantNodesRestoredCount++
			}
			if (descendantNodesRestoredCount > 0) commit('startOrContinueShowProgress',`${descendantNodesRestoredCount} descendants are restored`)
		}

		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs, caller: 'unremoveDescendants'
		})
	},

	/* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
	updateGrandParentHist({
		rootState,
		commit,
		dispatch
	}) {
		const _id = globalEntry.removedNode.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			const grandParentDoc = res.data
			const newHist = {
				undoBranchRemovalEvent: [globalEntry.removedNode._id, descendantNodesRestoredCount, globalEntry.removedIntDependencies, globalEntry.removedExtDependencies,
				globalEntry.removedIntConditions, globalEntry.removedExtConditions, globalEntry.removedProductRoles, 'not in use', globalEntry.itemsRemovedFromReqArea,
				globalEntry.removedNode.level, globalEntry.removedNode.data.subtype, globalEntry.removedNode.title],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true,
				updateBoards: { sprintsAffected, teamsAffected }
			}
			grandParentDoc.history.unshift(newHist)

			// unmark for removal in case it was removed
			if (grandParentDoc.delmark) {
				commit('showLastEvent', { txt: 'The document representing the item to restore under was removed. The removal is made undone.', severity: SEV.WARNING })
				delete grandParentDoc.delmark
			}
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc, caller: 'updateGrandParentHist', onSuccessCallback: () => {
					// FOR PRODUCTS OVERVIEW ONLY: when undoing the removal of a requirement area, items must be reassigned to this area
					if (globalEntry.removedNode.productId === MISC.AREA_PRODUCTID) {
						window.slVueTree.traverseModels((nm) => {
							if (globalEntry.itemsRemovedFromReqArea.includes(nm._id)) {
								nm.data.reqarea = globalEntry.removedNode._id
							}
						})
					}
					if (globalEntry.isProductRemoved) {
						// re-enter the users roles for this product and update the user's subscriptions and product selection arrays with the re-entered product
						dispatch('addToMyProducts', { newRoles: globalEntry.removedProductRoles, productId: _id, productTitle: globalEntry.removedNode.title })
					}
					const path = globalEntry.removedNode.path
					const prevNode = window.slVueTree.getPreviousNode(path)
					let cursorPosition
					if (globalEntry.removedNode.path.slice(-1)[0] === 0) {
						// the previous node is the parent
						cursorPosition = {
							nodeModel: prevNode,
							placement: 'inside'
						}
					} else {
						// the previous node is a sibling
						cursorPosition = {
							nodeModel: prevNode,
							placement: 'after'
						}
					}
					// do not recalculate priorities when inserting a product node. ToDo: check this
					window.slVueTree.insertNodes(cursorPosition, [globalEntry.removedNode], { calculatePrios: globalEntry.removedNode.parentId !== 'root' })

					// select the recovered node
					commit('updateNodesAndCurrentDoc', { selectNode: globalEntry.removedNode })
					rootState.currentProductId = globalEntry.removedNode.productId
					// restore the removed dependencies
					for (const d of globalEntry.removedIntDependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					for (const d of globalEntry.removedExtDependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					for (const c of globalEntry.removedIntConditions) {
						const node = window.slVueTree.getNodeById(c.id)
						if (node !== null) node.conditionalFor.push(c.conditionalFor)
					}
					for (const c of globalEntry.removedExtConditions) {
						const node = window.slVueTree.getNodeById(c.id)
						if (node !== null) node.conditionalFor.push(c.conditionalFor)
					}
					commit('updateNodesAndCurrentDoc', { newDoc: updatedParentDoc })
					commit('showLastEvent', { txt: `The ${getLevelText(rootState.configData, globalEntry.removedNode.level)} and ${descendantNodesRestoredCount} descendants are restored`, severity: SEV.INFO })
					rootState.busyWithLastUndo = false
				}
			})
		}).catch(error => {
			rootState.busyWithLastUndo = false
			const msg = `updateGrandParentHist: Could not read document with _id ${_id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Restore the dependencies on and conditions for documents external to the restored descendants */
	restoreExtDepsAndConds({
		rootState,
		dispatch
	}) {
		const docsToGet = []
		for (const d of globalEntry.removedExtDependencies) {
			docsToGet.push({ id: d.id })
		}
		for (const c of globalEntry.removedExtConditions) {
			docsToGet.push({ id: c.id })
		}
		if (docsToGet.length === 0) {
			// no conds or deps to restore
			if (globalEntry.removedNode.productId === MISC.AREA_PRODUCTID) {
				// restore the removed references to the requirement area
				dispatch('restoreReqarea', globalEntry)
			} else {
				dispatch('updateGrandParentHist', globalEntry)
			}
			return
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const errors = []
			for (const r of results) {
				const doc = r.docs[0].ok
				if (doc) {
					// restore removed dependencies if the array exists (when not the dependency cannot be removed from this document)
					if (doc.dependencies) {
						for (const d of globalEntry.removedExtDependencies) {
							if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
						}
					}
					// restore removed conditions if the array exists (when not the condition cannot be removed from this document)
					if (doc.conditionalFor) {
						for (const c of globalEntry.removedExtConditions) {
							if (c.id === doc._id) doc.conditionalFor.push(c.conditionalFor)
						}
					}
					const newHist = {
						ignoreEvent: ['restoreExtDepsAndConds'],
						timestamp: Date.now(),
						distributeEvent: false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
				if (r.docs[0].error) errors.push(r.docs[0].error)
			}
			if (errors.length > 0) {
				const errorStr = ''
				for (const e of errors) {
					errorStr.concat(`${e.id} (error = ${e.error},  reason = ${e.reason}), `)
				}
				const msg = `restoreExtDepsAndConds: The dependencies or conditions of these documents cannot be restored. ${errorStr}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
			const toDispatch = globalEntry.removedNode.productId === MISC.AREA_PRODUCTID ? [{ restoreReqarea: globalEntry }] : [{ updateGrandParentHist: globalEntry }]
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'restoreExtDepsAndConds' })
		}).catch(error => {
			rootState.busyWithLastUndo = false
			const msg = `restoreExtDepsAndConds: Could not read batch of documents. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Restore the requirement area references */
	restoreReqarea({
		rootState,
		dispatch
	}) {
		const docsToGet = []
		for (const id of globalEntry.itemsRemovedFromReqArea) {
			docsToGet.push({ id: id })
		}
		if (docsToGet.length === 0) {
			dispatch('updateGrandParentHist', globalEntry)
			return
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
				if (doc) {
					doc.reqarea = globalEntry.removedNode._id
					const newHist = {
						ignoreEvent: ['restoreReqarea'],
						timestamp: Date.now(),
						distributeEvent: false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch: [{ updateGrandParentHist: globalEntry }], caller: 'restoreReqarea' })
		}).catch(error => {
			rootState.busyWithLastUndo = false
			const msg = `restoreReqarea: Could not read batch of documents. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
