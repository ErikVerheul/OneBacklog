import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2
const PBILEVEL = 5
const TASKLEVEL = 6
const TODO = 2
const INPROGRESS = 3
const TESTREVIEW = 4
const DONE = 5
const parentIdToNameMap = {}


function composeRangeString1(id, team) {
	return `startkey=["${id}","${team}",${PBILEVEL}, ${Number.MIN_SAFE_INTEGER}]&endkey=["${id}","${team}",${TASKLEVEL}, ${Number.MAX_SAFE_INTEGER}]`
}

function composeRangeString2(id) {
	return `startkey="${id}"&endkey="${id}"`
}

function getParentName(id) {
	let name = parentIdToNameMap[id]
	if (name) {
		return name
	} else {
		const parent = window.slVueTree.getNodeById(id)
		if (parent) {
			name = parent.title
			parentIdToNameMap[id] = name
			return name
		}
	}
	return 'unknown'
}

const mutations = {
	createSprint(state, payload) {
		const rootState = payload.rootState
		// console.log('createSprint: payload.storieResults = ' + JSON.stringify(payload.storieResults, null, 2))
		for (let i = 0; i < payload.storieResults.length; i++) {
			const storyId = payload.storieResults[i].id
			const featureId = payload.storieResults[i].value[1]
			const featureName = getParentName(featureId)
			const storyTitle = payload.storieResults[i].value[2]
			const subType = payload.storieResults[i].value[4]
			const storySize = payload.storieResults[i].value[6]
			const newStory = {
				idx: i,
				storyId,
				featureId,
				featureName,
				title: storyTitle,
				size: storySize,
				subType,
				tasks: {
					[TODO]: [],
					[INPROGRESS]: [],
					[TESTREVIEW]: [],
					[DONE]: []
				}
			}

			for (let t of payload.taskResults) {
				if (t.value[1] === storyId) {
					const taskState = t.value[5]
					switch (taskState) {
						case TODO:
							newStory.tasks[TODO].push({
								id: t.id,
								text: t.value[2]
							})
							break
						case INPROGRESS:
							newStory.tasks[INPROGRESS].push({
								id: t.id,
								text: t.value[2]
							})
							break
						case TESTREVIEW:
							newStory.tasks[TESTREVIEW].push({
								id: t.id,
								text: t.value[2]
							})
							break
						case DONE:
							newStory.tasks[DONE].push({
								id: t.id,
								text: t.value[2]
							})
							break
					}
				}
			}
			rootState.stories.push(newStory)
		}
	}
}

