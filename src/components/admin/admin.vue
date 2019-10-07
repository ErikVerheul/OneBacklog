<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="createUser()">Create a user</b-dropdown-item>
                <b-dropdown-item @click="maintainUsers()">Maintain users</b-dropdown-item>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item @click="createTeam()">Create a team</b-dropdown-item>
                <b-dropdown-item @click="maintainTeams()">Maintain teams</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 1">
      <h4>Create a user with access to the current database '{{ $store.state.userData.currentDb }}':</h4>
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
      </b-row>
      <h5>Assign zero, one or more of roles to each product:</h5>
      <div v-for="prod of products" :key="prod._id">
        {{ prod.title }}:
        <b-form-group>
          <b-form-checkbox-group
            v-model="prod.roles"
            :options="options"
          ></b-form-checkbox-group>
        </b-form-group>
      </div>
      <b-button v-if="userName && password" class="m-1" @click="doCreateUser()">Create this user</b-button>
      <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
    </div>

    <div v-if="actionNr === 2">
      <h4>Change the permissions of a user to products in the current database '{{ $store.state.userData.currentDb }}'</h4>
      <b-row class="my-1">
        <b-col sm="1">
          User name:
        </b-col>
        <b-col sm="11">
          <b-form-input v-model="userName" placeholder="Enter the user name"></b-form-input>
        </b-col>
      </b-row>
      <b-button class="m-1" @click="doFindUser()">Find this user</b-button>
      <div v-if="$store.state.useracc.fetchedUserData">
        <b-row class="my-1">
          <b-col sm="2">
            Users e-mail address:
          </b-col>
          <b-col sm="10">
            {{ $store.state.useracc.fetchedUserData.email }}
          </b-col>
          <b-col sm="2">
            Users current database:
          </b-col>
          <b-col sm="10">
            {{ $store.state.useracc.fetchedUserData.currentDb }}
          </b-col>
          <b-col v-if="$store.state.useracc.fetchedUserData.currentDb !== $store.state.userData.currentDb" sm="4">
            <b-form-checkbox
              v-model="moveDatabase"
              value=true
              unchecked-value=false
              >
                Do you want this user to move to this database? [{{ $store.state.userData.currentDb }}]
            </b-form-checkbox>
            <template v-if="moveDatabase === 'true'">
              <p class='red'>The user will loose access to all products in the database '{{ $store.state.useracc.fetchedUserData.currentDb }}'</p>
            </template>
          </b-col>
        </b-row>
        <div v-if="$store.state.useracc.fetchedUserData.currentDb === $store.state.userData.currentDb || moveDatabase === 'true'">
          <h5>Assign zero, one or more of roles to each product:</h5>
          <div v-for="prod of products" :key="prod._id">
            {{ prod.title }}:
            <b-form-group>
              <b-form-checkbox-group
                v-model="prod.roles"
                :options="options"
              ></b-form-checkbox-group>
            </b-form-group>
          </div>
          <b-button class="m-1" @click="doUpdateUser()">Update this user</b-button>
          <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        </div>
      </div>
    </div>

    <div v-if="actionNr === 3">
      <h4>Create a team for any product within the current database '{{ $store.state.userData.currentDb }}' by entering its name:</h4>
      <b-form-input v-model="teamName" placeholder="Enter the team name"></b-form-input>
      <b-button class="m-1" @click="doCreateTeam()">Create this team</b-button>
      <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
    </div>
    <div v-else ></div>
    {{ message }}
  </div>
</template>

<script>
import Header from '../header/header.vue'

export default {
  data() {
    return {
      actionNr: 0,
      userName: undefined,
      password: undefined,
      userEmail: undefined,
      options: [
        { text: 'area PO', value: 'areaPO' },
        { text: 'admin', value: 'admin' },
        { text: 'super PO', value: 'superPO' },
        { text: 'PO', value: 'PO' },
        { text: 'developer', value: 'developer' },
        { text: 'guest', value: 'guest' }
      ],
      allRoles: [],
      products: [],
      message: '',
      moveDatabase: false
    }
  },

  methods: {
    /* Note that the admin can only assign products that are assigned to her/him */
    createUser() {
      this.actionNr = 1
      this.userName = undefined
      this.password = undefined
      this.userEmail = undefined
      this.products = window.slVueTree.getProducts()
      // add a temporary roles array to each product
      for (let prod of this.products) {
        prod.roles = []
      }
    },
    doCreateUser() {
      let aRoleIsSet = false
      // calculate the association of all assigned roles
      for (let prod of this.products) {
        for (let role of prod.roles) {
          if (!this.allRoles.includes(role)) this.allRoles.push(role)
        }
      }
      // generate the productsRoles and subscriptions properties
      let productsRoles = {}
      let subscriptions = []
      for (let prod of this.products) {
        if (prod.roles.length > 0) {
          aRoleIsSet = true
          productsRoles[prod._id] = prod.roles
          subscriptions.push(prod._id)
        }
      }

      const userData = {
        name: this.userName,
        password: this.password,
        teams: [],
        currentTeamIdx: 0,
        roles: this.allRoles,
        type: "user",
        email: this.userEmail,
        currentDb: this.$store.state.userData.currentDb,
        productsRoles,
        subscriptions
      }
      if (aRoleIsSet) {
        this.$store.dispatch('createUser1', userData)
      } else this.message = 'Cannot create this user. No role to any product is assigned'
    },

    maintainUsers() {
      this.actionNr = 2
      this.$store.state.useracc.fetchedUserData = null
      this.products = window.slVueTree.getProducts()
    },

    /* Creates fetchedUserData and have the prod.roles set in products */
    doFindUser() {
      this.moveDatabase = false
      const payload = {
        name: this.userName,
        products: this.products,
      }
      this.$store.dispatch('getUser', payload)
    },

    doUpdateUser() {
      let aRoleIsSet = false
      let newUserData = this.$store.state.useracc.fetchedUserData
      // calculate the association of all assigned roles

      for (let prod of this.products) {
        for (let role of prod.roles) {
          if (!this.allRoles.includes(role)) this.allRoles.push(role)
        }
      }
      // generate the productsRoles and subscriptions properties
      let productsRoles = {}
      let subscriptions = []
      // subscribe to all assigned products
      for (let prod of this.products) {
        if (prod.roles.length > 0) {
          aRoleIsSet = true
          productsRoles[prod._id] = prod.roles
          subscriptions.push(prod._id)
        }
      }

      newUserData.roles = this.allRoles
      newUserData.productsRoles = productsRoles
      newUserData.subscriptions = subscriptions
      if (this.$store.state.userData.currentDb !== this.$store.state.useracc.fetchedUserData.currentDb && this.moveDatabase) {
        // database changed
        newUserData.currentDb = this.$store.state.userData.currentDb
      }
       if (aRoleIsSet) {
        this.$store.dispatch('updateUser', newUserData)
      } else this.message = 'Cannot update this user. No role to any product is assigned'
    },

    createTeam() {
      this.actionNr = 3
    },
    doCreateTeam() {

    },
    maintainTeams() {
      this.actionNr = 4
    },

    cancel() {
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

.red {
  color: red;
}
</style>
