import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const WARNING = 1
const ERROR = 2

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

const actions = {
	updateMovedItemsBulk({
		rootState,
		commit,
		dispatch
	}, payload) {
		const mdc = payload.moveDataContainer
		let items = []
		let moveInfo = []
		if (payload.move) {
			for (let f of mdc.forwardMoveMap) {
				const node = f.node
				if (node === null) break
				// set the <moved> badge
				node.data.lastPositionChange = Date.now()
				// create item
				const payloadItem = {
					id: node._id,
					level: node.level,
					sourceInd: f.sourceInd,
					newlyCalculatedPriority: node.data.priority,
					targetInd: f.targetInd,
					childCount: node.children.length,
					sprintId: f.sprintId
				}
				items.push(payloadItem)
			}
			moveInfo = {
				// this info is the same for all nodes moved
				type: 'move',
				sourceProductId: mdc.sourceProductId,
				sourceParentId: mdc.sourceParentId,
				sourceLevel: mdc.sourceLevel,
				sourceSprintId: mdc.sourceSprintId,
				sourceProductTitle: mdc.sourceProductTitle,
				sourceParentTitle: mdc.sourceParentTitle,

				levelShift: mdc.targetLevel - mdc.sourceLevel,
				placement: mdc.placement,

				targetProductId: mdc.targetProductId,
				targetParentId: mdc.targetParentId,
				targetSprintId: mdc.targetSprintId,
				targetProductTitle: mdc.targetProductTitle,
				targetParentTitle: mdc.targetParentTitle
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
				targetParentTitle: mdc.sourceParentTitle,
			}

			for (let r of mdc.reverseMoveMap) {
				const node = r.node
				if (node === null) break

				// [only for detail view] reset the sprintId
				node.data.sprintId = r.sprintId
				if (node.level === this.pbiLevel && node.children) {
					for (let c of node.children) {
						c.data.sprintId = r.sprintId
					}
				}
				// reset the <moved> badge
				node.data.lastPositionChange = r.lastPositionChange
				// create item
				const payloadItem = {
					id: node._id,
					level: node.level,
					sourceInd: r.sourceInd,
					newlyCalculatedPriority: node.data.priority,
					targetInd: r.targetInd,
					childCount: node.children.length,
					sprintId: r.sprintId
				}
				items.push(payloadItem)
			}
		} else return

		// lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (let item of items) {
				if (item.id === id) {
					return item
				}
			}
		}
		const docsToGet = []
		for (let item of items) {
			docsToGet.push({ "id": item.id })
		}
		const m = moveInfo
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const item = getPayLoadItem(doc._id)
					let newHist = {}
					if (payload.move) {
						newHist = {
							nodeDroppedEvent: [m.sourceLevel, m.sourceLevel + m.levelShift, item.targetInd, m.targetParentTitle, item.childCount, m.sourceParentTitle,
							m.placement, m.sourceParentId, m.targetParentId, item.sourceInd],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.userData.sessionId,
							distributeEvent: false
						}
					} else if (payload.undoMove) {
						newHist = {
							nodeUndoMoveEvent: [rootState.userData.user],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.userData.sessionId,
							distributeEvent: false
						}
					} else return

					doc.history.unshift(newHist)

					doc.productId = m.targetProductId
					doc.parentId = m.targetParentId
					doc.level = doc.level + m.levelShift
					doc.priority = item.newlyCalculatedPriority
					doc.sprintId = item.sprintId
					docs.push(doc)
				}
				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'updateMovedItemsBulk: These items cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
				commit('showLastEvent', { txt: `The move failed due to update errors. Try again after sign-out or contact your administrator`, severity: WARNING })
			} else {
				dispatch('saveMovedItems', { moveDataContainer: mdc, moveInfo, items, docs, move: payload.move })
			}
		}).catch(e => {
			let msg = 'updateMovedItemsBulk: Could not read descendants in bulk. Error = ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	saveMovedItems({
		rootState,
		commit,
		dispatch
	}, payload) {
		const m = payload.moveInfo
		const items = payload.items
		const docs = payload.docs
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_docs',
			data: { "docs": docs },
		}).then(res => {
			let updateOk = 0
			let updateConflict = 0
			let otherError = 0
			for (let result of res.data) {
				if (result.ok) updateOk++
				if (result.error === 'conflict') updateConflict++
				if (result.error && result.error != 'conflict') otherError++
			}
			// eslint-disable-next-line no-console
			let msg = 'saveMovedItems: ' + updateOk + ' documents are updated, ' + updateConflict + ' updates have a conflict, ' + otherError + ' updates failed on error'
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			if (updateConflict > 0 || otherError > 0) {
				commit('showLastEvent', { txt: `The move failed due to update conflicts or errors. Try again after sign-out or contact your administrator`, severity: WARNING })
				dispatch('doLog', { event: msg, level: WARNING })
			} else {
				// no conflicts, no other errors
				for (let d of docs) {
					// show the history and other updated props in the current opened item
					if (d._id === rootState.currentDoc._id) commit('updateCurrentDoc',
						{ newHist: d.history[0], productId: d.productId, parentId: d.parentId, level: d.level, priority: d.priority, sprintId: d.sprintId })
				}
				dispatch('addHistToTargetParent', { moveInfo: m, items })
				// if moving to another product or another level, update the descendants of the moved(back) items
				if (m.targetProductId !== m.sourceProductId || m.levelShift !== 0) {
					const updates = {
						targetProductId: m.targetProductId,
						levelShift: m.levelShift
					}
					for (let it of items) {
						// run in parallel for all moved nodes (nodes on the same level do not share descendants)
						// ToDo: the user can hit the undo button before these processes finish!
						dispatch('getMovedChildrenIds', { updates, id: it.id })
					}
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
		}).catch(error => {
			let msg = 'saveMovedItems: Could not save the moved documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Add history to the target parent of the moved items for syncing other users */
	addHistToTargetParent({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.moveInfo.targetParentId
		}).then(res => {
			let tmpDoc = res.data
			const items = []
			for (let item of payload.items) {
				items.push({ id: item.id, level: item.level, newlyCalculatedPriority: item.newlyCalculatedPriority })
			}
			const newHist = {
				"nodesMovedEvent": [
					payload.moveInfo.type,
					items,
					payload.moveInfo.sourceParentId,
					payload.moveInfo.sourceSprintId,
					payload.moveInfo.targetSprintId
				],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })

		}).catch(error => {
			let msg = 'addHistToTargetParent: Failed to add move history to parent with id ' + payload.moveInfo.targetParentId + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	processDescendents({
		dispatch
	}, payload) {
		const descendentIds = []
		for (let r of payload.results) {
			const id = r.id
			descendentIds.push(id)
			dispatch('getMovedChildrenIds', { updates: payload.updates, id })
		}
		dispatch('updateMovedDescendantsBulk', { updates: payload.updates, descendentIds })
	},

	getMovedChildrenIds({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.id)
		}).then(res => {
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('processDescendents', { updates: payload.updates, results })
			}

		}).catch(error => {
			let msg = 'getMovedChildrenIds: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateMovedDescendantsBulk({
		rootState,
		dispatch
	}, payload) {
		const updates = payload.updates

		const docsToGet = []
		for (let id of payload.descendentIds) {
			docsToGet.push({ "id": id })
		}

		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					doc.productId = updates.targetProductId
					// the parentId does not change for descendents
					doc.level = doc.level + updates.levelShift
					// priority does not change for descendents
					const newHist = {
						"ignoreEvent": ['updateMovedDescendantsBulk'],
						"timestamp": Date.now(),
						"distributeEvent": false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'updateMovedDescendantsBulk: These descendants cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'updateMovedDescendantsBulk: Could not read decendants in bulk. Error = ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
