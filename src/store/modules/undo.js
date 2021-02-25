import { SEV, MISC } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

const actions = {
	/*
		* ToDo: create undo's if any of these steps fail
		* Undo removal of a branche
		* Order of execution:
		* 1. restore the descendants
		* 2. restore the parent of the descendants and update the tree
		* 3. update the grandparent of the descendants (if removed then undo the removal)
		* 4. restore the external dependencies & conditions
		* If any of these steps fail the next steps are not executed but not undone
		*/

	restoreIDescendants({
		dispatch
	}, payload) {
		for (const r of payload.results) {
			const id = r.id
			dispatch('restoreItemAndDescendants', { entry: payload.entry, parentId: id })
		}
		// execute unremove for these results
		dispatch('unremoveItemAndDescendants', { entry: payload.entry, results: payload.results })
	},

	/* Executes the passed action on all descendants of the parent */
	restoreItemAndDescendants({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/removedDocToParentMap?' + composeRangeString(payload.parentId) + '&include_docs=true'
		}).then(res => {
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('restoreIDescendants', { entry: payload.entry, results })
			}
		}).catch(error => {
			const msg = `restoreItemAndDescendants: Could not scan the descendants of document with id ${payload.parentId}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Unmark the removed item and its descendants for removal. Do not distribute this event */
	unremoveItemAndDescendants({
		rootState,
		dispatch
	}, payload) {
		const entry = payload.entry
		const results = payload.results
		const docs = results.map(r => r.doc)
		for (const doc of docs) {
			const newHist = {
				ignoreEvent: ['unremoveItemAndDescendants'],
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
			doc.delmark = false
		}

		const toDispatch = [{ restoreParent: entry }]
		dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'unremoveItemAndDescendants' })
	},

	/* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
	restoreParent({
		rootState,
		commit,
		dispatch
	}, entry) {
		const _id = entry.removedNode._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			const updatedDoc = res.data
			const newHist = {
				docRestoredEvent: [entry.docsRemovedIds.length - 1, entry.removedIntDependencies, entry.removedExtDependencies,
				entry.removedIntConditions, entry.removedExtConditions, entry.removedProductRoles, entry.sprintIds, entry.itemsRemovedFromReqArea],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			updatedDoc.history.unshift(newHist)

			updatedDoc.delmark = false
			const toDispatch = [{ updateGrandParentHist: entry }]
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc,
				toDispatch,
				caller: 'restoreParent',
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
					// do not recalculate priorities when inserting a product node
					window.slVueTree.insert(cursorPosition, [entry.removedNode], entry.removedNode.parentId !== 'root')
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
				}
			})
		}).catch(error => {
			const msg = 'restoreParent: Could not read document with _id ' + _id + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
				grandParentDocRestoredEvent: [entry.removedNode.level, entry.removedNode.title, entry.docsRemovedIds.length - 1, entry.removedNode.data.subtype],
				by: rootState.userData.user,
				timestamp: Date.now(),
				distributeEvent: false
			}
			grandParentDoc.history.unshift(newHist)

			// unmark for removal in case it was removed
			if (grandParentDoc.delmark) {
				commit('showLastEvent', { txt: 'The document representing the item to restore under was removed. The removal is made undone.', severity: SEV.WARNING })
				grandParentDoc.delmark = false
			}
			const toDispatch = [{ restoreExtDepsAndConds: entry }]
			if (entry.removedNode.productId === MISC.AREA_PRODUCTID) {
				// restore the removed references to the requirement area
				toDispatch.push({ restoreReqarea: entry })
			}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc, toDispatch, caller: 'updateGrandParentHist' })
		}).catch(error => {
			const msg = 'unDoRemove: Could not read document with _id ' + _id + ', ' + error
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
					// unmark for removal
					doc.delmark = false
					docs.push(doc)
				}
				if (r.docs[0].error) errors.push(r.docs[0].error)
			}
			if (errors.length > 0) {
				const errorStr = ''
				for (const e of errors) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
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
