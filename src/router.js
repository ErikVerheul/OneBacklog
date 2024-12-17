import { createRouter, createWebHistory } from 'vue-router'
import store from './store/store'

import WelcomePage from './components/welcome/Welcome-comp.vue'
import RelNotesPage from './components/rel-notes/Rel-Notes.vue'
import UserGuidePage from './components/userguide/UserGuide.vue'
import InitPage from './components/initdb/InitDb.vue'
import SigninPage from './components/auth/Sign-in.vue'
import ProductPage from './components/views/tree_view/Tree_view.vue'

import PlanningBoard from './components/views/planning_board/PlanningBoard.vue'

import AssistAdminPage from './components/admin/AssistAdminTool.vue'
import AdminPage from './components/admin/AdminTool.vue'
import ServerAdminPage from './components/serveradmin/ServerAdmin.vue'

const routes = [
	{
		path: '/',
		component: WelcomePage,
	},
	{
		path: '/rel-notes',
		component: RelNotesPage,
	},
	{
		path: '/userguide',
		component: UserGuidePage,
	},
	{
		path: '/signin',
		component: SigninPage,
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
		},
	},
	{
		path: '/treeView',
		component: ProductPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user && store.state.isProductAssigned) {
				next()
			} else {
				next('/signin')
			}
		},
	},
	{
		path: '/board',
		component: PlanningBoard,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
				next()
			} else {
				next('/signin')
			}
		},
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
		},
	},
	{
		path: '/assistAdmin',
		component: AssistAdminPage,
		beforeEnter(to, from, next) {
			if (store.state.userData.user) {
				next()
			} else {
				next('/signin')
			}
		},
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
		},
	},
	{
		path: '/:pathMatch(.*)*',
		component: SigninPage,
	},
]

export default createRouter({
	history: createWebHistory(),
	routes,
})
