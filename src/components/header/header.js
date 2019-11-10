import licence from "./licence.vue"
import { utilities } from '../mixins/utilities.js'

const MINPASSWORDLENGTH = 8

export default {
    mixins: [utilities],
    data() {
        return {
            appVersion: "OneBackLog v.0.7.0",
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
            this.$store.dispatch('changeCurrentDb2', {dbName: this.myDatabase, products: []})
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
                for (let i = 0; i < this.$store.state.load.myProductOptions.length; i++) {
                    if (this.selectedProducts.includes(this.$store.state.load.myProductOptions[i].value)) {
                        this.defaultProductOptions.push(this.$store.state.load.myProductOptions[i])
                    }
                }
                this.$refs.selectDefaultProductRef.show()
            }
        },

        /* Update the subscriptions array of this user */
        updateProductsSubscription() {
            let myNewProductSubscriptions = []
            // the first (index 0) product is by definition the default product
            myNewProductSubscriptions.push(this.defaultProductId)
            for (let i = 0; i < this.selectedProducts.length; i++) {
                if (this.selectedProducts[i] !== this.defaultProductId) {
                    myNewProductSubscriptions.push(this.selectedProducts[i])
                }
            }
            this.$store.dispatch('updateSubscriptions', myNewProductSubscriptions)
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
