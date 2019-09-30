import globalAxios from 'axios'

const ERROR = 2

const actions = {
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
		})
			.catch(error => {
				let msg = 'changePW: Could not change password for user ' + rootState.userData.user + '. Error = ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.userData.currentDb) dispatch('doLog', {
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
				if (rootState.userData.currentDb) dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			})
	},

	updateUser({
		rootState,
		dispatch
	}, tmpUserData) {
		globalAxios({
			method: 'PUT',
			url: '/_users/org.couchdb.user:' + rootState.userData.user,
			withCredentials: true,
			data: tmpUserData
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('updateUser: user ' + rootState.userData.user + ' is updated')
		})
			.catch(error => {
				let msg = 'updateUser: Could not update user data for user ' + rootState.userData.user + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				if (rootState.userData.currentDb) dispatch('doLog', {
					event: msg,
					level: ERROR
				})
			})
	},

}

export default {
	actions
}
