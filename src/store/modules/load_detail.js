import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const TASKLEVEL = 6
const AREA_PRODUCTID = 'requirement-areas'
var parentNodes = {}
var orphansFound = []
var levelErrorsFound = []

const state = {
    docsCount: 0,
    insertedCount: 0,
    orphansCount: 0,
    levelErrorCount: 0
}

const mutations = {
	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In parentNodes the created tree nodes are mapped to to their id's.
	 * The map is used to insert siblings to their parent. The CouchDb design filter sort order guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view.
	 * The root and the top level product nodes are not draggable.
	 */
    processProduct(state, payload) {
        const rootState = payload.rootState
        for (let item of payload.batch) {
            const _id = item.id
            const productId = item.key[0]
            const level = item.key[1]
            // negate the priority
            const priority = -item.key[2]
            const parentId = item.value[1]
            const reqarea = item.value[0] || null
            const itemState = item.value[2]
            const title = item.value[3]
            const team = item.value[4]
            const subtype = item.value[5]
            const dependencies = item.value[6] || []
            const conditionalFor = item.value[7] || []
            // for future use:
            // const lastHistoryEntry = item.value[8]
            // const lastCommentEntry = item.value[9]
            const reqAreaItemcolor = item.value[10] || null
            const sprintId = item.value[11]
            const lastAttachmentAddition = item.value[12] || 0
            const lastChange = item.value[13] || 0
            const lastCommentAddition = item.value[14] || 0
            const lastCommentToHistory = item.value[15] || 0
            const lastContentChange = item.value[16] || 0
            const lastPositionChange = item.value[17] || 0
            const lastStateChange = item.value[18] || 0

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
            const isDraggable = level > PRODUCTLEVEL
            // show the product level nodes and all nodes of the current default product
            const doShow = level <= PRODUCTLEVEL || productId === rootState.currentDefaultProductId
            if (parentNodes[parentId] !== undefined) {
                const parentNode = parentNodes[parentId]
                const ind = parentNode.children.length
                const parentPath = parentNode.path
                const path = parentPath.concat(ind)
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
                        lastAttachmentAddition,
                        lastChange,
                        lastCommentAddition,
                        lastCommentToHistory,
                        lastContentChange,
                        lastPositionChange,
                        lastStateChange,
                        priority,
                        reqarea,
                        reqAreaItemcolor,
                        sprintId,
                        state: itemState,
                        subtype,
                        team
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
                orphansFound.push({ id: _id, parentId, productId })
            }
        }
    }
}

const actions = {
    /* Load current default user product and start loading the tree */
    loadProductDetails({
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
            commit('updateNodesAndCurrentDoc', { newDoc: res.data })
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('loadProductDetails: product document with _id ' + _id + ' is loaded from database ' + rootState.userData.currentDb)
            dispatch('loadAssignedAndSubscribed')
        }).catch(error => {
            let msg = `loadProductDetails: Could not read current product document with id ${_id} from database ${rootState.userData.currentDb}`
            if (error.response && error.response.status === 404) {
                msg += `, is your default product deleted?`
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Load the current product first */
    loadAssignedAndSubscribed({
        rootState,
        state,
        commit,
        dispatch
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/details'
        }).then(res => {
            rootState.lastTreeView = 'detailProduct'
            rootState.loadedTreeDepth = TASKLEVEL
            rootState.loadedSprintId = null
            commit('processProduct', { rootState, batch: res.data.rows })
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
            // all products are read; do not start listenForChanges again after sign-out/in
            if (!rootState.stopListenForChanges && !rootState.listenForChangesRunning) {
                dispatch('listenForChanges')
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log('loadAssignedAndSubscribed: listenForChanges started')
            }
            // reset load parameters
            parentNodes = {}
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(res.data.rows.length + ' documents are loaded')
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('loadAssignedAndSubscribed: Could not read a product from database ' + rootState.userData.currentDb + ',' + error))
    }
}

export default {
    state,
    mutations,
    actions
}
