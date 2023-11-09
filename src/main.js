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

const app = createApp(OneBacklog)
app.use(router)
app.use(store)
app.use(BootstrapVue)
app.component("font-awesome-icon", FontAwesomeIcon)
app.config.globalProperties.eventBus = eventBus

app.mount('#onebacklog')

