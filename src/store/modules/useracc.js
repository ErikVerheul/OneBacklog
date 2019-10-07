import globalAxios from 'axios'

const ERROR = 2

const state = {
	fetchedUserData: null
}

/* updates roles in payload.products */
const actions = {
	getUser({
		rootState,
		state,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.name,
			withCredentials: true
		}).then(res => {
			state.fetchedUserData = res.data
			for (let prod of payload.products) {
				prod.roles = state.fetchedUserData.productsRoles[prod._id] || []
			}
		}).catch(error => {
			state.fetchedUserData = null
			let msg = 'getUser: Could not find user ' + payload.name + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},
	changePassword({
		rootState,
		dispatch
	}, newPassword) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true
		}).then(res => {
			rootState.userData.password = newPassword
			let tmpUserData = res.data
			tmpUserData["password"] = newPassword
			dispatch("updateUser", tmpUserData)
		}).catch(error => {
			let msg = 'changePW: Could not change password for user ' + rootState.userData.user + '. Error = ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},
	addProductToUser({
		rootState,
		dispatch
	}, newProductId) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true
		}).then(res => {
			let tmpUserData = res.data
			tmpUserData.subscriptions.push(newProductId)
			// add all user roles to the new product
			tmpUserData.productsRoles[newProductId] = rootState.userData.roles
			dispatch("updateUser", tmpUserData)
			rootState.superPoMessage = 'The product with Id ' + newProductId + ' is created and added to your profile with roles ' + rootState.userData.roles
		})
			.catch(error => {
				let msg = 'addProductToUser: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			})
	},
	updateSubscriptions({
		rootState,
		dispatch
	}, newSubscriptions) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true
		}).then(res => {
			let tmpUserData = res.data
			tmpUserData.subscriptions = newSubscriptions
			dispatch("updateUser", tmpUserData)
		})
			.catch(error => {
				let msg = 'updateSubscriptions: Could not update subscribed products for user ' + rootState.userData.user + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			})
	},

	updateUser({
		rootState,
		dispatch
	}, newUserData) {
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + newUserData.name,
			withCredentials: true,
			data: newUserData
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('updateUser: user ' + newUserData.name + ' is updated')
		})
			.catch(error => {
				let msg = 'updateUser: Could not update user data for user ' + newUserData.name + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			})
	},

	createUser1({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: '/_users/org.couchdb.user:' + payload.name,
			withCredentials: true
		}).then(res => {
			let msg = 'createUser1: Cannot create user "' + res.data.name + '" that already exists'
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		}).catch(error => {
			if (error.message.includes("404")) {
				dispatch('createUser2', payload)
			} else {
				let msg = 'createUser1: While checking if user "' + payload.user + '" exist an error occurred, ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			}
		})
	},

	createUser2({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + payload.name,
			withCredentials: true,
			data: payload
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createUser2: user "' + payload.name + '" is created')
		}).catch(error => {
			let msg = 'createUser2: Could not create user "' + payload.user + '", ' + error
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', {
				event: msg,
				level: ERROR
			})
		})
	},

}

export default {
	state,
	actions
}
