import { MISC } from '../../constants.js'
import { addToArray, removeFromArray, createId, isValidEmail } from '../../common_functions.js'
import AppHeader from '../header/AppHeader.vue'
import router from '../../router.js'
import { utilities } from '../mixins/GenericMixin.js'
import store from '../../store/store.js'

const HOUR_MILIS = 60 * 60000
const DAY_MILIS = 24 * HOUR_MILIS

function mounted() {
	store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
}

function data() {
	return {
		acceptSprintNrMsg: '',
		getUserFirst: false,
		dbIsSelected: false,
		optionSelected: 'Select a task',
		productTitle: '',
		userName: undefined,
		password: undefined,
		userEmail: undefined,
		credentialsReady: false,
		teamName: '',
		roleOptions: [
			{ text: 'PO', value: 'PO' },
			{ text: 'developer', value: 'developer' },
			{ text: 'guest', value: 'guest' },
		],
		localMessage: '',
		selectedUser: undefined,
		isDatabaseSelected: false,
		startDateStr: '',
		sprintStartTimeStr: '12',
		sprintLengthStr: '14',
		numberOfSprintsStr: '26',
		show: true,
		workflowStatusMsg: 'found',
		extendNumberStr: '',
		changedNumberStr: '',
		changedDurationStr: '',
		changedHourStr: '',
		currentSprintNr: undefined,
		isUserDbSelected: false,
		selectedTeamId: null,
		selectedTeamName: undefined,
		teamNamesToRemove: [],
		teamsToRemoveOptions: [],
		teamOptions: [],
		canRemoveLastProduct: true,
		canRemoveDatabase: true,
		maxHistoryDays: 365,
		maxHistoryEvents: 100,
	}
}

const computed = {
	extendDisableOkButton() {
		return !(!isNaN(this.extendNumberStr) && parseInt(this.extendNumberStr) > 0 && Number.isInteger(parseFloat(this.extendNumberStr)))
	},

	acceptSprintnr() {
		if (isNaN(this.changedNumberStr) || !Number.isInteger(parseFloat(this.changedNumberStr))) return false
		const changeNr = parseInt(this.changedNumberStr)
		const lastDefinedNr = store.state.loadedCalendar.length - 1
		const accepted = changeNr >= this.currentSprintNr && changeNr <= lastDefinedNr
		this.acceptSprintNrMsg = accepted
			? ``
			: `Select a sprint number >= the current sprint ${this.currentSprintNr} and smaller than the last defined sprint ${lastDefinedNr}`
		return accepted
	},

	acceptNewSprintLength() {
		if (isNaN(this.changedDurationStr) || !Number.isInteger(parseFloat(this.changedDurationStr))) return false
		const sprintDuration = parseInt(this.changedDurationStr)
		return sprintDuration > 0 && sprintDuration <= 28
	},

	acceptHourChange() {
		if (isNaN(this.changedHourStr) || !Number.isInteger(parseFloat(this.changedHourStr))) return false
		const changeHour = parseInt(this.changedHourStr)
		return changeHour >= -12 && changeHour <= 12
	},

	acceptNewEndDate() {
		return this.getLoadedSprintById().startTimestamp + this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS >= Date.now()
	},

	changeDisableOkButton() {
		return !this.acceptSprintnr || !this.acceptNewSprintLength || !this.acceptHourChange
	},
}

