import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const state = {
	canUpdateColor: true
}

const actions = {
	/* Update the assigned color to a requirement area */
	updateColorDb({
		rootState,
		state,
		commit,
		dispatch
	}, payload) {
		// user cannot update before the current transaction is completed
		if (!state.canUpdateColor) return

		state.canUpdateColor = false
		const node = payload.node
		const id = node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			// update the req area document
			const prevColor = tmpDoc.color
			tmpDoc.color = payload.newColor
			const newHist = {
				changeReqAreaColorEvent: [prevColor, payload.newColor],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				caller: 'updateColorDb',
				onSuccessCallback: () => {
					state.canUpdateColor = true
					commit('updateNodesAndCurrentDoc', { node, reqAreaItemColor: payload.newColor, newHist })
					commit('updateColorMapper', { id, newColor: payload.newColor })
					if (payload.createUndo) {
						commit('showLastEvent', { txt: 'The requirement area color indication is changed', severity: SEV.INFO })
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							node,
							type: 'undoReqAreaColorChange',
							prevColor
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Change of requirement area color indication is undone', severity: SEV.INFO })
				}
			})
		}).catch(error => {
			const msg = `updateColorDb: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Update the req area of the item (null for no req area set)
	* If the item is an epic also assign this req area to the child features if they have no req area assigned yet / when removing do the reverse
	*/
	updateReqArea({
		rootState,
		commit,
		dispatch
	}, payload) {
		const id = payload.node._id
		const reqAreaTitle = rootState.reqAreaMapper[payload.reqareaId]
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const tmpDoc = res.data
			const oldAreaId = tmpDoc.reqarea
			tmpDoc.reqarea = payload.reqareaId
			const newHist = {
				updateReqAreaEvent: [id, oldAreaId, payload.reqareaId, reqAreaTitle],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)
			const prevLastChange = tmpDoc.lastChange
			tmpDoc.lastChange = payload.timestamp
			// add to payload
			payload.oldParentReqArea = oldAreaId
			const toDispatch = [{ updateReqAreaChildren: payload }]
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: tmpDoc,
				toDispatch,
				caller: 'updateReqArea',
				onSuccessCallback: () => {
					if (payload.createUndo) {
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoUpdateReqArea',
							node: payload.node,
							oldAreaId,
							prevLastChange
						}
						rootState.changeHistory.unshift(entry)
					}
					commit('updateNodesAndCurrentDoc', { node: payload.node, reqarea: payload.reqareaId, lastChange: payload.timestamp, newHist })
				}
			})
		}).catch(error => {
			const msg = 'updateReqArea: Could not read document with _id ' + id + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* If the item is an epic also assign this req area to the children which have no req area assigned yet / when removing do the reverse.
	* When the parent req area is changed the children change too.
	*/
	updateReqAreaChildren({
		rootState,
		dispatch
	}, payload) {
		const childIds = payload.node.children.map((n) => n._id)
		const docsToGet = []
		for (const c of childIds) {
			docsToGet.push({ id: c })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const oldParentReqArea = payload.oldParentReqArea
			const newReqArea = payload.reqareaId
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const currentReqArea = doc.reqarea
					let updated = false
					if (newReqArea !== null) {
						// set: set for items which have no req area set yet
						if (!currentReqArea || currentReqArea === oldParentReqArea) {
							doc.reqarea = newReqArea
							updated = true
						}
					} else {
						// remove: if reqarea was set and equal to old req area of the parent delete it
						if (currentReqArea && currentReqArea === oldParentReqArea) {
							delete doc.reqarea
							updated = true
						}
					}
					if (updated) {
						const newHist = {
							ignoreEvent: ['updateReqAreaChildren'],
							timestamp: Date.now(),
							distributeEvent: false
						}
						doc.history.unshift(newHist)
						docs.push(doc)
					}
				}
			}
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs,
				caller: 'updateReqAreaChildren',
				onSuccessCallback: () => {
					// set reqarea for the child nodes
					const childNodes = payload.node.children
					for (const c of childNodes) {
						const currentReqArea = c.data.reqarea
						if (newReqArea !== null) {
							// set: set for items which have no req area set yet
							if (!currentReqArea || currentReqArea === oldParentReqArea) {
								c.data.reqarea = newReqArea
							}
						} else {
							// remove: if reqarea was set and equal to old req area of the parent delete it
							if (currentReqArea && currentReqArea === oldParentReqArea) {
								c.data.reqarea = null
							}
						}
					}
				}
			})
		}).catch(e => {
			const msg = 'updateReqAreaChildren: Could not read batch of documents: ' + e
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Update the tree with synced requirent area change assignment */
	updateReqAreaInTree({
		commit,
	}, hist) {
		const parentId = hist.updateReqAreaEvent[0]
		const oldReqArea = hist.updateReqAreaEvent[1]
		const newReqAreaId = hist.updateReqAreaEvent[2]
		const timestamp = hist.timeStamp
		const node = window.slVueTree.getNodeById(parentId)
		if (node) {
			commit('updateNodesAndCurrentDoc', { node, reqarea: newReqAreaId, lastChange: timestamp, newHist: hist })
			commit('showLastEvent', { txt: `Another user assigned the requirement area '${hist.updateReqAreaEvent[3]}' to item '${node.title}'`, severity: SEV.INFO })
			const descendants = window.slVueTree.getDescendantsInfo(node).descendants
			for (const d of descendants) {
				const currentReqArea = d.data.reqarea
				if (newReqAreaId !== null) {
					// set: set for items which have no req area set yet
					if (!currentReqArea || currentReqArea === oldReqArea) {
						d.data.reqarea = newReqAreaId
						d.data.lastChange = timestamp
					}
				} else {
					// remove: if reqarea was set and equal to old req area of the parent delete it
					if (currentReqArea && currentReqArea === oldReqArea) {
						delete d.data.reqarea
						d.data.lastChange = timestamp
					}
				}
			}
		}
	}
}

export default {
	state,
	actions
}
