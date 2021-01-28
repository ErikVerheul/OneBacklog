import { SEV } from '../../constants.js'
import { createId }  from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

import router from '../../router'

const actions = {
	/*
	* Order of execution:
	* 1. getDatabases
	* 2. getOtherUserData
	* 3. getAllProducts and call updateUser if databases or products are missing
	* 4. getConfig, load the default sprint calendar and warn the user if it ran out of sprints
	* 5. getAllTeams and load the team calendar if present, extend the team calendar automatically if ran out of sprints
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
			if (rootState.debug) console.log('getDatabases: The database names are loaded: ' + foundDbNames)
		}).catch(error => {
			const msg = 'getDatabases: Could not load the database names. Error = ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
			if (res.data.delmark) {
				alert(`FATAL ERROR - your account '${rootState.userData.user}' has been removed. Contact your adminstrator.`)
				return
			}
			// check if the default user database exists
			if (!foundDbNames.includes(allUserData.currentDb)) {
				alert('FATAL ERROR - default user database ' + allUserData.currentDb + ' does not exist!')
				return
			} else {
				// must set currentDb early in the process
				rootState.userData.currentDb = allUserData.currentDb
				// preset with the current database of the user
				rootState.selectedDatabaseName = allUserData.currentDb
			}
			// check if the user has productsroles defined for the default database
			if (!Object.keys(allUserData.myDatabases).includes(allUserData.currentDb)) {
				alert('FATAL ERROR - no roles defined for default user database ' + allUserData.currentDb)
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
			// now that the database is known, the log file is available
			dispatch('doLog', { event: msg, level: SEV.INFO })
			dispatch('getAllProducts', { allUserData })
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				// the user profile does not exist; if online, start one time initialization of a new database if a server admin signed in
				if (rootState.online && rootState.iAmServerAdmin) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('getOtherUserData: Server admin logged in but has no profile in users database. Start init')
					rootState.showHeaderDropDowns = false
					rootState.backendMessages = []
					router.push('/init')
					return
				}
			}
			const msg = 'getOtherUserData: Could not read user date for user ' + rootState.userData.user + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
			// remove APO and admin roles from product roles in 'old' profiles and sort other roles to ascending priveliges
			for (const [key, roles] of Object.entries(productsRoles)) {
				const newRoles = []
				if (roles.includes('guest')) newRoles.push('guest')
				if (roles.includes('developer')) newRoles.push('developer')
				if (roles.includes('PO')) newRoles.push('PO')
				productsRoles[key] = newRoles
			}
			// store the available product id's
			for (const product of currentProductsEnvelope) {
				const id = product.id
				rootState.availableProductIds.push(id)
			}
			// update the user profile for missing products
			const missingProductsRolesIds = []
			for (const id of Object.keys(productsRoles)) {
				if (!rootState.availableProductIds.includes(id)) {
					missingProductsRolesIds.push(id)
				}
			}
			if (missingProductsRolesIds.length > 0) {
				for (const id of missingProductsRolesIds) {
					delete productsRoles[id]
					const position = newUserData.myDatabases[newUserData.currentDb].subscriptions.indexOf(id)
					if (position !== -1) newUserData.myDatabases[newUserData.currentDb].subscriptions.splice(position, 1)
				}
			}
			if (Object.keys(productsRoles).length > 0) {
				rootState.isProductAssigned = true
			}
			// the user must have at least one product subscription
			if (currentDbSettings.subscriptions.length === 0) {
				if (Object.keys(productsRoles).length > 0) {
					// subscribe the first assigned product
					currentDbSettings.subscriptions = [Object.keys(productsRoles)[0]]
				}
			}
			// update user data loaded in getOtherUserData and STORE THE USER DATA in $store.state.userData
			// postpone the warning message for 'no product found' until the configuration is loaded
			const toDispatch = [{ getConfig: null }]
			dispatch('updateUser', {
				data: newUserData, toDispatch,
				onSuccessCallback: () => {
					// set the users product options to select from
					for (const product of currentProductsEnvelope) {
						if (Object.keys(productsRoles).includes(product.id)) {
							rootState.myProductOptions.push({
								value: product.id,
								text: product.value
							})
						}
					}
				},
				caller: 'getAllProducts'
			})

			if (missingProductsRolesIds.length > 0) {
				const msg = `getAllProducts: User profile of user ${newUserData.name} is updated for missing products with ids ${missingProductsRolesIds}`
				dispatch('doLog', { event: msg, level: SEV.INFO })
			}
		}).catch(error => {
			const msg = 'getAllProducts: Could not find products in database ' + dbName + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
			if (rootState.debug) console.log('getConfig: The configuration is loaded')
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
						if (rootGetters.isAdmin || rootGetters.isAssistAdmin) {
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
					if (rootGetters.isAdmin || rootGetters.isAssistAdmin) {
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Load the team calendar by _id and if present make it the current team's calendar.
	* If the team calendar does not exist replace the current calendar with the default calendar.
	*/
	loadTeamCalendar({
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
				if (rootState.debug) console.log('loadTeamCalendar: A team document with calendar is loaded; id = ' + id)
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
				if (rootState.debug) console.log(`loadTeamCalendar: No team calendar found in team document with id ${id}, the default sprint calendar will be used`)
				rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
				dispatch('getRoot')
			}
		}).catch(error => {
			const msg = 'loadTeamCalendar: Could not read document with id ' + id + ', ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
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
			const msg = `extendTeamCalendar: The sprint calendar of team '${doc.teamName}' is automatically extended with ${newSprintCount} sprints`
			dispatch('doLog', { event: msg, level: SEV.INFO })
		}

		doc.teamCalendar = extTeamCalendar
		// update the team with the extended team calendar and continue loading the tree model
		const toDispatch = [{ getRoot: null }]
		dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: doc, toDispatch, onSuccessCallback: () => {
			// replace the defaultSprintCalendar or other team calendar with this team calendar
			rootState.sprintCalendar = extTeamCalendar
		}, caller: 'extendTeamCalendar' })
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
			if (rootState.debug) console.log('getRoot: The root document is read')
			// open the products view by default
			router.push('/detailProduct')
		}).catch(error => {
			let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
			if (error.response && error.response.status === 404) {
				msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
			}
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}

}

export default {
	actions
}
