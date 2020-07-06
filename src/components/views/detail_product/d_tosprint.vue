<template>
  <b-modal size="xl" ref="assignToSprintRef" @ok="addItemToSprint" :title="contextNodeTitle">
    <div>
      <b-form-group label="Assing this item to a sprint">
        <b-form-radio-group v-model="selectedSprintId" :options="sprintOptions" stacked></b-form-radio-group>
      </b-form-group>
    </div>
  </b-modal>
</template>


<script>
import { utilities } from '../../mixins/utilities.js'
const PBILEVEL = 5
const TASKLEVEL = 6
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
      selectedSprintId: undefined
    }
  },

  methods: {

    /* From the 'Product details' view context menu a PBI or a task can be selected to be assigned to the current or next sprint */
    addItemToSprint() {
      function getSprintName(id) {
        if (id === recentSprints.currentSprint.id) {
          return recentSprints.currentSprint.name
        } else return recentSprints.nextSprint.name
      }

      const currentDoc = this.$store.state.currentDoc
      const itemLevel = currentDoc.level
      const sprintId = this.selectedSprintId
      const sprintName = getSprintName(sprintId)

      // when a PBI is selected, that PBI and it descendent tasks are assigned to the sprint
      if (itemLevel === PBILEVEL) {
        const itemIds = [currentDoc._id]
        const descendants = window.slVueTree.getDescendantsInfoOnId(currentDoc._id).descendants
        for (let d of descendants) {
          itemIds.push(d._id)
        }
        this.$store.dispatch('addSprintIds', { parentId: currentDoc.parentId, itemIds, sprintId, sprintName, createUndo: true })
      }

      if (itemLevel === TASKLEVEL) {
        // when a task is selected, the task's PBI and the task are assigned to the sprint
        const pbiNode = window.slVueTree.getNodeById(currentDoc.parentId)
        const itemIds = [pbiNode._id, currentDoc._id]
        this.$store.dispatch('addSprintIds', { parentId: pbiNode._id, itemIds, sprintId, sprintName, createUndo: true })
      }
    },
  }
}
</script>
