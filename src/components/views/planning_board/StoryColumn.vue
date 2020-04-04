<template>
  <div>
    <h3 v-if="idx === 0">User story</h3>
    <hr>
    <div>
        <item :title="title" :size="size" :subType="subType"></item>
    </div>
  </div>
</template>

<script>
import StoryItem from './StoryItem'

export default {
  name: 'StoryColumn',
  props: ['title', 'size', 'idx', 'subType'],
  components: {
    item: StoryItem
  }
}
</script>