const actions = {
	loadPlanningBoard({
		rootState,
		commit,
		dispatch
	}, payload) {
		rootState.stories = []
		const storieResults = []
		const taskResults = []
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/sprints?' + composeRangeString1(payload.sprintId, payload.team)
		}).then(res => {
			// save the last loaded sprintId
			rootState.loadedSprintId = payload.sprintId
			// sort the results on parentId --> stories are grouped for the same feature and first created (oldest) features on top
			const results = res.data.rows.sort((a, b) => a.value[1] > b.value[1])
			for (let r of results) {
				const level = r.value[3]
				if (level === PBILEVEL) storieResults.push(r)
				if (level === TASKLEVEL) taskResults.push(r)
			}
			commit('createSprint', { rootState, sprintId: payload.sprintId, storieResults, taskResults })
		}).catch(error => {
			let msg = 'loadPlanningBoard: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateTasks({
		rootState,
		dispatch
	}, payload) {
		const story = rootState.stories[payload.idx]
		const beforeMoveIds = []
		for (let t of story.tasks[payload.state]) {
			beforeMoveIds.push(t.id)
		}
		// update the tasks
		story.tasks[payload.state] = payload.tasks

		const afterMoveIds = []
		for (let t of story.tasks[payload.state]) {
			afterMoveIds.push(t.id)
		}
		// update the task state change in the database
		if (afterMoveIds.length > beforeMoveIds.length) {
			// task was added
			let newTaskId
			let newTaskPosition = 0
			for (let id of afterMoveIds) {
				if (!beforeMoveIds.includes(id)) {
					newTaskId = id
					break
				}
				newTaskPosition++
			}

			dispatch('setState', {
				'id': newTaskId,
				newState: payload.state,
				position: newTaskPosition,
				'timestamp': Date.now(),
			})
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
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString2(payload.storyId) + '&include_docs=true'
		}).then(res => {
            const docs = res.data.rows.map((r) => r.doc)
			docs.sort((a,b) => b.priority - a.priority)

			const mapper = []
			for (let r of docs) {
				if (payload.afterMoveIds.includes(r._id)) {
					mapper.push({ child: r, priority: r.priority, reordered: true })
				} else mapper.push({ child: r, reordered: false })
			}
			const newChildren = []
			let afterMoveIdx = 0
			for (let m of mapper) {
				if (!m.reordered) {
					newChildren.push(m.child)
				} else {
					for (let d of docs) {
						if (d._id === payload.afterMoveIds[afterMoveIdx]) {
							d.priority = m.priority
							newChildren.push(d)
							afterMoveIdx++
							break
						}
					}
				}
			}

			if (rootState.lastTreeView === 'detailProduct') {
				// update the position of the tasks of the story and update the index and priority values in the tree
				const storyNode = window.slVueTree.getNodeById(payload.storyId)
				if (!storyNode) return

				const mapper = []
				for (let c of storyNode.children) {
					if (payload.afterMoveIds.includes(c._id)) {
						mapper.push({ child: c, priority: c.data.priority, reordered: true })
					} else mapper.push({ child: c, reordered: false })
				}
				const newTreeChildren = []
				let ind = 0
				let afterMoveIdx = 0
				for (let m of mapper) {
					if (!m.reordered) {
						newTreeChildren.push(m.child)
					} else {
						for (let c of storyNode.children) {
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

			const toDispatch = {
				syncOtherPlanningBoards: { storyId: payload.storyId, taskUpdates: payload.taskUpdates, afterMoveIds: payload.afterMoveIds }
			}

			// must set history
			for (let c of newChildren) {
				const newHist = {
					"ignoreEvent": ['updateMovedTasks'],
					"timestamp": Date.now(),
					"distributeEvent": false
				}
				c.history.unshift(newHist)
			}

			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs: newChildren, toDispatch, caller: 'updateMovedTasks' })
		}).catch(e => {
			let msg = 'updateMovedTasks: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Syncs the order of tasks between planning boards; does change the priorities in the database; must reload to see the changes in the tree view */
	syncOtherPlanningBoards({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.storyId,
		}).then(res => {
			let tmpDoc = res.data
			// this event is excluded from the history view and uses an object instead of an array to pass data
			const newHist = {
				"updateTaskOrderEvent": { sprintId: rootState.loadedSprintId, taskUpdates: payload.taskUpdates, afterMoveIds: payload.afterMoveIds },
				"by": rootState.userData.user,
				"timestamp": Date.now(),
				"sessionId": rootState.userData.sessionId,
				"distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setColor: Could not read document with _id ' + payload.storyId + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* From the 'Product details' view context menu features and PBI's can be selected to be assigned to the current or next sprint ||
	* for undo: see undoRemoveSprintIds
	* - When a feature is selected all its descendents (PBI's and tasks) are assigned
	* - When a PBI is selected, that PBI and it descendent tasks are assigned
	*/
	addSprintIds({
		rootState,
		commit,
		dispatch
	}, payload) {
		const docsToGet = []
		for (let id of payload.itemIds) {
			docsToGet.push({ "id": id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			let triggerBoardReload = true
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const reAssigned = doc.sprintId !== undefined
					doc.sprintId = payload.sprintId
					// update the tree view
					const node = window.slVueTree.getNodeById(doc._id)
					if (node) node.data.sprintId = payload.sprintId

					const newHist = {
						"addSprintIdsEvent": [doc.level, doc.subtype, payload.sprintName, reAssigned, triggerBoardReload, payload.sprintId],
						"by": rootState.userData.user,
						"timestamp": Date.now(),
						"sessionId": rootState.userData.sessionId,
						"distributeEvent": true
					}
					doc.history.unshift(newHist)
					triggerBoardReload = false
					if (rootState.currentDoc._id === doc._id) commit('updateCurrentDoc', { newHist })
					docs.push(doc)
				}

				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'addSprintIds: These documents cannot change requirement area: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'addSprintIds: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	removeSprintIds({
		rootState,
		commit,
		dispatch
	}, payload) {
		const docsToGet = []
		for (let id of payload.itemIds) {
			docsToGet.push({ "id": id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					doc.sprintId = undefined
					// update the tree view
					const node = window.slVueTree.getNodeById(doc._id)
					if (node) node.data.sprintId = undefined

					const newHist = {
						"removeSprintIdsEvent": [doc.level, doc.subtype, payload.sprintName],
						"by": rootState.userData.user,
						"timestamp": Date.now(),
						"sessionId": rootState.userData.sessionId,
						"distributeEvent": true
					}
					doc.history.unshift(newHist)
					if (rootState.currentDoc._id === doc._id) commit('updateCurrentDoc', { newHist })
					docs.push(doc)
				}

				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'removeSprintIds: These documents cannot change requirement area: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'removeSprintIds: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},
}

export default {
	mutations,
	actions
}
