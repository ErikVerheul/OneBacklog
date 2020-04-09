import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const TASKLEVEL = 6
const HOURINMILIS = 3600000
const AREA_PRODUCTID = '0'
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
    docsCount: 0,
    insertedCount: 0,
    orphansCount: 0,
    orphansFound: { userData: null, orphans: [] }
}

const mutations = {
	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view
	 * The root and the top level product nodes are not draggable
	 */
    processProduct(state, payload) {
        const rootState = payload.rootState
        for (let item of payload.batch) {
            const _id = item.id
            const productId = item.key[0]
            const level = item.key[1]
            const priority = -item.key[2]
            const parentId = item.value[1]
            const reqarea = item.value[0] || null
            const itemState = item.value[2]
            const title = item.value[3]
            const team = item.value[4]
            const subtype = item.value[5]
            const dependencies = item.value[6] || []
            const conditionalFor = item.value[7] || []
            const history = item.value[8]
            const lastComment = item.value[9]
            const reqAreaItemcolor = item.value[10] || null
            const sprintId = item.value[11]
            // initialize with the root document
            if (level === 1) {
                rootState.treeNodes = [
                    {
                        path: [0],
                        pathStr: '[0]',
                        ind: 0,
                        level,
                        productId: null,
                        parentId: null,
                        _id,
                        shortId: 0,
                        dependencies,
                        conditionalFor,
                        title,
                        isLeaf: false,
                        children: [],
                        isExpanded: true,
                        savedIsExpanded: true,
                        isSelectable: true,
                        isDraggable: false,
                        isSelected: false,
                        doShow: true,
                        savedDoShow: true,
                        data: {
                            state: itemState,
                            team,
                            priority,
                            lastChange: 0
                        }
                    },
                ]
                parentNodes.root = rootState.treeNodes[0]
                state.docsCount++
                state.insertedCount++
                continue
            }
            // create req areas to title mapper and req areas to color mapper
            if (productId === AREA_PRODUCTID) {
                if (level === 3) {
                    rootState.reqAreaMapper[_id] = title
                    rootState.colorMapper[_id] = { reqAreaItemcolor }
                }
                continue
            }
            // skip the items of the products the user is not authorized to
            if (!rootState.userData.userAssignedProductIds.includes(productId)) continue

            // skip the items of the products the user is not subscribed to
            if (!rootState.userData.myProductSubscriptions.includes(productId)) continue

            state.docsCount++

            // expand the default product up to the feature level
            const isExpanded = productId === rootState.currentDefaultProductId ? level < FEATURELEVEL : level < PRODUCTLEVEL
            // select the default product
            const isDraggable = level > PRODUCTLEVEL
            // show the product level nodes and all nodes of the current default product
            const doShow = level <= PRODUCTLEVEL || productId === rootState.currentDefaultProductId
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
                    productId,
                    parentId,
                    sprintId,
                    _id,
                    shortId: _id.slice(-5),
                    dependencies,
                    conditionalFor,
                    title,
                    isLeaf: level === TASKLEVEL,
                    children: [],
                    isExpanded,
                    savedIsExpanded: isExpanded,
                    isSelectable: true,
                    isDraggable,
                    isSelected: _id === rootState.currentDefaultProductId,
                    doShow,
                    savedDoShow: doShow,
                    data: {
                        priority,
                        state: itemState,
                        reqarea,
                        reqAreaItemcolor,
                        team,
                        lastPositionChange: changeTimes.lastPositionChange,
                        lastStateChange: changeTimes.lastStateChange,
                        lastContentChange: changeTimes.lastContentChange,
                        lastCommentAddition: changeTimes.lastCommentAddition,
                        lastAttachmentAddition: changeTimes.lastAttachmentAddition,
                        lastCommentToHistory: changeTimes.lastCommentToHistory,
                        subtype,
                        lastChange
                    }
                }

                state.insertedCount++

                parentNode.children.push(newNode)
                parentNodes[_id] = newNode
                if (_id === rootState.currentDefaultProductId) {
                    rootState.nodeSelected = newNode
                    // must set last selected node as this node is selected programmatically
                    window.slVueTree.setLastSelectedNode(newNode)
                }
            } else {
                state.orphansCount++
                state.orphansFound.orphans.push({ id: _id, parentId, productId: productId })
                // eslint-disable-next-line no-console
                console.log('processProduct: orphan found with _id = ' + _id + ', parentId = ' + parentId + ' and productId = ' + productId)
            }

        }
    }
}

const actions = {
    /* Load current default user product and start loading the tree */
    loadCurrentProduct({
        rootState,
        commit,
        dispatch
    }) {
        const _id = rootState.currentDefaultProductId
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            rootState.currentProductId = _id
            rootState.currentProductTitle = res.data.title
            commit('updateCurrentDoc', { newDoc: res.data })
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('loadCurrentProduct: product document with _id ' + _id + ' is loaded from database ' + rootState.userData.currentDb)
            dispatch('loadAllProducts')
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
    loadAllProducts({
        rootState,
        state,
        commit,
        dispatch
    }) {
        // add a reference to the userData for logging
        state.orphansFound.userData = rootState.userData
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/allItemsFilter',
        }).then(res => {
            commit('processProduct', { rootState, batch: res.data.rows })
            commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.insertedCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
            // log any detected orphans if present
            if (state.orphansFound.orphans.length > 0) {
                for (let o of state.orphansFound.orphans) {
                    const msg = 'Orphan found with Id = ' + o.id + ', parentId = ' + o.parentId + ' and  productId = ' + o.productId
                    let newLog = {
                        event: msg,
                        level: 'CRITICAL',
                        by: state.orphansFound.userData.user,
                        timestamp: Date.now(),
                        timestampStr: new Date().toString()
                    }
                    rootState.logState.unsavedLogs.push(newLog)
                }
            }
            // all products are read; do not start listenForChanges again after sign-out/in
            if (!rootState.listenForChangesRunning) {
                dispatch('listenForChanges')
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log('loadAllProducts: listenForChanges started')
            }
            // reset load parameters
            parentNodes = {}
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('loadAllProducts: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error))
    }
}

export default {
    state,
    mutations,
    actions
}
