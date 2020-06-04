<template>
  <div class="b-card story-column-item">
    <div class="b-card-block">
      <i class="colorYellow" v-if="story.subType === 0">
        <font-awesome-icon icon="folder" />
      </i>
      <i v-if="story.subType === 1">
        <font-awesome-icon icon="hourglass-start" />
      </i>
      <i class="colorRed" v-if="story.subType === 2">
        <font-awesome-icon icon="bug" />
      </i>
      <span class="text-muted">#{{ getShortId(story.storyId) }}</span>
      {{ story.title }}
      <p>size = {{ story.size }}</p>
      <p class="small-text">
        F: {{ story.featureName }}
        <br />
        E: {{ story.epicName }}
        <br />
        P: {{ story.productName }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoryItem',
  props: ['story'],
  methods: {
    getShortId(id) {
      return id.slice(-5)
    },
  }
}
</script>

<style scoped>
.small-text {
  font-size: small;
}

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
</style>
