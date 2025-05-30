import { MISC, SEV } from '../../constants.js'
import { createId, startMsgSquareBlink } from '../../common_functions.js'
import globalAxios from 'axios'

// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

import router from '../../router'

const actions = {
	/*
	 * Order of execution:
	 * 1. getDatabases
	 * 2. getOtherUserData and start the watchdog
	 * 3. getAllProducts and call updateUserDb if databases or products are missing
	 * 4. getConfig, load the default sprint calendar and warn the user if it ran out of sprints
	 * 5. getAllTeams and load the team calendar if present, extend the team calendar automatically if ran out of sprints
	 * 6. if the default sprint calendar is present and ran out of sprints, extend this calender with new sprints and save the config document
	 * 7. if the team calendar is present and ran out of sprints, extend this calender with new sprints and save the team document
	 * 8. getRoot and start loading the tree model
	 */

	/*
	 * Get all non-backup and non system database names
	 * For non-server admins the option 'admin_only_all_dbs' in [chttpd] must be set to 'false' in the CouchDb config for this call to succeed
	 */
	getDatabases({ rootState, dispatch }, resetLastSessionData) {
		globalAxios({
			method: 'GET',
			url: '/_all_dbs',
		})
			.then((res) => {
				const foundDbNames = []
				for (const dbName of res.data) {
					if (!dbName.startsWith('_') && !dbName.includes('backup')) foundDbNames.push(dbName)
				}
				dispatch('getOtherUserData', { foundDbNames, resetLastSessionData })

				if (rootState.debug) console.log('getDatabases: The database names are loaded: ' + foundDbNames)
			})
			.catch((error) => {
				const msg = 'getDatabases: Could not load the database names. Error = ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Get the current DB name etc for this user. Note that the user global roles are already fetched */
	getOtherUserData({ rootState, dispatch, commit }, payload) {
		globalAxios({
			method: 'GET',
			url: '_users/org.couchdb.user:' + rootState.userData.user,
		})
			.then((res) => {
				const allUserData = res.data
				if (res.data.delmark) {
					alert(`FATAL ERROR - your account '${rootState.userData.user}' has been removed. Contact your administrator.`)
					return
				}
				// check if the default user database exists
				if (!payload.foundDbNames.includes(allUserData.currentDb)) {
					alert('FATAL ERROR - default user database ' + allUserData.currentDb + ' does not exist!')
					return
				} else {
					// must set currentDb early in the process
					rootState.userData.currentDb = allUserData.currentDb
					if (rootState.debug) console.log('getOtherUserData: the current database is ' + rootState.userData.currentDb)
				}
				// check if the user has productsroles defined for the default database
				if (!Object.keys(allUserData.myDatabases).includes(allUserData.currentDb)) {
					alert('FATAL ERROR - no roles defined for default user database ' + allUserData.currentDb)
					return
				}
				// correct the profile for removed databases and renew the list of assigned databases
				rootState.myAssignedDatabases = []
				const missingDataBasesNames = []
				for (const db of Object.keys(allUserData.myDatabases)) {
					if (!payload.foundDbNames.includes(db)) {
						delete allUserData.myDatabases[db]
						missingDataBasesNames.push(db)
					} else rootState.myAssignedDatabases.push(db)
				}

				// set the user's options
				if (allUserData.myOptions) {
					rootState.userData.myOptions = allUserData.myOptions
				} else {
					// set the user's default options if not found
					rootState.userData.myOptions = {
						proUser: 'false',
						levelShiftWarning: 'do_warn',
						badgeShowTime: 60,
						subscribeDescendants: 'do_subscribe_descendants',
						doNotMessageMyself: 'false',
						showOnHold: 'do_not_show_on_hold',
					}
				}

				// set the default productId
				const currentDbSettings = allUserData.myDatabases[rootState.userData.currentDb]
				if (currentDbSettings && Object.keys(currentDbSettings.productsRoles).length > 0) {
					// the first (index 0) product in the current db subscriptions is by definition the default product
					rootState.currentProductId = currentDbSettings.subscriptions[0]
				}

				const myTeam = allUserData.myDatabases[rootState.userData.currentDb].myTeam
				// get the total number of messages received by this user for this team and this database
				if (allUserData.myDatabases[rootState.userData.currentDb].myMessagesCount) {
					// ToDo: this check can be removed if all users have checked their messages
					rootState.myLastSessionMessagesCount = allUserData.myDatabases[rootState.userData.currentDb].myMessagesCount[myTeam] || 0
				} else rootState.myLastSessionMessagesCount = 0
				// get the last session data if available unless resetLastSessionData is true
				if (!payload.resetLastSessionData && allUserData.myDatabases[allUserData.currentDb].lastSessionData) {
					rootState.lastSessionData = allUserData.myDatabases[allUserData.currentDb].lastSessionData
				}
				// start the watchdog
				dispatch('watchdog')
				const msg = `getOtherUserData: '${allUserData.name}' has signed-in`
				// now that the database is known, the log document is available
				dispatch('doLog', { event: msg, level: SEV.INFO })
				dispatch('getAllProducts', { allUserData, missingDataBasesNames })
			})
			.catch((error) => {
				if (error.response && error.response.status === 404) {
					if (payload.foundDbNames.length > 0) {
						alert(`This CouchDb is already initiated. Cannot overwrite. The program will exit.`)
						commit('endSession', 'startup: cannot initiate this CouchDB instance again.')
					}
					// the user profile does not exist; if online, start one time initialization of a new database if a server admin signed in
					if (rootState.online && rootState.iAmServerAdmin) {
						if (rootState.debug) console.log('getOtherUserData: Server admin logged in but has no profile in users database. Start init')
						rootState.showHeaderDropDowns = false
						rootState.backendMessages = []
						router.push('/init')
					}
				} else {
					const msg = `getOtherUserData: Could not read user data for user '${rootState.userData.user}', ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				}
			})
	},

	/* Get all products of the current database and correct the data from the user profile with the actual available products */
	getAllProducts({ rootState, dispatch, commit }, payload) {
		const dbName = payload.allUserData.currentDb
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/products',
		})
			.then((res) => {
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
				// set the users product options to select from
				for (const product of currentProductsEnvelope) {
					if (Object.keys(productsRoles).includes(product.id)) {
						rootState.myProductOptions.push({
							value: product.id,
							text: product.value,
						})
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
				// store the user data in store.state.userData
				commit('setMyUserData', newUserData)
				if (payload.missingDataBasesNames.length === 0 && missingProductsRolesIds.length === 0) {
					// continue with loading the config data
					dispatch('getConfig')
				} else {
					// save the updated user data loaded in getOtherUserData and continue with loading the config data
					const toDispatch = [{ getConfig: null }]
					dispatch('updateUserDb', {
						data: newUserData,
						toDispatch,
						onSuccessCallback: () => {
							if (payload.missingDataBasesNames.length > 0) {
								const msg1 = `getAllProducts: User profile of user ${newUserData.name} is updated for missing databases with names: ${payload.missingDataBasesNames}`
								dispatch('doLog', { event: msg1, level: SEV.INFO })
							}
							if (missingProductsRolesIds.length > 0) {
								const msg2 = `getAllProducts: User profile of user ${newUserData.name} is updated for missing products with ids: ${missingProductsRolesIds}`
								dispatch('doLog', { event: msg2, level: SEV.INFO })
							}
						},
					})
				}
			})
			.catch((error) => {
				if (error.response && error.response.status === 403) {
					if (rootState.debug) console.log(`getAllProducts: access to database '${dbName}' is forbidden, ${error}`)
					// stop the watchdog as a retry won't fix this error
					clearInterval(rootState.watchdog.runningWatchdogId)
				} else {
					const msg = `getAllProducts: Could not find products in database '${dbName}', ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				}
			})
	},

	/* Load the config document from this database */
	getConfig({ rootState, rootGetters, dispatch, commit }) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/config',
		})
			.then((res) => {
				rootState.configData = res.data
				if (!rootState.configData.historyRetention) {
					// historyRetention is introduced in version 2.9.0
					rootState.configData.historyRetention = { maxHistoryDays: 365, maxHistoryEvents: 100 }
				}

				if (rootState.debug) console.log('getConfig: The configuration document is loaded')
				if (!rootState.isProductAssigned) {
					if (rootGetters.isServerAdmin || rootGetters.isAdmin) {
						alert('Error: No default product is set. You are routed to the admin page.')
						router.replace('/admin')
					} else {
						alert('Error: No default product is set. Consult your administrator. The application will exit.')
						commit('endSession', 'startup: getConfig - No default product is set')
					}
				} else {
					if (rootState.configData.defaultSprintCalendar) {
						const lastSprint = rootState.configData.defaultSprintCalendar.slice(-1)[0]
						if (lastSprint.startTimestamp - lastSprint.sprintLength < Date.now()) {
							// sprint calendar ran out of sprints; extend the calendar automatically
							dispatch('extendDefaultSprintCalendar', {
								configData: rootState.configData,
								onSuccessCallback: () => {
									// assign the default calendar to the sprint calendar; this calendar will be replaced if a team has its own calendar
									rootState.myCurrentSprintCalendar = rootState.configData.defaultSprintCalendar
									dispatch('getAllTeams')
								},
							})
						} else {
							// assign the default calendar to the sprint calendar; this calendar will be replaced if a team has its own calendar
							rootState.myCurrentSprintCalendar = rootState.configData.defaultSprintCalendar
							dispatch('getAllTeams')
						}
					} else {
						// missing default calendar
						if (rootGetters.isAdmin || rootGetters.isAssistAdmin) {
							// create a basic sprint calendar of 3 sprints with a length of 14 days starting an hour before now
							const calendar = []
							const numberOfSprints = 3
							const sprintLengthMillis = MISC.MILIS_IN_DAY * 14
							const start = Date.now() - MISC.MILIS_IN_HOUR
							for (let i = 0; i < numberOfSprints; i++) {
								const sprint = {
									id: createId(),
									name: 'sprint-' + i,
									startTimestamp: start + i * sprintLengthMillis,
									sprintLength: sprintLengthMillis,
								}
								calendar.push(sprint)
							}
							rootState.configData.defaultSprintCalendar = calendar
							// set my sprint calendar
							rootState.myCurrentSprintCalendar = calendar
							// update the config document
							const toDispatch = [{ getAllTeams: null }]
							dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: rootState.configData, toDispatch, caller: 'getConfig' })
						} else {
							alert('Error: No default sprint calendar is set. Consult your administrator. The application will exit.')
							commit('dispatch', 'startup: getConfig - No default sprint calendar is set')
						}
					}
				}
			})
			.catch((error) => {
				const msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/*
	 * Load all team data in rootState.allTeams;
	 * Try to load the team calendar of the current user if the user is member of a team.
	 * Note that a user can be member of one team only.
	 */
	getAllTeams({ rootState, dispatch }) {
		rootState.allTeams = {}
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/teams',
		})
			.then((res) => {
				const teams = res.data.rows
				let userInATeam = false

				for (const t of teams) {
					const teamName = t.key
					const teamId = t.id
					const members = t.value[0]
					const hasTeamCalendar = t.value[1]
					// collect all available team names
					rootState.allTeams[teamName] = { id: teamId, members, hasTeamCalendar }
					if (rootState.userData.myTeam === teamName) {
						// my team
						userInATeam = true
						// save the id of myTeam document
						rootState.myTeamId = teamId
						// save the messages of my team
						rootState.teamMessages = t.value[2] || []
						// warn the user if more messages have arrived
						if (rootState.teamMessages.length > rootState.myLastSessionMessagesCount) {
							startMsgSquareBlink(rootState)
						}
						// load team calendar if present
						if (hasTeamCalendar) {
							dispatch('loadTeamCalendarAtStartup', teamId)
						} else {
							if (rootState.debug) console.log(`getAllTeams: No team calendar defined for your team '${teamName}', the default sprint calendar will be used`)
							// continue to load the tree model
							dispatch('getRoot')
						}
					}
				}
				if (!userInATeam) {
					// continue to load the tree model
					dispatch('getRoot')
				}
			})
			.catch((error) => {
				const msg = `getAllTeams: Could not read the teams in database '${rootState.userData.currentDb}', ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Load the root of the backlog items into the current document */
	getRoot({ rootState, commit, dispatch }) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/root',
		})
			.then((res) => {
				commit('updateNodewithDocChange', { newDoc: res.data })

				if (rootState.debug) console.log('getRoot: The root document is read')
				// start loading the tree model
				dispatch('checkProductAndStartLoading')
			})
			.catch((error) => {
				let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
				if (error.response && error.response.status === 404) {
					msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
				}
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},
}

export default {
	actions,
}
