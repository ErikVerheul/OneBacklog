import { SEV, LEVEL } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const MIN_ID = ''
const MAX_ID = '999999999999zzzzz'
// keep track of busy loading during this session
var loadRequests = 0
var busyLoading = false

function composeRangeString1(id, team) {
	return `startkey=["${id}","${team}","${MIN_ID}","${MIN_ID}",${LEVEL.PBI},${Number.MIN_SAFE_INTEGER}]&endkey=["${id}","${team}","${MAX_ID}","${MAX_ID}",${LEVEL.TASK},${Number.MAX_SAFE_INTEGER}]`
}
function composeRangeString2(team) {
	return `startkey=["${team}","${MIN_ID}","${MIN_ID}","${MIN_ID}",${Number.MIN_SAFE_INTEGER}]&endkey=["${team}","${MAX_ID}","${MAX_ID}","${MAX_ID}",${Number.MAX_SAFE_INTEGER}]`
}
function composeRangeString3(id) {
	return `startkey="${id}"&endkey="${id}"`
}

const state = {
	parentIdsToImport: [],
	taskIdsToImport: [],
	featureMap: [],
	pbiResults: [],
	pathsFound: []
}

const actions = {
	/* Multiple calls to this action are serialized */
	loadPlanningBoard({
		rootState,
		state,
		commit,
		dispatch
	}, payload) {
		function isCurrentSprint(sprintId) {
			for (const s of rootState.sprintCalendar) {
				if (s.id === sprintId) {
					return (Date.now() > s.startTimestamp && Date.now() < s.startTimestamp + s.sprintLength)
				}
			}
		}
		if (!busyLoading) {
			busyLoading = true
			rootState.stories = []
			state.featureMap = []
			state.pbiResults = []
			state.pathsFound = []
			globalAxios({
				method: 'GET',
				url: rootState.userData.currentDb + '/_design/design1/_view/sprints?' + composeRangeString1(payload.sprintId, payload.team)
			}).then(res => {
				// save the last loaded sprintId
				rootState.loadedSprintId = payload.sprintId
				const results = res.data.rows
				const foundPbiIds = []
				const taskResults = []
				const missingPbiIds = []
				for (const r of results) {
					const itemLevel = r.key[4]
					if (itemLevel === LEVEL.PBI) {
						const pbiId = r.id
						if (!foundPbiIds.includes(pbiId)) foundPbiIds.push(pbiId)
						const featureId = r.key[3]
						const feature = window.slVueTree.getNodeById(featureId)
						if (feature) {
							if (!state.pathsFound.includes(feature.pathStr)) {
								state.featureMap.push({ path: feature.path, id: feature._id })
							}
							state.pathsFound.push(feature.pathStr)
							// stories without a associated feature are skipped
							state.pbiResults.push(r)
						}
					}
					if (itemLevel === LEVEL.TASK) {
						taskResults.push(r)
						const pbiId = r.key[3]
						if (!foundPbiIds.includes(pbiId)) {
							foundPbiIds.push(pbiId)
							if (!missingPbiIds.includes(pbiId)) missingPbiIds.push(pbiId)
						}
					}
				}

				dispatch('loadMissingPbis', {
					missingPbiIds,
					onSuccessCallBack: () => {
						// order the items as in the tree view
						state.featureMap.sort((a, b) => window.slVueTree.comparePaths(a.path, b.path))
						commit('createSprint', { sprintId: payload.sprintId, featureMap: state.featureMap, pbiResults: state.pbiResults, taskResults })
						busyLoading = false
						loadRequests--
						if (loadRequests > 0) {
							loadRequests--
							dispatch('loadPlanningBoard', payload)
						} else if (isCurrentSprint(payload.sprintId)) dispatch('loadUnfinished', rootState.userData.myTeam)
					}
				})
			}).catch(error => {
				const msg = 'loadPlanningBoard: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		} loadRequests++
	},

	/* Extend featureMap and pbiResults with PBIs moved to another sprint */
	loadMissingPbis({
		rootState,
		state,
		dispatch
	}, payload) {
		const docsToGet = []
		for (const id of payload.missingPbiIds) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const newPbiResult = {
						id: doc._id,
						key: [doc.printId, doc.team, doc.productId, doc.parentId, doc.level, doc.priority],
						value: [doc.title, doc.subtype, doc.state, doc.spsize, doc.taskOwner]
					}
					const featureId = doc.parentId
					const feature = window.slVueTree.getNodeById(featureId)
					if (feature) {
						if (!state.pathsFound.includes(feature.pathStr)) {
							state.featureMap.push({ path: feature.path, id: feature._id })
						}
						state.pathsFound.push(feature.pathStr)
						// stories without a associated feature are skipped
						state.pbiResults.push(newPbiResult)
					}
				}
			}
			payload.onSuccessCallBack()
		}).catch(error => {
			const msg = 'loadMissingPbis: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Load unfinished tasks from previous sprints.
	* Skip tasks from products not assigned to this user.
	* Skip tasks from products where the user is not the PO or developer for that product.
	* Also load the parent (the story) of the unfinished task.
	* Save the task and story ids.
	*/
	loadUnfinished({
		rootState,
		rootGetters,
		state,
		dispatch
	}, team) {
		function isAnyPreviousSprint(sprintId) {
			for (const s of rootState.sprintCalendar) {
				if (s.id === sprintId) {
					return (Date.now() > s.startTimestamp + s.sprintLength)
				}
			}
		}

		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/tasksNotDone?' + composeRangeString2(team)
		}).then(res => {
			const results = res.data.rows
			state.parentIdsToImport = []
			state.taskIdsToImport = []
			for (const r of results) {
				const sprintId = r.key[1]
				const productId = r.key[2]
				if (isAnyPreviousSprint(sprintId)) {
					if (rootGetters.getMyAssignedProductIds.includes(productId) &&
						(rootGetters.getMyProductsRoles[productId].includes('PO') ||
							rootGetters.getMyProductsRoles[productId].includes('developer'))) {
						const parentId = r.key[3]
						if (!state.parentIdsToImport.includes(parentId)) state.parentIdsToImport.push(parentId)
						const id = r.value
						state.taskIdsToImport.push(id)
					} else {
						if (!rootState.cannotImportProducts.includes(productId)) rootState.cannotImportProducts.push(productId)
					}
				}
			}
			const cannotImportCount = rootState.cannotImportProducts.length
			if (cannotImportCount > 0) rootState.warningText = `You cannot import all unfinished tasks as ${cannotImportCount} product(s) are not assigned to you`
		}).catch(error => {
			const msg = 'loadUnfinished: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	importInSprint({
		rootState,
		state,
		dispatch,
		commit
	}, newSprintId) {
		const docsToGet = []
		for (const id of state.parentIdsToImport.concat(state.taskIdsToImport)) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const oldSprintId = doc.sprintId
					doc.sprintId = newSprintId
					if (rootState.lastTreeView === 'detailProduct') {
						// update the tree view
						const node = window.slVueTree.getNodeById(doc._id)
						if (node) commit('updateNodesAndCurrentDoc', { node, sprintId: newSprintId })
					}
					let oldSprintName
					for (const s of rootState.sprintCalendar) {
						if (s.id === oldSprintId) oldSprintName = s.name
					}
					let newSprintName
					for (const s of rootState.sprintCalendar) {
						if (s.id === newSprintId) newSprintName = s.name
					}
					const newHist = {
						importToSprintEvent: [doc.level, doc.subtype, oldSprintName, newSprintName],
						by: rootState.userData.user,
						timestamp: Date.now(),
						sessionId: rootState.mySessionId,
						distributeEvent: false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
			}

			const toDispatch = [
				{ loadPlanningBoard: { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam } },
				// also trigger the reload of other sessions with this board open
				{ triggerBoardReload: { parentId: 'messenger', sprintId: rootState.loadedSprintId } }
			]
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
		}).catch(e => {
			const msg = 'importInSprint: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	updateTasks({
		rootState,
		dispatch
	}, payload) {
		const story = rootState.stories[payload.idx]
		const beforeMoveIds = []
		for (const t of story.tasks[payload.state]) {
			beforeMoveIds.push(t.id)
		}
		// update the tasks
		story.tasks[payload.state] = payload.tasks

		const afterMoveIds = []
		for (const t of story.tasks[payload.state]) {
			afterMoveIds.push(t.id)
		}
		// update the task state change in the database
		if (afterMoveIds.length > beforeMoveIds.length) {
			// task was added
			let newTaskId
			let newTaskPosition = 0
			for (const id of afterMoveIds) {
				if (!beforeMoveIds.includes(id)) {
					newTaskId = id
					break
				}
				newTaskPosition++
			}

			const node = window.slVueTree.getNodeById(newTaskId)
			if (node) dispatch('setState', { node, newState: payload.state, position: newTaskPosition, timestamp: Date.now() })
		} else {
			if (afterMoveIds.length === beforeMoveIds.length) {
				// task changed position, task did not change state
				dispatch('updateMovedTasks', { storyId: story.storyId, afterMoveIds, taskUpdates: payload })
			}
		}
	},

	/* Load the children of the story and update the priorities of the moved tasks */
	updateMovedTasks({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString3(payload.storyId) + '&include_docs=true'
		}).then(res => {
			const docs = res.data.rows.map((r) => r.doc)
			docs.sort((a, b) => b.priority - a.priority)

			const mapper = []
			for (const r of docs) {
				if (payload.afterMoveIds.includes(r._id)) {
					mapper.push({ child: r, priority: r.priority, reordered: true })
				} else mapper.push({ child: r, reordered: false })
			}
			const newChildren = []
			let afterMoveIdx = 0
			for (const m of mapper) {
				if (!m.reordered) {
					newChildren.push(m.child)
				} else {
					for (const d of docs) {
						if (d._id === payload.afterMoveIds[afterMoveIdx]) {
							d.priority = m.priority
							newChildren.push(d)
							afterMoveIdx++
							break
						}
					}
				}
			}
			const toDispatch = [{ syncOtherPlanningBoards: { storyId: payload.storyId, taskUpdates: payload.taskUpdates, afterMoveIds: payload.afterMoveIds } }]

			// must set history
			for (const c of newChildren) {
				const newHist = {
					ignoreEvent: ['updateMovedTasks'],
					timestamp: Date.now(),
					distributeEvent: false
				}
				c.history.unshift(newHist)
			}

			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs: newChildren,
				toDispatch,
				onSuccessCallback: () => {
					if (rootState.lastTreeView === 'detailProduct') {
						// update the position of the tasks of the story and update the index and priority values in the tree
						const storyNode = window.slVueTree.getNodeById(payload.storyId)
						if (!storyNode) return

						const mapper = []
						for (const c of storyNode.children) {
							if (payload.afterMoveIds.includes(c._id)) {
								mapper.push({ child: c, priority: c.data.priority, reordered: true })
							} else mapper.push({ child: c, reordered: false })
						}
						const newTreeChildren = []
						let ind = 0
						let afterMoveIdx = 0
						for (const m of mapper) {
							if (!m.reordered) {
								newTreeChildren.push(m.child)
							} else {
								for (const c of storyNode.children) {
									if (c._id === payload.afterMoveIds[afterMoveIdx]) {
										c.ind = ind
										c.data.priority = m.priority
										newTreeChildren.push(c)
										afterMoveIdx++
										break
									}
								}
							}
							ind++
						}
						storyNode.children = newTreeChildren
					}
				}
			})
		}).catch(e => {
			const msg = 'updateMovedTasks: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Syncs the order of tasks between planning boards */
	syncOtherPlanningBoards({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.storyId
		}).then(res => {
			const tmpDoc = res.data
			// this event is excluded from the history view and uses an object instead of an array to pass data
			const newHist = {
				updateTaskOrderEvent: { sprintId: rootState.loadedSprintId, taskUpdates: payload.taskUpdates, afterMoveIds: payload.afterMoveIds },
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			tmpDoc.history.unshift(newHist)

			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, caller: 'syncOtherPlanningBoards' })
		}).catch(error => {
			const msg = 'setColor: Could not read document with _id ' + payload.storyId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Create an event to trigger a planning reload after items are assigned or unassigned to a sprint */
	triggerBoardReload({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.parentId
		}).then(res => {
			const tmpDoc = res.data
			const newHist = {
				boardReloadEvent: [payload.sprintId, rootState.userData.myTeam],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			// replace the history
			tmpDoc.history = [newHist]

			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, caller: 'triggerBoardReload' })
		}).catch(error => {
			const msg = 'triggerBoardReload: Could not read document with _id ' + payload.parentId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* From the 'Product details' view context menu features and PBI's can be selected to be assigned to the current or next sprint ||
	* for undo: see undoRemoveSprintIds
	*/
	addSprintIds({
		rootState,
		commit,
		dispatch
	}, payload) {
		const docsToGet = []
		for (const id of payload.itemIds) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const reAssigned = doc.sprintId !== undefined
					doc.sprintId = payload.sprintId
					const newHist = {
						addSprintIdsEvent: [doc.level, doc.subtype, payload.sprintName, reAssigned, payload.sprintId],
						by: rootState.userData.user,
						timestamp: Date.now(),
						sessionId: rootState.mySessionId,
						distributeEvent: false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}
			}
			const toDispatch = [{ triggerBoardReload: payload }]
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs,
				toDispatch,
				onSuccessCallback: () => {
					for (const d of docs) {
						// update the tree view and show the history in the current opened item
						const node = window.slVueTree.getNodeById(d._id)
						if (node) commit('updateNodesAndCurrentDoc', { node, sprintId: d.sprintId, newHist: d.history[0] })
					}
					// show child nodes
					const parentNode = window.slVueTree.getNodeById(payload.parentId)
					if (parentNode) parentNode.isExpanded = true
					if (payload.createUndo) {
						// create an entry for undoing the add-to-sprint for use with removeSprintIds action
						const entry = {
							type: 'undoAddSprintIds',
							parentId: payload.parentId,
							sprintId: payload.sprintId,
							itemIds: payload.itemIds,
							sprintName: payload.sprintName
						}
						rootState.changeHistory.unshift(entry)
					} else commit('showLastEvent', { txt: 'Item(s) from sprint removal is undone', severity: SEV.INFO })
				}
			})
		}).catch(e => {
			const msg = 'addSprintIds: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Remove the sprintId only if equal to sprintId specified, leaving items assigned to other sprints untouched */
	removeSprintIds({
		rootState,
		commit,
		dispatch
	}, payload) {
		const docsToGet = []
		for (const id of payload.itemIds) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					doc.sprintId = undefined
					const newHist = {
						removeSprintIdsEvent: [doc.level, doc.subtype, payload.sprintName],
						by: rootState.userData.user,
						timestamp: Date.now(),
						sessionId: rootState.mySessionId,
						distributeEvent: false
					}
					doc.lastChange = Date.now()
					doc.history.unshift(newHist)
					docs.push(doc)
				}
			}

			const toDispatch = [{ triggerBoardReload: payload }]
			dispatch('updateBulk', {
				dbName: rootState.userData.currentDb,
				docs,
				toDispatch,
				onSuccessCallback: () => {
					for (const d of docs) {
						// update the tree view
						const node = window.slVueTree.getNodeById(d._id)
						if (node) commit('updateNodesAndCurrentDoc', { node, sprintId: undefined, newHist: d.history[0] })
					}
					// show children nodes
					window.slVueTree.getNodeById(payload.parentId).isExpanded = true
					// create an entry for undoing the remove-from-sprint in a last-in first-out sequence
					const entry = {
						type: 'undoRemoveSprintIds',
						parentId: payload.parentId,
						itemIds: payload.itemIds,
						sprintId: payload.sprintId,
						sprintName: payload.sprintName
					}
					rootState.changeHistory.unshift(entry)
					commit('showLastEvent', { txt: `The sprint assignment to ${payload.itemIds.length} items is removed`, severity: SEV.INFO })
				}
			})
		}).catch(e => {
			const msg = 'removeSprintIds: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Update the parent history and than save the new document */
	boardAddTask({
		rootState,
		dispatch
	}, payload) {
		// calculate a priority between the prio of the task with the highest prio of this story and the upper limit
		function calcPriority(allTasks) {
			const columns = Object.keys(allTasks)
			let highestPriority = Number.MIN_SAFE_INTEGER
			let taskFound = false
			for (const c of columns) {
				for (const t of allTasks[c]) {
					taskFound = true
					if (t.priority > highestPriority) highestPriority = t.priority
				}
			}
			if (taskFound) {
				return Math.floor(highestPriority + (Number.MAX_SAFE_INTEGER - highestPriority) / 2)
			} else return 0
		}

		// read the story to get the productId and the story title
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.storyId
		}).then(res => {
			const storyDoc = res.data
			// a new task is created in a user story currently on the planning board; calculate its prioriry
			let taskPriority = 0
			for (const s of rootState.stories) {
				if (s.storyId === storyDoc._id) {
					taskPriority = calcPriority(s.tasks)
					break
				}
			}
			// create a new document, including history, and store it on top of the column
			const newDoc = {
				_id: payload.taskId,
				type: 'backlogItem',
				productId: storyDoc.productId,
				parentId: storyDoc._id,
				sprintId: rootState.loadedSprintId,
				team: rootState.userData.myTeam,
				taskOwner: rootState.userData.user,
				level: LEVEL.TASK,
				subtype: 0,
				state: payload.state,
				tssize: 3,
				spsize: 0,
				spikepersonhours: 0,
				reqarea: null,
				dependencies: [],
				conditionalFor: [],
				title: payload.taskTitle,
				followers: [],
				description: window.btoa(''),
				acceptanceCriteria: window.btoa('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: taskPriority,
				comments: [{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
					distributeEvent: false
				}],
				history: [{
					createTaskEvent: [storyDoc.title],
					by: rootState.userData.user,
					timestamp: Date.now(),
					sessionId: rootState.mySessionId,
					distributeEvent: true
				}],
				delmark: false
			}
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: newDoc,
				caller: 'boardAddTask',
				onSuccessCallback: () => {
					if (rootState.lastTreeView === 'detailProduct') {
						// update the tree data
						const newNode = {
							_id: payload.taskId,
							isLeaf: true,
							title: payload.taskTitle,
							dependencies: [],
							conditionalFor: [],
							children: [],
							isExpanded: false,
							isDraggable: true,
							isSelectable: true,
							isSelected: false,
							doShow: true,
							data: {
								state: payload.state,
								subtype: 0,
								sprintId: rootState.loadedSprintId,
								team: rootState.userData.myTeam,
								taskOwner: rootState.userData.user,
								lastChange: Date.now()
							}
						}
						// position the new node as the first child of story
						const cursorPosition = {
							nodeModel: window.slVueTree.getNodeById(storyDoc._id),
							placement: 'inside'
						}
						// insert the new node in the tree and set the productId, parentId, the location parameters and priority
						window.slVueTree.insert(cursorPosition, [newNode])
					}
					// place the task on the planning board
					for (const s of rootState.stories) {
						if (s.storyId === storyDoc._id) {
							const targetColumn = s.tasks[payload.state]
							targetColumn.unshift({
								id: payload.taskId,
								title: payload.taskTitle,
								taskOwner: rootState.userData.user,
								priority: taskPriority
							})
							break
						}
					}
				}
			})
		}).catch(error => {
			const msg = 'boardAddTask: Could not read document with id ' + payload.taskId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	boardUpdateTaskTitle({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.taskId
		}).then(res => {
			const doc = res.data
			const oldTitle = doc.title
			doc.title = payload.newTaskTitle
			const newHist = {
				setTitleEvent: [oldTitle, doc.title],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			doc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: doc,
				caller: 'boardUpdateTaskTitle',
				onSuccessCallback: () => {
					// update the board
					for (const s of rootState.stories) {
						if (s.storyId === doc.parentId) {
							const tasks = s.tasks
							const targetColumn = tasks[doc.state]
							for (const t of targetColumn) {
								if (t.id === doc._id) {
									t.title = doc.title
									break
								}
							}
							break
						}
					}
					if (rootState.lastTreeView === 'detailProduct') {
						// update the tree model
						const node = window.slVueTree.getNodeById(payload.taskId)
						if (node) {
							node.title = doc.title
						}
					}
				}
			})
		}).catch(error => {
			const msg = 'boardUpdateTaskTitle: Could not read document with id ' + payload.taskId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	boardUpdateTaskOwner({
		rootState,
		dispatch,
		commit
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.taskId
		}).then(res => {
			const doc = res.data
			const oldTaskOwner = doc.taskOwner
			doc.taskOwner = payload.newTaskOwner
			const newHist = {
				updateTaskOwnerEvent: [oldTaskOwner, doc.taskOwner],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			doc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: doc,
				caller: 'boardUpdateTaskOwner',
				onSuccessCallback: () => {
					if (rootState.lastTreeView === 'detailProduct') {
						// update the tree model
						const node = window.slVueTree.getNodeById(payload.taskId)
						if (node) {
							commit('updateNodesAndCurrentDoc', { node, taskOwner: doc.taskOwner })
						}
					}
				}
			})
		}).catch(error => {
			const msg = 'boardUpdateTaskOwner: Could not read document with id ' + payload.taskId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	state,
	actions
}
