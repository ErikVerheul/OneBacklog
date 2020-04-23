import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

const ERROR = 2
const PBILEVEL = 5
const TASKLEVEL = 6
const TODO = 2
const INPROGRESS = 3
const TESTREVIEW = 4
const DONE = 5


function composeRangeString(id, team) {
	return `startkey=["${id}","${team}",${PBILEVEL}, ${Number.MIN_SAFE_INTEGER}]&endkey=["${id}","${team}",${TASKLEVEL}, ${Number.MAX_SAFE_INTEGER}]`
}

const mutations = {
	createSprint(state, payload) {
		const rootState = payload.rootState
		// console.log('createSprint: payload.storieResults = ' + JSON.stringify(payload.storieResults, null, 2))
		for (let i = 0; i < payload.storieResults.length; i++) {
			const storyId = payload.storieResults[i].id
			const storyTitle = payload.storieResults[i].value[2]
			const subType = payload.storieResults[i].value[4]
			const storySize = payload.storieResults[i].value[6]
			const newStory = {
				idx: i,
				storyId,
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
			url: rootState.userData.currentDb + '/_design/design1/_view/sprints?' + composeRangeString(payload.sprint.id, payload.team)
		}).then(res => {
			const results = res.data.rows
			for (let r of results) {
				const level = r.value[3]
				if (level === PBILEVEL) storieResults.push(r)
				if (level === TASKLEVEL) taskResults.push(r)
			}
			commit('createSprint', { rootState, storieResults, taskResults })
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
		const beforeMoveIds = []
		for (let t of rootState.stories[payload.idx].tasks[payload.id]) {
			beforeMoveIds.push(t.id)
		}
		// update the tasks
		rootState.stories[payload.idx].tasks[payload.id] = payload.tasks

		const afterMoveIds = []
		for (let t of rootState.stories[payload.idx].tasks[payload.id]) {
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
				newState: payload.id,
				position: newTaskPosition,
				'timestamp': Date.now(),
			})
		} else {
			if (afterMoveIds.length === beforeMoveIds.length) {
				dispatch('resetTaskPriorities', afterMoveIds)
				dispatch('syncOtherPlanningBoards', payload)
			}
		}
	},

	resetTaskPriorities({
		rootState,
		dispatch
	}, afterMoveIds) {
		const docsToGet = []
		for (let id of afterMoveIds) {
			docsToGet.push({ "id": id })
		}
		const stepSize = Math.floor((Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) / (afterMoveIds.length + 1))
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			function getIndex(id) {
				for (let i = 0; i < afterMoveIds.length; i++) {
					if (afterMoveIds[i] === id) return i
				}
			}

			for (let r of results) {
				const envelope = r.docs[0]
				if (envelope.ok) {
					const doc = envelope.ok
					const idx = getIndex(doc._id)
					doc.priority = Math.floor(Number.MAX_SAFE_INTEGER - (idx + 1) * stepSize)
					const newHist = {
						"ignoreEvent": ['resetTaskPriorities'],
						"timestamp": Date.now(),
						"distributeEvent": false
					}
					doc.history.unshift(newHist)
					docs.push(doc)
				}

				if (envelope.error) error.push(envelope.error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'resetTaskPriorities: These documents cannot change requirement area: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('updateBulk', { dbName: rootState.userData.currentDb, docs })
		}).catch(e => {
			let msg = 'resetTaskPriorities: Could not read batch of documents: ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	syncOtherPlanningBoards({
		rootState,
		dispatch
	}, payload) {
		let _id
		for (let s of rootState.stories) {
			if (s.idx === payload.idx) {
				_id = s.storyId
			}
		}
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			let tmpDoc = res.data
			// this event is excluded from the history view
			const newHist = {
				"updateTaskOrderEvent": payload,
				"by": rootState.userData.user,
                "timestamp": Date.now(),
                "sessionId": rootState.userData.sessionId,
                "distributeEvent": true
			}
			tmpDoc.history.unshift(newHist)
			dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
		}).catch(error => {
			let msg = 'setColor: Could not read document with _id ' + _id + ', ' + error
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
