import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const INFO = 0
const ERROR = 2
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const TASKLEVEL = 6
const AREA_PRODUCTID = '-REQAREA-PRODUCT'

// returns a new array
function removeFromArray(arr, item) {
    const newArr = []
    for (let el of arr) {
        if (el !== item) newArr.push(el)
    }
    return newArr
}

function getLevelText(configData, level) {
    if (level < 0 || level > TASKLEVEL) {
        return 'Level not supported'
    }
    return configData.itemType[level]
}

const actions = {
    /*
    * ToDo: create undo's if any of these steps fail
    * Order of execution:
    * 1. add history to the descendants of the removed parent
    * 2. if present remove descendants,
    * 3. remove parent (declare the removal as completed when this update has finished), dependencies and conditions in parallel.
    * 4. if a requirement area is removed also remove all references to this req area in all items
    */

    /* Add history to the parent of the removed node */
    removeItemAndDescendents({
        rootState,
        dispatch,
        commit
    }, payload) {
        payload.descendantsInfo = window.slVueTree.getDescendantsInfo(payload.node)
        commit('showLastEvent', { txt: `Busy removing ${getLevelText(rootState.configData, payload.node.level)} and ${payload.descendantsInfo.count} descendants ...`, severity: INFO })
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
        if (payload.descendantsInfo.count > 0) {
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
            }).catch(error => {
                let msg = 'removeDescendents: Could not read batch of documents: ' + error
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            })
        } else dispatch('removeParentAndAddHist', payload)
    },

    /* Remove the parent(node clicked) document and add history to it */
    removeParentAndAddHist({
        rootState,
        commit,
        dispatch
    }, payload) {
        const id = payload.node._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + id,
        }).then(res => {
            let tmpDoc = res.data

            // FOR PRODUCTS OVERVIEW ONLY: when removing a requirement area, items assigned to this area should be updated
            const itemsRemovedFromReqArea = []
            if (payload.productId === AREA_PRODUCTID) {
                window.slVueTree.traverseModels((nm) => {
                    if (nm.data.reqarea === id) {
                        delete nm.data.reqarea
                        itemsRemovedFromReqArea.push(nm._id)
                    }
                })
            }

            const newHist = {
                "removedWithDescendantsEvent": [
                    payload.productId,
                    payload.descendantsInfo.ids,
                    payload.extDepsCount,
                    payload.extCondsCount,
                    payload.descendantsInfo.sprintIds,
                    id
                ],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)

            tmpDoc.delmark = true

            let toDispatch = undefined
            if (payload.productId === AREA_PRODUCTID) {
                // remove reqarea assignments
                toDispatch = { 'removeReqAreaAssignments': id }
            }
            dispatch('updateDoc', {
                dbName: rootState.userData.currentDb,
                updatedDoc: tmpDoc, toDispatch,
                onSuccessCallback: () => {
                    // remove any dependency references to/from outside the removed items; note: these cannot be undone
                    const removed = window.slVueTree.correctDependencies(rootState.currentProductId, payload.descendantsInfo.ids)
                    // before removal select the predecessor of the removed node (sibling or parent)
                    const prevNode = window.slVueTree.getPreviousNode(payload.node.path)
                    let nowSelectedNode = prevNode
                    if (prevNode.level === DATABASELEVEL) {
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
                        delete rootState.userData.myProductsRoles[id]
                        if (rootState.userData.myProductSubscriptions.includes(id)) {
                            rootState.userData.myProductSubscriptions = removeFromArray(rootState.userData.myProductSubscriptions, id)
                            rootState.userData.userAssignedProductIds = removeFromArray(rootState.userData.userAssignedProductIds, id)
                            const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(id)
                            rootState.myProductOptions.splice(removeIdx, 1)
                        }
                    }
                    // create an entry for undoing the remove in a last-in first-out sequence
                    const entry = {
                        type: 'undoRemove',
                        removedNode: payload.node,
                        isProductRemoved: payload.node.level === PRODUCTLEVEL,
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
                    if (payload.showUndoneMsg) {
                        commit('showLastEvent', { txt: `Item creation is undone`, severity: INFO })
                    } else {
                        commit('showLastEvent', { txt: `The ${getLevelText(rootState.configData, payload.node.level)} and ${payload.descendantsInfo.count} descendants are removed`, severity: INFO })
                    }
                }
            })
        }).catch(error => {
            let msg = 'removeParentAndAddHist: Could not read document with _id ' + id + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeReqAreaAssignments({
        rootState,
        dispatch
    }, reqArea) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/assignedToReqArea?' + `startkey="${reqArea}"&endkey="${reqArea}"&include_docs=true`
        }).then(res => {
            const updatedDocs = []
            const results = res.data.rows
            for (let r of results) {
                const doc = r.doc
                delete doc.reqarea
                const newHist = {
                    "ignoreEvent": ['removeReqAreaAssignments'],
                    "timestamp": Date.now(),
                    "distributeEvent": false
                }
                doc.history.unshift(newHist)
                updatedDocs.push(doc)
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: updatedDocs })
        }).catch(error => {
            let msg = 'removeReqAreaAssignment: Could not read document with id ' + reqArea + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
