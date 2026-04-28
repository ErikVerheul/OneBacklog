import { createRouter, createWebHistory } from 'vue-router'

import store from './store/store'
import WelcomePage from './components/welcome/Welcome-comp.vue'
import RelNotesPage from './components/rel-notes/RelNotes.vue'
import UserGuidePage from './components/userguide/UserGuide.vue'
import InitPage from './components/initdb/InitDb.vue'
import SigninPage from './components/auth/Sign-in.vue'
import TreeViewPage from './components/views/tree_view/TreeView.vue'
import PlanningBoard from './components/views/planning_board/PlanningBoard.vue'
import AssistAdminPage from './components/admin/AssistAdmin.vue'
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
		beforeEnter() {
			if (store.state.userData.user) {
				return true
			} else {
				return '/signin'
			}
		},
	},
	{
		path: '/treeView',
		component: TreeViewPage,
		beforeEnter() {
			if (store.state.userData.user && store.state.isProductAssigned) {
				return true
			} else {
				return '/signin'
			}
		},
	},
	{
		path: '/board',
		component: PlanningBoard,
		beforeEnter() {
			if (store.state.userData.user) {
				return true
			} else {
				return '/signin'
			}
		},
	},
	{
		path: '/admin',
		component: AdminPage,
		beforeEnter() {
			if (store.state.userData.user) {
				return true
			} else {
				return '/signin'
			}
		},
	},
	{
		path: '/assistAdmin',
		component: AssistAdminPage,
		beforeEnter() {
			if (store.state.userData.user) {
				return true
			} else {
				return '/signin'
			}
		},
	},
	{
		path: '/serveradmin',
		component: ServerAdminPage,
		beforeEnter() {
			if (store.state.userData.user) {
				return true
			} else {
				return '/signin'
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
