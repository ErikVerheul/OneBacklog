<template>
  <b-container fluid>
    <b-row no-gutters>
      <b-col>
        <story-column id="userStory" :title="$store.state.stories[idx].title" :size="$store.state.stories[idx].size" :idx="idx"></story-column>
      </b-col>
      <b-col>
        <task-column id="todo" title="Todo" :tasks="$store.state.stories[idx].tasks.todo" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column id="inProgress" title="In progress" :tasks="$store.state.stories[idx].tasks.inProgress" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column id="testReview" title="Test / review" :tasks="$store.state.stories[idx].tasks.testReview" :idx="idx"></task-column>
      </b-col>
      <b-col>
        <task-column id="done" title="Done" :tasks="$store.state.stories[idx].tasks.done" :idx="idx"></task-column>
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
  components: {
    'task-column': TaskColumn,
    'story-column': StoryColumn
  }

}
</script>
