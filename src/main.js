import { createApp } from 'vue'
import OneBacklog from './OneBacklog.vue'
import axios from 'axios'
import router from './router'
import store from './store/store'
import mitt from 'mitt'
import FontAwesomeIcon from './fa.config'
import createBootstrap from 'bootstrap-vue-next'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
// import the global css, see https://stackoverflow.com/questions/39438094/best-way-to-have-global-css-in-vuejs
import '@/css/onebacklog.scss'
import '@/css/onebacklog.css'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

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
const globalOptions = {
  debug: 'warn',
  placeholder: 'Compose your text...',
  readOnly: false,
  theme: 'snow'
}

const app = createApp(OneBacklog)
app.use(router)
app.use(store)
app.use(createBootstrap())
app.component("font-awesome-icon", FontAwesomeIcon)
QuillEditor.props.globalOptions.default = () => globalOptions
app.component('QuillEditor', QuillEditor)
app.config.globalProperties.eventBus = eventBus
// make the store available in all templates
app.config.globalProperties.store = store

app.mount('#app')
