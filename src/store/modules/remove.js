import globalAxios from 'axios'

const ERROR = 2
const PRODUCTLEVEL = 2

const actions = {
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
            data: { "docs": docsToGet },
        }).then(res => {
            // console.log('removeDescendantsBulk: res = ' + JSON.stringify(res, null, 2))
            const results = res.data.results
            const ok = []
            const error = []
            const externalDependencies = {}
            const externalConditions = {}
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newHist = {
                        "docRemovedEvent": [payload.node.title],
                        "by": rootState.userData.user,
                        "email": rootState.userData.email,
                        "timestamp": Date.now(),
                        "sessionId": rootState.userData.sessionId,
                        "distributeEvent": false
                    }
                    doc.history.unshift(newHist)
                    // mark for removal
                    doc.delmark = true
                    ok.push(doc)
                    // find external dependencies (to or from items outside the range if this bulk) for removal; leave internal dependencies as is
                    // note that the external dependencies will be lost after an undo
                    if (doc.dependencies) {
                        const internalDependencies = []
                        for (let d of doc.dependencies) {
                            if (docsToGet.includes(d)) {
                                internalDependencies.push(d)
                            } else externalDependencies[d] = doc._id
                        }
                        doc.dependencies = internalDependencies
                    }
                    if (doc.conditionalFor) {
                        const internalConditions = []
                        for (let c of doc.conditionalFor) {
                            if (docsToGet.includes(c)) {
                                internalConditions.push(c)
                            } else externalConditions[c] = doc._id
                        }
                        doc.conditionalFor = internalConditions
                    }
                }
                if (r.docs[0].error) error.push(r.docs[0].error)
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
            if (Object.keys(externalDependencies).length > 0) dispatch('removeDependencies', externalDependencies)
            if (Object.keys(externalConditions).length > 0) dispatch('removeConditions', externalConditions)
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
        }).catch(error => {
            rootState.busyRemoving = false
            let msg = 'removeDescendantsBulk: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeDependencies({
        rootState,
        dispatch
    }, externalDependencies) {
        const docsToGet = []
        for (let id of Object.keys(externalDependencies)) {
            docsToGet.push({ "id": id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const ok = []
            const error = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newConditions = []
                    if (doc.conditionalFor) {
                        for (let c of doc.conditionalFor) {
                            if (externalDependencies[c] && externalDependencies[c] !== doc._id) {
                                newConditions.push(c)
                            }
                        }
                    }
                    doc.conditionalFor = newConditions
                    ok.push(doc)
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
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
        }).catch(error => {
            let msg = 'removeDependencies: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeConditions({
        rootState,
        dispatch
    }, externalConditions) {
        const docsToGet = []
        for (let id of Object.keys(externalConditions)) {
            docsToGet.push({ "id": id })
        }
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_get',
            data: { "docs": docsToGet },
        }).then(res => {
            const results = res.data.results
            const ok = []
            const error = []
            for (let r of results) {
                const doc = r.docs[0].ok
                if (doc) {
                    const newDependencies = []
                    if (doc.dependencies) {
                        for (let d of doc.dependencies) {
                            if (externalConditions[d] && externalConditions[d] !== doc._id) {
                                newDependencies.push(d)
                            }
                        }
                    }
                    doc.dependencies = newDependencies
                    ok.push(doc)
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
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: ok })
        }).catch(error => {
            let msg = 'removeConditions: Could not read batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    removeDoc({
		rootState,
		dispatch
	}, payload) {
		rootState.busyRemoving = true
		const _id = payload.node._id
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			const newHist = {
				"docRemovedEvent": [payload.descendants.length],
				"by": rootState.userData.user,
				"email": rootState.userData.email,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.delmark = true
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
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
			dispatch('registerRemoveHistInParent', payload)
		}).catch(error => {
			let msg = 'removeDoc: Could not read document with _id ' + _id + ',' + error
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
        }).then(res => {
            let tmpDoc = res.data
            const newHist = {
                "removedFromParentEvent": [payload.node.level, payload.node.title, payload.descendants.length],
                "by": rootState.userData.user,
                "email": rootState.userData.email,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
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
    }
}

export default {
    actions
}
