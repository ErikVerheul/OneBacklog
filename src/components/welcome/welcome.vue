<template>
  <div class="container">
    <div class="row">
      <div class="col-lg-12 col-sm-12">
        <b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo"/>
      </div>
      <div class="col-lg-12 col-sm-12 cta">
        <router-link to="/signin">Sign In</router-link>
      </div>
      <div class="col-lg-12 col-sm-12 text-center">
        <h3>Welcome to the OneBacklog single page web application</h3>
        <p>This application is intended for Product Owners who own one ore more products as well as for developers and viewers.<br>
           Your role determines what you can do. The application is in beta.</p>
				<p>Signin with <b>demoUser</b> and password <b>demoUser</b>.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
	.text-center {
		text-align: center;
	}
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
