import common_admin from './common_admin'
const PRODUCTLEVEL = 2
const INPROGRESS = 4

const methods = {
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
			level: PRODUCTLEVEL,
			state: INPROGRESS,
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
	methods
}
