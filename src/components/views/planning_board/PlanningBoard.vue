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
          <b-form-select v-model="selectedSprint" :options="sprintTitleOptions"></b-form-select>
        </b-nav-form>
      </b-navbar-nav>

      <b-navbar-nav>
        <div class="divider" />
        <b-nav-text>End: {{ getEndDateString }}</b-nav-text>
      </b-navbar-nav>
    </app-header>
    <b-container fluid>
      <b-row v-if="!showWarning" class="title-bar">
        <b-col cols="5">
          <h5>Welcome {{ userData.user}} from team '{{ userData.myTeam }}'</h5>
        </b-col>
        <b-col cols="4">
          <h5 v-if="getPersonHours > 0">{{ getStoryPoints }} story points and {{ getPersonHours }} hours for spikes in this sprint</h5>
          <h5 v-else>{{ getStoryPoints }} story points in this sprint</h5>
        </b-col>
        <b-col cols="2">
          <h5>points done: {{ getStoryPointsDone }}</h5>
        </b-col>
        <b-col cols="1">
          <span class="square" v-bind:style="{'background-color': squareColor}">{{ squareText }}</span>
        </b-col>
      </b-row>
      <b-row v-else class="warning-bar">
        <b-col cols="11">
          <h5>{{ $store.state.warningText }}</h5>
        </b-col>
        <b-col cols="1">
          <b-button @click="clearWarning()" size="sm">Dismiss</b-button>
        </b-col>
      </b-row>
      <div v-for="story in $store.state.planningboard.stories" :key="story.idx">
        <b-row>
          <b-col cols="12">
            <story-lane :idx="story.idx"></story-lane>
          </b-col>
        </b-row>
      </div>
    </b-container>
    <b-modal v-if="currentSprintLoaded && askForImport() && unfinishedWork" @ok="procSelected" v-model="currentSprintLoaded" title="Import unfinished tasks from previous sprints?">
      <b-list-group>
        <b-list-group-item button :active="contextOptionSelected === MOVE_TASKS" variant="dark" @click="prepSelected(MOVE_TASKS)">Yes, please</b-list-group-item>
        <b-list-group-item button :active="contextOptionSelected === NO_NOT_YET" variant="dark" @click="prepSelected(NO_NOT_YET)">No, not yet</b-list-group-item>
        <b-list-group-item button :active="contextOptionSelected === NO_STOP_ASKING" variant="danger" @click="prepSelected(NO_STOP_ASKING)">No, and do not ask again</b-list-group-item>
      </b-list-group>
      <p class="message">{{ showInfo() }}</p>
      <div class="d-block text-center">
        <b-button v-if="contextOptionSelected !== undefined" v-show="!showAssistance" size="sm" variant="outline-primary" @click="showAssistance='true'">Need assistance?</b-button>
        <div v-if="showAssistance" class="d-block text-left border" v-html="assistanceText"></div>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { utilities } from '../../mixins/generic.js'
import AppHeader from '../../header/header.vue'
import StoryLane from './StoryLane.vue'

