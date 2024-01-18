<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <BNavbarNav class="ml-auto">
        <BNavText>Start: {{ getStartDateString }}</BNavText>
        <div class="divider" />
      </BNavbarNav>

      <BNavbarNav>
        <BNavForm>
          <BFormSelect v-model="selectedSprint" :options="sprintTitleOptions"></BFormSelect>
        </BNavForm>
      </BNavbarNav>

      <BNavbarNav>
        <div class="divider" />
        <BNavText>End: {{ getEndDateString }}</BNavText>
      </BNavbarNav>
    </app-header>
    <BContainer fluid>
      <BRow v-if="!showWarning" class="title-bar">
        <BCol cols="5">
          <h5>Welcome {{ userData.user }} from team '{{ userData.myTeam }}'</h5>
        </BCol>
        <BCol cols="4">
          <h5 v-if="getPersonHours > 0">{{ getStoryPoints }} story points and {{ getPersonHours }} hours for spikes in this sprint</h5>
          <h5 v-else>{{ getStoryPoints }} story points in this sprint</h5>
        </BCol>
        <BCol cols="2">
          <h5>points done: {{ getStoryPointsDone }}</h5>
        </BCol>
        <BCol cols="1">
          <span class="square" v-bind:style="{ 'background-color': squareColor }">{{ squareText }}</span>
        </BCol>
      </BRow>
      <BRow v-else class="warning-bar">
        <BCol cols="11">
          <h5>{{ store.state.warningText }}</h5>
        </BCol>
        <BCol cols="1">
          <BButton @click="clearWarning()" size="sm">Dismiss</BButton>
        </BCol>
      </BRow>
      <div v-for="story in store.state.planningboard.stories" :key="story.idx">
        <BRow>
          <BCol cols="12">
            <story-lane :idx="story.idx"></story-lane>
          </BCol>
        </BRow>
      </div>
    </BContainer>
    <template v-if="currentSprintLoaded && askForImport() && unfinishedWork">
      <BModal @cancel="$router.back()" @close="$router.back()" @ok="procSelected" v-model="currentSprintLoaded" title="Import unfinished tasks from previous sprints?">
        <BListGroup>
          <BListGroupItem button :active="contextOptionSelected === MOVE_TASKS" variant="dark" @click="prepSelected(MOVE_TASKS)">Yes, please</BListGroupItem>
          <BListGroupItem button :active="contextOptionSelected === NO_NOT_YET" variant="dark" @click="prepSelected(NO_NOT_YET)">No, not yet</BListGroupItem>
          <BListGroupItem button :active="contextOptionSelected === NO_STOP_ASKING" variant="danger" @click="prepSelected(NO_STOP_ASKING)">No, and do not ask again</BListGroupItem>
        </BListGroup>
        <p class="message-head">{{ showInfo() }}</p>
      </BModal>
    </template>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { utilities } from '../../mixins/generic.js'
import AppHeader from '../../header/header.vue'
import StoryLane from './StoryLane.vue'
import store from '../../../store/store.js'

export default {
  mixins: [utilities],

  beforeCreate() {
    store.state.currentView = 'planningBoard'
  },

  created() {
    this.MOVE_TASKS = 0
    this.NO_NOT_YET = 1
    this.NO_STOP_ASKING = 2

    if (store.state.loadedSprintId) {
      // preset the selected sprint to the last loaded sprint
      for (const s of store.state.myCurrentSprintCalendar) {
        if (s.id === store.state.loadedSprintId) {
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
    this.unsubscribe = store.subscribe((mutation, state) => {
      if (mutation.type === 'updateTeam') {
        // select and load the current sprint of the newly selected team calendar
        this.selectedSprint = this.getActiveSprints.currentSprint
        store.dispatch('loadPlanningBoard', { sprintId: this.selectedSprint.id, team: state.userData.myTeam })
      }
    })
  },

  data() {
    return {
      contextOptionSelected: undefined,
      selectedSprint: null,
      currentSprintLoaded: false
    }
  },

  watch: {
    // initially load the current sprint and reload when the user selects another sprint
    selectedSprint: function (newVal) {
      this.currentSprintLoaded = newVal.id === this.getActiveSprints.currentSprint.id
      store.dispatch('loadPlanningBoard', { sprintId: newVal.id, team: this.userData.myTeam })
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
      return store.state.warningText !== ''
    },

    unfinishedWork() {
      return store.state.planningboard.itemIdsToImport.length > 0
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
      const now = Date.now()
      const calendar = store.state.myCurrentSprintCalendar
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
      if (store.state.online) {
        return 'sync'
      } else return 'offline'
    },

    squareColor() {
      return store.state.online ? store.state.eventSyncColor : '#ff0000'
    }
  },

  methods: {
    clearWarning() {
      store.state.warningText = ''
    },

    askForImport() {
      if (!this.userData.doNotAskForImport) return true
      return !this.userData.doNotAskForImport.includes(this.getActiveSprints.currentSprint.id)
    },

    showInfo() {
      return `Found ${store.state.planningboard.itemIdsToImport.length} unfinished tasks in ${store.state.planningboard.itemIdsToImport.length} items to import`
    },

    prepSelected(idx) {
      this.contextOptionSelected = idx
    },

    procSelected() {
      switch (this.contextOptionSelected) {
        case this.MOVE_TASKS:
          store.dispatch('importInSprint', this.getActiveSprints.currentSprint.id)
          break
        case this.NO_NOT_YET:
          // do nothing
          break
        case this.NO_STOP_ASKING:
          store.dispatch('registerMyNoSprintImport', this.getActiveSprints.currentSprint.id)
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

<style lang="scss" scoped>
.message-head {
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
