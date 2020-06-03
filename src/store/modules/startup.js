import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

import router from '../../router'

const INFO = 0
const ERROR = 2

const actions = {
	/*
	* Order of execution:
	* 1. getDatabases
	* 2. getOtherUserData
	* 3. getAllProducts and call updateUser if databases or products are missing
    * 4. getConfig
    * 5. getAllTeams and load the team calendar if present
    * 6. getRoot
    * 7. route to products view
	*/

    /* Get all non-backup or system database names */
    getDatabases({
        rootState,
        dispatch
    }) {
        globalAxios({
            method: 'GET',
            url: '/_all_dbs',
        }).then(res => {
            const foundDbNames = []
            for (let dbName of res.data) {
                if (!dbName.startsWith('_') && !dbName.includes('backup')) foundDbNames.push(dbName)
            }
            dispatch('getOtherUserData', foundDbNames)
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('getDatabases: Database names are loaded: ' + foundDbNames)
        }).catch(error => {
            let msg = 'getDatabases: Could not load the database names. Error = ' + error
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
            url: '_users/org.couchdb.user:' + rootState.userData.user,
        }).then(res => {
            let allUserData = res.data
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
            // correct the profile for removed databases, if any
            rootState.userData.myDatabases = []
            for (let name of Object.keys(allUserData.myDatabases)) {
                if (!foundDbNames.includes(name)) {
                    delete allUserData.myDatabases[name]
                } else rootState.userData.myDatabases.push(name)
            }
            rootState.userData.currentDb = allUserData.currentDb
            rootState.userData.email = allUserData.email
            const currentDbSettings = allUserData.myDatabases[allUserData.currentDb]
            rootState.userData.myTeam = currentDbSettings.myTeam
            rootState.userData.myFilterSettings = allUserData.myDatabases[rootState.userData.currentDb].filterSettings
            rootState.userData.doNotAskForImport = allUserData.doNotAskForImport
            dispatch('watchdog')
            let msg = "getOtherUserData: '" + rootState.userData.user + "' has logged in"
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            // now that the database is known the log file is available
            dispatch('doLog', { event: msg, level: INFO })
            dispatch('getAllProducts', { dbName: rootState.userData.currentDb, allUserData, currentDbSettings })
        }).catch(error => {
            if (error.response.status === 404) {
                // the user profile does not exist; if online, start one time initialization of a new database if a server admin signed in
                if (rootState.online && rootState.userData.sessionRoles.includes("_admin")) {
                    // eslint-disable-next-line no-console
                    if (rootState.debug) console.log('Server admin logged in but has no profile in users database. Start init')
                    rootState.showHeaderDropDowns = false
                    rootState.backendMessages = []
                    router.push('/init')
                    return
                }
            }
            let msg = 'getOtherUserData: Could not read user date for user ' + rootState.userData.user + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Get all products of the current database and correct the data from the user profile with the actual available products */
    getAllProducts({
        rootState,
        dispatch
    }, payload) {
        globalAxios({
            method: 'GET',
            url: payload.dbName + '/_design/design1/_view/products',
        }).then(res => {
            const currentProductsEnvelope = res.data.rows
            const availableProductIds = []
            // correct the data from the user profile with the actual available products
            for (let product of currentProductsEnvelope) {
                let id = product.id
                availableProductIds.push(id)
                // can only have productsRoles of products that are available
                if (Object.keys(payload.currentDbSettings.productsRoles).includes(id)) {
                    rootState.userData.myProductsRoles[id] = payload.currentDbSettings.productsRoles[id]
                }
            }
            let screenedSubscriptions = []
            for (let p of payload.currentDbSettings.subscriptions) {
                if (availableProductIds.includes(p)) {
                    screenedSubscriptions.push(p)
                }
            }
            if (screenedSubscriptions.length === 0) {
                // if no default is set assign the first defined product from the productsRoles
                screenedSubscriptions = [Object.keys(payload.currentDbSettings.productsRoles)[0]]
            }
            rootState.userData.myProductSubscriptions = screenedSubscriptions

            // set the users product options to select from
            for (let product of currentProductsEnvelope) {
                if (Object.keys(payload.currentDbSettings.productsRoles).includes(product.id)) {
                    rootState.myProductOptions.push({
                        value: product.id,
                        text: product.value
                    })
                }
            }
            // update the user profile for missing products
            const missingProductRolesIds = []
            for (let id of Object.keys(payload.currentDbSettings.productsRoles)) {
                if (!availableProductIds.includes(id)) {
                    missingProductRolesIds.push(id)
                }
            }
            if (rootState.autoCorrectUserProfile) {
                let newUserData = payload.allUserData
                for (let id of missingProductRolesIds) {
                    delete newUserData.myDatabases[rootState.userData.currentDb].productsRoles[id]
                }
                for (let id of missingProductRolesIds) {
                    const position = newUserData.myDatabases[rootState.userData.currentDb].subscriptions.indexOf(id)
                    if (position !== -1) newUserData.myDatabases[rootState.userData.currentDb].subscriptions.splice(position, 1)
                }
                dispatch('updateUser', { data: newUserData })
            }
            if (rootState.userData.myProductsRoles && Object.keys(rootState.userData.myProductsRoles).length > 0) {
                rootState.isProductAssigned = true
                rootState.userData.userAssignedProductIds = Object.keys(rootState.userData.myProductsRoles)
                // the first (index 0) product in myProductSubscriptions is by definition the default product
                rootState.currentDefaultProductId = rootState.userData.myProductSubscriptions[0]
            }
            // postpone the warning message for 'no product found' until the configuration is loaded
            dispatch('getConfig')
        }).catch(error => {
            let msg = 'getAllProducts: Could not find products in database ' + rootState.userData.currentDb + '. Error = ' + error
            rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
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
            url: rootState.userData.currentDb + '/config',
        }).then(res => {
            rootState.configData = res.data
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log('The configuration is loaded')
            if (!rootState.isProductAssigned) {
                if (rootGetters.isServerAdmin) { router.replace('/serveradmin') } else
                    if (rootGetters.isAdmin) { router.replace('/admin') } else {
                        alert("Error: No default product is set. Consult your administrator. The application will exit.")
                        commit('resetData', null, { root: true })
                        router.replace('/')
                    }
            } else {
                if (rootState.configData.defaultSprintCalendar) {
                    // assign the default calender to the sprint calendar; this calendar will be replaced if a team has its own calendar
                    rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
                    dispatch('getAllTeams')
                } else {
                    // missing calendar
                    if (rootGetters.isAdmin) {
                        alert("Error: No default sprint calendar is set. You will be redirected to the Admin view where you can create one.")
                        router.replace('/admin')
                    } else {
                        alert("Error: No default sprint calendar is set. Consult your administrator. The application will exit.")
                        commit('resetData', null, { root: true })
                        router.replace('/')
                    }
                }
            }
        }).catch(error => {
            let msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
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
            url: rootState.userData.currentDb + '/_design/design1/_view/teams',
        }).then(res => {
            // save in memory
            const teams = res.data.rows
			for (let t of teams) {
                rootState.allTeams[t.key] = { id: t.id, members: t.value }
                if (rootState.userData.myTeam === t.key) {
                    // load team calendar if present
                    dispatch('loadTeamCalendar', t.id)
                }
            }
            dispatch('getRoot')
        }).catch(error => {
            let msg = `getAllTeams: Could not read the teams in database '${rootState.userData.currentDb}', ${error}`
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /* Load the root of the backlog items into the current document */
    getRoot({
        rootState,
        commit,
        dispatch,
    }) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/root',
        }).then(res => {
            commit('updateCurrentDoc', { newDoc: res.data })
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log("The root document is read")
            // open the products view by default
            router.push('/detailProduct')
        }).catch(error => {
            let msg = 'getRoot: Could not read the root document from database ' + rootState.userData.currentDb + '. ' + error
            if (error.response.status === 404) {
                msg += ' , is your default database ' + rootState.userData.currentDb + ' deleted?'
            }
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    /*
	* Load the team calendar by _id and if existing make it the current team's calendar.
	* If the team calendar does not exist replace the current calendat with the default calendar.
	*/
	loadTeamCalendar({
		rootState,
		rootGetters,
		dispatch
	}, _id) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		}).then(res => {
			const doc = res.data
			if (doc.type === 'team') {
				if (doc.teamCalendar && doc.teamCalendar.length > 0) {
					// replace the defaultSprintCalendar or other team calendar with this team calendar
					rootState.sprintCalendar = doc.teamCalendar
				} else {
					// eslint-disable-next-line no-console
					console.log('loadTeamCalendar: No team calendar found')
					if (rootGetters.teamCalendarInUse) {
						// replace the team calendar with the default
						rootState.sprintCalendar = rootState.configData.defaultSprintCalendar
					}
				}
			}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadTeamCalendar: document with _id ' + _id + ' is loaded.')
		}).catch(error => {
			let msg = 'loadTeamCalendar: Could not read document with _id ' + _id + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}
}

export default {
    actions
}
