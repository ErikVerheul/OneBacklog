import AppHeader from '../header/header.vue'
import router from '../../router'
import { utilities } from '../mixins/generic.js'

const PRODUCTLEVEL = 2
const INPROGRESS = 4
const ALLBUTSYSTEMANDBACKUPS = 3
const HOUR_MILIS = 60 * 60000
const DAY_MILIS = 24 * HOUR_MILIS

/* Add item to array if not already present. Returns a new array so that it is reactive */
function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

/* Remove item from array if present. Returns a new array so that it is reactive */
function removeFromArray(arr, item) {
	const newArr = []
	for (const el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

function mounted() {
	this.$store.state.backendMessages = []
	this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
	// get the current sprint number if the calendar is available
	if (this.$store.state.defaultSprintCalendar) {
		const now = Date.now()
		for (let i = 0; i < this.$store.state.defaultSprintCalendar.length; i++) {
			const s = this.$store.state.defaultSprintCalendar[i]
			if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
				this.currentSprintNr = i
				break
			}
		}
	}
}

function data() {
	return {
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
			{ text: 'guest', value: 'guest' }
		],
		localMessage: '',
		selectedUser: undefined,
		isDatabaseSelected: false,
		creatingCalendar: false,
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
		teamNamesToRemove: [],
		canRemoveLastProduct: true,
		canRemoveDatabase: true
	}
}

const computed = {
	extendDisableOkButton() {
		return !(!isNaN(this.extendNumberStr) && parseInt(this.extendNumberStr) > 0 && Number.isInteger(parseFloat(this.extendNumberStr)))
	},

	acceptSprintnr() {
		return !isNaN(this.changedNumberStr) && parseInt(this.changedNumberStr) >= this.currentSprintNr && Number.isInteger(parseFloat(this.changedNumberStr)) &&
			parseInt(this.changedNumberStr) < this.$store.state.defaultSprintCalendar.length
	},

	acceptNewSprintLength() {
		return !isNaN(this.changedDurationStr) && parseInt(this.changedDurationStr) > 0 && Number.isInteger(parseFloat(this.changedDurationStr)) &&
			parseInt(this.changedDurationStr) <= 28
	},

	acceptHourChange() {
		return !isNaN(this.changedHourStr) && parseInt(this.changedHourStr) >= -12 && Number.isInteger(parseFloat(this.changedHourStr)) &&
			parseInt(this.changedHourStr) <= 12
	},

	acceptNewEndDate() {
		return this.getSprint().startTimestamp + this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS >= Date.now()
	},

	changeDisableOkButton() {
		return !this.acceptSprintnr || !this.acceptNewSprintLength || !this.acceptHourChange
	}
}

