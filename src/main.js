import { createApp } from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import FontAwesomeIcon from './fa.config'
// import the global css
import '@/css/onebacklog.scss'
import '@/css/onebacklog.css'
import mitt from 'mitt'

const eventBus = mitt()

if (process.env.VUE_APP_DEBUG === true) {
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
}
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

const app = createApp(OneBacklog)
app.use(router)
app.use(store)
app.use(BootstrapVue)
app.component("font-awesome-icon", FontAwesomeIcon)
app.config.globalProperties.eventBus = eventBus

app.mount('#onebacklog')

