import { utilities } from '../mixins/utilities.js'

const INFO = 0
const PRODUCTLEVEL = 2
const AREA_PRODUCTID = '0'

export default {
  mixins: [utilities],
  data() {
    return {
      filterOnReqAreas: false,
      selectedReqAreas: [],
      filterOnTeams: false,
      teamOptions: [],
      selectedTeams: [],
      filterTreeDepth: false,
      selectedTreeDepth: '3',
      filterOnState: false,
      stateOptions: [],
      selectedStates: [],
      filterOnTime: false,
      fromDate: undefined,
      toDate: undefined,
      selectedTime: '1140'
    }
  },

  mounted() {
    // init the filter settings
    const myFilterSettings = this.$store.state.userData.myFilterSettings
    if (myFilterSettings) {
      this.filterOnReqAreas = myFilterSettings.filterOnReqAreas
      this.selectedReqAreas = myFilterSettings.selectedReqAreas
      this.filterOnTeams = myFilterSettings.filterOnTeams
      this.selectedTeams = myFilterSettings.selectedTeams
      this.filterTreeDepth = myFilterSettings.filterTreeDepth
      this.selectedTreeDepth = myFilterSettings.selectedTreeDepth
      this.filterOnState = myFilterSettings.filterOnState
      this.selectedStates = myFilterSettings.selectedStates
      this.filterOnTime = myFilterSettings.filterOnTime
      this.fromDate = myFilterSettings.fromDate
      this.toDate = myFilterSettings.toDate
      this.selectedTime = myFilterSettings.selectedTime
    }

    // expose instance to the global namespace
    window.myFilters = this.$refs.myFiltersRef

    // set the available team options
    this.teamOptions = []
    for (let team of this.$store.state.configData.teams) {
      this.teamOptions.push(team)
    }
    // remove non existing teams
    let clearedSelectedTeams = []
    for (let team of this.selectedTeams) {
      if (this.teamOptions.includes(team)) {
        clearedSelectedTeams.push(team)
      }
    }
    this.selectedTeams = clearedSelectedTeams
    // set the available state options
    let i = 0
    this.stateOptions = []
    for (let state of this.$store.state.configData.itemState) {
      this.stateOptions.push({ text: state, value: i })
      i++
    }
  },

  methods: {
    onSaveFilters() {
      const myFilterSettings = {
        filterOnReqAreas: this.filterOnReqAreas,
        selectedReqAreas: this.selectedReqAreas,
        filterOnTeams: this.filterOnTeams,
        selectedTeams: this.selectedTeams,
        selectedTreeDepth: this.selectedTreeDepth,
        filterOnState: this.filterOnState,
        selectedStates: this.selectedStates,
        filterOnTime: this.filterOnTime,
        fromDate: this.fromDate,
        toDate: this.toDate,
        selectedTime: this.selectedTime
      }
      this.$store.dispatch('saveMyFilterSettings', myFilterSettings)
      this.showLastEvent('Saving the filter settings', INFO)
    },

    doFilterOnReqAreas(nm) {
      if (nm.level < PRODUCTLEVEL) return false
      return !(this.selectedReqAreas.includes(nm.data.reqarea))
    },

    doFilterOnTeams(nm) {
      if (nm.level <= PRODUCTLEVEL) return false
      return !(this.selectedTeams.includes(nm.data.team))
    },

    doFilterOnState(nm) {
      if (nm.level <= PRODUCTLEVEL) return false
      return !(this.selectedStates.includes(nm.data.state))
    },

    doFilterOnTime(nm) {
      if (nm.level <= PRODUCTLEVEL) return false
      if (this.selectedTime === '0') {
        if (this.fromDate && this.toDate) {
          // process a period from fromDate(inclusive) to toDate(exclusive); date format is yyyy-mm-dd
          const fromMilis = Date.parse(this.fromDate)
          const endOfToMilis = Date.parse(this.toDate) + 24 * 60 * 60000
          return !(nm.data.lastChange >= fromMilis && nm.data.lastChange < endOfToMilis)
        }
      } else {
        const sinceMilis = parseInt(this.selectedTime) * 60000
        return !(Date.now() - nm.data.lastChange < sinceMilis)
      }
    },

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
    },


  },
}
