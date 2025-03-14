import { SEV } from '../../constants.js'
import { applyRetention, dedup } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const actions = {
	/* Set one dependency with one corresponding condition */
	setDepAndCond({ rootState, commit, dispatch }, payload) {
		const id = payload.dependentOnNode._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const newHist = {
					setDependencyEvent: [payload.conditionalForNode._id, payload.conditionalForNode.title],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastOtherChange || 0
				tmpDoc.lastOtherChange = payload.timestamp
				payload.dependentOnPrevLastChange = prevLastChange

				if (tmpDoc.dependencies) {
					const deps = dedup(tmpDoc.dependencies)
					deps.push(payload.conditionalForNode._id)
					tmpDoc.dependencies = deps
				} else tmpDoc.dependencies = [payload.conditionalForNode._id]

				const toDispatch = [{ alsoSetCondition: payload }]
				dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch, caller: 'setDepAndCond' })
			})
			.catch((error) => {
				commit('addToEventList', { txt: 'Failed to set the dependency', severity: SEV.ERROR })
				const msg = 'setDepAndCond: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Called by setDepAndCond only */
	alsoSetCondition({ rootState, commit, dispatch }, payload) {
		const id = payload.conditionalForNode._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				const timestamp = Date.now()
				const newHist = {
					setConditionEvent: [payload.dependentOnNode._id, payload.dependentOnNode.title],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: timestamp,
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				const prevLastChange = tmpDoc.lastOtherChange || 0
				tmpDoc.lastOtherChange = payload.timestamp

				if (tmpDoc.conditionalFor) {
					const conds = dedup(tmpDoc.conditionalFor)
					conds.push(payload.dependentOnNode._id)
					tmpDoc.conditionalFor = conds
				} else tmpDoc.conditionalFor = [payload.dependentOnNode._id]

				dispatch('updateDoc', {
					dbName: rootState.userData.currentDb,
					updatedDoc: tmpDoc,
					caller: 'alsoSetCondition',
					onSuccessCallback: () => {
						commit('updateNodewithDocChange', {
							node: payload.dependentOnNode,
							addDependencyOn: payload.conditionalForNode._id,
							lastOtherChange: tmpDoc.lastOtherChange,
						})
						commit('updateNodewithDocChange', {
							node: payload.conditionalForNode,
							addConditionalFor: payload.dependentOnNode._id,
							lastOtherChange: tmpDoc.lastOtherChange,
						})
						rootState.selectNodeOngoing = false
						// create an entry for undoing the change in a last-in first-out sequence
						const entry = {
							type: 'undoSetDependency',
							dependentOnNode: payload.dependentOnNode,
							conditionalForNode: payload.conditionalForNode,
							dependentOnPrevLastChange: payload.dependentOnPrevLastChange,
							conditionalForprevLastChange: prevLastChange,
						}
						rootState.changeHistory.unshift(entry)
						rootState.selectNodeOngoing = false
						commit('addToEventList', { txt: 'The dependency is set', severity: SEV.INFO })
					},
				})
			})
			.catch((error) => {
				rootState.selectNodeOngoing = false
				commit('addToEventList', { txt: 'Failed to se the dependency', severity: SEV.ERROR })
				const msg = 'alsoSetCondition: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	undoSetDependencyAsync({ rootState, commit, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		const undo = true
		const id = payload.dependentOnNode._id
		rootState.busyWithLastUndo = true
		globalAxios({
			method: 'GET',
			url: dbName + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				if (tmpDoc.dependencies.slice(-1)[0] === payload.conditionalForNode._id) {
					// the condition has not been removed
					tmpDoc.dependencies = tmpDoc.dependencies.slice(0, -1)
					const newHist = {
						setDependencyEvent: [id, payload.conditionalForNode.title, undo],
						by: rootState.userData.user,
						email: rootState.userData.email,
						doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
						timestamp: Date.now(),
						isListed: true,
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					tmpDoc.history.unshift(newHist)
					tmpDoc.lastOtherChange = payload.dependentOnPrevLastChange

					// add hist to payload
					payload.hist = newHist
					const toDispatch = [{ alsoUndoSetConditionAsync: payload }]
					dispatch('updateDoc', {
						dbName,
						updatedDoc: tmpDoc,
						toDispatch,
						caller: 'undoSetDependencyAsync',
						onFailureCallback: () => {
							rootState.busyWithLastUndo = false
						},
					})
				} else {
					// nothing to remove
					rootState.busyWithLastUndo = false
				}
			})
			.catch((error) => {
				rootState.busyWithLastUndo = false
				commit('addToEventList', { txt: 'Dependency set undo failed', severity: SEV.ERROR })
				const msg = 'undoSetDependencyAsync: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	alsoUndoSetConditionAsync({ rootState, commit, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		const undo = true
		const id = payload.conditionalForNode._id
		globalAxios({
			method: 'GET',
			url: dbName + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				if (tmpDoc.conditionalFor.slice(-1)[0] === payload.dependentOnNode._id) {
					// the dependency has not been removed
					tmpDoc.conditionalFor = tmpDoc.conditionalFor.slice(0, -1)
					const newHist = {
						setConditionEvent: [id, payload.dependentOnNode.title, undo],
						by: rootState.userData.user,
						email: rootState.userData.email,
						doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
						timestamp: Date.now(),
						isListed: true,
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					tmpDoc.history.unshift(newHist)
					tmpDoc.lastOtherChange = payload.conditionalForprevLastChange

					dispatch('updateDoc', {
						dbName,
						updatedDoc: tmpDoc,
						caller: 'alsoUndoSetConditionAsync',
						onSuccessCallback: () => {
							commit('updateNodewithDocChange', {
								node: payload.dependentOnNode,
								removeLastDependencyOn: null,
								lastOtherChange: payload.dependentOnPrevLastChange,
							})
							commit('updateNodewithDocChange', {
								node: payload.conditionalForNode,
								removeLastConditionalFor: null,
								lastOtherChange: payload.conditionalForprevLastChange,
							})
							commit('addToEventList', { txt: 'Dependency set is undone', severity: SEV.INFO })
							rootState.busyWithLastUndo = false
						},
						onFailureCallback: () => {
							rootState.busyWithLastUndo = false
						},
					})
				}
			})
			.catch((error) => {
				rootState.busyWithLastUndo = false
				commit('addToEventList', { txt: 'Dependency set undo failed', severity: SEV.ERROR })
				const msg = 'alsoUndoSetConditionAsync: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Remove one or more dependencies from a single item and remove the corresponding conditions in other items */
	removeDependenciesAsync({ rootState, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		const id = payload.node._id
		globalAxios({
			method: 'GET',
			url: dbName + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				tmpDoc.dependencies = payload.newDeps
				const newHist = {
					dependencyRemovedEvent: [payload.removedIds],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				// add hist to payload
				payload.hist = newHist

				tmpDoc.lastOtherChange = payload.timestamp

				const toDispatch = [{ alsoRemoveConditions: payload }]
				dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch, caller: 'removeDependenciesAsync' })
			})
			.catch((error) => {
				const msg = 'removeDependenciesAsync: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Remove one or more conditions; called by removeDependenciesAsync only */
	alsoRemoveConditions({ rootState, commit, dispatch }, payload) {
		const docIdsToGet = []
		for (const id of payload.removedIds) {
			docIdsToGet.push({ id })
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
					const doc = applyRetention(rootState, r.docs[0].ok)
					const newConditions = []
					if (doc.conditionalFor) {
						for (const c of doc.conditionalFor) {
							if (c !== payload.node._id) {
								newConditions.push(c)
							}
						}
					}
					doc.conditionalFor = newConditions
					doc.lastOtherChange = payload.timestamp
					const newHist = {
						conditionRemovedEvent: [[payload.node._id], payload.node.title],
						by: rootState.userData.user,
						email: rootState.userData.email,
						doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
						timestamp: Date.now(),
						isListed: true,
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					doc.history.unshift(newHist)
					docs.push(doc)
					if (payload.removedIds > 1) {
						commit('addToEventList', { txt: 'The dependencies are removed', severity: SEV.INFO })
					} else commit('addToEventList', { txt: 'The dependency is removed', severity: SEV.INFO })
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb,
					docs,
					caller: 'alsoRemoveConditions',
					onSuccessCallback: () => {
						// update the dependencies in the tree model
						commit('updateNodewithDocChange', {
							node: payload.node,
							dependenciesRemoved: payload.newDeps,
							lastOtherChange: payload.timestamp,
						})
						// update the conditions in the tree model
						for (const id of payload.removedIds) {
							const depOnNode = rootState.helpersRef.getNodeById(id)
							if (depOnNode === null) continue

							const conIdArray = []
							for (const condId of depOnNode.conditionalFor) {
								if (condId !== payload.node._id) conIdArray.push(id)
							}
							// no need to pass history as the currenly selected node is the node with the conditions
							commit('updateNodewithDocChange', { node: depOnNode, conditionsremoved: conIdArray, lastOtherChange: payload.timestamp })
							// check for resolved dependency violations; show a warning if found
							rootState.helpersRef.checkDepencyViolations(true)
						}
					},
				})
			})
			.catch((error) => {
				const msg = 'alsoRemoveConditions: Could not read batch of documents: ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Remove one or more conditions from a single item and remove the corresponding dependencies in other items. */
	removeConditionsAsync({ rootState, dispatch }, payload) {
		const dbName = rootState.userData.currentDb
		const id = payload.node._id
		globalAxios({
			method: 'GET',
			url: dbName + '/' + id,
		})
			.then((res) => {
				const tmpDoc = applyRetention(rootState, res.data)
				// update the conditions
				tmpDoc.conditionalFor = payload.newCons
				const newHist = {
					conditionRemovedEvent: [payload.removedIds],
					by: rootState.userData.user,
					email: rootState.userData.email,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					timestamp: Date.now(),
					isListed: true,
					sessionId: rootState.mySessionId,
					distributeEvent: true,
				}
				tmpDoc.history.unshift(newHist)
				// add hist to payload
				payload.hist = newHist

				tmpDoc.lastOtherChange = payload.timestamp

				const toDispatch = [{ alsoRemoveDependenciesAsync: payload }]
				dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch, caller: 'removeConditionsAsync' })
			})
			.catch((error) => {
				const msg = 'removeConditionsAsync: Could not read document with _id ' + id + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Remove the dependencies; called by removeConditionsAsync only */
	alsoRemoveDependenciesAsync({ rootState, commit, dispatch }, payload) {
		const docIdsToGet = []
		for (const id of payload.removedIds) {
			docIdsToGet.push({ id })
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
					const doc = applyRetention(rootState, r.docs[0].ok)
					const newDependencies = []
					if (doc.dependencies) {
						for (const d of doc.dependencies) {
							if (d !== payload.node._id) {
								newDependencies.push(d)
							}
						}
					}
					// update the dependencies
					doc.dependencies = newDependencies
					// const prevLastChange = doc.lastOtherChange || 0 --> ToDo: track last change?
					doc.lastOtherChange = payload.timestamp
					const newHist = {
						dependencyRemovedEvent: [[payload.node._id], payload.node.title],
						by: rootState.userData.user,
						email: rootState.userData.email,
						doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
						timestamp: Date.now(),
						isListed: true,
						sessionId: rootState.mySessionId,
						distributeEvent: true,
					}
					doc.history.unshift(newHist)
					docs.push(doc)
					if (payload.removedIds > 1) {
						commit('addToEventList', { txt: 'The conditions are removed', severity: SEV.INFO })
					} else commit('addToEventList', { txt: 'The condition is removed', severity: SEV.INFO })
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb,
					docs,
					caller: 'alsoRemoveDependenciesAsync',
					onSuccessCallback: () => {
						// update the conditions in the tree model
						commit('updateNodewithDocChange', { node: payload.node, conditionsremoved: payload.newCons, lastOtherChange: payload.timestamp })
						// update the dependencies in the tree model
						for (const id of payload.removedIds) {
							const condForNode = rootState.helpersRef.getNodeById(id)
							if (condForNode === null) continue

							const depIdArray = []
							for (const depId of condForNode.dependencies) {
								if (depId !== payload.node._id) depIdArray.push(id)
							}
							// no need to pass history as the currenly selcted node is the node with the dependencies
							commit('updateNodewithDocChange', { node: condForNode, dependenciesRemoved: depIdArray, lastOtherChange: payload.timestamp })
							// check for resolved dependency violations; show a warning if found
							rootState.helpersRef.checkDepencyViolations(true)
						}
					},
				})
			})
			.catch((error) => {
				const msg = 'alsoRemoveDependenciesAsync: Could not read batch of documents: ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	removeExtDependenciesAsync({ rootState, dispatch }, externalDependencies) {
		function getDepItem(id) {
			for (const item of externalDependencies) {
				for (const d of item.dependencies) {
					if (d === id) return item
				}
			}
		}
		const docIdsToGet = []
		const docs = []
		for (const d of externalDependencies) {
			for (const dd of d.dependencies) {
				docIdsToGet.push({ id: dd })
			}
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docIdsToGet },
		})
			.then((res) => {
				const results = res.data.results
				for (const r of results) {
					const doc = applyRetention(rootState, r.docs[0].ok)
					const depItem = getDepItem(doc._id)
					if (doc && doc.conditionalFor && depItem) {
						const newConditionalFor = []
						for (const c of doc.conditionalFor) {
							if (c !== depItem.id) newConditionalFor.push(c)
						}
						const newHist = {
							ignoreEvent: ['removeExtDependenciesAsync'],
							timestamp: Date.now(),
						}
						doc.history.unshift(newHist)
						doc.conditionalFor = newConditionalFor
						docs.push(doc)
					}
				}
				dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeExtDependenciesAsync' })
			})
			.catch((error) => {
				const msg = 'removeExtDependenciesAsync: Could not read batch of documents: ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},
}

export default {
	actions,
}
