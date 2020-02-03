import licence from "./licence.vue"
import { utilities } from '../mixins/utilities.js'

const WARNING = 1
const MINPASSWORDLENGTH = 8

export default {
    mixins: [utilities],
    data() {
        return {
            appVersion: "OneBackLog v.0.8.4.1",
            oldPassword: "",
            newPassword1: "",
            newPassword2: "",
            selectedProducts: this.$store.state.userData.myProductSubscriptions,
            defaultProductId: undefined,
            defaultProductOptions: [],
            myTeam: '',
            myDatabase: '',
            databaseOptions: [],
            teamOptions: []
        }
    },
    created() {
        // add tag when DEMO version
        if (this.$store.state.demo) this.appVersion = this.appVersion + " DEMO"
    },

    computed: {
        auth() {
            return this.$store.getters.isAuthenticated
        },
        serverAdmin() {
            return (
                this.auth && this.$store.getters.isServerAdmin
            )
        },
        areaPO() {
            return (
                this.auth && this.$store.getters.isAreaPO
            )
        },
        superPO() {
            return (
                this.auth && this.$store.getters.isSuperPO
            )
        },
        admin() {
            return (
                this.auth && this.$store.getters.isAdmin
            )
        }
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
            this.showLastEvent("You changed database. Sign out and -in again to see the change", WARNING)
            this.$store.dispatch('changeCurrentDb2', { dbName: this.myDatabase, products: [] })
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
                // if just 1 product is selected that product is the default
                this.defaultProductId = this.selectedProducts[0]
                this.$store.dispatch('updateSubscriptions', [this.defaultProductId])
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
        updateProductsSubscription() {
            // the first (index 0) product is by definition the default product
            const myNewProductSubscriptions = [this.defaultProductId]
            const otherSubscriptions = []
            for (let p of this.selectedProducts) {
                if (p !== this.defaultProductId) {
                    otherSubscriptions.push(p)
                }
            }
            // sort on creation date in ascending order
            otherSubscriptions.sort()
            this.showLastEvent("You changed product subscriptions. Sign out and -in again to see the change", WARNING)
            this.$store.dispatch('updateSubscriptions', myNewProductSubscriptions.concat(otherSubscriptions))
        },

        doChangePw() {
            if (this.oldPassword !== this.$store.state.userData.password) {
                alert(
                    "Your current password is incorrect. Please try again."
                )
                return
            }
            if (this.newPassword1 !== this.newPassword2) {
                alert(
                    "You entered two differen new passwords. Please try again."
                )
                return
            }
            if (this.newPassword1.length < MINPASSWORDLENGTH) {
                alert(
                    "Your new password must be 8 characters or longer. Please try again."
                )
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
