<template>
  <div>
    <BModal size="lg" ref="myFiltersRef" @ok="onApplyMyFilters" title="View, set and/or save your filters">
      <BContainer align-v="true">
        <BContainer fluid>
          <BRow class="my-1">
            <BCol sm="12">
              <BFormCheckbox v-model="filterOnReqAreas">Filter on requirement area(s)</BFormCheckbox>
              <div v-if="filterOnReqAreas" class="indent20">
                <BFormGroup>
                  <BFormCheckboxGroup v-model="selectedReqAreas" :options="this.store.state.reqAreaOptions" value-field="id" text-field="title" stacked>
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
import { SEV, LEVEL, MISC } from '../../../constants.js'
import { hideNode } from '../../../common_functions.js'
import commonFilters from '../common_filters.js'
import store from '../../../store/store.js'

const methods = {
  /* Apply the AND logic to the included filters */
  onApplyMyFilters() {
    // return if a filter is already set or no filter is selected
    if (store.state.resetFilter || !this.filterOnReqAreas && !this.filterOnTeams && !this.filterOnState && !this.filterOnTime) return

    // save node display state; scan all products
    const nodesToScan = undefined
    store.commit('saveTreeView', { nodesToScan, type: 'filter' })

    let count = 0
    const unselectedNodes = []
    // create a callback for the filtering
    const cb = (nm) => {
      // skip req area definitions
      if (nm.productId === MISC.AREA_PRODUCTID) return

      // select nodeModels NOT to show; the node is shown if not excluded by any filter
      let isExcluded = false
      if (this.filterOnReqAreas) {
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
        store.state.helpersRef.showPathToNode(nm, { doHighLight_1: (nm.level > LEVEL.PRODUCT) })
        if (nm.level > LEVEL.PRODUCT) count++
      } else {
        unselectedNodes.push(nm)
      }
    }
    // execute the callback for ALL products
    store.state.helpersRef.traverseModels(cb)

    // hide unselected nodes with no selected descendants
    for (const nm of unselectedNodes) {
      if (!store.state.helpersRef.checkForFilteredDescendants(nm)) hideNode(nm)
    }
    this.showLastEvent(`${count} item ${count === 1 ? 'title matches' : 'titles match'} your filter in product '${store.state.currentProductTitle}'`, SEV.INFO)

    // create reset object
    store.state.resetFilter = {
      savedSelectedNode: this.getLastSelectedNode,
    }
  }
}

export default {
  extends: commonFilters,
  methods
}

</script>
