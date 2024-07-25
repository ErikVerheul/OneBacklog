<template>
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
          <BButton class="space3px" variant="seablueInverted" @click="showAttachment(attach)"> {{ attach.title }} </BButton>
          <BButton class="space3px" variant="danger" @click="removeAttachment(attach)">X</BButton>
        </span>
      </div>
    </ul>
    <ul v-if="store.state.selectedForView === 'history'">
      <li v-for="histItem in getFilteredHistory" :key="histItem.timestamp">
        <div v-for="(value, key) in histItem" :key="key">
          <div class="p1" v-html="prepHistoryText(key, value)"></div>
        </div>
      </li>
    </ul>
  </div>

  <template>
    <BModal size="lg" v-model="editMyComment" scrollable @ok="replaceEditedComment" title="Edit your comment">
      <BFormGroup>
        <QuillEditor v-model:content=myLastCommentText contentType="html" :toolbar="editorToolbar"></QuillEditor>
      </BFormGroup>
    </BModal>
  </template>
</template>

<script>
import store from '../../../store/store'
import commonListings from '../common_listings.js'
import { atou } from '../../../common_functions.js'

function data() {
  return {
    editMyComment: false,
    commentObjToBeReplaced: {},
    myLastCommentText: "<p></p>",
    editorToolbar: [
      [{ header: [false, 1, 2, 3, 4, 5, 6] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
      ['link', 'image', 'code-block']
    ]
  }
}

const methods = {
  getEvent(comment) {
    return Object.keys(comment)[0]
  },

  getEventValue(comment) {
    return comment[Object.keys(comment)[0]]
  },

  otherUserCommentedAfterme(comment) {
    let otherUserFound = false
    for (let c of this.getFilteredComments) {
      if (c.by !== store.state.userData.user) {
        otherUserFound = true
      }
      if (c === comment) {
        break
      }
    }
    return otherUserFound
  },

  isMyAddition(comment) {
    return comment.by === store.state.userData.user && Object.keys(comment)[0] === 'addCommentEvent'

  },

  startEditMyComment(comment) {
    this.commentObjToBeReplaced = comment
    this.myLastCommentText = atou(this.getEventValue(comment))
    this.editMyComment = true
  },

  replaceEditedComment() {
    store.dispatch('replaceComment', {
      node: this.getLastSelectedNode,
      commentObjToBeReplaced: this.commentObjToBeReplaced,
      editedCommentText: this.myLastCommentText,
      timestamp: Date.now()
    })
  }
}

export default {
  extends: commonListings,
  data,
  methods
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
