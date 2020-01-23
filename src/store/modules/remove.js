import globalAxios from 'axios'

const ERROR = 2
const PRODUCTLEVEL = 2

const actions = {
    /* Remove the dependent_on reference in the dependencies array in a batch of documents */
    removeDependencies({
        rootState,
        dispatch
    }, payload) {
        if (Object.keys(payload.condForDocuments).length === 0) return

        const docsToGet = []
        for (let id of payload.condForDocuments) {
            docsToGet.push({ "id": id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const docs = []
            const error = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newDependencies = []
                    if (doc.dependencies) {
                        for (let d of doc.dependencies) {
                            if (d !== payload.ref) {
                                newDependencies.push(d)
                            }
                        }
                    }
                    doc.dependencies = newDependencies
                    const newHist = {
                        "ignoreEvent": ['dependency removed'],
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeDependencies: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(error => {
            let msg = 'removeDependencies: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Remove the conditional_for reference in the conditionalFor array in a batch of documents */
    removeConditions({
        rootState,
        dispatch
    }, payload) {
        if (Object.keys(payload.depOnDocuments).length === 0) return

        const docsToGet = []
        for (let id of payload.depOnDocuments) {
            docsToGet.push({ "id": id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const docs = []
            const error = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newConditions = []
                    if (doc.conditionalFor) {
                        for (let c of doc.conditionalFor) {
                            if (c !== payload.ref) {
                                newConditions.push(c)
                            }
                        }
                    }
                    doc.conditionalFor = newConditions
                    const newHist = {
                        "ignoreEvent": ['condition removed'],
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeConditions: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(error => {
            let msg = 'removeConditions: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Mark the descendants of the parent for removal. Do not distribute this event as distributing the parent removal will suffice */
    removeDocuments({
        rootState,
        dispatch
    }, payload) {
        rootState.busyRemoving = true
        const docsToGet = []
        for (let d of payload.descendantsIds) {
            docsToGet.push({ "id": d })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('removeDocuments: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const docs = []
            const error = []
            const externalDependencies = []
            const externalConditions = []
            let extDepCount = 0
            let extCondCount = 0
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "docRemovedDescendantEvent": [payload.node.level, payload.node.data.subtype, payload.node.title],
                        "by": rootState.userData.user,
                        "email": rootState.userData.email,
                        "timestamp": Date.now(),
                        "sessionId": rootState.userData.sessionId,
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    // mark for removal
                    doc.delmark = true
                    docs.push(doc)
                    // find external dependencies (to or from items outside the range if this bulk) for removal; leave internal dependencies as is
                    // note that the external dependencies will be lost after an undo
                    let thisNodesExtDependencies = { id: doc._id, dependencies: [] }
                    if (doc.dependencies) {
                        const internalDependencies = []
                        for (let d of doc.dependencies) {
                            if (payload.descendantsIds.includes(d)) {
                                internalDependencies.push(d)
                            } else {
                                thisNodesExtDependencies.dependencies.push(d)
                                extDepCount++
                            }
                        }
                        doc.dependencies = internalDependencies
                    }
                    let thisNodesExtConditions = { id: doc._id, conditions: [] }
                    if (doc.conditionalFor) {
                        const internalConditions = []
                        for (let c of doc.conditionalFor) {
                            if (payload.descendantsIds.includes(c)) {
                                internalConditions.push(c)
                            } else {
                                thisNodesExtConditions.conditions.push(c)
                                extCondCount++
                            }
                        }
                        doc.conditionalFor = internalConditions
                    }
                    if (thisNodesExtDependencies.dependencies.length > 0) externalDependencies.push(thisNodesExtDependencies)
                    if (thisNodesExtConditions.conditions.length > 0) externalConditions.push(thisNodesExtConditions)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }

            if (error.length > 0) {
                rootState.busyRemoving = false
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeDocuments: These documents cannot be marked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            // add externalDependencies and externalConditions to the payload
            payload.extDepCount = extDepCount
            payload.extCondCount = extCondCount

            // transfer these calls to updateBulk so that they are executed after successful removal only
            const toDispatch = {
                removeParent: payload,
                // remove the conditions in the documents not removed which match the externalDependencies
                removeExtDependencies: externalDependencies,
                // remove the dependencies in the documents not removed which match the externalConditions;
                removeExtConditions: { externalConditions, payload }
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeDocuments: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeExtDependencies({
        rootState,
        dispatch
    }, externalDependencies) {
        function getDepItem(id) {
            for (let item of externalDependencies) {
                for (let d of item.dependencies) {
                    if (d === id) return item
                }
            }
        }
        const docsToGet = []
        const docs = []
        const error = []
        for (let d of externalDependencies) {
            for (let dd of d.dependencies) {
                docsToGet.push({ "id": dd })
            }
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            for (let r of results) {
                const doc = r.docs[0].ok
                const depItem = getDepItem(doc._id)
                if (doc && doc.conditionalFor && depItem) {
                    let newConditionalFor = []
                    for (let c of doc.conditionalFor) {
                        if (c !== depItem.id) newConditionalFor.push(c)
                    }
                    doc.conditionalFor = newConditionalFor
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                rootState.busyRemoving = false
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeExtDependencies: These documents cannot be updated for their set dependencies: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeExtDependencies: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeExtConditions({
        rootState,
        dispatch
    }, superPayload) {
        const externalConditions = superPayload.externalConditions
        const payload = superPayload.payload
        function getCondItem(id) {
            for (let item of externalConditions) {
                for (let c of item.conditions) {
                    if (c === id) return item
                }
            }
        }
        const docsToGet = []
        const docs = []
        const error = []
        for (let c of externalConditions) {
            for (let cc of c.conditions) {
                docsToGet.push({ "id": cc })
            }
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            for (let r of results) {
                const doc = r.docs[0].ok
                const condItem = getCondItem(doc._id)
                if (doc && doc.dependencies && condItem) {
                    let newDependencies = []
                    for (let d of doc.dependencies) {
                        if (d !== condItem.id) newDependencies.push(d)
                    }
                    doc.dependencies = newDependencies
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                rootState.busyRemoving = false
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeExtConditions: These documents cannot be updated for their set conditions: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            // execute registerHistInGrandParent after removeExtConditions to prevent a conflict if the grandparent is also dependent on the removed docs
            const toDispatch = { registerHistInGrandParent: payload}
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeExtConditions: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Add history to the removed document */
    removeParent({
        rootState,
        dispatch
    }, payload) {
        const _id = payload.node._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removeParentEvent": [payload.productId, payload.descendantsIds, payload.extDepCount, payload.extCondCount],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.delmark = true
            tmpDoc.history.unshift(newHist)
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
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
        }).catch(error => {
            let msg = 'removeParent: Could not read document with _id ' + _id + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Add history to the parent of the removed node */
    registerHistInGrandParent({
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
                "removedFromParentEvent": [payload.node.level, payload.node.title, payload.descendantsIds.length, payload.node.data.subtype, payload.extDepCount, payload.extCondCount],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": false
            }
            tmpDoc.history.unshift(newHist)
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
            rootState.busyRemoving = false
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'registerHistInGrandParent: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },
}

export default {
    actions
}
