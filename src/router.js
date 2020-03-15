import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueRouter from 'vue-router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import store from './store/store'

import WelcomePage from './components/welcome/welcome.vue'
import RelNotesPage from './components/rel-notes/rel-notes.vue'
import UserGuidePage from './components/userguide/userguide.vue'
import InitPage from './components/initdb/initdb.vue'
import SigninPage from './components/auth/signin.vue'
import ProductPage from './components/views/product/product.vue'
import ReqsAreaPage from './components/views/reqareas/reqareas.vue'
import AdminPage from './components/admin/admin.vue'
import ServerAdminPage from './components/serveradmin/serveradmin.vue'


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
		path: '/init',
		component: InitPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
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
			if (store.state.userData.user) {
				if (store.state.isProductAssigned) next()
			} else {
				next('/signin')
			}
		}
	},
	{
		path: '/reqareas',
		component: ReqsAreaPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
				next()
			} else {
				next('/signin')
			}
		}
	},
	{
		path: '/admin',
		component: AdminPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
				next()
			} else {
				next('/signin')
			}
		}
	},
	{
		path: '/serveradmin',
		component: ServerAdminPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
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
