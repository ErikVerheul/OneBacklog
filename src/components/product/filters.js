import { utilities } from '../mixins/utilities.js'

const INFO = 0

export default {
  mixins: [utilities],
  data() {
    return {
      filterOnTeams: 'no',
      teamOptions: [],
      selectedTeams: [],
      filterTreeDepth: 'no',
      selectedTreeDepth: "0",
      filterOnState: 'no',
      stateOptions: [],
      selectedStates: [],
      filterOnTime: 'no',
      fromDate: undefined,
      toDate: undefined,
      selectedTime: "0"
    }
  },

  mounted() {
    // init the filter settings
    const myFilterSettings = this.$store.state.userData.myFilterSettings
    if (myFilterSettings) {
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
        filterOnTeams: this.filterOnTeams,
        selectedTeams: this.selectedTeams,
        filterTreeDepth: this.filterTreeDepth,
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

    doFilterOnTeams(nm) {
      return !(this.selectedTeams.includes(nm.data.team))
    },

    doFilterOnState(nm) {
      return !(this.selectedStates.includes(nm.data.state))
    },

    doFilterOnTime(nm) {
      if (this.selectedTime === '0') {
        if (this.fromDate && this.toDate) {
          // process a period from fromDate(inclusive) to toDate(exclusive); date format is yyyy-mm-dd
          const fromMilis = Date.parse(this.fromDate)
          const endOfToMilis = Date.parse(this.toDate) + 24 * 60 * 60000
          return !(nm.data.lastChange >= fromMilis && nm.data.lastChange < endOfToMilis)
        }
      } else {
        const sinceMilis = parseInt(this.selectedTime) * 60000
        const now = Date.now()
        return !(now - nm.data.lastChange < sinceMilis)
      }
    },

    /* Apply the AND logic to the included filters */
    onApplyMyFilters() {
      // reset the other selections first
      window.slVueTree.resetFilters('onApplyMyFilters')
      if (this.filterOnTeams === 'no' && this.filterTreeDepth === 'no' && this.filterOnState === 'no' && this.filterOnTime === 'no') return

      const onlyFilterOnDepth = this.filterTreeDepth === 'yes' && this.filterOnTeams === 'no' && this.filterOnState === 'no' && this.filterOnTime === 'no'
      let count = 0
      // create a callback for the filtering
      let cb = (nodeModel) => {
        // save node display state
        nodeModel.savedDoShow = nodeModel.doShow
        nodeModel.savedIsExpanded = nodeModel.isExpanded
        // select nodeModels NOT to show; the node is shown if not excluded by any filter
        let isExcluded = false
        if (this.filterOnTeams === 'yes') {
          isExcluded = this.doFilterOnTeams(nodeModel)
        }
        if (!isExcluded && this.filterOnState === 'yes') {
          isExcluded = this.doFilterOnState(nodeModel)
        }
        if (!isExcluded && this.filterOnTime === 'yes') {
          isExcluded = this.doFilterOnTime(nodeModel)
        }

        if (onlyFilterOnDepth) {
          // when filtering on depth only, show the node if below the selected level
          if (window.slVueTree.expandPathToNode(nodeModel, parseInt(this.selectedTreeDepth))) {
            // the parent is expanded, so the the node is shown: collapse this node to hide its descendants
            nodeModel.isExpanded = false
          }
        } else {
          if (!isExcluded) {
            // when not filtering on depth only, show this node if not filtered out and highlight the node
            if (window.slVueTree.expandPathToNode(nodeModel, this.filterTreeDepth === 'yes' ? parseInt(this.selectedTreeDepth) : nodeModel.level)) {
              nodeModel.isHighlighted = true
              count++
            }
          } else nodeModel.isExpanded = false
        }
      }
      // execute the callback
      window.slVueTree.traverseModels(cb, window.slVueTree.getProductModels())

      if (!onlyFilterOnDepth) {
        let s
        count === 1 ? s = 'title matches' : s = 'titles match'
        this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
      } else this.showLastEvent(`The tree is displayed up to the selected level in product '${this.$store.state.load.currentProductTitle}'`, INFO)

      this.$store.state.filterText = 'Clear filter'
      this.$store.state.filterOn = true
      // window.slVueTree.showVisibility('onApplyMyFilters2', FEATURELEVEL)
    },


  },
}
