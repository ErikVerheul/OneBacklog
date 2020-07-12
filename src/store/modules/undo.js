import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const INFO = 0
const WARNING = 1
const ERROR = 2
const AREA_PRODUCTID = 'requirement-areas'

// returns a new array so that it is reactive
function addToArray(arr, item) {
    const newArr = []
    for (let el of arr) newArr.push(el)
    newArr.push(item)
    return newArr
}

const actions = {
    /*
    * ToDo: create undo's if any of these steps fail
    * Order of execution:
    * 1. restore descendants (no history attached)
    * 2. parent of the descendants and update the tree
    * 3. grandparent of the descendants (if removed then undo the removal)
    * 4. dependencies & conditions
    * If any of these steps fail the next steps are not executed but not undone
    */

    /* Unmark the removed item and its descendants for removal. Do not distribute this event */
    restoreItemAndDescendents({
        rootState,
        commit,
        dispatch
    }, entry) {
        const docsToGet = []
        for (let id of entry.docsRemovedIds) {
            docsToGet.push({ "id": id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const docs = []
            const errors = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "ignoreEvent": ['restoreItemAndDescendents'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    // restore removed dependencies if the array exists (when not the dependency cannot be removed from this document)
                    if (doc.dependencies)
                        for (let d of entry.removedIntDependencies) {
                            if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
                        }
                    // restore removed conditions if the array exists (when not the condition cannot be removed from this document)
                    if (doc.conditionalFor)
                        for (let c of entry.removedIntConditions) {
                            if (c.id === doc._id) doc.conditionalFor.push(c.conditionalFor)
                        }
                    // unmark for removal
                    doc.delmark = false
                    docs.push(doc)
                }
                if (r.docs[0].error) errors.push(r.docs[0].error)
            }
            if (errors.length > 0) {
                commit('showLastEvent', { txt: 'Undo failed', severity: ERROR })
                let errorStr = ''
                for (let e of errors) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'restoreItemAndDescendents: These documents cannot be UNmarked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            const toDispatch = { 'restoreParent': entry }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
        }).catch(e => {
            let msg = 'restoreItemAndDescendents: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
    restoreParent({
        rootState,
        commit,
        dispatch
    }, entry) {
        const _id = entry.removedNode._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let updatedDoc = res.data
            const newHist = {
                "docRestoredEvent": [entry.docsRemovedIds.length - 1, entry.removedIntDependencies, entry.removedExtDependencies,
                entry.removedIntConditions, entry.removedExtConditions, entry.removedProductRoles, entry.sprintIds, entry.itemsRemovedFromReqArea],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            updatedDoc.history.unshift(newHist)

            updatedDoc.delmark = false
            const toDispatch = { 'updateGrandParentHist': entry }
            dispatch('updateDoc', {
                dbName: rootState.userData.currentDb, updatedDoc, toDispatch,
                onSuccessCallback: () => {
                    // FOR PRODUCTS OVERVIEW ONLY: when undoing the removal of a requirement area, items must be reassigned to this area
                    if (entry.removedNode.productId === AREA_PRODUCTID) {
                        window.slVueTree.traverseModels((nm) => {
                            if (entry.itemsRemovedFromReqArea.includes(nm._id)) {
                                nm.data.reqarea = entry.removedNode._id
                            }
                        })
                    }
                    if (entry.isProductRemoved) {
                        // re-enter the product to the users product roles, subscriptions, product ids and product selection array
                        rootState.userData.myProductsRoles[_id] = entry.removedProductRoles
                        rootState.userData.myProductSubscriptions = addToArray(rootState.userData.myProductSubscriptions, _id)
                        rootState.userData.userAssignedProductIds = addToArray(rootState.userData.userAssignedProductIds, _id)
                        rootState.myProductOptions.push({
                            value: _id,
                            text: entry.removedNode.title
                        })
                    }
                    const path = entry.removedNode.path
                    const prevNode = window.slVueTree.getPreviousNode(path)
                    let cursorPosition
                    if (entry.removedNode.path.slice(-1)[0] === 0) {
                        // the previous node is the parent
                        cursorPosition = {
                            nodeModel: prevNode,
                            placement: 'inside'
                        }
                    } else {
                        // the previous node is a sibling
                        cursorPosition = {
                            nodeModel: prevNode,
                            placement: 'after'
                        }
                    }
                    // do not recalculate priorities when inserting a product node
                    window.slVueTree.insert(cursorPosition, [entry.removedNode], entry.removedNode.parentId !== 'root')
                    // select the recovered node
                    commit('updateNodesAndCurrentDoc', { selectNode: entry.removedNode })
                    rootState.currentProductId = entry.removedNode.productId
                    // restore the removed dependencies
                    for (let d of entry.removedIntDependencies) {
                        const node = window.slVueTree.getNodeById(d.id)
                        if (node !== null) node.dependencies.push(d.dependentOn)
                    }
                    for (let d of entry.removedExtDependencies) {
                        const node = window.slVueTree.getNodeById(d.id)
                        if (node !== null) node.dependencies.push(d.dependentOn)
                    }
                    for (let c of entry.removedIntConditions) {
                        const node = window.slVueTree.getNodeById(c.id)
                        if (node !== null) node.conditionalFor.push(c.conditionalFor)
                    }
                    for (let c of entry.removedExtConditions) {
                        const node = window.slVueTree.getNodeById(c.id)
                        if (node !== null) node.conditionalFor.push(c.conditionalFor)
                    }
                    commit('showLastEvent', { txt: 'Item(s) remove is undone', severity: INFO })
                    commit('updateNodesAndCurrentDoc', { newDoc: updatedDoc })
                }
            })
        }).catch(error => {
            let msg = 'restoreParent: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* The parent is the removed node and parent of the removed children. The grandParent is the parent of the removed node and was not removed. */
    updateGrandParentHist({
        rootState,
        commit,
        dispatch
    }, entry) {
        const _id = entry.removedNode.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let grandParentDoc = res.data
            const newHist = {
                "grandParentDocRestoredEvent": [entry.removedNode.level, entry.removedNode.title, entry.docsRemovedIds.length - 1, entry.removedNode.data.subtype],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "distributeEvent": false
            }
            grandParentDoc.history.unshift(newHist)

            // unmark for removal in case it was removed
            if (grandParentDoc.delmark) {
                commit('showLastEvent', { txt: `The document representing the item to restore under was removed. The removal is made undone.`, severity: WARNING })
                grandParentDoc.delmark = false
            }
            const toDispatch = { 'restoreExtDepsAndConds': entry }
            if (entry.removedNode.productId === AREA_PRODUCTID) {
                // restore the removed references to the requirement area
                toDispatch.restoreReqarea = entry
            }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc, toDispatch })
        }).catch(error => {
            let msg = 'unDoRemove: Could not read document with _id ' + _id + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Restore the dependencies on and conditions for documents external to the restored descendants */
    restoreExtDepsAndConds({
        rootState,
        dispatch
    }, entry) {
        const docsToGet = []
        for (let d of entry.removedExtDependencies) {
            docsToGet.push({ "id": d.id })
        }
        for (let c of entry.removedExtConditions) {
            docsToGet.push({ "id": c.id })
        }
        if (docsToGet.length === 0) {
            // nothing to do
            return
        }
        console.log('restoreExtDepsAndConds: docsToGet = ' + JSON.stringify(docsToGet, null, 2))
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('restoreExtDepsAndConds: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const docs = []
            const errors = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    // restore removed dependencies if the array exists (when not the dependency cannot be removed from this document)
                    if (doc.dependencies)
                        for (let d of entry.removedExtDependencies) {
                            if (d.id === doc._id) doc.dependencies.push(d.dependentOn)
                        }
                    // restore removed conditions if the array exists (when not the condition cannot be removed from this document)
                    if (doc.conditionalFor)
                        for (let c of entry.removedExtConditions) {
                            if (c.id === doc._id) doc.conditionalFor.push(c.conditionalFor)
                        }
                    const newHist = {
                        "ignoreEvent": ['restoreExtDepsAndConds'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    // unmark for removal
                    doc.delmark = false
                    docs.push(doc)
                }
                if (r.docs[0].error) errors.push(r.docs[0].error)
            }
            if (errors.length > 0) {
                let errorStr = ''
                for (let e of errors) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'restoreExtDepsAndConds: The dependencies or conditions of these documents cannot be restored: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'restoreExtDepsAndConds: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Restore the requirement area references */
    restoreReqarea({
        rootState,
        dispatch
    }, entry) {
        const docsToGet = []
        for (let id of entry.itemsRemovedFromReqArea) {
            docsToGet.push({ "id": id })
        }
        if (docsToGet.length === 0) {
            // nothing to do
            return
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const docs = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    doc.reqarea = entry.removedNode._id
                    const newHist = {
                        "ignoreEvent": ['restoreExtDepsAndConds'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)

                    docs.push(doc)
                }
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'restoreReqarea: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
