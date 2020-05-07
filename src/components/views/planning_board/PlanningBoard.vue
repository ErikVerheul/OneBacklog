<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto">
        <b-nav-text>Start: {{ getStartDateString }}</b-nav-text>
        <div class="divider" />
      </b-navbar-nav>

      <b-navbar-nav>
        <b-nav-form>
          <b-form-select v-model="selectedSprint" :options="options"></b-form-select>
        </b-nav-form>
      </b-navbar-nav>

      <b-navbar-nav>
        <div class="divider" />
        <b-nav-text>End: {{ getEndDateString }}</b-nav-text>
      </b-navbar-nav>
    </app-header>
    <b-container fluid>
      <b-row class="title-bar">
        <b-col cols="5">
          <h5>team '{{ $store.state.userData.myTeam }}'</h5>
        </b-col>
        <b-col cols="4">
          <h5>{{ $store.getters.getStoryPoints }} story points in this sprint</h5>
        </b-col>
        <b-col cols="2">
          <h5>points done: {{ $store.getters.getStoryPointsDone }}</h5>
        </b-col>
        <b-col cols="1">
          <span class="square" v-bind:style="{'background-color': squareColor}">{{ squareText }}</span>
        </b-col>
      </b-row>
    </b-container>
    <b-container fluid>
      <div v-for="story in $store.state.stories" :key="story.idx">
        <b-row>
          <b-col cols="12">
            <story-lane :idx="story.idx"></story-lane>
          </b-col>
        </b-row>
      </div>
    </b-container>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import AppHeader from '../../header/header.vue'
import StoryLane from './StoryLane'
import { utilities } from '../../mixins/utilities.js'

export default {
  mixins: [utilities],

  beforeCreate() {
    this.$store.state.currentView = 'planningBoard'
  },

  created() {
    if (this.$store.state.loadedSprintId) {
      // load the last loaded sprint again
      for (let s of this.$store.state.configData.defaultSprintCalendar) {
        if (s.id === this.$store.state.loadedSprintId) {
          this.selectedSprint = s
          break
        }
      }
    }
    if (!this.selectedSprint) {
      // load the current sprint
      const now = Date.now()
      let currentSprint = undefined
      for (let i = 0; i < this.$store.state.configData.defaultSprintCalendar.length; i++) {
        const s = this.$store.state.configData.defaultSprintCalendar[i]
        if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
          currentSprint = s
          break
        }
      }
      this.selectedSprint = currentSprint
    }
    // reload when the user changes team
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === 'updateTeam') {
        this.$store.dispatch('loadPlanningBoard', { sprintId: this.selectedSprint.id, team: state.userData.myTeam })
      }
    });
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

  beforeDestroy() {
    this.unsubscribe();
  },

  data() {
    return {
      selectedSprint: null,
      options: [],
      selectedTeam: this.$store.state.userData.myTeam
    }
  },

  watch: {
    // initially load the current sprint and reload when the user selects another sprint
    selectedSprint: function (newVal) {
      this.$store.dispatch('loadPlanningBoard', { sprintId: newVal.id, team: this.$store.state.userData.myTeam })
    }
  },

  computed: {
    ...mapState(['userData']),

    getStartDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp).toString().substring(0, 33)
      return ''
    },

    getEndDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp + this.selectedSprint.sprintLength).toString().substring(0, 33)
      return ''
    },

    squareText() {
      if (this.$store.state.online) {
        return 'sync'
      } else return 'offline'
    },

    squareColor() {
      return this.$store.state.online ? this.$store.state.eventSyncColor : '#ff0000'
    }
  },

  name: 'PlanningBoard',
  components: {
    'app-header': AppHeader,
    'story-lane': StoryLane
  }
}
</script>

<style scoped>
.divider {
  width: 15px;
  height: auto;
  display: inline-block;
}

.title-bar {
  background-color: #408fae;
  padding-top: 4px;
}

.square {
  float: right;
  padding: 5px;
  margin-bottom: 4px;
}
</style>

