import { utilities } from '../../mixins/utilities.js'
import CommonFilters from '../common_filters.js'

const INFO = 0
const PRODUCTLEVEL = 2


export default {
  mixins: [utilities],
  extends: CommonFilters,

  methods: {
    /* Apply the AND logic to the included filters */
    onApplyMyFilters() {
      // reset the other selections first
      window.slVueTree.resetFilters('onApplyMyFilters')
      if (!this.filterOnReqAreas && !this.filterOnTeams && !this.filterTreeDepth && !this.filterOnState && !this.filterOnTime) return

      const onlyFilterOnDepth = this.filterTreeDepth && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime
      let count = 0
      const unselectedNodes = []
      // create a callback for the filtering
      let cb = (nm) => {
        if (onlyFilterOnDepth) {
          nm.isExpanded = nm.level < this.selectedTreeDepth
          if (nm.level === this.selectedTreeDepth) return
        } else {
          // save node display state
          nm.savedDoShow = nm.doShow
          nm.savedIsExpanded = nm.isExpanded
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
                window.slVueTree.showPath(nm.path, nm.path.length > PRODUCTLEVEL)
                if (nm.level > PRODUCTLEVEL) count++
              } else return
            } else {
              window.slVueTree.showPath(nm.path, nm.path.length > PRODUCTLEVEL)
              if (nm.level > PRODUCTLEVEL) count++
            }
          } else {
            unselectedNodes.push(nm)
          }
        }
      }
      // execute the callback for the current product
      window.slVueTree.traverseModels(cb, window.slVueTree.getProductModels())

      if (!onlyFilterOnDepth) {
        // hide unselected nodes with no selected descendants
        for (let n of unselectedNodes) {
          n.doShow = window.slVueTree.hasHighlightedDescendants(n)
        }
        let s
        count === 1 ? s = 'title matches' : s = 'titles match'
        this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.currentProductTitle}'`, INFO)
      } else this.showLastEvent(`The tree is displayed up to the selected level in product '${this.$store.state.currentProductTitle}'`, INFO)

      this.$store.state.filterText = 'Clear filter'
      this.$store.state.filterOn = true
      // window.slVueTree.showVisibility('onApplyMyFilters2', FEATURELEVEL)
    }
  }
}
