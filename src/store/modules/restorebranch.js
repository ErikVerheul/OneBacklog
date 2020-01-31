import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const WARNING = 1
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var parentHistObj = {}

function composeRangeString(id) {
    return 'startkey="' + id + '"&endkey="' + id + '"'
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
        const aboutNow = Date.now()
        for (let d of docs) {
            let doc = d
            const parentNode = window.slVueTree.getNodeById(doc.parentId)
            if (parentNode) {
                // create the node
                const locationInfo = getLocationInfo(doc.priority, parentNode)
                // search history for the last changes within the last hour
                let lastStateChange = 0
                let lastContentChange = 0
                let lastCommentAddition = 0
                let lastAttachmentAddition = 0
                let lastCommentToHistory = 0
                for (let histItem of doc.history) {
                    if (aboutNow - histItem.timestamp > HOURINMILIS) {
                        // skip events longer than a hour ago
                        break
                    }
                    const keys = Object.keys(histItem)
                    // get the most recent change of state
                    if (lastStateChange === 0 && (keys.includes('setStateEvent') || keys.includes('createEvent'))) {
                        lastStateChange = histItem.timestamp
                    }
                    // get the most recent change of content
                    if (lastContentChange === 0 && (keys.includes('setTitleEvent') || keys.includes('descriptionEvent') || keys.includes('acceptanceEvent'))) {
                        lastContentChange = histItem.timestamp
                    }
                    // get the most recent addition of comments to the history
                    if (lastAttachmentAddition === 0 && keys.includes('uploadAttachmentEvent')) {
                        lastAttachmentAddition = histItem.timestamp
                    }
                    // get the most recent addition of comments to the history
                    if (lastCommentToHistory === 0 && keys.includes('commentToHistoryEvent')) {
                        lastCommentToHistory = histItem.timestamp
                    }
                }
                // get the last time a comment was added; comments have their own array
                if (doc.comments && doc.comments.length > 0) {
                    lastCommentAddition = doc.comments[0].timestamp
                }
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
                        subtype: 0,
                        priority: doc.priority,
                        inconsistentState: false,
                        team: doc.team,
                        lastStateChange,
                        lastContentChange,
                        lastCommentAddition,
                        lastAttachmentAddition,
                        lastCommentToHistory,
                        lastChange: parentHistObj.timestamp
                    }
                }
                window.slVueTree.insert({
                    nodeModel: locationInfo.prevNode,
                    placement: locationInfo.newInd === 0 ? 'inside' : 'after'
                }, [newNode], false)
                // restore external dependencies
                for (let d of parentHistObj.docRestoredEvent[2]) {
                    const node = window.slVueTree.getNodeById(d.id)
                    node.dependencies.push(d.dependentOn)
                }
                for (let c of parentHistObj.docRestoredEvent[4]) {
                    const node = window.slVueTree.getNodeById(c.id)
                    node.conditionalFor.push(c.conditionalFor)
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
            const docs = []
            for (let r of res.data.rows) {
                docs.push(r.doc)
            }
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
    }, doc) {
        parentHistObj = doc.history[0]
        dispatch('processItems', [doc])
    }
}

export default {
    actions
}
