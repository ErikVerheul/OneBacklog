import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const ERROR = 2
const INFO = 0

/* Remove duplicates; return an empty array if arr is not defined or null */
function dedup (arr) {
  function containsObject (obj, list) {
    return list.some(el => el === obj)
  }
  if (arr) {
    const dedupped = []
    for (const el of arr) {
      if (!containsObject(el, dedupped)) dedupped.push(el)
    }
    return dedupped
  } else return []
}

const actions = {
  /* Set one dependency with one corresponding condition */
  setDepAndCond ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const id = payload.dependentOnNode._id
    globalAxios({
      method: 'GET',
      url: rootState.userData.currentDb + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      const newHist = {
        setDependencyEvent: [payload.conditionalForNode._id, payload.conditionalForNode.title],
        by: rootState.userData.user,
        timestamp: Date.now(),
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      const prevLastChange = tmpDoc.lastChange || 0
      tmpDoc.lastChange = payload.timestamp
      payload.dependentOnPrevLastChange = prevLastChange

      if (tmpDoc.dependencies) {
        const deps = dedup(tmpDoc.dependencies)
        deps.push(payload.conditionalForNode._id)
        tmpDoc.dependencies = deps
      } else tmpDoc.dependencies = [payload.conditionalForNode._id]

      const toDispatch = [{ alsoSetCondition: payload }]
      dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch, caller: 'setDepAndCond' })
    }).catch(error => {
      commit('showLastEvent', { txt: 'Failed to set the dependency', severity: ERROR })
      const msg = 'setDepAndCond: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Called by setDepAndCond only */
  alsoSetCondition ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const id = payload.conditionalForNode._id
    globalAxios({
      method: 'GET',
      url: rootState.userData.currentDb + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      const timestamp = Date.now()
      const newHist = {
        setConditionEvent: [payload.dependentOnNode._id, payload.dependentOnNode.title],
        by: rootState.userData.user,
        timestamp: timestamp,
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      const prevLastChange = tmpDoc.lastChange || 0
      tmpDoc.lastChange = payload.timestamp

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
          // no hist update for the dependentOnNode as the user selected the conditionalForNode at this time
          commit('updateNodesAndCurrentDoc', { node: payload.dependentOnNode, addDependencyOn: payload.conditionalForNode._id, lastChange: timestamp })
          commit('updateNodesAndCurrentDoc', { node: payload.conditionalForNode, addConditionalFor: payload.dependentOnNode._id, lastChange: timestamp, newHist })
          rootState.selectNodeOngoing = false
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoSetDependency',
            dependentOnNode: payload.dependentOnNode,
            conditionalForNode: payload.conditionalForNode,
            dependentOnPrevLastChange: payload.dependentOnPrevLastChange,
            conditionalForprevLastChange: prevLastChange
          }
          rootState.changeHistory.unshift(entry)
          rootState.selectNodeOngoing = false
          commit('showLastEvent', { txt: 'The dependency is set', severity: INFO })
        }
      })
    }).catch(error => {
      rootState.selectNodeOngoing = false
      commit('showLastEvent', { txt: 'Failed to se the dependency', severity: ERROR })
      const msg = 'alsoSetCondition: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  undoSetDependencyAsync ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const dbName = rootState.userData.currentDb
    const undo = true
    const id = payload.dependentOnNode._id
    globalAxios({
      method: 'GET',
      url: dbName + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      tmpDoc.dependencies = tmpDoc.dependencies.slice(0, -1)
      const newHist = {
        setDependencyEvent: [id, payload.conditionalForNode.title, undo],
        by: rootState.userData.user,
        timestamp: Date.now(),
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      tmpDoc.lastChange = payload.dependentOnPrevLastChange

      // add hist to payload
      payload.hist = newHist
      const toDispatch = [{ alsoUndoSetConditionAsync: payload }]
      dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch, caller: 'undoSetDependencyAsync' })
    }).catch(error => {
      commit('showLastEvent', { txt: 'Dependency set undo failed', severity: ERROR })
      const msg = 'undoSetDependencyAsync: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  alsoUndoSetConditionAsync ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const dbName = rootState.userData.currentDb
    const undo = true
    const id = payload.conditionalForNode._id
    globalAxios({
      method: 'GET',
      url: dbName + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      tmpDoc.conditionalFor = tmpDoc.conditionalFor.slice(0, -1)
      const newHist = {
        setConditionEvent: [id, payload.dependentOnNode.title, undo],
        by: rootState.userData.user,
        timestamp: Date.now(),
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      tmpDoc.lastChange = payload.conditionalForprevLastChange

      dispatch('updateDoc', {
        dbName,
        updatedDoc: tmpDoc,
        caller: 'alsoUndoSetConditionAsync',
        onSuccessCallback: () => {
          commit('updateNodesAndCurrentDoc', { node: payload.dependentOnNode, removeLastDependencyOn: null, lastChange: payload.dependentOnPrevLastChange, newHist: payload.hist })
          commit('updateNodesAndCurrentDoc', { node: payload.conditionalForNode, removeLastConditionalFor: null, lastChange: payload.conditionalForprevLastChange, newHist })
          commit('showLastEvent', { txt: 'Dependency set is undone', severity: INFO })
        }
      })
    }).catch(error => {
      commit('showLastEvent', { txt: 'Dependency set undo failed', severity: ERROR })
      const msg = 'alsoUndoSetConditionAsync: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Remove one or more dependencies from a single item and remove the corresponding conditions in other items */
  removeDependenciesAsync ({
    rootState,
    dispatch
  }, payload) {
    const dbName = rootState.userData.currentDb
    const id = payload.node._id
    globalAxios({
      method: 'GET',
      url: dbName + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      tmpDoc.dependencies = payload.newDeps
      const newHist = {
        dependencyRemovedEvent: [payload.removedIds],
        by: rootState.userData.user,
        timestamp: Date.now(),
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      // add hist to payload
      payload.hist = newHist

      tmpDoc.lastChange = payload.timestamp

      const toDispatch = [{ alsoRemoveConditions: payload }]
      dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch, caller: 'removeDependenciesAsync' })
    }).catch(error => {
      const msg = 'removeDependenciesAsync: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Remove one or more conditions; called by removeDependenciesAsync only, */
  alsoRemoveConditions ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const docsToGet = []
    for (const id of payload.removedIds) {
      docsToGet.push({ id: id })
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
          const newConditions = []
          if (doc.conditionalFor) {
            for (const c of doc.conditionalFor) {
              if (c !== payload.node._id) {
                newConditions.push(c)
              }
            }
          }
          doc.conditionalFor = newConditions
          doc.lastChange = payload.timestamp
          const newHist = {
            conditionRemovedEvent: [[payload.node._id], payload.node.title],
            sessionId: rootState.userData.sessionId,
            timestamp: Date.now(),
            distributeEvent: true
          }
          doc.history.unshift(newHist)
          docs.push(doc)
          if (payload.removedIds > 1) {
            commit('showLastEvent', { txt: 'The dependencies are removed', severity: INFO })
          } else commit('showLastEvent', { txt: 'The dependency is removed', severity: INFO })
        }
      }
      dispatch('updateBulk', {
        dbName: rootState.userData.currentDb,
        docs,
        caller: 'alsoRemoveConditions',
        onSuccessCallback: () => {
          // update the dependencies in the tree model
          commit('updateNodesAndCurrentDoc', { node: payload.node, dependenciesRemoved: payload.newDeps, lastChange: payload.timestamp, newHist: payload.hist })
          // update the conditions in the tree model
          for (const id of payload.removedIds) {
            const depOnNode = window.slVueTree.getNodeById(id)
            if (depOnNode === null) continue

            const conIdArray = []
            for (const condId of depOnNode.conditionalFor) {
              if (condId !== payload.node._id) conIdArray.push(id)
            }
            // no need to pass history as the currenly selected node is the node wth the conditions
            commit('updateNodesAndCurrentDoc', { node: depOnNode, conditionsremoved: conIdArray, lastChange: payload.timestamp })
          }
        }
      })
    }).catch(error => {
      const msg = 'alsoRemoveConditions: Could not read batch of documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Remove one or more conditions from a single item and remove the corresponding dependencies in other items. */
  removeConditionsAsync ({
    rootState,
    dispatch
  }, payload) {
    const dbName = rootState.userData.currentDb
    const id = payload.node._id
    globalAxios({
      method: 'GET',
      url: dbName + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      // update the conditions
      tmpDoc.conditionalFor = payload.newCons
      const newHist = {
        conditionRemovedEvent: [payload.removedIds],
        by: rootState.userData.user,
        timestamp: Date.now(),
        sessionId: rootState.userData.sessionId,
        distributeEvent: true
      }
      tmpDoc.history.unshift(newHist)
      // add hist to payload
      payload.hist = newHist

      tmpDoc.lastChange = payload.timestamp

      const toDispatch = [{ alsoRemoveDependenciesAsync: payload }]
      dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch, caller: 'removeConditionsAsync' })
    }).catch(error => {
      const msg = 'removeConditionsAsync: Could not read document with _id ' + id + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  /* Remove the dependencies; called by removeConditionsAsync only. */
  alsoRemoveDependenciesAsync ({
    rootState,
    commit,
    dispatch
  }, payload) {
    const docsToGet = []
    for (const id of payload.removedIds) {
      docsToGet.push({ id: id })
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
          // const prevLastChange = doc.lastChange || 0 --> ToDo: track last change?
          doc.lastChange = payload.timestamp
          const newHist = {
            dependencyRemovedEvent: [[payload.node._id], payload.node.title],
            sessionId: rootState.userData.sessionId,
            timestamp: Date.now(),
            distributeEvent: true
          }
          doc.history.unshift(newHist)
          docs.push(doc)
          if (payload.removedIds > 1) {
            commit('showLastEvent', { txt: 'The conditions are removed', severity: INFO })
          } else commit('showLastEvent', { txt: 'The condition is removed', severity: INFO })
        }
      }
      dispatch('updateBulk', {
        dbName: rootState.userData.currentDb,
        docs,
        caller: 'alsoRemoveDependenciesAsync',
        onSuccessCallback: () => {
          // update the conditions in the tree model
          commit('updateNodesAndCurrentDoc', { node: payload.node, conditionsremoved: payload.newCons, lastChange: payload.timestamp, newHist: payload.hist })
          // update the dependencies in the tree model
          for (const id of payload.removedIds) {
            const condForNode = window.slVueTree.getNodeById(id)
            if (condForNode === null) continue

            const depIdArray = []
            for (const depId of condForNode.dependencies) {
              if (depId !== payload.node._id) depIdArray.push(id)
            }
            // no need to pass history as the currenly selcted node is the node wth the dependencies
            commit('updateNodesAndCurrentDoc', { node: condForNode, dependenciesRemoved: depIdArray, lastChange: payload.timestamp })
          }
        }
      })
    }).catch(error => {
      const msg = 'alsoRemoveDependenciesAsync: Could not read batch of documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  removeExtDependenciesAsync ({
    rootState,
    dispatch
  }, externalDependencies) {
    function getDepItem (id) {
      for (const item of externalDependencies) {
        for (const d of item.dependencies) {
          if (d === id) return item
        }
      }
    }
    const docsToGet = []
    const docs = []
    for (const d of externalDependencies) {
      for (const dd of d.dependencies) {
        docsToGet.push({ id: dd })
      }
    }
    globalAxios({
      method: 'POST',
      url: rootState.userData.currentDb + '/_bulk_get',
      data: { docs: docsToGet }
    }).then(res => {
      const results = res.data.results
      for (const r of results) {
        const doc = r.docs[0].ok
        const depItem = getDepItem(doc._id)
        if (doc && doc.conditionalFor && depItem) {
          const newConditionalFor = []
          for (const c of doc.conditionalFor) {
            if (c !== depItem.id) newConditionalFor.push(c)
          }
          const newHist = {
            ignoreEvent: ['removeExtDependenciesAsync'],
            timestamp: Date.now(),
            distributeEvent: false
          }
          doc.history.unshift(newHist)
          doc.conditionalFor = newConditionalFor
          docs.push(doc)
        }
      }
      dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeExtDependenciesAsync' })
    }).catch(error => {
      const msg = 'removeExtDependenciesAsync: Could not read batch of documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  removeExtConditionsAsync ({
    rootState,
    dispatch
  }, externalConditions) {
    function getCondItem (id) {
      for (const item of externalConditions) {
        for (const c of item.conditions) {
          if (c === id) return item
        }
      }
    }
    const docsToGet = []
    const docs = []
    for (const c of externalConditions) {
      for (const cc of c.conditions) {
        docsToGet.push({ id: cc })
      }
    }
    globalAxios({
      method: 'POST',
      url: rootState.userData.currentDb + '/_bulk_get',
      data: { docs: docsToGet }
    }).then(res => {
      const results = res.data.results
      for (const r of results) {
        const doc = r.docs[0].ok
        const condItem = getCondItem(doc._id)
        if (doc && doc.dependencies && condItem) {
          const newDependencies = []
          for (const d of doc.dependencies) {
            if (d !== condItem.id) newDependencies.push(d)
          }
          const newHist = {
            ignoreEvent: ['removeExtConditionsAsync'],
            timestamp: Date.now(),
            distributeEvent: false
          }
          doc.history.unshift(newHist)
          doc.dependencies = newDependencies
          docs.push(doc)
        }
      }
      dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeExtConditionsAsync' })
    }).catch(error => {
      const msg = 'removeExtConditionsAsync: Could not read batch of documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  }
}

export default {
  actions
}
