import globalAxios from 'axios'

var tmpUserData = null

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
				// eslint-disable-next-line no-console
				console.log(res)
				tmpUserData = res.data
				tmpUserData["products"].push(productId)
				dispatch("updateUser2")
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('addProductId: Could not productId ' + productId + ' to user ' + rootState.user + '. Error = ' + error))
	},

	removeProductId({
		rootState,
		dispatch
	}, products) {
		globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				// eslint-disable-next-line no-console
				console.log(res)
				tmpUserData = res.data
				tmpUserData["products"] = products
				dispatch("updateUser2")
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('removeProductId: Could not reset allowed products for user ' + rootState.user + '. Error = ' + error))
	},

	updateUser2({
		rootState
	}) {
		globalAxios({
				method: 'PUT',
				url: '/_users/org.couchdb.user:' + rootState.user,
				withCredentials: true,
				data: tmpUserData
			}).then(res => {
				// eslint-disable-next-line no-console
				console.log(res)
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('updateUser: Could not update user data for user ' + rootState.user + '. Error = ' + error))
	}
}

export default {
	actions
}
