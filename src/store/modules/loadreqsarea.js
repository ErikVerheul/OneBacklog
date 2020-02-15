import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

var batch = []
const INFO = 0
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
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
    reqAreaNodes: [],
    docsCount: 0,
    itemsCount: 0,
    orphansCount: 0,
    currentDefaultProductId: null,
    orphansFound: { userData: null, orphans: [] }
}

const mutations = {
	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the read items are linked to to their id's.
	 * The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the view but handled seperately
	 * The root and the top level product nodes are not draggable
	 */
    processAllItems(state) {
        for (let item of batch) {
            const level = item.key[1]
            // skip reqarea docs for now
            if (level === 0) continue

            state.docsCount++

            if (level === 1) {
                // initialize with the root document
                state.reqAreaNodes = [
                    {
                        "path": [0],
                        "pathStr": '[0]',
                        "ind": 0,
                        "level": 1,
                        "productId": item.key[0],
                        "parentId": null,
                        "_id": 'root',
                        "shortId": "0",
                        "dependencies": [],
                        "conditionalFor": [],
                        "title": item.value[3],
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
                            "state": item.value[2],
                            "team": item.value[4],
                            "priority": item.key[2],
                            "lastChange": 0
                        }
                    },
                ]
                parentNodes.root = state.reqAreaNodes[0]
                state.itemsCount++
                continue
            }

            const parentId = item.value[1]
            // expand the tree up to the feature level
            let isExpanded = level < FEATURELEVEL
            // select the default product
            const isSelected = item.id === state.currentDefaultProductId
            const isDraggable = level > PRODUCTLEVEL
            // show all nodes
            const doShow = true
            if (level === 0 || parentNodes[parentId] !== undefined) {
                // console.log('processAllItems: title = ' + item.value[3])
                const parentNode = parentNodes[parentId]
                const ind = parentNode.children.length
                const parentPath = parentNode.path
                const path = parentPath.concat(ind)
                const changeTimes = setChangeTimestamps(item.value[8], item.value[9])

                let newNode = {
                    path,
                    pathStr: JSON.stringify(path),
                    ind,
                    level,
                    productId: item.key[0],
                    parentId,
                    _id: item.id,
                    shortId: item.id.slice(-5),
                    dependencies: item.value[6] || [],
                    conditionalFor: item.value[7] || [],
                    title: item.value[3],
                    isLeaf: level === FEATURELEVEL,
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
                        lastChange: 0
                    }
                }

                state.itemsCount++
                parentNode.children.push(newNode)
                parentNodes[item.id] = newNode
            } else {
                state.orphansCount++
                state.orphansFound.orphans.push({ id: item.id, parentId, productId: item.key[0] })
                // eslint-disable-next-line no-console
                console.log('processAllItems: orphan found with _id = ' + item.id + ', parentId = ' + parentId + ' and productId = ' + item.key[0])
            }

        }
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
            commit('processAllItems')
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
            if (rootState.debug) console.log('All items with ' + batch.length + ' documents are loaded')
            parentNodes = {}
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('getAllItems: Could not read from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },

}

export default {
    state,
    mutations,
    actions
}
