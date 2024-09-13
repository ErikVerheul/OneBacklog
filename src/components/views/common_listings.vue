<template>
  <div style="height: 80vh; overflow-y: auto;">
    <div v-if="store.state.selectedForView === 'comments'">
      <div style="width: 98%;" v-for="comment in getFilteredComments" :key="comment.timestamp">
        <BCard border-variant="primary" :header="mkCommentHeader(comment)" header-bg-variant="primary" header-text-variant="white" footer-tag="footer"
          align="center">
          <BCardBody class="list-body">
            <BRow
              v-if="(isMyAddition(comment, 'addCommentEvent') || isMyAddition(comment, 'replaceCommentEvent')) && !otherUserCommentedAfterme(comment, getFilteredComments)">
              <BCol cols="11">
                <div v-html="prepCommentsText(getEventName(comment), getEventValue(comment))"></div>
              </BCol>
              <BCol cols="1">
                <font-awesome-icon icon="edit" @click="startEditMyComment(comment)" />
              </BCol>
            </BRow>
            <div v-else v-html="prepCommentsText(getEventName(comment), getEventValue(comment))"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkCommentFooter(comment) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
    <ul v-else-if="store.state.selectedForView === 'attachments'">
      <div v-if="!isUploadDone">loading...</div>
      <div v-for="(attach, index) in getAttachments" :key="attach.title + attach.data.digest">
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
      <div style="width: 98%;" v-for="histItem in getFilteredHistory" :key="histItem.timestamp">
        <BCard border-variant="primary" :header="mkHistHeader(histItem)" header-bg-variant="primary" header-text-variant="white" footer-tag="footer"
          align="center">
          <BCardBody class="list-body">
            <div v-html="prepHistoryText(getEventName(histItem), getEventValue(histItem))"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkHistFooter(histItem) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
  </div>

  <template>
    <BModal size="lg" v-model="editMyComment" scrollable @ok="replaceEditedComment" title="Edit your comment">
      <QuillEditor v-model:content=myLastCommentText contentType="html"></QuillEditor>
    </BModal>
  </template>
</template>

<script>
import { MISC } from '../../constants.js'
import commonListings from './common_listings.js'

function data() {
  return {
    editMyComment: false,
    commentObjToBeReplaced: {},
    myLastCommentText: MISC.EMPTYQUILL,
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

.list-body {
  padding: 10px 0px 10px 0px;
  text-align: left;
  font-size: 16px;
  line-height: 1.6;
}
</style>
