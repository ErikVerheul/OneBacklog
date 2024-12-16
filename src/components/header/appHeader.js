import router from '../../router'
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
		selectedTeam: '',
		headerMyDatabase: '',
		headerDatabaseOptions: [],
		teamOptions: [],
		showChangeDatabase: false,
		showOptionsModal: false,
		showUserguide: false,
		showSelectProducts: false,
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

	/* Return if nothing is selected */
	doSelectProducts() {
		if (this.getMyProductSubscriptionIds.length > 0) {
			window.removeEventListener('beforeunload', beforeUnloadHandler)
			store.dispatch('updateMyProductSubscriptions', { productIds: this.selectedProducts })
		}
	},

	getSelectButtonText() {
		if (this.selectedProducts.length === 1) return 'Save and restart'
		return 'Continue'
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

	switchToDetailProductView() {
		if (store.state.lastTreeView === 'detailProduct') {
			router.push('/detailProduct')
		} else {
			const onSuccessCallback = () => router.push('/detailProduct')
			store.dispatch('saveMyTreeViewAsync', { onSuccessCallback, doEndSession: false })
		}
	},

	onSignout() {
		window.removeEventListener('beforeunload', beforeUnloadHandler)
		store.state.signingOut = true
		store.dispatch('saveMyTreeViewAsync', { doEndSession: true })
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
