import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000
var docs = []
var newProductId
var orgProductTitle
var newProductTitle
var newProductPriority

// returns a new array so that it is reactive
function addToArray(arr, item) {
	const newArr = []
	for (let el of arr) newArr.push(el)
    newArr.push(item)
	return newArr
}

/*
* The documents are read top down by level. In parentNodes the read items are linked to to their id's.
* The object parentNodes is used to insert siblings to their parent. Reading top down guarantees that the parents are read before any siblings.
*/
function processProduct() {
    let parentNodes = { root: window.slVueTree.getNodeById('root') }
    const now = Date.now()
    for (let doc of docs) {
        const parentId = doc.parentId
        if (parentNodes[parentId] !== undefined) {
            const level = doc.level
            const isDraggable = level > PRODUCTLEVEL
            const isExpanded = doc.level < FEATURELEVEL
            const doShow = doc.level <= PRODUCTLEVEL
            const parentNode = parentNodes[parentId]
            // position as last child
            const ind = parentNode.children.length
            const parentPath = parentNode.path
            const path = parentPath.concat(ind)
            // search history for the last changes within the last hour
            let lastStateChange = 0
            let lastContentChange = 0
            let lastCommentAddition = 0
            let lastAttachmentAddition = 0
            let lastCommentToHistory = 0
            for (let histItem of doc.history) {
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
                path,
                pathStr: JSON.stringify(path),
                ind,
                level: level,
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
                isSelected: false,
                doShow,
                savedDoShow: doShow,
                data: {
                    priority: newProductPriority,
                    state: doc.state,
                    inconsistentState: false,
                    team: doc.team,
                    lastStateChange,
                    lastContentChange,
                    lastCommentAddition,
                    lastAttachmentAddition,
                    lastCommentToHistory,
                    subtype: doc.subtype,
                    lastChange: doc.history[0].timestamp
                }
            }
            parentNode.children.push(newNode)
            parentNodes[doc._id] = newNode
        }
    }
}

const actions = {
    // Load the current product
    cloneProduct({
        rootState,
        dispatch
    }) {
        // use a simple algorithm to calculate the priority of the cloned product
        const myCurrentProductNodes = window.slVueTree.getProducts()
        const lastProductNode = myCurrentProductNodes.slice(-1)[0]
        const lastProductPriority = lastProductNode.data.priority
        newProductPriority = Math.floor((lastProductPriority + Number.MIN_SAFE_INTEGER) / 2)
        // set the range of documents to load
        const productId = rootState.load.currentProductId
        const rangeString = 'startkey=["' + productId + '",0]&endkey=["' + productId + '",' + (PBILEVEL + 1) + ']'
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/sortedFilter?' + rangeString + '&include_docs=true',
        }).then(res => {
            // extract the documents
            docs = []
            for (let el of res.data.rows) {
                docs.push(el.doc)
            }
            // patch the documents
            for (let i = 0; i < docs.length; i++) {
                // remove the revision
                delete docs[i]._rev
                // compute a new id and shortId, remember old id
                const oldId = docs[i]._id
                const newShortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
                const newId = Date.now().toString().concat(newShortId)
                // the first document is the product
                if (i === 0) {
                    newProductId = newId
                    docs[0].parentId = 'root'
                    docs[0].priority = newProductPriority
                    orgProductTitle = docs[0].title
                    newProductTitle = 'CLONE: ' + orgProductTitle
                    docs[0].title = newProductTitle
                }
                docs[i]._id = newId
                docs[i].shortId = newShortId
                docs[i].productId = newProductId
                docs[i].history = [{
                    "cloneEvent": [docs[i].level, docs[i].subtype, orgProductTitle],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": Date.now(),
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
            data: { "docs": docs },
        }).then(res => {
            // add the productId to my myProductSubscriptions
            rootState.userData.myProductSubscriptions.push(newProductId)
            // add the productId to my userAssignedProductIds and selection options
            rootState.userData.userAssignedProductIds = addToArray(rootState.userData.userAssignedProductIds, newProductId)
            rootState.myProductOptions.push({
                value: newProductId,
                text: newProductTitle
            })
            // add all my roles the to new productId in myProductsRoles
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
