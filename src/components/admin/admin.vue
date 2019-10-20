<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="createUser()">Create a user</b-dropdown-item>
                <b-dropdown-item @click="maintainUsers()">Maintain users</b-dropdown-item>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item @click="createTeam()">Create a team</b-dropdown-item>
                <b-dropdown-item @click="listTeams()">List team names</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 1">
      <template v-if="!credentialsReady">
        <h4>Create a user with access to a selected database and products</h4>
        <b-row class="my-1">
          <b-col sm="1">
            User name:
          </b-col>
          <b-col sm="11">
            <b-form-input v-model="userName" placeholder="Enter the user name"></b-form-input>
          </b-col>
          <b-col sm="1">
            Initial password:
            </b-col>
          <b-col sm="11">
          <b-form-input v-model="password" type="password" placeholder="Enter the initial password"></b-form-input>
          </b-col>
          <b-col sm="1">
            Users e-mail:
          </b-col>
          <b-col sm="11">
            <b-form-input v-model="userEmail" type="email" placeholder="Enter the user's e-mail"></b-form-input>
          </b-col>
          <b-col sm="12">
            <b-button v-if="!credentialsReady" class="m-1" @click="checkCredentials">Continue</b-button>
            <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
          </b-col>
        </b-row>
      </template>
      <b-form-group v-if="!dbSelected && $store.state.backendSuccess && credentialsReady">
        <h5>Select the database for this user.</h5>
        <b-form-radio-group
          v-model="$store.state.selectedDatabaseName"
          :options="$store.state.databaseOptions"
        ></b-form-radio-group>
      </b-form-group>

      <div v-if="credentialsReady">
        <b-button v-if="!dbSelected && $store.state.backendSuccess" class="m-1" @click="doGetDbProducts(false)">Continue</b-button>
        <b-button v-if="!dbSelected" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>

        <div v-if="dbSelected && $store.state.backendSuccess">
          <h5>Assign the roles to each product in database '{{ $store.state.selectedDatabaseName }}'</h5>
          <div v-for="prod of $store.state.useracc.dbProducts" :key="prod.id">
            {{ prod.value }}:
            <b-form-group>
              <b-form-checkbox-group
                v-model="prod.roles"
                :options="roleOptions"
              ></b-form-checkbox-group>
            </b-form-group>
          </div>
          <h5>Make this user an 'admin'?</h5>
          <b-form-group>
            <b-form-checkbox
              v-model="$store.state.useracc.userIsAdmin"
              value='yes'
              unchecked-value='no'
            >Tick to add this role
            </b-form-checkbox>
          </b-form-group>
          <b-button v-if="$store.state.backendSuccess && !userIsUpdated" class="m-1" @click="doCreateUser()">Create this user</b-button>
          <b-button v-if="!userIsUpdated" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        </div>
      </div>
    </div>

    <div v-if="actionNr === 2">
      <h4>Change the permissions of an existing user to products</h4>
      <b-row class="my-1">
        <b-col sm="1">
          User name:
        </b-col>
        <b-col sm="11">
          <b-form-input v-model="userName" placeholder="Enter the user name"></b-form-input>
        </b-col>
      </b-row>
      <b-button class="m-1" @click="doFindUser()">Find this user</b-button>

      <b-button v-if="canCancelFind" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
      <div v-if="!userIsUpdated && $store.state.useracc.fetchedUserData">
        <b-row class="my-1">
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
            <h5 v-if="$store.state.useracc.userIsAdmin === 'yes'">This user is an 'admin':</h5>
            <h5 v-else>This user is not an 'admin':</h5>
            <b-form-group>
              <b-form-checkbox
                v-model="$store.state.useracc.userIsAdmin"
                value='yes'
                unchecked-value='no'
              >Add or remove this role
              </b-form-checkbox>
            </b-form-group>
          </b-col>

          <b-col v-if="!$store.state.backendSuccess && $store.state.databaseOptions.length > 1" sm="12">
            <h5>Select the database to apply your changes. The users current database is '{{ $store.state.useracc.fetchedUserData.currentDb }}'</h5>
            <b-form-group>
              <b-form-radio-group
                v-model="$store.state.selectedDatabaseName"
                :options="$store.state.databaseOptions"
              ></b-form-radio-group>
            </b-form-group>
          </b-col>
          <b-col sm="2">
            <b-button class="m-1" @click="doGetDbProducts(true)">Continue</b-button>
            <b-button  v-if="canCancel" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
          </b-col>
        </b-row>

        <div v-if="$store.state.backendSuccess">
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
          <b-button v-if="$store.state.backendSuccess" class="m-1" @click="doUpdateUser()">Update this user</b-button>
          <b-button v-if="canCancel" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
          <b-button v-if="!canCancel" class="m-1" @click="cancel()" variant="outline-primary">Return</b-button>
        </div>
      </div>
    </div>

    <div v-if="actionNr === 3">
      <h4>Create a team for users with products in the selected database</h4>
      <p>When created the user of that database can choose to become a member of the team</p>
      <b-form-group v-if="$store.state.backendSuccess">
        <h5>Select the database for this team</h5>
        <b-form-radio-group
          v-model="$store.state.selectedDatabaseName"
          :options="$store.state.databaseOptions"
        ></b-form-radio-group>
      </b-form-group>
      <b-form-input v-model="teamName" placeholder="Enter the team name"></b-form-input>
      <b-button v-if="!$store.state.teamCreated" class="m-1" @click="doCreateTeam()">Create this team</b-button>
      <b-button v-if="canCancel" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
      <b-button v-if="!canCancel" class="m-1" @click="cancel()" variant="outline-primary">Return</b-button>
    </div>

    <div v-if="actionNr === 4">
      <h4>List the teams of users with products in the selected database</h4>
      <b-form-group v-if="$store.state.backendSuccess">
        <h5>Select the database</h5>
        <b-form-radio-group
          v-model="$store.state.selectedDatabaseName"
          :options="$store.state.databaseOptions"
        ></b-form-radio-group>
      </b-form-group>
      <b-button class="m-1" @click="doGetTeamsOfDb()">List teams</b-button>
      <div v-if="$store.state.backendSuccess">
        <div v-for="teamName in $store.state.fetchedTeams" :key="teamName">
          {{ teamName }}
        </div>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Return</b-button>
      </div>
    </div>
    <p>{{ localMessage }}</p>
    <div v-if="$store.state.backendMessages.length > 0">
      <hr>
      <div v-for="msg in $store.state.backendMessages" :key="msg">
       <p>{{ msg }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import Header from '../header/header.vue'

const ALLBUTSYSTEMANDBACKUPS = 3

export default {
  data() {
    return {
      actionNr: 0,
      canCancel: true,
      canCancelFind: true,
      userName: undefined,
      password: undefined,
      userEmail: undefined,
      credentialsReady: false,
      dbSelected: false,
      teamName: '',
      roleOptions: [
        { text: 'area PO', value: 'areaPO' },
        { text: 'super PO', value: 'superPO' },
        { text: 'PO', value: 'PO' },
        { text: 'developer', value: 'developer' },
        { text: 'guest', value: 'guest' }
      ],
      allRoles: [],
      localMessage: '',
      moveDatabase: false
    }
  },

  mounted() {
    this.$store.state.backendSuccess = false
    this.$store.state.backendMessages = []
  },

  methods: {
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
    doGetDbProducts(doPreset) {
      this.canCancel = false
      this.dbSelected = true
      this.$store.state.useracc.dbProducts = undefined
      this.$store.dispatch('getDbProducts', { dbName: this.$store.state.selectedDatabaseName, presetExistingRoles: doPreset })
    },

    createUser() {
      this.actionNr = 1
      this.canCancel = true
      this.userName = undefined
      this.password = undefined
      this.userEmail = undefined
      this.credentialsReady = false
      this.dbSelected = false
      this.userIsUpdated = false
      this.localMessage = ''
      this.$store.state.useracc.dbProducts = undefined
      this.$store.state.useracc.userIsAdmin = 'no'
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },
    doCreateUser() {
      this.canCancel = false
      let aRoleIsSet = false
      // calculate the association of all assigned roles
      this.allRoles = []
      if (this.$store.state.useracc.userIsAdmin === 'yes') this.allRoles.push('admin')
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
          aRoleIsSet = true
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
            "myTeam": 'not a member of a team',
            subscriptions,
            productsRoles
          }
        }
      }
      if (aRoleIsSet) {
        this.$store.dispatch('createUser1', userData)
        this.userIsUpdated = true
      } else this.localMessage = 'Cannot create this user. No role to any product is assigned'
    },

    maintainUsers() {
      this.actionNr = 2
      this.canCancel = true
      this.canCancelFind = true
      this.localMessage = ''
      this.$store.state.useracc.fetchedUserData = null
      this.$store.state.databaseOptions = undefined
      this.$store.state.selectedDatabaseName = ''
      this.userIsUpdated = false
      // get all non sytem databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    /* Creates fetchedUserData and have the prod.roles set in products */
    doFindUser() {
      this.canCancelFind = false
      this.moveDatabase = false
      this.$store.state.useracc.fetchedUserData = null
      this.userIsUpdated = false
      this.$store.dispatch('getUser', this.userName)
    },

    doUpdateUser() {
      this.canCancel = false
      this.userIsUpdated = false
      let aRoleIsSet = false
      let newUserData = this.$store.state.useracc.fetchedUserData
      // generate the productsRoles and subscriptions properties
      let productsRoles = {}
      let subscriptions = []
      // subscribe to ALL assigned products in the current database
      for (let prod of this.$store.state.useracc.dbProducts) {
        if (prod.roles.length > 0) {
          aRoleIsSet = true
          subscriptions.push(prod.id)
          // temporarely filter out the 'admin' roles which is generic now (for all products)
          // ToDo: replace with productsRoles[prod.id] = prod.roles
          productsRoles[prod.id] = []
          for (let role of prod.roles) {
            if (role !== 'admin') productsRoles[prod.id].push(role)
          }
        }
      }
      newUserData.myDatabases[this.$store.state.selectedDatabaseName].productsRoles = productsRoles
      newUserData.myDatabases[this.$store.state.selectedDatabaseName].subscriptions = subscriptions
      // calculate the association of all assigned roles
      this.allRoles = []
      if (this.$store.state.useracc.userIsAdmin === 'yes') this.allRoles.push('admin')
      for (let database of Object.keys(newUserData.myDatabases)) {
        for (let productId of Object.keys(newUserData.myDatabases[database].productsRoles)) {
          for (let role of newUserData.myDatabases[database].productsRoles[productId]) {
            if (!this.allRoles.includes(role)) this.allRoles.push(role)
          }
        }
      }
      newUserData.roles = this.allRoles

      if (aRoleIsSet) {
        this.$store.dispatch('updateUser', newUserData)
        this.userIsUpdated = true
      } else this.localMessage = 'Cannot update this user. No role to any product is assigned'
    },

    createTeam() {
      this.actionNr = 3
      this.canCancel = true
      this.teamName = ''
      this.$store.state.teamCreated = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doCreateTeam() {
      this.canCancel = false
      this.$store.dispatch('addTeamToDatabase', {dbName: this.$store.state.selectedDatabaseName, newTeam: this.teamName})
      this.canCancel = false
    },

    listTeams() {
      this.actionNr = 4
      this.$store.state.backendMessages = []
      this.$store.state.fetchedTeams = []
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doGetTeamsOfDb() {
      this.$store.dispatch('getTeamNames', this.$store.state.selectedDatabaseName)
    },

    cancel() {
      this.canCancel = true
      this.actionNr = 0
    }
  },

  components: {
    'app-header': Header
  }
}
</script>

<style lang="css" scoped>
h4,
h5 {
  margin-top: 20px;
}
</style>
