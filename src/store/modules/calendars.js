import { SEV } from '../../constants.js'
import { createId } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

/* Create a new sprint name from the previous sprint name */
function createNextName(prevName) {
	const baseName = 'sprint-'
	const skipLength = baseName.length
	const lastNumberStr = prevName.substring(skipLength)
	const lastNumber = Number(lastNumberStr)
	return baseName + (lastNumber + 1).toString()
}

/* Extend the default sprint calendar with two extra sprints with the same length as the last sprint */
const actions = {
	extendDefaultSprintCalendar({
		rootState,
		dispatch
	}, payload) {
		const dbName = rootState.userData.currentDb
		const newConfigData = payload.configData
		const extDefaultSprintCalendar = payload.configData.defaultSprintCalendar.slice()
		let newSprintCount = 0
		while (extDefaultSprintCalendar.slice(-1)[0].startTimestamp - extDefaultSprintCalendar.slice(-1)[0].sprintLength < Date.now()) {
			const prevSprint = extDefaultSprintCalendar.slice(-1)[0]
			const newSprint = {
				id: createId(),
				name: createNextName(prevSprint.name),
				startTimestamp: prevSprint.startTimestamp + prevSprint.sprintLength,
				sprintLength: prevSprint.sprintLength
			}
			newSprintCount++
			extDefaultSprintCalendar.push(newSprint)
		}
		newConfigData.defaultSprintCalendar = extDefaultSprintCalendar

		globalAxios({
			method: 'PUT',
			url: dbName + '/config',
			data: newConfigData
		}).then(() => {
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			const msg = `extendDefaultSprintCalendar: The default sprint calendar is automatically extended with ${newSprintCount} sprints`
			dispatch('doLog', { event: msg, level: SEV.INFO })
		}).catch(error => {
			const msg = `extendDefaultSprintCalendar: Could not save the config document of database '${dbName}', ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Get the default sprint calendar of a specific database (for admin use only) */
	fetchDefaultSprintCalendar({
		rootState,
		dispatch
	}, payload) {
		rootState.isDefaultCalendarLoaded = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/config'
		}).then(res => {
			if (res.data.defaultSprintCalendar) {
				rootState.loadedCalendar = res.data.defaultSprintCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchDefaultSprintCalendar: success, ${res.data.defaultSprintCalendar.length} sprint periods are read` })
				rootState.isDefaultCalendarLoaded = true
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'fetchDefaultSprintCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `fetchDefaultSprintCalendar: Could not read config document of database '${payload.dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Save or update the default sprint calendar of a specific database */
	saveDefaultSprintCalendar({
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
				caller: 'saveDefaultSprintCalendar',
				onSuccessCallback: () => {
					rootState.loadedCalendar = payload.newSprintCalendar
					// if updating my current database, update myCurrentSprintCalendar
					if (payload.dbName === rootState.userData.currentDb) {
						rootState.myCurrentSprintCalendar = payload.newSprintCalendar
					}
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `saveDefaultSprintCalendar: success, calendar with ${payload.newSprintCalendar.length} sprint periods is saved` })
					rootState.isCalendarSaved = true
				}
			})
		}).catch(error => {
			const msg = `saveDefaultSprintCalendar: Could not read config document of database ${payload.dbName}. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Get the team sprint calendar of a specific team in a specific database */
	fetchTeamCalendar({
		rootState,
		dispatch
	}, payload) {
		rootState.isTeamCalendarLoaded = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/' + payload.teamId
		}).then(res => {
			if (res.data.teamCalendar) {
				rootState.loadedCalendar = res.data.teamCalendar
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `fetchTeamCalendar: success, ${res.data.teamCalendar.length} sprint periods are read` })
				rootState.isTeamCalendarLoaded = true
				// execute passed function if provided
				if (payload.onSuccessCallback) payload.onSuccessCallback()
			} else rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'fetchTeamCalendar: no calendar is found' })
		}).catch(error => {
			const msg = `fetchTeamCalendar: Could not read team document with id ${payload.teamId} in database '${payload.dbName}'. ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* For use in the startup sequence only.
	* Load the team calendar by _id and if present make it the current team's calendar.
	* If the team calendar does not exist replace the current calendar with the default calendar.
	*/
	loadTeamCalendarAtStartup({
		rootState,
		dispatch
	}, id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			if (doc.teamCalendar && doc.teamCalendar.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(`loadTeamCalendarAtStartup: A team document with calendar is loaded; id = ${id}`)
				// check if the team calendar needs to be extended
				const lastTeamSprint = doc.teamCalendar.slice(-1)[0]
				if (lastTeamSprint.startTimestamp - lastTeamSprint.sprintLength < Date.now()) {
					dispatch('extendTeamCalendar', doc)
				} else {
					// replace the defaultSprintCalendar or other team calendar with this team calendar
					rootState.myCurrentSprintCalendar = doc.teamCalendar
					dispatch('getRoot')
				}
			} else {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(`loadTeamCalendarAtStartup: No team calendar found in team document with id ${id}, the default sprint calendar will be used`)
				rootState.myCurrentSprintCalendar = rootState.configData.defaultSprintCalendar
				dispatch('getRoot')
			}
		}).catch(error => {
			const msg = `loadTeamCalendarAtStartup: Could not read document with id ${id}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* For use in the startup sequence only. */
	extendTeamCalendar({
		rootState,
		dispatch
	}, doc) {
		const extendedTeamCalendar = doc.teamCalendar.slice()
		let newSprintCount = 0
		while (extendedTeamCalendar.slice(-1)[0].startTimestamp - extendedTeamCalendar.slice(-1)[0].sprintLength < Date.now()) {
			const prevSprint = extendedTeamCalendar.slice(-1)[0]
			const newSprint = {
				id: createId(),
				name: createNextName(prevSprint.name),
				startTimestamp: prevSprint.startTimestamp + prevSprint.sprintLength,
				sprintLength: prevSprint.sprintLength
			}
			newSprintCount++
			extendedTeamCalendar.push(newSprint)
		}

		doc.teamCalendar = extendedTeamCalendar
		// update the team with the extended team calendar and continue loading the tree model
		const toDispatch = [{ getRoot: null }]
		dispatch('updateDoc', {
			dbName: rootState.userData.currentDb, updatedDoc: doc, toDispatch, onSuccessCallback: () => {
				// replace the defaultSprintCalendar or other team calendar with this team calendar
				rootState.myCurrentSprintCalendar = extendedTeamCalendar
				const msg = `extendTeamCalendar: The sprint calendar of team '${doc.teamName}' is automatically extended with ${newSprintCount} sprints`
				dispatch('doLog', { event: msg, level: SEV.INFO })
			}, caller: 'extendTeamCalendar'
		})
	}
}

export default {
	actions
}
