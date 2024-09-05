<template>
  <BModal size="lg" @ok="saveNewMessage" v-model="store.state.showGoMessaging" title="View and send messages">
    <BCard border-variant="primary" header="Create a message for your team members" header-bg-variant="primary" header-text-variant="white" align="center">
      <label for="newMsgId">Message title</label>
      <BFormInput id="newMsgId" v-model="store.state.newMsgTitle" />
      <p class="mt-3 mb-0">Your message</p>
      <QuillEditor v-model:content=store.state.myNewMessage contentType="html"></QuillEditor>
    </BCard>
    <h6 class="mt-3">Your team messages</h6>
    <div v-for="msg in store.state.myB64TeamMessages" :key="msg.timestamp">
      <BCard class="card border-primary">
        <BCardBody class="list-header">
          <BRow>
            <BCol cols="12">
              {{ msg.title }}
            </BCol>
          </BRow>
        </BCardBody>
        <BCardBody class="list-body">
          <BRow>
            <BCol cols="12">
              <div v-html="getMsgContent(msg)"></div>
            </BCol>
          </BRow>
        </BCardBody>
        <BCardFooter class="list-footer">
          {{ mkMsgFooter(msg) }}
        </BCardFooter>
      </BCard>
      <br>
    </div>
  </BModal>
</template>

<script>
import { b64ToUni } from '../../common_functions.js'

const methods = {
  getMsgContent(msg) {
    return b64ToUni(msg.b64Msg)
  },

  mkMsgFooter(msg) {
    return `This message was created by '${msg.from}' at ${new Date(msg.timestamp).toString()}`
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
  methods,
}
</script>

<style scoped>
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