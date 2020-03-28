<template>
  <b-modal
    size="lg"
    ref="assignToSprintRef"
    @ok="sprintSelected"
    :title="contextNodeTitle"
  >
    <div>
      <b-form-group label="Assing this item to a sprint">
        <b-form-radio-group v-model="selectedSprint" :options="sprintOptions" stacked></b-form-radio-group>
      </b-form-group>
    </div>
  </b-modal>
</template>


<script>
import { utilities } from '../../mixins/utilities.js'
const FEATURELEVEL = 4
const PBILEVEL = 5
var sprints

function shortStartDate(sprint) {
  const date = new Date(sprint.startTimestamp)
  const shortDateStr = date.toUTCString()
  return shortDateStr
}

function shortEndDate(sprint) {
  const date = new Date(sprint.startTimestamp + sprint.sprintLength)
  const shortDateStr = date.toUTCString()
  return shortDateStr
}

export default {
  mixins: [utilities],

  mounted() {
    window.assignToSprintRef = this.$refs.assignToSprintRef
    sprints = this.getCurrentAndNextSprint()
    const currentSprintTxt = sprints.currentSprint.name + ' started ' + shortStartDate(sprints.currentSprint) + ' and ending ' + shortEndDate(sprints.currentSprint)
    const nextSprintTxt = sprints.nextSprint.name + ' starting ' + shortStartDate(sprints.nextSprint) + ' and ending ' + shortEndDate(sprints.nextSprint)
    this.sprintOptions = [
      { text: currentSprintTxt, value: sprints.currentSprint.id },
      { text: nextSprintTxt, value: sprints.nextSprint.id }
    ]
  },

  data() {
    return {
      contextNodeTitle: this.$store.state.currentDoc.title,
      sprintOptions: [],
      selectedSprint: undefined
    }
  },

  methods: {
    /*
    * From the 'Product details' view context menu features and PBI's can be selected to be assigned to the current or next sprint:
    * - When a feature is selected all its descendents (PBI's and tasks) are assigned
    * - When a PBI is selected, that PBI and it descendent tasks are assigned
    */
    sprintSelected() {
      function getSprintName(id) {
        if (id === sprints.currentSprint.id) {
          return sprints.currentSprint.name
        } else return sprints.nextSprint.name
      }

      const currentId = this.$store.state.currentDoc._id
      let itemIds = []
      if (this.$store.state.currentDoc.level === FEATURELEVEL) {
        itemIds = window.slVueTree.getDescendantsInfoOnId(currentId).ids
      }
      if (this.$store.state.currentDoc.level === PBILEVEL) {
        itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
      }
      this.$store.state.currentDoc.sprintId = this.selectedSprint
      this.$store.state.nodeSelected.sprintId = this.selectedSprint
      this.$store.dispatch('addSprintIds', { itemIds, sprintId: this.selectedSprint, sprintName: getSprintName(this.selectedSprint) })
    },
  }
}
</script>
