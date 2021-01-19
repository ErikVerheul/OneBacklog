import { sev } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

function composeRangeString (id) {
  return `startkey="${id}"&endkey="${id}"`
}

const actions = {
  /*
	* Note: the tree model is updated before the database is. To update the database the new priority must be calculated first while inserting the node.
	* Order of execution:
	* 1. update the moved nodes with productId, parentId, level, priority, sprintId and history. History is used for syncing with other sessions and reporting
	* 2. if moving to another product or level, call getMovedChildrenIds
	* 2.1 update the productId (not parentId) and level of the descendants in updateMovedDescendantsBulk. History is ignored
	*/
  updateMovedItemsBulk ({
    rootState,
    commit,
    dispatch
  }, payload) {
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
    function getPayLoadItem (id) {
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
          const item = getPayLoadItem(doc._id)
          const newHist = {
            nodeMovedEvent: [m.sourceLevel, m.sourceLevel + m.levelShift, item.targetInd, m.targetParentTitle, item.childCount, m.sourceParentTitle, m.placement, m.sourceParentId, m.targetParentId,
              item.sourceInd, item.newlyCalculatedPriority, item.sourceSprintId, item.targetSprintId, m.type, item.lastPositionChange],
            by: rootState.userData.user,
            timestamp: Date.now(),
            sessionId: rootState.mySessionId,
            distributeEvent: true
          }

          doc.history.unshift(newHist)

          doc.productId = m.targetProductId
          doc.parentId = m.targetParentId
          doc.level = doc.level + m.levelShift
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
          errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
        }
        const msg = 'updateMovedItemsBulk: These items cannot be updated: ' + errorStr
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log(msg)
        dispatch('doLog', { event: msg, level: sev.ERROR })
        // ToDo: make this an alert with the only option to restart the application
        commit('showLastEvent', { txt: 'The move failed due to update errors. Try again after sign-out or contact your administrator', severity: sev.WARNING })
      } else {
        dispatch('saveMovedItems', { moveDataContainer: mdc, moveInfo, items, docs, move: payload.move })
      }
    }).catch(e => {
      const msg = 'updateMovedItemsBulk: Could not read descendants in bulk. Error = ' + e
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: sev.ERROR })
    })
  },

  saveMovedItems ({
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
      data: { docs: docs }
    }).then(res => {
      let updateOk = 0
      let updateConflict = 0
      let otherError = 0
      for (const result of res.data) {
        if (result.ok) updateOk++
        if (result.error === 'conflict') updateConflict++
        if (result.error && result.error !== 'conflict') otherError++
      }
      // eslint-disable-next-line no-console
      const msg = 'saveMovedItems: ' + updateOk + ' documents are updated, ' + updateConflict + ' updates have a conflict, ' + otherError + ' updates failed on error'
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      if (updateConflict > 0 || otherError > 0) {
        // note that logging may fail if the connection is lost
        dispatch('doLog', { event: msg, level: sev.WARNING })
        // ToDo: make this an alert with the only option to restart the application
        commit('showLastEvent', { txt: 'The move failed due to update conflicts or errors. Try again after sign-out or contact your administrator', severity: sev.WARNING })
      } else {
        // no conflicts, no other errors
        for (const it of items) {
          // show the history in the current opened item
          commit('updateNodesAndCurrentDoc', { node: it.node, sprintId: it.targetSprintId, lastPositionChange: it.lastPositionChange })
        }
        // if moving to another product or another level, update the descendants of the moved(back) items
        if (m.targetProductId !== m.sourceProductId || m.levelShift !== 0) {
          const updates = {
            targetProductId: m.targetProductId,
            levelShift: m.levelShift
          }
          for (const it of items) {
            // run in parallel for all moved nodes (nodes on the same level do not share descendants)
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
      const msg = 'saveMovedItems: Could not save the moved documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: sev.ERROR })
    })
  },

  processDescendents ({
    dispatch
  }, payload) {
    const descendentIds = []
    for (const r of payload.results) {
      const id = r.id
      descendentIds.push(id)
      dispatch('getMovedChildrenIds', { updates: payload.updates, id })
    }
    dispatch('updateMovedDescendantsBulk', { updates: payload.updates, descendentIds })
  },

  getMovedChildrenIds ({
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
      const msg = 'getMovedChildrenIds: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: sev.ERROR })
    })
  },

  updateMovedDescendantsBulk ({
    rootState,
    dispatch
  }, payload) {
    const updates = payload.updates

    const docsToGet = []
    for (const id of payload.descendentIds) {
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
        const envelope = r.docs[0]
        if (envelope.ok) {
          const doc = envelope.ok
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
          docs.push(doc)
        }
      }
      dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'updateMovedDescendantsBulk' })
    }).catch(e => {
      const msg = 'updateMovedDescendantsBulk: Could not read decendants in bulk. Error = ' + e
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: sev.ERROR })
    })
  }
}

export default {
  actions
}
