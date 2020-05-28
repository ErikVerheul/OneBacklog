<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0">{{ title }}</h3>
    <hr />
    <template v-if="idx >= 0 && draggables.length === 0">
      <b-button
        @click="showModal = !showModal"
        block
        squared
        variant="outline-secondary"
      >Click to create a task here</b-button>
    </template>
    <div class="b-card-body">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <taskitem
            :storyId="storyId"
            :storyTitle="storyTitle"
            :productId="productId"
            :state="state"
            :columnName="title"
            :item="item"
          ></taskitem>
        </div>
      </draggable>
    </div>
    <b-modal
      v-model="showModal"
      :ok-disabled="taskTitle.length === 0"
      @ok="procSelected"
      @cancel="doCancel"
      title="Enter task title"
    >
      <b-form-input v-model="taskTitle"></b-form-input>
    </b-modal>
  </div>
</template>

<script>
import { utilities, authorization } from '../../mixins/utilities.js'
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem'
import { mapGetters } from 'vuex'

const TASKLEVEL = 6

export default {
  mixins: [utilities, authorization],
  name: 'TaskColumn',
  props: ['productId', 'storyId', 'storyTitle', 'tasks', 'title', 'state', 'idx'],
  components: {
    taskitem: TaskItem,
    draggable: Draggable
  },

  data() {
    return {
      showModal: false,
      taskTitle: '',
    }
  },

  computed: {
    ...mapGetters([
      'myProductRoles'
    ]),
    draggables: {
      get() {
        return this.tasks
      },
      set(tasks) {
        if (this.haveWritePermission(TASKLEVEL, this.productId)) {
          this.$store.dispatch('updateTasks', {
            tasks,
            state: this.state,
            idx: this.idx
          })
        } else this.$store.state.warningText = `Sorry, your assigned role(s) [${this.myProductRoles}] for this product disallow you to execute this action`
      }
    }
  },

  methods: {
    procSelected() {
      this.$store.dispatch('boardAddTask', { storyId: this.storyId, state: this.state, taskId: this.createId(), taskTitle: this.taskTitle })
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
.b-card-body > * {
  min-height: 50px;
}
.b-card:last-child {
  margin-bottom: 5px;
}
</style>
