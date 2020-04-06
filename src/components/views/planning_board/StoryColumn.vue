<template>
  <div>
    <h3 v-if="idx === 0">User story</h3>
    <hr>
    <div>
        <item :story="story"></item>
    </div>
  </div>
</template>

<script>
import StoryItem from './StoryItem'

export default {
  name: 'StoryColumn',
  props: ['story'],
  components: {
    item: StoryItem
  }
}
</script>
