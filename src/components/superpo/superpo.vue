<template lang="html">
  <div>
    <app-header>
    </app-header>
    <b-container fluid>
      <h2>Server admin view: {{ optionSelected }}</h2>
      <b-button block @click="createProduct">Create a product</b-button>
      <b-button block @click="removeProduct">Remove a product</b-button>
      <b-button block @click="changeMyDb">Change my default database</b-button>

      <div v-if="optionSelected === 'Create a product'">
        <h2>Create a new product in the current database '{{ $store.state.userData.currentDb }}' by entering its title:</h2>
        <b-form-input v-model="productTitle" placeholder="Enter the product title"></b-form-input>
        <b-button v-if="productTitle !== ''" class="m-1" @click="doCreateProduct()">Create product</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.backendSuccess">
          <b-button class="m-1" @click="signIn()">Sign-out and -in to see the new product</b-button>
        </div>
      </div>

      <div v-if="optionSelected === 'Remove a product'">
        <h2>Remove a product from the current database '{{ $store.state.userData.currentDb }}'</h2>
        <p>As super Po you can remove products in the products view. To do so right click on a product node and select 'Remove this product and ... descendants'</p>
        <p>When doing so be aware of:</p>
        <ul>
          <li>Online users will see the product and all descendants disappear.</li>
          <li>Users who sign-in after the removal will miss the product.</li>
          <li>When undoing the removal the users who signed-in in the mean time will have no access to the product. An admin must register the product for them.</li>
        </ul>
        <b-button class="m-1" @click="showProductView()">Switch to product view</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
      </div>

      <div v-if="optionSelected === 'Change my default database'">
        <h2>Change my default database</h2>
        <b-form-group>
          <h5>Select the database you want to connect to</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="doChangeMyDb()">Change my database</b-button>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isCurrentDbChanged">
          <h4>Succes! Exit, and sign in again to see the product view of the updated database</h4>
          <b-button class="m-1" @click="signIn()" variant="outline-primary">Exit</b-button>
        </div>
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
import Header from '../header/header.vue'
import router from '../../router'

const PRODUCTLEVEL = 2

export default {

  data() {
    return {
      optionSelected: 'select a task',
      productTitle: ""
    }
  },

  mounted() {
    this.$store.state.backendSuccess = false
    this.$store.state.backendMessages = []
  },

  methods: {
    createProduct() {
      this.optionSelected = 'Create a product'
      this.$store.state.backendMessages = []
    },

    doCreateProduct() {
      // create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
      const shortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
      const _id = Date.now().toString().concat(shortId)
      // create a new document and store it
      const initData = {
        "_id": _id,
        "shortId": shortId,
        "type": "backlogItem",
        "productId": _id,
        "parentId": "root",
        "team": "not assigned yet",
        "level": PRODUCTLEVEL,
        "state": 0,
        "reqarea": null,
        "title": this.productTitle,
        "followers": [],
        "description": window.btoa(""),
        "acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
        "priority": 0,
        "attachments": [],
        "comments": [],
        "history": [{
          "createEvent": [PRODUCTLEVEL, this.$store.state.userData.currentDb],
          "by": this.$store.state.userData.user,
          "email": this.$store.state.userData.email,
          "timestamp": Date.now(),
          "sessionId": this.$store.state.userData.sessionId,
          "distributeEvent": false
        }],
        "delmark": false
      }
      // update the database
      this.$store.dispatch('createDoc2', {
        'initData': initData
      })
      // add product to this user's subscriptions and productsRoles
      this.$store.state.backendMessages = []
      this.$store.state.backendSuccess = false
      this.$store.dispatch('addProductToUser', {dbName: this.$store.state.userData.currentDb, productId: _id})
    },

    removeProduct() {
      this.optionSelected = 'Remove a product'
    },

    showProductView() {
      router.push('/product')
    },

    changeMyDb() {
      this.optionSelected = 'Change my default database'
      this.$store.state.selectedDatabaseName = ''
      this.$store.state.isCurrentDbChanged = false
      this.canCancel = true
      this.localMessage = ''
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases')
    },

    doChangeMyDb() {
      this.$store.dispatch('changeCurrentDb', this.$store.state.selectedDatabaseName)
    },

    cancel() {
      this.optionSelected = 'select a task'
    },

    signIn() {
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
