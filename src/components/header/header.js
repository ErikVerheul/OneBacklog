import licence from "./licence.vue"
import { showLastEvent } from '../mixins/showLastEvent.js'

const INFO = 0
const RESETFILTERBUTTONTEXT = 'Clear filter'

export default {
    mixins: [showLastEvent],
    data() {
        return {
            appVersion: "OneBackLog v.0.6.0",
            oldPassword: "",
            newPassword1: "",
            newPassword2: "",
            selectedProducts: this.$store.state.load.myProductSubscriptions,
            defaultProductId: undefined,
            defaultProductOptions: []
        }
    },
    mounted() {
        function isEmpty(str) {
            return !str.replace(/\s+/, '').length;
        }

        // add tag when DEMO version
        if (this.$store.state.demo) this.appVersion = this.appVersion + " DEMO"

        let el = document.getElementById("selectOnId")
        // fire the search on short id on pressing enter in the select-on-Id input field (instead of submitting the form)
        el.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                event.preventDefault()
                // check for valid input and convert to lowercase
                if (this.shortIdState) {
                    window.slVueTree.resetFilters('selectOnId')
                    this.selectNode(this.$store.state.shortId.toLowerCase())
                }
            }
        })
        el.addEventListener("input", () => {
            if (isEmpty(el.value)) {
                window.slVueTree.resetFilters('selectOnId')
            }
        })

        let el2 = document.getElementById("searchInput")
        // fire the search button on pressing enter in the search input field (instead of submitting the form)
        el2.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                event.preventDefault()
                this.filterOnKeyword()
            }
        })
        el2.addEventListener("input", () => {
            if (isEmpty(el2.value)) {
                window.slVueTree.resetFilters('showSearchInTitles')
            }
        })
    },

    computed: {
        auth() {
            return this.$store.getters.isAuthenticated
        },
        serverAdmin() {
            return (
                this.$store.getters.isAuthenticated && this.$store.getters.isServerAdmin
            )
        },
        shortIdState() {
            if (this.$store.state.shortId.length !== 5) return false

            const digits = '0123456789'
            const hex = '0123456789abcdefABCDEF'
            if (!digits.includes(this.$store.state.shortId.substring(0, 1))) return false
            for (let i = 1; i < this.$store.state.shortId.length; i++) {
                if (!hex.includes(this.$store.state.shortId.substring(i, i + 1))) return false
            }
            return true
        }
    },
    methods: {
        selectNode(shortId) {
            let node
            window.slVueTree.traverseModels((nodeModel) => {
                if (nodeModel.shortId === shortId) {
                    node = nodeModel
                    return false
                }
            })
            if (node) {
                this.$store.state.findIdOn = true
                // if the user clicked on a node of another product
                if (this.$store.state.load.currentProductId !== node.productId) {
                    // clear any outstanding filters
                    if (this.$store.state.filterOn || this.$store.state.searchOn) {
                        window.slVueTree.resetFilters('nodeSelectedEvent')
                    }
                    // collapse the previously selected product
                    window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
                    // update current productId and title
                    this.$store.state.load.currentProductId = node.productId
                    this.$store.state.load.currentProductTitle = window.slVueTree.getProductTitle(node.productId)
                } else {
                    // node on current product; collapse the currently selected product
                    window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
                }

                this.showLastEvent(`The item is found in product '${this.$store.state.load.currentProductTitle}'`, INFO)
                // expand the newly selected product up to the found item
                window.slVueTree.showItem(node)
                // load the document if not already in memory
                if (node._id !== this.$store.state.currentDoc._id) {
                    this.$store.dispatch('loadDoc', node._id)
                }
            } else {
                // the node is not found in the current product selection; try to find it in the database
                this.$store.dispatch('getItemByShortId', shortId)
            }
        },

        onFilterSinceEvent(val) {
            if (this.$store.state.filterOn) {
                window.slVueTree.resetFilters("onFilterSinceEvent")
            }
            this.filterSince(val);
        },

        onClearFilterEvent() {
            if (this.$store.state.filterOn) {
                window.slVueTree.resetFilters("onClearFilterEvent")
            }
        },

        changeTeam() {
            this.$refs.changeTeamRef.show()
        },

        selectProducts() {
            this.$refs.selectProductsRef.show()
        },

        changePassword() {
            if (this.$store.getters.isServerAdmin)
                alert(
                    "As a 'server admin' you cannot change your password here. Use Fauxton instead"
                );
            else {
                this.$refs.changePwRef.show()
            }
        },

        doChangeTeam() { },

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
            /* A direct replacement for Java’s String.hashCode() method implemented in Javascript */
            function hashCode(s) {
                var hash = 0, i, chr
                if (s.length === 0) return hash
                for (i = 0; i < s.length; i++) {
                    chr = s.charCodeAt(i)
                    hash = ((hash << 5) - hash) + chr;
                    hash |= 0 // Convert to 32bit integer
                }
                return hash
            }

            if (hashCode(this.oldPassword) !== this.$store.state.passwordHash) {
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
            if (this.newPassword1.length < 8) {
                alert(
                    "Your new password must be 8 characters or longer. Please try again."
                )
                return
            }
            this.$store.dispatch('changePassword', this.newPassword1)
        },

        filterSince(since) {
            // if needed reset the other selection first
            if (this.$store.state.searchOn || this.$store.state.findIdOn) window.slVueTree.resetFilters('filterSince')
            let sinceMilis = since * 60000
            let count = 0
            window.slVueTree.traverseModels((nodeModel) => {
                // limit to levels higher than product
                if (Date.now() - nodeModel.data.lastChange < sinceMilis) {
                    window.slVueTree.showPathToNode(nodeModel)
                    count++
                } else {
                    nodeModel.doShow = false
                }
            }, window.slVueTree.getProductModels(this.$store.state.load.currentProductId))
            // show event
            if (count === 1) {
                this.showLastEvent(`${count} item title matches your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
            } else {
                this.showLastEvent(`${count} item titles match your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
            }
            this.$store.state.filterText = RESETFILTERBUTTONTEXT
            this.$store.state.filterOn = true
            // this.showVisibility('filterSince', 4)
        },

        filterOnKeyword() {
            // cannot search on empty string
            if (this.$store.state.keyword === '') return

            // if needed reset the other selection first
            if (this.$store.state.filterOn || this.$store.state.findIdOn) window.slVueTree.resetFilters('filterOnKeyword')
            let count = 0
            window.slVueTree.traverseModels((nodeModel) => {
                if (nodeModel.title.toLowerCase().includes(this.$store.state.keyword.toLowerCase())) {
                    window.slVueTree.showPathToNode(nodeModel)
                    count++
                } else {
                    nodeModel.doShow = false
                }
            }, window.slVueTree.getProductModels(this.$store.state.load.currentProductId))
            // show event
            if (count === 1) {
                this.showLastEvent(`${count} item title matches your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
            } else {
                this.showLastEvent(`${count} item titles match your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
            }
            this.$store.state.searchOn = true
            // this.showVisibility('filterOnKeyword', 4)
        },

        onSignout() {
            this.$store.dispatch("signout");
        }
    },
    components: {
        appLicence: licence
    }
}
