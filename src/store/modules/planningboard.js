import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const ERROR = 2

function composeRangeString(id) {
	return 'startkey="' + id + '"&endkey="' + id + '"'
}

const actions = {
    loadCurrentSprint({
		rootState,
		dispatch
	}, payload) {
		// globalAxios({
		// 	method: 'GET',
		// 	url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.id)
		// }).then(res => {
		// 	const results = res.data.rows
		// 	if (results.length > 0) {
		// 		// process next level
		// 		dispatch('loadCurrentSprint', { updates: payload.updates, results })
		// 	}

		// }).catch(error => {
		// 	let msg = 'loadCurrentSprint: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
		// 	// eslint-disable-next-line no-console
		// 	if (rootState.debug) console.log(msg)
		// 	dispatch('doLog', { event: msg, level: ERROR })
		// })
	},
}

export default {
	actions
}
