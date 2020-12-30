<template>
  <div>
    <b-modal
      size="lg"
      ref="myFiltersRef"
      @ok="onApplyMyFilters"
      title="View, set and/or save your filters"
    >
      <b-container align-v="true">
        <b-container fluid>
          <b-row class="my-1">
            <b-col sm="12">
              <b-form-checkbox v-model="filterOnReqAreas">Filter on requirement area(s)</b-form-checkbox>
              <div v-if="filterOnReqAreas" class="indent20">
                <b-form-group>
                  <b-form-checkbox-group
                    v-model="selectedReqAreas"
                    :options="this.$store.state.reqAreaOptions"
                    value-field="id"
                    text-field="title"
                    stacked
                  ></b-form-checkbox-group>
                </b-form-group>
              </div>
              <hr />
            </b-col>

            <b-col sm="12">
              <b-form-checkbox v-model="filterOnTeams">Filter on team(s)</b-form-checkbox>
              <div v-if="filterOnTeams" class="indent20">
                <b-form-group>
                  <b-form-checkbox-group v-model="selectedTeams" :options="teamOptions"></b-form-checkbox-group>
                </b-form-group>
              </div>
              <hr />
            </b-col>
            <b-col sm="12">
              <b-form-checkbox v-model="filterTreeDepth">Filter on tree depth</b-form-checkbox>
              <div v-if="filterTreeDepth" class="indent20">
                <b-form-group>
                  <b-form-radio v-model="selectedTreeDepth" value="3">Up to epic level</b-form-radio>
                  <b-form-radio v-model="selectedTreeDepth" value="4">Up to feature level</b-form-radio>
                  <b-form-radio v-model="selectedTreeDepth" value="5">Up to PBI level</b-form-radio>
                </b-form-group>
              </div>
              <hr />
            </b-col>

            <b-col sm="12">
              <b-form-checkbox v-model="filterOnState">Filter on PBI state</b-form-checkbox>
              <div v-if="filterOnState" class="indent20">
                <b-form-group>
                  <b-form-checkbox-group v-model="selectedStates" :options="stateOptions"></b-form-checkbox-group>
                </b-form-group>
              </div>
              <hr />
            </b-col>

            <b-col sm="12">
              <b-form-checkbox v-model="filterOnTime">Filter on changes in time</b-form-checkbox>
              <div v-if="filterOnTime" class="indent20">
                <b-form-group>
                  <b-form-radio v-model="selectedTime" value="10">Changes last 10 min.</b-form-radio>
                  <b-form-radio v-model="selectedTime" value="60">Changes last hour</b-form-radio>
                  <b-form-radio v-model="selectedTime" value="1440">Changes last 24 hours</b-form-radio>
                  <b-form-radio v-model="selectedTime" value="0">A period in days</b-form-radio>
                </b-form-group>
                <div v-if="selectedTime === '0'">
                  <b-col sm="3">
                    <label>From (inclusive):</label>
                  </b-col>
                  <b-col sm="9">
                    <b-form-input v-model="fromDate" type="date"></b-form-input>
                  </b-col>
                  <b-col sm="3">
                    <label>To:</label>
                  </b-col>
                  <b-col sm="9">
                    <b-form-input v-model="toDate" type="date"></b-form-input>
                  </b-col>
                </div>
              </div>
              <hr />
            </b-col>
            <b-col sm="12">
              <b-button class="m-1" @click="onSaveFilters()">Save this filter</b-button>
            </b-col>
          </b-row>
        </b-container>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="otherPeriodRef" @ok="filterSince(0)" title="Enter a period">
      <b-container align-v="true">
        <b-container fluid>
          <b-row class="my-1">
            <b-col sm="3">
              <label>From (inclusive):</label>
            </b-col>
            <b-col sm="9">
              <b-form-input v-model="fromDate" type="date"></b-form-input>
            </b-col>
            <b-col sm="3">
              <label>To:</label>
            </b-col>
            <b-col sm="9">
              <b-form-input v-model="toDate" type="date"></b-form-input>
            </b-col>
          </b-row>
        </b-container>
      </b-container>
    </b-modal>
  </div>
</template>

<style scoped>

.indent20 {
  padding-left: 20px;
}
</style>

<script src="./d_filters.js"></script>
