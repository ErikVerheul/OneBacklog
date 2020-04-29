import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

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
		// console.log('updateMovedItemsBulk: payload = ' + JSON.stringify(payload, null, 2))
		// lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (let item of payload.items) {
				if (item.id === id) {
					return item
				}
			}
		}
		const docsToGet = []
		for (let item of payload.items) {
			docsToGet.push({ "id": item.id })
		}
		const m = payload.moveInfo
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
					if (m.type === 'move') {
						newHist = {
							nodeDroppedEvent: [m.sourceLevel, m.sourceLevel + m.levelShift, item.targetInd, m.targetParentTitle, item.childCount, m.sourceParentTitle,
							m.placement, m.sourceParentId, m.targetParentId, item.sourceInd],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.userData.sessionId,
							distributeEvent: false
						}
					} else {
						// undo move
						newHist = {
							nodeUndoMoveEvent: [rootState.userData.user],
							by: rootState.userData.user,
							timestamp: Date.now(),
							sessionId: rootState.userData.sessionId,
							distributeEvent: false
						}
					}
					doc.history.unshift(newHist)

					doc.productId = m.targetProductId
					doc.parentId = m.targetParentId
					doc.level = doc.level + m.levelShift
					doc.priority = item.newlyCalculatedPriority
					doc.sprintId = m.targetSprintId
					docs.push(doc)
					// show the history and other updated props in the current opened item
					if (doc._id === rootState.currentDoc._id) commit('updateCurrentDoc',
						{ newHist, productId: doc.productId, parentId: doc.parentId, level: doc.level, priority: doc.priority, sprintId: doc.sprintId })
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
			}
			const toDispatch = { 'addHistToTargetParent': payload }
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'updateMovedItemsBulk' })

			// if moving to another product or another level, update the descendants of the moved(back) items
			if (m.targetProductId !== m.sourceProductId || m.levelShift !== 0) {
				const updates = {
					targetProductId: m.targetProductId,
					levelShift: m.levelShift
				}
				for (let it of payload.items) {
					// run in parallel for all moved nodes
					dispatch('getMovedDescendentIds', { updates, id: it.id })
				}
			}
		}).catch(e => {
			let msg = 'updateMovedItemsBulk: Could not read descendants in bulk. Error = ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

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
				items.push({ id: item.id, newlyCalculatedPriority: item.newlyCalculatedPriority })
			}
			const newHist = {
				"nodesMovedEvent": [
					payload.moveInfo.targetParentId,
					items,
					payload.moveInfo.type,
					payload.moveInfo.sourceParentId,
					payload.moveInfo.sourceSprintId,
					payload.moveInfo.targetSprintId,
					payload.moveInfo.sourcePlanningBoardTasks,
					payload.moveInfo.targetPlanningBoardTasks
				],
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })

		}).catch(error => {
			let msg = 'getMovedDescendentIds: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
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
			dispatch('getMovedDescendentIds', { updates: payload.updates, id })
		}
		dispatch('updateMovedDescendantsBulk', { updates: payload.updates, descendentIds })
	},

	getMovedDescendentIds({
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
			let msg = 'getMovedDescendentIds: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
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
			// console.log('updateMovedDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
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
