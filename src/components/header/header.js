import Licence from './licence.vue'
import { authorization, utilities } from '../mixins/generic.js'

const MINPASSWORDLENGTH = 8

function created() {
	// add tag when DEMO version
	if (this.$store.state.demo) this.appVersion = this.appVersion + ' DEMO'
}

function data() {
	return {
		appVersion: 'OneBackLog v.1.3',
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
		newDefaultProductId: this.$store.state.currentDefaultProductId
	}
}

const methods = {
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
		this.selectedProducts = this.getMyProductSubscriptions
		this.$refs.selectProductsRef.show()
	},

	changeMyPassword() {
		if (this.isServerAdmin) { alert("As a 'server admin' you cannot change your password here. Use Fauxton instead") } else this.$refs.changePwRef.show()
	},

	showMyRoles() {
		this.$refs.showMyRolesRef.show()
	},

	doChangeDatabase() {
		window.slVueTree.resetFilters('doChangeDatabase')
		if (this.headerMyDatabase !== this.$store.state.userData.currentDb) {
			const autoSignOut = true
			this.$store.dispatch('changeCurrentDb', { dbName: this.headerMyDatabase, autoSignOut })
		}
	},

	doChangeTeam() {
		this.$store.dispatch('changeTeam', this.selectedTeam)
	},

	/* Return if nothing is selected; set default product if 1 is selected; call selectDefaultProductRef if > 1 is selected */
	doSelectProducts() {
		if (this.getMyProductSubscriptions.length === 0) {
			return
		}

		this.defaultProductOptions = []
		if (this.selectedProducts.length === 1) {
			this.updateProductsView([this.selectedProducts[0]], this.selectedProducts[0])
		} else {
			for (const o of this.$store.state.myProductOptions) {
				if (this.selectedProducts.includes(o.value)) {
					this.defaultProductOptions.push(o)
				}
			}
			this.$refs.selectDefaultProductRef.show()
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
		this.updateProductsView(myNewProductSubscriptions.concat(otherSubscriptions), this.newDefaultProductId)
	},

	updateProductsView(productIds, newDefaultProductId) {
		// the default product changed
		this.$store.dispatch('loadDoc', {
			id: newDefaultProductId, onSuccessCallback: () => {
				if (this.$store.state.currentProductId !== newDefaultProductId) {
					// collapse the previously selected product
					window.slVueTree.collapseTree()
					// update globals to new default
					this.$store.state.currentProductId = newDefaultProductId
					this.$store.state.currentDefaultProductId = newDefaultProductId
					// select new default product node
					window.slVueTree.selectNodeById(newDefaultProductId)
					// expand the newly selected product up to the feature level
					window.slVueTree.expandTree()
				}
				// remove unselected products from the tree view
				for (const productId of this.getMyProductSubscriptions) {
					if (!productIds.includes(productId)) {
						window.slVueTree.removeProduct(productId)
					}
				}
				// update my product subscriptions and add product(s) if missing
				this.$store.commit('updateMyProductSubscriptions', productIds)
				const missingIds = []
				for (const productId of productIds) {
					if (this.getMyProductSubscriptions.includes(productId)) {
						if (window.slVueTree.getNodeById(productId) === null) {
							missingIds.push(productId)
						}
					}
				}
				if (missingIds.length > 0) {
					this.$store.dispatch('loadProducts', { missingIds, newDefaultProductId })
				}
				// update the user's profile; place the default productId on top in the array
				const myProductIds = [newDefaultProductId]
				for (let id of productIds) {
					if (!myProductIds.includes(id)) myProductIds.push(id)
				}
				this.$store.dispatch('updateMySubscriptions', myProductIds)
				this.showSelectionEvent([window.slVueTree.getNodeById(newDefaultProductId)])
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
