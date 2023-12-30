import { createApp } from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import mitt from 'mitt'
import FontAwesomeIcon from './fa.config'
import BootstrapVueNext from 'bootstrap-vue-next'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
// import the global css, see https://stackoverflow.com/questions/39438094/best-way-to-have-global-css-in-vuejs
import '@/css/onebacklog.scss'
import '@/css/onebacklog.css'

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

const eventBus = mitt()

const app = createApp(OneBacklog)
app.use(router)
app.use(store)
app.use(BootstrapVueNext)
app.component("font-awesome-icon", FontAwesomeIcon)
app.config.globalProperties.eventBus = eventBus

app.mount('#onebacklog')
