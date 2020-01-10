import Vue from 'vue'
import App from './App.vue'
import axios from 'axios'

import router from './router'
import store from './store/store'

import './fa.config'

Vue.component('slVueTree', require('./components/sl-vue-tree/sl-vue-tree.vue'))

axios.defaults.baseURL = 'https://onebacklog.net:6984'
axios.defaults.withCredentials = true
//axios.defaults.headers.get['Accepts'] = 'application/json'

const reqInterceptor = axios.interceptors.request.use(config => {
  return config
})
const resInterceptor = axios.interceptors.response.use(res => {
  return res
})

axios.interceptors.request.eject(reqInterceptor)
axios.interceptors.response.eject(resInterceptor)

export const eventBus = new Vue()

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})
