<template >
  <div>
    <app-header />
    <b-container fluid>
      <h1>INITIALIZATION</h1>
      <p>Initialize the database and setup your profile. Your user name is: {{ $store.state.userData.user }}</p>
      <h4>Enter a name for the database following these rules:</h4>
      <ul>
        <li>Name must begin with a lowercase letter (a-z)</li>
        <li>Lowercase characters (a-z)</li>
        <li>Digits (0-9)</li>
        <li>Any of the characters _, $, (, ), +, -, and /</li>
      </ul>
      <b-form-group :invalid-feedback="invalidEmail" :state="state">
        <b-row>
          <b-col sm="2">
            <label>The database name:</label>
          </b-col>
          <b-col sm="10">
            <b-form-input v-model="dbName"></b-form-input>
          </b-col>
          <b-col sm="12">
            <h4>To create your profile the application needs your e-mail address</h4>
          </b-col>
          <b-col sm="2">
            <label>Your e-mail address:</label>
          </b-col>
          <b-col sm="10">
            <b-form-input v-model="email" type="email"></b-form-input>
          </b-col>
        </b-row>
      </b-form-group>
      <div v-if="!$store.state.isDatabaseInitiated">
          <b-button v-if="dbName" class="m-1" @click="doCreateDatabase">Create database</b-button>
          <b-button class="m-1" @click="signOut" variant="outline-primary">Cancel</b-button>
      </div>
      <div v-else>
        <h5>Success! Apart from being a CouchDb 'server admin' you have the 'admin' role.</h5>
        <h5>Exit and sign-in again. The 'Admin' view will open. Create a default sprint calendar and create the first users and set their roles. Assign one or more admins to take over your admin task.</h5>
        <b-button class="m-1" @click="signOut" variant="outline-primary">Exit</b-button>
      </div>
      <div v-if="$store.state.backendMessages.length > 0">
        <hr>
        <div v-for="item in $store.state.backendMessages" :key="item.seqKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
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
import AppHeader from '../header/header.vue'

export default {
  /* Prevent accidental reloading of this page */
  beforeMount() {
    window.addEventListener("beforeunload", this.preventNav)
  },

  beforeDestroy() {
    window.removeEventListener("beforeunload", this.preventNav)
  },

  mounted() {
    this.$store.state.backendMessages = []
  },

  data() {
    return {
      dbName: '',
      email: ''
    }
  },

  computed: {
    state() {
      const mask = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return mask.test(this.email)
    },

    invalidEmail() {
      return 'Please enter a valid e-mail address'
    }

  },

  methods: {
    preventNav(event) {
      event.preventDefault()
      event.returnValue = ""
    },

    doCreateDatabase() {
      const payload = {
        dbName: this.dbName,
        email: this.email,
        createUser: true
      }
      this.$store.dispatch('initUserDb')
      this.$store.dispatch('createDatabase', payload)
    },

    signOut() {
      this.$store.commit('endSession', 'initdb')
    }
  },

  components: {
    'app-header': AppHeader
  }
}
</script>

<style scoped>
h4,
h5 {
  margin-top: 20px;
}
</style>
