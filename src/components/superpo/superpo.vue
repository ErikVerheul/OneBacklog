<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="createProduct">Create a product</b-dropdown-item>
                <b-dropdown-item @click="removeProduct">Remove a product</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 1">
      <h4>Create a new product in the current database '{{ $store.state.userData.currentDb }}' by entering its title:</h4>
      <b-form-input v-model="productTitle" placeholder="Enter the product title"></b-form-input>
      <b-button class="m-1" @click="doCreateProduct">Create product</b-button>
      <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
    </div>
    <div v-else-if="actionNr === 2">
      <h4>Remove a product from the current database '{{ $store.state.userData.currentDb }}' by entering its short Id:</h4>
      <b-form-input v-model="productTitle" placeholder="Enter the product short Id"></b-form-input>
      <h5>You are about to remove product ... </h5>
      <b-button class="m-1" @click="doRemoveProduct">Remove this product</b-button>
      <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
    </div>
    <div v-else </div>
  </div>
</template>

<script>
import Header from '../header/header.vue'

export default {
  data() {
    return {
      actionNr: 0,
      productTitle: ""
    }
  },

  methods: {
    createProduct() {
      this.actionNr = 1
    },
    doCreateProduct() {

    },
    removeProduct() {
      this.actionNr = 2
    },
    doRemoveProduct() {

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
h4 {
  margin-top: 20px;
}
</style>
