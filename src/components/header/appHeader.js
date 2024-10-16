import Licence from './AppLicence.vue'
import { isValidEmail } from '../../common_functions.js'
import { authorization, utilities } from '../mixins/generic.js'
import logo from '../../assets/logo.png'
import store from '../../store/store.js'

const MINPASSWORDLENGTH = 8

// show browser dependant message 'Changes you made may not be saved. Stay on page / Leave page' when exiting the app irregularly
const beforeUnloadHandler = (event) => {
	event.preventDefault()
}
window.addEventListener('beforeunload', beforeUnloadHandler)

function created() {
	// add tag when signed in as demoUser
	if (store.state.userData.user === 'demoUser') this.appVersion = this.appVersion + ' DEMO'
}

function data() {
	return {
		appVersion: store.state.appVersion,
		logo: logo,
		disableOkButton: false,
		oldPassword: '',
		newPassword1: '',
		newPassword2: '',
		newEmail1: '',
		newEmail2: '',
		selectedProducts: [],
		defaultProductOptions: [],
		selectedTeam: '',
		headerMyDatabase: '',
		headerDatabaseOptions: [],
		teamOptions: [],
		newDefaultProductId: undefined,
		showChangeDatabase: false,
		showOptionsModal: false,
		showUserguide: false,
		showSelectProducts: false,
		showSelectDefaultProduct: false,
	}
}

const computed = {
	canMessage() {
		return true
	},

	canChangeDb() {
		return store.state.userData.myOptions && store.state.userData.myOptions.proUser === 'true' && store.state.myAssignedDatabases.length > 1
	},

	emailIsCheckedOk() {
		return this.newEmail1 === this.newEmail2 && isValidEmail(this.newEmail1)
	},
}

const methods = {
	saveMyOptions() {
		// refreshPlanningboard to (un)show the OnHold column
		this.refreshPlanningboard()
		this.showOptionsModal = false
		store.dispatch('saveMyOptionsAsync')
	},

	refreshPlanningboard() {
		if (this.isPlanningBoardSelected)
			store.dispatch('loadPlanningBoard', { sprintId: store.state.loadedSprintId, team: store.state.userData.myTeam, caller: 'header.refreshPlanningboard' })
	},

	showOptions() {
		this.showOptionsModal = true
	},

	goMessage() {
		store.state.showGoMessaging = true
	},

	changeDatabase() {
		this.headerMyDatabase = store.state.userData.currentDb
		this.headerDatabaseOptions = []
		for (const db of store.state.myAssignedDatabases) {
			this.headerDatabaseOptions.push(db)
		}
		this.showChangeDatabase = true
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
		this.$refs.showTeamRef.show()
	},

	selectProducts() {
		this.newDefaultProductId = this.getCurrentDefaultProductId
		this.selectedProducts = this.getMyAssignedProductIds
		this.showSelectProducts = true
	},

	changeMyPassword() {
		if (this.isServerAdmin) {
			alert("As a 'server admin' you cannot change your password here. Use Fauxton instead")
		} else this.$refs.changePwRef.show()
	},

	changeMyEmail() {
		;(this.newEmail1 = ''), (this.newEmail2 = ''), this.$refs.changeEmailRef.show()
	},

	showMyRoles() {
		this.$refs.showMyRolesRef.show()
	},

	doChangeDatabase() {
		if (this.headerMyDatabase !== store.state.userData.currentDb) {
			window.removeEventListener('beforeunload', beforeUnloadHandler)
			const autoSignOut = true
			store.dispatch('changeCurrentDb', { dbName: this.headerMyDatabase, autoSignOut })
		}
	},

	/* Move tasks to the new team where this user is assigned to; when done other actions are started to complete the team change */
	doChangeTeam() {
		store.dispatch('updateTasksToNewTeam', {
			userName: store.state.userData.user,
			oldTeam: store.state.userData.myTeam,
			newTeam: this.selectedTeam,
		})
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

	/* Return if nothing is selected; set default product if 1 is selected; call showSelectDefaultProduct if > 1 is selected */
	doSelectProducts() {
		if (this.getMyProductSubscriptions.length > 0) {
			window.removeEventListener('beforeunload', beforeUnloadHandler)
			if (this.selectedProducts.length === 1) {
				this.newDefaultProductId = this.selectedProducts[0]
				store.dispatch('updateMyProductSubscriptions', { productIds: [this.selectedProducts[0]] })
			} else {
				this.setDefaultProductOptions()
				this.showSelectDefaultProduct = true
			}
		}
	},

	getSelectButtonText() {
		if (this.selectedProducts.length === 1) return 'Save and restart'
		return 'Continue'
	},

	/* Update the subscriptions array of this user */
	updateMultiProductsSubscriptions() {
		// the first (index 0) product is by definition the default product
		const myNewProductSubscriptions = [this.newDefaultProductId]
		const otherSubscriptions = []
		for (const p of this.selectedProducts) {
			if (p !== this.newDefaultProductId) {
				otherSubscriptions.push(p)
			}
		}
		store.dispatch('updateMyProductSubscriptions', { productIds: myNewProductSubscriptions.concat(otherSubscriptions) })
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
		window.removeEventListener('beforeunload', beforeUnloadHandler)
		store.state.signingOut = true
		store.dispatch('saveMyTreeViewAsync')
	},
}

export default {
	mixins: [authorization, utilities],
	created,
	data,
	computed,
	methods,
	components: {
		appLicence: Licence,
	},
}
