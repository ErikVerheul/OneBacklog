<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="createProduct()">Create a product</b-dropdown-item>
                <b-dropdown-item @click="removeProduct()">Remove a product</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 1">
      <h4>Create a new product in the current database '{{ $store.state.userData.currentDb }}' by entering its title:</h4>
      <b-form-input v-model="productTitle" placeholder="Enter the product title"></b-form-input>
      <b-button v-if="productTitle !== ''" class="m-1" @click="doCreateProduct()">Create product</b-button>
      <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
      <br>
      {{ $store.state.superPoMessage }}
      <div  v-if="$store.state.superPoMessage !==''">
        <b-button class="m-1" @click="signIn()">Sign-out and -in to see the new product</b-button>
      </div>
    </div>
    <div v-if="actionNr === 2">
      <h4>Remove a product from the current database '{{ $store.state.userData.currentDb }}'</h4>
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
  </div>
</template>

<script>
import Header from '../header/header.vue'
import router from '../../router'

const PRODUCTLEVEL = 2

export default {

  data() {
    return {
      actionNr: 0,
      productTitle: "",
      productCreated: false
    }
  },

  methods: {
    createProduct() {
      this.$store.state.superPoMessage = ''
      this.actionNr = 1
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
      this.$store.dispatch('addProductToUser', _id)
    },

    removeProduct() {
      this.actionNr = 2
    },

    showProductView() {
      router.push('/product')
    },

    cancel() {
      this.actionNr = 0
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
