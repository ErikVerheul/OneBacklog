import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

/* Get the properties that can change in a move plus some properties needed to process descendants and for the history record */
function getMoveState(rootState, items, createdAs) {
	const extract = {}
	// all items must have the same productId, parent and level
	extract.createdAs = createdAs
	extract.productId = items[0].productId
	extract.parentId = items[0].parentId
	extract.level = items[0].level
	const parentNode = rootState.helpersRef.getNodeById(items[0].parentId)
	extract.parentTitle = parentNode.title

	extract.allDescendantsCount = 0
	for (const nm of items) {
		const descendantsCount = rootState.helpersRef.getDescendantsInfo(nm).count
		extract[nm._id] = {
			ind: nm.ind,
			descendantIds: rootState.helpersRef.getDescendantsInfo(nm).ids,
			descendantsCount,
			priority: nm.data.priority,
			sprintId: nm.data.sprintId,
			team: nm.data.team,
			lastPositionChange: nm.data.lastPositionChange,
		}
		extract.allDescendantsCount += extract[nm._id].descendantsCount
	}
	return extract
}

function createUpdateSet(rootState, id, afterMoveState) {
	const targetParentId = afterMoveState.parentId
	const node = rootState.helpersRef.getNodeById(id)
	if (node && node.data.tmp) {
		if (node.data.tmp.targetParentId === targetParentId) return node.data.tmp
	}
	return undefined
}

/* The parentIds in the collection must be unique */
function isADuplicate(targetParentsToUpdate, newSet) {
	for (const set of targetParentsToUpdate) {
		if (set.targetParentId === newSet.targetParentId) return true
	}
	return false
}

