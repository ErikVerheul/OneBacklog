import globalAxios from 'axios'
import { SEV } from '../../constants.js'

function composeRangeString(id) {
	return `startkey="${id}"&endkey="${id}"`
}

const actions = {
	processDescendants({
		rootState,
		dispatch
	}, payload) {
		rootState.descendantIds = []
		for (const r of payload.results) {
			const id = r.id
			rootState.descendantIds.push(id)
			dispatch('updateDescendants', { onSuccessCallback: payload.onSuccessCallback, toDispatch: payload.toDispatch, parentId: id })
		}
		// execute passed function if provided
		if (payload.onSuccessCallback) payload.onSuccessCallback()
		// execute passed actions if provided
		dispatch('additionalActions', payload)
	},

	updateDescendants({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString(payload.parentId)
		}).then(res => {
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('processDescendants', { onSuccessCallback: payload.onSuccessCallback, toDispatch: payload.toDispatch, results })
			}
		}).catch(error => {
			const msg = `updateDescendants: Could not scan the descendants of document with id ${payload.parentId}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}
}

export default {
	actions
}
