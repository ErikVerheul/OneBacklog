import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
var docs = []
var newProductId
var orgProductTitle
var newProductTitle

// returns a new array so that it is reactive
function addToArray(arr, item) {
    const newArr = []
    for (let el of arr) newArr.push(el)
    newArr.push(item)
    return newArr
}

function showProduct() {
    let parentNodes = { root: window.slVueTree.getNodeById('root') }
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
            let lastChange
            if (doc.history[0].resetCommentsEvent && !doc.history[0].resetHistoryEvent) {
                lastChange = doc.history[0].timestamp
            } else if (doc.history[0].resetHistoryEvent && !doc.history[0].resetCommentsEvent) {
                lastChange = doc.comments[0].timestamp
            } else lastChange = doc.history[0].timestamp > doc.comments[0].timestamp ? doc.history[0].timestamp : doc.comments[0].timestamp
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
                    priority: doc.priority,
                    state: doc.state,
                    reqarea: doc.reqarea,
                    team: doc.team,
                    subtype: doc.subtype,
                    lastChange
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
        // set the range of documents to load
        const productId = rootState.currentProductId
        const rangeString = 'startkey=["' + productId + '",0]&endkey=["' + productId + '",' + (PBILEVEL + 1) + ']'
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/allItemsFilter?' + rangeString + '&include_docs=true',
        }).then(res => {
            // extract the documents
            docs = []
            for (let el of res.data.rows) {
                // remove the revision
                delete el.doc._rev
                docs.push(el.doc)
            }
            // patch the documents
            for (let i = 0; i < docs.length; i++) {
                // compute a new id and shortId, remember old id
                const oldId = docs[i]._id
                const newShortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
                const newId = Date.now().toString().concat(newShortId)
                // the first document is the product
                if (i === 0) {
                    newProductId = newId
                    docs[0].parentId = 'root'
                    // use the negative creation date as the priority of the new product so that sorting on priority gives the same result as sorting on id
                    docs[0].priority = -Date.now()
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
            // add all my session roles the to new productId in myProductsRoles
            rootState.userData.myProductsRoles[newProductId] = rootState.userData.sessionRoles
            // save in the database
            dispatch('addProductToUser', { dbName: rootState.userData.currentDb, productId: newProductId, userRoles: ['*'] })
            // show the product clone in the tree view
            showProduct()
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
