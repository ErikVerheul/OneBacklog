import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2

const actions = {
    /* Set one dependency with one corresponding condition */
    setDepAndCond({
        rootState,
        dispatch
    }, payload) {
        const id = payload.dependentOnNode._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "setDependenciesEvent": [payload.conditionalForNode._id, payload.conditionalForNode.title],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            const prevLastChange = tmpDoc.lastChange || 0
            tmpDoc.lastChange = payload.timestamp
            payload.dependentOnPrevLastChange = prevLastChange
            if (tmpDoc.dependencies) { tmpDoc.dependencies.push(payload.conditionalForNode._id) } else tmpDoc.dependencies = [payload.conditionalForNode._id]
            const toDispatch = { alsoSetConditions: payload }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch })
        }).catch(error => {
            let msg = 'setDepAndCond: Could not read document with _id ' + id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Called by setDepAndCond only */
    alsoSetConditions({
        rootState,
        commit,
        dispatch
    }, payload) {
        const id = payload.conditionalForNode._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "setConditionsEvent": [payload.dependentOnNode._id, payload.dependentOnNode.title],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            const prevLastChange = tmpDoc.lastChange || 0
            tmpDoc.lastChange = payload.timestamp

            if (tmpDoc.conditionalFor) { tmpDoc.conditionalFor.push(payload.dependentOnNode._id) } else tmpDoc.conditionalFor = [payload.dependentOnNode._id]
            dispatch('updateDoc', {
                dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
                onSuccessCallback: () => {
                    // no hist update for the dependentOnNode as the user selected the conditionalForNode at this time
                    commit('updateNodesAndCurrentDoc', { node: payload.dependentOnNode, addDependencyOn: payload.conditionalForNode._id, lastChange: Date.now() })
                    commit('updateNodesAndCurrentDoc', { node: payload.conditionalForNode, addConditionalFor: payload.dependentOnNode._id, lastChange: Date.now(), newHist })
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
                }
            })
        }).catch(error => {
            rootState.selectNodeOngoing = false
            let msg = 'alsoSetConditions: Could not read document with _id ' + id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Remove one or more dependencies from a single item and remove the corresponding conditions in other items*/
    removeDependenciesAsync({
        rootState,
        commit,
        dispatch
    }, payload) {
        console.log('removeDependenciesAsync')
        const dbName = rootState.userData.currentDb
        const id = payload._id
        globalAxios({
            method: 'GET',
            url: dbName + '/' + id,
        }).then(res => {
            let tmpDoc = res.data
            tmpDoc.dependencies = payload.newDeps
            const newHist = {
                "dependencyRemovedEvent": [payload.removedIds],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)
            if (payload.timestamp) tmpDoc.lastChange = payload.timestamp
            if (payload.undoSet) tmpDoc.lastChange = payload.undoSet.dependentOnPrevLastChange

            const toDispatch = { alsoRemoveConditions: payload }
            dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch })
        }).catch(error => {
            let msg = 'removeDependenciesAsync: Could not read document with _id ' + id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },
    /* Remove one or more conditions; called by removeDependenciesAsync only, */
    alsoRemoveConditions({
        rootState,
        dispatch
    }, payload) {
        console.log('alsoRemoveConditions')

        const docsToGet = []
        for (let id of payload.removedIds) {
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
                            if (c !== payload._id) {
                                newConditions.push(c)
                            }
                        }
                    }
                    doc.conditionalFor = newConditions
                    const newHist = {
                        "conditionRemovedEvent": [[payload._id]],
                        "sessionId": rootState.userData.sessionId,
                        "timestamp": Date.now(),
                        "distributeEvent": true
                    }
                    doc.history.unshift(newHist)
                    if (payload.timestamp) doc.lastChange = payload.timestamp
                    if (payload.undoSet) doc.lastChange = payload.undoSet.conditionalForprevLastChange
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let e of error) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'alsoRemoveConditions: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'alsoRemoveConditions: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Remove one or more conditions from a single item and remove the corresponding dependencies in other items. */
    removeConditionsAsync({
        rootState,
        dispatch
    }, payload) {
        console.log('removeConditionsAsync')
        const dbName = rootState.userData.currentDb
        const _id = payload._id
        globalAxios({
            method: 'GET',
            url: dbName + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            // update the conditions
            tmpDoc.conditionalFor = payload.newCons
            const newHist = {
                "conditionRemovedEvent": [payload.removedIds],
                "by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
            }
            tmpDoc.history.unshift(newHist)

            const toDispatch = { alsoRemoveDependenciesAsync: { ref: _id, condForDocuments: payload.removedIds } }
            dispatch('updateDoc', { dbName, updatedDoc: tmpDoc, toDispatch })
        }).catch(error => {
            let msg = 'removeConditionsAsync: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Remove the dependencies; called by removeConditionsAsync only. */
    alsoRemoveDependenciesAsync({
        rootState,
        dispatch
    }, payload) {
        console.log('alsoRemoveDependenciesAsync')
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
                    // update the dependencies
                    doc.dependencies = newDependencies
                    const newHist = {
                        "dependencyRemovedEvent": [[payload.ref]],
                        "sessionId": rootState.userData.sessionId,
                        "timestamp": Date.now(),
                        "distributeEvent": true
                    }
                    doc.history.unshift(newHist)
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let e of error) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'alsoRemoveDependenciesAsync: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'alsoRemoveDependenciesAsync: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeExtDependenciesAsync({
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
                    const newHist = {
                        "ignoreEvent": ['removeExtDependenciesAsync'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    doc.conditionalFor = newConditionalFor
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let e of error) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'removeExtDependenciesAsync: These documents cannot be updated for their set dependencies: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'removeExtDependenciesAsync: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeExtConditionsAsync({
        rootState,
        dispatch
    }, externalConditions) {
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
                    const newHist = {
                        "ignoreEvent": ['removeExtConditionsAsync'],
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    doc.dependencies = newDependencies
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
                for (let e of error) {
                    errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
                }
                let msg = 'removeExtConditionsAsync: These documents cannot be updated for their set conditions: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
        }).catch(e => {
            let msg = 'removeExtConditionsAsync: Could not read batch of documents: ' + e
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
