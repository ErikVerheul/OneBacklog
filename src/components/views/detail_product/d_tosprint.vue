<template>
  <b-modal
    size="xl"
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
var recentSprints

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
    recentSprints = this.getCurrentAndNextSprint()
  },

  mounted() {
    window.assignToSprintRef = this.$refs.assignToSprintRef
    const currentSprintTxt = `Current sprint: '${recentSprints.currentSprint.name}' started ${shortStartDate(recentSprints.currentSprint)} and ending ${shortEndDate(recentSprints.currentSprint)}`
    const nextSprintTxt = `Next sprint: '${recentSprints.nextSprint.name}' starting ${shortStartDate(recentSprints.nextSprint)} and ending ${shortEndDate(recentSprints.nextSprint)}`
    this.sprintOptions = [
      { text: currentSprintTxt, value: recentSprints.currentSprint.id },
      { text: nextSprintTxt, value: recentSprints.nextSprint.id }
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
        if (id === recentSprints.currentSprint.id) {
          return recentSprints.currentSprint.name
        } else return recentSprints.nextSprint.name
      }

      const currentId = this.$store.state.currentDoc._id
      let itemIds = []
      if (this.$store.state.currentDoc.level === FEATURELEVEL) {
        itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
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

      const sprintId = this.selectedSprint
      const sprintName = getSprintName(sprintId)
      this.$store.dispatch('addSprintIds', { parentId: currentId, itemIds, sprintId, sprintName })
      // create an entry for undoing the add-to-sprint in a last-in first-out sequence
        const entry = {
          type: 'undoAddSprintIds',
          parentId: currentId,
          sprintId,
          itemIds,
          sprintName
        }
        this.$store.state.changeHistory.unshift(entry)
    },
  }
}
</script>
