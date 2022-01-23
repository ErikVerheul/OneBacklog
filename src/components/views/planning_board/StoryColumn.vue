<template>
  <div>
    <h3 v-if="story.idx === 0">User story</h3>
    <hr>
    <div>
        <item :productId="productId" :story="story"></item>
    </div>
  </div>
</template>

<script>
import StoryItem from './StoryItem.vue'

export default {
  name: 'StoryColumn',
  props: ['productId', 'story'],
  components: {
    item: StoryItem
  }
}
</script>
