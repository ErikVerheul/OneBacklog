import Licence from './licence.vue'
import { authorization, utilities } from '../mixins/generic.js'

const MINPASSWORDLENGTH = 8

function created() {
	// add tag when DEMO version
	if (this.$store.state.demo) this.appVersion = this.appVersion + ' DEMO'
}

function data() {
	return {
		appVersion: 'OneBackLog v.1.13',
		disableOkButton: false,
		oldPassword: '',
		newPassword1: '',
		newPassword2: '',
		selectedProducts: [],
		defaultProductOptions: [],
		selectedTeam: '',
		headerMyDatabase: '',
		headerDatabaseOptions: [],
		teamOptions: [],
		newDefaultProductId: undefined,
		showOptionsModal: false
	}
}

const methods = {
	saveMyOptions() {
		this.$store.dispatch('saveMyOptionsAsync')
	},

	refreshPlanningboard() {
		if (this.isPlanningBoardSelected) this.$store.dispatch('loadPlanningBoard', { sprintId: this.$store.state.loadedSprintId, team: this.$store.state.userData.myTeam })
	},

	showOptions() {
		this.showOptionsModal = true
	},

	changeDatabase() {
		this.headerMyDatabase = this.$store.state.userData.currentDb
		this.headerDatabaseOptions = []
		for (const db of this.$store.state.myAssignedDatabases) {
			this.headerDatabaseOptions.push(db)
		}
		this.$refs.changeDatabaseRef.show()
	},

	changeTeam() {
		this.selectedTeam = this.myTeam
		this.teamOptions = []
		for (const team of Object.keys(this.$store.state.allTeams)) {
			this.teamOptions.push(team)
		}
		this.$refs.changeTeamRef.show()
	},

	selectProducts() {
		this.newDefaultProductId = this.getCurrentDefaultProductId
		this.selectedProducts = this.getMyAssignedProductIds
		this.$refs.selectProductsRef.show()
	},

	changeMyPassword() {
		if (this.isServerAdmin) { alert("As a 'server admin' you cannot change your password here. Use Fauxton instead") } else this.$refs.changePwRef.show()
	},

	showMyRoles() {
		this.$refs.showMyRolesRef.show()
	},

	doChangeDatabase() {
		if (this.headerMyDatabase !== this.$store.state.userData.currentDb) {
			const autoSignOut = true
			this.$store.dispatch('changeCurrentDb', { dbName: this.headerMyDatabase, autoSignOut })
		}
	},

	doChangeTeam() {
		this.$store.dispatch('changeTeam', this.selectedTeam)
	},

	setDefaultProductOptions() {
		const options = []
		for (const o of this.$store.state.myProductOptions) {
			if (this.selectedProducts.includes(o.value)) {
				options.push(o)
			}
		}
		this.defaultProductOptions = options
	},

	/* Return if nothing is selected; set default product if 1 is selected; call selectDefaultProductRef if > 1 is selected */
	doSelectProducts() {
		if (this.getMyProductSubscriptions.length > 0) {
			if (this.selectedProducts.length === 1) {
				this.newDefaultProductId = this.selectedProducts[0]
				this.updateProductsView([this.selectedProducts[0]])
			} else {
				this.setDefaultProductOptions()
				this.$refs.selectDefaultProductRef.show()
			}
		}
	},

	/* Update the subscriptions array of this user */
	updateProductsSubscriptions() {
		// the first (index 0) product is by definition the default product
		const myNewProductSubscriptions = [this.newDefaultProductId]
		const otherSubscriptions = []
		for (const p of this.selectedProducts) {
			if (p !== this.newDefaultProductId) {
				otherSubscriptions.push(p)
			}
		}
		this.updateProductsView(myNewProductSubscriptions.concat(otherSubscriptions))
	},

	/* The default product changed, update currentProductId, load and show in the tree view and update the user's profile */
	updateProductsView(productIds) {
		this.$store.dispatch('loadDoc', {
			id: this.newDefaultProductId, onSuccessCallback: () => {
				const myOldSubscriptions = this.getMyProductSubscriptions
				// update the user's profile; place the default productId on top in the array
				this.$store.dispatch('updateMyProductSubscriptions', {
					productIds, onSuccessCallback: () => {
						if (this.$store.state.currentProductId !== this.newDefaultProductId) {
							// another product is selected; collapse the currently selected product and switch to the new product
							this.$store.commit('switchCurrentProduct', this.newDefaultProductId)
							// select new default product node
							window.slVueTree.selectNodeById(this.newDefaultProductId)
						}
						// remove unselected products from the tree view
						for (const id of myOldSubscriptions) {
							if (!productIds.includes(id)) {
								window.slVueTree.removeProduct(id)
							}
						}
						// load product(s) in the tree view if missing
						const missingIds = []
						for (const productId of productIds) {
							if (this.getMyProductSubscriptions.includes(productId)) {
								if (window.slVueTree.getNodeById(productId) === null) {
									missingIds.push(productId)
								}
							}
						}
						if (missingIds.length > 0) {
							this.$store.dispatch('loadProducts', { missingIds, productIdToSelect: this.newDefaultProductId })
						}
						// show the event
						this.showSelectionEvent([window.slVueTree.getNodeById(this.newDefaultProductId)])
					}
				})
			}
		})
	},

	doChangeMyPassWord() {
		if (this.oldPassword !== this.$store.state.userData.password) {
			alert('Your current password is incorrect. Please try again.')
			return
		}
		if (this.newPassword1 !== this.newPassword2) {
			alert('You entered two different new passwords. Please try again.')
			return
		}
		if (this.newPassword1.length < MINPASSWORDLENGTH) {
			alert('Your new password must be 8 characters or longer. Please try again.')
			return
		}
		this.$store.dispatch('changeMyPasswordAction', this.newPassword1)
	},

	onSignout() {
		this.$store.dispatch('signout')
	}
}

export default {
	mixins: [authorization, utilities],
	created,
	data,
	methods,
	components: {
		appLicence: Licence
	}
}
