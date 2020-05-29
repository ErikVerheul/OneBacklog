import AppHeader from '../header/header.vue'
import router from '../../router'
import { utilities } from '../mixins/utilities.js'

const PRODUCTLEVEL = 2
const INPROGRESS = 4
const ALLBUTSYSTEMANDBACKUPS = 3
const HOUR_MILIS = 60 * 60000
const DAY_MILIS = 24 * HOUR_MILIS

// returns a new array so that it is reactive
function addToArray(arr, item) {
  const newArr = []
  for (let el of arr) newArr.push(el)
  newArr.push(item)
  return newArr
}

function mounted() {
  this.$store.state.backendMessages = []
  this.$store.dispatch('getAllUsers')
  this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
  // get the current sprint number
  const now = Date.now()
  for (let i = 0; i < this.$store.state.configData.defaultSprintCalendar.length; i++) {
    const s = this.$store.state.configData.defaultSprintCalendar[i]
    if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
      this.currentSprintNr = i
      break
    }
  }
}

function data() {
  return {
    optionSelected: 'select a task',
    productTitle: "",
    userName: undefined,
    password: undefined,
    userEmail: undefined,
    credentialsReady: false,
    dbSelected: false,
    teamName: '',
    roleOptions: [
      { text: 'PO', value: 'PO' },
      { text: 'APO', value: 'APO' },
      { text: 'developer', value: 'developer' },
      { text: 'guest', value: 'guest' }
    ],
    allRoles: [],
    localMessage: '',
    moveDatabase: false,
    selectedUser: undefined,
    userOptions: [],
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
    currentSprintNr: undefined
  }
}

