<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0" class="b-card-header">{{ title }}</h3>
    <hr />
    <div class="b-card-body">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <taskitem :storyId="storyId" :storyTitle="storyTitle" :state="state" :columnName="title" :item="item"></taskitem>
        </div>
      </draggable>
    </div>
  </div>
</template>

<script>
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem'
import { mapGetters } from 'vuex'

export default {
  name: 'TaskColumn',
  props: ['storyId', 'storyTitle', 'tasks', 'title', 'state', 'idx'],
  components: {
    taskitem: TaskItem,
    draggable: Draggable
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
