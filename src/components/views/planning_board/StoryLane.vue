<template>
  <b-container fluid>
    <b-row no-gutters>
      <b-col>
        <story-column id="userStory" :story="$store.state.stories[idx]"></story-column>
      </b-col>
      <b-col>
        <task-column
          :state="TODO"
          title="Todo"
          :tasks="$store.state.stories[idx].tasks[TODO]"
          :idx="idx"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="INPROGRESS"
          title="In progress"
          :tasks="$store.state.stories[idx].tasks[INPROGRESS]"
          :idx="idx"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="TESTREVIEW"
          title="Test / review"
          :tasks="$store.state.stories[idx].tasks[TESTREVIEW]"
          :idx="idx"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="DONE"
          title="Done"
          :tasks="$store.state.stories[idx].tasks[DONE]"
          :idx="idx"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
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
      this.INPROGRESS = 4,
      this.TESTREVIEW = 5,
      this.DONE = 6
  },
  components: {
    'task-column': TaskColumn,
    'story-column': StoryColumn
  }

}
</script>
