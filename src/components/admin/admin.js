import { STATE, LEVEL, MISC } from '../../constants.js'
import common_admin from './common_admin'

function mounted() {
	this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
}

const methods = {
/* For all options the available databases are fetched once at mount */
	createUser() {
		this.optionSelected = 'Create a user and assign product(s)'
		this.getUserFirst = false
		this.userName = undefined
		this.password = undefined
		this.userEmail = undefined
		this.credentialsReady = false
		this.$store.state.backendMessages = []
		this.localMessage = ''
		this.$store.state.useracc.userIsAdmin = false
		this.$store.state.useracc.userIsAPO = false
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
	},

	removeUser() {
		this.optionSelected = 'Remove a user'
		this.getUserFirst = true
		this.$store.state.isUserFound = false
		this.userName = undefined
		this.$store.state.backendMessages = []
		this.localMessage = ''
		this.$store.state.isUserDeleted = false
		this.$store.dispatch('getAllUsers')
	},

	createProduct() {
		this.optionSelected = 'Create a product'
		this.getUserFirst = false
		this.productTitle = ''
		this.$store.state.isProductCreated = false
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
	},

	removeProduct() {
		this.optionSelected = 'Remove a product'
		this.getUserFirst = false
		this.dbIsSelected = false
	},

	doCreateProduct() {
		const _id = this.createId()
		// use the negative creation date as the priority of the new product so that sorting on priority gives the same result as sorting on id
		const priority = -Date.now()
		// create a new document
		const newProduct = {
			_id,
			type: 'backlogItem',
			productId: _id,
			parentId: 'root',
			team: 'not assigned yet',
			level: LEVEL.PRODUCT,
			state: STATE.INPROGRESS,
			reqarea: null,
			title: this.productTitle,
			followers: [],
			description: window.btoa(''),
			acceptanceCriteria: window.btoa('<p>Please do not neglect</p>'),
			priority,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			delmark: false
		}
		// update the database and add the product to this admin's subscriptions and productsRoles
		this.$store.dispatch('createProductAction', { dbName: this.$store.state.selectedDatabaseName, newProduct, priority })
	},

	doRemoveUser() {
		this.$store.dispatch('removeUserIfExistent', this.selectedUser)
	},
}

export default {
	extends: common_admin,
	mounted,
	methods
}
