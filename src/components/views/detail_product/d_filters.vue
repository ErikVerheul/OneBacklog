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
                <BFormRadio v-model="selectedTreeDepth" value="5">Up to PBI level</BFormRadio>
              </BFormGroup>
            </div>
            <hr />
          </BCol>

          <BCol sm="12">
            <BFormCheckbox v-model="filterOnState">Filter on PBI state</BFormCheckbox>
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

<style scoped>
.indent20 {
  padding-left: 20px;
}
</style>

<script>
import { SEV, LEVEL } from '../../../constants.js'
import { collapseNode, expandNode, hideNode } from '../../../common_functions.js'
import { utilities } from '../../mixins/generic.js'
import commonFilters from '../common_filters.js'
import store from '../../../store/store.js'

const methods = {
  /* Apply the AND logic to the included filters */
  onApplyMyFilters() {
    // filter the currently selected product (the product the last selected item belongs to)
    const nodesToScan = store.state.helpersRef.getProductModelInArray(this.getLastSelectedNode.productId)
    // return if a filter is already set or no filter is selected
    if (store.state.resetFilter || !this.filterOnDependencies && !this.filterOnReqAreas && !this.filterOnTeams && !this.filterTreeDepth && !this.filterOnState && !this.filterOnTime) return

    // save node display state
    store.commit('saveTreeView', { type: 'filter', nodesToScan })

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
              store.state.helpersRef.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
              if (nm.level > LEVEL.PRODUCT) count++
            } else return
          } else {
            store.state.helpersRef.showPathToNode(nm, { doHighLight_1: nm.level > LEVEL.PRODUCT })
            if (nm.level > LEVEL.PRODUCT) count++
          }
        } else {
          unselectedNodes.push(nm)
        }
      }
    }
    // execute the callback for the current product
    store.state.helpersRef.traverseModels(cb, nodesToScan)

    if (!onlyFilterOnDepth) {
      // hide unselected nodes with no selected descendants
      for (const nm of unselectedNodes) {
        if (!store.state.helpersRef.checkForFilteredDescendants(nm)) hideNode(nm)
      }
      this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${store.state.currentProductTitle}'`, SEV.INFO)
    } else {
      this.showLastEvent(`The tree is displayed up to the ${this.getLevelText(this.selectedTreeDepth)} level in product '${store.state.currentProductTitle}'`, SEV.INFO)
    }
    // create reset object
    store.state.resetFilter = {
      nodesTouched: nodesToScan
    }
  }
}

export default {
  mixins: [utilities],
  extends: commonFilters,
  methods
}

</script>
