<template>
  <!-- The three style definitions create a vertical scroll bar -->
  <BModal style="overflow-y: initial !important;" size="lg" v-model="store.state.showGoMessaging" hide-footer title="View and send messages">
    <BCard border-variant="primary" header="Create a message for your team members" header-bg-variant="dark" header-text-variant="white" align="center">
      <label for="newMsgId">Message title</label>
      <BFormInput id="newMsgId" v-model="store.state.newMsgTitle" placeholder="Your message must have a title" />
      <p class="mt-3 mb-0">Your message</p>
      <QuillEditor v-model:content=store.state.myNewMessage contentType="html"></QuillEditor>
      <BButton :disabled="canNotSave" class="mt-3" variant="primary" @click="saveNewMessage">Send message</BButton>
    </BCard>
    <h2 class="mt-3">Your team messages</h2>
    <div style="height: 80vh; overflow-y: auto;">
      <div style="width: 98%;" v-for="msg in store.state.myB64TeamMessages" :key="msg.timestamp">
        <BCard border-variant="primary" :header="msg.title" header-bg-variant="primary" header-text-variant="white" footer-tag="footer" align="center">
          <BCardBody class="list-body">
            <div v-html="getMsgContent(msg)"></div>
          </BCardBody>
          <template #footer>
            <em>{{ mkMsgFooter(msg) }}</em>
          </template>
        </BCard>
        <br>
      </div>
    </div>
  </BModal>
</template>

<script>
import store from '../../store/store.js'
import { b64ToUni } from '../../common_functions.js'

const computed = {
  canNotSave: function () {
    return store.state.newMsgTitle.trim() === ''
  },

}

const methods = {
  getMsgContent(msg) {
    return b64ToUni(msg.b64Msg)
  },

  mkMsgFooter(msg) {
    return `This message was send by '${msg.from}' at ${new Date(msg.timestamp).toString()}`
  },

  saveNewMessage() {
    store.dispatch('saveMyTeamMessageAction', {
      dbName: store.state.userData.currentDb,
      newTitle: store.state.newMsgTitle,
      newMessage: store.state.myNewMessage,
    })
  },
}

export default {
  computed,
  methods,
}
</script>

<style scoped>
.list-body {
  padding: 10px 0px 10px 0px;
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
}
</style>