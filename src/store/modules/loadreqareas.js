import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

var batch = []
const INFO = 0
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const HOURINMILIS = 3600000
var parentNodes = {}

const state = {
    docsCount: 0,
    insertedCount: 0,
    orphansCount: 0,
    orphansFound: { userData: null, orphans: [] }
}

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

const actions = {
    /* Load all items from all products */
    getAllItems({
        rootState,
        state,
        commit
    }) {
        // add a reference to the userData for logging
        state.orphansFound.userData = rootState.userData
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/areaFilter',
        }).then(res => {
            batch = res.data.rows
            for (let item of batch) {
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

                state.docsCount++

                if (level === 1) {
                    // initialize with the root document
                    rootState.treeNodes = [
                        {
                            path: [0],
                            pathStr: '[0]',
                            ind: 0,
                            level,
                            productId,
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
                    state.insertedCount++
                    continue
                }

                // expand the default product up to the feature level
                const isExpanded = productId === rootState.currentDefaultProductId ? level < FEATURELEVEL : level < PRODUCTLEVEL
                // product and reqarea items cannot be dragged
                const isDraggable = productId !== 0 && level > PRODUCTLEVEL
                let lastChange
                if (history[0].resetCommentsEvent && !history[0].resetHistoryEvent) {
                    lastChange = history[0].timestamp
                } else if (history[0].resetHistoryEvent && !history[0].resetCommentsEvent) {
                    lastChange = lastComment.timestamp
                } else lastChange = history[0].timestamp > lastComment.timestamp ? history[0].timestamp : lastComment.timestamp
                // show all nodes
                const doShow = true
                if (parentNodes[parentId] !== undefined) {
                    const parentNode = parentNodes[parentId]
                    const ind = parentNode.children.length
                    const parentPath = parentNode.path
                    const path = parentPath.concat(ind)
                    const changeTimes = setChangeTimestamps(history, lastComment)

                    let newNode = {
                        path,
                        pathStr: JSON.stringify(path),
                        ind,
                        level,
                        productId,
                        parentId,
                        _id,
                        shortId: _id.slice(-5),
                        dependencies,
                        conditionalFor,
                        title,
                        isLeaf: level === FEATURELEVEL,
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
                    state.orphansFound.orphans.push({ id: _id, parentId, productId: level })
                    // eslint-disable-next-line no-console
                    console.log('getAllItems: orphan found with _id = ' + _id + ', parentId = ' + parentId + ' and productId = ' + productId)
                }
            }

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
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('All items with ' + batch.length + ' documents are loaded')
            parentNodes = {}
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('getAllItems: Could not read from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },

}

export default {
    state,
    actions
}
