<template>
  <div :class="getClass(columnName)">
    <div class="b-card-block">
      <h5>
        <span class="text-muted">#{{item.id}}</span>
        {{item.text}}
      </h5>
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
}

.b-card.task-column-item {
  background: #ddc01d;
}

.b-card.task-column-done {
  background: #9bc777;
}
</style>

