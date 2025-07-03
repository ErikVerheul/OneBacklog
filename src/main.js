import { createApp } from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import mitt from 'mitt'
import FontAwesomeIcon from './fa.config'
import QEditor from './components/editor/QEditor.vue'
import { createBootstrap } from 'bootstrap-vue-next'

axios.defaults.baseURL = import.meta.env.VITE_API_URL
axios.defaults.withCredentials = true

const reqInterceptor = axios.interceptors.request.use((config) => {
	return config
})
const resInterceptor = axios.interceptors.response.use((res) => {
	return res
})
axios.interceptors.request.eject(reqInterceptor)
axios.interceptors.response.eject(resInterceptor)

const eventBus = mitt()

const app = createApp(OneBacklog)
app.use(router)
app.use(store)
app.use(createBootstrap())
app.component('font-awesome-icon', FontAwesomeIcon)
app.component('QEditor', QEditor)
app.config.globalProperties.eventBus = eventBus
// make the store available in all templates
app.config.globalProperties.store = store

app.mount('#app')
