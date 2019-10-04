<template lang="html">
  <div>
    <app-header />
    <h1>INITIALIZATION</h1>
    <p>Initialize the database and setup your profile. Your user name is: {{ $store.state.userData.user }}</p>
    <h4>Enter the database name in small caps, no spaces</h4>
    <b-form-input v-model="dbName" placeholder="Enter the database name"></b-form-input>
    <div>
        <b-button v-if="dbName" class="m-1" @click="createDatabase">Create database</b-button>
        <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
    </div>

    {{ $store.state.initdb.createDatabaseResult }}
    <div v-if="$store.state.initdb.createDatabaseResult === ''">
      {{ $store.state.initdb.createDatabaseError }}
    </div>

    <div v-if="$store.state.initdb.dbCreated">
      <h4>Your profile needs an unique id, your e-mail address:</h4>
      <b-row class="my-1">
        <b-col sm="2">
          <label> Your e-mail address: </label>
        </b-col>
        <b-col sm="10">
          <b-form-input v-model="email" type="email" placeholder="e-mail address"></b-form-input>
        </b-col>
      </b-row>

      <h4>The new database needs to register a product:</h4>
      <b-row class="my-1">
        <b-col sm="2">
          <label> The first product name: </label>
        </b-col>
        <b-col sm="10">
          <b-form-input v-model="productName" placeholder="product name"></b-form-input>
        </b-col>
      </b-row>

      <div v-if="email !== '' && productName !== ''">
        <h4>Your roles for this product. Choose admin to create more users later:</h4>
        <b-form-group>
          <b-form-checkbox-group
            v-model="selected"
            :options="options"
          ></b-form-checkbox-group>
        </b-form-group>

        <div>
          <b-button v-if="selected.length > 0" class="m-1" @click="createProductAndProfile">Create product and your profile</b-button>
          <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        </div>
        {{ $store.state.initdb.createProductResult }}
        <div v-if="$store.state.initdb.createProductResult === ''">
          {{ $store.state.initdb.createProductError }}
        </div>
        {{ $store.state.initdb.createFirstUserResult }}
        <div v-if="$store.state.initdb.createFirstUserResult === ''">
          {{ $store.state.initdb.createFirstUserError }}
        </div>
        <h4 v-if="$store.state.initdb.productCreated && $store.state.initdb.userCreated">
           Succes! Exit, and sign in again to see the product view. Add other users as 'admin' in the 'Admin tasks' view</h4>
        <b-button class="m-1" @click="cancel" variant="outline-primary">Exit</b-button>
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
      productName: '',
      selected: [],
      options: [
        { text: 'area PO', value: 'areaPO' },
        { text: 'admin', value: 'admin' },
        { text: 'super PO', value: 'superPO' },
        { text: 'PO', value: 'PO' },
        { text: 'developer', value: 'developer' },
        { text: 'guest', value: 'guest' }
      ]
    }
  },

  methods: {
    createDatabase() {
      const payload = {
        dbName: this.dbName,
        email: this.email
      }
      this.$store.dispatch('createDatabase', payload)
    },

    createProductAndProfile() {
      const payload = {
        dbName: this.dbName,
        email: this.email,
        productName: this.productName,
        roles: this.selected
      }
      this.$store.dispatch('initDatabase', payload)
    },

    cancel() {
      this.$store.commit('resetData', null, {root: true})
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
