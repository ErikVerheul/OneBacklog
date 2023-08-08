<template>
  <div class="container">
    <div class="row">
      <div class="col-lg-12 col-sm-12">
        <b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo" />
      </div>
      <div class="col-lg-12 col-sm-12 cta">
        <router-link to="/signin">Sign In</router-link>
      </div>
      <div class="col-lg-12 col-sm-12 text-center">
        <h3>Welcome to the OneBacklog single page web application</h3>
        <p>This application is an aid to define, share and execute the realization of multiple products in a organization, large or small.<br>
          Your role determines what you can do. Run this application on a desktop computer or tablet with a pointing device.</p>
        <p>Signin with <b>demoUser</b> and password <b>demoUser</b>.</p>
        <div v-if="!isScreenWidthSufficient()">
          <h5 class="colorRed text-center">The app detected that you are using a device with a screen width less than 1024 pixels.<br />
					Please note that this app is intended for use on a device with full HD resolution or higher.<br/>
					You will need a pointing device, like a mouse, to accurately manipulate the items in the tree view of your products.</h5>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    isScreenWidthSufficient() {
      return window.screen.width >= 1024
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
