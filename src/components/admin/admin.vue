<template lang="html">
  <div>
    <app-header></app-header>
    <b-container fluid>
      <h2>Admin view: {{ optionSelected }}</h2>
      <b-button block @click="createProduct">Create a product</b-button>
      <b-button block @click="removeProduct">Remove a product</b-button>
      <b-button block @click="createUser">Create a user</b-button>
      <b-button block @click="maintainUsers">Maintain users</b-button>
      <b-button block @click="createTeam">Create a team</b-button>
      <b-button block @click="changeMyDb">Change my default database to any available database</b-button>
      <b-button block @click="listTeams">List teams</b-button>

      <div v-if="optionSelected === 'Create a product'">
        <h2>Create a new product in the current database '{{ $store.state.userData.currentDb }}' by entering its title:</h2>
        <b-form-input v-model="productTitle" placeholder="Enter the product title"></b-form-input>
        <b-button v-if="!$store.state.isProductCreated && productTitle !== ''" class="m-1" @click="doCreateProduct">Create product</b-button>
        <b-button v-if="!$store.state.isProductCreated" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isProductCreated">
          <h4>Select the products view to see the new product</h4>
          <b-button class="m-1" @click="cancel">return</b-button>
        </div>
      </div>

      <div v-if="optionSelected === 'Remove a product'">
        <h2>Remove a product from the current database '{{ $store.state.userData.currentDb }}'</h2>
        <p>As super Po you can remove products in the products view. To do so right click on a product node and select 'Remove this product and ... descendants'</p>
        <p>When doing so be aware of:</p>
        <ul>
          <li>Online users will see the product and all descendents disappear.</li>
          <li>Users who sign-in after the removal will miss the product.</li>
          <li>When undoing the removal the users who signed-in in between the removal and undo, will have no access to the product. An admin must register the product for them.</li>
        </ul>
        <b-button class="m-1" @click="showProductView()">Switch to product view</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
      </div>

      <div v-if="optionSelected === 'Create a user'">
        <template v-if="!credentialsReady">
          <h4>Create a user with access to a selected database and products</h4>
          <b-row>
            <b-col sm="2">
              User name:
            </b-col>
            <b-col sm="10">
              <b-form-input v-model="userName" placeholder="Enter the user name"></b-form-input>
            </b-col>
            <b-col sm="2">
              Initial password:
              </b-col>
            <b-col sm="10">
            <b-form-input v-model="password" type="password" placeholder="Enter the initial password. The user must change it."></b-form-input>
            </b-col>
            <b-col sm="2">
              Users e-mail:
            </b-col>
            <b-col sm="10">
              <b-form-input v-model="userEmail" type="email" placeholder="Enter the user's e-mail"></b-form-input>
            </b-col>
            <b-col sm="12">
              <b-button v-if="!credentialsReady" class="m-1" @click="checkCredentials">Continue</b-button>
              <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
            </b-col>
          </b-row>
        </template>
        <b-form-group v-if="!dbSelected && credentialsReady">
          <h5>Select the database for this user.</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>

        <div v-if="credentialsReady">
          <b-button v-if="!dbSelected" class="m-1" @click="doGetDbProducts(true)">Continue</b-button>
          <b-button v-if="!dbSelected" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>

          <div v-if="dbSelected && $store.state.areProductsFound">
            Creating user '{{ userName }}'
            <h5>Make this user an 'admin'?</h5>
            <b-form-checkbox
              v-model="$store.state.useracc.userIsAdmin"
            >Tick to add this role
            </b-form-checkbox>
            <hr>
            <h5>Assign (additional) the roles to each product in database '{{ $store.state.selectedDatabaseName }}'</h5>
            <div v-for="prod of $store.state.useracc.dbProducts" :key="prod.id">
              {{ prod.value }}:
              <b-form-group>
                <b-form-checkbox-group
                  v-model="prod.roles"
                  :options="roleOptions"
                ></b-form-checkbox-group>
              </b-form-group>
            </div>
            <b-button v-if="!$store.state.isUserCreated" class="m-1" @click="doCreateUser">Create this user</b-button>
            <hr>
            <b-button v-if="!$store.state.isUserCreated" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
            <b-button v-if="$store.state.isUserCreated" class="m-1" @click="cancel" variant="outline-primary">Return</b-button>
          </div>
        </div>
      </div>

      <div v-if="optionSelected === 'Maintain users'">
        <div v-if="!$store.state.isUserFound">
          <h4>Change the permissions of an existing user to products</h4>
          <b-row class="my-1">
            <b-col sm="12">
              Start typing an username or select from the list:
            </b-col>
            <b-col sm="3">
              <b-form-group>
                <b-form-select
                  v-model="selectedUser"
                  :options="userOptions"
                ></b-form-select>
              </b-form-group>
            </b-col>
          </b-row>
          <b-button v-if="selectedUser && !$store.state.isUserFound" class="m-1" @click="doFetchUser">Update this user's permissions</b-button>
          <b-button v-if="!$store.state.isUserFound" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        </div>

        <div v-if="$store.state.isUserFound">
          <b-row class="my-1">
            <b-col sm="2">
              Users name:
            </b-col>
            <b-col sm="10">
              {{ $store.state.useracc.fetchedUserData.name }}
            </b-col>
            <b-col sm="2">
              Users e-mail address:
            </b-col>
            <b-col sm="10">
              {{ $store.state.useracc.fetchedUserData.email }}
            </b-col>
            <b-col sm="2">
              Users databases:
            </b-col>
            <b-col sm="10">
              {{ $store.state.databaseOptions }}
            </b-col>

            <b-col sm="12">
              <h5 v-if="$store.state.useracc.userIsAdmin">This user is an 'admin':</h5>
              <h5 v-else>This user is not an 'admin':</h5>
              <p>The admin role is a generic role with access to all user profiles and all product definitions in all databases</p>
              <b-form-group>
                <b-form-checkbox
                  v-model="$store.state.useracc.userIsAdmin"
                >Add or remove this role
                </b-form-checkbox>
              </b-form-group>
            </b-col>

            <b-col v-if="!$store.state.areProductsFound && $store.state.areDatabasesFound && $store.state.databaseOptions.length > 1" sm="12">
              <h5>Select the database to apply your changes. The users current database is '{{ $store.state.useracc.fetchedUserData.currentDb }}'</h5>
              <b-form-group>
                <b-form-radio-group
                  v-model="$store.state.selectedDatabaseName"
                  :options="$store.state.databaseOptions"
                  stacked
                ></b-form-radio-group>
              </b-form-group>
            </b-col>
            <b-col v-if="!$store.state.areProductsFound" sm="12">
              <b-button class="m-1" @click="doGetDbProducts(false)">Continue</b-button>
              <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
            </b-col>
            <b-col sm="12">
              <div v-if="$store.state.areProductsFound">
                <h5>Change the roles of this user to each product in database '{{ $store.state.selectedDatabaseName }}':</h5>
                <div v-for="prod of $store.state.useracc.dbProducts" :key="prod.id">
                  {{ prod.value }}:
                  <b-form-group>
                    <b-form-checkbox-group
                      v-model="prod.roles"
                      :options="roleOptions"
                    ></b-form-checkbox-group>
                  </b-form-group>
                </div>
                <p>If you changed your own account, sign-in again to see the effect</p>
                <b-button v-if="$store.state.areProductsFound && !$store.state.isUserUpdated" class="m-1" @click="doUpdateUser">Update this user</b-button>
                <b-button v-if="!$store.state.isUserUpdated" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
                <b-button v-if="$store.state.isUserUpdated" class="m-1" @click="cancel()" variant="outline-primary">Return</b-button>
              </div>
            </b-col>
          </b-row>
        </div>
      </div>

      <div v-if="optionSelected === 'Create a team'">
        <h4>Create a team for users with products in the selected database</h4>
        <p>When created the user of that database can choose to become a member of the team</p>
        <b-form-group v-if="!$store.state.isTeamCreated">
          <h5>Select the database for this team</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-form-input v-model="teamName" placeholder="Enter the team name"></b-form-input>
        <b-button v-if="!$store.state.isTeamCreated && teamName !== ''" class="m-1" @click="doCreateTeam">Create this team</b-button>
        <b-button v-if="!$store.state.isTeamCreated" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <b-button v-if="$store.state.isTeamCreated" class="m-1" @click="cancel" variant="outline-primary">Return</b-button>
      </div>

      <div v-if="optionSelected === 'Change my default database to any available database'">
        <h2>Change my default database to any available database</h2>
        <b-form-group>
          <h5>Select the database you want to connect to</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="doChangeMyDb">Change my database</b-button>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isCurrentDbChanged">
          <h4>Succes! Sign-out and -in to see the product view of the {{ $store.state.selectedDatabaseName }} database</h4>
          <div>
            <b-button class="m-1" @click="signIn()">Exit</b-button>
          </div>
        </div>
      </div>

      <div v-if="optionSelected === 'List teams'">
        <h4 v-if="!$store.state.areTeamsFound">List the teams of users with products in the selected database</h4>
        <b-form-group v-if="!$store.state.areTeamsFound">
          <h5>Select the database</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.areTeamsFound" class="m-1" @click="doGetTeamsOfDb">List teams</b-button>
        <div v-if="$store.state.areTeamsFound">
          <h4>List of teams and members working on products in database '{{ $store.state.selectedDatabaseName }}'</h4>
          <hr>
          <div v-for="teamName in $store.state.fetchedTeams" :key="teamName">
            <b>Team '{{ teamName }}'</b>
            <div v-for="userRec in $store.state.useracc.allUsers" :key="userRec.name">
              <i v-if="teamName === userRec.team"> '{{ userRec.name }}' is member of this team </i>
            </div>
            <hr>
          </div>
          <b-button class="m-1" @click="cancel()" variant="outline-primary">Return</b-button>
        </div>
      </div>
      <p>{{ localMessage }}</p>
      <p class="colorRed">{{ $store.state.warning }}
      <div v-if="$store.state.backendMessages.length > 0">
        <hr>
        <div v-for="item in $store.state.backendMessages" :key="item.seqKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
    </b-container>
  </div>
