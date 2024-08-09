<template>
  <div>
    <div v-if="store.state.selectedForView === 'comments'">
      <div v-for="comment in getFilteredComments" :key="comment.timestamp">
        <BCard class="card border-primary">
          <BCardBody class="list-header">
            <BRow>
              <BCol cols="12">
                {{ mkCommentHeader(comment) }}
              </BCol>
            </BRow>
          </BCardBody>
          <BCardBody class="list-body">
            <BRow v-if="(isMyAddition(comment, 'addCommentEvent') || isMyAddition(comment, 'replaceCommentEvent')) && !otherUserCommentedAfterme(comment, getFilteredComments)">
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
          <BCardFooter class="list-footer">
            {{ mkHistFooter(comment) }}
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
        <BCard class="card border-primary">
          <BCardBody class="list-header">
            <BRow>
              <BCol cols="12">
                {{ mkHistHeader(histItem) }}
              </BCol>
            </BRow>
          </BCardBody>
          <BCardBody class="list-body">
            <BRow>
              <BCol cols="12">
                <div v-html="prepHistoryText(getEvent(histItem), getEventValue(histItem))"></div>
              </BCol>
            </BRow>
          </BCardBody>
          <BCardFooter class="list-footer">
            {{ mkHistFooter(histItem) }}
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
</template>

<script>
import commonListings from './common_listings.js'

function data() {
  return {
    editMyComment: false,
    commentObjToBeReplaced: {},
    myLastCommentText: "<p><br></p>",
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

.list-header {
  background-color: #408fae;
  padding: 10px 0px 10px 0px;
  text-align: center;
  color: white;
  font-size: 18px;
}

.list-body {
  padding: 10px 0px 10px 0px;
  text-align: left;
  font-size: 16px;
  line-height: 1.6;
}

.list-footer {
  background-color: #333333;
  padding: 10px 0px 10px 0px;
  text-align: center;
  color: white;
  font-size: 14px;
}
</style>
