import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2
const BACKUPSONLY = 1
const ALLBUTSYSTEM = 2
const ALLBUTSYSTEMANDBACKUPS = 3
const PRODUCTLEVEL = 2

function removeFromArray(arr, item) {
	const newArr = []
	for (let el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

const state = {
	copyBusy: false
}

const actions = {
	/* Get all database names */
	getAllDatabases({
		rootState,
		dispatch
	}, selected) {
		rootState.backendMessages = []
		rootState.areDatabasesFound = false
		globalAxios({
			method: 'GET',
			url: '/_all_dbs'
		}).then(res => {
			rootState.areDatabasesFound = true
			rootState.databaseOptions = []
			switch (selected) {
				case BACKUPSONLY:
					for (let dbName of res.data) {
						if (dbName.includes('-backup-')) rootState.databaseOptions.push(dbName)
					}
					break
				case ALLBUTSYSTEM:
					for (let dbName of res.data) {
						if (!dbName.startsWith('_')) rootState.databaseOptions.push(dbName)
					}
					break
				case ALLBUTSYSTEMANDBACKUPS:
					for (let dbName of res.data) {
						if (!dbName.startsWith('_') && !dbName.includes('backup')) rootState.databaseOptions.push(dbName)
					}
					// preset with the current database or else the first entry
					if (rootState.databaseOptions.includes(rootState.userData.currentDb)) {
						rootState.selectedDatabaseName = rootState.userData.currentDb
					} else rootState.selectedDatabaseName = rootState.databaseOptions[0]
			}
		}).catch(error => {
			let msg = 'getAllDatabases: Could not load all database names. Error = ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	createProduct({
		rootState,
		dispatch
	}, payload) {
		const _id = payload.newProduct._id
		const product = payload.newProduct
		const position = Object.keys(rootState.userData.myProductsRoles).length + 1
		// do not distribute this event; other users have no access rights yet
		product.history = [{
			"createEvent": [PRODUCTLEVEL, rootState.userData.currentDb, position],
			"by": rootState.userData.user,
			"timestamp": Date.now(),
			"distributeEvent": false
		}]
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + _id,
			data: product
		}).then(() => {
			const msg = `createProduct: Product '${product.title}' is created`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// add the product to this user's subscriptions and productsRoles
			dispatch('addProductToUser', { dbName: payload.dbName, productId: _id, userRoles: payload.userRoles })
		}).catch(error => {
			const msg = `createProduct: Could not create product '${product.title}' with url ${payload.dbName + '/' + _id}, ` + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	copyDB({
		rootState,
		state,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		const copyData = {
			"create_target": true,
			"source": payload.dbSourceName,
			"target": payload.dbTargetName
		}
		state.copyBusy = true
		// eslint-disable-next-line no-console
		console.log('Copy DB: from ' + payload.dbSourceName + ' to ' + payload.dbTargetName)
		globalAxios({
			method: 'POST',
			url: "_replicate",
			data: copyData
		}).then(() => {
			state.copyBusy = false
			if (!rootState.databaseOptions.includes(payload.dbTargetName)) {
				rootState.databaseOptions.push(payload.dbTargetName)
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'copyDB: Success, ' + payload.dbSourceName + ' is copied to ' + payload.dbTargetName })
			dispatch('setDatabasePermissions', {
				dbName: payload.dbTargetName
			})
		}).catch(error => {
			// eslint-disable-next-line no-console
			console.log(error)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'copyDB: Failure, ' + payload.dbSourceName + ' is NOT copied to ' + payload.dbTargetName + ', ' + error })
		})
	},

	replaceDB({
		rootState,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		globalAxios({
			method: 'DELETE',
			url: payload.dbTargetName
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Database ' + payload.dbTargetName + ' has been deleted' })
			dispatch('copyDB', payload)
		}).catch(error => {
			if (error.response.status === 404) {
				// database does not exist
				dispatch('copyDB', payload)
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Deletion of database ' + payload.dbTargetName + ' gave unexpected error, ' + error + '. Operation aborted.' })
		})
	},

	collectRemoved({
		rootState,
		dispatch
	}, dbName) {
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/removed'
		}).then(res => {
			const removed = res.data.rows
			const data = []
			for (let r of removed) {
				data.push({ [r.id]: [r.key] })
			}
			rootState.isPurgeReady = false
			rootState.backendMessages = []
			dispatch('purgeDb', { dbName, data, idx: 0, number: removed.length })
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Purge started, ' + removed.length + ' documents will be deleted. Please wait ...' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Could not find any removed documents in database ' + dbName + ',' + error })
		})
	},

	purgeDb({
		rootState,
		dispatch
	}, payload) {
		if (payload.idx >= payload.number) {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: payload.number + ' removed documents in database ' + payload.dbName + ' have been purged, start compacting' })
			dispatch('compactDb', payload)
			return
		}
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_purge',
			data: payload.data[payload.idx]
		}).then(() => {
			// recurse as there is nu bulk purge available
			payload.idx++
			dispatch('purgeDb', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Purge of documents in database ' + payload.dbName + ' failed at index ' + payload.idx + ', ' + error })
		})
	},

	/* Must add an (empty) data field to avoid the Content-Type to be removed by the browser */
	compactDb({
		rootState
	}, payload) {
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_compact',
			headers: {
				'Content-Type': 'application/json'
			},
			data: {},
		}).then(() => {
			rootState.isPurgeReady = true
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Compacting the database ' + payload.dbName + ' succeeded' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Compacting the database ' + payload.dbName + ' failed, ' + error })
		})
	},

	deleteDb({
		rootState
	}, dbName) {
		rootState.backendMessages = []
		globalAxios({
			method: 'DELETE',
			url: dbName
		}).then(() => {
			if (rootState.databaseOptions.includes(dbName)) {
				rootState.databaseOptions = removeFromArray(rootState.databaseOptions, dbName)
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Database ' + dbName + ' has been deleted' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Database ' + dbName + ' coud not be deleted,' + error })
		})
	},

	fetchTeamMembers({
		rootState,
		dispatch
	}, dbName) {
		rootState.areTeamsFound = false
		rootState.teamsToRemoveOptions = []
		rootState.backendMessages = []
		rootState.fetchedTeams = []
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/teams'
		}).then(res => {
			const rows = res.data.rows
			for (let r of rows) {
				const teamId = r.id
				const teamName = r.key
				const members = r.value
				rootState.fetchedTeams.push({ teamId, teamName, members })
				if (!members || members.length === 0) {
					rootState.teamsToRemoveOptions.push(teamName)
				}
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'fetchTeamMembers: success, ' + rootState.fetchedTeams.length + ' team names are read' })
			rootState.areTeamsFound = true
		}).catch(error => {
			let msg = `fetchTeamMembers: Could not read the documents from database '${dbName}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get the default sprint calendar of a specific database (for admin use only) */
	getDbDefaultSprintCalendar({
		rootState,
		dispatch
	}, dbName) {
		rootState.isSprintCalendarFound = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: dbName + '/config'
		}).then(res => {
			if (res.data.defaultSprintCalendar) {
				rootState.defaultSprintCalendar = res.data.defaultSprintCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'getDbDefaultSprintCalendar: success, ' + res.data.defaultSprintCalendar.length + ' sprint periods are read' })
				rootState.isSprintCalendarFound = true
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'getDbDefaultSprintCalendar: no calendar is found' })
		}).catch(error => {
			let msg = 'getDbDefaultSprintCalendar: Could not read config document of database ' + dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Save the default sprint calendar of a specific database (for admin use only) */
	saveDbDefaultSprintCalendar({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config'
		}).then(res => {
			let updatedDoc = res.data
			updatedDoc["defaultSprintCalendar"] = payload.newSprintCalendar
			dispatch('updateDoc', {
				dbName: payload.dbName, updatedDoc, onSuccessCallback: () => {
					rootState.defaultSprintCalendar = payload.newSprintCalendar
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'saveDbDefaultSprintCalendar: calendar is saved' })
					rootState.isDefaultSprintCalendarSaved = true
				}
			})
		}).catch(error => {
			let msg = 'saveDbDefaultSprintCalendar: Could not read config document of database ' + payload.dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	remHistAndCommAsync({
		rootState,
		state,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_all_docs'
		}).then(res => {
			rootState.isHistAndCommReset = false
			rootState.backendMessages = []
			const docsToUpdate = []
			for (let i = 0; i < res.data.rows.length; i++) {
				docsToUpdate.push({ "id": res.data.rows[i].id })
			}
			dispatch('resetHistAndComm', { dbName: payload.dbName, docs: docsToUpdate, olderThan: payload.age })
		}).catch(error => {
			// eslint-disable-next-line no-console
			console.log(error)
			state.message = error.response.data
			state.errorMessage = error.message
		})
	},

	resetHistAndComm({
		rootState,
		dispatch
	}, payload) {
		const dayMillis = 24 * 60 * 60000
		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_bulk_get',
			data: { "docs": payload.docs }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			const now = Date.now()
			for (let r of results) {
				const doc = r.docs[0].ok
				if (doc) {
					if (doc.type === 'backlogItem') {
						const newHistory = []
						let histRemovedCount = 0
						for (let h of doc.history) {
							if (now - h.timestamp <= payload.olderThan * dayMillis) {
								newHistory.push(h)
							} else histRemovedCount++
						}
						doc.history = newHistory
						const newHist = {
							"resetHistoryEvent": [histRemovedCount],
							"by": rootState.userData.user,
							"timestamp": now,
							"distributeEvent": false
						}
						doc.history.unshift(newHist)

						const newComments = []
						let commentsRemovedCount = 0
						for (let c of doc.comments) {
							if (now - c.timestamp <= payload.olderThan * dayMillis) {
								newComments.push(c)
							} else commentsRemovedCount++
						}
						doc.comments = newComments
						const newComment = {
							"resetCommentsEvent": [commentsRemovedCount],
							"by": rootState.userData.user,
							"timestamp": now,
							"distributeEvent": false
						}
						doc.comments.unshift(newComment)
						docs.push(doc)
					}
				}
				if (r.docs[0].error) error.push(r.docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'resetHistAndComm: These documents cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				console.log(msg)
			}
			dispatch('updateBulk', { dbName: payload.dbName, docs, caller: 'resetHistAndComm', onSuccessCallback: () => { rootState.isHistAndCommReset = true } })
		}).catch(error => {
			let msg = 'resetHistAndComm: Could not read batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	//////////////// utility not integrated in user interface //////////////////
	removeFromFilter({
        rootState,
        dispatch
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/to-delete?include_docs=true'
        }).then(res => {
			const items = res.data.rows
			const docs = []
			for (let it of items) {
				const doc = it.doc
				doc.delmark = true
				docs.push(doc)
			}
            dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeFromFilter' })
        }).catch(error => {
            let msg = `removeFromFilter: Could not read the teams in database '${rootState.userData.currentDb}', ${error}`
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },
}

export default {
	state,
	actions
}
