<template>
  <div class="board">
    <app-header>
      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto">
          <b-nav-text>
            Start: {{ getStartDateString }}
          </b-nav-text>
          <div class="divider"/>
      </b-navbar-nav>

      <b-navbar-nav>
        <b-nav-form>
          <b-form-select v-model="selectedSprint" :options="options"></b-form-select>
        </b-nav-form>
      </b-navbar-nav>

      <b-navbar-nav>
        <div class="divider"/>
        <b-nav-text>
          End: {{ getEndDateString }}
        </b-nav-text>
      </b-navbar-nav>
    </app-header>

    <b-container fluid>
      <div v-for="item in $store.state.stories" :key="item.id">
        <b-row>
          <b-col cols="12">
            <story-lane :idx="item.id"></story-lane>
          </b-col>
        </b-row>
      </div>
    </b-container>
  </div>
</template>

<script>
import appHeader from '../../header/header.vue'
import StoryLane from './StoryLane'
import { utilities } from '../../mixins/utilities.js'

export default {
  mixins: [utilities],

  created() {
    // load the current sprint before any sprint is selected
    const now = Date.now()
    let currentSprint = undefined
    for (let i = 0; i < this.$store.state.configData.defaultSprintCalendar.length; i++) {
      const s = this.$store.state.configData.defaultSprintCalendar[i]
      if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
        currentSprint = s
        break
      }
    }
    // preset to the current sprint
    this.selectedSprint = currentSprint
    this.$store.dispatch('loadPlanningBoard', currentSprint)
  },

  mounted() {
    // create the sprint selection options, recent first + next sprint on top
    const now = Date.now()
    let getNextSprint = true
    for (let i = this.$store.state.configData.defaultSprintCalendar.length - 1; i >= 0; i--) {
      const sprint = this.$store.state.configData.defaultSprintCalendar[i]
      if (sprint.startTimestamp > now) continue

      if (getNextSprint) {
        const nextSprint = this.$store.state.configData.defaultSprintCalendar[i + 1]
        this.options.push({ value: nextSprint, text: nextSprint.name + ' (next sprint)' })
        getNextSprint = false
      }
      this.options.push({ value: sprint, text: sprint.name })
    }
  },

  data() {
    return {
      selectedSprint: null,
      options: []
    }
  },

  watch: {
    selectedSprint: function(newVal) {
      this.$store.dispatch('loadPlanningBoard', newVal)
    }
  },

  computed: {
    getStartDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp).toString().substring(0, 33)
      return ''
    },
    getEndDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp + this.selectedSprint.sprintLength).toString().substring(0, 33)
      return ''
    }
  },

  methods: {


  },


  name: 'PlanningBoard',
  components: {
    'app-header': appHeader,
    'story-lane': StoryLane
  }
}
</script>

<style scoped>
.divider{
    width:15px;
    height:auto;
    display:inline-block;
}
</style>

