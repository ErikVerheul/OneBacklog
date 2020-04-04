<template>
  <div class="b-card story-column-item">
    <div class="b-card-block">
      {{ title }}
      <p>size = {{ size }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoryItem',
  props: ['title', 'size']
}
</script>

<style scoped>
.b-card-block {
  padding: 15px;
  font-size: 12pt;
}

.b-card.story-column-item {
  background: #8b8cc7;
}
</style>
