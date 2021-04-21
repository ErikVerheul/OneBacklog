import { LEVEL, SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var runningThreadsCount

function composeRangeString(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

const actions = {
	/*
	* Multiple items with the same parent can be moved. The children of these items need no update unless the move is to another level (promote/demote) or product.
	* Note: the tree model is updated before the database is. To update the database the new priority must be calculated first while inserting the node.
	* Order of execution:
	* 1. update the moved items with productId, parentId, level, priority, sprintId and history. History is used for syncing with other sessions and reporting
	* 2. if moving to another product or level, call getMovedChildren and update the productId (not parentId) and level of the descendants in updateMovedDescendantsBulk.
	* 3. save the update of the moved items with the nodeMovedEvent if all child updates are done (thus preventing other users to process the update premature)
	*/
	updateMovedItemsBulk({
		rootState,
		commit,
		dispatch
	}, payload) {
		runningThreadsCount = 0
		const mdc = payload.moveDataContainer
		const items = []
		let moveInfo = []
		if (payload.move) {
			moveInfo = {
				// this info is the same for all nodes moved
				type: 'move',
				sourceProductId: mdc.sourceProductId,
				sourceParentId: mdc.sourceParentId,
				sourceLevel: mdc.sourceLevel,
				sourceProductTitle: mdc.sourceProductTitle,
				sourceParentTitle: mdc.sourceParentTitle,

				levelShift: mdc.targetLevel - mdc.sourceLevel,
				placement: mdc.placement,

				targetProductId: mdc.targetProductId,
				targetParentId: mdc.targetParentId,
				targetProductTitle: mdc.targetProductTitle,
				targetParentTitle: mdc.targetParentTitle
			}

			for (const f of mdc.forwardMoveMap) {
				const node = f.node
				if (node === null) continue
				// set the sprintId and the <moved> badge with the lastPositionChange timestamp
				commit('updateNodesAndCurrentDoc', { node, sprintId: f.targetSprintId, lastPositionChange: Date.now() })
				// create item
				const payloadItem = {
					node,
					id: node._id,
					level: node.level,
					sourceInd: f.sourceInd,
					newlyCalculatedPriority: node.data.priority,
					targetInd: f.targetInd,
					childCount: node.children.length,
					sourceSprintId: f.sourceSprintId,
					targetSprintId: f.targetSprintId,
					lastPositionChange: Date.now()
				}
				items.push(payloadItem)
			}
		} else if (payload.undoMove) {
			moveInfo = {
				type: 'undoMove',
				sourceProductId: mdc.targetProductId,
				sourceParentId: mdc.targetParentId,
				sourceLevel: mdc.targetLevel,
				sourceParentTitle: mdc.targetParentTitle,
				levelShift: mdc.sourceLevel - mdc.targetLevel,
				targetProductId: mdc.sourceProductId,
				targetParentId: mdc.sourceParentId,
				targetParentTitle: mdc.sourceParentTitle
			}

			for (const r of mdc.reverseMoveMap) {
				const node = r.node
				if (node === null) continue
				// reset the sprintId and the <moved> badge
				commit('updateNodesAndCurrentDoc', { node, sprintId: r.targetSprintId, lastPositionChange: r.lastPositionChange })
				// create item
				const payloadItem = {
					node,
					id: node._id,
					level: node.level,
					sourceInd: r.sourceInd,
					newlyCalculatedPriority: node.data.priority,
					targetInd: r.targetInd,
					childCount: node.children.length,
					sourceSprintId: r.sourceSprintId,
					targetSprintId: r.targetSprintId,
					lastPositionChange: r.lastPositionChange
				}
				items.push(payloadItem)
			}
		} else return

		// lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (const item of items) {
				if (item.id === id) {
					return item
				}
			}
		}
		const docsToGet = []
		for (const item of items) {
			docsToGet.push({ id: item.id })
		}
		const m = moveInfo
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					// save the affected items on the boards
					const descendantsMetaData = window.slVueTree.getDescendantsInfoOnId(doc._id)
					const sprintsAffected = doc.sprintId ? [doc.sprintId] : []
					for (const s of descendantsMetaData.sprintIds) {
						if (!sprintsAffected.includes(s)) sprintsAffected.push(s)
					}
					const teamsAffected = doc.team ? [doc.team] : []
					for (const t of descendantsMetaData.teams) {
						if (!teamsAffected.includes(t)) teamsAffected.push(t)
					}
					const item = getPayLoadItem(doc._id)
					const newHist = {
						nodeMovedEvent: [m.sourceLevel, m.sourceLevel + m.levelShift, item.targetInd, m.targetParentTitle, item.childCount, m.sourceParentTitle, m.placement, m.sourceParentId, m.targetParentId,
						item.sourceInd, item.newlyCalculatedPriority, item.sourceSprintId, item.targetSprintId, m.type, item.lastPositionChange],
						by: rootState.userData.user,
						timestamp: Date.now(),
						sessionId: rootState.mySessionId,
						distributeEvent: true,
						updateBoards: { sprintsAffected, teamsAffected }
					}
					doc.history.unshift(newHist)

					doc.parentId = m.targetParentId
					doc.level = doc.level + m.levelShift
					doc.productId = m.targetProductId
					// check and correction for error: product level items must have their own id as productId
					if (doc.level === LEVEL.PRODUCT && doc.productId !== doc._id) {
						const msg = `updateMovedItemsBulk: Product with id ${doc._id} was assigned ${doc.productId} as product id. Is corrected to be equal to the id.`
						dispatch('doLog', { event: msg, level: SEV.WARNING })
						doc.productId = doc._id
					}
					doc.priority = item.newlyCalculatedPriority
					doc.sprintId = item.targetSprintId
					doc.lastPositionChange = item.lastPositionChange
					doc.lastChange = item.lastPositionChange
					docs.push(doc)
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
				commit('showLastEvent', { txt: 'The move failed due to update errors. Try again after sign-out or contact your administrator', severity: SEV.WARNING })
			} else {
				if (m.targetProductId !== m.sourceProductId || m.levelShift !== 0) {
					// if moving to another product or another level, update the descendants of the moved(back) items
					const updates = {
						targetProductId: m.targetProductId,
						levelShift: m.levelShift
					}
					for (const it of items) {
						// run in parallel for all moved nodes (nodes on the same level do not share descendants)
						dispatch('getMovedChildren', { updates, parentId: it.id, toDispatch: [{ saveMovedItems: { moveDataContainer: mdc, moveInfo, items, docs, move: payload.move } }] })
					}
				} else {
					// no need to process descendants
					dispatch('saveMovedItems', { moveDataContainer: mdc, moveInfo, items, docs, move: payload.move })
				}
			}
		}).catch(error => {
			const msg = `updateMovedItemsBulk: Could not read descendants in bulk. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	saveMovedItems({
		rootState,
		commit,
		dispatch
	}, payload) {
		const items = payload.items
		const docs = payload.docs
		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs, caller: 'saveMovedItems', onSuccessCallback: () => {
				for (const it of items) {
					// update the history of the moved items
					commit('updateNodesAndCurrentDoc', { node: it.node, sprintId: it.targetSprintId, lastPositionChange: it.lastPositionChange })
				}
				if (payload.move) {
					// create an entry for undoing the move in a last-in first-out sequence
					const entry = {
						type: 'undoMove',
						moveDataContainer: payload.moveDataContainer,
						items
					}
					rootState.changeHistory.unshift(entry)
				}
			}
		})
	},

	getMovedChildren({
		rootState,
		dispatch
	}, payload) {
		runningThreadsCount++
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.parentId) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('loopMoveResults', { updates: payload.updates, results, toDispatch: payload.toDispatch })
			} else {
				if (runningThreadsCount === 0) {
					// execute saveMovedItems that emits the nodeMovedEvent to other online users
					dispatch('additionalActions', payload)
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `getMovedChildren: Could not fetch the child documents of document with id ${payload.parentId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	loopMoveResults({
		dispatch
	}, payload) {
		for (const r of payload.results) {
			const id = r.id
			dispatch('getMovedChildren', { updates: payload.updates, parentId: id, toDispatch: payload.toDispatch })
		}
		// execute update for these results
		dispatch('updateMovedDescendantsBulk', { updates: payload.updates, results: payload.results })
	},

	updateMovedDescendantsBulk({
		rootState,
		dispatch
	}, payload) {
		const docs = payload.results.map(r => r.doc)
		const updates = payload.updates
		for (const doc of docs) {
			doc.productId = updates.targetProductId
			// the parentId does not change for descendants
			doc.level = doc.level + updates.levelShift
			// priority does not change for descendants
			const newHist = {
				ignoreEvent: ['updateMovedDescendantsBulk'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			doc.history.unshift(newHist)
		}
		dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'updateMovedDescendantsBulk' })
	}
}

export default {
	actions
}
