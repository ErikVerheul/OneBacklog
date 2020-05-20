<template>
  <div :class="getClass(columnName)" @contextmenu.prevent="showContextMenu = !showContextMenu">
    <div class="b-card-block">
      <span class="text-muted">#{{ getShortId(item.id) }}</span>
      {{ item.title }}
      <br />
      {{ item.taskOwner }}
    </div>
    <template>
      <b-modal v-model="showContextMenu" @ok="handleOk" title="Task menu">
        <template>
          <b-list-group>
            <b-list-group-item button variant="dark" @click="addTask = true">Add a new task</b-list-group-item>
            <b-list-group-item button variant="dark" @click="changeOwner">Change task owner</b-list-group-item>
            <b-list-group-item button variant="dark">Copy the task id</b-list-group-item>
            <b-list-group-item button variant="danger" @click="removeTask">Remove this task</b-list-group-item>
          </b-list-group>
          <div v-if="addTask" class="title_block">
            <b-form-input v-model="newTaskTitle" placeholder="Enter the title of the new task"></b-form-input>
          </div>
        </template>
      </b-modal>
    </template>
  </div>
</template>

<script>
import { utilities } from '../../mixins/utilities.js'
export default {
  mixins: [utilities],
  name: 'TaskItem',
  props: ['storyId', 'storyTitle', 'state', 'columnName', 'item'],

  data() {
    return {
      showContextMenu: false,
      addTask: false,
      newTaskTitle: '',
      theClass: 'b-card task-column-item'
    }
  },

  methods: {
    changeOwner() {
      this.showContextMenu = false
    },

    removeTask() {
      this.$store.dispatch('boardRemoveTask', { taskId: this.item.id, storyTitle: this.storyTitle, currentState: this.state })
      this.showContextMenu = false
    },

    handleOk() {
      if (this.addTask) {
        this.addTask = false
        const newTaskId = this.createId()
        // update the parent history and than save the new document
        this.$store.dispatch('boardAddTask', { storyId: this.storyId, state: this.state, taskId: newTaskId, taskTitle: this.newTaskTitle, priority: this.item.priority })
      }
    },

    getShortId(id) {
      return id.slice(-5)
    },

    getClass(name) {
      switch (name) {
        case 'Todo':
        case 'In progress':
        case 'Test / review':
          return 'b-card task-column-item'
        case 'Done':
          return 'b-card task-column-done'
      }
    }
  }
}
</script>

<style scoped>
.title_block {
  margin-top: 20px;
}

.b-card-block {
  padding: 15px;
  font-size: 12pt;
}

.b-card.task-column-item {
  background: #ddc01d;
}

.b-card.task-column-done {
  background: #9bc777;
}
</style>