const actions = {
	/*
	 * Multiple items with the same parent can be moved. The children of these items need no update unless the move is to another level (promote/demote) or product.
	 * Note: the tree model is updated before the database is. To update the database the new priority is calculated on inserting the node in the tree.
	 * Order of execution:
	 * 1. update the moved items with productId, parentId, level, priority, sprintId and history. History is used for syncing with other sessions and reporting
	 * 2. if moving to another product or level, update the productId (not parentId) and level of the descendants
	 * 3. save the update of the moved items and per item the child updates in multiple database bulk updates
	 * 4. if the inserted task has a sprintId and the parent does not, the parent user story need to be updated with the sprintId of the child task
	 * 5. as 4 for the team name
	 */

	updateMovedItemsBulk({ rootState, commit, dispatch }, payload) {
		let items = []
		let beforeMoveState = undefined
		let afterMoveState = undefined

		if (!payload.isUndoAction) {
			items = payload.nodes
			// make the branch with the nodes to be moved, including the branch root, unselectable
			rootState.helpersRef.setBranchUnselectable(payload.dropTarget)

			beforeMoveState = getMoveState(rootState, items, 'beforeMoveState')
			rootState.helpersRef.removeNodes(items)
			rootState.helpersRef.insertMovedNodes(payload.cursorPosition, items)
			afterMoveState = getMoveState(rootState, items, 'afterMoveState')
		}

		if (payload.isUndoAction) {
			const undoEntry = payload.entry
			items = undoEntry.items
			beforeMoveState = undoEntry.beforeMoveState
			afterMoveState = undoEntry.afterMoveState
		}

		const docIdsToGet = []
		for (const it of items) {
			docIdsToGet.push({ id: it._id })
		}

		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
				const results = res.data.results
				const updatedDocs = []
				const error = []
				const targetParentsToUpdate = []
				const toDispatch = []
				// if moving to another product or another level also update the descendants of the moved(back) items
				const alsoUpdateDescendants = afterMoveState.productId !== beforeMoveState.productId || afterMoveState.level !== beforeMoveState.level
				for (const r of results) {
					const envelope = r.docs[0]
					if (envelope.ok) {
						// the item was loaded
						const doc = envelope.ok
						const descendantsMetaData = rootState.helpersRef.getDescendantsInfoOnId(doc._id)
						// copy any changes due to the move
						doc.productId = afterMoveState.productId
						doc.parentId = afterMoveState.parentId
						doc.level = afterMoveState.level

						doc.priority = afterMoveState[doc._id].priority
						doc.sprintId = afterMoveState[doc._id].sprintId
						doc.team = afterMoveState[doc._id].team
						doc.lastPositionChange = afterMoveState[doc._id].lastPositionChange

						// find the affected sprints
						const sprintsAffected = []
						if (beforeMoveState[doc._id].sprintId) {
							if (!sprintsAffected.includes(beforeMoveState[doc._id].sprintId)) sprintsAffected.push(beforeMoveState[doc._id].sprintId)
						}
						if (afterMoveState[doc._id].sprintId) {
							if (!sprintsAffected.includes(afterMoveState[doc._id].sprintId)) sprintsAffected.push(afterMoveState[doc._id].sprintId)
						}
						for (const sId of descendantsMetaData.sprintIds) {
							if (!sprintsAffected.includes(sId)) sprintsAffected.push(sId)
						}
						// find the affected teams
						const teamsAffected = doc.team ? [doc.team] : []
						for (const t of descendantsMetaData.teams) {
							if (!teamsAffected.includes(t)) teamsAffected.push(t)
						}
						// check if the parent user story need to be updated with the team and/or the sprintId of the child task
						const updateSet = createUpdateSet(rootState, doc._id, afterMoveState)
						if (updateSet && !isADuplicate(targetParentsToUpdate, updateSet)) {
							targetParentsToUpdate.push(updateSet)
						}
						const newHist = {
							nodeMovedEvent: [
								beforeMoveState.level,
								afterMoveState.level,
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
								afterMoveState[doc._id].lastPositionChange,
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
						updatedDocs.push(doc)

						if (alsoUpdateDescendants) {
							toDispatch.push({ updateMovedDescendants: { itemId: doc._id, beforeMoveState, afterMoveState } })
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
					commit('addToEventList', {
						txt: 'The move failed due to update errors. Try again after signing-in again or contact your administrator',
						severity: SEV.WARNING,
					})
					commit('endSession', `updateMovedItemsBulk, error = ${errorStr}`)
				} else {
					if (!payload.isUndoAction) {
						// create an entry for undoing the move in a last-in first-out sequence
						const newUndoEntry = {
							type: 'undoMove',
							items,
							beforeMoveState: afterMoveState,
							afterMoveState: beforeMoveState,
						}
						rootState.changeHistory.unshift(newUndoEntry)
					}
					if (targetParentsToUpdate.length > 0) {
						toDispatch.push({ updateMovedItemsParents: targetParentsToUpdate })
					}
					dispatch('saveMovedItems', {
						dropTarget: payload.dropTarget,
						items,
						docs: updatedDocs,
						beforeMoveState,
						afterMoveState,
						isUndoAction: payload.isUndoAction,
						toDispatch,
					})
				}
			})
			.catch((error) => {
				const msg = `updateMovedItemsBulk: Could not read descendants in bulk. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/*
	 * If moving to another product or another level also update the descendants of the moved(back) item.
	 * Note that the parent and the priority of a descendant does not change.
	 */
	updateMovedDescendants({ rootState, dispatch }, payload) {
		const itemId = payload.itemId
		const beforeMoveState = payload.beforeMoveState
		const afterMoveState = payload.afterMoveState
		const docIdsToGet = []
		for (const id of afterMoveState[itemId].descendantIds) {
			docIdsToGet.push({ id })
		}

		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		}).then((res) => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const levelShift = afterMoveState.level - beforeMoveState.level
					doc.productId = afterMoveState.productId
					doc.level = doc.level + levelShift
					doc.lastPositionChange = afterMoveState[itemId].lastPositionChange
					const newHist = {
						ignoreEvent: ['updateMovedDescendants'],
						timestamp: Date.now(),
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
			}

			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs,
				caller: 'updateMovedDescendants',
			})
		})
	},

	/*
	 * Save the updated documents of the moved items.
	 * Dispatch the update of the item descendants and/or the item's parent (separate updates for each item).
	 * Restore the tree view if an undoAction.
	 */
	saveMovedItems({ rootState, commit, dispatch }, payload) {
		const items = payload.items
		const beforeMoveState = payload.beforeMoveState
		const afterMoveState = payload.afterMoveState
		console.log('saveMovedItems: titles = ' + payload.docs.map((doc) => doc.title))
		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb,
			docs: payload.docs,
			caller: 'saveMovedItems',
			toDispatch: payload.toDispatch,
			onSuccessCallback: () => {
				if (!payload.isUndoAction) {
					commit('addToEventList', {
						txt: `${items.length} items have been moved with ${beforeMoveState.allDescendantsCount} descendants`,
						severity: SEV.INFO,
					})
					// make the branch with the moved nodes selectable again
					rootState.helpersRef.unSetBranchUnselectable(payload.dropTarget)
				}

				/* Restore the nodes in their previous (source) position */
				if (payload.isUndoAction) {
					const parentNode = rootState.helpersRef.getNodeById(afterMoveState.parentId)

					// process each item individually as the items need not be adjacent
					for (const item of items) {
						const id = item._id
						rootState.helpersRef.removeNodes([item])
						// restore the original prop values
						item.productId = afterMoveState.productId
						item.parentId = afterMoveState.parentId
						item.level = afterMoveState.level
						item.data.priority = afterMoveState[id].priority
						item.data.sprintId = afterMoveState[id].sprintId
						item.data.team = afterMoveState[id].team
						item.data.lastPositionChange = afterMoveState[id].lastPositionChange

						let cursorPosition
						if (parentNode.children.length > 0) {
							let child
							for (let idx = 0; idx < parentNode.children.length; idx++) {
								child = parentNode.children[idx]
								if (child.data.priority < item.data.priority) {
									cursorPosition = {
										nodeModel: child,
										placement: 'before',
									}
									break
								}
							}
							if (child && !cursorPosition) {
								// restore the item as the last child
								cursorPosition = {
									nodeModel: child,
									placement: 'after',
								}
							}
						} else {
							cursorPosition = {
								nodeModel: parentNode,
								placement: 'inside',
							}
						}

						if (cursorPosition) {
							// if a product branch is moved to another location the product ids of the items in the branch must not change
							const skipUpdateProductId = beforeMoveState.parentId === 'root' && afterMoveState.parentId === 'root'
							rootState.helpersRef.insertNodes(cursorPosition, [item], { calculatePrios: false, skipUpdateProductId })
						} else {
							const msg = `saveMovedItems: cannot restore item with title '${item.title}' in the tree view`
							dispatch('doLog', { event: msg, level: SEV.ERROR })
						}
					}

					commit('addToEventList', {
						txt: `${items.length} items have been moved back with ${afterMoveState.allDescendantsCount} descendants`,
						severity: SEV.INFO,
					})
				}
			},
		})
	},

	/* Update the parents of the moved items if the team and/or sprintId have changed  */
	updateMovedItemsParents({ rootState, dispatch }, targetParentsToUpdate) {
		console.log('updateMovedItemsParents: targetParentsToUpdate = ' + JSON.stringify(targetParentsToUpdate))
		const docIdsToGet = []
		for (const set of targetParentsToUpdate) {
			docIdsToGet.push({ id: set.targetParentId })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
				const results = res.data.results
				const docs = []
				for (const r of results) {
					const envelope = r.docs[0]
					if (envelope.ok) {
						const doc = envelope.ok
						for (const set of targetParentsToUpdate) {
							if (set.targetParentId === doc._id) {
								let oldTeam
								let oldSprintId
								if (set.team) {
									oldTeam = doc.tem
									doc.team = set.team
								}
								if (set.sprintId) {
									oldSprintId = doc.sprintId
									doc.sprintId = set.sprintId
								}
								doc.lastOtherChange = Date.now()
								const newHist = {
									updateMovedItemParentEvent: [doc.team, doc.sprintId],
									by: rootState.userData.user,
									timestamp: Date.now(),
									sessionId: rootState.mySessionId,
									distributeEvent: true,
									updateBoards: { sprintsAffected: set.sprintId ? [oldSprintId, doc.sprintId] : [], teamsAffected: set.team ? [oldTeam, doc.team] : [] },
								}
								doc.history.unshift(newHist)
								docs.push(doc)
							}
						}
					}
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb,
					docs,
					caller: 'updateMovedItemsParents',
				})
			})
			.catch((error) => {
				const msg = `updateMovedItemsParents: Could not read moved parents in bulk. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},
}

export default {
	actions,
}
