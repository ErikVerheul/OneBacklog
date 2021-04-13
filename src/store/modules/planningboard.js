import { SEV, LEVEL, STATE } from '../../constants.js'
import { getSprintNameById } from '../../common_functions.js'
import { expandNode } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

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
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}
function composeRangeString4(delmark, id) {
	return `startkey=["${delmark}","${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${delmark}","${id}",${Number.MAX_SAFE_INTEGER}]`
}

function removeFromBoard(commit, doc, removedSprintId) {
	if (removedSprintId === '*' || doc.sprintId === undefined || doc.sprintId === removedSprintId) {
		// remove from all sprints ('*') ELSE do not remove items assigned to other sprints (note that the sprintId might not be deleted from the document before this code is executed)
		if (doc.level === LEVEL.PBI) commit('removeStoryFromBoard', doc._id)
		if (doc.level === LEVEL.TASK) commit('removeTaskFromBoard', { storyId: doc.parentId, taskId: doc._id, taskState: doc.state })
	}
}

const state = {
	itemIdsToImport: [],
	featureMap: [],
	pbiResults: [],
	pathsFound: [],
	stories: [],
}

const mutations = {
	/* Show the items in the order as they appear in the tree view */
	createSprint(state, payload) {
		const featureIdToNodeMap = {}
		const epicIdToNodeMap = {}
		const productIdToNodeMap = {}
		function getParentNode(id, parentIdToNodeMap) {
			let parent = parentIdToNodeMap[id]
			if (parent) {
				return parent
			} else {
				parent = window.slVueTree.getNodeById(id)
				if (parent) {
					parentIdToNodeMap[id] = parent
					return parent
				}
			}
			return null
		}

		let storyIdx = 0
		for (const f of payload.featureMap) {
			for (const s of payload.pbiResults) {
				const featureId = s.key[3]
				if (f.id === featureId) {
					const storyId = s.id
					const productId = s.key[2]
					const storyTitle = s.value[0]
					const featureNode = getParentNode(featureId, featureIdToNodeMap)
					if (!featureNode) continue

					const featureName = featureNode.title
					const epicNode = getParentNode(featureNode.parentId, epicIdToNodeMap)
					if (!epicNode) continue

					const epicName = epicNode.title
					const productNode = getParentNode(epicNode.parentId, productIdToNodeMap)
					if (!productNode) continue

					const productName = productNode.title
					const subType = s.value[1]
					const storySize = s.value[3]
					const newStory = {
						idx: storyIdx,
						storyId,
						featureId,
						featureName,
						epicName,
						productId,
						productName,
						title: storyTitle,
						size: storySize,
						subType,
						tasks: {
							[STATE.ON_HOLD]: [],
							[STATE.TODO]: [],
							[STATE.INPROGRESS]: [],
							[STATE.TESTREVIEW]: [],
							[STATE.DONE]: []
						}
					}

					for (const t of payload.taskResults) {
						if (t.key[3] === storyId) {
							const taskState = t.value[2]
							switch (taskState) {
								case STATE.ON_HOLD:
									newStory.tasks[STATE.ON_HOLD].push({
										id: t.id,
										title: t.value[0],
										taskOwner: t.value[4],
										priority: -t.key[5]
									})
									break
								case STATE.TODO:
								case STATE.READY:
									newStory.tasks[STATE.TODO].push({
										id: t.id,
										title: t.value[0],
										taskOwner: t.value[4],
										priority: -t.key[5]
									})
									break
								case STATE.INPROGRESS:
									newStory.tasks[STATE.INPROGRESS].push({
										id: t.id,
										title: t.value[0],
										taskOwner: t.value[4],
										priority: -t.key[5]
									})
									break
								case STATE.TESTREVIEW:
									newStory.tasks[STATE.TESTREVIEW].push({
										id: t.id,
										title: t.value[0],
										taskOwner: t.value[4],
										priority: -t.key[5]
									})
									break
								case STATE.DONE:
									newStory.tasks[STATE.DONE].push({
										id: t.id,
										title: t.value[0],
										taskOwner: t.value[4],
										priority: -t.key[5]
									})
									break
							}
						}
					}
					state.stories.push(newStory)
					storyIdx++
				}
			}
		}
	},

	/* Add the task to the planning board */
	addTaskToBoard(state, doc) {
		for (const s of state.stories) {
			if (s.storyId === doc.parentId) {
				const targetColumn = s.tasks[doc.state]
				targetColumn.unshift({
					id: doc._id,
					title: doc.title,
					taskOwner: doc.taskOwner,
					priority: doc.priority
				})
				targetColumn.sort((a, b) => b.priority - a.priority)
				break
			}
		}
	},

	/* Remove the task from the planning board */
	removeTaskFromBoard(state, payload) {
		for (const s of state.stories) {
			if (s.storyId === payload.storyId) {
				const targetColumn = s.tasks[payload.taskState]
				const newTargetColumn = []
				for (const c of targetColumn) {
					if (c.id !== payload.taskId) {
						newTargetColumn.push(c)
					}
				}
				s.tasks[payload.taskState] = newTargetColumn
				break
			}
		}
	},

	/* Remove the story from the planning board */
	removeStoryFromBoard(state, storyId) {
		const updatedStories = []
		let idx = 0
		for (const s of state.stories) {
			if (s.storyId !== storyId) {
				// repair the index
				s.idx = idx
				updatedStories.push(s)
				idx++
			}
		}
		state.stories = updatedStories
	}
}

