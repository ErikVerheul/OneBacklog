import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const TASKLEVEL = 6
// these vars are initiated when the product is loaded
var newProductId
var orgProductTitle
var newProductTitle

function composeRangeString (id) {
  return `startkey=["${id}",${PRODUCTLEVEL},${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${TASKLEVEL},${Number.MAX_SAFE_INTEGER}]`
}

function showProduct (docs, leafLevel) {
  const parentNodes = { root: window.slVueTree.getNodeById('root') }
  for (const doc of docs) {
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
      const newNode = {
        path,
        pathStr: JSON.stringify(path),
        ind,
        level: level,
        productId: doc.productId,
        parentId,
        sprintId: doc.sprintId,
        _id: doc._id,
        dependencies: doc.dependencies || [],
        conditionalFor: doc.conditionalFor || [],
        title: doc.title,
        isLeaf: level === leafLevel,
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
          reqAreaItemColor: doc.color,
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
  /*
    * Load the current product document and all its descendants.
    * History and attachments are not copied
    */
  cloneProduct ({
    rootState,
    dispatch
  }, node) {
    const productId = node.productId
    globalAxios({
      method: 'GET',
      url: rootState.userData.currentDb + '/_design/design1/_view/details?' + composeRangeString(productId) + '&include_docs=true'
    }).then(res => {
      // extract the documents
      const docs = []
      for (const r of res.data.rows) {
        const doc = r.doc
        // remove the revision
        delete doc._rev
        // must remove _attachments stub to avoid CouchDB error 412 'Precondition failed'
        delete doc._attachments
        docs.push(doc)
      }
      // patch the documents
      for (let i = 0; i < docs.length; i++) {
        // compute a new id, remember old id
        const oldId = docs[i]._id
        // a copy of createId() in the component mixins: Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
        const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
        const newId = Date.now().toString().concat(ext)
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
        docs[i].productId = newProductId
        docs[i].history = [{
          cloneEvent: [docs[i].level, docs[i].subtype, orgProductTitle],
          by: rootState.userData.user,
          timestamp: Date.now(),
          distributeEvent: false
        }]
        // fix references to oldId in parentId
        for (let j = i + 1; j < docs.length; j++) {
          if (docs[j].parentId === oldId) docs[j].parentId = newId
        }
      }
      // save the new product in the database
      dispatch('storeProduct', docs)
    }).catch(error => {
      const msg = 'cloneProduct: Could not read a product from database ' + rootState.userData.currentDb + ', ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  },

  storeProduct ({
		rootState,
		rootGetters,
    getters,
    dispatch
  }, docs) {
    globalAxios({
      method: 'POST',
      url: rootState.userData.currentDb + '/_bulk_docs',
      data: { docs: docs }
    }).then(res => {
      // add the productId to my product subscriptions
			rootGetters.getMyProductSubscriptions.push(newProductId)
      // add the productId to my selection options
      rootState.myProductOptions.push({
        value: newProductId,
        text: newProductTitle
      })
      // save in the database
			dispatch('addProductToUser', { dbName: rootState.userData.currentDb, selectedUser: rootState.userData.user, productId: newProductId, userRoles: ['*'] })
      // show the product clone in the tree view
      showProduct(docs, getters.leafLevel)
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log('storeProduct: ' + res.data.length + ' documents are processed')
    }).catch(error => {
      const msg = 'storeProduct: Could not update batch of documents: ' + error
      // eslint-disable-next-line no-console
      if (rootState.debug) console.log(msg)
      dispatch('doLog', { event: msg, level: ERROR })
    })
  }
}

export default {
  actions
}
