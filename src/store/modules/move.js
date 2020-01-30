import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2

const actions = {
    updateMovedItemsBulk({
		rootState,
		dispatch
	}, payload) {
		// Lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (let item of payload.items) {
				if (item._id === id) {
					return item
				}
			}
		}
		const docsToGet = []
		for (let item of payload.items) {
			docsToGet.push({ "id": item._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('updateMovedItemsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let r of results) {
				if (r.docs[0].ok) {
					const item = getPayLoadItem(r.docs[0].ok._id)
					const doc = r.docs[0].ok
					let newHist = {}
					if (item.type === 'move') {
						newHist = {
							"nodeDroppedEvent": [item.oldLevel, item.newLevel, item.newInd, item.newParentTitle, item.nrOfDescendants, item.oldProductTitle, item.placement, item.oldParentId, item.newParentId, item.oldInd],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": true
						}
					} else {
						// undo move
						newHist = {
							"nodeUndoMoveEvent": [rootState.userData.user],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": true
						}
					}
					doc.history.unshift(newHist)
					doc.level = item.newLevel
					doc.productId = item.productId
					doc.parentId = item.newParentId
					doc.priority = item.newPriority
					ok.push(doc)
					// show the history update in the current opened item
					if (doc._id === rootState.currentDoc._id) rootState.currentDoc.history.unshift(newHist)
				}
				if (r.docs[0].error) error.push(r.docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
				let msg = 'updateMovedItemsBulk: These items cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
			// update the descendants of all the moved(back) items
			let payload2 = []
			for (let item of payload.items) {
				for (let i = 0; i < item.descendants.length; i++) {
					const payloadItem2 = {
						"_id": item.descendants[i]._id,
						"type": item.type,
						"oldParentTitle": item.oldParentTitle,
						"productId": item.productId,
						"newLevel": item.descendants[i].level
					}
					payload2.push(payloadItem2)
				}
			}
			dispatch('updateMovedDescendantsBulk', payload2)
		}).catch(error => {
			let msg = 'updateMovedItemsBulk: Could not read descendants in bulk. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateMovedDescendantsBulk({
		rootState,
		dispatch
	}, payload) {
		// Lookup to not rely on the order of the response being the same as in the request
		function getPayLoadItem(id) {
			for (let i = 0; i < payload.length; i++) {
				if (payload[i]._id === id) {
					return payload[i]
				}
			}
		}
		const docsToGet = []
		for (let i = 0; i < payload.length; i++) {
			docsToGet.push({ "id": payload[i]._id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('updateMovedDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let r of results) {
				if (r.docs[0].ok) {
					const item = getPayLoadItem(r.docs[0].ok._id)
					const doc = r.docs[0].ok
					// change the document
					let newHist = {}
					if (item.type === 'move') {
						newHist = {
							"descendantMoved": [item.oldParentTitle],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"distributeEvent": false
						}
					} else {
						// undo move
						newHist = {
							"descendantUndoMove": [item.oldParentTitle],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"distributeEvent": false
						}
					}
					doc.history.unshift(newHist)
					doc.level = item.newLevel
					doc.productId = item.productId
					ok.push(doc)
				}
				if (r.docs[0].error) error.push(r.docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
				let msg = 'updateMovedDescendantsBulk: These descendants cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
		}).catch(error => {
			let msg = 'updateMovedDescendantsBulk: Could not read decendants in bulk. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
    actions
}
