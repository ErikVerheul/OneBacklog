import { SEV } from '../../constants.js'
import globalAxios from 'axios'
import router from '../../router'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)

/* Add item to array if not already present. Returns a new array so that it is reactive */
function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

const state = {
	fetchedUserData: null,
	userIsAdmin: false,
	userIsAssistAdmin: false,
	userIsAPO: false,
	dbProducts: [],
	allUsers: []
}

const actions = {
	/*
	* Load the user's profile in state.fetchedUserData
	* Set the user's generic roles in state.userIsAdmin and state.userIsAPO
	* Preset the selected database to the user's current database
	* If justCheck === true return with rootState.isUserFound = false and no error message
	*/
	getUser({
		rootState,
		state,
		dispatch
	}, payload) {
		rootState.backendMessages = []
		rootState.isUserFound = false
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.userName
		}).then(res => {
			state.fetchedUserData = res.data
			state.userIsAdmin = !!state.fetchedUserData.roles.includes('admin')
			state.userIsAssistAdmin = !!state.fetchedUserData.roles.includes('assistAdmin')
			state.userIsAPO = !!state.fetchedUserData.roles.includes('APO')
			rootState.isUserRemoved = !!res.data.delmark
			// preset with the current database of this user
			rootState.selectedDatabaseName = state.fetchedUserData.currentDb
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Successfully fetched ${rootState.isUserRemoved ? 'removed' : ''} user '${payload.userName}'` })
			rootState.isUserFound = true
		}).catch(error => {
			if (!payload.justCheck) {
				const msg = `getUser: Could not find user '${payload.userName}', ${error}`
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		})
	},

	/*
	* Get all user names.
	* Only admins/assistAdmins have the access rights to this call
	*/
	getAllUsers({
		rootState,
		state,
		dispatch
	}) {
		rootState.backendMessages = []
		rootState.isUserFound = false
		state.allUsers = []
		globalAxios({
			method: 'GET',
			url: '_users/_design/Users/_view/list-all'
		}).then(res => {
			const rows = res.data.rows
			if (rows.length > 0) {
				for (const u of rows) {
					const colonIdx = u.id.indexOf(':')
					if (colonIdx > 0) {
						const name = u.id.substring(colonIdx + 1)
						const userRec = {
							name,
							currentDb: u.value[0],
							team: u.value[1]
						}
						state.allUsers.push(userRec)
					}
				}
			}
			// populate the userOptions array
			rootState.userOptions = []
			for (const u of state.allUsers) {
				rootState.userOptions.push(u.name)
			}
		}).catch(error => {
			const msg = `getAllUsers: Could not read the _users database, ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Get all products of the set database and get the assigned roles to the products assigned to this user or
	* (if not found) create an empty roles array for all (other) products in the database
	* if payload.onlyMyProducts select the products that are assigned to the current user (assistAdmin)
	* The result is stored in state.dbProducts
	*/
	getProductsRoles({
		rootState,
		rootGetters,
		state,
		dispatch
	}, payload) {
		rootState.areProductsFound = false
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/products'
		}).then(res => {
			rootState.areProductsFound = true
			if (payload.onlyMyProducts) {
				state.dbProducts = res.data.rows.map(row => { if (rootGetters.getAllMyAssignedProductIds.includes(row.id)) return row })
			} else state.dbProducts = res.data.rows
			// add empty roles array to each product
			for (const product of state.dbProducts) {
				product.roles = []
			}
			const userExists = !!state.fetchedUserData
			if (userExists) {
				// populate the roles array of each product
				const myDatabases = state.fetchedUserData.myDatabases
				for (const product of state.dbProducts) {
					// get the assigned roles to this product
					if (myDatabases[payload.dbName]) {
						const roles = myDatabases[payload.dbName].productsRoles[product.id]
						if (roles) {
							product.roles = roles
						}
					}
				}
			}
		}).catch(error => {
			const msg = 'getProductsRoles: Could not find products in database ' + payload.dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	saveMyFilterSettings({
		rootState,
		dispatch
	}, newFilterSettings) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			tmpUserData.myDatabases[rootState.userData.currentDb].filterSettings = newFilterSettings
			dispatch('updateUser', { data: tmpUserData })
		}).catch(error => {
			const msg = 'saveMyFilterSettings: User ' + rootState.userData.user + ' cannot save the product filter settings. Error = ' + error
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	changeMyPasswordAction({
		rootState,
		dispatch
	}, newPassword) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			tmpUserData.password = newPassword
			const toDispatch = [{ signout: null }]
			dispatch('updateUser', { data: tmpUserData, toDispatch })
		}).catch(error => {
			const msg = 'changeMyPasswordAction: Could not change password for user ' + rootState.userData.user + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	assignProductToUser({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.selectedUser
		}).then(res => {
			const tmpUserData = res.data
			let addedDb = undefined
			let productId = payload.newProductOption.value
			let rolesSet = []
			if (Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
				// if the database is assigned to the user, assign the passed roles to the product
				rolesSet = payload.userRoles
				// update the user's profile
				tmpUserData.myDatabases[payload.dbName].productsRoles[productId] = rolesSet
				tmpUserData.myDatabases[payload.dbName].subscriptions.push(productId)
			} else {
				// new database for this user; leave rolesSet empty
				const newDb = {
					myTeam: 'not assigned yet',
					subscriptions: [productId],
					productsRoles: {
						[productId]: rolesSet
					}
				}
				tmpUserData.myDatabases[payload.dbName] = newDb
				addedDb = payload.dbName
			}
			dispatch('updateUser', {
				data: tmpUserData, onSuccessCallback: () => {
					if (tmpUserData.name === rootState.userData.user && tmpUserData.currentDb === rootState.userData.currentDb) {
						// the user is updating its own profile and loaded its current database (admin is not updating another user)
						if (addedDb) rootState.myAssignedDatabases = addToArray(rootState.myAssignedDatabases, addedDb)
						// the user gets a new product to select
						rootState.myProductOptions.push(payload.newProductOption)
					}
					// set result for 'Create a product' admin process (admin.js)
					rootState.isProductCreated = true
					// set result for database initiation process (initdb)
					rootState.isDatabaseInitiated = true
					const msg = (rolesSet.length === 0) ? `assignProductToUser: The product with Id ${productId} is added to your profile with no roles set` :
						`assignProductToUser: The product with Id ${productId} is added to your profile with roles [${rolesSet}]`
					rootState.backendMessages.push({
						seqKey: rootState.seqKey++,
						msg
					})
				}
			})
		}).catch(error => {
			const msg = 'assignProductToUser: Could not update subscribed products for user ' + payload.selectedUser + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	changeCurrentDb({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/products'
		}).then(res => {
			const currentProductsEnvelope = res.data.rows
			const availableProductIds = []
			for (const product of currentProductsEnvelope) {
				const id = product.id
				availableProductIds.push(id)
			}
			dispatch('changeDbInMyProfile', { dbName: payload.dbName, autoSignOut: payload.autoSignOut, productIds: availableProductIds })
		}).catch(error => {
			const msg = 'changeCurrentDb: Could not find products in database ' + rootState.userData.currentDb + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/*
	* Change the current database assigned to the current user if the database is assigned to the user.
	* If the database is not assigned to the user and the user is 'Admin', add the database to the Admin's profile and assign all products in that database.
	*/
	changeDbInMyProfile({
		rootState,
		rootGetters,
		dispatch
	}, payload) {
		rootState.isCurrentDbChanged = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			tmpUserData.currentDb = payload.dbName
			if (!Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
				// the database is not assigned to the user
				if (rootGetters.isAdmin) {
					// subscribe all products
					const newDbEntry = {
						myTeam: 'not assigned yet',
						subscriptions: [],
						productsRoles: {}
					}
					for (const id of payload.productIds) {
						newDbEntry.subscriptions.push(id)
						newDbEntry.productsRoles[id] = []
					}
					tmpUserData.myDatabases[payload.dbName] = newDbEntry
				} else {
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `You must be 'Admin' to assign a database to your self` })
					return
				}
			}
			dispatch('updateUser', {
				data: tmpUserData,
				onSuccessCallback: () => {
					rootState.isCurrentDbChanged = true
					const msg = "changeDbInMyProfile: The default database of user '" + rootState.userData.user + "' is changed to " + payload.dbName
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
					if (payload.autoSignOut) router.replace('/')
				}
			}).catch(error => {
				const msg = 'changeDbInMyProfile: Could not update the default database for user ' + rootState.userData.user + ', ' + error
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		})
	},

	registerMyNoSprintImport({
		rootState,
		dispatch
	}, sprintId) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			if (tmpUserData.doNotAskForImport) {
				tmpUserData.doNotAskForImport.push(sprintId)
			} else tmpUserData.doNotAskForImport = [sprintId]
			// update the current user data
			rootState.userData.doNotAskForImport = tmpUserData.doNotAskForImport
			dispatch('updateUser', { data: tmpUserData })
		}).catch(error => {
			const msg = 'registerMyNoSprintImport: Could not update do not ask for import for user ' + rootState.userData.user + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Update the user profile in CouchDb. If the profile of the current user is updated, the in-memory profile is updated also */
	updateUser({
		rootState,
		commit,
		dispatch
	}, payload) {
		rootState.isUserUpdated = false
		let userData = payload.data
		// calculate the association of all assigned roles
		const allRoles = []
		if (userData.roles.includes('APO')) allRoles.push('APO')
		if (userData.roles.includes('assistAdmin')) allRoles.push('assistAdmin')
		if (userData.roles.includes('admin')) allRoles.push('admin')
		for (const db in userData.myDatabases) {
			for (const prodId in userData.myDatabases[db].productsRoles) {
				for (const role of userData.myDatabases[db].productsRoles[prodId]) {
					if (!allRoles.includes(role)) allRoles.push(role)
				}
			}
		}
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('updateUser: Users roles are: ' + allRoles)
		userData.roles = allRoles
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + userData.name,
			data: userData
		}).then(() => {
			if (userData.name === rootState.userData.user && userData.currentDb === rootState.userData.currentDb) {
				// the user is updating its own profile and loaded its current database (admin is not updating another user)
				commit('setMyUserData', payload.data)
			}
			// execute passed callback if provided
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			if (payload.toDispatch) {
				// additional dispatches
				for (const td of payload.toDispatch) {
					const name = Object.keys(td)[0]
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateUser: dispatching ' + name)
					dispatch(name, td[name])
				}
			}
			rootState.isUserUpdated = true
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: "updateUser: The profile of user '" + userData.name + "' is updated successfully" })
		}).catch(error => {
			// execute passed callback if provided
			if (payload.onFailureCallback) payload.onFailureCallback()
			const msg = "updateUser: Could not update the profile of user '" + userData.name + "', " + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Create user if not existent already */
	createUserIfNotExistent({
		rootState,
		dispatch
	}, userData) {
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + userData.name
		}).then(() => {
			const msg = 'createUserIfNotExistent: Cannot create user "' + userData.name + '" that already exists'
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				dispatch('createUserAction', userData)
			} else {
				const msg = 'createUserIfNotExistent: While checking if user "' + userData.name + '" exists an error occurred, ' + error
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		})
	},

	/* Remove a user if existent */
	removeUserIfExistent({
		rootState,
		dispatch
	}, userName) {
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + userName
		}).then(res => {
			let data = res.data
			data.delmark = true
			dispatch('removeUserAction', data)
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				const msg = 'removeUserIfExistent: Cannot remove user "' + userName + '" that does not exists'
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			} else {
				const msg = 'removeUserIfExistent: While removing user "' + userName + '" an error occurred, ' + error
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			}
		})
	},

	/* Mark the user as removed */
	removeUserAction({
		rootState,
		dispatch
	}, data) {
		const userName = data.name
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + userName,
			data: data
		}).then(() => {
			rootState.isUserDeleted = true
			const msg = `removeUserAction: User '${userName} is removed`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		}).catch(error => {
			const msg = 'removeUserAction: While removing user "' + userName + '" an error occurred, ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	createUserAction({
		rootState,
		dispatch
	}, userData) {
		rootState.isUserCreated = false
		rootState.backendMessages = []
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + userData.name,
			data: userData
		}).then(() => {
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: 'createUser: Successfully created user ' + userData.name })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createUserAction: user "' + userData.name + '" is created')
			rootState.isUserCreated = true
		}).catch(error => {
			const msg = 'createUserAction: Could not create user "' + userData.name + '", ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	}

}

export default {
	state,
	actions
}