const methods = {
	onSubmit(evt) {
		evt.preventDefault()
		this.doCreateCalendar()
	},

	onReset(evt) {
		evt.preventDefault()
		// Reset our form values
		this.startDateStr = undefined
		this.sprintStartTimeStr = '12'
		this.sprintLength = '14'
		this.numberOfSprintsStr = '26'
		// Trick to reset/clear native browser form validation state
		this.show = false
		this.$nextTick(() => {
			this.show = true
		})
	},

	doAfterDbIsSelected() {
		switch (this.optionSelected) {
			case 'Create a user and assign product(s)':
				this.callGetDbProducts()
				break
			case 'List teams':
				this.$store.dispatch('getAllUsers')
				this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
				break
			case 'Remove teams without members':
				this.teamNamesToRemove = []
				this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
				break
		}
		this.dbIsSelected = true
	},

	createProduct() {
		this.optionSelected = 'Create a product'
		this.getUserFirst = false
		this.productTitle = ''
		this.$store.state.isProductCreated = false
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
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

	getUserAssignedDatabases() {
		return Object.keys(this.$store.state.useracc.fetchedUserData.myDatabases)
	},

	getSprint() {
		return this.$store.state.defaultSprintCalendar[parseInt(this.changedNumberStr)]
	},

	getStartDate() {
		return new Date(this.getSprint().startTimestamp).toString()
	},

	getDuration() {
		return this.getSprint().sprintLength / DAY_MILIS
	},

	getEndDate() {
		return new Date(this.getSprint().startTimestamp + this.getSprint().sprintLength).toString()
	},

	calcNewEndDate() {
		const newSprintLength = this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS
		return new Date(this.getSprint().startTimestamp + newSprintLength).toString()
	},

	changeSprintInCalendar() {
		const currentCalendar = this.$store.state.defaultSprintCalendar
		const calendarLength = currentCalendar.length
		const unChangedCalendar = currentCalendar.slice(0, parseInt(this.changedNumberStr))
		const changedSprint = this.$store.state.defaultSprintCalendar[parseInt(this.changedNumberStr)]
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
		this.$store.dispatch('saveDbDefaultSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar })
	},

	extendCalendar() {
		const currentCalendar = this.$store.state.defaultSprintCalendar
		const lastSprint = currentCalendar.slice(-1)[0]
		const sprintLengthMillis = lastSprint.sprintLength
		const numberOfSprints = parseInt(this.extendNumberStr)
		const startIdx = currentCalendar.length
		const startDate = lastSprint.startTimestamp + lastSprint.sprintLength
		const extendSprintCalendar = []
		let j = 0
		for (let i = startIdx; i < startIdx + numberOfSprints; i++) {
			const sprintId = this.createId()
			const obj = {
				id: sprintId,
				name: 'sprint-' + i,
				startTimestamp: startDate.valueOf() + j * sprintLengthMillis,
				sprintLength: sprintLengthMillis
			}
			extendSprintCalendar.push(obj)
			j++
		}
		const newSprintCalendar = currentCalendar.concat(extendSprintCalendar)
		this.$store.dispatch('saveDbDefaultSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar })
	},

	removeProduct() {
		this.optionSelected = 'Remove a product'
		this.getUserFirst = false
		this.dbIsSelected = false
	},

	showProductView() {
		router.push('/detailProduct')
	},

	validEmail: function (email) {
		const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		if (re.test(email)) {
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

	/* Get all product titles of the selected database in $store.state.useracc.dbProducts */
	callGetDbProducts() {
		this.$store.dispatch('getProductsRoles', { dbName: this.$store.state.selectedDatabaseName })
	},

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

	doCreateUser() {
		const userIsAdminOrAPO = this.$store.state.useracc.userIsAdmin || this.$store.state.useracc.userIsAPO
		// calculate the association of the assigned generic roles
		const allRoles = []
		if (this.$store.state.useracc.userIsAdmin) allRoles.push('admin')
		if (this.$store.state.useracc.userIsAPO) allRoles.push('APO')

		// generate the productsRoles and subscriptions properties and add the non generic roles
		const productsRoles = {}
		const subscriptions = []
		let rolesAreAssigned = false
		for (const prod of this.$store.state.useracc.dbProducts) {
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
			currentDb: this.$store.state.selectedDatabaseName,
			myDatabases: {
				[this.$store.state.selectedDatabaseName]: {
					myTeam: 'not assigned yet',
					subscriptions,
					productsRoles
				}
			}
		}
		if (this.$store.state.isUserRemoved) {
			newUserData._rev = this.$store.state.useracc.fetchedUserData._rev
			// replace existing removed user
			this.$store.dispatch('updateUser', { data: newUserData, onSuccessCallback: () => this.$store.state.isUserCreated = true })
		} else this.$store.dispatch('createUserIfNotExistent', newUserData)
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

	doRemoveUser() {
		this.$store.dispatch('removeUserIfExistent', this.selectedUser)
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
		this.$store.dispatch('getAllUsers')
	},

	/* Creates fetchedUserData and have the prod.roles set in dbProducts */
	doFetchUser(userName, justCheck) {
		this.$store.dispatch('getUser', { userName, justCheck })
	},

	doSelectUserDb(dbName) {
		this.$store.state.selectedDatabaseName = dbName
		this.isUserDbSelected = true
	},

	/*
	* Update the generic and product roles in the user's profile, including the product subscriptions.
	* Check if the profile holds at least one database with at least one product.
	* The currentDb must be present in myDatabases.
	* Any subscription to a product must refer to an existing product.
	*/
	doUpdateUser() {
		const dbName = this.$store.state.selectedDatabaseName
		const newUserData = this.$store.state.useracc.fetchedUserData
		const userIsAdminOrAPO = this.$store.state.useracc.userIsAdmin || this.$store.state.useracc.userIsAPO
		// update the generic roles
		if (this.$store.state.useracc.userIsAdmin) {
			newUserData.roles = addToArray(newUserData.roles, 'admin')
		} else newUserData.roles = removeFromArray(newUserData.roles, 'admin')
		if (this.$store.state.useracc.userIsAPO) {
			newUserData.roles = addToArray(newUserData.roles, 'APO')
		} else newUserData.roles = removeFromArray(newUserData.roles, 'APO')

		// update the products roles for this database
		let newProductsRoles = {}
		if (newUserData.myDatabases[dbName]) {
			// the database is already assigned to this user
			for (const prod of this.$store.state.useracc.dbProducts) {
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
				myTeam: 'not assigned yet',
				subscriptions: []
			}
			for (const prod of this.$store.state.useracc.dbProducts) {
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
					// delete the database entry in the profile (includes all subscriptions)
					delete newUserData.myDatabases[dbName]
					if (dbName === newUserData.currentDb) {
						// must change current database
						const databases = Object.keys(newUserData.myDatabases)
						// pick the first
						newUserData.currentDb = databases[0]
					}
				} else {
					// cannot remove last database fron user profile
					this.canRemoveDatabase = false
					return
				}
			}
		} else {
			// admin and APO roles have access to all databases
			removeDb = false
		}

		// update the subscriptions and productsRoles if the database is not removed from the user's profile
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
		}
		this.$store.dispatch('updateUser', { data: newUserData })
	},

	doAssignProductsToUser() {
		this.$store.dispatch('assignProductsToUserAction', { dbName: this.$store.state.selectedDatabaseName, selectedUser: this.selectedUser })
	},

	createOrUpdateCalendar() {
		this.optionSelected = 'Create / Maintain the default sprint calendar'
		this.getUserFirst = false
		this.checkForExistingCalendar = true
		this.$store.state.isSprintCalendarFound = false
		this.$store.state.isDefaultSprintCalendarSaved = false
		this.dbIsSelected = false
		this.creatingCalendar = false
		this.$store.state.backendMessages = []
		this.startDateStr = undefined
		this.workflowStatusMsg = 'found'
		this.extendNumberStr = undefined
	},

	doCreateCalendar() {
		const startDate = new Date(this.startDateStr)
		startDate.setUTCHours(parseInt(this.sprintStartTimeStr))
		if (startDate > Date.now()) {
			this.localMessage = 'The first sprint starts at ' + startDate.toString() + '. Select a start date and time in the (near) past.'
			return
		}

		const sprintLengthMillis = parseInt(this.sprintLengthStr) * DAY_MILIS
		const numberOfSprints = parseInt(this.numberOfSprintsStr)

		const defaultSprintCalendar = []
		for (let i = 0; i < numberOfSprints; i++) {
			const sprintId = this.createId()
			const obj = {
				id: sprintId,
				name: 'sprint-' + i,
				startTimestamp: startDate.valueOf() + i * sprintLengthMillis,
				sprintLength: sprintLengthMillis
			}
			defaultSprintCalendar.push(obj)
		}
		this.$store.state.backendMessages = []
		this.workflowStatusMsg = 'created'
		this.$store.dispatch('saveDbDefaultSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar: defaultSprintCalendar })
	},

	createTeam() {
		this.optionSelected = 'Create a team'
		this.getUserFirst = false
		this.dbIsSelected = false
		this.teamName = ''
		this.$store.state.isTeamCreated = false
	},

	doCreateTeam() {
		this.$store.dispatch('addTeamToDb', { id: this.createId(), dbName: this.$store.state.selectedDatabaseName, teamName: this.teamName })
	},

	removeTeams() {
		this.optionSelected = 'Remove teams without members'
		this.getUserFirst = false
		this.dbIsSelected = false
		this.$store.state.areTeamsRemoved = false
	},

	doRemoveTeams(teamNamesToRemove) {
		this.$store.dispatch('removeTeamsFromDb', { dbName: this.$store.state.selectedDatabaseName, teamNamesToRemove })
	},

	doLoadSprintCalendar() {
		this.checkForExistingCalendar = false
		this.$store.dispatch('getDbDefaultSprintCalendar', this.$store.state.selectedDatabaseName)
	},

	listTeams() {
		this.optionSelected = 'List teams'
		this.getUserFirst = false
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
		this.$store.state.fetchedTeams = []
		this.$store.state.areTeamsFound = false
	},

	doGetTeamsOfDb() {
		this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
	},

	userIsMe() {
		return this.selectedUser === this.$store.state.userData.user
	},

	cancel() {
		this.optionSelected = 'Select a task'
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
	},

	signIn() {
		this.$store.commit('resetData', null, { root: true })
		router.replace('/')
	}
}

const components = {
	'app-header': AppHeader
}

export default {
	mixins: [utilities],
	computed,
	data,
	mounted,
	methods,
	components
}
