import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

import router from '../../router'

const INFO = 0
const ERROR = 2
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const AREA_PRODUCTID = '0'

const getters = {
	/*
	* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
	* Note that level 0 is not used and the root of the tree starts with level 1.
	* Note that admins and guests have no write permissions.
	* See documentation.txt for the role definitions.
	*
	* Note that rootState MUST be the third argument. The fourth argument is rootGetters.
	*/
    haveWritePermission(state, getters, rootState, rootGetters) {
        let levels = []
        for (let i = 0; i <= PBILEVEL; i++) {
            // initialize with false
            levels.push(false)
        }
        if (rootState.userData.userAssignedProductIds.includes(rootState.currentProductId)) {
            // assing specific write permissions for the current product only if that product is assigned the this user
            let myCurrentProductRoles = rootState.userData.myProductsRoles[rootState.currentProductId]
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(`haveWritePermission: For productId ${rootState.currentProductId} my roles are ${myCurrentProductRoles}`)
            if (!myCurrentProductRoles || myCurrentProductRoles.length === 0) {
                // my roles are not defined -> no write permission on any level
                return levels
            }

            if (myCurrentProductRoles.includes('PO')) {
                levels[PRODUCTLEVEL] = true
                levels[EPICLEVEL] = true
                levels[FEATURELEVEL] = true
                levels[PBILEVEL] = true
            }

            if (myCurrentProductRoles.includes('APO')) {
                levels[PRODUCTLEVEL] = true
            }

            if (myCurrentProductRoles.includes('developer')) {
                levels[FEATURELEVEL] = true
                levels[PBILEVEL] = true
                levels[TASKLEVEL] = true
            }
        }
        // assign specific write permissions to any product even if that product is not assigned to this user
        if (rootGetters.isServerAdmin) {
            levels[DATABASELEVEL] = true
        }

        if (rootGetters.isAdmin) {
            levels[PRODUCTLEVEL] = true
        }

        // if the user is APO for any product that user has access to the Requirements areas overview dummy product
        if (rootState.currentProductId === AREA_PRODUCTID && rootState.userData.sessionRoles.includes("APO")) {
            levels[PRODUCTLEVEL] = true
            levels[EPICLEVEL] = true
        }
        // eslint-disable-next-line no-console
        if (rootState.debug) console.log(`haveWritePermission: My write levels are [NOT-USED, DATABASELEVEL, PRODUCTLEVEL, EPICLEVEL, FEATURELEVEL, PBILEVEL]: ${levels}`)
        return levels
    },
}

const actions = {
	/*
	* Order of execution:
	* 1. getDatabases
	* 2. getOtherUserData
	* 3. getAllProducts - calls updateUser if databases or products are missing
    * 4. getConfig
    * 5. getRoot
    * 6. route to products view
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
                if (!rootState.configData.defaultSprintCalendar) {
                    // missing calendar
                    if (rootGetters.isAdmin) {
                        alert("Error: No default sprint calendar is set. You will be redirected to the Admin view where you can create one.")
                        router.replace('/admin')
                    } else {
                        alert("Error: No default sprint calendar is set. Consult your administrator. The application will exit.")
                        commit('resetData', null, { root: true })
                        router.replace('/')
                    }
                } else dispatch('getRoot')
            }
        }).catch(error => {
            let msg = 'getConfig: Config doc missing in database ' + rootState.userData.currentDb + ', ' + error
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
}

export default {
    getters,
    actions
}
