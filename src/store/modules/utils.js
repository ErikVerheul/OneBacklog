import { SEV, LEVEL, MISC } from '../../constants.js'
import { removeFromArray } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const state = {
	copyBusy: false
}

const actions = {
	loadLog({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/log'
		}).then(res => {
			rootState.logEntries = res.data.entries
			// sort on descending timestamp
			rootState.logEntries.sort((a, b) => b.timestamp - a.timestamp)
			// execute passed function if provided
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			rootState.isLogLoaded = true
		}).catch(error => {
			const msg = `loadLog: Could not load the log of database ${payload.dbName}, ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Populate the database options with all database names of the selected type */
	getDatabaseOptions({
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
				case MISC.BACKUPSONLY:
					for (const dbName of res.data) {
						if (dbName.includes('-backup-')) rootState.databaseOptions.push(dbName)
					}
					break
				case MISC.ALLBUTSYSTEM:
					for (const dbName of res.data) {
						if (!dbName.startsWith('_')) rootState.databaseOptions.push(dbName)
					}
					break
				case MISC.ALLBUTSYSTEMANDBACKUPS:
					for (const dbName of res.data) {
						if (!dbName.startsWith('_') && !dbName.includes('backup')) rootState.databaseOptions.push(dbName)
					}
					// preset with the current database or else the first entry
					if (rootState.databaseOptions.includes(rootState.userData.currentDb)) {
						rootState.selectedDatabaseName = rootState.userData.currentDb
					} else rootState.selectedDatabaseName = rootState.databaseOptions[0]
					break
				case MISC.ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS:
					rootState.databaseOptions = ['_users']
					for (const dbName of res.data) {
						if (!dbName.startsWith('_') && !dbName.includes('backup')) rootState.databaseOptions.push(dbName)
					}
					// preset with the current database or else the first entry
					if (rootState.databaseOptions.includes(rootState.userData.currentDb)) {
						rootState.selectedDatabaseName = rootState.userData.currentDb
					} else rootState.selectedDatabaseName = rootState.databaseOptions[0]
			}
		}).catch(error => {
			const msg = 'getDatabaseOptions: Could not load all database names. Error = ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	createProductAction({
		rootState,
		rootGetters,
		dispatch,
	}, payload) {
		const product = payload.newProduct
		const _id = product._id
		const position = rootGetters.getMyProductsCount + 1
		// do not distribute this event; other users have no access rights yet
		product.history = [{
			createEvent: [LEVEL.PRODUCT, payload.dbName, position],
			by: rootState.userData.user,
			email: rootState.userData.email,
			timestamp: Date.now(),
			distributeEvent: false
		}]
		globalAxios({
			method: 'PUT',
			url: payload.dbName + '/' + _id,
			data: product
		}).then(() => {
			const msg = `createProductAction: Product '${product.title}' with id = ${_id} is created`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			if (rootState.selectedDatabaseName === rootState.userData.currentDb) {
				// create a new node
				const newNode = {
					_id,
					productId: product.productId,
					parentId: product.parentId,
					dependencies: [],
					conditionalFor: [],
					title: product.title,
					isLeaf: false,
					children: [],
					isSelected: false,
					isExpanded: true,
					isSelectable: true,
					isDraggable: true,
					doShow: true,
					data: {
						state: product.state,
						subtype: 0,
						priority: product.priority,
						team: product.team,
						lastChange: Date.now()
					},
					tmp: {}
				}
				const cursorPosition = {
					nodeModel: payload.lastProductNode,
					placement: 'after'
				}
				// add the product to the treemodel, the path etc. will be calculated
				rootState.helpersRef.insertNodes(cursorPosition, [newNode], { calculatePrios: false, skipUpdateProductId: true })
			}
			// add the product to my subscriptions and productsRoles with no roles assigned
			const newProductOption = {
				value: _id,
				text: product.title
			}
			dispatch('assignProductToUserAction', { dbName: payload.dbName, selectedUser: rootState.userData.user, newProductOption, userRoles: [] })
		}).catch(error => {
			const msg = `createProductAction: Could not create product '${product.title}' with url ${payload.dbName + '/' + _id}, ` + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	copyDB({
		rootState,
		state,
		dispatch
	}, payload) {
		const copyData = {
			create_target: true,
			source: payload.dbSourceName,
			target: payload.dbTargetName
		}
		state.copyBusy = true
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('Copy DB: from ' + payload.dbSourceName + ' to ' + payload.dbTargetName)
		globalAxios({
			method: 'POST',
			url: '_replicate',
			data: copyData
		}).then(() => {
			state.copyBusy = false
			if (!payload.reportRestoreSuccess && !rootState.databaseOptions.includes(payload.dbTargetName)) {
				rootState.databaseOptions.push(payload.dbTargetName)
			}
			dispatch('setDatabasePermissions', { dbName: payload.dbTargetName, reportRestoreSuccess: payload.reportRestoreSuccess, autoSignOut: payload.autoSignOut })
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(error)
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'copyDB: Failure, ' + payload.dbSourceName + ' is NOT copied to ' + payload.dbTargetName + ', ' + error })
		})
	},

	replaceDB({
		rootState,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Database '${payload.dbTargetName}' will be replaced by '${payload.dbSourceName}', Please wait ...` })
		globalAxios({
			method: 'DELETE',
			url: payload.dbTargetName
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('replaceDB: ' + payload.dbTargetName + ' is deleted')
			dispatch('copyDB', payload)
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				// database does not exist
				dispatch('copyDB', payload)
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Deletion of database ' + payload.dbTargetName + ' gave unexpected error, ' + error + '. Operation aborted.' })
		})
	},

	collectRemoved({
		rootState,
		dispatch
	}, dbName) {
		const url = (dbName === '_users') ? '_users/_design/Users/_view/removed' : dbName + '/_design/design1/_view/removed'
		globalAxios({
			method: 'GET',
			url
		}).then(res => {
			const removed = res.data.rows
			const data = []
			for (const r of removed) {
				data.push({ [r.id]: [r.key] })
			}
			rootState.isPurgeReady = false
			rootState.backendMessages = []
			dispatch('purgeDb', { dbName, data, batch: {}, processed: 0 })
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Purge started, ' + removed.length + ' documents will be deleted. Please wait ...' })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'Could not find any removed documents in database ' + dbName + ', ' + error })
		})
	},

	purgeDb({
		rootState,
		dispatch
	}, payload) {
		if (payload.processed >= payload.data.length) {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `All removed documents in database '${payload.dbName}' have been purged, start compacting` })
			dispatch('compactDb', payload)
			return
		}

		// split the data in packages of 100
		payload.batch = {}
		let counter = 0
		for (let i = payload.processed; (i < payload.processed + 100) && (i < payload.data.length); i++) {
			payload.batch = Object.assign(payload.batch, payload.data[i])
			counter++
		}
		payload.processed += counter

		globalAxios({
			method: 'POST',
			url: payload.dbName + '/_purge',
			data: payload.batch
		}).then((res) => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `${Object.keys(res.data.purged).length} removed documents in database '${payload.dbName}' have been purged` })
			dispatch('purgeDb', payload)
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Purge of documents in database '${payload.dbName}' failed, ${error}` })
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
			data: {}
		}).then(() => {
			rootState.isPurgeReady = true
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Compacting the database '${payload.dbName} succeeded` })
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Compacting the database '${payload.dbName}' failed, ${error}` })
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
			if (rootState.userData.myDatabases[dbName]) {
				// also delete from my personal list
				delete rootState.userData.myDatabases[dbName]
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Database '${dbName}' has been deleted` })
			rootState.isDbDeleted = true
			rootState.selectedDatabaseName = undefined
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Database '${dbName}' could not be deleted, ${error}` })
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
				docsToUpdate.push({ id: res.data.rows[i].id })
			}
			dispatch('resetHistAndComm', { dbName: payload.dbName, docs: docsToUpdate, olderThan: payload.age })
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(error)
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
			data: { docs: payload.docs }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			const now = Date.now()
			for (const r of results) {
				const doc = r.docs[0].ok
				if (doc) {
					if (doc.type === 'backlogItem') {
						const newHistory = []
						let histRemovedCount = 0
						for (const h of doc.history) {
							if (now - h.timestamp <= payload.olderThan * dayMillis) {
								newHistory.push(h)
							} else histRemovedCount++
						}
						doc.history = newHistory
						const newHist = {
							resetHistoryEvent: [histRemovedCount],
							by: rootState.userData.user,
							email: rootState.userData.email,
							timestamp: now,
							distributeEvent: false
						}
						doc.history.unshift(newHist)

						const newComments = []
						let commentsRemovedCount = 0
						for (const c of doc.comments) {
							if (now - c.timestamp <= payload.olderThan * dayMillis) {
								newComments.push(c)
							} else commentsRemovedCount++
						}
						doc.comments = newComments
						const newComment = {
							resetCommentsEvent: [commentsRemovedCount],
							by: rootState.userData.user,
							email: rootState.userData.email,
							timestamp: now,
							distributeEvent: false
						}
						doc.comments.unshift(newComment)
						docs.push(doc)
					}
				}
				if (r.docs[0].error) error.push(r.docs[0].error)
			}
			if (error.length > 0) {
				const errorStr = ''
				for (const e of error) {
					errorStr.concat(`${e.id} (error = ${e.error},  reason = ${e.reason}), `)
				}
				const msg = 'resetHistAndComm: These documents cannot be updated: ' + errorStr
				dispatch('doLog', { event: msg, level: SEV.WARNING })
			}
			dispatch('updateBulk', { dbName: payload.dbName, docs, caller: 'resetHistAndComm', onSuccessCallback: () => { rootState.isHistAndCommReset = true } })
		}).catch(error => {
			const msg = 'resetHistAndComm: Could not read batch of documents: ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	state,
	actions
}
