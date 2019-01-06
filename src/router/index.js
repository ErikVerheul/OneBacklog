import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueRouter from 'vue-router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import store from '../store/store'

import WelcomePage from '../components/welcome/welcome.vue'
import SetupPage from '../components/setup/setup.vue'
import SigninPage from '../components/auth/signin.vue'
import ProductPage from '../components/product/product.vue'
import ReqsAreaPage from '../components/reqsarea/reqsarea.vue'
import EpicPage from '../components/epic/epic.vue'
import FeaturePage from '../components/feature/feature.vue'
import PBIPage from '../components/pbi/pbi.vue'

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
  { path: '/product', component: ProductPage },
  { path: '/reqsarea', component: ReqsAreaPage },
  { path: '/epic', component: EpicPage },
  { path: '/feature', component: FeaturePage },
  { path: '/pbi', component: PBIPage },
]

export default new VueRouter({mode: 'history', routes})
