<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0">{{ title }}</h3>
    <hr />
    <template v-if="idx >= 0 && draggables.length === 0">
      <BButton @click="showModal = !showModal" variant="outline-secondary">Click to create a task here</BButton>
    </template>
    <div class="BCardBody">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <taskitem :storyId="storyId" :storyTitle="storyTitle" :productId="productId" :taskState="taskState" :columnName="title" :item="item"></taskitem>
        </div>
      </draggable>
    </div>
    <BModal v-model="showModal" :ok-disabled="taskTitle.length === 0" @ok="procSelected" @cancel="doCancel" title="Enter task title">
      <BFormInput v-model="taskTitle"></BFormInput>
    </BModal>
  </div>
</template>

<script>
import { LEVEL } from '../../../constants.js'
import { createId } from '../../../common_functions.js'
import { authorization, utilities } from '../../mixins/GenericMixin.js'
import { VueDraggableNext } from 'vue-draggable-next'
import TaskItem from './TaskItem.vue'
import store from '../../../store/store.js'

export default {
  mixins: [authorization, utilities],
  name: 'TaskColumn',
  props: ['productId', 'storyId', 'storyTitle', 'tasks', 'title', 'taskState', 'idx'],
  components: {
    taskitem: TaskItem,
    draggable: VueDraggableNext
  },

  data() {
    return {
      showModal: false,
      taskTitle: ''
    }
  },

  computed: {
    draggables: {
      get() {
        return this.tasks
      },
      set(tasks) {
        if (this.haveWritePermission(this.productId, LEVEL.TASK)) {
          store.dispatch('updateTasks', {
            tasks,
            taskState: this.taskState,
            idx: this.idx
          })
        } else store.state.warningText = `Sorry, your assigned role(s) [${this.getMyProductsRoles[this.productId].concat(this.getMyGenericRoles)}] for this product disallow you to execute this action`
      }
    }
  },

  methods: {
    procSelected() {
      store.dispatch('boardAddTask', { storyId: this.storyId, taskState: this.taskState, taskId: createId(), taskTitle: this.taskTitle })
    },

    doCancel() {
      this.taskTitle = ''
    }
  }
}
</script>

<style scoped>
.b-cards-margin {
  margin-left: 5px;
}

.BCardBody>* {
  min-height: 50px;
}

.b-card:last-child {
  margin-bottom: 5px;
}
</style>
