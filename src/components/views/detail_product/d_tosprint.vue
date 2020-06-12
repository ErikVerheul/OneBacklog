<template>
  <b-modal size="xl" ref="assignToSprintRef" @ok="addItemToSprint" :title="contextNodeTitle">
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
const TASKLEVEL = 6
const REMOVED = 0
const ON_HOLD = 1
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
    * - When a feature is selected all its descendants (PBI's and tasks) are assigned
    * - When a PBI is selected, that PBI and it descendent tasks are assigned
    * - When a task is selected only that task is assigned to the sprint
    * - Items with state OnHold or Removed cannot be assigned to a sprint
    */
    addItemToSprint() {
      function getSprintName(id) {
        if (id === recentSprints.currentSprint.id) {
          return recentSprints.currentSprint.name
        } else return recentSprints.nextSprint.name
      }

      function stateOk(state) {
        return state !== ON_HOLD && state !== REMOVED
      }

      const currentDoc = this.$store.state.currentDoc
      if (stateOk(currentDoc.state)) {
        const docLevel = this.$store.state.currentDoc.level
        let itemIds = []

        if (docLevel === FEATURELEVEL || docLevel === PBILEVEL) {
          itemIds = [currentDoc._id]
          const descendants = window.slVueTree.getDescendantsInfoOnId(currentDoc._id).descendants
          for (let d of descendants) {
            if (stateOk(d.data.state)) itemIds.push(d._id)
          }
        }

        if (docLevel === TASKLEVEL) {
          itemIds = [currentDoc._id]
        }
        const sprintId = this.selectedSprint
        const sprintName = getSprintName(sprintId)
        this.$store.dispatch('addSprintIds', { parentId: currentDoc._id, itemIds, sprintId, sprintName, createUndo: true })
      }
    },
  }
}
</script>
