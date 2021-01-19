import { sev, level } from '../../../constants.js'
import commonFilters from '../common_filters.js'

const AREA_PRODUCTID = 'requirement-areas'
const methods = {
  /* Apply the AND logic to the included filters */
  onApplyMyFilters () {
    // reset any active selections first
		// this.$store.dispatch('resetFilters', { caller: 'onApplyMyFilters' })
    // return if no filter is selected
    if (!this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime) return

    let count = 0
    const unselectedNodes = []
    // create a callback for the filtering
    const cb = (nm) => {
      // skip req area definitions
      if (nm.productId === AREA_PRODUCTID) return

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
				window.slVueTree.showPathToNode(nm, { doHighLight_1: (nm.level > level.PRODUCT) })
        if (nm.level > level.PRODUCT) count++
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
    let s
    count === 1 ? s = 'title matches' : s = 'titles match'
    this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.currentProductTitle}'`, sev.INFO)

    this.$store.state.filterText = 'Clear filter'
    // window.slVueTree.showVisibility('onApplyMyFilters2', level.FEATURE)
  }
}

export default {
  extends: commonFilters,
  methods
}
