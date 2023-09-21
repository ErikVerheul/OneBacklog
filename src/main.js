import Vue from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import './fa.config'

axios.defaults.baseURL = import.meta.env.VITE_API_URL
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
// import the global css, see https://stackoverflow.com/questions/39438094/best-way-to-have-global-css-in-vuejs
import '@/css/onebacklog.scss'
import '@/css/onebacklog.css'
new Vue({
	el: '#onebacklog',
	router,
	store,
	render: h => h(OneBacklog)
})
