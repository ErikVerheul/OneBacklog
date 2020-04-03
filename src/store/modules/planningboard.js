import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const PBILEVEL = 5
const TASKLEVEL = 6
const TODO = 0
const INPROGRESS = 1
const TESTREVIEW = 2
const DONE = 3


function composeRangeString(id) {
	return 'startkey="' + id + '"&endkey="' + id + '"'
}

const mutations = {
	createSprint(state, payload) {
		const rootState = payload.rootState
		// console.log('createSprint: payload.storieResults = ' + JSON.stringify(payload.storieResults, null, 2))
		for (let i = 0; i < payload.storieResults.length; i++) {
			// console.log('createSprint: i = ' + i + ', payload.storieResults[i].value = ' + JSON.stringify(payload.storieResults[i].value, null, 2))
			const storyId = payload.storieResults[i].id
			const storyTitle = payload.storieResults[i].value[2]
			const storySize = payload.storieResults[i].value[6]
			const newStory = {
					idx: i,
					id: storyId,
					title: storyTitle,
					size: storySize,
					tasks: {
						todo: [],
						inProgress: [],
						testReview: [],
						done: []
					}
				}
			for (let t of payload.taskResults) {
				if (t.value[1] === storyId) {
					const taskState = t.value[5]
					switch (taskState) {
						case TODO:
							newStory.tasks.todo.push({
								id: t.id.slice(-5),
								text: t.value[2]
							})
							break
						case INPROGRESS:
							newStory.tasks.inProgress.push({
								id: t.id.slice(-5),
								text: t.value[2]
							})
							break
						case TESTREVIEW:
							newStory.tasks.testReview.push({
								id: t.id.slice(-5),
								text: t.value[2]
							})
							break
						case DONE:
							newStory.tasks.done.push({
								id: t.id.slice(-5),
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
		console.log('loadPlanningBoard: is called')
		rootState.stories = []
		const storieResults = []
		const taskResults = []
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/sprints?' + composeRangeString(payload.id)
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
}

export default {
	mutations,
	actions
}
