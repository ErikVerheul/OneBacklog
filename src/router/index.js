import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueRouter from 'vue-router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import store from '../store/store'

import WelcomePage from '../components/welcome/welcome.vue'
import RelNotesPage from '../components/rel-notes/rel-notes.vue'
import UserGuidePage from '../components/userguide/userguide.vue'
import SetupPage from '../components/setup/setup.vue'
import SigninPage from '../components/auth/signin.vue'
import ProductPage from '../components/product/product.vue'
import ReqsAreaPage from '../components/reqsarea/reqsarea.vue'

Vue.use(VueRouter)
Vue.use(BootstrapVue)

const routes = [
	{
		path: '/',
		component: WelcomePage
	},
	{
		path: '/rel-notes',
		component: RelNotesPage
	},
	{
		path: '/userguide',
		component: UserGuidePage
	},
	{
		path: '/signin',
		component: SigninPage
	},
	{
		path: '/setup',
		component: SetupPage,
		beforeEnter(to, from, next) {
			if (store.state.user) {
				next()
			} else {
				next('/signin')
			}
		}
  },
	{
		path: '/product',
		component: ProductPage,
		beforeEnter(to, from, next) {
			if (store.state.user) {
				next()
			} else {
				next('/signin')
			}
		}
	},
	{
		path: '/reqsarea',
		component: ReqsAreaPage,
		beforeEnter(to, from, next) {
			if (store.state.user) {
				next()
			} else {
				next('/signin')
			}
		}
	}
]

export default new VueRouter({
	mode: 'history',
	routes
})
