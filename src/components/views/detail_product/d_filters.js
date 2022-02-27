import { SEV, LEVEL } from '../../../constants.js'
import { collapseNode, expandNode, hideNode } from '../../../common_functions.js'
import { utilities } from '../../mixins/generic.js'
import commonFilters from '../common_filters.js'

const methods = {
	/* Apply the AND logic to the included filters */
	onApplyMyFilters() {
		// return if a filter is already set or no filter is selected
		if (this.$store.state.resetFilter || !this.filterOnDependencies && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterTreeDepth && !this.filterOnState && !this.filterOnTime) return

		// save node display state
		const nodesToScan = this.$store.state.helpersRef.getCurrentProductModel()
		this.$store.commit('saveTreeView', { nodesToScan, type: 'filter' })

		const onlyFilterOnDepth = this.filterTreeDepth && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime
		let count = 0
		const unselectedNodes = []
		// create a callback for the filtering
		const cb = (nm) => {
			if (onlyFilterOnDepth) {
				if (nm.level < this.selectedTreeDepth) {
					expandNode(nm)
				} else collapseNode(nm)

				if (nm.level === this.selectedTreeDepth) return
			} else {
				// select nodeModels NOT to show; the node is shown if not excluded by any filter
				let isExcluded = false
				if (this.filterOnDependencies) {
					isExcluded = !this.doFilterOnDependencies(nm)
				}
				if (!isExcluded && this.filterOnReqAreas) {
					isExcluded = !this.doFilterOnReqAreas(nm)
				}
				if (!isExcluded && this.filterOnTeams) {
					isExcluded = !this.doFilterOnTeams(nm)
				}
				if (!isExcluded && this.filterOnState) {
					isExcluded = !this.doFilterOnState(nm)
				}
				if (!isExcluded && this.filterOnTime) {
					isExcluded = !this.doFilterOnTime(nm)
				}
				if (!isExcluded) {
					if (this.filterTreeDepth) {
						if (nm.level <= this.selectedTreeDepth) {
							this.$store.state.helpersRef.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
							if (nm.level > LEVEL.PRODUCT) count++
						} else return
					} else {
						this.$store.state.helpersRef.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
						if (nm.level > LEVEL.PRODUCT) count++
					}
				} else {
					unselectedNodes.push(nm)
				}
			}
		}
		// execute the callback for the current product
		this.$store.state.helpersRef.traverseModels(cb, this.$store.state.helpersRef.getCurrentProductModel())

		if (!onlyFilterOnDepth) {
			// hide unselected nodes with no selected descendants
			for (const nm of unselectedNodes) {
				if (!this.$store.state.helpersRef.checkForFilteredDescendants(nm)) hideNode(nm)
			}
			this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)
		} else {
			this.showLastEvent(`The tree is displayed up to the ${this.getLevelText(this.selectedTreeDepth)} level in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)
		}
		// create reset object
		this.$store.state.resetFilter = {
			currentSelectedNode: this.getLastSelectedNode,
		}
	}
}

export default {
	mixins: [utilities],
	extends: commonFilters,
	methods
}
