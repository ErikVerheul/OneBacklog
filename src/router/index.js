import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueRouter from 'vue-router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import store from '../store/store'

import WelcomePage from '../components/welcome/welcome.vue'
import DashboardPage from '../components/dashboard/dashboard.vue'
import SetupPage from '../components/setup/setup.vue'
import SigninPage from '../components/auth/signin.vue'

Vue.use(VueRouter)
Vue.use(BootstrapVue)

const routes = [
  { path: '/', component: WelcomePage },
  { path: '/signin', component: SigninPage },
  {
    path: '/setup',
    component: SetupPage,
    beforeEnter (to, from, next) {
      if (store.state.user) {
        next()
      } else {
        next('/signin')
      }
    }
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    beforeEnter (to, from, next) {
      if (store.state.user) {
        next()
      } else {
        next('/signin')
      }
    }
  }
]

export default new VueRouter({mode: 'history', routes})
