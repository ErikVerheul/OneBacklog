<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0">{{ title }}</h3>
    <hr />
    <template v-if="idx !== 0 && draggables.length === 0">
      <b-button @click="showModal = !showModal" block squared variant="outline-secondary">Click to create a task here</b-button>
    </template>
    <div class="b-card-body">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <taskitem :storyId="storyId" :storyTitle="storyTitle" :state="state" :columnName="title" :item="item"></taskitem>
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
import { utilities } from '../../mixins/utilities.js'
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem'
import { mapGetters } from 'vuex'

export default {
  mixins: [utilities],
  name: 'TaskColumn',
  props: ['storyId', 'storyTitle', 'tasks', 'title', 'state', 'idx'],
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

  methods: {
    procSelected() {
      this.$store.dispatch('boardAddTask', { storyId: this.storyId, state: this.state, taskId: this.createId(), taskTitle: this.taskTitle })
    },

    doCancel() {
      this.taskTitle = ''
    }
  },

  computed: {
    ...mapGetters([
      'isDeveloper',
      'isPO'
    ]),
    draggables: {
      get() {
        return this.tasks
      },
      set(tasks) {
        if (this.isDeveloper || this.isPO)
          this.$store.dispatch('updateTasks', {
            tasks,
            state: this.state,
            idx: this.idx
          })
      }
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
