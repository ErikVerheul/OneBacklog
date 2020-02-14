import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

// import router from '../../router'

var batch = []
const INFO = 0
const WARNING = 1
const ERROR = 2
const AREALEVEL = 0
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var parentNodes = {}

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

const state = {
    treeNodes: [],
    docsCount: 0,
    itemsCount: 0,
    orphansCount: 0,
    currentDefaultProductId: null,
    currentProductId: null,
    productIdLoading: null,
    processedProducts: 0,
    currentProductTitle: "",
    rangeString: '',
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
        for (let b of batch) {
            let doc = b.doc
            state.docsCount++
            // load the items of the products the user is authorized to
            const level = doc.level
            const parentId = doc.parentId
            // expand the tree up to the feature level
            let isExpanded = doc.level < FEATURELEVEL
            // select the default product
            const isSelected = doc._id === state.currentDefaultProductId
            const isDraggable = level > PRODUCTLEVEL
            // show the product level nodes and all nodes of the current default product
            const doShow = doc.level <= PRODUCTLEVEL || doc.productId === state.currentDefaultProductId
            if (doc.productId !== state.currentDefaultProductId && doc.level === PRODUCTLEVEL) isExpanded = false
            if (parentNodes[parentId] !== undefined) {
                const parentNode = parentNodes[parentId]
                const ind = parentNode.children.length
                const parentPath = parentNode.path
                const path = parentPath.concat(ind)
                const changeTimes = setChangeTimestamps(doc)

                let newNode = {
                    path,
                    pathStr: JSON.stringify(path),
                    ind,
                    level: path.length,
                    productId: doc.productId,
                    parentId,
                    _id: doc._id,
                    shortId: doc.shortId,
                    dependencies: doc.dependencies || [],
                    conditionalFor: doc.conditionalFor || [],
                    title: doc.title,
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
                        priority: doc.priority,
                        state: doc.state,
                        inconsistentState: false,
                        team: doc.team,
                        lastPositionChange: changeTimes.lastPositionChange,
                        lastStateChange: changeTimes.lastStateChange,
                        lastContentChange: changeTimes.lastContentChange,
                        lastCommentAddition: changeTimes.lastCommentAddition,
                        lastAttachmentAddition: changeTimes.lastAttachmentAddition,
                        lastCommentToHistory: changeTimes.lastCommentToHistory,
                        subtype: doc.subtype,
                        lastChange: 0
                    }
                }

                state.itemsCount++

                parentNode.children.push(newNode)
                parentNodes[doc._id] = newNode
            } else {
                state.orphansCount++
                state.orphansFound.orphans.push({ id: doc._id, parentId, productId: doc.productId })
                // eslint-disable-next-line no-console
                console.log('processAllItems: orphan found with _id = ' + doc._id + ', parentId = ' + parentId + ' and productId = ' + doc.productId)
            }

        }
        state.processedProducts++
    }
}

const actions = {
    /* Get the root of the backlog items */
    getRoot({
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
            state.treeNodes = [
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
            parentNodes.root = state.treeNodes[0]
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
            console.log('getAllItems: ' + batch)
            // commit('processAllItems')
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
            // router.push('/product')
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
