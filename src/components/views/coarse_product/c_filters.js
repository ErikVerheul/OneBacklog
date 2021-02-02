import { SEV, LEVEL, MISC } from '../../../constants.js'
import commonFilters from '../common_filters.js'

const methods = {
	/* Apply the AND logic to the included filters */
	onApplyMyFilters() {
		// return if no filter is selected
		if (!this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime) return

		// reset any active selections first
		this.$store.dispatch('resetFilters', {
			caller: 'onApplyMyFilters', onSuccessCallback: () => {
				let count = 0
				const unselectedNodes = []
				// create a callback for the filtering
				const cb = (nm) => {
					// skip req area definitions
					if (nm.productId === MISC.AREA_PRODUCTID) return

					// save node display state
					nm.savedDoShow = nm.doShow
					nm.savedIsExpanded = nm.isExpanded
					// select nodeModels NOT to show; the node is shown if not excluded by any filter
					let isExcluded = false
					if (!isExcluded && this.filterOnReqAreas) {
						isExcluded = this.doFilterOnReqAreas(nm)
					}
					if (!isExcluded && this.filterOnTeams) {
						isExcluded = this.doFilterOnTeams(nm)
					}
					if (!isExcluded && this.filterOnState) {
						isExcluded = this.doFilterOnState(nm)
					}
					if (!isExcluded && this.filterOnTime) {
						isExcluded = this.doFilterOnTime(nm)
					}
					if (!isExcluded) {
						window.slVueTree.showPathToNode(nm, { doHighLight_1: (nm.level > LEVEL.PRODUCT) }, false)
						if (nm.level > LEVEL.PRODUCT) count++
					} else {
						unselectedNodes.push(nm)
					}
				}
				// execute the callback for ALL products
				window.slVueTree.traverseModels(cb)

				// hide unselected nodes with no selected descendants
				for (const n of unselectedNodes) {
					n.doShow = window.slVueTree.checkForFilteredDescendants(n)
				}
				this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)

				this.$store.state.filterText = 'Clear filter'
				// create reset object
				this.$store.state.resetFilter = {
					searchType: 'onSetMyFilters',
					highLight: 'highlighted_1'
				}
			}
		})
	}
}

export default {
	extends: commonFilters,
	methods
}
