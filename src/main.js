import Vue from 'vue'
import App from './App.vue'
import axios from 'axios'

import router from './router'
import store from './store/store'

import './fa.config'
// eslint-disable-next-line no-console
console.log('process.env.VUE_APP_IS_DEMO = ' + process.env.VUE_APP_IS_DEMO)
// eslint-disable-next-line no-console
console.log('process.env.VUE_APP_DEBUG = ' + process.env.VUE_APP_DEBUG)
// eslint-disable-next-line no-console
console.log('process.env.VUE_APP_DEBUG_CONNECTION = ' + process.env.VUE_APP_DEBUG_CONNECTION)
// eslint-disable-next-line no-console
console.log('process.env.NODE_ENV = ' + process.env.NODE_ENV)
// eslint-disable-next-line no-console
console.log('process.env.VUE_APP_SITE_URL = ' + process.env.VUE_APP_SITE_URL)
// eslint-disable-next-line no-console
console.log('process.env.VUE_APP_API_URL = ' + process.env.VUE_APP_API_URL)
axios.defaults.baseURL = process.env.VUE_APP_API_URL
axios.defaults.withCredentials = true

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
