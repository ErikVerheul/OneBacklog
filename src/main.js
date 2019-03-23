import Vue from 'vue'
import App from './App.vue'
import axios from 'axios'

import router from './router'
import store from './store/store'

import './fa.config';

axios.defaults.baseURL = 'https://localhost:6984'
//axios.defaults.headers.get['Accepts'] = 'application/json'

const reqInterceptor = axios.interceptors.request.use(config => {
  return config
})
const resInterceptor = axios.interceptors.response.use(res => {
  return res
})

axios.interceptors.request.eject(reqInterceptor)
axios.interceptors.response.eject(resInterceptor)

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App),
	beforeCreate: function () {
		console.log('beforeCreate')
		this.$store.descriptionHasChanged = false
		this.$store.acceptanceHasChanged = false
	}
})
