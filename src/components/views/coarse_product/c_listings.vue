<template >
  <div>
    <ul v-if="store.state.selectedForView === 'comments'">
      <li v-for="comment in getFilteredComments" :key="comment.timestamp">
        <div v-for="(value, key) in comment" :key="key">
          <div class="p1" v-html="prepCommentsText(key, value)"></div>
        </div>
      </li>
    </ul>
    <ul v-if="store.state.selectedForView === 'attachments'">
      <div v-if="!isUploadDone">loading...</div>
      <div v-for="(attach, index) in getAttachments()" :key="attach.title + attach.data.digest">
        <span>
          <template v-if="getNrOfTitles() > 1">
            {{ index + 1 }}/{{ getNrOfTitles() }}
          </template>
          <BButton class="space3px" @click="showAttachment(attach)"> {{ attach.title }} </BButton>
          <BButton class="space3px" variant="danger" @click="removeAttachment(attach)">X</BButton>
        </span>
      </div>
    </ul>
    <ul v-if="store.state.selectedForView === 'history'">
      <li v-for="hist in getFilteredHistory" :key="hist.timestamp">
        <div v-for="(value, key) in hist" :key="key">
          <div class="p1" v-html="prepHistoryText(key, value)"></div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import commonListings from '../common_listings.js'

export default {
  extends: commonListings
}
</script>

<style scoped>
.space3px {
  margin: 3px;
}
.p1 {
  font-size: 12px;
}
</style>
