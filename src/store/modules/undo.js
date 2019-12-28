import globalAxios from 'axios'

const WARNING = 1
const ERROR = 2

const actions = {
    /* Check if restoration is possible: the parent to store under must not be removed */
    unDoRemove({
        rootState,
        commit,
        dispatch
    }, entry) {
        const _id = entry.grandParentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
            withCredentials: true,
        }).then(res => {
            let grandParentDoc = res.data
            if (!grandParentDoc.delmark) {
                const newHist = {
                    "grandParentDocRestoredEvent": [entry.removedNode.level, entry.removedNode.title, entry.descendants.length],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": Date.now(),
                    "sessionId": rootState.userData.sessionId,
                    "distributeEvent": false
                }
                grandParentDoc.history.unshift(newHist)
                dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: grandParentDoc })
                dispatch('restoreParentFirst', entry)
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
    }, entry) {
        const _id = entry.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
            withCredentials: true,
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
                "docRestoredInsideEvent": [entry.descendants.length],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            tmpDoc.delmark = false
            dispatch('undoRemovedParent', { tmpDoc: tmpDoc, entry })
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
            withCredentials: true,
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
    /* Mark the descendants of the parent for removal. Do not distribute this event as distributing the parent removal will suffice */
    removeDescendantsBulk({
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
            withCredentials: true,
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('removeDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const ok = []
            const error = []
            for (let i = 0; i < results.length; i++) {
                if (results[i].docs[0].ok) {
                    const newHist = {
                        "docRemovedEvent": [payload.node.title],
                        "by": rootState.userData.user,
                        "email": rootState.userData.email,
                        "timestamp": Date.now(),
                        "sessionId": rootState.userData.sessionId,
                        "distributeEvent": false
                    }
                    results[i].docs[0].ok.history.unshift(newHist)
                    // mark for removal
                    results[i].docs[0].ok.delmark = true
                    ok.push(results[i].docs[0].ok)
                }
                if (results[i].docs[0].error) error.push(results[i].docs[0].error)
            }
            if (error.length > 0) {
                rootState.busyRemoving = false
                let errorStr = ''
                for (let i = 0; i < error.length; i++) {
                    errorStr.concat(errorStr.concat(error[i].id + '( error = ' + error[i].error + ', reason = ' + error[i].reason + '), '))
                }
                let msg = 'removeDescendantsBulk: These documents cannot be marked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', ok)
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeDescendantsBulk: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },
    /* Unmark the removed item and its descendants for removal. Do distribute this event and set the selfUpdate property to have the tree updated */
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
            withCredentials: true,
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('restoreDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const ok = []
            const error = []
            for (let i = 0; i < results.length; i++) {
                if (results[i].docs[0].ok) {
                    const newHist = {
                        "docRestoredEvent": [results[i].docs[0].ok.title],
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
            dispatch('updateBulk', ok)
        }).catch(error => {
            let msg = 'restoreDescendantsBulk: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    registerRemoveHistInParent({
        rootState,
        dispatch
    }, payload) {
        const _id = payload.node.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
            withCredentials: true,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removedFromParentEvent": [payload.node.level, payload.node.title, payload.descendants.length],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": false
            }
            tmpDoc.history.unshift(newHist)
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
            if (payload.descendants.length > 0) {
                dispatch('removeDescendantsBulk', payload)
            } else rootState.busyRemoving = false
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'registerRemoveHistInParent: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },
}

export default {
    actions
}
