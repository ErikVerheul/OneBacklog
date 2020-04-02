<template>
  <b-card-group>
    <b-card mt-0>
    <h3 v-if="idx === 0" class="b-card-header">{{ title }}</h3>
    <div class="b-card-body">
      <draggable v-model="draggables" :group="idx.toString()">
        <div v-for="item in items" :key="item.id">
          <item :item="item" :columnName="title"></item>
        </div>
      </draggable>
    </div>
    <div class="b-card-footer text-muted">{{itemCount}}</div>
    </b-card>
  </b-card-group>
</template>

<script>
import Draggable from 'vuedraggable'
import TaskItem from './TaskItem'

export default {
  name: 'TaskColumn',
  props: ['items', 'title', 'id', 'idx'],
  components: {
    item: TaskItem,
    draggable: Draggable
  },
  computed: {
    itemCount () {
      if (!this.items) return ''
      if (this.items.length === 1) return '1 task'
      return `${this.items.length} tasks`
    },
    draggables: {
      get () {
        return this.items
      },
      set (items) {
        this.$store.commit('updateItems', {
          items,
          id: this.id,
          idx: this.idx
        })
      }
    }
  }
}
</script>

