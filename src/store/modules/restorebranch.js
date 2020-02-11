import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const WARNING = 1
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var parentHistObj
var fromHistory

function composeRangeString(id) {
    return 'startkey="' + id + '"&endkey="' + id + '"'
}

function setChangeTimestamps(doc) {
    // search history for the last changes within the last hour
    let lastPositionChange = 0
    let lastStateChange = 0
    let lastContentChange = 0
    let lastCommentAddition = 0
    let lastAttachmentAddition = 0
    let lastCommentToHistory = 0
    let nodeUndoMoveEventWasIssued = false
    for (let histItem of doc.history) {
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
    if (doc.comments && doc.comments.length > 0) {
        lastCommentAddition = doc.comments[0].timestamp
    }
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
    processItems({
        rootState,
        dispatch,
        commit
    }, docs) {
        /*
		 * When the parentNode exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the path of the location in the tree
		 * - the index in the array of siblings the node should have based on its priority
		 */
        function getLocationInfo(newPrio, parentNode) {
            let newPath = []
            if (parentNode.children && parentNode.children.length > 0) {
                let siblings = parentNode.children
                let i = 0
                while (i < siblings.length && siblings[i].data.priority > newPrio) i++
                let prevNode = null
                if (i === 0) {
                    prevNode = parentNode
                    newPath = parentNode.path.slice()
                    newPath.push(0)
                } else {
                    prevNode = siblings[i - 1]
                    newPath = prevNode.path.slice(0, -1)
                    newPath.push(i)
                }
                return {
                    prevNode: prevNode,
                    newPath: newPath,
                    newInd: i
                }
            } else {
                parentNode.children = []
                newPath = parentNode.path.slice()
                newPath.push(0)
                return {
                    prevNode: parentNode,
                    newPath: newPath,
                    newInd: 0
                }
            }
        }
        for (let d of docs) {
            let doc = d
            const parentNode = window.slVueTree.getNodeById(doc.parentId)
            if (parentNode) {
                // create the node
                const locationInfo = getLocationInfo(doc.priority, parentNode)
                const changeTimes = setChangeTimestamps(doc)
                let newNode = {
                    "path": locationInfo.newPath,
                    "pathStr": JSON.stringify(locationInfo.newPath),
                    "ind": locationInfo.newInd,
                    "level": locationInfo.newPath.length,

                    "productId": doc.productId,
                    "parentId": doc.parentId,
                    "_id": doc._id,
                    "shortId": doc.shortId,
                    "dependencies": doc.dependencies || [],
                    "conditionalFor": doc.conditionalFor || [],
                    "title": doc.title,
                    "isLeaf": (locationInfo.newPath.length < PBILEVEL) ? false : true,
                    "children": [],
                    "isSelected": false,
                    "isExpanded": doc.level < FEATURELEVEL,
                    "savedIsExpanded": doc.level < FEATURELEVEL,
                    "isSelectable": true,
                    "isDraggable": doc.level > PRODUCTLEVEL,
                    "doShow": true,
                    "savedDoShow": true,
                    "data": {
                        state: doc.state,
                        subtype: doc.subtype,
                        priority: doc.priority,
                        inconsistentState: false,
                        team: doc.team,
                        lastPositionChange: changeTimes.lastPositionChange,
                        lastStateChange: changeTimes.lastStateChange,
                        lastContentChange: changeTimes.lastContentChange,
                        lastCommentAddition: changeTimes.lastCommentAddition,
                        lastAttachmentAddition: changeTimes.lastAttachmentAddition,
                        lastCommentToHistory: changeTimes.lastCommentToHistory,
                        lastChange: Date.now()
                    }
                }
                window.slVueTree.insert({
                    nodeModel: locationInfo.prevNode,
                    placement: locationInfo.newInd === 0 ? 'inside' : 'after'
                }, [newNode], false)
                if (fromHistory) {
                    // restore external dependencies
                    for (let d of parentHistObj.docRestoredEvent[2]) {
                        const node = window.slVueTree.getNodeById(d.id)
                        if (node !== null) node.dependencies.push(d.dependentOn)
                    }
                    for (let c of parentHistObj.docRestoredEvent[4]) {
                        const node = window.slVueTree.getNodeById(c.id)
                        if (node !== null) node.conditionalFor.push(c.conditionalFor)
                    }
                }
                dispatch('getChildren', doc._id)
            } else {
                commit('showLastEvent', { txt: 'Cannot restore a removed item. Sign out and -in to see the change.', severity: WARNING })
                let msg = 'Sync.processItems: a remote restore of the tree view failed. Cannot find the parent of ' + doc.parentId
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
        }
    },

    getChildren({
        rootState,
        dispatch
    }, _id) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/parentIds?' + composeRangeString(_id) + '&include_docs=true'
        }).then(res => {
            const docs = res.data.rows.map(r => r.doc)
            if (docs.length > 0) {
                // process next level
                dispatch('processItems', docs)
            }
        }).catch(error => {
            let msg = 'Sync.getChildren: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    restoreBranch({
        dispatch
    }, payload) {
        fromHistory = payload.fromHistory
        if (fromHistory) parentHistObj = payload.doc.history[0]
        dispatch('processItems', [payload.doc])
    }
}

export default {
    actions
}
