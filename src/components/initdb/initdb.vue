<template lang="html">
  <div>
    <app-header />
    <h1>INITIALIZATION</h1>
    <p>Initialize the database and setup your profile. Your user name is: {{ $store.state.userData.user }}</p>
    <h4>Enter a name for the database following these rules:</h4>
    <ul>
      <li>Name must begin with a lowercase letter (a-z)</li>
      <li>Lowercase characters (a-z)</li>
      <li>Digits (0-9)</li>
      <li>Any of the characters _, $, (, ), +, -, and /</li>
    </ul>
    <b-form-input v-model="dbName" placeholder="Enter the database name"></b-form-input>
    <div v-if="!$store.state.backendSuccess">
        <b-button v-if="dbName" class="m-1" @click="createDatabase">Create database</b-button>
        <b-button class="m-1" @click="signIn()" variant="outline-primary">Cancel</b-button>
    </div>

    <div v-if="$store.state.backendSuccess">
      <h4>Your profile needs your e-mail address</h4>
      <b-row class="my-1">
        <b-col sm="2">
          <label>Your e-mail address:</label>
        </b-col>
        <b-col sm="10">
          <b-form-input v-model="email" type="email" placeholder="e-mail address"></b-form-input>
        </b-col>
      </b-row>

      <h4>The new database needs to register a product</h4>
      <b-row class="my-1">
        <b-col sm="2">
          <label>The first product name:</label>
        </b-col>
        <b-col sm="10">
          <b-form-input v-model="productName" placeholder="product name"></b-form-input>
        </b-col>
      </b-row>

      <div v-if="email !== '' && productName !== ''">
        <div>
          <b-button v-if="!$store.state.backendSuccess" class="m-1" @click="createProductAndProfile">Create your profile</b-button>
          <b-button v-if="!$store.state.backendSuccess" class="m-1" @click="signIn()" variant="outline-primary">Cancel</b-button>
        </div>

        <template v-if="$store.state.backendSuccess">
        <h4>Succes! Exit, and sign in again to see the product view. Add at least one other users as 'admin' in the 'Admin' view</h4>
        <b-button class="m-1" @click="signIn()" variant="outline-primary">Exit</b-button>
        </template>
      </div>
    </div>
    <div v-if="$store.state.backendMessages.length > 0">
      <hr>
      <div v-for="msg in $store.state.backendMessages" :key="msg">
        <p>{{ msg }}</p>
      </div>
    </div>
  </div>
</template>

<script>
//ToDo: test this on realy new instance of CouchDB
import router from '../../router'
import Header from '../header/header.vue'

export default {
  data() {
    return {
      dbName: '',
      email: '',
      productName: ''
    }
  },

  methods: {
    // also makes this user admin
    createDatabase() {
      const payload = {
        dbName: this.dbName,
        email: this.email,
        doSetUsersDatabasePermissions: true
      }
      this.$store.dispatch('createDatabase', payload)
    },

    createProductAndProfile() {
      const payload = {
        dbName: this.dbName,
        email: this.email,
        productName: this.productName,
        updateExistingProfile: false
      }
      this.$store.dispatch('initDatabase', payload)
    },

    signIn() {
      this.$store.commit('resetData', null, { root: true })
      router.replace('/')
    }

  },

  components: {
    'app-header': Header
  }
}
</script>

<style lang="css" scoped>
h4 {
  margin-top: 20px;
}
</style>
