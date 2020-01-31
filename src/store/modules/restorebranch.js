import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const INFO = 0
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const HOURINMILIS = 3600000

function composeRangeString(id) {
    return 'startkey="' + id + '"&endkey="' + id + '"'
}

const state = {
    lastHistoryTimestamp: 0,
    docsCount: 1,
    itemsCount: 1,
    currentDefaultProductId: null,
    currentProductId: null,
    currentProductsEnvelope: [],
    currentProductTitle: "",
    rangeString: ''
}

const mutations = {
    processItems(state, docs) {
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
                let newNode = {
                    "path": locationInfo.newPath,
                    "pathStr": JSON.stringify(locationInfo.newPath),
                    "ind": locationInfo.newInd,
                    "level": locationInfo.newPath.length,

                    "productId": doc.productId,
                    "parentId": doc.parentId,
                    "_id": doc._id,
                    shortId: doc.shortId,
                    "dependencies": doc.dependencies || [],
                    "conditionalFor": doc.conditionalFor || [],
                    "title": doc.title,
                    "isLeaf": (locationInfo.newPath.length < PBILEVEL) ? false : true,
                    "children": [],
                    "isSelected": false,
                    isExpanded: doc.level < FEATURELEVEL,
                    savedIsExpanded: doc.level < FEATURELEVEL,
                    "isSelectable": true,
                    "isDraggable": doc.level > PRODUCTLEVEL,
                    "doShow": true,
                    "savedDoShow": true,
                    "data": {
                        "state": doc.state,
                        "subtype": 0,
                        "lastStateChange": state.lastHistoryTimestamp,
                        "lastChange": state.lastHistoryTimestamp,
                        priority: doc.priority,
                        inconsistentState: false,
                        team: doc.team,
                        lastContentChange: 0,
                        lastCommentAddition: 0,
                        lastAttachmentAddition: 0,
                        lastCommentToHistory: 0
                    }
                }
                window.slVueTree.insert({
                    nodeModel: locationInfo.prevNode,
                    placement: locationInfo.newInd === 0 ? 'inside' : 'after'
                }, [newNode], false)
                state.itemsCount++
            } else console.log('processItems: parentNode not found for doc.parentId = ' + doc.parentId)
        }
    }
}
const actions = {
    restoreBranch({
        dispatch,
        commit
    }, doc) {
        state.lastHistoryTimestamp = doc.history[0].timestamp
        commit('processItems', [doc])
        dispatch('getChildren', doc._id)
    },

    getChildren({
        rootState,
        state,
        commit
    }, _id) {
        const url = rootState.userData.currentDb + '/_design/design1/_view/parentIds?' + composeRangeString(_id) + '&include_docs=true'
        console.log('getChildren: url = ' + url)
        globalAxios({
            method: 'GET',
            url,
        }).then(res => {
            const docs = []
            for (let r of res.data.rows) {
                docs.push(r.doc)
            }
            console.log('getChildren: docs.length = ' + docs.length)
            // console.log('getChildren: docs = ' + JSON.stringify(docs, null, 2))
            state.docsCount += docs.length
            commit('processItems', docs)
            commit('showLastEvent', { txt: `${state.docsCount} docs are read. ${state.itemsCount} items are inserted.`, severity: INFO })
        })
            // eslint-disable-next-line no-console
            .catch(error => console.log('getChildren: Could not read the item from database ' + rootState.userData.currentDb + '. Error = ' + error))
    },
}

export default {
    state,
    mutations,
    actions
}
