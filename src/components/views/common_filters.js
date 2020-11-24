import { utilities } from '../mixins/generic.js'

const INFO = 0
const PRODUCTLEVEL = 2

function data () {
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
    selectedTime: '1440'
  }
}

function mounted () {
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
  for (const team of Object.keys(this.$store.state.allTeams)) {
    this.teamOptions.push(team)
  }
  // remove non existing teams
  const clearedSelectedTeams = []
  for (const team of this.selectedTeams) {
    if (this.teamOptions.includes(team)) {
      clearedSelectedTeams.push(team)
    }
  }
  this.selectedTeams = clearedSelectedTeams
  // set the available state options
  let i = 0
  this.stateOptions = []
  for (const state of this.$store.state.configData.itemState) {
    this.stateOptions.push({ text: state, value: i })
    i++
  }
}

const methods = {
  onSaveFilters () {
    const myFilterSettings = {
      filterOnReqAreas: this.filterOnReqAreas,
      selectedReqAreas: this.selectedReqAreas,
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

  doFilterOnReqAreas (nm) {
    if (nm.level < PRODUCTLEVEL) return false
    return !(this.selectedReqAreas.includes(nm.data.reqarea))
  },

  doFilterOnTeams (nm) {
    if (nm.level <= PRODUCTLEVEL) return false
    return !(this.selectedTeams.includes(nm.data.team))
  },

  doFilterOnState (nm) {
    if (nm.level <= PRODUCTLEVEL) return false
    return !(this.selectedStates.includes(nm.data.state))
  },

  doFilterOnTime (nm) {
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
  }
}

export default {
	mixins: [utilities],
  data,
  mounted,
  methods
}
