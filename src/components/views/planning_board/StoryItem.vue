<template>
  <div class="b-card story-column-item">
    <div class="b-card-block">
      <i class="colorYellow" v-if="subType === 0">
        <font-awesome-icon icon="folder" />
      </i>
      <i v-if="subType === 1">
        <font-awesome-icon icon="hourglass-start" />
      </i>
      <i class="colorRed" v-if="subType === 2">
        <font-awesome-icon icon="bug" />
      </i>
      {{ title }}
      <p>size = {{ size }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoryItem',
  props: ['title', 'size', 'subType']
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


.colorYellow {
  color: #ffff00;
}

.colorRed {
  color: red;
}
</style>
