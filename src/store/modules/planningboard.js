import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const PBILEVEL = 5
const TASKLEVEL = 6
const TODO = 2
const INPROGRESS = 3
const TESTREVIEW = 4
const DONE = 5


function composeRangeString(id, team) {
	return 'startkey=["' + id + '","' + team + '"]&endkey=["' + id + '","' + team + '"]'
}

const mutations = {
	createSprint(state, payload) {
		const rootState = payload.rootState
		// console.log('createSprint: payload.storieResults = ' + JSON.stringify(payload.storieResults, null, 2))
		for (let i = 0; i < payload.storieResults.length; i++) {
			// console.log('createSprint: i = ' + i + ', payload.storieResults[i].value = ' + JSON.stringify(payload.storieResults[i].value, null, 2))
			const storyId = payload.storieResults[i].id
			const storyTitle = payload.storieResults[i].value[2]
			const subType = payload.storieResults[i].value[4]
			const storySize = payload.storieResults[i].value[6]
			const newStory = {
				idx: i,
				id: storyId,
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
			// console.log('loadPlanningBoard: results = ' + JSON.stringify(results, null, 2))
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

	updateItems({
		rootState,
		dispatch
	}, payload) {
		console.log('updateItems: payload.tasks = ' + JSON.stringify(payload, null, 2))

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
		}
	},
}

export default {
	mutations,
	actions
}
