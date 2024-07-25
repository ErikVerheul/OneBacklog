<template >
  <div>
    <div v-if="store.state.selectedForView === 'comments'">
      <div v-for="comment in getFilteredComments" :key="comment.timestamp">
        <BCard>
          <BCardBody>
            <BRow v-if="isMyAddition(comment) && !otherUserCommentedAfterme(comment)">
              <BCol cols="11">
                <div v-html="prepCommentsText(getEvent(comment), getEventValue(comment))"></div>
              </BCol>
              <BCol cols="1">
                <font-awesome-icon icon="edit" @click="startEditMyComment(comment)" />
              </BCol>
            </BRow>
            <BRow v-else>
              <BCol cols="12">
                <div v-html="prepCommentsText(getEvent(comment), getEventValue(comment))"></div>
              </BCol>
            </BRow>
          </BCardBody>
          <BCardFooter>
            <p class="p1" v-html="prepCommentsText('by', comment['by'])"></p>
            <p class="p1" v-html="prepCommentsText('timestamp', comment['timestamp'])"></p>
          </BCardFooter>
        </BCard>
      </div>
    </div>
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

  <template>
    <BModal size="lg" v-model="editMyComment" scrollable @ok="replaceEditedComment" title="Edit your comment">
      <BFormGroup>
        <QuillEditor v-model:content=myLastCommentText contentType="html"></QuillEditor>
      </BFormGroup>
    </BModal>
  </template>
</template>

<script>
import store from '../../../store/store'
import commonListings from '../common_listings.js'

function data() {
  return {
    editMyComment: false,
    commentObjToBeReplaced: {},
    myLastCommentText: "<p></p>",
  }
}

export default {
  extends: commonListings,
  data
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