const computed = {
  extendDisableOkButton() {
    return !(!isNaN(this.extendNumberStr) && parseInt(this.extendNumberStr) > 0 && Number.isInteger(parseFloat(this.extendNumberStr)))
  },

  acceptSprintnr() {
    return !isNaN(this.changedNumberStr) && parseInt(this.changedNumberStr) >= this.currentSprintNr && Number.isInteger(parseFloat(this.changedNumberStr)) &&
    parseInt(this.changedNumberStr) < this.$store.state.configData.defaultSprintCalendar.length
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

  changeDisableOkButton () {
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

  createProduct() {
    this.optionSelected = 'Create a product'
  },

  doCreateProduct() {
    const _id = this.createId()
    const myCurrentProductNodes = window.slVueTree.getProducts()
    // get the last product node
    const lastProductNode = myCurrentProductNodes.slice(-1)[0]
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
      description: window.btoa(""),
      acceptanceCriteria: window.btoa("<p>Please do not neglect</p>"),
      priority,
      comments: [{
        ignoreEvent: 'comments initiated',
        timestamp: 0,
        distributeEvent: false
      }],
      delmark: false
    }
    // create a new node
    let newNode = {
      productId: newProduct.productId,
      parentId: newProduct.parentId,
      _id: newProduct._id,
      shortId: newProduct._id.slice(-5),
      dependencies: [],
      conditionalFor: [],
      title: newProduct.title,
      isLeaf: false,
      children: [],
      isSelected: false,
      isExpanded: true,
      savedIsExpanded: true,
      isSelectable: true,
      isDraggable: newProduct.level > PRODUCTLEVEL,
      doShow: true,
      savedDoShow: true,
      data: {
        state: newProduct.state,
        subtype: 0,
        priority,
        team: newProduct.team,
        lastChange: Date.now()
      }
    }
    const cursorPosition = {
      nodeModel: lastProductNode,
      placement: 'after'
    }
    // add the product to the treemodel, the path etc. will be calculated
    window.slVueTree.insert(cursorPosition, [newNode], false)
    // update the users product roles, subscriptions and product selection array
    this.$store.state.userData.myProductsRoles[_id] = ['admin']
    this.$store.state.userData.myProductSubscriptions = addToArray(this.$store.state.userData.myProductSubscriptions, _id)
    this.$store.state.userData.userAssignedProductIds = addToArray(this.$store.state.userData.userAssignedProductIds, _id)
    this.$store.state.myProductOptions.push({
      value: _id,
      text: newProduct.title
    })
    // update the database and add the product to this user's subscriptions and productsRoles
    this.$store.dispatch('createProduct', { dbName: this.$store.state.userData.currentDb, newProduct, userRoles: ['admin'] })
  },

  getSprint() {
    return this.$store.state.configData.defaultSprintCalendar[parseInt(this.changedNumberStr)]
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

  doChangeCalendar() {
    const currentCalendar = this.$store.state.configData.defaultSprintCalendar
    const calendarLength = currentCalendar.length
    const unChangedCalendar = currentCalendar.slice(0, parseInt(this.changedNumberStr))
    const changedSprint = this.$store.state.configData.defaultSprintCalendar[parseInt(this.changedNumberStr)]
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
    this.$store.dispatch('saveSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar })
  },

  doExtendCalendar() {
    const currentCalendar = this.$store.state.configData.defaultSprintCalendar
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
    this.$store.dispatch('saveSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar })
  },

  removeProduct() {
    this.optionSelected = 'Remove a product'
  },

  showProductView() {
    router.push('/detailProduct')
  },

  validEmail: function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
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
    }
  },

  /* Get all product titles of the selected database in $store.state.useracc.dbProducts */
  doGetDbProducts(createNewUser) {
    this.dbSelected = true
    this.$store.state.useracc.dbProducts = undefined
    this.$store.dispatch('getDbProducts', { dbName: this.$store.state.selectedDatabaseName, createNewUser })
  },

  createUser() {
    this.optionSelected = 'Create a user'
    this.userName = undefined
    this.password = undefined
    this.userEmail = undefined
    this.credentialsReady = false
    this.dbSelected = false
    this.localMessage = ''
    this.$store.state.useracc.dbProducts = undefined
    this.$store.state.useracc.userIsAdmin = false
    this.$store.state.isUserCreated = false
  },

  doCreateUser() {
    // calculate the association of all assigned roles
    this.allRoles = []
    if (this.$store.state.useracc.userIsAdmin) this.allRoles.push('admin')
    for (let prod of this.$store.state.useracc.dbProducts) {
      for (let role of prod.roles) {
        if (!this.allRoles.includes(role)) this.allRoles.push(role)
      }
    }
    // generate the productsRoles and subscriptions properties
    let productsRoles = {}
    let subscriptions = []
    for (let prod of this.$store.state.useracc.dbProducts) {
      if (prod.roles.length > 0) {
        productsRoles[prod.id] = prod.roles
        subscriptions.push(prod.id)
      }
    }

    const userData = {
      name: this.userName,
      password: this.password,
      type: "user",
      roles: this.allRoles,
      email: this.userEmail,
      currentDb: this.$store.state.selectedDatabaseName,
      myDatabases: {
        [this.$store.state.selectedDatabaseName]: {
          "myTeam": 'not assigned yet',
          subscriptions,
          productsRoles
        }
      }
    }
    this.$store.dispatch('createUserIfNotExistent', userData)
  },

  maintainUsers() {
    this.optionSelected = 'Maintain users'
    this.localMessage = ''
    this.$store.state.backendMessages = []
    this.$store.state.isUserFound = false
    this.$store.state.areDatabasesFound = false
    this.$store.state.areProductsFound = false
    this.$store.state.selectedDatabaseName = ''
    this.$store.state.isUserUpdated = false
    // populate the userOptions array
    this.userOptions = []
    for (let u of this.$store.state.useracc.allUsers) {
      this.userOptions.push(u.name)
    }
  },

  /* Creates fetchedUserData and have the prod.roles set in products */
  doFetchUser() {
    this.moveDatabase = false
    this.$store.dispatch('getUser', this.selectedUser)
  },

  doUpdateUser() {
    const newUserData = this.$store.state.useracc.fetchedUserData
    const newProductsRoles = this.$store.state.useracc.fetchedUserData.myDatabases[this.$store.state.selectedDatabaseName].productsRoles
    // update the productsRoles and subscriptions
    const newSubscriptions = []
    for (let prod of this.$store.state.useracc.dbProducts) {
      if (prod.roles.length > 0) {
        newProductsRoles[prod.id] = prod.roles
        if (this.$store.state.useracc.fetchedUserData.myDatabases[this.$store.state.selectedDatabaseName].subscriptions.includes(prod.id)) newSubscriptions.push(prod.id)
      } else {
        delete newProductsRoles[prod.id]
      }
    }
    newUserData.myDatabases[this.$store.state.selectedDatabaseName].productsRoles = newProductsRoles
    newUserData.myDatabases[this.$store.state.selectedDatabaseName].subscriptions = newSubscriptions

    // calculate the association of all assigned roles
    this.allRoles = []
    if (this.$store.state.useracc.userIsAdmin) this.allRoles.push('admin')
    for (let database of Object.keys(newUserData.myDatabases)) {
      for (let productId of Object.keys(newUserData.myDatabases[database].productsRoles)) {
        for (let role of newUserData.myDatabases[database].productsRoles[productId]) {
          if (!this.allRoles.includes(role)) this.allRoles.push(role)
        }
      }
    }
    newUserData.roles = this.allRoles
    this.$store.dispatch('updateUser', { data: newUserData })
  },

  createOrUpdateCalendar() {
    this.optionSelected = 'Sprint calendar'
    this.creatingCalendar = false
    this.$store.state.backendMessages = []
    this.isDatabaseSelected = false
    this.$store.state.isSprintCalendarFound = false
    this.startDateStr = undefined
    this.workflowStatusMsg = 'found'
    this.extendNumberStr = undefined
  },

  doLoadCalendar() {
    this.isDatabaseSelected = true
    this.$store.dispatch('getSprintCalendar', this.$store.state.selectedDatabaseName)
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
    this.creatingCalendar = false
    this.$store.state.isSprintCalendarFound = true
    this.$store.state.backendMessages = []
    this.workflowStatusMsg = 'created'
    this.$store.dispatch('saveSprintCalendar', { dbName: this.$store.state.selectedDatabaseName, newSprintCalendar: defaultSprintCalendar })
  },

  createTeam() {
    this.optionSelected = 'Create a team'
    this.teamName = ''
    this.$store.state.isTeamCreated = false
  },

  doCreateTeam() {
    this.$store.dispatch('addTeamToDatabase', { dbName: this.$store.state.selectedDatabaseName, newTeam: this.teamName })
  },

  changeMyDb() {
    this.optionSelected = 'Change my default database to any available database'
    this.localMessage = ''
    this.$store.state.isCurrentDbChanged = false
  },

  doChangeMyDb() {
    this.$store.dispatch('changeCurrentDb', this.$store.state.selectedDatabaseName)
  },

  listTeams() {
    this.optionSelected = 'List teams'
    this.$store.state.backendMessages = []
    this.$store.state.fetchedTeams = []
    this.$store.state.areTeamsFound = false
  },

  doGetTeamsOfDb() {
    this.$store.dispatch('getTeamNames', this.$store.state.selectedDatabaseName)
  },

  cancel() {
    this.optionSelected = 'select a task'
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
