<template>
  <div class="board">
    <app-header></app-header>
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
import appHeader from '../../header/header.vue'
import StoryLane from './StoryLane'

export default {
  name: 'PlanningBoard',
  components: {
    'app-header': appHeader,
    'story-lane': StoryLane
  }
}
</script>
