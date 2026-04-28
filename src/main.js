import { createApp } from 'vue'
import axios from 'axios'
import mitt from 'mitt'
import { createBootstrap } from 'bootstrap-vue-next'

import OneBacklog from './OneBacklog.vue'
import router from './router'
import store from './store/store'
import FontAwesomeIcon from './fa.config'
import QEditor from './components/editor/QEditor.vue'

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

/*
 * Note: Typically orientation locking is only enabled on mobile devices, and when the browser context is full screen.
 * In Firefox and some other browsers, the Screen Orientation API may not work under
 * certain conditions or without a secure context (i.e., it needs to be run over HTTPS or on localhost).
 */
function rotateToLandscape() {
	if (screen.orientation && screen.orientation.lock) {
		screen.orientation
			.lock('landscape')
			.then(() => {
				if (store.state.debug) console.log('Viewport locked to landscape')
			})
			.catch((error) => {
				console.error('Could not lock viewport to landscape:', error)
			})
	} else {
		if (store.state.debug) console.log('Screen orientation API not supported')
	}
}

function checkIfOnMobile() {
	if ('userAgentData' in navigator) {
		navigator.userAgentData
			.getHighEntropyValues(['platform', 'uaFullVersion', 'mobile'])
			.then((ua) => {
				if (store.state.debug) console.log(`Platform: ${ua.platform}`)
				if (store.state.debug) console.log(`Full Version: ${ua.uaFullVersion}`)
				if (store.state.debug) console.log(`Is Mobile: ${ua.mobile}`)

				if (ua.mobile) {
					rotateToLandscape()
				}
			})
			.catch((error) => {
				console.error('Error retrieving user agent data:', error)
			})
	} else {
		const userAgent = navigator.userAgent
		const isMobile = /Mobi|Android/i.test(userAgent)

		if (store.state.debug) console.log(`User Agent: ${userAgent}`)
		if (store.state.debug) console.log(`Is Mobile: ${isMobile}`)

		if (isMobile) {
			store.state.onLargeScreen = false
			rotateToLandscape()
		} else store.state.onLargeScreen = true
		if (store.state.debug) console.log('store.state.onLargeScreen: ' + store.state.onLargeScreen)
	}
}

// Call the function to only run the planning board on mobile devices in landscape mode
checkIfOnMobile()

app.mount('#app')
