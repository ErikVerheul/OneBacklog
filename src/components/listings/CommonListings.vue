<template>
  <div style="height: 80vh; overflow-y: auto;">
    <div v-if="selectedForView === 'comments'">
      <div style="width: 98%;" v-for="comment in getFilteredComments" :key="comment.timestamp">
        <BCard border-variant="primary" :header="mkCommentHeader(comment)" header-bg-variant="primary" header-text-variant="white" footer-tag="footer"
          align="center">
          <BCardBody class="list-body">
            <BRow
              v-if="(isMyAddition(comment, 'addCommentEvent') || isMyAddition(comment, 'replaceCommentEvent')) && !otherUserReactedAfterMe(comment, getFilteredComments)">
              <BCol cols="11">
                <div v-html="prepCommentsText(getEventName(comment), getEventValue(comment), comment.encoding)"></div>
              </BCol>
              <BCol cols="1">
                <font-awesome-icon icon="edit" @click="startEditMyComment(comment)" />
              </BCol>
            </BRow>
            <div v-else v-html="prepCommentsText(getEventName(comment), getEventValue(comment), comment.encoding)"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkCommentFooter(comment) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
    <ul v-else-if="selectedForView === 'attachments'">
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
    <div v-else-if="selectedForView === 'history'">
      <div style="width: 98%;" v-for="histItem in getFilteredHistory" :key="histItem.timestamp">
        <BCard border-variant="primary" :header="mkHistHeader(histItem)" header-bg-variant="primary" header-text-variant="white" footer-tag="footer"
          align="center">
          <BCardBody class="list-body">
            <div v-html="prepHistoryText(getEventName(histItem), getEventValue(histItem), histItem.encoding || null)"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkHistFooter(histItem) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
    <div v-else-if="selectedForView === 'messages'">
      <div style="width: 98%;" v-for="msgEvent in store.state.teamMessages" :key="msgEvent.timestamp">
        <BCard border-variant="primary" :header="msgEvent.title" header-bg-variant="primary" header-text-variant="white" footer-tag="footer" align="center">
          <BCardBody class="list-body">
            <BRow
              v-if="(isMyAddition(msgEvent, 'teamMessage') || isMyAddition(msgEvent, 'replacedTeamMessage')) && !otherUserReactedAfterMe(msgEvent, store.state.teamMessages)">
              <BCol cols="11">
                <div v-html="getMsgContent(msgEvent)"></div>
              </BCol>
              <BCol cols="1">
                <font-awesome-icon icon="edit" @click="startEditMyMessText(msgEvent)" />
              </BCol>
            </BRow>
            <div v-else v-html="getMsgContent(msgEvent)"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkMsgFooter(msgEvent) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
  </div>

  <template>
    <BModal size="lg" v-model="editMyText" scrollable @ok="replaceEditedComment" title="Edit your comment">
      <QEditor v-model=myLastText />
    </BModal>
  </template>
</template>

<script>
  import { MISC } from '../../constants.js'
  import { decodeHtml } from '../../common_functions.js'
  import store from '../../store/store.js'
  import commonListings from './CommonListings.js'

  const props = ['selectedForView']

  function data() {
    return {
      editMyText: false,
      commentObjToBeReplaced: {},
      messageObjToBeReplaced: {},
      myLastText: MISC.EMPTYQUILL,
    }
  }

  const methods = {
    otherUserReactedAfterMe(event, allEvents) {
      let otherUserFound = false
      for (let e of allEvents) {
        if (e.by !== store.state.userData.user) {
          otherUserFound = true
        }
        if (e === event) {
          break
        }
      }
      return otherUserFound
    },

    isMyAddition(event, eventName) {
      return event.by === store.state.userData.user && this.getEventName(event) === eventName
    },

    startEditMyComment(event) {
      this.commentObjToBeReplaced = event
      this.myLastText = decodeHtml(this.getEventValue(event)[0], event.encoding)
      this.editMyText = true
    },

    replaceEditedComment() {
      store.dispatch('replaceComment', {
        node: this.getSelectedNode,
        commentObjToBeReplaced: this.commentObjToBeReplaced,
        editedCommentText: this.myLastText,
        encoding: 'escaped',
        timestamp: Date.now(),
      })
    },

    startEditMyMessText(msgEvent) {
      store.state.replaceMessage = true
      store.state.replaceMessageTimestamp = msgEvent.timestamp
      store.state.newMsgTitle = msgEvent.title
      store.state.myNewMessage = decodeHtml(msgEvent.b64Msg, msgEvent.encoding)
    },

    getMsgContent(msgEvent) {
      return decodeHtml(msgEvent.b64Msg, msgEvent.encoding)
    },

    mkMsgFooter(msgEvent) {
      if (Object.keys(msgEvent)[0] === 'replacedTeamMessage') return `This message was updated by '${msgEvent.by}' at ${new Date(msgEvent.timestamp).toString()}`
      return `This message was send by '${msgEvent.by}' at ${new Date(msgEvent.timestamp).toString()}`
    },
  }

  export default {
    extends: commonListings,
    data,
    methods,
    props
  }
</script>

<style scoped>
  .space3px {
    margin: 3px;
  }

  .list-body {
    padding: 10px 0px 10px 0px;
    text-align: left;
    font-family: sans-serif;
    font-size: 12px;
  }
</style>
