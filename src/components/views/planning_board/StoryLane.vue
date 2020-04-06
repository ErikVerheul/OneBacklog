<template>
  <b-container fluid>
    <b-row no-gutters>
      <b-col>
        <story-column id="userStory" :story="$store.state.stories[idx]"></story-column>
      </b-col>
      <b-col>
        <task-column :id="TODO" title="Todo" :tasks="$store.state.stories[idx].tasks[TODO]" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column :id="INPROGRESS" title="In progress" :tasks="$store.state.stories[idx].tasks[INPROGRESS]" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column :id="TESTREVIEW" title="Test / review" :tasks="$store.state.stories[idx].tasks[TESTREVIEW]" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column :id="DONE" title="Done" :tasks="$store.state.stories[idx].tasks[DONE]" :idx="idx"></task-column>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import TaskColumn from './TaskColumn'
import StoryColumn from './StoryColumn'

export default {
  name: 'StoryLane',
  props: ['idx'],
  created() {
    this.TODO = 2,
    this.INPROGRESS = 3,
    this.TESTREVIEW = 4,
    this.DONE = 5
  },
  components: {
    'task-column': TaskColumn,
    'story-column': StoryColumn
  }

}
</script>