const getters = {
	getStoryPoints(state) {
		let sum = 0
		for (const s of state.stories) {
			sum += s.size
		}
		return sum
	},
	getStoryPointsDone(state) {
		let sum = 0
		for (const s of state.stories) {
			if (s.tasks[STATE.TODO].length === 0 &&
				s.tasks[STATE.INPROGRESS].length === 0 &&
				s.tasks[STATE.TESTREVIEW].length === 0 &&
				s.tasks[STATE.DONE].length > 0) sum += s.size
		}
		return sum
	}
}

const actions = {
	/* Multiple calls to this action are serialized */
	loadPlanningBoard({
		rootState,
		state,
		commit,
		dispatch
	}, payload) {
		state.itemIdsToImport = []
		function isCurrentSprint(sprintId) {
			for (const s of rootState.myCurrentSprintCalendar) {
				if (s.id === sprintId) {
					return (Date.now() > s.startTimestamp && Date.now() < s.startTimestamp + s.sprintLength)
				}
			}
		}
		if (!busyLoading) {
			busyLoading = true
			state.stories = []
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

				const paintSprintLanes = () => {
					// order the items as in the tree view
					state.featureMap.sort((a, b) => window.slVueTree.comparePaths(a.path, b.path))
					commit('createSprint', { rootState, sprintId: payload.sprintId, featureMap: state.featureMap, pbiResults: state.pbiResults, taskResults })
					busyLoading = false
					loadRequests--
					if (loadRequests > 0) {
						loadRequests--
						dispatch('loadPlanningBoard', payload)
					} else if (isCurrentSprint(payload.sprintId)) dispatch('loadUnfinished', rootState.userData.myTeam)
				}

				if (missingPbiIds.length > 0) {
					dispatch('loadMissingPbis', {
						missingPbiIds,
						onSuccessCallBack: paintSprintLanes
					})
				} else paintSprintLanes()
			}).catch(error => {
				const msg = 'loadPlanningBoard: Could not read the items from database ' + rootState.userData.currentDb + ', ' + error
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Select unfinished pbi's and tasks from previous sprints.
	* Skip items from products not assigned to this user.
	* Skip items from products where the user is not the PO or developer for that product.
	* Select PBI's that are not Done with or without child tasks.
	* Select tasks that are not Done including their parent PBI.
	* Return the id's in state.itemIdsToImport
	*/
	loadUnfinished({
		rootState,
		rootGetters,
		state,
		dispatch
	}, team) {
		function isPreviousSprint(sprintId) {
			for (const s of rootState.myCurrentSprintCalendar) {
				if (s.id === sprintId) {
					return (Date.now() > s.startTimestamp + s.sprintLength)
				}
			}
		}

		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/itemsNotDone?' + composeRangeString2(team)
		}).then(res => {
			const results = res.data.rows
			state.itemIdsToImport = []
			const cannotImportProducts = []
			for (const r of results) {
				const sprintId = r.key[1]
				if (isPreviousSprint(sprintId)) {
					const productId = r.key[2]
					if (rootGetters.getMyAssignedProductIds.includes(productId) && rootGetters.getMyProductsRoles[productId].includes('PO' || rootGetters.getMyProductsRoles[productId].includes('developer'))) {
						if (r.value === LEVEL.PBI) {
							const id = r.id
							if (!state.itemIdsToImport.includes(id)) state.itemIdsToImport.push(id)
						}
						if (r.value === LEVEL.TASK) {
							const parentId = r.key[3]
							if (!state.itemIdsToImport.includes(parentId)) state.itemIdsToImport.push(parentId)
							const id = r.id
							if (!state.itemIdsToImport.includes(id)) state.itemIdsToImport.push(id)
						}
					} else {
						if (!cannotImportProducts.includes(productId)) cannotImportProducts.push(productId)
					}
				}
			}
			const cannotImportCount = cannotImportProducts.length
			if (cannotImportCount > 0) rootState.warningText = `You cannot import all unfinished tasks as ${cannotImportCount} product(s) are not assigned to you`
		}).catch(error => {
			const msg = `loadUnfinished: Could not read the items from database ${rootState.userData.currentDb}. ${error}`
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
		for (const id of state.itemIdsToImport) {
			docsToGet.push({ id: id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { docs: docsToGet }
		}).then(res => {
			const results = res.data.results
			const docs = []
			const timestamp = Date.now()
			for (const r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const oldSprintId = doc.sprintId
					doc.sprintId = newSprintId
					doc.lastChange = timestamp
					let oldSprintName
					for (const s of rootState.myCurrentSprintCalendar) {
						if (s.id === oldSprintId) oldSprintName = s.name
					}
					let newSprintName
					for (const s of rootState.myCurrentSprintCalendar) {
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

					if (rootState.lastTreeView === 'detailProduct') {
						// update the tree view
						const node = window.slVueTree.getNodeById(doc._id)
						if (node) commit('updateNodesAndCurrentDoc', { node, sprintId: newSprintId, lastChange: timestamp, newHist })
					}
					docs.push(doc)
				}
			}

			const toDispatch = [
				{ loadPlanningBoard: { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam } },
				// also trigger the reload of other sessions with this board open
				{ triggerBoardReload: { parentId: 'messenger', sprintId: rootState.loadedSprintId } }
			]
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs, toDispatch })
		}).catch(error => {
			const msg = 'importInSprint: Could not read batch of documents, ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	updateTasks({
		state,
		dispatch
	}, payload) {
		const story = state.stories[payload.idx]
		const beforeMoveIds = []
		for (const t of story.tasks[payload.taskState]) {
			beforeMoveIds.push(t.id)
		}
		// update the tasks
		story.tasks[payload.taskState] = payload.tasks

		const afterMoveIds = []
		for (const t of story.tasks[payload.taskState]) {
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
			if (node) dispatch('setState', { node, newState: payload.taskState, position: newTaskPosition, timestamp: Date.now() })
		} else {
			if (afterMoveIds.length === beforeMoveIds.length) {
				// task changed position, task did not change state; must swap priorities
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
				toDispatch: [{ syncOtherPlanningBoards: { storyId: payload.storyId, taskUpdates: payload.taskUpdates, afterMoveIds: payload.afterMoveIds } }],
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
		}).catch(error => {
			const msg = `updateMovedTasks: Could not fetch the child documents of document with id ${payload.storyId} in database ${rootState.userData.currentDb}. ${error}`
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
				distributeEvent: true,
				updateBoards: { update: true }
			}
			tmpDoc.history.unshift(newHist)

			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc, caller: 'syncOtherPlanningBoards' })
		}).catch(error => {
			const msg = `syncOtherPlanningBoards: Could not read document with id ${payload.storyId}. ${error}`
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* From the 'Product details' view context menu PBI's can be selected to be assigned to the current or next sprint ||
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
					if (parentNode) expandNode(parentNode)
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
		}).catch(error => {
			const msg = 'addSprintIds: Could not read batch of documents, ' + error
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
					const removedSprintId = doc.sprintId
					delete doc.sprintId
					const newHist = {
						removeSprintIdsEvent: [doc.level, doc.subtype, payload.sprintName, removedSprintId],
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
					expandNode(window.slVueTree.getNodeById(payload.parentId))
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
		}).catch(error => {
			const msg = 'removeSprintIds: Could not read batch of documents, ' + error
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
			for (const s of state.stories) {
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
				state: payload.taskState,
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
					distributeEvent: true,
					updateBoards: { update: true }
				}]
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
								state: payload.taskState,
								subtype: 0,
								sprintId: rootState.loadedSprintId,
								team: rootState.userData.myTeam,
								taskOwner: rootState.userData.user,
								lastChange: Date.now()
							},
							tmp: {}
						}
						// position the new node as the first child of story
						const cursorPosition = {
							nodeModel: window.slVueTree.getNodeById(storyDoc._id),
							placement: 'inside'
						}
						// insert the new node in the tree and set the productId, parentId, the location parameters and priority
						window.slVueTree.insertNodes(cursorPosition, [newNode])
					}
					// place the task on the planning board
					for (const s of state.stories) {
						if (s.storyId === storyDoc._id) {
							const targetColumn = s.tasks[payload.taskState]
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Remove a story from the sprint and update the planning board. Also remove the sprintId from the node if the Details view is active.*/
	boardRemoveStoryFromSprint({
		rootState,
		dispatch
	}, storyId) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + storyId
		}).then(res => {
			const storyDoc = res.data
			const removedSprintId = storyDoc.sprintId
			delete storyDoc.sprintId
			const newHist = {
				removeStoryEvent: [storyDoc.level, storyDoc.subtype, getSprintNameById(rootState.loadedSprintId, rootState.myCurrentSprintCalendar), removedSprintId],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true
			}
			storyDoc.lastChange = Date.now()
			storyDoc.history.unshift(newHist)

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: storyDoc,
				caller: 'boardRemoveStoryFromSprint', toDispatch: [{ removeSprintFromChildren: { storyId, removedSprintId } }],
				onSuccessCallback: () => {
					if (rootState.lastTreeView === 'detailProduct') {
						// remove the sprintId from the node in the tree view
						const node = window.slVueTree.getNodeById(storyId)
						if (node) {
							delete node.data.sprintId
							// remove the sprintId from the tasks
							if (node.children) {
								for (const c of node.children) {
									delete c.data.sprintId
								}
							}
						}
					}
				}
			})
		}).catch(error => {
			const msg = `boardRemoveStoryFromSprint: Could not read document with id ${storyId}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Remove sprintId from the children (tasks) of a User story if the sprintId matches the removedSprintId.
	* Trigger a board reload to other users of the same team and with the same sprint in view.
	*/
	removeSprintFromChildren({
		rootState,
		dispatch,
		commit
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString3(payload.storyId) + '&include_docs=true'
		}).then(res => {
			const results = res.data.rows
			if (results.length > 0) {
				// remove the sprintId from the child document
				const childDocs = results.map(r => r.doc)
				const updatedDocs = []
				for (const doc of childDocs) {
					if (doc.sprintId === payload.removedSprintId) {
						delete doc.sprintId
						const newHist = {
							ignoreEvent: ['removeSprintFromChildren'],
							timestamp: Date.now(),
							distributeEvent: false
						}
						doc.history.unshift(newHist)
						updatedDocs.push(doc)
					}
				}
				dispatch('updateBulk', {
					dbName: rootState.userData.currentDb, docs: updatedDocs, caller: 'removeSprintFromChildren', onSuccessCallback: () => {
						for (const doc of updatedDocs) {
							commit('removeTaskFromBoard', { storyId: doc.parentId, taskId: doc._id, taskState: doc.state })
						}
						commit('removeStoryFromBoard', payload.storyId)
					}
				})
			} else {
				commit('removeStoryFromBoard', payload.storyId)
			}
		}).catch(error => {
			const msg = `removeSprintFromChildren: Could not fetch the child documents of document with id ${payload.storyId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Remove a task from the database and planning board. Also remove the node from the Details view if active. */
	boardRemoveTask({
		rootState,
		dispatch,
		commit
	}, taskId) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + taskId
		}).then(res => {
			const taskDoc = res.data
			const storyId = taskDoc.parentId
			const taskState = taskDoc.state
			const taskTitle = taskDoc.title
			const teamName = taskDoc.team
			taskDoc.delmark = 'true'
			// no use to add history to a removed document
			const newHist = {
				ignoreEvent: ['boardRemoveTask'],
				timestamp: Date.now(),
				distributeEvent: false
			}
			taskDoc.history.unshift(newHist)

			const toDispatch = [{ addHistoryToStory: { storyId, taskId, taskState, taskTitle, teamName } }]
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: taskDoc,
				caller: 'boardRemoveTask',
				toDispatch,
				onSuccessCallback: () => {
					if (rootState.lastTreeView === 'detailProduct') {
						// remove the node from the tree view
						const node = window.slVueTree.getNodeById(taskId)
						if (node) window.slVueTree.removeNodes([node])
					}
					commit('removeTaskFromBoard', { storyId, taskId, taskState })
				}
			})
		}).catch(error => {
			const msg = 'boardRemoveTask: Could not read document with id ' + taskId + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Register the history of the removal of a task in the parent story and trigger an event for synchronization */
	addHistoryToStory({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.storyId
		}).then(res => {
			const storyDoc = res.data
			const newHist = {
				taskRemovedEvent: [payload.taskTitle, payload.teamName, payload.storyId, payload.taskId, payload.taskState],
				by: rootState.userData.user,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: true,
				updateBoards: { update: true }
			}
			storyDoc.history.unshift(newHist)
			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb,
				updatedDoc: storyDoc,
				caller: 'addHistoryToStory'
			})
		}).catch(error => {
			const msg = 'addHistoryToStory: Could not read document with id ' + payload.storyId + ', ' + error
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
					for (const s of state.stories) {
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	////////////////////////////////// board only updates for use by the synchronization feature //////////////////////////

	syncRemoveItemsFromBoard({
		dispatch,
		commit
	}, payload) {
		const doc = payload.doc
		const removedSprintId = payload.removedSprintId
		if (doc.level === LEVEL.PBI || doc.level === LEVEL.TASK) {
			// if the item is a story or task, remove it from the board
			removeFromBoard(commit, doc, removedSprintId)
		}
		if (doc.level < LEVEL.TASK) {
			// process the descendants, if any
			dispatch('removeDescendantsFromBoard', { parentId: doc._id, removedSprintId })
		}
	},

	/* Remove a story from the board and remove its children (tasks) if the sprintId matches the removedSprintId. */
	removeDescendantsFromBoard({
		rootState,
		dispatch
	}, payload) {
		const removedSprintId = payload.removedSprintId
		const parentId = payload.parentId
		// set the url to use the view 'removedDocToParentMap' on a branch removal OR 'docToParentMap' on a sprint removal without document removal
		const url = removedSprintId === '*' ? rootState.userData.currentDb + '/_design/design1/_view/removedDocToParentMap?' + composeRangeString4(payload.delmark, parentId) + '&include_docs=true' :
			rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString3(parentId) + '&include_docs=true'
		globalAxios({
			method: 'GET',
			url
		}).then(res => {
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('remDescFromBoardLoop', { results, removedSprintId })
			}
		}).catch(error => {
			const msg = `removeDescendantsFromBoard: Could not fetch the child documents of document with id ${parentId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	remDescFromBoardLoop({
		dispatch,
		commit
	}, payload) {
		const results = payload.results
		const removedSprintId = payload.removedSprintId
		for (const r of results) {
			dispatch('removeDescendantsFromBoard', { parentId: r.id, removedSprintId })
		}
		// execute story or task board removal
		const childDocs = results.map(r => r.doc)
		for (const doc of childDocs) {
			removeFromBoard(commit, doc, removedSprintId)
		}
	}
}

export default {
	state,
	mutations,
	getters,
	actions
}
