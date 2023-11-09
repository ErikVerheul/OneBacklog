<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0">{{ title }}</h3>
    <hr />
    <template v-if="idx >= 0 && draggables.length === 0">
      <b-button @click="showModal = !showModal" block squared variant="outline-secondary">Click to create a task
        here</b-button>
    </template>
    <div class="b-card-body">
      <!-- draggable not fit for compat mde: see https://github.com/SortableJS/vue.draggable.next/pull/152 
      See also https://github.com/SortableJS/vue.draggable.next/issues/57-->
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <taskitem
            :storyId="storyId"
            :storyTitle="storyTitle"
            :productId="productId"
            :taskState="taskState"
            :columnName="title"
            :item="item"
          ></taskitem>
        </div>
      </draggable>
      <!-- example from https://github.com/SortableJS/vue.draggable.next/blob/master/example/components/nested/nested-test.vue
        <draggable v-model="list" group="people" tag="div" @start="drag = true" @end="drag = false" item-key="id">
        <template #item="{ element }">
          <div>
            {{ element.name }}
          </div>
          <taskitem :taskitem="element" :storyId="storyId" :storyTitle="storyTitle" :productId="productId" :taskState="taskState"
            :columnName="title" :item="item"></taskitem>
        </template>
      </draggable>-->
    </div>
    <b-modal v-model="showModal" :ok-disabled="taskTitle.length === 0" @ok="procSelected" @cancel="doCancel"
      title="Enter task title">
      <b-form-input v-model="taskTitle"></b-form-input>
    </b-modal>
  </div>
</template>

<script>
import { LEVEL } from '../../../constants.js'
import { createId } from '../../../common_functions.js'
import { authorization, utilities } from '../../mixins/generic.js'
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem.vue'

export default {
  // compatConfig: {
  //   MODE: 3, // opt-in to Vue 3 behavior for this component only
  //   draggable: true // features can also be toggled at component level
  //   [Erik] did not work
  // },
  mixins: [authorization, utilities],
  name: 'TaskColumn',
  props: ['productId', 'storyId', 'storyTitle', 'tasks', 'title', 'taskState', 'idx'],
  components: {
    taskitem: TaskItem,
    draggable: Draggable
  },

  data() {
    return {
      showModal: false,
      taskTitle: '',

      list: [
        { name: 'vue', id: 1 },
        { name: 'script', id: 2 },
        { name: 'com', id: 3 },
      ],
      drag: false
    }
  },

  computed: {
    draggables: {
      get() {
        console.log('draggables: this.tasks = ' + JSON.stringify(this.tasks, null, 2)
        )
        return this.tasks
      },
      set(tasks) {
        if (this.haveWritePermission(this.productId, LEVEL.TASK)) {
          this.$store.dispatch('updateTasks', {
            tasks,
            taskState: this.taskState,
            idx: this.idx
          })
        } else this.$store.state.warningText = `Sorry, your assigned role(s) [${this.getMyProductsRoles[this.productId].concat(this.getMyGenericRoles)}] for this product disallow you to execute this action`
      }
    }
  },

  methods: {
    procSelected() {
      this.$store.dispatch('boardAddTask', { storyId: this.storyId, taskState: this.taskState, taskId: createId(), taskTitle: this.taskTitle })
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

.b-card-body>* {
  min-height: 50px;
}

.b-card:last-child {
  margin-bottom: 5px;
}
</style>

