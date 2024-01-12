import { STATE, LEVEL, MISC } from '../../constants.js'
import { createId } from '../../common_functions.js'
import common_admin from './common_admin'
import store from '../../store/store.js'

function mounted() {
	store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
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
		store.state.backendMessages = []
		this.localMessage = ''
		store.state.useracc.userIsAdmin = false
		store.state.useracc.userIsAPO = false
		store.state.isUserRemoved = false
		store.state.isUserCreated = false
	},

	maintainUsers() {
		this.optionSelected = 'Maintain user permissions to products'
		this.getUserFirst = true
		this.isUserDbSelected = false
		this.canRemoveLastProduct = true
		this.canRemoveDatabase = true,
		this.localMessage = ''
		store.state.backendMessages = []
		store.state.isUserFound = false
		store.state.areDatabasesFound = false
		store.state.areProductsFound = false
		store.state.isUserUpdated = false
		// get the users to select from
		store.dispatch('getAllUsers')
	},

	removeUser() {
		this.optionSelected = 'Remove a user'
		this.getUserFirst = true
		store.state.isUserFound = false
		this.userName = undefined
		store.state.backendMessages = []
		this.localMessage = ''
		store.state.isUserDeleted = false
		store.dispatch('getAllUsers')
	},

	createProduct() {
		this.optionSelected = 'Create a product'
		this.getUserFirst = false
		this.productTitle = ''
		store.state.isProductCreated = false
		this.dbIsSelected = false
		store.state.backendMessages = []
	},

	removeProduct() {
		this.optionSelected = 'Remove a product'
		this.getUserFirst = false
		this.dbIsSelected = false
	},

	doCreateProduct() {
		const _id = createId()
		// a newly created product node will be inserted below the last product (see createProductAction in utils.js)
		const lastProductNode = store.state.helpersRef.getRootNode().children.slice(-1)[0]
		const priority = Math.floor((lastProductNode.data.priority + Number.MIN_SAFE_INTEGER) / 2)
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
			}]
		}
		// update the database, insert the new node below the last product and add the product to this admin's subscriptions and productsRoles
		store.dispatch('createProductAction', { dbName: store.state.selectedDatabaseName, newProduct, lastProductNode })
	},

	doRemoveUser() {
		store.dispatch('removeUserIfExistent', this.selectedUser)
	},
}

export default {
	extends: common_admin,
	mounted,
	methods
}
