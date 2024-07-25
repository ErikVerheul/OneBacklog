<template>
  <div>
    <div v-if="store.state.selectedForView === 'comments'">
      <div v-for="comment in getFilteredComments" :key="comment.timestamp">
        <BCard>
          <BCardBody>
            <BRow v-if="isMyAddition(comment, 'addCommentEvent') && !otherUserCommentedAfterme(comment, getFilteredComments)">
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
        <br>
      </div>
    </div>
    <ul v-else-if="store.state.selectedForView === 'attachments'">
      <div v-if="!isUploadDone">loading...</div>
      <div v-for="(attach, index) in getAttachments()" :key="attach.title + attach.data.digest">
        <span>
          <template v-if="getNrOfTitles() > 1">
            {{ index + 1 }}/{{ getNrOfTitles() }}
          </template>
          <BButton class="space3px" variant="seablueInverted" @click="showAttachment(attach)"> {{ attach.title }} </BButton>
          <BButton class="space3px" variant="danger" @click="removeAttachment(attach)">X</BButton>
        </span>
      </div>
    </ul>
    <div v-else-if="store.state.selectedForView === 'history'">
      <div v-for="histItem in getFilteredHistory" :key="histItem.timestamp">
        <BCard>
          <BCardBody>
            <BRow v-if="isMyAddition(histItem, 'commentToHistoryEvent') && !otherUserCommentedAfterme(histItem, getFilteredHistory)">
              <BCol cols="11">
                <div v-html="prepHistoryText(getEvent(histItem), getEventValue(histItem))"></div>
              </BCol>
              <BCol cols="1">
                <font-awesome-icon icon="edit" @click="startEditMyHistComment(histItem)" />
              </BCol>
            </BRow>
            <BRow v-else>
              <BCol cols="12">
                <div v-html="prepHistoryText(getEvent(histItem), getEventValue(histItem))"></div>
              </BCol>
            </BRow>
          </BCardBody>
          <BCardFooter>
            <p class="p1" v-html="prepHistoryText('by', histItem['by'])"></p>
            <p class="p1" v-html="prepHistoryText('timestamp', histItem['timestamp'])"></p>
          </BCardFooter>
        </BCard>
        <br>
      </div>
    </div>
  </div>

  <template>
    <BModal size="lg" v-model="editMyComment" scrollable @ok="replaceEditedComment" title="Edit your comment">
      <BFormGroup>
        <QuillEditor v-model:content=myLastCommentText contentType="html"></QuillEditor>
      </BFormGroup>
    </BModal>
  </template>

  <template>
    <BModal size="lg" v-model="editMyHistComment" scrollable @ok="replaceEditedHistComment" title="Edit your history comment">
      <BFormGroup>
        <QuillEditor v-model:content=myLastHistCommentText contentType="html"></QuillEditor>
      </BFormGroup>
    </BModal>
  </template>

</template>

<script>
import commonListings from '../common_listings.js'

function data() {
  return {
    editMyComment: false,
    editMyHistComment: false,
    commentObjToBeReplaced: {},
    myLastCommentText: "<p></p>",
    myLastHistCommentText: "<p></p>"
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
