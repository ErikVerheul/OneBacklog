<template>
  <div>
    <BModal
      size="lg"
      ref="myFiltersRef"
      @ok="onApplyMyFilters"
      title="View, set and/or save your filters"
    >
      <BContainer align-v="true">
        <BContainer fluid>
          <BRow class="my-1">
            <BCol sm="12">
              <BFormCheckbox v-model="filterOnReqAreas">Filter on requirement area(s)</BFormCheckbox>
              <div v-if="filterOnReqAreas" class="indent20">
                <BFormGroup>
                  <BFormCheckboxGroup
                    v-model="selectedReqAreas"
                    :options="this.store.state.reqAreaOptions"
                    value-field="id"
                    text-field="title"
                    stacked
                  ></BFormCheckboxGroup>
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

<script src="./c_filters.js"></script>
