import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

import router from '../../router'

const INFO = 0
const ERROR = 2

function createId() {
	// A copy of createId() in the component mixins: Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
	const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
	return Date.now().toString().concat(ext)
}

const actions = {
	/*
	* Order of execution:
	* 1. getDatabases
	* 2. getOtherUserData
	* 3. getAllProducts and call updateUser if databases or products are missing
	* 4. getConfig
	* 5. getAllTeams and load the team calendar if present
	* 6. if the team calendar is present and ran out of sprints, extend this calender with new sprints and save the team document
	* 7. getRoot and route to products view
	*/

	/* Get all non-backup and non system database names */
	getDatabases({
		rootState,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: '/_all_dbs'
		}).then(res => {
			const foundDbNames = []
			for (const dbName of res.data) {
				if (!dbName.startsWith('_') && !dbName.includes('backup')) foundDbNames.push(dbName)
			}
			dispatch('getOtherUserData', foundDbNames)
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('getDatabases: Database names are loaded: ' + foundDbNames)
		}).catch(error => {
			const msg = 'getDatabases: Could not load the database names. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get the current DB name etc for this user. Note that the user global roles are already fetched */
	getOtherUserData({
		rootState,
		dispatch
	}, foundDbNames) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const allUserData = res.data
			// check if the default user database exists
			if (!foundDbNames.includes(allUserData.currentDb)) {
				alert('getOtherUserData: FATAL ERROR - default user database ' + allUserData.currentDb + ' does not exist!')
				return
			}
			// check if the user has productsroles defined for the default database
			if (!Object.keys(allUserData.myDatabases).includes(allUserData.currentDb)) {
				alert('getOtherUserData: FATAL ERROR - no roles defined for default user database ' + allUserData.currentDb)
				return
			}
			// correct the profile for removed databases and renew the list of assigned databases
			rootState.myAssignedDatabases = []
			for (const db of Object.keys(allUserData.myDatabases)) {
				if (!foundDbNames.includes(db)) {
					delete allUserData.myDatabases[db]
				} else rootState.myAssignedDatabases.push(db)
			}

			// start the watchdog
			dispatch('watchdog')
			const msg = `getOtherUserData: '${allUserData.name}' has signed-in in database '${allUserData.currentDb}'`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			// now that the database is known, the log file is available
			dispatch('doLog', { event: msg, level: INFO })
			dispatch('getAllProducts', { allUserData })
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				// the user profile does not exist; if online, start one time initialization of a new database if a server admin signed in
				if (rootState.online && rootState.iAmServerAdmin) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('Server admin logged in but has no profile in users database. Start init')
					rootState.showHeaderDropDowns = false
					rootState.backendMessages = []
					router.push('/init')
					return
				}
			}
			const msg = 'getOtherUserData: Could not read user date for user ' + rootState.userData.user + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Get all products of the current database and correct the data from the user profile with the actual available products */
	getAllProducts({
		rootState,
		dispatch,
	}, payload) {
		const dbName = payload.allUserData.currentDb
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/products'
		}).then(res => {
			const newUserData = payload.allUserData
			const currentProductsEnvelope = res.data.rows
			const currentDbSettings = newUserData.myDatabases[newUserData.currentDb]
			const productsRoles = currentDbSettings.productsRoles
			// store the available product id's
			for (const product of currentProductsEnvelope) {
				const id = product.id
				rootState.availableProductIds.push(id)
			}
			// set the users product options to select from
			for (const product of currentProductsEnvelope) {
				if (Object.keys(productsRoles).includes(product.id)) {
					rootState.myProductOptions.push({
						value: product.id,
						text: product.value
					})
				}
			}
			// update the user profile for missing products
			const missingProductsRolesIds = []
			for (const id of Object.keys(productsRoles)) {
				if (!rootState.availableProductIds.includes(id)) {
					missingProductsRolesIds.push(id)
				}
			}
			if (rootState.autoCorrectUserProfile && missingProductsRolesIds.length > 0) {
				for (const id of missingProductsRolesIds) {
					delete productsRoles[id]
					const position = newUserData.myDatabases[newUserData.currentDb].subscriptions.indexOf(id)
					if (position !== -1) newUserData.myDatabases[newUserData.currentDb].subscriptions.splice(position, 1)
				}
			}
			if (Object.keys(productsRoles).length > 0) {
				rootState.isProductAssigned = true
				// the first (index 0) product in the current db settings is by definition the default product
				rootState.currentDefaultProductId = Object.keys(currentDbSettings.productsRoles)[0]
			}
			// update user data loaded in getOtherUserData and STORE THE USER DATA in $store.state.userData
			// postpone the warning message for 'no product found' until the configuration is loaded
			const toDispatch = [{ getConfig: null }]
			dispatch('updateUser', { data: newUserData, toDispatch, caller: 'getAllProducts' })

			if (missingProductsRolesIds.length > 0) {
				const msg = `User profile of user ${newUserData.name} is updated for missing products with ids ${missingProductsRolesIds}`
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: INFO })
			}
		}).catch(error => {
			const msg = 'getAllProducts: Could not find products in database ' + dbName + ' ,' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Load the config document from this database */
	getConfig({
		rootState,
		rootGetters,
		dispatch,
		commit
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config'
		}).then(res => {
			rootState.configData = res.data
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The configuration is loaded')
			if (!rootState.isProductAssigned) {
				if (rootGetters.isServerAdmin) { router.replace('/serveradmin') } else
					if (rootGetters.isAdmin) { router.replace('/admin') } else {
						alert('Error: No default product is set. Consult your administrator. The application will exit.')
						commit('resetData', null, { root: true })
						router.replace('/')
					}
			} else {
				if (rootState.configData.defaultSprintCalendar) {
					const lastSprint = rootState.configData.defaultSprintCalendar.slice(-1)[0]
					if (lastSprint.startTimestamp - lastSprint.sprintLength < Date.now()) {
						// sprint calendar ran out of sprints
						if (rootGetters.isAdmin) {
							alert('Error: The default sprint calendar ran out of sprints. You will be redirected to the Admin view where you can extend the calendar.')
							commit('mustCreateDefaultCalendar')
							router.replace('/admin')
						} else {
							alert('Error: The default sprint calendar ran out of sprints. Consult your administrator. The application will exit.')
							commit('resetData', null, { root: true })
							router.replace('/')
						}
					} else {
						// assign the default calendar to the sprint calendar; this calendar will be replaced if a team has its own calendar
						rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
						dispatch('getAllTeams')
					}
				} else {
					// missing calendar
					if (rootGetters.isAdmin) {
						alert('Error: No default sprint calendar is set. You will be redirected to the Admin view where you can create one.')
						commit('mustCreateDefaultCalendar')
						router.replace('/admin')
					} else {
						alert('Error: No default sprint calendar is set. Consult your administrator. The application will exit.')
						commit('resetData', null, { root: true })
						router.replace('/')
					}
				}
			}
		}).catch(error => {
			const msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	getAllTeams({
		rootState,
		dispatch
	}) {
		rootState.allTeams = {}
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/teams'
		}).then(res => {
			const teams = res.data.rows
			let userInATeam = false
			for (const t of teams) {
				rootState.allTeams[t.key] = { id: t.id, members: t.value }
				if (rootState.userData.myTeam === t.key) {
					userInATeam = true
					// load team calendar if present
					dispatch('loadTeamCalendar', t.id)
				}
			}
			if (!userInATeam) {
				// continue to load the tree model
				dispatch('getRoot')
			}
		}).catch(error => {
			const msg = `getAllTeams: Could not read the teams in database '${rootState.userData.currentDb}', ${error}`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Load the team calendar by _id and if present make it the current team's calendar.
	* If the team calendar does not exist replace the current calendar with the default calendar.
	*/
	loadTeamCalendar({
		rootState,
		rootGetters,
		dispatch
	}, id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + id
		}).then(res => {
			const doc = res.data
			if (doc.teamCalendar && doc.teamCalendar.length > 0) {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadTeamCalendar: Team document with calendar is loaded; id = ' + id)
				// check if the team calendar needs to be extended
				const lastTeamSprint = doc.teamCalendar.slice(-1)[0]
				if (lastTeamSprint.startTimestamp - lastTeamSprint.sprintLength < Date.now()) {
					dispatch('extendTeamCalendar', doc)
				} else {
					// replace the defaultSprintCalendar or other team calendar with this team calendar
					rootState.sprintCalendar = doc.teamCalendar
					dispatch('getRoot')
				}
			} else {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadTeamCalendar: No team calendar found in team document; id = ' + id)
				if (rootGetters.teamCalendarInUse) {
					// replace the team calendar with the default
					rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
				}
				dispatch('getRoot')
			}
		}).catch(error => {
			const msg = 'loadTeamCalendar: Could not read document with id ' + id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	extendTeamCalendar({
		rootState,
		dispatch
	}, doc) {
		const extTeamCalendar = doc.teamCalendar.slice()
		function createName(prevSprintName) {
			if (prevSprintName.startsWith('sprint-')) {
				const prevSprintNrStr = prevSprintName.substr(7)
				const prevSprintNr = parseInt(prevSprintNrStr)
				return 'sprint-' + (prevSprintNr + 1)
			}
		}
		let newSprintCount = 0
		while (extTeamCalendar.slice(-1)[0].startTimestamp - extTeamCalendar.slice(-1)[0].sprintLength < Date.now()) {
			const prevSprint = extTeamCalendar.slice(-1)[0]
			const newSprint = {
				id: createId(),
				name: createName(prevSprint.name),
				startTimestamp: prevSprint.startTimestamp + prevSprint.sprintLength,
				sprintLength: prevSprint.sprintLength
			}
			newSprintCount++
			extTeamCalendar.push(newSprint)
			const msg = `The sprint calendar of team '${doc.teamName}' is automatically extended with ${newSprintCount} sprints`
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: INFO })
		}

		doc.teamCalendar = extTeamCalendar
		// replace the defaultSprintCalendar or other team calendar with this team calendar
		rootState.sprintCalendar = extTeamCalendar
		// update the team with the extended team calendar and continue loading the tree model
		const toDispatch = [{ getRoot: null }]
		dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: doc, toDispatch, caller: 'extendTeamCalendar' })
	},

	/* Load the root of the backlog items into the current document */
	getRoot({
		rootState,
		commit,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/root'
		}).then(res => {
			commit('updateNodesAndCurrentDoc', { newDoc: res.data })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('The root document is read')
			// open the products view by default
			router.push('/detailProduct')
		}).catch(error => {
			let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
			if (error.response && error.response.status === 404) {
				msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}

}

export default {
	actions
}
