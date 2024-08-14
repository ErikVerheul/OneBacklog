<template>
  <BModal size="xl" ref="assignToSprintRef" @ok="addItemToSprint" :title="contextNodeTitle">
    <div>
      <BFormGroup label="Assing this item to a sprint">
        <BFormRadioGroup v-model="selectedSprintId" :options="sprintOptions" stacked />
      </BFormGroup>
    </div>
  </BModal>
</template>

<script>
import { LEVEL } from '../../../constants.js'
import { getSprintNameById } from '../../../common_functions.js'
import { utilities } from '../../mixins/generic.js'
import store from '../../../store/store.js'

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
  },

  data() {
    return {
      contextNodeTitle: store.state.currentDoc.title,
      selectedSprintId: undefined
    }
  },

  computed: {
    sprintOptions() {
      const activeSprints = this.getActiveSprints
      const currentSprintTxt = `Current sprint: '${activeSprints.currentSprint.name}' started ${shortStartDate(activeSprints.currentSprint)} and ending ${shortEndDate(activeSprints.currentSprint)}`
      const nextSprintTxt = `Next sprint: '${activeSprints.nextSprint.name}' starting ${shortStartDate(activeSprints.nextSprint)} and ending ${shortEndDate(activeSprints.nextSprint)}`
      return [
        { text: currentSprintTxt, value: activeSprints.currentSprint.id },
        { text: nextSprintTxt, value: activeSprints.nextSprint.id }
      ]
    }
  },

  methods: {
    /*
    * From the 'Product details' view context menu a user story or a task can be selected to be assigned to the current or next sprint
    * Only items that are not in a sprint already can be assigned to a sprint.
    */
    addItemToSprint() {
      const currentDoc = store.state.currentDoc
      if (currentDoc.sprintId) return

      const itemLevel = currentDoc.level
      const sprintId = this.selectedSprintId
      const sprintName = getSprintNameById(sprintId, store.state.myCurrentSprintCalendar)

      // when a user story is selected, that user story and it descendant tasks that have no sprint assigned yet, are assigned to the sprint
      if (itemLevel === LEVEL.PBI) {
        const itemIds = [currentDoc._id]
        const descendants = store.state.helpersRef.getDescendantsInfoOnId(currentDoc._id).descendants
        for (const d of descendants) {
          if (!d.data.sprintId) itemIds.push(d._id)
        }
        store.dispatch('addSprintIds', { parentId: currentDoc.parentId, itemIds, sprintId, sprintName })
      }

      if (itemLevel === LEVEL.TASK) {
        // when a task is selected, the task's user story and the task are assigned to the sprint
        const itemIds = [currentDoc._id]
        const pbiNode = store.state.helpersRef.getNodeById(currentDoc.parentId)
        if (!pbiNode.data.sprintId) {
          // if no other sprint is assigned, also assign the task's user story to the sprint
          itemIds.push(pbiNode._id)
        }
        store.dispatch('addSprintIds', { parentId: pbiNode._id, itemIds, sprintId, sprintName })
      }
    }
  }
}
</script>
