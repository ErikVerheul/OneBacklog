import { LEVEL, SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

function getMoveState(rootState, items) {
	const descendantIds = []
	for (const nm of items) {
		descendantIds.push(...rootState.helpersRef.getDescendantsInfo(nm).ids)
	}
	const extract = {}
	// all items must have the same productId parent and level
	extract.productId = items[0].productId
	extract.parentId = items[0].parentId
	extract.parentTitle = rootState.helpersRef.getNodeById(items[0].parentId).title
	extract.level = items[0].level
	extract.descendantIds = descendantIds
	for (const nm of items) {
		extract[nm._id] = {
			ind: nm.ind,
			dependencies: nm.dependencies,
			descendantsCount: rootState.helpersRef.getDescendantsInfo(nm).count,
			conditionalFor: nm.conditionalFor,
			priority: nm.data.priority,
			sprintId: nm.data.sprintId,
			team: nm.data.team,
			lastPositionChange: nm.data.lastPositionChange,
		}
	}
	return extract
}

const actions = {
	/*
	 * Multiple items with the same parent can be moved. The children of these items need no update unless the move is to another level (promote/demote) or product.
	 * Note: the tree model is updated before the database is. To update the database the new priority is calculated on inserting the node in the tree.
	 * Order of execution:
	 * 1. update the moved items with productId, parentId, level, priority, sprintId and history. History is used for syncing with other sessions and reporting
	 * 2. if moving to another product or level, update the productId (not parentId) and level of the descendants
	 * 3. save the update of the moved items and all child updates in one database bulk update
	 */

	/* New approach ======================================================================================================================================================= */

	updateMovedItemsBulk({ rootState, commit, dispatch }, payload) {
		let items = []
		let beforeMoveState = undefined
		let afterMoveState = undefined
		let undoEntry = undefined

		if (!payload.isUndoAction) {
			items = payload.nodes
			// make the branch with the nodes to be moved, including the branch root, unselectable
			rootState.helpersRef.setBranchUnselectable(payload.dropTarget)

			beforeMoveState = getMoveState(rootState, items)
			rootState.helpersRef.removeNodes(items)
			// items are assigned a new priority; if moving a product skip updating the productId
			const skipUpdateProductId = beforeMoveState.parentId === 'root' && afterMoveState.parentId === 'root'
			rootState.helpersRef.insertNodes(payload.cursorPosition, items, { calculatePrios: true, skipUpdateProductId })
			afterMoveState = getMoveState(rootState, items)
		}

		if (payload.isUndoAction) {
			undoEntry = payload.entry
			items = undoEntry.items
			// switch before and after state
			beforeMoveState = undoEntry.afterMoveState
			afterMoveState = undoEntry.beforeMoveState
		}

		const itemIds = items.map((n) => n._id)
		const allIds = itemIds.concat(beforeMoveState.descendantIds)

		const docIdsToGet = []
		for (const id of allIds) {
			docIdsToGet.push({ id })
		}

		// if moving to another product or another level also update the descendants of the moved(back) items
		const alsoUpdateDescendants = afterMoveState.productId !== beforeMoveState.productId || afterMoveState.level !== beforeMoveState.level

		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
				const results = res.data.results
				const docs = []
				const error = []
				for (const r of results) {
					const envelope = r.docs[0]
					if (envelope.ok) {
						const doc = envelope.ok
						if (itemIds.includes(doc._id)) {
							const descendantsMetaData = rootState.helpersRef.getDescendantsInfoOnId(doc._id)
							// update the document; products never change their own product id
							if (doc.level !== LEVEL.PRODUCT) doc.productId = afterMoveState.productId
							doc.level = afterMoveState.level
							doc.parentId = afterMoveState.parentId
							doc.dependencies = afterMoveState[doc._id].dependencies
							doc.conditionalFor = afterMoveState[doc._id].conditionalFor
							doc.priority = afterMoveState[doc._id].priority
							doc.sprintId = afterMoveState[doc._id].sprintId
							doc.lastPositionChange = Date.now()
							// find the affected sprints
							const sprintsAffected = []
							if (beforeMoveState[doc._id].sprintId) sprintsAffected.push(beforeMoveState[doc._id].sprintId)
							if (afterMoveState[doc._id].sprintId) sprintsAffected.push(afterMoveState[doc._id].sprintId)
							for (const id of descendantsMetaData.sprintIds) {
								if (!sprintsAffected.includes(id)) sprintsAffected.push(id)
							}
							// find the affected teams
							const teamsAffected = doc.team ? [doc.team] : []
							for (const t of descendantsMetaData.teams) {
								if (!teamsAffected.includes(t)) teamsAffected.push(t)
							}
							const newHist = {
								nodeMovedEvent: [
									beforeMoveState[doc._id].level,
									afterMoveState[doc._id].level,
									afterMoveState[doc._id].ind,
									afterMoveState.parentTitle,
									beforeMoveState[doc._id].descendantsCount,
									beforeMoveState.parentTitle,
									'dummy',
									beforeMoveState.parentId,
									afterMoveState.parentId,
									beforeMoveState[doc._id].ind,
									afterMoveState[doc._id].priority,
									beforeMoveState[doc._id].sprintId,
									afterMoveState[doc._id].sprintId,
									payload.isUndoAction ? 'undoMove' : 'move',
									doc.lastPositionChangee,
									beforeMoveState.parentId === 'root' && afterMoveState.parentId === 'root',
								],
								by: rootState.userData.user,
								email: rootState.userData.email,
								doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
								timestamp: Date.now(),
								isListed: true,
								sessionId: rootState.mySessionId,
								distributeEvent: true,
								updateBoards: { sprintsAffected, teamsAffected },
							}
							doc.history.unshift(newHist)
							docs.push(doc)
						} else if (alsoUpdateDescendants && beforeMoveState.descendantIds.includes(doc._id)) {
							const levelShift = afterMoveState.level - beforeMoveState.level
							// update descendant documents; the productId and/or level have changed
							if (doc.level !== LEVEL.PRODUCT) doc.productId = afterMoveState.productId
							doc.level = doc.level + levelShift
							doc.lastPositionChange = Date.now()
							const newHist = {
								ignoreEvent: ['updateMovedItemsBulk'],
								timestamp: Date.now(),
							}
							doc.history.unshift(newHist)
							docs.push(doc)
						}
					}
					if (envelope.error) error.push(envelope.error)
				}

				if (error.length > 0) {
					const errorStr = ''
					for (const e of error) {
						errorStr.concat(`${e.id} (error = ${e.error},  reason = ${e.reason}), `)
					}
					const msg = 'updateMovedItemsBulk: These items cannot be updated: ' + errorStr
					dispatch('doLog', { event: msg, level: SEV.ERROR })
					// ToDo: make this an alert with the only option to restart the application
					commit('addToEventList', {
						txt: 'The move failed due to update errors. Try again after sign-out or contact your administrator',
						severity: SEV.WARNING,
					})
				} else {
					if (!payload.isUndoAction) {
						// create an entry for undoing the move in a last-in first-out sequence
						undoEntry = {
							type: 'undoMove',
							items,
							beforeMoveState,
							afterMoveState,
						}
						rootState.changeHistory.unshift(undoEntry)
					}
					dispatch('saveMovedItems', {
						dropTarget: payload.dropTarget,
						items,
						docs,
						beforeMoveState,
						afterMoveState,
						isUndoAction: payload.isUndoAction,
					})
				}
			})
			.catch((error) => {
				const msg = `updateMovedItemsBulk: Could not read descendants in bulk. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Save the updated documents of the moved items and their descendants */
	saveMovedItems({ rootState, commit, dispatch }, payload) {
		const items = payload.items
		const beforeMoveState = payload.beforeMoveState
		const afterMoveState = payload.afterMoveState
		const isUndoAction = payload.isUndoAction
		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb,
			docs: payload.docs,
			caller: 'saveMovedItems',
			onSuccessCallback: () => {
				if (!isUndoAction) {
					commit('addToEventList', {
						txt: `${items.length} items have been moved with ${beforeMoveState.descendantIds.length} descendants`,
						severity: SEV.INFO,
					})
					// make the branch with the moved nodes selectable again
					rootState.helpersRef.unSetBranchUnselectable(payload.dropTarget)
				}

				if (isUndoAction) {
					/* Restore the nodes in their previous (source) position */
					const parentNode = rootState.helpersRef.getNodeById(afterMoveState.parentId)
					if (beforeMoveState.parentId !== afterMoveState.parentId) {
						// sort to insert top down
						items.sort((a, b) => a.ind - b.ind)
					} else {
						// sort to insert bottom up
						items.sort((a, b) => b.ind - a.ind)
					}

					// process each item individually as the items need not be adjacent
					for (const item of items) {
						const id = item._id

						// calculate the insert cursorPosition parameter
						let cursorPosition
						if (afterMoveState[id].ind === 0) {
							cursorPosition = {
								nodeModel: parentNode,
								placement: 'inside',
							}
						} else {
							let topSibling
							if (beforeMoveState.parentId !== afterMoveState.parentId) {
								topSibling = parentNode.children[afterMoveState[id].ind - 1]
							} else {
								topSibling = parentNode.children[afterMoveState[id].ind - (beforeMoveState[id].ind > afterMoveState[id].ind ? 1 : 0)]
							}
							cursorPosition = {
								nodeModel: topSibling,
								placement: 'after',
							}
						}

						rootState.helpersRef.removeNodes([item])

						item.level = afterMoveState.level
						item.productId = afterMoveState.productId
						item.parentId = afterMoveState.parentId
						item.dependencies = afterMoveState[id].dependencies
						item.conditionalFor = afterMoveState[id].conditionalFor
						item.data.priority = afterMoveState[id].priority
						item.data.sprintId = afterMoveState[id].sprintId
						item.data.lastPositionChange = afterMoveState[id].lastPositionChange

						const skipUpdateProductId = beforeMoveState.parentId === 'root' && afterMoveState.parentId === 'root'
						rootState.helpersRef.insertNodes(cursorPosition, [item], { calculatePrios: false, skipUpdateProductId })
					}

					commit('addToEventList', {
						txt: `${items.length} items have been moved back with ${afterMoveState.descendantIds.length} descendants`,
						severity: SEV.INFO,
					})
				}
			},
		})
	},
}

export default {
	actions,
}
