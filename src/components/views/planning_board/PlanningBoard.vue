<template>
  <div class="board">
      <b-container fluid>
        <div v-for="item in $store.state.stories" :key="item.id">
            <b-row>
                <b-col cols="12">
                    <story-lane :idx="item.id"></story-lane>
                </b-col>
            </b-row>
        </div>
      </b-container>
  </div>
</template>

<script>
import StoryLane from './StoryLane'

export default {
  name: 'PlanningBoard',
  components: {
    'story-lane': StoryLane
  }
}
</script>

