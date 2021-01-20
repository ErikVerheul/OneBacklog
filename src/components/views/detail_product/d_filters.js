import { SEV, LEVEL } from '../../../constants.js'
import commonFilters from '../common_filters.js'

const methods = {
  /* Apply the AND logic to the included filters */
  onApplyMyFilters () {
    // reset any active selections first
		// this.$store.dispatch('resetFilters', { caller: 'onApplyMyFilters' })
    if (!this.filterOnReqAreas && !this.filterOnTeams && !this.filterTreeDepth && !this.filterOnState && !this.filterOnTime) return

    const onlyFilterOnDepth = this.filterTreeDepth && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime
    let count = 0
    const unselectedNodes = []
    // create a callback for the filtering
    const cb = (nm) => {
      // save node display state
      nm.savedDoShow = nm.doShow
      nm.savedIsExpanded = nm.isExpanded
      if (onlyFilterOnDepth) {
        nm.isExpanded = nm.level < this.selectedTreeDepth
        if (nm.level === this.selectedTreeDepth) return
      } else {
        // select nodeModels NOT to show; the node is shown if not excluded by any filter
        let isExcluded = false
        if (this.filterOnReqAreas) {
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
          if (this.filterTreeDepth) {
            if (nm.level <= this.selectedTreeDepth) {
							window.slVueTree.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
              if (nm.level > LEVEL.PRODUCT) count++
            } else return
          } else {
						window.slVueTree.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
            if (nm.level > LEVEL.PRODUCT) count++
          }
        } else {
          unselectedNodes.push(nm)
        }
      }
    }
    // execute the callback for the current product
		window.slVueTree.traverseModels(cb, window.slVueTree.getProductModel())

		this.$store.state.filterText = 'Clear filter'
    // window.slVueTree.showVisibility('onApplyMyFilters2', LEVEL.FEATURE)

    if (!onlyFilterOnDepth) {
      // hide unselected nodes with no selected descendants
      for (const n of unselectedNodes) {
        n.doShow = window.slVueTree.checkForFilteredDescendants(n)
      }
      let s
			count === 1 ? s = 'title matches' : s = 'titles match'
      this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)
    } else {
			this.showLastEvent(`The tree is displayed up to the selected level in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)
		}
  }
}

export default {
  extends: commonFilters,
  methods
}
