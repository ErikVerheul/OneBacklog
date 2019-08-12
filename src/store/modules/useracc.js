import globalAxios from 'axios'

const actions = {
	addProductId({
		rootState,
		dispatch
	}, productId) {
		globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				let tmpUserData = res.data
				tmpUserData["products"].push(productId)
				dispatch("updateUser2", tmpUserData)
			})
			.catch(error => {
				let msg = 'addProductId: Could not assign productId ' + productId + ' to user ' + rootState.user + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	removeProductId({
		rootState,
		dispatch
	}, productId) {
		globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				let tmpUserData = res.data
				delete tmpUserData.productsRoles[productId]
				// reset to the first product if the current product was deleted
				if (tmpUserData.currentProductIdx > Object.keys(tmpUserData.productsRoles).length - 1) {
					tmpUserData.currentProductIdx = 0
				}
				dispatch("updateUser2", tmpUserData)
			})
			.catch(error => {
				let msg = 'removeProductId: Could not reset allowed products for user ' + rootState.user + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

	changePassword({
		rootState,
		dispatch
	}, newPassword) {
		globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				let tmpUserData = res.data
				tmpUserData["password"] = newPassword
				dispatch("updateUser2", tmpUserData)
			})
			.catch(error => {
				let msg = 'changePW: Could not change password for user ' + rootState.user + '. Error = ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

updateUser2({
		rootState,
		dispatch
	}, tmpUserData) {
		globalAxios({
				method: 'PUT',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true,
				data: tmpUserData
			}).then(() => {
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('updateUser2: user ' + rootState.user + ' is updated')
			})
			.catch(error => {
				let msg = 'updateUser2: Could not update user data for user ' + rootState.user + ', ' + error
				// eslint-disable-next-line no-console
				console.log(msg)
				if (rootState.currentDb) dispatch('doLog', {
					event: msg,
					level: "ERROR"
				})
			})
	},

}

export default {
	actions
}
