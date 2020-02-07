import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const PRODUCTLEVEL = 2

// returns a new array
function removeFromArray(arr, item) {
	const newArr = []
	for (let el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

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
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
                let msg = 'removeDependencies: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeDependencies' })
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
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    docs.push(doc)
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
            }
            if (error.length > 0) {
                let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
                let msg = 'removeConditions: These documents cannot be updated: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeConditions' })
        }).catch(error => {
            let msg = 'removeConditions: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /*
    * ToDo: create undo's if any of these steps fail
    * Order of execution:
    * 1. add history to grandparent of the descendants. ToDo: update history if removal fails,
    * 2. remove descendants,
    * 3. remove parent (declare the removal as completed when this update has finished), dependencies and conditions in parallel.
    *  If any of these steps fail the next steps are not executed but not undone
    */

    /* Add history to the parent of the removed node */
    registerHistInGrandParent({
        rootState,
        dispatch
    }, payload) {
        rootState.busyRemoving = true
        const _id = payload.node.parentId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removedFromParentEvent": [payload.node.level, payload.node.title, payload.descendantsIds.length, payload.node.data.subtype, payload.extDepsCount, payload.extCondsCount],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": false
            }
            tmpDoc.history.unshift(newHist)
            const toDispatch = {
                removeDescendents: payload
            }
            dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, toDispatch, caller: 'registerHistInGrandParent' })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'registerHistInGrandParent: Could not read document with _id ' + _id + ', ' + error
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
        for (let d of payload.descendantsIds) {
            docsToGet.push({ "id": d })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('removeDescendents: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const docs = []
            const error = []
            const externalDependencies = []
            const externalConditions = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "docRemovedDescendantEvent": [payload.node.level, payload.node.data.subtype, payload.node.title],
                        "by": rootState.userData.user,
                        "email": rootState.userData.email,
                        "timestamp": Date.now(),
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    // mark for removal
                    doc.delmark = true
                    docs.push(doc)
                    // find external dependencies (to or from items outside the range if this bulk) for removal; leave internal dependencies as is
                    let thisNodesExtDependencies = { id: doc._id, dependencies: [] }
                    if (doc.dependencies) {
                        const internalDependencies = []
                        for (let d of doc.dependencies) {
                            if (payload.descendantsIds.includes(d)) {
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
                            if (payload.descendantsIds.includes(c)) {
                                internalConditions.push(c)
                            } else {
                                thisNodesExtConditions.conditions.push(c)
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
                let errorStr = ''
				for (let e of error) {
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
                let msg = 'removeDescendents: These documents cannot be marked for removal: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            // add externalDependencies and externalConditions to the payload
            payload.extDepsCount = externalDependencies.length
            payload.extCondsCount = externalConditions.length

            // transfer these calls to updateBulk so that they are executed after successful removal only
            const toDispatch = {
                removeParent: payload
            }
            if (externalDependencies.length > 0) {
                // remove the conditions in the documents not removed which match the externalDependencies
                toDispatch.removeExtDependencies = externalDependencies
            }
            if (externalConditions.length > 0) {
                // remove the dependencies in the documents not removed which match the externalConditions
                toDispatch.removeExtConditions = externalConditions
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch, caller: 'removeDescendents' })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeDescendents: Could not read batch of documents: ' + error
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
                "removeParentEvent": [payload.productId, payload.descendantsIds, payload.extDepsCount, payload.extCondsCount],
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
                    rootState.userData.myProductSubscriptions = removeFromArray(rootState.userData.myProductSubscriptions, _id)
                    rootState.userData.userAssignedProductIds = removeFromArray(rootState.userData.userAssignedProductIds, _id)
                    const removeIdx = rootState.myProductOptions.map(item => item.value).indexOf(_id)
                    rootState.myProductOptions.splice(removeIdx, 1)
                }
            }
            // declare the removal as completed when this update has finished (successful or not)
            dispatch('updateDoc', {
                dbName: rootState.userData.currentDb,
                updatedDoc: tmpDoc,
                onSuccessCallback: function() { rootState.busyRemoving = false },
                onFailureCallback: function() { rootState.busyRemoving = false }
            })
        }).catch(error => {
            let msg = 'removeParent: Could not read document with _id ' + _id + ',' + error
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
                    const newHist = {
                        "ignoreEvent": ['removeExtDependencies'],
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
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
                let msg = 'removeExtDependencies: These documents cannot be updated for their set dependencies: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeExtDependencies' })
        }).catch(error => {
            let msg = 'removeExtDependencies: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeExtConditions({
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
                        "ignoreEvent": ['removeExtConditions'],
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
					errorStr.concat(errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), '))
				}
                let msg = 'removeExtConditions: These documents cannot be updated for their set conditions: ' + errorStr
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeExtConditions' })
        }).catch(error => {
            let msg = 'removeExtConditions: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
