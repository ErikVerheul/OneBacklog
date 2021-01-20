<template>
  <b-container fluid>
    <b-row no-gutters>
      <b-col>
        <story-column id="userStory" :story="$store.state.stories[idx]"></story-column>
      </b-col>
      <b-col>
        <task-column
          :state="ON_HOLD"
          title="[On hold]"
          :tasks="$store.state.stories[idx].tasks[STATE.ON_HOLD]"
          :idx="idx"
          :productId="$store.state.stories[idx].productId"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="TODO"
          title="Todo"
          :tasks="$store.state.stories[idx].tasks[STATE.TODO]"
          :idx="idx"
          :productId="$store.state.stories[idx].productId"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="INPROGRESS"
          title="In progress"
          :tasks="$store.state.stories[idx].tasks[STATE.INPROGRESS]"
          :idx="idx"
          :productId="$store.state.stories[idx].productId"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="TESTREVIEW"
          title="Test / review"
          :tasks="$store.state.stories[idx].tasks[STATE.TESTREVIEW]"
          :idx="idx"
          :productId="$store.state.stories[idx].productId"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :state="DONE"
          title="Done"
          :tasks="$store.state.stories[idx].tasks[STATE.DONE]"
          :idx="idx"
          :productId="$store.state.stories[idx].productId"
          :storyId="$store.state.stories[idx].storyId"
          :storyTitle="$store.state.stories[idx].title"
        ></task-column>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { STATE } from '../../../constants.js'
import TaskColumn from './TaskColumn'
import StoryColumn from './StoryColumn'


export default {
	data () {
    return {
			STATE
		}
	},
  name: 'StoryLane',
  props: ['idx'],
  components: {
    'task-column': TaskColumn,
    'story-column': StoryColumn
  }
}
</script>
