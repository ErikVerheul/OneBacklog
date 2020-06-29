import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const INFO = 0
const ERROR = 2
const PRODUCTLEVEL = 2
const AREA_PRODUCTID = '0'

// returns a new array
function removeFromArray(arr, item) {
    const newArr = []
    for (let el of arr) {
        if (el !== item) newArr.push(el)
    }
    return newArr
}

const actions = {
    /*
    * ToDo: create undo's if any of these steps fail
    * Order of execution:
    * 1. add history to the descendants of the removed parent
    * 2. remove descendants,
    * 3. remove parent (declare the removal as completed when this update has finished), dependencies and conditions in parallel.
    * If step 1 or 2 fails the next steps are not executed but the successful steps are not undone
    */

    /* Add history to the parent of the removed node */
    removeItemAndDescendents({
        rootState,
        dispatch
    }, payload) {
        const _id = payload.node.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removedFromParentEvent": [
                    payload.node.level,
                    payload.node.title,
                    payload.descendantsInfo.count,
                    payload.node.data.subtype
                ],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": false
            }
            tmpDoc.history.unshift(newHist)

            const toDispatch = { removeDescendents: payload }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch })
        }).catch(error => {
            let msg = 'removeItemAndDescendents: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Mark the descendants of the parent for removal. Do not distribute this event as distributing the parent removal will suffice */
    removeDescendents({
        rootState,
        dispatch
    }, payload) {
        const docsToGet = []
        for (let d of payload.descendantsInfo.ids) {
            docsToGet.push({ "id": d })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const docs = []
            const error = []
            const externalDependencies = []
            const externalConditions = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "ignoreEvent": ['removeDescendents'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)

                    // find external dependencies (to or from items outside the range if this bulk) for removal; leave internal dependencies as is
                    let thisNodesExtDependencies = { id: doc._id, dependencies: [] }
                    if (doc.dependencies) {
                        const internalDependencies = []
                        for (let d of doc.dependencies) {
                            if (payload.descendantsInfo.ids.includes(d)) {
                                internalDependencies.push(d)
                            } else {
                                thisNodesExtDependencies.dependencies.push(d)
                            }
                        }
                        doc.dependencies = internalDependencies
                    }
                    let thisNodesExtConditions = { id: doc._id, conditions: [] }
                    if (doc.conditionalFor) {
                        const internalConditions = []
                        for (let c of doc.conditionalFor) {
                            if (payload.descendantsInfo.ids.includes(c)) {
                                internalConditions.push(c)
                            } else {
                                thisNodesExtConditions.conditions.push(c)
                            }
                        }
                        doc.conditionalFor = internalConditions
                    }
                    if (thisNodesExtDependencies.dependencies.length > 0) externalDependencies.push(thisNodesExtDependencies)
                    if (thisNodesExtConditions.conditions.length > 0) externalConditions.push(thisNodesExtConditions)
                    // mark for removal
                    doc.delmark = true
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }

            if (error.length > 0) {
                let errorStr = ''
                for (let e of error) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'removeDescendents: These documents cannot be marked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            } else {
                // add externalDependencies and externalConditions to the payload
                payload.extDepsCount = externalDependencies.length
                payload.extCondsCount = externalConditions.length

                // transfer these calls to updateBulk so that they are executed after successful removal only
                const toDispatch = { removeParentAndAddHist: payload }
                if (externalDependencies.length > 0) {
                    // remove the conditions in the documents not removed which match the externalDependencies
                    toDispatch.removeExtDependenciesAsync = externalDependencies
                }
                if (externalConditions.length > 0) {
                    // remove the dependencies in the documents not removed which match the externalConditions
                    toDispatch.removeExtConditionsAsync = externalConditions
                }
                dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
            }
        }).catch(error => {
            let msg = 'removeDescendents: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Remove the parent(node clicked) document and add history to it */
    removeParentAndAddHist({
        rootState,
        commit,
        dispatch
    }, payload) {
        const _id = payload.node._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removedWithDescendantsEvent": [payload.productId, payload.descendantsInfo, payload.extDepsCount, payload.extCondsCount, payload.sprintIds],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)

            tmpDoc.delmark = true
            dispatch('updateDoc', {
                dbName: rootState.userData.currentDb,
                updatedDoc: tmpDoc,
                onSuccessCallback: () => {
                    // FOR PRODUCTS OVERVIEW ONLY: when removing a requirement area, items assigned to this area should be updated
                    const itemsRemovedFromReqArea = []
                    if (payload.productId === AREA_PRODUCTID) {
                        window.slVueTree.traverseModels((nm) => {
                            if (nm.data.reqarea === _id) {
                                nm.data.reqarea = null
                                itemsRemovedFromReqArea.push(nm._id)
                            }
                        })
                    }
                    // remove any dependency references to/from outside the removed items; note: these cannot be undone
                    const removed = window.slVueTree.correctDependencies(rootState.currentProductId, payload.descendantsInfo.ids)
                    // before removal select the predecessor of the removed node (sibling or parent)
                    const prevNode = window.slVueTree.getPreviousNode(payload.node.path)
                    let nowSelectedNode = prevNode
                    if (prevNode.level === this.databaseLevel) {
                        // if a product is to be removed and the previous node is root, select the next product
                        const nextProduct = window.slVueTree.getNextSibling(payload.node.path)
                        if (nextProduct === null) {
                            // there is no next product; cannot remove the last product; note that this action is already blocked with a warming
                            return
                        }
                        nowSelectedNode = nextProduct
                    }
                    commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode, productId: nowSelectedNode.productId })
                    // load the new selected item
                    dispatch('loadDoc', { id: nowSelectedNode._id })
                    // remove the node and its children
                    window.slVueTree.remove([payload.node])

                    if (payload.node.level === PRODUCTLEVEL) {
                        // remove the product from the users product roles, subscriptions and product selection array
                        delete rootState.userData.myProductsRoles[_id]
                        if (rootState.userData.myProductSubscriptions.includes(_id)) {
                            rootState.userData.myProductSubscriptions = removeFromArray(rootState.userData.myProductSubscriptions, _id)
                            rootState.userData.userAssignedProductIds = removeFromArray(rootState.userData.userAssignedProductIds, _id)
                            const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(_id)
                            rootState.myProductOptions.splice(removeIdx, 1)
                        }
                    }
                    // create an entry for undoing the remove in a last-in first-out sequence
                    const entry = {
                        type: 'undoRemove',
                        removedNode: payload.node,
                        isProductRemoved: payload.node.level === this.productLevel,
                        descendants: payload.descendantsInfo.descendants,
                        removedIntDependencies: removed.removedIntDependencies,
                        removedIntConditions: removed.removedIntConditions,
                        removedExtDependencies: removed.removedExtDependencies,
                        removedExtConditions: removed.removedExtConditions,
                        sprintIds: payload.descendantsInfo.sprintIds,
                        itemsRemovedFromReqArea
                    }
                    if (entry.isProductRemoved) {
                        entry.removedProductRoles = rootState.userData.myProductsRoles[payload.node._id]
                    }
                    rootState.changeHistory.unshift(entry)
                    if (payload.showUndoneMsg) commit('showLastEvent', { txt: `Item creation is undone`, severity: INFO })
                }
            })
        }).catch(error => {
            let msg = 'removeParentAndAddHist: Could not read document with _id ' + _id + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
