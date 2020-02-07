<template lang="html">
  <div>
    <app-header>
    </app-header>
    <b-container fluid>
      <h2>Super PO view: {{ optionSelected }}</h2>
      <b-button block @click="createProduct">Create a product</b-button>
      <b-button block @click="removeProduct">Remove a product</b-button>
      <b-button block @click="changeMyDb">Change my default database to any available database</b-button>

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

      <p class="colorRed">{{ $store.state.warning }}
      <div v-if="$store.state.backendMessages.length > 0">
        <hr>
        <div v-for="item in $store.state.backendMessages" :key="item.randKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
    </b-container>
  </div>
</template>

<script>
import Header from '../header/header.vue'
import router from '../../router'

const PRODUCTLEVEL = 2
const ALLBUTSYSTEMANDBACKUPS = 3

export default {
  data() {
    return {
      optionSelected: 'select a task',
      productTitle: ""
    }
  },

  mounted() {
    this.$store.state.isProductCreated = false
    this.$store.state.backendMessages = []
  },

  methods: {
    createProduct() {
      this.optionSelected = 'Create a product'
    },

    doCreateProduct() {
      // create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
      const shortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
      const _id = Date.now().toString().concat(shortId)
      // use a simple algorithm to calculate the priority
      const myCurrentProductNodes = window.slVueTree.getProducts()
      const lastProductNode = myCurrentProductNodes.slice(-1)[0]
      const lastProductPriority = lastProductNode.data.priority
      const newProductPriority = Math.floor((lastProductPriority + Number.MIN_SAFE_INTEGER) / 2)

      // create a new document
      const newProduct = {
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
        "priority": newProductPriority,
        "comments": [{
          "ignoreEvent": 'comments initiated',
          "timestamp": 0,
          "distributeEvent": false
        }],
        "delmark": false
      }
      // create a new node
      let newNode = {
        "productId": newProduct.productId,
        "parentId": newProduct.parentId,
        "_id": newProduct._id,
        "shortId": newProduct.shortId,
        "dependencies": [],
        "conditionalFor": [],
        "title": newProduct.title,
        "isLeaf": false,
        "children": [],
        "isSelected": false,
        "isExpanded": true,
        "savedIsExpanded": true,
        "isSelectable": true,
        "isDraggable": newProduct.level > PRODUCTLEVEL,
        "doShow": true,
        "savedDoShow": true,
        "data": {
          state: newProduct.state,
          subtype: 0,
          priority: newProductPriority,
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
      this.$store.state.userData.myProductsRoles[_id] = ['superPO']
      this.$store.state.userData.myProductSubscriptions.push(_id)
      this.$store.state.myProductOptions.push({
        value: _id,
        text: newProduct.title
      })
      // update the database and add the product to this user's subscriptions and productsRoles
      this.$store.dispatch('createProduct', { dbName: this.$store.state.userData.currentDb, newProduct })
    },

    removeProduct() {
      this.optionSelected = 'Remove a product'
    },

    showProductView() {
      router.push('/product')
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

    cancel() {
      this.$store.state.backendMessages = []
      this.optionSelected = 'select a task'
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
.colorRed {
  color: red;
}
</style>
