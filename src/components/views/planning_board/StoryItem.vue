<template>
  <div class="b-card story-column-item">
    <div class="b-card-block">
      <h5>{{ title }}</h5>
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

<style>
.b-card:last-child {
  margin-bottom: 5px;
}

.b-card-block {
  padding: 15px;
}

.b-card.story-column-item {
  background: #8b8cc7;
}
</style>
