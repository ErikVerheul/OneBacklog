import licence from "./licence.vue"
import { mapGetters } from 'vuex'
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const MINPASSWORDLENGTH = 8

export default {
    mixins: [utilities],
    data() {
        return {
            appVersion: "OneBackLog v.0.9.1",
            oldPassword: "",
            newPassword1: "",
            newPassword2: "",
            selectedProducts: this.$store.state.userData.myProductSubscriptions,
            defaultProductOptions: [],
            myTeam: '',
            myDatabase: '',
            databaseOptions: [],
            teamOptions: [],
            newDefaultProductId: this.$store.state.currentDefaultProductId
        }
    },
    created() {
        // add tag when DEMO version
        if (this.$store.state.demo) this.appVersion = this.appVersion + " DEMO"
    },

    computed: {
        ...mapGetters([
            'isAuthenticated',
            'isServerAdmin',
            'isSuperPO',
            'isAPO',
            'isAdmin',
        ]),
    },

    methods: {
        changeDatabase() {
            this.myDatabase = this.$store.state.userData.currentDb
            this.$refs.changeDatabaseRef.show()
            this.databaseOptions = []
            for (let db of this.$store.state.userData.myDatabases) {
                this.databaseOptions.push(db)
            }
        },

        changeTeam() {
            this.myTeam = this.$store.state.userData.myTeam
            this.$refs.changeTeamRef.show()
            this.teamOptions = []
            for (let team of this.$store.state.configData.teams) {
                this.teamOptions.push(team)
            }
        },

        selectProducts() {
            this.$refs.selectProductsRef.show()
        },

        changePassword() {
            if (this.$store.getters.isServerAdmin)
                alert("As a 'server admin' you cannot change your password here. Use Fauxton instead")
            else this.$refs.changePwRef.show()
        },

        doChangeDatabase() {
            window.slVueTree.resetFilters('doChangeDatabase')
            const msg = "You changed database. Sign out and -in again to see the change"
            this.$store.state.warning = msg
            this.showLastEvent(msg, WARNING)
            this.$store.dispatch('changeCurrentDb', this.myDatabase)
        },

        doChangeTeam() {
            this.$store.dispatch('changeTeam', this.myTeam)
        },

        /* Return if nothing is selected; set default product if 1 is selected; call selectDefaultProductRef if > 1 is selected */
        doSelectProducts() {
            if (this.selectedProducts.length === 0) {
                return
            }

            this.defaultProductOptions = []
            if (this.selectedProducts.length === 1) {
                this.updateProductsView([this.selectedProducts[0]], this.selectedProducts[0])
            } else {
                for (let o of this.$store.state.myProductOptions) {
                    if (this.selectedProducts.includes(o.value)) {
                        this.defaultProductOptions.push(o)
                    }
                }
                this.$refs.selectDefaultProductRef.show()
            }
        },

        /* Update the subscriptions array of this user */
        updateProductsSubscriptions() {
            // the first (index 0) product is by definition the default product
            const myNewProductSubscriptions = [this.newDefaultProductId]
            const otherSubscriptions = []
            for (let p of this.selectedProducts) {
                if (p !== this.newDefaultProductId) {
                    otherSubscriptions.push(p)
                }
            }
            this.updateProductsView(myNewProductSubscriptions.concat(otherSubscriptions), this.newDefaultProductId)
        },

        updateProductsView(productIds, newDefaultId) {
            const defaultProductChanged = this.$store.state.currentProductId !== newDefaultId
            if (defaultProductChanged) {
                // collapse the previously selected product
                window.slVueTree.collapseTree()
                // update globals to new default
                this.$store.state.currentProductId = newDefaultId
                this.$store.state.currentDefaultProductId = newDefaultId
                // load the product doc if not already in memory
                if (this.$store.state.nodeSelected._id !== newDefaultId) {
                    this.$store.dispatch('loadDoc', newDefaultId)
                }
            }
            // remove products from the tree view
            let removedCount = 0
            for (let productId of this.$store.state.userData.myProductSubscriptions) {
                if (!productIds.includes(productId)) {
                    window.slVueTree.removeProduct(productId)
                    removedCount++
                }
                this.showLastEvent(`${removedCount} products are removed from this view`, INFO)
            }
            // update myProductSubscriptions and add product(s) if missing
            this.$store.state.userData.myProductSubscriptions = []
            const missingIds = []
            for (let productId of productIds) {
                if (this.$store.state.userData.userAssignedProductIds.includes(productId)) {
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
                this.showLastEvent(`${missingIds.length} more products are loaded`, INFO)
                this.$store.dispatch('addProducts', { missingIds, newDefaultId })
            }
            this.$store.dispatch('updateSubscriptions', productIds)
        },

        doChangePw() {
            if (this.oldPassword !== this.$store.state.userData.password) {
                alert("Your current password is incorrect. Please try again.")
                return
            }
            if (this.newPassword1 !== this.newPassword2) {
                alert("You entered two different new passwords. Please try again.")
                return
            }
            if (this.newPassword1.length < MINPASSWORDLENGTH) {
                alert("Your new password must be 8 characters or longer. Please try again.")
                return
            }
            this.$store.dispatch('changePassword', this.newPassword1)
        },

        onSignout() {
            this.$store.dispatch("signout");
        }
    },
    components: {
        appLicence: licence
    }
}
