<template>
  <div :class="getClass(columnName)">
    <div class="b-card-block">
      <span class="text-muted">#{{ item.id.slice(-5) }}</span>
      {{ item.text }}
    </div>
  </div>
</template>

<script>

export default {
  name: 'TaskItem',
  props: ['item', 'columnName'],

  data () {
    return {
      theClass: 'b-card task-column-item'
    }
  },

  methods: {
    getClass (name) {
      switch (name) {
        case 'Todo':
          return 'b-card task-column-item'
        case 'In progress':
          return 'b-card task-column-item'
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

