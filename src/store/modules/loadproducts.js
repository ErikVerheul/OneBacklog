import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

var batch = []
const INFO = 0
const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var parentNodes = {}

function setChangeTimestamps(history, lastComment) {
    // search history for the last changes within the last hour
    let lastPositionChange = 0
    let lastStateChange = 0
    let lastContentChange = 0
    let lastCommentAddition = 0
    let lastAttachmentAddition = 0
    let lastCommentToHistory = 0
    let nodeUndoMoveEventWasIssued = false
    for (let histItem of history) {
        if (Date.now() - histItem.timestamp > HOURINMILIS) {
            // skip events longer than a hour ago
            break
        }
        const event = Object.keys(histItem)[0]
        // get the most recent change of position
        if (lastPositionChange === 0 && event === 'nodeDroppedEvent') {
            if (!nodeUndoMoveEventWasIssued) {
                lastPositionChange = histItem.timestamp
                nodeUndoMoveEventWasIssued = false
            } else {
                lastPositionChange = 0
            }
        }
        // reset the timestamp when undoing the change of position
        if (event === 'nodeUndoMoveEvent') {
            nodeUndoMoveEventWasIssued = true
        }
        // get the most recent change of state
        if (lastStateChange === 0 && (event === 'setStateEvent') || event === 'createEvent') {
            lastStateChange = histItem.timestamp
        }
        // get the most recent change of content
        if (lastContentChange === 0 && (event === 'setTitleEvent') || event === 'descriptionEvent' || event === 'acceptanceEvent') {
            lastContentChange = histItem.timestamp
        }
        // get the most recent addition of comments to the history
        if (lastAttachmentAddition === 0 && event === 'uploadAttachmentEvent') {
            lastAttachmentAddition = histItem.timestamp
        }
        // get the most recent addition of comments to the history
        if (lastCommentToHistory === 0 && event === 'commentToHistoryEvent') {
            lastCommentToHistory = histItem.timestamp
        }
    }
    // get the last time a comment was added; comments have their own array
    lastCommentAddition = lastComment.timestamp
    return {
        lastPositionChange,
        lastStateChange,
        lastContentChange,
        lastCommentAddition,
        lastAttachmentAddition,
        lastCommentToHistory
    }
}

const state = {
    rangeString: '',
    productIdLoading: null,
    processedProducts: 0,

    docsCount: 0,
    itemsCount: 0,
    orphansCount: 0,
    orphansFound: { userData: null, orphans: [] }
}