const methods = {
	maintainDefaultSprintCalendar() {
		this.optionSelected = 'Maintain the default sprint calendar'
		this.getUserFirst = false
		this.checkForExistingCalendar = true
		store.state.isDefaultCalendarLoaded = false
		store.state.isCalendarSaved = false
		this.dbIsSelected = false
		store.state.backendMessages = []
		this.startDateStr = undefined
		this.workflowStatusMsg = 'found'
		this.extendNumberStr = undefined
	},

	createOrUpdateTeamCalendar() {
		this.optionSelected = 'Create / Maintain a team sprint calendar'
		this.getUserFirst = false
		this.checkForExistingCalendar = true
		store.state.isTeamCalendarLoaded = false
		store.state.isCalendarSaved = false
		this.dbIsSelected = false
		store.state.backendMessages = []
		this.startDateStr = undefined
		this.workflowStatusMsg = 'found'
		this.extendNumberStr = undefined
	},

	createTeam() {
		this.optionSelected = 'Create a team'
		this.getUserFirst = false
		this.dbIsSelected = false
		this.teamName = ''
		store.state.isTeamCreated = false
	},

	listTeams() {
		this.optionSelected = 'List teams'
		this.getUserFirst = false
		this.dbIsSelected = false
		store.state.backendMessages = []
		store.state.fetchedTeams = []
		store.state.areTeamsFound = false
	},

	removeTeams() {
		this.optionSelected = 'Remove teams without members'
		this.getUserFirst = false
		this.dbIsSelected = false
		store.state.areTeamsRemoved = false
	},

	setHistoryPreservation() {
		this.optionSelected = 'Set the history retention paramaters'
		this.maxHistoryDays = store.state.configData.historyRetention.maxHistoryDays
		this.maxHistoryEvents = store.state.configData.historyRetention.maxHistoryEvents
		store.state.backendMessages = []
		this.dbIsSelected = false
	},

	doAfterDbIsSelected() {
		switch (this.optionSelected) {
			case 'Create a user and assign product(s)':
				{
					const onlyMyproducts = store.state.useracc.userIsAssistAdmin
					this.callGetDbProducts(onlyMyproducts)
				}
				break
			case 'Maintain the default sprint calendar':
				store.state.isDefaultCalendarLoaded = false
				store.state.isTeamCalendarLoaded = false
				break
			case 'Create / Maintain a team sprint calendar':
				this.teamOptions = []
				this.selectedTeamName = undefined
				store.state.isDefaultCalendarLoaded = false
				store.state.isTeamCalendarLoaded = false
				store.dispatch('fetchTeamsAction', {
					dbName: store.state.selectedDatabaseName,
					onSuccessCallback: () => {
						for (const t of store.state.fetchedTeams) {
							this.teamOptions.push(t.teamName)
						}
					},
				})
				break
			case 'List teams':
				store.dispatch('fetchTeamsAction', { dbName: store.state.selectedDatabaseName })
				break
			case 'Remove teams without members':
				this.teamNamesToRemove = []
				store.dispatch('fetchTeamsAction', {
					dbName: store.state.selectedDatabaseName,
					onSuccessCallback: () => {
						for (const t of store.state.fetchedTeams) {
							if (t.members.length === 0) {
								if (!this.teamsToRemoveOptions.includes(t.teamName)) this.teamsToRemoveOptions.push(t.teamName)
							}
						}
					},
				})
				break
		}
		this.dbIsSelected = true
	},

	getUserAssignedDatabases() {
		return Object.keys(store.state.useracc.fetchedUserData.myDatabases)
	},

	getLoadedSprintById() {
		return store.state.loadedCalendar[parseInt(this.changedNumberStr)]
	},

	getStartDate() {
		return new Date(this.getLoadedSprintById().startTimestamp).toString()
	},

	getDuration() {
		return this.getLoadedSprintById().sprintLength / DAY_MILIS
	},

	getEndDate() {
		return new Date(this.getLoadedSprintById().startTimestamp + this.getLoadedSprintById().sprintLength).toString()
	},

	calcNewEndDate() {
		const newSprintLength = this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS
		return new Date(this.getLoadedSprintById().startTimestamp + newSprintLength).toString()
	},

	changeSprintInCalendar() {
		const currentCalendar = store.state.loadedCalendar
		const calendarLength = currentCalendar.length
		const unChangedCalendar = currentCalendar.slice(0, parseInt(this.changedNumberStr))
		const changedSprint = currentCalendar[parseInt(this.changedNumberStr)]
		const sprintLengthChange = this.changedDurationStr * DAY_MILIS - changedSprint.sprintLength + this.changedHourStr * HOUR_MILIS
		changedSprint.sprintLength += sprintLengthChange
		const newSprintCalendar = unChangedCalendar.concat(changedSprint)
		let prevSprintEnd = changedSprint.startTimestamp + changedSprint.sprintLength
		for (let i = newSprintCalendar.length; i < calendarLength; i++) {
			const sprint = currentCalendar[i]
			sprint.startTimestamp = prevSprintEnd
			newSprintCalendar.push(sprint)
			prevSprintEnd = sprint.startTimestamp + sprint.sprintLength
		}
		if (store.state.isDefaultCalendarLoaded)
			store.dispatch('saveDefaultSprintCalendarAction', {
				dbName: store.state.selectedDatabaseName,
				newSprintCalendar,
			})
		if (store.state.isTeamCalendarLoaded)
			store.dispatch('updateTeamCalendarAction', {
				dbName: store.state.selectedDatabaseName,
				teamId: this.selectedTeamId,
				teamName: this.selectedTeamName,
				newSprintCalendar,
			})
	},

	extendCalendar() {
		const currentCalendar = store.state.loadedCalendar
		const lastSprint = currentCalendar.slice(-1)[0]
		const sprintLengthMillis = lastSprint.sprintLength
		const numberOfSprints = parseInt(this.extendNumberStr)
		const startIdx = currentCalendar.length
		const startDate = lastSprint.startTimestamp + lastSprint.sprintLength
		const extendSprintCalendar = []
		let j = 0
		for (let i = startIdx; i < startIdx + numberOfSprints; i++) {
			const sprintId = createId()
			const obj = {
				id: sprintId,
				name: 'sprint-' + i,
				startTimestamp: startDate.valueOf() + j * sprintLengthMillis,
				sprintLength: sprintLengthMillis,
			}
			extendSprintCalendar.push(obj)
			j++
		}
		const newSprintCalendar = currentCalendar.concat(extendSprintCalendar)
		if (store.state.isDefaultCalendarLoaded)
			store.dispatch('saveDefaultSprintCalendarAction', {
				dbName: store.state.selectedDatabaseName,
				newSprintCalendar,
			})
		if (store.state.isTeamCalendarLoaded)
			store.dispatch('updateTeamCalendarAction', {
				dbName: store.state.selectedDatabaseName,
				teamId: this.selectedTeamId,
				teamName: this.selectedTeamName,
				newSprintCalendar,
			})
	},

	showProductView() {
		router.push('/treeView')
	},

	validEmail: function (email) {
		if (isValidEmail(email)) {
			this.localMessage = ''
			return true
		}
		this.localMessage = 'Please enter a valid e-mail address'
		return false
	},

	checkCredentials() {
		if (this.userName && this.password && this.userEmail && this.validEmail(this.userEmail)) {
			this.credentialsReady = true
			// check if this user name already exists
			const justCheck = true
			this.doFetchUser(this.userName, justCheck)
		}
	},

	/* Get all my assigned product ids, titles and assigned roles of the selected database in store.state.useracc.dbProducts */
	callGetDbProducts() {
		this.isUserDbSelected = true
		store.dispatch('getProductsRolesAction', { dbName: store.state.selectedDatabaseName })
	},

	doCreateUser() {
		const userIsAdminOrAPO = store.state.useracc.userIsAdmin || store.state.useracc.userIsAPO
		// calculate the association of the assigned generic roles
		const allRoles = []
		if (store.state.useracc.userIsAdmin) allRoles.push('admin')
		if (store.state.useracc.userIsAPO) allRoles.push('APO')

		// generate the productsRoles and subscriptions properties and add the non generic roles
		const productsRoles = {}
		const subscriptions = []
		let rolesAreAssigned = false
		for (const prod of store.state.useracc.dbProducts) {
			if (prod.roles.length > 0) {
				productsRoles[prod.id] = prod.roles
				rolesAreAssigned = true
				// add all products to the user's descriptions
				subscriptions.push(prod.id)
				// add the non generic roles
				for (const role of prod.roles) {
					if (!allRoles.includes(role)) allRoles.push(role)
				}
			}
		}
		if (!userIsAdminOrAPO && !rolesAreAssigned) {
			// must assign at least one role
			return
		}

		const newUserData = {
			name: this.userName,
			password: this.password,
			type: 'user',
			roles: allRoles,
			email: this.userEmail,
			currentDb: store.state.selectedDatabaseName,
			myDatabases: {
				[store.state.selectedDatabaseName]: {
					myTeam: MISC.NOTEAM,
					subscriptions,
					productsRoles,
				},
			},
		}
		if (store.state.isUserRemoved) {
			newUserData._rev = store.state.useracc.fetchedUserData._rev
			// replace existing removed user
			store.dispatch('updateUserDb', { data: newUserData, onSuccessCallback: () => (store.state.isUserCreated = true) })
		} else store.dispatch('createUserIfNotExistentAction', newUserData)
	},

	/* Creates fetchedUserData and have the prod.roles set in dbProducts */
	doFetchUser(userName, justCheck) {
		store.dispatch('loadUserData', { userName, justCheck })
	},

	/*
	 * Update the generic and product roles in the user's profile, including the product subscriptions.
	 * Check if the profile holds at least one database with at least one product.
	 * The currentDb must be present in myDatabases.
	 * Any subscription to a product must refer to an existing product.
	 */
	doUpdateUser() {
		const dbName = store.state.selectedDatabaseName
		const newUserData = store.state.useracc.fetchedUserData
		const userIsAdminOrAPO = store.state.useracc.userIsAdmin || store.state.useracc.userIsAPO
		// update the generic roles
		if (store.state.useracc.userIsAssistAdmin) {
			newUserData.roles = addToArray(newUserData.roles, 'assistAdmin')
		} else newUserData.roles = removeFromArray(newUserData.roles, 'assistAdmin')
		if (store.state.useracc.userIsAdmin) {
			newUserData.roles = addToArray(newUserData.roles, 'admin')
		} else newUserData.roles = removeFromArray(newUserData.roles, 'admin')
		if (store.state.useracc.userIsAPO) {
			newUserData.roles = addToArray(newUserData.roles, 'APO')
		} else newUserData.roles = removeFromArray(newUserData.roles, 'APO')

		// update the products roles for this database
		let newProductsRoles = {}
		if (newUserData.myDatabases[dbName]) {
			// the database is already assigned to this user
			for (const prod of store.state.useracc.dbProducts) {
				if (userIsAdminOrAPO) {
					// users with admin and APO roles have access to all products
					newProductsRoles[prod.id] = prod.roles
				} else {
					if (prod.roles.length > 0) {
						newProductsRoles[prod.id] = prod.roles
					} else {
						// users without admin or APO roles and no roles assigned to a product have no access to that product
						delete newProductsRoles[prod.id]
					}
				}
			}
			// check if the last product of the last database is to be removed from a non admin or APO user
			if (!userIsAdminOrAPO && Object.keys(newUserData.myDatabases).length === 1) {
				const productNames = Object.keys(newProductsRoles)
				let rolesCount = 0
				for (let pn of productNames) {
					rolesCount += newProductsRoles[pn].length
				}
				if (rolesCount === 0) {
					// cannot remove last product from user profile
					this.canRemoveLastProduct = false
					return
				}
			}
		} else {
			// the database is new to this user; create a new entry
			newUserData.myDatabases[dbName] = {
				myTeam: MISC.NOTEAM,
				subscriptions: [],
			}
			for (const prod of store.state.useracc.dbProducts) {
				if (userIsAdminOrAPO || prod.roles.length > 0) {
					// admin and APO users have access to a products without any assigned role, other users have no access when no roles are assigned to a product
					newProductsRoles[prod.id] = prod.roles
					// add product to the user's subscriptions
					newUserData.myDatabases[dbName].subscriptions.push(prod.id)
				}
			}
		}

		// remove the database entry from the user's profile if no roles are assigned for non admin or APO users
		let removeDb = true
		if (!userIsAdminOrAPO) {
			const productIds = Object.keys(newProductsRoles)
			for (let prod of productIds) {
				if (newProductsRoles[prod] && newProductsRoles[prod].length > 0) removeDb = false
			}
			if (removeDb) {
				if (Object.keys(newUserData.myDatabases).length > 1) {
					// delete the database entry in the profile (includes all subscriptions) only if the user is assigned more than one database
					delete newUserData.myDatabases[dbName]
					if (dbName === newUserData.currentDb) {
						// must change current database
						const databases = Object.keys(newUserData.myDatabases)
						// pick the first
						newUserData.currentDb = databases[0]
					}
				} else {
					// cannot remove last database from user profile
					this.canRemoveDatabase = false
					return
				}
			}
		} else {
			// admin and APO roles have access to all databases
			removeDb = false
		}

		// update the subscriptions, productsRoles ans product descriptions if the database is not removed from the user's profile
		if (!removeDb) {
			// remove obsolete subscriptions
			const newSubscriptions = []
			for (let s of newUserData.myDatabases[dbName].subscriptions) {
				if (newProductsRoles[s]) {
					newSubscriptions.push(s)
				}
			}
			newUserData.myDatabases[dbName].subscriptions = newSubscriptions
			newUserData.myDatabases[dbName].productsRoles = newProductsRoles
			// the user must have at least one product subscription
			if (newUserData.myDatabases[dbName].subscriptions.length === 0) {
				if (Object.keys(newProductsRoles).length > 0) {
					// subscribe the first assigned product
					const subscriptionId = Object.keys(newProductsRoles)[0]
					newUserData.myDatabases[dbName].subscriptions = [subscriptionId]
					// get the product name
					let productName = ''
					for (const o of Object.values(store.state.useracc.dbProducts)) {
						if (o.id === subscriptionId) {
							productName = o.value
							break
						}
					}
					this.localMessage = `Product '${productName}' is added the the user's product subscriptions.`
				}
			}
		}
		store.dispatch('updateUserDb', {
			data: newUserData,
			onSuccessCallback: () => {
				if (removeDb) {
					// the user cannot select this database anymore
					store.state.myAssignedDatabases = removeFromArray(store.state.myAssignedDatabases, dbName)
				}
			},
		})
	},

	doCreateTeam() {
		store.dispatch('addTeamAction', { id: createId(), dbName: store.state.selectedDatabaseName, teamName: this.teamName })
	},

	doRemoveTeams(teamNamesToRemove) {
		store.dispatch('removeTeamsAction', {
			dbName: store.state.selectedDatabaseName,
			teamNamesToRemove,
			onSuccessCallback: () => {
				// remove the teams from the selection options
				const newOptions = []
				for (const tn of this.teamsToRemoveOptions) {
					if (!teamNamesToRemove.includes(tn)) newOptions.push(tn)
				}
				this.teamsToRemoveOptions = newOptions
			},
		})
	},

	doLoadDefaultCalendar() {
		store.dispatch('fetchDefaultSprintCalendarAction', {
			dbName: store.state.selectedDatabaseName,
			onSuccessCallback: () => {
				this.checkForExistingCalendar = false
				// get the current sprint number if the calendar is available
				const now = Date.now()
				for (let i = 0; i < store.state.loadedCalendar.length; i++) {
					const s = store.state.loadedCalendar[i]
					if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
						this.currentSprintNr = i
						break
					}
				}
			},
		})
	},

	doLoadTeamCalendar() {
		store.dispatch('fetchTeamsAction', {
			dbName: store.state.selectedDatabaseName,
			onSuccessCallback: () => {
				this.checkForExistingCalendar = false
				for (const t of store.state.fetchedTeams) {
					if (t.teamName === this.selectedTeamName) {
						// save the teamId for use in createTeamCalendarAction and updateTeamCalendarAction
						this.selectedTeamId = t.teamId
						store.dispatch('fetchTeamCalendarAction', {
							dbName: store.state.selectedDatabaseName,
							teamId: t.teamId,
							onSuccessCallback: () => {
								// get the current sprint number if the calendar is available
								const now = Date.now()
								for (let i = 0; i < store.state.loadedCalendar.length; i++) {
									const s = store.state.loadedCalendar[i]
									if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
										this.currentSprintNr = i
										break
									}
								}
							},
						})
						break
					}
					this.loacalMessage = `Team ${this.selectedTeamName} not found`
				}
			},
		})
	},

	doCreateTeamCalendar() {
		store.state.isCalendarSaved = false
		store.dispatch('createTeamCalendarAction', { dbName: store.state.selectedDatabaseName, teamId: this.selectedTeamId, teamName: this.selectedTeamName })
	},

	doGetTeamsOfDb() {
		store.dispatch('fetchTeamsAction', store.state.selectedDatabaseName)
	},

	doSaveHistoryRetentionSettings() {
		store.dispatch('updateRetentionSettings', {
			dbName: store.state.selectedDatabaseName,
			maxHistoryDays: this.maxHistoryDays,
			maxHistoryEvents: this.maxHistoryEvents,
		})
	},

	userIsMe() {
		return this.selectedUser === store.state.userData.user
	},

	cancel() {
		this.optionSelected = 'Select a task'
		this.dbIsSelected = false
		store.state.backendMessages = []
	},
}

const components = {
	'app-header': AppHeader,
}

export default {
	mixins: [utilities],
	mounted,
	computed,
	data,
	methods,
	components,
}
