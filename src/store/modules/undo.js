import { SEV, MISC } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var runningThreadsCount

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

const actions = {
	/*
		* ToDo: create undo's if any of these steps fail
		* Undo removal of a branche
		* Order of execution:
		* 1. unremove the parent and update the tree
		* 2. update the grandparent (if removed then undo the removal) and unremove the descendants in parallel
		* 3. restore the external dependencies & conditions
		* 4. if a req area item is restored, restore the removed references to the requirement area
		* If any of these steps fail the next steps are not executed but not undone
		*/

	/* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
	restoreItemAndDescendants({
		rootState,
		commit,
		dispatch
	}, entry) {
		const _id = entry.removedNode._id
		runningThreadsCount = 0
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			const updatedDoc = res.data
			const newHist = {
				itemRestoredEvent: [updatedDoc.level, updatedDoc.subtype],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			updatedDoc.history.unshift(newHist)
			updatedDoc.unremovedMark = updatedDoc.delmark
			delete updatedDoc.delmark
			const toDispatch = [{ updateGrandParentHist: entry }]
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc,
				toDispatch,
				caller: 'restoreItemAndDescendants',
				onSuccessCallback: () => {
					// FOR PRODUCTS OVERVIEW ONLY: when undoing the removal of a requirement area, items must be reassigned to this area
					if (entry.removedNode.productId === MISC.AREA_PRODUCTID) {
						window.slVueTree.traverseModels((nm) => {
							if (entry.itemsRemovedFromReqArea.includes(nm._id)) {
								nm.data.reqarea = entry.removedNode._id
							}
						})
					}
					if (entry.isProductRemoved) {
						// re-enter the users roles for this product and update the user's subscriptions and product selection arrays with the re-entered product
						dispatch('addToMyProducts', { newRoles: entry.removedProductRoles, productId: _id, productTitle: entry.removedNode.title })
					}
					const path = entry.removedNode.path
					const prevNode = window.slVueTree.getPreviousNode(path)
					let cursorPosition
					if (entry.removedNode.path.slice(-1)[0] === 0) {
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
					window.slVueTree.insertNodes(cursorPosition, [entry.removedNode], { calculatePrios: entry.removedNode.parentId !== 'root' })

					// select the recovered node
					commit('updateNodesAndCurrentDoc', { selectNode: entry.removedNode })
					rootState.currentProductId = entry.removedNode.productId
					// restore the removed dependencies
					for (const d of entry.removedIntDependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					for (const d of entry.removedExtDependencies) {
						const node = window.slVueTree.getNodeById(d.id)
						if (node !== null) node.dependencies.push(d.dependentOn)
					}
					for (const c of entry.removedIntConditions) {
						const node = window.slVueTree.getNodeById(c.id)
						if (node !== null) node.conditionalFor.push(c.conditionalFor)
					}
					for (const c of entry.removedExtConditions) {
						const node = window.slVueTree.getNodeById(c.id)
						if (node !== null) node.conditionalFor.push(c.conditionalFor)
					}
					commit('showLastEvent', { txt: 'Item(s) remove is undone', severity: SEV.INFO })
					commit('updateNodesAndCurrentDoc', { newDoc: updatedDoc })

					dispatch('restoreDescendants', { entry, parentId: entry.removedNode._id })
				}
			})
		}).catch(error => {
			const msg = 'restoreItemAndDescendants: Could not read document with _id ' + _id + ', ' + error
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
			url: rootState.userData.currentDb + '/_design/design1/_view/removedDocToParentMap?' + composeRangeString(payload.parentId) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('loopUndoResults', { entry: payload.entry, results })
			} else {
				if (runningThreadsCount === 0) {
					// continue
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
			dispatch('restoreDescendants', { entry: payload.entry, parentId: r.id })
		}
		// execute unremove for these results
		dispatch('unremoveDescendants', { entry: payload.entry, results: payload.results })
	},

	/* Unmark the removed item and its descendants for removal. Do not distribute this event */
	unremoveDescendants({
		rootState,
		rootGetters,
		dispatch
	}, payload) {
		const entry = payload.entry
		const results = payload.results
		const docs = results.map(r => r.doc)
		for (const doc of docs) {
			const newHist = {
				ignoreEvent: ['unremoveDescendants'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)
			// restore removed dependencies if the array exists (when not the dependency cannot be removed from this document)
			if (doc.dependencies) {
				for (const d of entry.removedIntDependencies) {
					if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
				}
			}
			// restore removed conditions if the array exists (when not the condition cannot be removed from this document)
			if (doc.conditionalFor) {
				for (const c of entry.removedIntConditions) {
					if (c.id === doc._id) doc.conditionalFor.push(c.conditionalFor)
				}
			}
			// unmark for removal
			doc.unremovedMark = doc.delmark
			delete doc.delmark
		}

		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs, caller: 'unremoveDescendants', onSuccessCallback: () => {
				const leafLevel = rootGetters.leafLevel
				// all nodes have the same parent
				const parentNode = window.slVueTree.getNodeById(docs[0].parentId)
				if (parentNode && parentNode.level < leafLevel) {
					// restore the nodes as childs of the parent up to leafLevel
					for (const doc of docs) {
						window.slVueTree.insertDescendantNode(parentNode, doc)
					}
				}
			}
		})
	},

	/* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
	updateGrandParentHist({
		rootState,
		commit,
		dispatch
	}, entry) {
		const _id = entry.removedNode.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			const grandParentDoc = res.data
			const newHist = {
				childItemRestoredEvent: [entry.removedNode._id, entry.removedDescendantsCount, entry.removedIntDependencies, entry.removedExtDependencies,
				entry.removedIntConditions, entry.removedExtConditions, entry.removedProductRoles, entry.sprintIds, entry.itemsRemovedFromReqArea,
				entry.removedNode.level, entry.removedNode.data.subtype, entry.removedNode.title
				],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			grandParentDoc.history.unshift(newHist)

			//ToDo: must be saved as last DB update !!!!!!!!!!!!

			// unmark for removal in case it was removed
			if (grandParentDoc.delmark) {
				commit('showLastEvent', { txt: 'The document representing the item to restore under was removed. The removal is made undone.', severity: SEV.WARNING })
				delete grandParentDoc.delmark
			}
			const toDispatch = [{ restoreExtDepsAndConds: entry }]
			if (entry.removedNode.productId === MISC.AREA_PRODUCTID) {
				// restore the removed references to the requirement area
				toDispatch.push({ restoreReqarea: entry })
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc, toDispatch, caller: 'updateGrandParentHist' })
		}).catch(error => {
			const msg = 'updateGrandParentHist: Could not read document with _id ' + _id + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Restore the dependencies on and conditions for documents external to the restored descendants */
	restoreExtDepsAndConds({
		rootState,
		dispatch
	}, entry) {
		const docsToGet = []
		for (const d of entry.removedExtDependencies) {
			docsToGet.push({ id: d.id })
		}
		for (const c of entry.removedExtConditions) {
			docsToGet.push({ id: c.id })
		}
		if (docsToGet.length === 0) {
			// nothing to do
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
						for (const d of entry.removedExtDependencies) {
							if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
						}
					}
					// restore removed conditions if the array exists (when not the condition cannot be removed from this document)
					if (doc.conditionalFor) {
						for (const c of entry.removedExtConditions) {
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
				const msg = 'restoreExtDepsAndConds: The dependencies or conditions of these documents cannot be restored: ' + errorStr
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'restoreExtDepsAndConds' })
		}).catch(e => {
			const msg = 'restoreExtDepsAndConds: Could not read batch of documents: ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Restore the requirement area references */
	restoreReqarea({
		rootState,
		dispatch
	}, entry) {
		const docsToGet = []
		for (const id of entry.itemsRemovedFromReqArea) {
			docsToGet.push({ id: id })
		}
		if (docsToGet.length === 0) {
			// nothing to do
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
					doc.reqarea = entry.removedNode._id
					const newHist = {
						ignoreEvent: ['restoreReqarea'],
						timestamp: Date.now(),
						distributeEvent: false
					}
					doc.history.unshift(newHist)

					docs.push(doc)
				}
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'restoreReqarea' })
		}).catch(e => {
			const msg = 'restoreReqarea: Could not read batch of documents: ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