const mutations = {
    composeRangeString(state) {
        state.rangeString = 'startkey=["' + state.productIdLoading + '",0]&endkey=["' + state.productIdLoading + '",' + (PBILEVEL + 1) + ']'
    },

	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view
	 * The root and the top level product nodes are not draggable
	 */
    processProduct(state, userAssignedProductIds, currentDefaultProductId) {
        for (let item of batch) {
            const productId = item.key[0]
            const level = item.key[1]
            const history = item.value[8]
            const lastComment = item.value[9]
            state.docsCount++
            // load the items of the products the user is authorized to
            if (userAssignedProductIds.includes(productId)) {
                const parentId = item.value[1]
                // expand the tree up to the feature level
                let isExpanded = level < FEATURELEVEL
                // select the default product
                const isSelected = item.id === currentDefaultProductId
                const isDraggable = level > PRODUCTLEVEL
                // show the product level nodes and all nodes of the current default product
                const doShow = level <= PRODUCTLEVEL || productId === currentDefaultProductId
                if (productId !== currentDefaultProductId && level === PRODUCTLEVEL) isExpanded = false
                if (parentNodes[parentId] !== undefined) {
                    const parentNode = parentNodes[parentId]
                    const ind = parentNode.children.length
                    const parentPath = parentNode.path
                    const path = parentPath.concat(ind)
                    const changeTimes = setChangeTimestamps(history, lastComment)
                    let lastChange

                    if (history[0].resetCommentsEvent && !history[0].resetHistoryEvent) {
                        lastChange = history[0].timestamp
                    } else if (history[0].resetHistoryEvent && !history[0].resetCommentsEvent) {
                        lastChange = lastComment.timestamp
                    } else lastChange = history[0].timestamp > lastComment.timestamp ? history[0].timestamp : lastComment.timestamp

                    let newNode = {
                        path,
                        pathStr: JSON.stringify(path),
                        ind,
                        level: path.length,
                        productId: productId,
                        parentId,
                        _id: item.id,
                        shortId: item.id.slice(-5),
                        dependencies: item.value[6] || [],
                        conditionalFor: item.value[7] || [],
                        title: item.value[3],
                        isLeaf: level === PBILEVEL,
                        children: [],
                        isExpanded,
                        savedIsExpanded: isExpanded,
                        isSelectable: true,
                        isDraggable,
                        isSelected,
                        doShow,
                        savedDoShow: doShow,
                        data: {
                            priority: item.key[2],
                            state: item.value[2],
                            inconsistentState: false,
                            team: item.value[4],
                            lastPositionChange: changeTimes.lastPositionChange,
                            lastStateChange: changeTimes.lastStateChange,
                            lastContentChange: changeTimes.lastContentChange,
                            lastCommentAddition: changeTimes.lastCommentAddition,
                            lastAttachmentAddition: changeTimes.lastAttachmentAddition,
                            lastCommentToHistory: changeTimes.lastCommentToHistory,
                            subtype: item.value[5],
                            lastChange
                        }
                    }

                    state.itemsCount++

                    parentNode.children.push(newNode)
                    parentNodes[item.id] = newNode
                } else {
                    state.orphansCount++
                    state.orphansFound.orphans.push({ id: item.id, parentId, productId: productId })
                    // eslint-disable-next-line no-console
                    console.log('processProduct: orphan found with _id = ' + item.id + ', parentId = ' + parentId + ' and productId = ' + productId)
                }
            }
        }
        state.processedProducts++
    }
}

