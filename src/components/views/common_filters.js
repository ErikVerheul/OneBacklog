import { SEV, LEVEL } from '../../constants.js'
import { utilities } from '../mixins/generic.js'
import store from '../../store/store.js'

function data() {
	// these values are used if no filter settings were saved
	return {
		filterOnDependencies: false,
		filterOnReqAreas: false,
		selectedReqAreas: [],
		filterOnTeams: false,
		teamOptions: [],
		selectedTeams: [],
		filterTreeDepth: false,
		selectedTreeDepth: LEVEL.EPIC,
		filterOnState: false,
		stateOptions: [],
		selectedStates: [],
		filterOnTime: false,
		fromDate: undefined,
		toDate: undefined,
		selectedTime: '1440',
	}
}

function mounted() {
	// init the filter settings
	const myFilterSettings = store.state.userData.myFilterSettings
	if (myFilterSettings) {
		this.filterOnDependencies = myFilterSettings.filterOnDependencies || false
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
	for (const team of Object.keys(store.state.allTeams)) {
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
	// set the available state options; 0 is not in use
	let i = 0
	this.stateOptions = []
	for (const state of store.state.configData.itemState) {
		if (i > 0) this.stateOptions.push({ text: state, value: i })
		i++
	}
}

const methods = {
	onSaveFilters() {
		const myFilterSettings = {
			filterOnDependencies: this.filterOnDependencies,
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
			selectedTime: this.selectedTime,
		}
		store.dispatch('saveMyFilterSettingsAction', myFilterSettings)
		this.showLastEvent('Saving the filter settings', SEV.INFO)
	},

	doFilterOnDependencies(nm) {
		return (nm.dependencies && nm.dependencies.length > 0) || (nm.conditionalFor && nm.conditionalFor.length > 0)
	},

	doFilterOnReqAreas(nm) {
		return this.selectedReqAreas.includes(nm.data.reqarea)
	},

	doFilterOnTeams(nm) {
		return this.selectedTeams.includes(nm.data.team)
	},

	doFilterOnState(nm) {
		return this.selectedStates.includes(nm.data.state)
	},

	doFilterOnTime(nm) {
		function lastAnyChange(nm) {
			const allChanges = [
				nm.data.lastPositionChange,
				nm.data.lastStateChange,
				nm.data.lastContentChange,
				nm.data.lastCommentAddition,
				nm.data.lastAttachmentAddition,
				nm.data.lastAttachmentRemoval,
				nm.data.lastOtherChange,
			]
			// sort descending
			const sortedChanges = allChanges.sort((a, b) => b - a)
			// element 0 is most recent (highest value)
			return sortedChanges[0]
		}

		if (this.selectedTime === '0') {
			if (this.fromDate && this.toDate) {
				// process a period from fromDate(inclusive) to toDate(exclusive); date format is yyyy-mm-dd
				const fromMilis = Date.parse(this.fromDate)
				const endOfToMilis = Date.parse(this.toDate) + 24 * 60 * 60000
				return lastAnyChange(nm) >= fromMilis && lastAnyChange(nm) < endOfToMilis
			}
		} else {
			const sinceMilis = parseInt(this.selectedTime) * 60000
			return Date.now() - lastAnyChange(nm) < sinceMilis
		}
	},
}

export default {
	mixins: [utilities],
	data,
	mounted,
	methods,
}
