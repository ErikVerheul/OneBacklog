<template>
  <b-card>
    <h3 v-if="idx === 0">User story</h3>
    <div>
        <item :title="title" :size="size"></item>
    </div>
  </b-card>
</template>

<script>
import StoryItem from './StoryItem'

export default {
  name: 'StoryColumn',
  props: ['title', 'size', 'idx'],
  components: {
    item: StoryItem
  }
}
</script>
