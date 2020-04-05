<template>
  <div class="b-cards-margin">
    <h3 v-if="idx === 0" class="b-card-header">{{ title }}</h3>
    <hr>
    <div class="b-card-body">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in tasks" :key="item.id">
          <item :item="item" :columnName="title"></item>
        </div>
      </draggable>
    </div>
    <div class="b-card-footer text-muted">{{itemCount}}</div>
  </div>
</template>

<script>
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem'

export default {
  name: 'TaskColumn',
  props: ['tasks', 'title', 'id', 'idx'],
  components: {
    item: TaskItem,
    draggable: Draggable
  },
  computed: {
    itemCount () {
      if (!this.tasks) return ''
      if (this.tasks.length === 1) return '1 task'
      return `${this.tasks.length} tasks`
    },
    draggables: {
      get () {
        return this.tasks
      },
      set (tasks) {
        this.$store.dispatch('updateItems', {
          tasks,
          id: this.id,
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
.b-card:last-child {
  margin-bottom: 5px;
}
</style>
