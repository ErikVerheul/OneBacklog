<template>
  <div>
    <BModal size="lg" ref="myFiltersRef" @ok="onApplyMyFilters" title="View, set and/or save your filters">
      <BContainer fluid align-v="true">
        <BRow class="my-1">
          <BCol sm="12" v-if="store.state.userData.myOptions.proUser === 'true'">
            <BFormCheckbox v-model="filterOnDependencies">Filter on items with dependencies</BFormCheckbox>
            <hr />
          </BCol>

          <BCol sm="12" v-if="store.state.userData.myOptions.proUser === 'true'">
            <BFormCheckbox v-model="filterOnReqAreas">Filter on requirement area(s)</BFormCheckbox>
            <div v-if="filterOnReqAreas" class="indent20">
              <BFormGroup>
                <BFormCheckboxGroup v-model="selectedReqAreas" :options="store.state.reqAreaOptions" value-field="id" text-field="title" stacked>
                </BFormCheckboxGroup>
              </BFormGroup>
            </div>
            <hr />
          </BCol>

          <BCol sm="12">
            <BFormCheckbox v-model="filterOnTeams">Filter on team(s)</BFormCheckbox>
            <div v-if="filterOnTeams" class="indent20">
              <BFormGroup>
                <BFormCheckboxGroup v-model="selectedTeams" :options="teamOptions"></BFormCheckboxGroup>
              </BFormGroup>
            </div>
            <hr />
          </BCol>
          <BCol sm="12">
            <BFormCheckbox v-model="filterTreeDepth">Filter on tree depth</BFormCheckbox>
            <div v-if="filterTreeDepth" class="indent20">
              <BFormGroup>
                <BFormRadio v-model="selectedTreeDepth" value="3">Up to epic level</BFormRadio>
                <BFormRadio v-model="selectedTreeDepth" value="4">Up to feature level</BFormRadio>
                <BFormRadio v-model="selectedTreeDepth" value="5">Up to user story level</BFormRadio>
              </BFormGroup>
            </div>
            <hr />
          </BCol>

          <BCol sm="12">
            <BFormCheckbox v-model="filterOnState">Filter on user story state</BFormCheckbox>
            <div v-if="filterOnState" class="indent20">
              <BFormGroup>
                <BFormCheckboxGroup v-model="selectedStates" :options="stateOptions"></BFormCheckboxGroup>
              </BFormGroup>
            </div>
            <hr />
          </BCol>

          <BCol sm="12">
            <BFormCheckbox v-model="filterOnTime">Filter on changes in time</BFormCheckbox>
            <div v-if="filterOnTime" class="indent20">
              <BFormGroup>
                <BFormRadio v-model="selectedTime" value="10">Changes last 10 min.</BFormRadio>
                <BFormRadio v-model="selectedTime" value="60">Changes last hour</BFormRadio>
                <BFormRadio v-model="selectedTime" value="1440">Changes last 24 hours</BFormRadio>
                <BFormRadio v-model="selectedTime" value="0">A period in days</BFormRadio>
              </BFormGroup>
              <div v-if="selectedTime === '0'">
                <BCol sm="3">
                  <label>From (inclusive):</label>
                </BCol>
                <BCol sm="9">
                  <BFormInput v-model="fromDate" type="date"></BFormInput>
                </BCol>
                <BCol sm="3">
                  <label>To:</label>
                </BCol>
                <BCol sm="9">
                  <BFormInput v-model="toDate" type="date"></BFormInput>
                </BCol>
              </div>
            </div>
            <hr />
          </BCol>
          <BCol sm="12">
            <BButton class="m-1" @click="onSaveFilters()">Save this filter</BButton>
          </BCol>
        </BRow>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="otherPeriodRef" @ok="filterSince(0)" title="Enter a period">
      <BContainer align-v="true">
        <BContainer fluid>
          <BRow class="my-1">
            <BCol sm="3">
              <label>From (inclusive):</label>
            </BCol>
            <BCol sm="9">
              <BFormInput v-model="fromDate" type="date"></BFormInput>
            </BCol>
            <BCol sm="3">
              <label>To:</label>
            </BCol>
            <BCol sm="9">
              <BFormInput v-model="toDate" type="date"></BFormInput>
            </BCol>
          </BRow>
        </BContainer>
      </BContainer>
    </BModal>
  </div>
</template>

<style lang="scss" scoped>
  .indent20 {
    padding-left: 20px;
  }
</style>

<script>
  import { LEVEL, SEV } from '../../../constants.js'
  import { collapseNode, expandNode, hideNode, isInPath } from '../../../common_functions.js'
  import { utilities } from '../../mixins/GenericMixin.js'
  import store from '../../../store/store.js'

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

    /* Apply the AND logic to the included filters */
    onApplyMyFilters() {
      // filter the currently selected product (the product the last selected item belongs to)
      const nodesToScan = store.state.helpersRef.getProductModelInArray(this.getSelectedNode.productId)
      // return if a filter is already set or no filter is selected
      if (store.getters.isResetFilterSet || !this.filterOnDependencies && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterTreeDepth && !this.filterOnState && !this.filterOnTime) return

      // save node display state
      store.dispatch('saveTreeViewState', { type: 'filter', nodesToScan })

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
                store.state.helpersRef.showPathToNode(nm, { doHighLight_1: true })
                count++
              } else return
            } else {
              store.state.helpersRef.showPathToNode(nm, { doHighLight_1: true })
              count++
            }
          } else {
            unselectedNodes.push(nm)
          }
        }
      }
      // execute the callback for the current product
      store.state.helpersRef.traverseModels(cb, nodesToScan)

      if (!onlyFilterOnDepth) {
        // hide unselected nodes with no selected descendants; do not hide the currently selected node
        for (const nm of unselectedNodes) {
          if (!isInPath(nm.path, this.getSelectedNode.path) && !store.state.helpersRef.checkForFilteredDescendants(nm)) hideNode(nm)
        }
        this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${store.state.currentProductTitle}'`, SEV.INFO)
      } else {
        this.showLastEvent(`The tree is displayed up to the ${this.getLevelText(this.selectedTreeDepth)} level in product '${store.state.currentProductTitle}'`, SEV.INFO)
      }
      // create reset object
      store.state.filterSelectSearch.resetFilter = {
        nodesTouched: nodesToScan
      }
    }
  }

  export default {
    mounted,
    data,
    mixins: [utilities],
    methods
  }

</script>
