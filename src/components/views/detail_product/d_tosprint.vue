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
const WARNING = 1
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

  created() {
    sprints = this.getCurrentAndNextSprint()
  },

  mounted() {
    window.assignToSprintRef = this.$refs.assignToSprintRef
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
        if (itemIds.length === 0) {
          this.showLastEvent(`This feature has no PBI's to add to the sprint`, WARNING)
          return
          }
      }
      if (this.$store.state.currentDoc.level === PBILEVEL) {
        itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
      }
      // show children nodes
      window.slVueTree.getNodeById(currentId).isExpanded = true
      const sprintName = getSprintName(this.selectedSprint)
      this.$store.dispatch('addSprintIds', { itemIds, sprintId: this.selectedSprint, sprintName })
      // create an entry for undoing the add-to-sprint in a last-in first-out sequence
        const entry = {
          type: 'undoAddSprintIds',
          itemIds,
          sprintName
        }
        this.$store.state.changeHistory.unshift(entry)
    },
  }
}
</script>
