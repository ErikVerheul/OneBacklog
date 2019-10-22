<template lang="html">
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
      <div v-if="!$store.state.backendSuccess">
          <b-button v-if="dbName" class="m-1" @click="doCreateDatabase">Create database</b-button>
          <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
      </div>
      <div v-if="$store.state.backendSuccess">
        <h5>Succes! Apart from being a CouchDb 'server admin' you have the application 'admin' and 'superPO' roles.<br>
        Exit, and sign in again to see the created root document. Then select the SuperPO view.</h5>
        <h5>As 'superPO' create at least one product and in the Admin view create the first users and their roles. Assign one or more admins to take over that task.</h5>
        <p>Note: It is a good practice to remove the 'superPO' role from your profile as soon as another user takes this role. Keep your 'admin' role as a backup.</p>
        <b-button class="m-1" @click="signIn" variant="outline-primary">Exit</b-button>
      </div>
      <div v-if="$store.state.backendMessages.length > 0">
        <hr>
        <div v-for="msg in $store.state.backendMessages" :key="msg">
          <p>{{ msg }}</p>
        </div>
      </div>
    </b-container>
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
      email: ''
    }
  },

  computed: {
    state() {
      var mask = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return mask.test(this.email)
    },

    invalidEmail() {
      return 'Please enter a valid e-mail address'
    }

  },

  methods: {
    doCreateDatabase() {
      const payload = {
        dbName: this.dbName,
        email: this.email,
        initDbInstance: true,
      }
      this.$store.dispatch('createDatabase', payload)
    },

    cancel() {
      this.signIn()
    },

    signIn() {
      this.$store.state.backendSuccess = false
      this.$store.state.backendMessages = []
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
h4,
h5 {
  margin-top: 20px;
}
</style>
