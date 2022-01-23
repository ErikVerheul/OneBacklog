import Vue from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import './fa.config'

if (import.meta.env.VITE_DEBUG === true) {
	// eslint-disable-next-line no-console
	console.log('import.meta.env.VITE_IS_DEMO = ' + import.meta.env.VITE_IS_DEMO)
	// eslint-disable-next-line no-console
	console.log('import.meta.env.VITE_DEBUG = ' + import.meta.env.VITE_DEBUG)
	// eslint-disable-next-line no-console
	console.log('import.meta.env.VITE_DEBUG_CONNECTION = ' + import.meta.env.VITE_DEBUG_CONNECTION)
	// eslint-disable-next-line no-console
	console.log('import.meta.env.VITE_SITE_URL = ' + import.meta.env.VITE_SITE_URL)
	// eslint-disable-next-line no-console
	console.log('import.meta.env.VITE_API_URL = ' + import.meta.env.VITE_API_URL)
}
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
import './css/onebacklog.scss'
import './css/onebacklog.css'
new Vue({
	el: '#onebacklog',
	router,
	store,
	render: h => h(OneBacklog)
})
