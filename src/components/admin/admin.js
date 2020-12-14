import AppHeader from '../header/header.vue'
import router from '../../router'
import { utilities } from '../mixins/generic.js'

const PRODUCTLEVEL = 2
const INPROGRESS = 4
const ALLBUTSYSTEMANDBACKUPS = 3
const HOUR_MILIS = 60 * 60000
const DAY_MILIS = 24 * HOUR_MILIS

function mounted () {
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

function data () {
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
    teamNamesToRemove: []
  }
}

const computed = {
  extendDisableOkButton () {
    return !(!isNaN(this.extendNumberStr) && parseInt(this.extendNumberStr) > 0 && Number.isInteger(parseFloat(this.extendNumberStr)))
  },

  acceptSprintnr () {
    return !isNaN(this.changedNumberStr) && parseInt(this.changedNumberStr) >= this.currentSprintNr && Number.isInteger(parseFloat(this.changedNumberStr)) &&
			parseInt(this.changedNumberStr) < this.$store.state.defaultSprintCalendar.length
  },

  acceptNewSprintLength () {
    return !isNaN(this.changedDurationStr) && parseInt(this.changedDurationStr) > 0 && Number.isInteger(parseFloat(this.changedDurationStr)) &&
			parseInt(this.changedDurationStr) <= 28
  },

  acceptHourChange () {
    return !isNaN(this.changedHourStr) && parseInt(this.changedHourStr) >= -12 && Number.isInteger(parseFloat(this.changedHourStr)) &&
			parseInt(this.changedHourStr) <= 12
  },

  acceptNewEndDate () {
    return this.getSprint().startTimestamp + this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS >= Date.now()
  },

  changeDisableOkButton () {
    return !this.acceptSprintnr || !this.acceptNewSprintLength || !this.acceptHourChange
  }
}

