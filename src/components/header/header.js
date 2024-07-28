import Licence from './licence.vue'
import { isValidEmail } from '../../common_functions.js'
import { authorization, utilities } from '../mixins/generic.js'
import logo from '../../assets/logo.png'
import store from '../../store/store.js'

const MINPASSWORDLENGTH = 8

function created() {
	// add tag when DEMO version
	if (store.state.demo) this.appVersion = this.appVersion + ' DEMO'
}

function data() {
	return {
		appVersion: 'v.2.2.8',
		logo: logo,
		disableOkButton: false,
		oldPassword: '',
		newPassword1: '',
		newPassword2: '',
		newEmail1: "",
		newEmail2: "",
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

const computed = {
	canChangeDb() {
		return store.state.userData.myOptions && store.state.userData.myOptions.proUser === 'true' && store.state.myAssignedDatabases.length > 1
	},

	emailIsCheckedOk() {
		return this.newEmail1 === this.newEmail2 && isValidEmail(this.newEmail1)
	}
}

const methods = {
	saveMyOptions() {
		// refreshPlanningboard to (un)show the OnHold column
		this.refreshPlanningboard()
		this.showOptionsModal = false
		store.dispatch('saveMyOptionsAsync')
	},

	refreshPlanningboard() {
		if (this.isPlanningBoardSelected) store.dispatch('loadPlanningBoard', { sprintId: store.state.loadedSprintId, team: store.state.userData.myTeam })
	},

	showOptions() {
		this.showOptionsModal = true
	},

	changeDatabase() {
		this.headerMyDatabase = store.state.userData.currentDb
		this.headerDatabaseOptions = []
		for (const db of store.state.myAssignedDatabases) {
			this.headerDatabaseOptions.push(db)
		}
		this.$refs.changeDatabaseRef.show()
	},

	changeTeam() {
		this.selectedTeam = this.myTeam
		this.teamOptions = []
		for (const team of Object.keys(store.state.allTeams)) {
			this.teamOptions.push(team)
		}
		this.$refs.changeTeamRef.show()
	},

	showMyTeam() {
		this.selectedTeam = this.myTeam
		this.doShowTeam()
		this.$refs.showTeamRef.show()
	},

	selectProducts() {
		this.newDefaultProductId = this.getCurrentDefaultProductId
		this.selectedProducts = this.getMyAssignedProductIds
		this.$refs.selectProductsRef.show()
	},

	changeMyPassword() {
		if (this.isServerAdmin) { alert("As a 'server admin' you cannot change your password here. Use Fauxton instead") } else this.$refs.changePwRef.show()
	},

	changeMyEmail() {
		this.newEmail1 = '',
		this.newEmail2 = '',
		this.$refs.changeEmailRef.show()
	},

	showMyRoles() {
		this.$refs.showMyRolesRef.show()
	},

	doChangeDatabase() {
		if (this.headerMyDatabase !== store.state.userData.currentDb) {
			const autoSignOut = true
			store.dispatch('changeCurrentDb', { dbName: this.headerMyDatabase, autoSignOut })
		}
	},

	doChangeTeam() {
		store.dispatch('changeTeam', this.selectedTeam)
	},

	doShowTeam() {
		store.dispatch('fetchTeamsAction', { dbName: store.state.selectedDatabaseName })
	},

	getMyTeamRecord(myTeam) {
		for (const rec of store.state.fetchedTeams) {
			if (rec.teamName === myTeam) return rec
		}
	},

	setDefaultProductOptions() {
		const options = []
		for (const o of store.state.myProductOptions) {
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
		store.dispatch('loadDoc', {
			id: this.newDefaultProductId, onSuccessCallback: () => {
				const myOldSubscriptions = this.getMyProductSubscriptions
				// update the user's profile; place the default productId on top in the array
				store.dispatch('updateMyProductSubscriptions', {
					productIds, onSuccessCallback: () => {
						if (store.state.currentProductId !== this.newDefaultProductId) {
							// another product is selected; collapse the currently selected product and switch to the new product
							store.commit('switchCurrentProduct', this.newDefaultProductId)
							// select new default product node
							store.state.helpersRef.selectNodeById(this.newDefaultProductId)
						}
						// remove unselected products from the tree view
						for (const id of myOldSubscriptions) {
							if (!productIds.includes(id)) {
								store.state.helpersRef.removeProduct(id)
							}
						}
						// load product(s) in the tree view if missing
						const missingIds = []
						for (const productId of productIds) {
							if (this.getMyProductSubscriptions.includes(productId)) {
								if (store.state.helpersRef.getNodeById(productId) === null) {
									missingIds.push(productId)
								}
							}
						}
						if (missingIds.length > 0) {
							store.dispatch('loadProducts', { missingIds, productIdToSelect: this.newDefaultProductId })
						}
						// show the event
						this.showSelectionEvent([store.state.helpersRef.getNodeById(this.newDefaultProductId)])
					}
				})
			}
		})
	},

	doChangeMyPassWord() {
		if (this.oldPassword !== store.state.userData.password) {
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
		store.dispatch('changeMyPasswordAction', this.newPassword1)
	},

	doChangeMyEmail() {
		store.dispatch('changeMyEmailAction', this.newEmail1)
	},

	onSignout() {	
		store.commit('endSession', 'header: user signed out')
	}
}

export default {
	mixins: [authorization, utilities],
	created,
	data,
	computed,
	methods,
	components: {
		appLicence: Licence
	}
}