</template>

<script>
import appHeader from '../header/header.vue'
import router from '../../router'

// returns a new array so that it is reactive
function addToArray(arr, item) {
  const newArr = []
  for (let el of arr) newArr.push(el)
  newArr.push(item)
  return newArr
}

const PRODUCTLEVEL = 2
const ALLBUTSYSTEMANDBACKUPS = 3

export default {
  data() {
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
      userOptions: []
    }
  },

  mounted() {
    this.$store.state.backendMessages = []
    this.$store.dispatch('getAllUsers')
  },

  methods: {
    createProduct() {
      this.optionSelected = 'Create a product'
    },

    doCreateProduct() {
      // create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
      const shortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
      const _id = Date.now().toString().concat(shortId)
      const myCurrentProductNodes = window.slVueTree.getProducts()
      // get the last product node
      const lastProductNode = myCurrentProductNodes.slice(-1)[0]
      // use the negative creation date as the priority of the new product so that sorting on priority gives the same result as sorting on id
      const priority = -Date.now()

      // create a new document
      const newProduct = {
        _id: _id,
        shortId: shortId,
        type: 'backlogItem',
        productId: _id,
        parentId: 'root',
        team: 'not assigned yet',
        level: PRODUCTLEVEL,
        state: 0,
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
        shortId: newProduct.shortId,
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
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
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
      // get all non sytem databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
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

    createTeam() {
      this.optionSelected = 'Create a team'
      this.teamName = ''
      this.$store.state.isTeamCreated = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doCreateTeam() {
      this.$store.dispatch('addTeamToDatabase', { dbName: this.$store.state.selectedDatabaseName, newTeam: this.teamName })
    },

    changeMyDb() {
      this.optionSelected = 'Change my default database to any available database'
      this.localMessage = ''
      this.$store.state.isCurrentDbChanged = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doChangeMyDb() {
      this.$store.dispatch('changeCurrentDb', this.$store.state.selectedDatabaseName)
    },

    listTeams() {
      this.optionSelected = 'List teams'
      this.$store.state.backendMessages = []
      this.$store.state.fetchedTeams = []
      this.$store.state.areTeamsFound = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
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
  },

  components: {
    'app-header': appHeader
  }
}
</script>

<style lang="css" scoped>
h4,
h5 {
  margin-top: 20px;
}
.colorRed {
  color: red;
}
</style>
