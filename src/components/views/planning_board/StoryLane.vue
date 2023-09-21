<template>
  <b-container fluid>
    <b-row no-gutters>
      <b-col>
        <story-column
					:story="$store.state.planningboard.stories[idx]"
					:productId="$store.state.planningboard.stories[idx].productId"
				></story-column>
      </b-col>
      <b-col v-if="$store.state.userData.myOptions.showOnHold === 'do_show_on_hold'">
        <task-column
          :taskState="STATE.ON_HOLD"
          title="[On hold]"
          :tasks="$store.state.planningboard.stories[idx].tasks[STATE.ON_HOLD]"
          :idx="idx"
          :productId="$store.state.planningboard.stories[idx].productId"
          :storyId="$store.state.planningboard.stories[idx].storyId"
          :storyTitle="$store.state.planningboard.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :taskState="STATE.TODO"
          title="Todo"
          :tasks="$store.state.planningboard.stories[idx].tasks[STATE.TODO]"
          :idx="idx"
          :productId="$store.state.planningboard.stories[idx].productId"
          :storyId="$store.state.planningboard.stories[idx].storyId"
          :storyTitle="$store.state.planningboard.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :taskState="STATE.INPROGRESS"
          title="In progress"
          :tasks="$store.state.planningboard.stories[idx].tasks[STATE.INPROGRESS]"
          :idx="idx"
          :productId="$store.state.planningboard.stories[idx].productId"
          :storyId="$store.state.planningboard.stories[idx].storyId"
          :storyTitle="$store.state.planningboard.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :taskState="STATE.TESTREVIEW"
          title="Test / review"
          :tasks="$store.state.planningboard.stories[idx].tasks[STATE.TESTREVIEW]"
          :idx="idx"
          :productId="$store.state.planningboard.stories[idx].productId"
          :storyId="$store.state.planningboard.stories[idx].storyId"
          :storyTitle="$store.state.planningboard.stories[idx].title"
        ></task-column>
      </b-col>
      <b-col>
        <task-column
          :taskState="STATE.DONE"
          title="Done"
          :tasks="$store.state.planningboard.stories[idx].tasks[STATE.DONE]"
          :idx="idx"
          :productId="$store.state.planningboard.stories[idx].productId"
          :storyId="$store.state.planningboard.stories[idx].storyId"
          :storyTitle="$store.state.planningboard.stories[idx].title"
        ></task-column>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { STATE } from '../../../constants.js'
import TaskColumn from './TaskColumn.vue'
import StoryColumn from './StoryColumn.vue'


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
