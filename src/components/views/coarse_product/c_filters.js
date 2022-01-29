import { SEV, LEVEL, MISC } from '../../../constants.js'
import { hideNode } from '../../../common_functions.js'
import commonFilters from '../common_filters.js'

const methods = {
	/* Apply the AND logic to the included filters */
	onApplyMyFilters() {
		// return if a filer is already set or no filter is selected
		if (this.$store.state.filterTreeIsSet || !this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime) return

		// save node display state
		this.$store.state.helpersRef.traverseModels((nm) => {
			nm.tmp.savedDoShowInFilter = nm.doShow
			nm.tmp.savedIsExpandedInFilter = nm.isExpanded
		})

		let count = 0
		const unselectedNodes = []
		// create a callback for the filtering
		const cb = (nm) => {
			// skip req area definitions
			if (nm.productId === MISC.AREA_PRODUCTID) return

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
				this.$store.state.helpersRef.showPathToNode(nm, { doHighLight_1: (nm.level > LEVEL.PRODUCT) })
				if (nm.level > LEVEL.PRODUCT) count++
			} else {
				unselectedNodes.push(nm)
			}
		}
		// execute the callback for ALL products
		this.$store.state.helpersRef.traverseModels(cb)

		// hide unselected nodes with no selected descendants
		for (const nm of unselectedNodes) {
			if (!this.$store.state.helpersRef.checkForFilteredDescendants(nm)) hideNode(nm)
		}
		this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)

		this.$store.state.filterTreeIsSet = true
	}
}

export default {
	extends: commonFilters,
	methods
}
