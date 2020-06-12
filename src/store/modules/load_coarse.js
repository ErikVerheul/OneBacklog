import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const HOURINMILIS = 3600000
const AREA_PRODUCTID = '0'
var parentNodes = {}
var orphansFound = []
var levelErrorsFound = []

const state = {
    docsCount: 0,
    insertedCount: 0,
    orphansCount: 0,
    levelErrorCount: 0
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
        if (lastPositionChange === 0 && event === 'nodeMovedEvent') {
            if (!nodeUndoMoveEventWasIssued) {
                lastPositionChange = histItem.timestamp
                nodeUndoMoveEventWasIssued = false
            } else {
                lastPositionChange = 0
            }
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
    loadOverview({
        rootState,
        state,
        commit
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/areaFilter',
        }).then(res => {
            rootState.lastTreeView = 'coarseProduct'
            rootState.loadedTreeDepth = FEATURELEVEL
            rootState.loadedSprintId = null
            const batch = res.data.rows
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

                if (level === 1) {
                    state.docsCount++
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
                            shortId: _id.slice(-5),
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

                // skip products not assigned to the user
                if (productId !== AREA_PRODUCTID && !rootState.userData.userAssignedProductIds.includes(productId)) continue

                state.docsCount++
                // expand the default product up to the feature level
                const isExpanded = productId === rootState.currentDefaultProductId ? level < FEATURELEVEL : level < PRODUCTLEVEL
                // products cannot be dragged
                const isDraggable = level > PRODUCTLEVEL
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

                    // check for level error
                    if (level !== path.length) {
                        state.levelErrorCount++
                        levelErrorsFound.push({ id: _id, parentId, productId, dbLevel: level, pathLength: path.length })
                    }
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

                    if (_id === rootState.currentDefaultProductId) {
                        rootState.selectedNodes = [newNode]
                    }

                    parentNode.children.push(newNode)
                    parentNodes[_id] = newNode
                } else {
                    state.orphansCount++
                    orphansFound.push({ id: _id, parentId, productId: level })
                }
            }

            commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.insertedCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: INFO })
            // log any detected orphans, if present
            if (state.orphansCount > 0) {
                for (let o of orphansFound) {
                    const msg = `Orphan found with Id = ${o.id}, parentId = ${o.parentId} and productId = ${o.productId}`
                    // eslint-disable-next-line no-console
                    console.log('processProduct: ' + msg)
                    let newLog = {
                        event: msg,
                        level: 'CRITICAL',
                        by: rootState.userData.user,
                        timestamp: Date.now(),
                        timestampStr: new Date().toString()
                    }
                    rootState.logState.unsavedLogs.push(newLog)
                }
            }
            // log any detected level errors, if present
            if (state.levelErrorCount > 0) {
                for (let l of levelErrorsFound) {
                    const msg1 = `Level error found with Id = ${l.id}, parentId = ${l.parentId} and productId = ${l.productId}.`
                    const msg2 = `The level read in the document is ${l.dbLevel}. According to the read parent the level should be ${l.pathLength}.`
                    // eslint-disable-next-line no-console
                    console.log('processProduct: ' + msg1 + '\n' + msg2)
                    let newLog = {
                        event: msg1 + ' ' + msg2,
                        level: 'CRITICAL',
                        by: rootState.userData.user,
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
            .catch(error => console.log('loadOverview: Could not read from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },

}

export default {
    state,
    actions
}
