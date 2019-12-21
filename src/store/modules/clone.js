import globalAxios from 'axios'

const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var docs = []
var newProductId

/*
* The documents are read top down by level. In parentNodes the read items are linked to to their id's.
* The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
*/
function processProduct() {
    let parentNodes = { root: window.slVueTree.getNodeById('root') }
    const now = Date.now()
    for (let i = 0; i < docs.length; i++) {
        const parentId = docs[i].parentId
        if (parentNodes[parentId] !== undefined) {
            const level = docs[i].level
            const isDraggable = level > PRODUCTLEVEL
            const isExpanded = docs[i].level < FEATURELEVEL
            const doShow = docs[i].level <= PRODUCTLEVEL
            const parentNode = parentNodes[parentId]
            // position as last child
            const ind = parentNode.children.length
            const parentPath = parentNode.path
            const path = parentPath.concat(ind)
            const delmark = docs[i].delmark
            // skip the database/requirement area level and the removed items
            if (level > 1 && !delmark) {
                // search history for the last changes within the last hour
                let lastStateChange = 0
                let lastContentChange = 0
                let lastCommentAddition = 0
                let lastAttachmentAddition = 0
                let lastCommentToHistory = 0
                for (let histItem of docs[i].history) {
                    if (now - histItem.timestamp > HOURINMILIS) {
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
                    if (lastAttachmentAddition === 0 && keys.includes('lastAttachmentAddition')) {
                        lastAttachmentAddition = histItem.timestamp
                    }
                    // get the most recent addition of comments to the history
                    if (lastCommentToHistory === 0 && keys.includes('commentToHistory')) {
                        lastCommentToHistory = histItem.timestamp
                    }
                }
                // get the last time a comment was added; comments have their own array
                if (docs[i].comments && docs[i].comments.length > 0) {
                    lastCommentAddition = docs[i].comments[0].timestamp
                }

                let newNode = {
                    path,
                    pathStr: JSON.stringify(path),
                    ind,
                    level: level,
                    productId: docs[i].productId,
                    parentId,
                    _id: docs[i]._id,
                    shortId: docs[i].shortId,
                    dependencies: docs[i].dependencies || [],
                    conditionalFor: docs[i].conditionalFor || [],
                    title: docs[i].title,
                    isLeaf: level === PBILEVEL,
                    children: [],
                    isExpanded,
                    savedIsExpanded: isExpanded,
                    isSelectable: true,
                    isDraggable,
                    isSelected: false,
                    doShow,
                    savedDoShow: doShow,
                    data: {
                        priority: docs[i].priority,
                        state: docs[i].state,
                        inconsistentState: false,
                        team: docs[i].team,
                        lastStateChange,
                        lastContentChange,
                        lastCommentAddition,
                        lastAttachmentAddition,
                        lastCommentToHistory,
                        subtype: docs[i].subtype,
                        lastChange: docs[i].history[0].timestamp
                    }
                }
                parentNode.children.push(newNode)
                parentNodes[docs[i]._id] = newNode
            }
        }
    }
}

const actions = {
    // Load the current product
    cloneProduct({
        rootState,
        dispatch
    }) {
        // set the range of documents to load
        const productId = rootState.load.currentProductId
        const rangeString = 'startkey=["' + productId + '",0]&endkey=["' + productId + '",' + (PBILEVEL + 1) + ']'
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/sortedFilter?' + rangeString + '&include_docs=true',
            withCredentials: true,
        }).then(res => {
            // extract the documents
            docs = []
            for (let el of res.data.rows) {
                docs.push(el.doc)
            }
            // patch the documents
            for (let i = 0; i < docs.length; i++) {
                // compute a new id and shortId
                const oldId = docs[i]._id
                const newShortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
                const newId = Date.now().toString().concat(newShortId)
                docs[i]._id = newId
                docs[i].shortId = newShortId
                // the first document is the product
                if (docs[i].level === PRODUCTLEVEL) {
                    newProductId = newId
                    docs[i].parentId = 'root'
                    docs[i].title = 'CLONE: ' + docs[0].title
                }
                docs[i].productId = newProductId
                docs[i].history = [{
                    "cloneEvent": [docs[i].level, rootState.userData.currentDb],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": Date.now(),
                    "sessionId": rootState.userData.sessionId,
                    "distributeEvent": false
                }]
                // fix references to oldId in parentId
                for (let j = i + 1; j < docs.length; j++) {
                    if (docs[j].parentId === oldId) docs[j].parentId = newId
                }
            }
            // save the new product in the database
            dispatch('storeProduct', docs)
        }).catch(error => {
            let msg = 'cloneProduct: Could not read a product from database ' + rootState.userData.currentDb + '. Error = ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    storeProduct({
        rootState,
        dispatch
    }, docs) {
        globalAxios({
            method: 'POST',
            url: rootState.userData.currentDb + '/_bulk_docs',
            withCredentials: true,
            data: { "docs": docs },
        }).then(res => {
            // add the productId to my myProductSubscriptions
            rootState.userData.myProductSubscriptions.push(newProductId)
            // add the productId to my userAssignedProductIds
            rootState.userData.userAssignedProductIds.push(newProductId)
            // add all my roles the new productId in myProductsRoles
            rootState.userData.myProductsRoles[newProductId] = rootState.userData.roles
            // save in the database
            dispatch('addProductToUser', { dbName: rootState.userData.currentDb, productId: newProductId })
            // show the product clone in the tree view
            processProduct()
            // eslint-disable-next-line no-console
            console.log('storeProduct: ' + res.data.length + ' documents are processed')
        }).catch(error => {
            let msg = 'storeProduct: Could not update batch of documents: ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    }
}

export default {
    actions
}