const methods = {
  onSubmit (evt) {
    evt.preventDefault()
    this.doCreateCalendar()
  },

  onReset (evt) {
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

  doAfterDbIsSelected () {
    switch (this.optionSelected) {
			case 'Assign products to a user':
				this.$store.dispatch('getProductsRoles', { dbName: this.$store.state.selectedDatabaseName, createNewUser: true })
				break
			case 'Create a user and assign product(s)':
        this.callGetDbProducts(true)
        break
      case 'List teams':
        this.$store.dispatch('getAllUsers')
        this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
				break
			case 'Unassign products from a user':
				this.$store.dispatch('removeDbFromUserAction', { dbName: this.$store.state.selectedDatabaseName, selectedUser: this.selectedUser })
			break
      case 'Remove teams without members':
        this.teamNamesToRemove = []
        this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
        break
    }
    this.dbIsSelected = true
  },

  createProduct () {
		this.optionSelected = 'Create a product'
		this.getUserFirst = false
    this.productTitle = ''
    this.$store.state.isProductCreated = false
    this.dbIsSelected = false
    this.$store.state.backendMessages = []
	},

	assignProduct() {
		this.optionSelected = 'Assign a product'
		this.productTitle = ''
		this.$store.state.isProductAssigned = false
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
	},

	unAssignProduct() {
		this.optionSelected = 'Unassign a product'
		this.productTitle = ''
		this.$store.state.isProductUnassigned= false
		this.dbIsSelected = false
		this.$store.state.backendMessages = []
	},

  doCreateProduct () {
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
    // update the database and add the product to this admin's subscriptions and productsRoles if this database is the admin's current database
		this.$store.dispatch('createProductAction', { dbName: this.$store.state.selectedDatabaseName, newProduct, priority })
	},

	getUserDbOptionsToAssign () {
		const assignedDbs = Object.keys(this.$store.state.useracc.fetchedUserData.myDatabases)
		const canAssign = []
		for (const db of this.$store.state.databaseOptions) {
			if (!assignedDbs.includes(db)) canAssign.push(db)
		}
		return canAssign
	},

	getUserAssignedDatabases () {
		return Object.keys(this.$store.state.useracc.fetchedUserData.myDatabases)
	},

  getSprint () {
    return this.$store.state.defaultSprintCalendar[parseInt(this.changedNumberStr)]
  },

  getStartDate () {
    return new Date(this.getSprint().startTimestamp).toString()
  },

  getDuration () {
    return this.getSprint().sprintLength / DAY_MILIS
  },

  getEndDate () {
    return new Date(this.getSprint().startTimestamp + this.getSprint().sprintLength).toString()
  },

  calcNewEndDate () {
    const newSprintLength = this.changedDurationStr * DAY_MILIS + this.changedHourStr * HOUR_MILIS
    return new Date(this.getSprint().startTimestamp + newSprintLength).toString()
  },

  changeSprintInCalendar () {
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

  extendCalendar () {
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

  removeProduct () {
		this.optionSelected = 'Remove a product'
		this.getUserFirst = false
    this.dbIsSelected = false
  },

  showProductView () {
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

  checkCredentials () {
    if (this.userName && this.password && this.userEmail && this.validEmail(this.userEmail)) {
      this.credentialsReady = true
    }
  },

  /* Get all product titles of the selected database in $store.state.useracc.dbProducts */
  callGetDbProducts (createNewUser) {
    this.$store.dispatch('getProductsRoles', { dbName: this.$store.state.selectedDatabaseName, createNewUser })
  },

  createUser () {
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
    this.$store.state.isUserCreated = false
	},

  doCreateUser () {
    // calculate the association of the assigned generic roles
		const allRoles = []
		if (this.$store.state.useracc.userIsAdmin) allRoles.push('admin')
		if (this.$store.state.useracc.userIsAPO) allRoles.push('APO')

    // generate the productsRoles and subscriptions properties
    const productsRoles = {}
    const subscriptions = []
    for (const prod of this.$store.state.useracc.dbProducts) {
      if (prod.roles.length > 0) {
        productsRoles[prod.id] = prod.roles
        subscriptions.push(prod.id)
      }
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
    this.$store.dispatch('createUserIfNotExistent', newUserData)
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

	doRemoveUser () {
		this.$store.dispatch('removeUserIfExistent', this.selectedUser)
	},

  maintainUsers () {
		this.optionSelected = 'Maintain user permissions to products'
		this.getUserFirst = true
    this.isUserDbSelected = false
    this.localMessage = ''
    this.$store.state.backendMessages = []
    this.$store.state.isUserFound = false
    this.$store.state.areDatabasesFound = false
    this.$store.state.areProductsFound = false
    this.$store.state.isUserUpdated = false
    this.$store.dispatch('getAllUsers')
  },

  /* Creates fetchedUserData and have the prod.roles set in products */
  doFetchUser () {
    this.$store.dispatch('getUser', this.selectedUser)
  },

  doSelectUserDb (dbName) {
    this.$store.state.selectedDatabaseName = dbName
    this.isUserDbSelected = true
  },

  doUpdateUser () {
		const newUserData = this.$store.state.useracc.fetchedUserData
		const newProductsRoles = newUserData.myDatabases[this.$store.state.selectedDatabaseName].productsRoles
    // update the productsRoles and subscriptions
		const newSubscriptions = []
    for (const prod of this.$store.state.useracc.dbProducts) {
      if (prod.roles.length > 0) {
        newProductsRoles[prod.id] = prod.roles
        if (this.$store.state.useracc.fetchedUserData.myDatabases[this.$store.state.selectedDatabaseName].subscriptions.includes(prod.id)) newSubscriptions.push(prod.id)
      } else {
        delete newProductsRoles[prod.id]
      }
    }
    newUserData.myDatabases[this.$store.state.selectedDatabaseName].productsRoles = newProductsRoles
    newUserData.myDatabases[this.$store.state.selectedDatabaseName].subscriptions = newSubscriptions

    // calculate the association of the assigned generic roles
		const allRoles = []
		if (this.$store.state.useracc.userIsAdmin) allRoles.push('admin')
		if (this.$store.state.useracc.userIsAPO) allRoles.push('APO')
		newUserData.roles = allRoles
    this.$store.dispatch('updateUser', { data: newUserData })
	},

	doAssignDbToUser () {
		this.$store.dispatch('addDbToUserAction', { dbName: this.$store.state.selectedDatabaseName, selectedUser: this.selectedUser })
	},

  createOrUpdateCalendar () {
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

  doCreateCalendar () {
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

	addDbToUser () {
		this.optionSelected = 'Assign products to a user'
		this.getUserFirst = true
		this.selectedUser = undefined
		this.dbIsSelected = false
		this.localMessage = ''
		this.$store.state.backendMessages = []
		this.$store.state.isUserFound = false
		this.$store.state.areDatabasesFound = false
		this.$store.state.areProductsFound = false
		this.$store.state.isUserUpdated = false
		this.$store.dispatch('getAllUsers')
	},

	removeDbFromUser () {
		this.optionSelected = 'Unassign products from a user'
		this.getUserFirst = true
		this.selectedUser = undefined
		this.dbIsSelected = false
		this.localMessage = ''
		this.$store.state.backendMessages = []
		this.$store.state.isUserFound = false
		this.$store.state.areDatabasesFound = false
		this.$store.state.isUserUpdated = false
		this.$store.dispatch('getAllUsers')
	},

  createTeam () {
		this.optionSelected = 'Create a team'
		this.getUserFirst = false
    this.dbIsSelected = false
    this.teamName = ''
    this.$store.state.isTeamCreated = false
  },

  doCreateTeam () {
    this.$store.dispatch('addTeamToDb', { id: this.createId(), dbName: this.$store.state.selectedDatabaseName, teamName: this.teamName })
  },

  removeTeams () {
		this.optionSelected = 'Remove teams without members'
		this.getUserFirst = false
    this.dbIsSelected = false
    this.$store.state.areTeamsRemoved = false
  },

  doRemoveTeams (teamNamesToRemove) {
    this.$store.dispatch('removeTeamsFromDb', { dbName: this.$store.state.selectedDatabaseName, teamNamesToRemove })
  },

  doLoadSprintCalendar () {
    this.checkForExistingCalendar = false
    this.$store.dispatch('getDbDefaultSprintCalendar', this.$store.state.selectedDatabaseName)
  },

  listTeams () {
		this.optionSelected = 'List teams'
		this.getUserFirst = false
    this.dbIsSelected = false
    this.$store.state.backendMessages = []
    this.$store.state.fetchedTeams = []
    this.$store.state.areTeamsFound = false
  },

  doGetTeamsOfDb () {
    this.$store.dispatch('fetchTeamMembers', this.$store.state.selectedDatabaseName)
	},

	userIsMe () {
		return this.selectedUser === this.$store.state.userData.user
	},

  cancel () {
    this.optionSelected = 'Select a task'
    this.dbIsSelected = false
    this.$store.state.backendMessages = []
  },

  signIn () {
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
