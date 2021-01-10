import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2
const BACKUPSONLY = 1
const ALLBUTSYSTEM = 2
const ALLBUTSYSTEMANDBACKUPS = 3
const ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS = 4
const PRODUCTLEVEL = 2

function removeFromArray(arr, item) {
	const newArr = []
	for (const el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

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
			// execute passed function if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			rootState.isLogLoaded = true
		}).catch(error => {
			const msg = `loadLog: Could not load the log of database ${payload.dbName}, ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

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
					for (const dbName of res.data) {
						if (dbName.includes('-backup-')) rootState.databaseOptions.push(dbName)
					}
					break
				case ALLBUTSYSTEM:
					for (const dbName of res.data) {
						if (!dbName.startsWith('_')) rootState.databaseOptions.push(dbName)
					}
					break
				case ALLBUTSYSTEMANDBACKUPS:
					for (const dbName of res.data) {
						if (!dbName.startsWith('_') && !dbName.includes('backup')) rootState.databaseOptions.push(dbName)
					}
					// preset with the current database or else the first entry
					if (rootState.databaseOptions.includes(rootState.userData.currentDb)) {
						rootState.selectedDatabaseName = rootState.userData.currentDb
					} else rootState.selectedDatabaseName = rootState.databaseOptions[0]
					break
				case ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS:
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
			const msg = 'getAllDatabases: Could not load all database names. Error = ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	createProductAction({
		rootState,
		rootGetters,
		dispatch,
	}, payload) {
		const _id = payload.newProduct._id
		const product = payload.newProduct
		const position = rootGetters.getMyProductsCount + 1
		// do not distribute this event; other users have no access rights yet
		product.history = [{
			createEvent: [PRODUCTLEVEL, payload.dbName, position],
			by: rootState.userData.user,
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
				// add a node to my product details view
				const myCurrentProductNodes = window.slVueTree.getProducts()
				// get the last product node
				const lastProductNode = myCurrentProductNodes.slice(-1)[0]
				// create a new node
				const newNode = {
					productId: payload.newProduct.productId,
					parentId: payload.newProduct.parentId,
					_id: payload.newProduct._id,
					dependencies: [],
					conditionalFor: [],
					title: payload.newProduct.title,
					isLeaf: false,
					children: [],
					isSelected: false,
					isExpanded: true,
					isSelectable: true,
					isDraggable: payload.newProduct.level > PRODUCTLEVEL,
					doShow: true,
					data: {
						state: payload.newProduct.state,
						subtype: 0,
						priority: payload.priority,
						team: payload.newProduct.team,
						lastChange: Date.now()
					}
				}
				const cursorPosition = {
					nodeModel: lastProductNode,
					placement: 'after'
				}
				// add the product to the treemodel, the path etc. will be calculated
				window.slVueTree.insert(cursorPosition, [newNode], false)
			}
			// add the product to my subscriptions and productsRoles with no roles assigned
			const newProductOption = {
				value: _id,
				text: payload.newProduct.title
			}
			dispatch('assignProductToUser', { dbName: payload.dbName, selectedUser: rootState.userData.user, newProductOption, userRoles: [] })
		}).catch(error => {
			const msg = `createProductAction: Could not create product '${product.title}' with url ${payload.dbName + '/' + _id}, ` + error
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
			dispatch('setDatabasePermissions', { dbName: payload.dbTargetName, reportRestoreSuccess: payload.reportRestoreSuccess })
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
			// ToDo: move to onSuccessCallback
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
		}).catch(error => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Database '${dbName}' could not be deleted, ${error}` })
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
			for (const r of rows) {
				const teamId = r.id
				const teamName = r.key
				const members = r.value
				rootState.fetchedTeams.push({ teamId, teamName, members })
				if (!members || members.length === 0) {
					rootState.teamsToRemoveOptions.push(teamName)
				}
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchTeamMembers: success, '${rootState.fetchedTeams.length}' team names are read` })
			rootState.areTeamsFound = true
		}).catch(error => {
			const msg = `fetchTeamMembers: Could not read the documents from database '${dbName}', ${error}`
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
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `getDbDefaultSprintCalendar: success, ${res.data.defaultSprintCalendar.length} sprint periods are read` })
				rootState.isSprintCalendarFound = true
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'getDbDefaultSprintCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `getDbDefaultSprintCalendar: Could not read config document of database '${dbName}', ${error}`
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
			const updatedDoc = res.data
			updatedDoc.defaultSprintCalendar = payload.newSprintCalendar
			dispatch('updateDoc', {
				dbName: payload.dbName,
				updatedDoc,
				caller: 'saveDbDefaultSprintCalendar',
				onSuccessCallback: () => {
					rootState.defaultSprintCalendar = payload.newSprintCalendar
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'saveDbDefaultSprintCalendar: calendar is saved' })
					rootState.isDefaultSprintCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = 'saveDbDefaultSprintCalendar: Could not read config document of database ' + payload.dbName + ', ' + error
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
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				const msg = 'resetHistAndComm: These documents cannot be updated: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
			}
			dispatch('updateBulk', { dbName: payload.dbName, docs, caller: 'resetHistAndComm', onSuccessCallback: () => { rootState.isHistAndCommReset = true } })
		}).catch(error => {
			const msg = 'resetHistAndComm: Could not read batch of documents: ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	///////////////// utility not integrated in user interface //////////////////
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
			for (const it of items) {
				const doc = it.doc
				doc.delmark = true
				docs.push(doc)
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, caller: 'removeFromFilter' })
		}).catch(error => {
			const msg = `removeFromFilter: Could not read the teams in database '${rootState.userData.currentDb}', ${error}`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
	state,
	actions
}
