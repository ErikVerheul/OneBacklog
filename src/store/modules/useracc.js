import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be procecessed again)
const ERROR = 2

/* Add item to array if not allready present. Returns a new array so that it is reactive */
function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

/* Remove item from array if present. Returns a new array so that it is reactive */
function removeFromArray(arr, item) {
	const newArr = []
	for (const el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

const state = {
	fetchedUserData: null,
	userIsServerAdmin: false,
	userIsAdmin: false,
	userIsAPO: false,
	dbProducts: [],
	allUsers: []
}

const actions = {
	getUser({
		rootState,
		state,
		dispatch
	}, selectedUser) {
		rootState.backendMessages = []
		rootState.isUserFound = false
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + selectedUser
		}).then(res => {
			state.fetchedUserData = res.data
			state.userIsServerAdmin = !!state.fetchedUserData.roles.includes('_admin')
			state.userIsAdmin = !!state.fetchedUserData.roles.includes('admin')
			state.userIsAPO = !!state.fetchedUserData.roles.includes('APO')
			// preset with the current database of the user
			rootState.selectedDatabaseName = state.fetchedUserData.currentDb
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: `Successfully fetched user '${selectedUser}'` })
			rootState.isUserFound = true
		}).catch(error => {
			const msg = 'getUser: Could not find user "' + selectedUser + '". ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/* Only admins have the access rights to this call */
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
			const msg = 'getAllUsers: Could not read the _users database: ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Get all products of the set database and
	* if createNewUser === true -> initiate an empty roles array for all products in the database assigned to this user
	* if createNewUser === false -> get the assigned roles to all the products in the database assigned to this user
	* Mark each found product as assigned = true as the user is allready assigned to this product and as false otherwise
	*/
	getProductsRoles({
		rootState,
		state,
		dispatch
	}, payload) {
		rootState.areProductsFound = false
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_design/design1/_view/products'
		}).then(res => {
			rootState.areProductsFound = true
			state.dbProducts = res.data.rows
			// add a roles array to each product
			const myDatabases = state.fetchedUserData.myDatabases
			if (myDatabases[payload.dbName]) {
				// the database is subscribed to the user
				for (const product of state.dbProducts) {
					if (payload.createNewUser) {
						product.roles = []
					} else {
						// get the assigned roles to this product; if not found assing an empty array
						const roles = myDatabases[payload.dbName].productsRoles[product.id]
						if (roles) {
							product.roles = roles
						} else {
							product.roles = []
						}
					}
				}
			} else {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: `assignProductsToUserAction: The database '${payload.dbName}' is not subscribed to this user`
				})
				for (const product of state.dbProducts) {
					product.roles = []
				}
			}
		}).catch(error => {
			const msg = 'getProductsRoles: Could not find products in database ' + payload.dbName + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	assignProductsToUserAction({
		rootState,
		state,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.selectedUser
		}).then(res => {
			const tmpUserData = res.data
			const addedDb = payload.dbName
			if (!rootState.myAssignedDatabases.includes(addedDb)) {
				rootState.backendMessages.push({
					seqKey: rootState.seqKey++,
					msg: `assignProductsToUserAction: The database ${addedDb} will be assigned to user '${payload.selectedUser}'`
				})
				// add the new db to the user's profile
				const productsRoles = {}
				const subscriptions = []
				for (const prod of state.dbProducts) {
					if (prod.roles.length > 0) {
						productsRoles[prod.id] = prod.roles
						subscriptions.push(prod.id)
					}
				}
				const newDb = {
					myteam: 'not assigned yet',
					subscriptions,
					productsRoles
				}
				tmpUserData.myDatabases[addedDb] = newDb
			}

			dispatch('updateUser', { data: tmpUserData, addedDb })
			rootState.backendMessages.push({
				seqKey: rootState.seqKey++,
				msg: `assignProductsToUserAction: The database ${addedDb} is added to the profile of user '${payload.selectedUser}'`
			})
		}).catch(error => {
			const msg = `assignProductsToUserAction: Could not subscribe database ${payload.dbName} to user '${payload.selectedUser}', ${error}`
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	addProductToUser({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.selectedUser
		}).then(res => {
			rootState.isDatabaseInitiated = true
			rootState.isDatabaseCreated = true
			rootState.isProductCreated = true
			const tmpUserData = res.data
			let addedDb = undefined
			let productId = payload.newProductOption.value
			let rolesSet = []
			if (Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
				// the database exists; subscribe the selected user to the product
				tmpUserData.myDatabases[payload.dbName].subscriptions.push(productId)
				if (payload.userRoles[0] === '*') {
					// add all current roles of the selected user to the new product
					rolesSet = tmpUserData.roles
				} else {
					// or set passed roles to the product
					rolesSet = payload.userRoles
				}
				tmpUserData.myDatabases[payload.dbName].productsRoles[productId] = rolesSet
			} else {
				// new database, add all current user roles to the new product
				rolesSet = tmpUserData.roles
				const newDb = {
					myteam: 'not assigned yet',
					subscriptions: [productId],
					productsRoles: {
						[productId]: rolesSet
					}
				}
				tmpUserData.myDatabases[payload.dbName] = newDb
				addedDb = payload.dbName
			}

			dispatch('updateUser', { data: tmpUserData, addedDb, newProductOption: payload.newProductOption })
			rootState.backendMessages.push({
				seqKey: rootState.seqKey++,
				msg: 'addProductToUser: The product with Id ' + productId + ' is added to your profile with roles ' + rolesSet
			})
		}).catch(error => {
			const msg = 'addProductToUser: Could not update subscribed products for user ' + payload.selectedUser + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	updateMySubscriptions({
		rootState,
		dispatch
	}, newSubscriptions) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			tmpUserData.myDatabases[rootState.userData.currentDb].subscriptions = newSubscriptions
			dispatch('updateUser', { data: tmpUserData })
		}).catch(error => {
			const msg = 'updateMySubscriptions: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	changeCurrentDb({
		rootState,
		dispatch
	}, dbName) {
		globalAxios({
			method: 'GET',
			url: dbName + '/_design/design1/_view/products'
		}).then(res => {
			const currentProductsEnvelope = res.data.rows
			const availableProductIds = []
			for (const product of currentProductsEnvelope) {
				const id = product.id
				availableProductIds.push(id)
			}
			dispatch('changeDbInMyProfile', { dbName, productIds: availableProductIds })
		}).catch(error => {
			const msg = 'changeCurrentDb: Could not find products in database ' + rootState.userData.currentDb + ', ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

	/*
	* Change the current database assigned to the current user
	* If the user is not subscribed to this database, make the user 'guest' for all products in that database or
	* If the database is newly created and has no products, register the database without products
	*/
	changeDbInMyProfile({
		rootState,
		dispatch
	}, payload) {
		rootState.isCurrentDbChanged = false
		rootState.backendMessages = []
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user
		}).then(res => {
			const tmpUserData = res.data
			const newDbEntry = {
				myTeam: 'not assigned yet',
				subscriptions: [],
				productsRoles: {}
			}
			tmpUserData.currentDb = payload.dbName
			if (!Object.keys(tmpUserData.myDatabases).includes(payload.dbName)) {
				// the user is not subscribed to this database
				if (payload.productIds.length > 0) {
					// make the user 'guest' of all existing products
					for (const id of payload.productIds) {
						newDbEntry.subscriptions.push(id)
						newDbEntry.productsRoles[id] = ['guest']
					}
				}
				tmpUserData.myDatabases[payload.dbName] = newDbEntry
			}
			dispatch('updateUser', {
				data: tmpUserData,
				onSuccessCallback: () => {
					rootState.isCurrentDbChanged = true
					const msg = "changeDbInMyProfile: The default database of user '" + rootState.userData.user + "' is changed to " + payload.dbName
					rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				}
			}).catch(error => {
				const msg = 'changeDbInMyProfile: Could not update the default database for user ' + rootState.userData.user + ', ' + error
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
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
		if (userData.roles.includes('_admin')) allRoles.push('_admin')
		if (userData.roles.includes('APO')) allRoles.push('APO')
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
			if (userData.name === rootState.userData.user && (!rootState.userData.currentDb || (rootState.userData.currentDb === userData.currentDb))) {
				// the user is updating its own profile and loaded its current database (admin is not updating another user); note that rootState.userData.currentDb is undefined at sign-in
				commit('setMyUserData', payload)

				if (payload.newProductOption) {
					// the user gets a new product to select
					rootState.myProductOptions.push(payload.newProductOption)
				}

				if (payload.removedDb) {
					// the user cannot select this database anymore
					rootState.myAssignedDatabases = removeFromArray(rootState.myAssignedDatabases, payload.removedDb)
				}

				if (payload.addedDb) {
					// the user gets a new database to select
					rootState.myAssignedDatabases = addToArray(rootState.myAssignedDatabases, payload.addedDb)
				}
			}

			rootState.isUserUpdated = true
			// execute passed callback if provided
			if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
			if (payload.toDispatch) {
				// additional dispatches
				for (const td of payload.toDispatch) {
					const name = Object.keys(td)[0]
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('updateUser: dispatching ' + name)
					dispatch(name, td[name])
				}
			}
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg: "updateUser: The profile of user '" + userData.name + "' is updated successfully" })
		}).catch(error => {
			// execute passed callback if provided
			if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
			const msg = "updateUser: Could not update the profile of user '" + userData.name + "', " + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
		}).catch(error => {
			if (error.response && error.response.status === 404) {
				dispatch('createUserAction', userData)
			} else {
				const msg = 'createUserIfNotExistent: While checking if user "' + userData.name + '" exists an error occurred, ' + error
				rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
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
				dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
		}).catch(error => {
			const msg = 'removeUserAction: While removing user "' + userName + '" an error occurred, ' + error
			rootState.backendMessages.push({ seqKey: rootState.seqKey++, msg })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
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
			dispatch('doLog', { event: msg, level: ERROR })
		})
	}

}

export default {
	state,
	actions
}
