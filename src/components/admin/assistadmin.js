import common_admin from './common_admin'

const methods = {
	/* For all options only the databases assigned to the assistAdmin are available for selection */
	createUser() {
		this.optionSelected = 'Create a user and assign product(s)'
		this.getUserFirst = false
		this.userName = undefined
		this.password = undefined
		this.userEmail = undefined
		this.credentialsReady = false
		this.$store.state.backendMessages = []
		this.localMessage = ''
		this.$store.state.isUserRemoved = false
		this.$store.state.isUserCreated = false
	},

	maintainUsers() {
		this.optionSelected = 'Maintain user permissions to products'
		this.getUserFirst = true
		this.isUserDbSelected = false
		this.canRemoveLastProduct = true
		this.canRemoveDatabase = true,
		this.localMessage = ''
		this.$store.state.backendMessages = []
		this.$store.state.isUserFound = false
		this.$store.state.areDatabasesFound = false
		this.$store.state.areProductsFound = false
		this.$store.state.isUserUpdated = false
		// get the users to select from
		this.$store.dispatch('getAllUsers')
	}
}

export default {
	extends: common_admin,
	methods
}
