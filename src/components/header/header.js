import Licence from './licence.vue'
import router from '../../router'
import { authorization, utilities } from '../mixins/generic.js'

const INFO = 0
const MINPASSWORDLENGTH = 8

function created () {
  // add tag when DEMO version
  if (this.$store.state.demo) this.appVersion = this.appVersion + ' DEMO'
}

function data () {
  return {
    appVersion: 'OneBackLog v.1.2.5',
    disableOkButton: false,
    oldPassword: '',
    newPassword1: '',
    newPassword2: '',
    selectedProducts: this.$store.state.userData.myProductSubscriptions,
    defaultProductOptions: [],
    selectedTeam: '',
    myDatabase: '',
    databaseOptions: [],
    teamOptions: [],
    newDefaultProductId: this.$store.state.currentDefaultProductId
  }
}

const methods = {
  changeDatabase () {
    this.myDatabase = this.$store.state.userData.currentDb
    this.$refs.changeDatabaseRef.show()
    this.databaseOptions = []
    for (const db of this.$store.state.userData.myDatabases) {
      this.databaseOptions.push(db)
    }
  },

  changeTeam () {
    this.selectedTeam = this.myTeam
    this.$refs.changeTeamRef.show()
    this.teamOptions = []
    for (const team of Object.keys(this.$store.state.allTeams)) {
      this.teamOptions.push(team)
    }
  },

  selectProducts () {
    this.$refs.selectProductsRef.show()
  },

  changePassword () {
    if (this.isServerAdmin) { alert("As a 'server admin' you cannot change your password here. Use Fauxton instead") } else this.$refs.changePwRef.show()
  },

  doChangeDatabase () {
    window.slVueTree.resetFilters('doChangeDatabase')
    if (this.myDatabase !== this.$store.state.userData.currentDb) {
      this.$store.dispatch('changeCurrentDb', this.myDatabase)
      router.replace('/')
    }
  },

  doChangeTeam () {
    this.$store.dispatch('changeTeam', this.selectedTeam)
  },

  /* Return if nothing is selected; set default product if 1 is selected; call selectDefaultProductRef if > 1 is selected */
  doSelectProducts () {
    if (this.selectedProducts.length === 0) {
      return
    }

    this.defaultProductOptions = []
    if (this.selectedProducts.length === 1) {
      this.updateProductsView([this.selectedProducts[0]], this.selectedProducts[0])
    } else {
      for (const o of this.$store.state.myProductOptions) {
        if (this.selectedProducts.includes(o.value)) {
          this.defaultProductOptions.push(o)
        }
      }
      this.$refs.selectDefaultProductRef.show()
    }
  },

  /* Update the subscriptions array of this user */
  updateProductsSubscriptions () {
    // the first (index 0) product is by definition the default product
    const myNewProductSubscriptions = [this.newDefaultProductId]
    const otherSubscriptions = []
    for (const p of this.selectedProducts) {
      if (p !== this.newDefaultProductId) {
        otherSubscriptions.push(p)
      }
    }
    this.updateProductsView(myNewProductSubscriptions.concat(otherSubscriptions), this.newDefaultProductId)
  },

  updateProductsView (productIds, newDefaultId) {
    const defaultProductChanged = this.$store.state.currentProductId !== newDefaultId
    if (defaultProductChanged) {
      // collapse the previously selected product
      window.slVueTree.collapseTree()
      // update globals to new default
      this.$store.state.currentProductId = newDefaultId
      this.$store.state.currentDefaultProductId = newDefaultId
      this.$store.dispatch('loadDoc', { id: newDefaultId })
    }
    // remove products from the tree view
    let removedCount = 0
    for (const productId of this.$store.state.userData.myProductSubscriptions) {
      if (!productIds.includes(productId)) {
        window.slVueTree.removeProduct(productId)
        removedCount++
      }
      this.showLastEvent(`${removedCount} products are removed from this view`, INFO)
    }
    // update myProductSubscriptions and add product(s) if missing
    this.$store.state.userData.myProductSubscriptions = []
    const missingIds = []
    for (const productId of productIds) {
      if (this.myAssignedProductIds.includes(productId)) {
        this.$store.state.userData.myProductSubscriptions.push(productId)
        if (window.slVueTree.getNodeById(productId) === null) {
          missingIds.push(productId)
        }
      }
    }
    if (!missingIds.includes(newDefaultId)) {
      if (defaultProductChanged) {
        // select the new default product
        window.slVueTree.selectNodeById(newDefaultId)
        // expand the newly selected product up to the feature level
        window.slVueTree.expandTree()
      }
    }
    if (missingIds.length > 0) {
      this.showLastEvent(`${this.$store.state.userData.myProductSubscriptions.length} products are loaded`, INFO)
      this.$store.dispatch('addProducts', { missingIds, newDefaultId })
    }
    this.$store.dispatch('updateSubscriptions', productIds)
  },

  doChangePw () {
    if (this.oldPassword !== this.$store.state.userData.password) {
      alert('Your current password is incorrect. Please try again.')
      return
    }
    if (this.newPassword1 !== this.newPassword2) {
      alert('You entered two different new passwords. Please try again.')
      return
    }
    if (this.newPassword1.length < MINPASSWORDLENGTH) {
      alert('Your new password must be 8 characters or longer. Please try again.')
      return
    }
    this.$store.dispatch('changePassword', this.newPassword1)
  },

  onSignout () {
    this.$store.dispatch('signout')
  }
}

export default {
	mixins: [authorization, utilities],
  created,
  data,
  methods,
  components: {
    appLicence: Licence
  }
}
