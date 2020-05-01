import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const INFO = 0
const WARNING = 1
const ERROR = 2
const PRODUCTLEVEL = 2

/* Remove 'ignoreEvent' elements from history */
function cleanHistory(doc) {
	const cleanedHistory = []
	for (let h of doc.history) {
		if (Object.keys(h)[0] !== 'ignoreEvent') cleanedHistory.push(h)
	}
	doc.history = cleanedHistory
	return doc
}

const actions = {
	/* Load a backlog item by short id */
	loadItemByShortId({
		rootState,
		dispatch,
		commit
	}, shortId) {
		const rangeStr = `/_design/design1/_view/shortIdFilter?startkey=["${shortId}"]&endkey=["${shortId}"]&include_docs=true`
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr,
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
				// take the fist document found
				const doc = rows[0].doc
				if (rootState.userData.userAssignedProductIds.includes(doc.productId)) {
					if (rows.length === 1) {
						commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your view. Did you select the product?`, severity: WARNING })
					} else {
						commit('showLastEvent', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed.`, severity: INFO })
						let ids = ''
						for (let i = 0; i < rows.length; i++) {
							ids += rows[i].doc._id + ', '
						}
						const msg = 'Multiple documents found for shortId ' + shortId + ' The documents ids are ' + ids
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log(msg)
						dispatch('doLog', { event: msg, level: WARNING })
					}
					commit('updateCurrentDoc', { newDoc: cleanHistory(doc) })
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('loadItemByShortId: document with _id ' + doc._id + ' is loaded.')
				} else {
					commit('showLastEvent', { txt: `The document with id ${doc._id} is found but not in your assigned products.`, severity: WARNING })
				}
			} else commit('showLastEvent', { txt: `The document with id ${shortId} is NOT found in the database.`, severity: WARNING })
		})
			// eslint-disable-next-line no-console
			.catch(error => console.log('loadItemByShortId: Could not read a batch of documents from database ' + rootState.userData.currentDb + '. Error = ' + error))
	},

	/* Add history to the parent and than save the document */
	createDoc({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.newDoc.parentId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const updatedDoc = res.data
			updatedDoc.history.unshift(payload.parentHist)
			const toDispatch = { 'updateDoc': { dbName: rootState.userData.currentDb, updatedDoc: payload.newDoc, forceUpdateCurrentDoc: true }}
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc, toDispatch, caller: 'createDoc' })
		}).catch(error => {
			let msg = 'createDoc: Could not read parent document with id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Load document by _id and make it the current backlog item
	* If a product is loaded, set the current product title
	*/
	loadDoc({
		rootState,
		commit,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			commit('updateCurrentDoc', { newDoc: cleanHistory(res.data) })
			if (rootState.currentDoc.level === PRODUCTLEVEL) rootState.currentProductTitle = rootState.currentDoc.title
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadDoc: document with _id ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadDoc: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	actions
}