const actions = {
    /* Set the root of the backlog items */
    setRoot({
        rootState,
        dispatch,
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/root',
        }).then(res => {
            rootState.currentDoc = res.data
            // decode from base64 + replace the encoded data
            rootState.currentDoc.description = window.atob(res.data.description)
            rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
            // prepare for loading the first batch; create the root node
            rootState.treeNodes = [
                {
                    "path": [0],
                    "pathStr": '[0]',
                    "ind": 0,
                    "level": 1,
                    "productId": res.data._id,
                    "parentId": null,
                    "_id": 'root',
                    "shortId": "0",
                    "dependencies": [],
                    "conditionalFor": [],
                    "title": res.data.title,
                    "isLeaf": false,
                    "children": [],
                    "isExpanded": true,
                    "savedIsExpanded": true,
                    "isSelectable": true,
                    "isDraggable": false,
                    "isSelected": false,
                    "doShow": true,
                    "savedDoShow": true,
                    "data": {
                        "state": res.data.state,
                        "team": res.data.team,
                        "priority": res.data.priority,
                        "lastChange": 0
                    }
                },
            ]
            parentNodes.root = rootState.treeNodes[0]
            // load the current product document
            dispatch('loadCurrentProduct')
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log("The root document is read")
        }).catch(error => {
            let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
            if (error.response.status === 404) {
                msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Load current user product and start loading the tree */
    loadCurrentProduct({
        rootState,
        state,
        commit,
        dispatch
    }) {
        let _id = rootState.currentDefaultProductId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            rootState.currentProductId = _id
            rootState.currentProductTitle = res.data.title
            rootState.currentDoc = res.data
            // decode from base64 + replace the encoded data
            rootState.currentDoc.description = window.atob(res.data.description)
            rootState.currentDoc.acceptanceCriteria = window.atob(res.data.acceptanceCriteria)
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('loadCurrentProduct: product document with _id ' + _id + ' is loaded from database ' + rootState.userData.currentDb)

            state.productIdLoading = _id
            // set the range of the documents to load
            commit('composeRangeString')
            dispatch('getFirstProduct')
        }).catch(error => {
            let msg = `loadCurrentProduct: Could not read current product document with id ${_id} from database ${rootState.userData.currentDb}`
            if (!error.response || error.response.status === 404) {
                msg += `, is your default product deleted?`
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Load the current product first */
    getFirstProduct({
        rootState,
        state,
        commit,
        dispatch
    }) {
        // add a reference to the userData for logging
        state.orphansFound.userData = rootState.userData
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/allItemsFilter?' + state.rangeString,
        }).then(res => {
            batch = res.data.rows
            commit('processProduct', rootState.userData.userAssignedProductIds, rootState.currentDefaultProductId)
            commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
            // log any detected orphans if present
            if (state.orphansFound.orphans.length > 0) {
                for (let o of state.orphansFound.orphans) {
                    const msg = 'Orphan found with Id = ' + o.id + ', parentId = ' + o.parentId + ' and  productId = ' + o.productId
                    let newLog = {
                        "event": msg,
                        "level": "CRITICAL",
                        "by": state.orphansFound.userData.user,
                        "timestamp": Date.now(),
                        "timestampStr": new Date().toString()
                    }
                    rootState.logState.unsavedLogs.push(newLog)
                }
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('Current product with ' + batch.length + ' documents is loaded')
            // process other products here
            if (rootState.userData.myProductSubscriptions.length > 1 && state.processedProducts < rootState.userData.myProductSubscriptions.length) {
                state.productIdLoading = rootState.userData.myProductSubscriptions[state.processedProducts]
                commit('composeRangeString')
                dispatch('getNextProduct')
            } else {
                // current product is read, there are no other products; do not start listenForChanges again after sign-out/in
                if (!rootState.listenForChangesRunning) {
                    dispatch('listenForChanges')
                    // eslint-disable-next-line no-console
                    if (rootState.debug) console.log('getFirstProduct: listenForChanges started')
                }
                // reset load parameters
                parentNodes = {}
            }
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('getFirstProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },

    /* Load next products from the database */
    getNextProduct({
        rootState,
        state,
        commit,
        dispatch
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/allItemsFilter?' + state.rangeString,
        }).then(res => {
            batch = res.data.rows
            commit('processProduct', rootState.userData.userAssignedProductIds, rootState.currentDefaultProductId)
            commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
            // log any detected orphans if present
            if (state.orphansFound.orphans.length > 0) {
                for (let o of state.orphansFound.orphans) {
                    const msg = 'Orphan found with Id = ' + o.id + ', parentId = ' + o.parentId + ' and  productId = ' + o.productId
                    let newLog = {
                        "event": msg,
                        "level": "CRITICAL",
                        "by": state.orphansFound.userData.user,
                        "timestamp": Date.now(),
                        "timestampStr": new Date().toString()
                    }
                    rootState.logState.unsavedLogs.push(newLog)
                }
            }
            // process other products here
            if (rootState.userData.myProductSubscriptions.length > 1 && state.processedProducts < rootState.userData.myProductSubscriptions.length) {
                state.productIdLoading = rootState.userData.myProductSubscriptions[state.processedProducts]
                commit('composeRangeString')
                dispatch('getNextProduct')
            } else {
                // do not start again after sign-out/in
                if (!rootState.listenForChangesRunning) {
                    dispatch('listenForChanges')
                    // eslint-disable-next-line no-console
                    if (rootState.debug) console.log('getNextProduct: listenForChanges started')
                }
                // reset load parameters
                parentNodes = {}
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('Another product of ' + batch.length + ' documents is loaded')
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('getNextProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },

}

export default {
    state,
    mutations,
    actions
}