export default {
  mixins: [utilities],

  beforeCreate() {
    this.$store.state.currentView = 'planningBoard'
  },

  created() {
    this.MOVE_TASKS = 0
    this.NO_NOT_YET = 1
    this.NO_STOP_ASKING = 2

    if (this.$store.state.loadedSprintId) {
      // preset the selected sprint to the last loaded sprint
      for (const s of this.$store.state.myCurrentSprintCalendar) {
        if (s.id === this.$store.state.loadedSprintId) {
          this.selectedSprint = s
          break
        }
      }
    }
    if (!this.selectedSprint) {
      // preset the selected sprint to the current sprint
      this.selectedSprint = this.getActiveSprints.currentSprint
    }

    // reload when the user changes team
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === 'updateTeam') {
        // select and load the current sprint of the newly selected team calendar
        this.selectedSprint = this.getActiveSprints.currentSprint
        this.$store.dispatch('loadPlanningBoard', { sprintId: this.selectedSprint.id, team: state.userData.myTeam })
      }
    })
  },

  /* Prevent accidental reloading of this page */
  beforeMount() {
    window.addEventListener("beforeunload", this.preventNav)
  },

  beforeDestroy() {
    window.removeEventListener("beforeunload", this.preventNav)
    this.unsubscribe()
  },

  data() {
    return {
      contextOptionSelected: undefined,
      showAssistance: false,
      // ToDo: assistanceText is never used, remove?
      assistanceText: '',
      selectedSprint: null,
      currentSprintLoaded: false
    }
  },

  watch: {
    // initially load the current sprint and reload when the user selects another sprint
    selectedSprint: function (newVal) {
      this.currentSprintLoaded = newVal.id === this.getActiveSprints.currentSprint.id
      this.$store.dispatch('loadPlanningBoard', { sprintId: newVal.id, team: this.userData.myTeam })
    }
  },

  computed: {
    ...mapGetters([
      'getPersonHours',
      'getStoryPoints',
      'getStoryPointsDone',
      'myTeam'
    ]),
    ...mapState(['userData']),

    showWarning() {
      return this.$store.state.warningText !== ''
    },

    unfinishedWork() {
      return this.$store.state.planningboard.itemIdsToImport.length > 0
    },

    getStartDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp).toString().substring(0, 33)
      return ''
    },

    getEndDateString() {
      if (this.selectedSprint) return new Date(this.selectedSprint.startTimestamp + this.selectedSprint.sprintLength).toString().substring(0, 33)
      return ''
    },

    /* Return date/time dependant sprint selection options, recent first + next sprint on top*/
    sprintTitleOptions() {
      const now = this.$store.state.currentTime
      const calendar = this.$store.state.myCurrentSprintCalendar
      const options = []
      let getNextSprint = true
      let getCurrSprint = true
      for (let i = calendar.length - 1; i >= 0; i--) {
        const sprint = calendar[i]
        if (sprint.startTimestamp > now) continue

        if (getNextSprint) {
          const nextSprint = calendar[i + 1]
          options.push({ value: nextSprint, text: nextSprint.name + ' (next sprint)' })
          getNextSprint = false
        }
        if (getCurrSprint) {
          const currSprint = sprint
          options.push({ value: currSprint, text: currSprint.name + ' (current sprint)' })
          getCurrSprint = false
          continue
        }
        options.push({ value: sprint, text: sprint.name })
      }
      return options
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

  methods: {
    preventNav(event) {
      event.preventDefault()
      event.returnValue = ""
    },

    clearWarning() {
      this.$store.state.warningText = ''
    },

    askForImport() {
      if (!this.userData.doNotAskForImport) return true
      return !this.userData.doNotAskForImport.includes(this.getActiveSprints.currentSprint.id)
    },

    showInfo() {
      return `Found ${this.$store.state.planningboard.itemIdsToImport.length} unfinished tasks in ${this.$store.state.planningboard.itemIdsToImport.length} items to import`
    },

    prepSelected(idx) {
      this.showAssistance = false
      this.contextOptionSelected = idx
      switch (this.contextOptionSelected) {
        case this.MOVE_TASKS:
          this.assistanceText = undefined
          break
        case this.NO_NOT_YET:
          this.assistanceText = undefined
          break
        case this.NO_STOP_ASKING:
          this.assistanceText = undefined
          break
      }
    },

    procSelected() {
      this.showAssistance = false
      switch (this.contextOptionSelected) {
        case this.MOVE_TASKS:
          this.$store.dispatch('importInSprint', this.getActiveSprints.currentSprint.id)
          break
        case this.NO_NOT_YET:
          // do nothing
          break
        case this.NO_STOP_ASKING:
          this.$store.dispatch('registerMyNoSprintImport', this.getActiveSprints.currentSprint.id)
          break
      }
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
.message {
  margin: 10px;
}
.divider {
  width: 15px;
  height: auto;
  display: inline-block;
}

.title-bar {
  background-color: #408fae;
  padding-top: 4px;
}

.warning-bar {
  background-color: orange;
  padding-top: 4px;
  padding-bottom: 4px;
}

.square {
  float: right;
  padding: 5px;
  margin-bottom: 4px;
}
</style>
