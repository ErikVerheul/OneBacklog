import globalAxios from 'axios'

const WARNING = 1
const ERROR = 2

const actions = {
    /* Check if restoration is possible: the parent (or grandparent to the descendants of the removed item) to store under must not be removed */
    unDoRemove({
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
            if (!grandParentDoc.delmark) {
                const newHist = {
                    "grandParentDocRestoredEvent": [entry.removedNode.level, entry.removedNode.title, entry.descendants.length, entry.removedNode.data.subtype],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": Date.now(),
                    "sessionId": rootState.userData.sessionId,
                    "distributeEvent": false
                }
                grandParentDoc.history.unshift(newHist)
                const payload = {entry, grandParentPayload: { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc } }
                dispatch('restoreParentFirst', payload)
            } else {
                commit('showLastEvent', { txt: `You cannot restore under the removed item with title '${grandParentDoc.title}'`, severity: WARNING })
            }
        }).catch(error => {
            let msg = 'unDoRemove: Could not read document with _id ' + _id + ',' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    restoreParentFirst({
        rootState,
        dispatch
    }, payload) {
        const entry = payload.entry
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
                "docRestoredEvent": [entry.descendants.length],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            tmpDoc.delmark = false
            dispatch('updateDoc', payload.grandParentPayload)
            const parentPayload = { tmpDoc, entry }
            dispatch('undoRemovedParent', parentPayload)
        }).catch(error => {
            let msg = 'restoreParentFirst: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* update the parent and restore the descendants */
    undoRemovedParent({
        rootState,
        dispatch
    }, payload) {
        const _id = payload.tmpDoc._id
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log('undoRemovedParent: updating document with _id = ' + _id)
        globalAxios({
            method: 'PUT',
            url: rootState.userData.currentDb + '/' + _id,
            data: payload.tmpDoc
        }).then(() => {
            dispatch('restoreDescendantsBulk', payload.entry)
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('undoRemovedParent: document with _id ' + _id + ' is updated.')
        }).catch(error => {
            let msg = 'undoRemovedParent: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Unmark the removed item and its descendants for removal. Do not distribute this event */
    restoreDescendantsBulk({
        rootState,
        dispatch
    }, payload) {
        const docsToGet = []
        for (let desc of payload.descendants) {
            docsToGet.push({ "id": desc._id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('restoreDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const ok = []
            const error = []
            for (let i = 0; i < results.length; i++) {
                if (results[i].docs[0].ok) {
                    const newHist = {
                        "descendantRestoredEvent": [results[i].docs[0].ok.title],
                        "by": rootState.userData.user,
                        "email": rootState.userData.email,
                        "timestamp": Date.now(),
                        "sessionId": rootState.userData.sessionId,
                        "distributeEvent": false
                    }
                    results[i].docs[0].ok.history.unshift(newHist)
                    // unmark for removal
                    results[i].docs[0].ok.delmark = false
                    ok.push(results[i].docs[0].ok)
                }
                if (results[i].docs[0].error) error.push(results[i].docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'restoreDescendantsBulk: These documents cannot be UNmarked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
        }).catch(error => {
            let msg = 'restoreDescendantsBulk: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
