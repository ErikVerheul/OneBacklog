import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const WARNING = 1
const ERROR = 2

const actions = {
    /*
    * ToDo: create undo's if any of these steps fail
    * Order of execution:
    * 1. descendants
    * 2. parent of the descendants
    * 3. grandparent of the descendants (if removed then undo the removal)
    * 4. dependencies & conditions
    *  If any of these steps fail the next steps are not executed but not undone
    */

    /* Unmark the removed item and its descendants for removal. Do not distribute this event */
    restoreDescendantsBulk({
        rootState,
        dispatch
    }, entry) {
        const docsToGet = []
        for (let d of entry.descendants) {
            docsToGet.push({ "id": d._id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('restoreDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const docs = []
            const errors = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "ignoreEvent": ['restoreDescendantsBulk'],
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
                let errorStr = ''
                for (let err of errors) {
                    errorStr.concat(errorStr.concat(err.id + '( error = ' + err.error + ', reason = ' + err.reason + '), '))
                }
                let msg = 'restoreDescendantsBulk: These documents cannot be UNmarked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            const toDispatch = { 'restoreParent': entry }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'restoreDescendantsBulk' })
        }).catch(error => {
            let msg = 'restoreDescendantsBulk: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    restoreParent({
        rootState,
        dispatch
    }, entry) {
        const _id = entry.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            if (entry.isProductRemoved) {
                // re-enter the product to the users product roles, subscriptions and product selection array
                const id = entry.removedNode._id
                rootState.userData.myProductsRoles[id] = entry.removedProductRoles
                rootState.userData.myProductSubscriptions.push(id)
                rootState.myProductOptions.push({
                    value: id,
                    text: entry.removedNode.title
                })
            }
            const newHist = {
                "docRestoredEvent": [entry.descendants.length, entry.removedIntDependencies, entry.removedExtDependencies, entry.removedIntConditions, entry.removedExtConditions],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            tmpDoc.delmark = false
            const toDispatch = { 'updateGrandparentHist': entry }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch, caller: 'restoreParent' })
        }).catch(error => {
            let msg = 'restoreParent: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    updateGrandparentHist({
        rootState,
        commit,
        dispatch
    }, entry) {
        const _id = entry.grandParentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let grandParentDoc = res.data
            const newHist = {
                "grandParentDocRestoredEvent": [entry.removedNode.level, entry.removedNode.title, entry.descendants.length, entry.removedNode.data.subtype],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": false
            }
            grandParentDoc.history.unshift(newHist)
            // unmark for removal in case it was removed
            if (grandParentDoc.delmark) {
                commit('showLastEvent', { txt: `The document representing the item to restore under was removed. The removal is made undone.`, severity: WARNING })
                grandParentDoc.delmark = false
            }
            const toDispatch = { 'restoreExtDepsAndConds': entry }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc, toDispatch, caller: 'updateGrandparentHist' })
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
                for (let err of errors) {
                    errorStr.concat(errorStr.concat(err.id + '( error = ' + err.error + ', reason = ' + err.reason + '), '))
                }
                let msg = 'restoreExtDepsAndConds: The dependencies or conditions of these documents cannot be restored: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'restoreExtDepsAndConds' })
        }).catch(error => {
            let msg = 'restoreExtDepsAndConds: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
