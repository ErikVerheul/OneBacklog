<template>
  <div class="container">
    <div v-if="isScreenWidthSufficient()" class="row">
      <div class="col-lg-12 col-sm-12">
        <b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo" />
      </div>
      <div class="col-lg-12 col-sm-12 cta">
        <router-link to="/signin">Sign In</router-link>
      </div>
      <div class="col-lg-12 col-sm-12 text-center">
        <h3>Welcome to the OneBacklog single page web application</h3>
        <p>This application is an aid to define, share and execute the realization of multiple products in a organization,
          large or small.<br>
          Your role determines what you can do. Run this application on a desktop computer or tablet with a pointing
          device.</p>
        <p>Signin with <b>demoUser</b> and password <b>demoUser</b>.</p>
      </div>
    </div>
    <div v-else class="row">
      <div class="col-lg-12 col-sm-12">
        <b-img hight="200" width="200" :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo" />
      </div>
      <div class="col-lg-12 col-sm-12">
        <h3>Welcome to the OneBacklog single page web application</h3>
        <p>This application is an aid to define, share and execute the realization of multiple products in a organization,
          large or small. Your role determines what you can do. Run this application on a desktop computer or tablet with
          a pointing device.</p>
        <h5 class="colorRed">You cannot sign-in on this device. The app detected that you are using a device with a screen
          width of {{ screenWidth }} which is less than the required 1400 pixels. Please note that this app is intended for use on a device with full HD resolution
          or higher. You will need a pointing device, like a mouse, to accurately manipulate the items in the tree view of
          your products.</h5>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      screenWidth: window.screen.width
    }
  },
  methods: {
    isScreenWidthSufficient() {
      return this.screenWidth >= 1400
    }
  }
}
</script>

<style scoped>
.cta {
  width: 300px;
  margin: auto;
  text-align: center;
}

.cta a {
  margin: 100px;
  text-decoration: none;
  display: inline-block;
  border: 1px solid #521751;
  border-radius: 3px;
  width: 100px;
  padding: 10px;
  box-sizing: border-box;
  color: #521751;
}

.cta a:hover,
.cta a:active {
  background-color: #521751;
  color: white;
}
</style>
