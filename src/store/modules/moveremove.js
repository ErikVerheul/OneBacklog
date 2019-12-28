import globalAxios from 'axios'

const ERROR = 2
const PRODUCTLEVEL = 2

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
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('updateMovedItemsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const item = getPayLoadItem(results[i].docs[0].ok._id)
					const doc = results[i].docs[0].ok
					// change the document
					let newHist = {}
					if (item.type === 'move') {
						newHist = {
							"nodeDroppedEvent": [item.oldLevel, item.newLevel, item.newInd, item.newParentTitle, item.nrOfDescendants, item.oldProductTitle, item.placement],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": true
						}
					} else {
						// undo move
						newHist = {
							"nodeUndoMoveEvent": [],
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
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'updateMovedItemsBulk: These items cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', ok)
			// update the descendants of all the moved(back) items
			let payload2 = []
			for (let item of payload.items) {
				for (let i = 0; i < item.descendants.length; i++) {
					const payloadItem2 = {
						"_id": item.descendants[i]._id,
						"type": item.type,
						"oldParentTitle": item.oldParentTitle,
						"oldProductTitle": item.oldProductTitle,
						"productId": item.productId,
						"newLevel": item.descendants[i].level
					}
					payload2.push(payloadItem2)
				}
			}
			dispatch('updateDescendantsBulk', payload2)
		}).catch(error => {
			let msg = 'updateMovedItemsBulk: Could not read decendants in bulk. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateDescendantsBulk({
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
			withCredentials: true,
			data: { "docs": docsToGet },
		}).then(res => {
			// console.log('updateDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
			const results = res.data.results
			const ok = []
			const error = []
			for (let i = 0; i < results.length; i++) {
				if (results[i].docs[0].ok) {
					const item = getPayLoadItem(results[i].docs[0].ok._id)
					const doc = results[i].docs[0].ok
					// change the document
					let newHist = {}
					if (item.type === 'move') {
						newHist = {
							"descendantMoved": [item.oldParentTitle],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": false
						}
					} else {
						// undo move
						newHist = {
							"descendantUndoMove": [item.oldParentTitle],
							"by": rootState.userData.user,
							"email": rootState.userData.email,
							"timestamp": Date.now(),
							"sessionId": rootState.userData.sessionId,
							"distributeEvent": false
						}
					}
					doc.history.unshift(newHist)
					doc.level = item.newLevel
					doc.productId = item.productId
					ok.push(doc)
				}
				if (results[i].docs[0].error) error.push(results[i].docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let i = 0; i < error.length; i++) {
					errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
				}
				let msg = 'updateDescendantsBulk: These descendants cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', ok)
		}).catch(error => {
			let msg = 'updateDescendantsBulk: Could not read decendants in bulk. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	removeDoc({
		rootState,
		dispatch
	}, payload) {
		rootState.busyRemoving = true
		const _id = payload.node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
			withCredentials: true,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"parentDocRemovedEvent": [payload.descendants.length],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.delmark = true
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
			if (payload.node.level === PRODUCTLEVEL) {
				// remove the product from the users product roles, subscriptions and product selection array
				delete rootState.userData.myProductsRoles[_id]
				if (rootState.userData.myProductSubscriptions.includes(_id)) {
					const position = rootState.userData.myProductSubscriptions.indexOf(_id)
					rootState.userData.myProductSubscriptions.splice(position, 1)
					const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(_id)
					rootState.myProductOptions.splice(removeIdx, 1)
				}
			}
			dispatch('registerRemoveHistInParent', payload)
		}).catch(error => {
			let msg = 'removeDoc: Could not read document with _id ' + _id + ',' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
}

export default {
    actions
}
