import common_admin from './common_admin'
import store from '../../store/store.js'

const methods = {
	/* For all options only the databases assigned to the assistAdmin are available for selection */
	createUser() {
		this.optionSelected = 'Create a user and assign product(s)'
		this.getUserFirst = false
		this.userName = undefined
		this.password = undefined
		this.userEmail = undefined
		this.credentialsReady = false
		store.state.backendMessages = []
		this.localMessage = ''
		store.state.isUserRemoved = false
		store.state.isUserCreated = false
		store.state.selectedDatabaseName = undefined
	},

	maintainUsers() {
		this.optionSelected = 'Maintain user permissions to products'
		this.getUserFirst = true
		this.isUserDbSelected = false
		this.canRemoveLastProduct = true
		;(this.canRemoveDatabase = true), (this.localMessage = '')
		store.state.backendMessages = []
		store.state.isUserFound = false
		store.state.areDatabasesFound = false
		store.state.areProductsFound = false
		store.state.isUserUpdated = false
		store.state.selectedDatabaseName = undefined
		// get the users to select from
		store.dispatch('getAllUsers')
	},
}

export default {
	extends: common_admin,
	methods,
}
