import { utilities } from '../../mixins/utilities.js'
import CommonFilters from '../common_filters.js'

const INFO = 0
const PRODUCTLEVEL = 2
const AREA_PRODUCTID = '0'

export default {
  mixins: [utilities],
  extends: CommonFilters,

  methods: {
    /* Apply the AND logic to the included filters */
    onApplyMyFilters() {
      // reset the other selections first
      window.slVueTree.resetFilters('onApplyMyFilters')
      // return if no filter is selected
      if (!this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime) return

      let count = 0
      const unselectedNodes = []
      // create a callback for the filtering
      let cb = (nm) => {
        // skip req area definitions
        if (nm.productId === AREA_PRODUCTID) return

        // save node display state
        nm.savedDoShow = nm.doShow
        nm.savedIsExpanded = nm.isExpanded
        // select nodeModels NOT to show; the node is shown if not excluded by any filter
        let isExcluded = false
        let doHighLight = false
        if (!isExcluded && this.filterOnReqAreas) {
          isExcluded = this.doFilterOnReqAreas(nm)
          doHighLight = !isExcluded
        }
        if (!isExcluded && this.filterOnTeams) {
          isExcluded = this.doFilterOnTeams(nm)
          doHighLight = !isExcluded
        }
        if (!isExcluded && this.filterOnState) {
          isExcluded = this.doFilterOnState(nm)
          doHighLight = !isExcluded
        }
        // console.log('onApplyMyFilters: isExcluded = ' + isExcluded + ' this.filterOnTime = ' + this.filterOnTime)
        if (!isExcluded && this.filterOnTime) {
          isExcluded = this.doFilterOnTime(nm)
          doHighLight = !isExcluded
        }

        if (!isExcluded) {
          window.slVueTree.showPath(nm.path, (nm.path.length > PRODUCTLEVEL) && doHighLight)
          if (nm.level > PRODUCTLEVEL) count++
        } else {
          unselectedNodes.push(nm)
        }
      }
      // execute the callback for ALL products
      window.slVueTree.traverseModels(cb)

      // hide unselected nodes with no selected descendants
      for (let node of unselectedNodes) {
        node.doShow = window.slVueTree.hasHighlightedDescendants(node)
      }
      let s
      count === 1 ? s = 'title matches' : s = 'titles match'
      this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.currentProductTitle}'`, INFO)

      this.$store.state.filterText = 'Clear filter'
      this.$store.state.filterOn = true
      // window.slVueTree.showVisibility('onApplyMyFilters2', FEATURELEVEL)
    }
  }
}