<template lang="html">
  <div>
    <ul v-if="$store.state.selectedForView==='comments'">
      <li v-for="comment in getFilteredComments" :key="comment.timestamp">
        <div v-for="(value, key) in comment" :key="key">
          <div v-html="prepCommentsText(key, value)"></div>
        </div>
      </li>
    </ul>
    <ul v-if="$store.state.selectedForView==='attachments' && getAttachments">
      <div v-for="attach in getAttachments" :key="attach.title + attach.data.digest">
        <span>
          <b-button class="space" variant="seablue" @click="showAttachment(attach)"> {{ attach.title }} </b-button>
          <b-button class="space" variant="danger" @click="removeAttachment(attach)">X</b-button>
        </span>
      </div>
    </ul>
    <ul v-if="$store.state.selectedForView==='history'">
      <li v-for="hist in getFilteredHistory" :key="hist.timestamp">
        <div v-for="(value, key) in hist" :key="key">
          <div v-html="prepHistoryText(key, value)"></div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { utilities } from '../mixins/utilities.js'

export default {
  mixins: [utilities],
  data() {
    return {

    }
  },

  computed: {
    getFilteredComments() {
      let filteredComments = []
      let comments = this.$store.state.currentDoc.comments
      for (let i = 0; i < comments.length; i++) {
        let allText = window.atob(comments[i].comment)
        allText += comments[i].by
        allText += comments[i].email
        allText += this.mkTimestamp(comments[i].timestamp)
        if (allText.includes(this.$store.state.filterForComment)) {
          filteredComments.push(comments[i])
        }
      }
      return filteredComments
    },

    getAttachments() {
      if (this.$store.state.currentDoc._attachments) {
        const titles = Object.keys(this.$store.state.currentDoc._attachments)
        const attachments = []
        for (let title of titles) {
          attachments.push({ title, data: this.$store.state.currentDoc._attachments[title] })
        }
        return attachments
      } else return null
    },

    getFilteredHistory() {
      function removeImages(text) {
        let pos1 = text.indexOf('<img src="')
        if (pos1 === -1) return text
        else {
          let pos2 = text.indexOf('">', pos1 + 1)
          let image = text.slice(pos1, pos2 + 1)
          text = text.replace(image, '')
          return removeImages(text)
        }
      }
      let filteredHistory = []
      for (let i = 0; i < this.$store.state.currentDoc.history.length; i++) {
        let histItem = this.$store.state.currentDoc.history[i]
        let allText = ""
        let keys = Object.keys(histItem)
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] === "rootEvent") allText += this.mkRootEvent(histItem[keys[j]])
          if (keys[j] === "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
          if (keys[j] === "createRootEvent") allText += this.mkCreateRootEvent(histItem[keys[j]])
          if (keys[j] === "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
          if (keys[j] === "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
          if (keys[j] === "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
          if (keys[j] === "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
          if (keys[j] === "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
          if (keys[j] === "setTeamEvent") allText += this.mkSetTeamEvent(histItem[keys[j]])
          if (keys[j] === "setTeamEventDescendant") allText += this.mkSetTeamEventDescendant(histItem[keys[j]])
          if (keys[j] === "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
          if (keys[j] === "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
          if (keys[j] === "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
          if (keys[j] === "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
          if (keys[j] === "nodeDroppedEvent") allText += this.mkNodeDroppedEvent(histItem[keys[j]])
          if (keys[j] === "descendantMoved") allText += this.mkDescendantMoved(histItem[keys[j]])
          if (keys[j] === "removedFromParentEvent") allText += this.mkRemovedFromParentEvent(histItem[keys[j]])
          if (keys[j] === "parentDocRemovedEvent") allText += this.mkParentDocRemovedEvent(histItem[keys[j]])
          if (keys[j] === "docRemovedEvent") allText += this.mkDocRemovedEvent(histItem[keys[j]])
          if (keys[j] === "grandParentDocRestoredEvent") allText += this.mkGrandParentDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "docRestoredInsideEvent") allText += this.mkDocRestoredInsideEvent(histItem[keys[j]])
          if (keys[j] === "docRestoredEvent") allText += this.mkDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "uploadAttachmentEvent") allText += this.mkUploadAttachmentEvent(histItem[keys[j]])
          if (keys[j] === "removeAttachmentEvent") allText += this.mkRemoveAttachmentEvent(histItem[keys[j]])
          if (keys[j] === "by") allText += this.mkBy(histItem[keys[j]])
          if (keys[j] === "email") allText += this.mkEmail(histItem[keys[j]])
          if (keys[j] === "timestamp") allText += this.mkTimestamp(histItem[keys[j]])
        }
        if (allText.includes(this.$store.state.filterForHistory)) {
          filteredHistory.push(histItem)
        }
      }
      return filteredHistory
    }
  },

  methods: {
    showAttachment(attachment) {
      const _id = this.$store.state.currentDoc._id
      const url = 'https://onebacklog.net:6984/' + this.$store.state.userData.currentDb + '/' + _id + '/' + attachment.title
      window.open(url)
    },

    removeAttachment(attachment) {
      this.$store.dispatch('removeAttachment', attachment.title)
    },

    prepHistoryText(key, value) {
      if (key === "rootEvent") return this.mkRootEvent(value)
      if (key === "comment") return this.mkComment(value)
      if (key === "uploadAttachmentEvent") return this.mkUploadAttachmentEvent(value)
      if (key === "removeAttachmentEvent") return this.mkRemoveAttachmentEvent(value)
      if (key === "subscribeEvent") return this.mkSubscribeEvent(value)
      if (key === "createRootEvent") return this.mkCreateRootEvent(value)
      if (key === "createEvent") return this.mkCreateEvent(value)
      if (key === "setSizeEvent") return this.mkSetSizeEvent(value)
      if (key === "setPointsEvent") return this.mkSetPointsEvent(value)
      if (key === "setHrsEvent") return this.mkSetHrsEvent(value)
      if (key === "setStateEvent") return this.mkSetStateEvent(value)
      if (key === "setTeamEvent") return this.mkSetTeamEvent(value)
      if (key === "setTeamEventDescendant") return this.mkSetTeamEventDescendant(value)
      if (key === "setTitleEvent") return this.mkSetTitleEvent(value)
      if (key === "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
      if (key === "descriptionEvent") return this.mkDescriptionEvent(value)
      if (key === "acceptanceEvent") return this.mkAcceptanceEvent(value)
      if (key === "nodeDroppedEvent") return this.mkNodeDroppedEvent(value)
      if (key === "descendantMoved") return this.mkDescendantMoved(value)
      if (key === "removedFromParentEvent") return this.mkRemovedFromParentEvent(value)
      if (key === "parentDocRemovedEvent") return this.mkParentDocRemovedEvent(value)
      if (key === "docRemovedEvent") return this.mkDocRemovedEvent(value)
      if (key === "grandParentDocRestoredEvent") return this.mkGrandParentDocRestoredEvent(value)
      if (key === "docRestoredInsideEvent") return this.mkDocRestoredInsideEvent(value)
      if (key === "docRestoredEvent") return this.mkDocRestoredEvent(value)
      if (key === "by") return this.mkBy(value)
      if (key === "email") return this.mkEmail(value)
      if (key === "timestamp") return this.mkTimestamp(value)
    },

    prepCommentsText(key, value) {
      if (key === "comment") return this.mkComment(value)
      if (key === "by") return this.mkBy(value)
      if (key === "email") return this.mkEmail(value)
      if (key === "timestamp") return this.mkTimestamp(value)
    },

    /* Presentation methods */
    mkSubscribeEvent(value) {
      if (value[0]) {
        return "<h5>You unsubscribed for messages about this backlog item.</h5>"
      } else {
        return "<h5>You subscribed to receive messages about this backlog item.</h5>"
      }
    },

    mkCreateRootEvent(value) {
      return "<h5>The root document was created for database " + value[0] + "</h5>"
    },

    mkCreateEvent(value) {
      return "<h5>This " + this.getLevelText(value[0]) + " was created under parent '" + value[1] + "'</h5>"
    },

    mkSetSizeEvent(value) {
      return "<h5>T-Shirt estimate changed from </h5>" + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
    },

    mkSetPointsEvent(value) {
      return "<h5>Storypoints estimate changed from " + value[0] + ' to ' + value[1] + "</h5>"
    },

    mkSetHrsEvent(value) {
      return "<h5>Spike estimate hours changed from " + value[0] + ' to ' + value[1] + "</h5>"
    },

    mkSetStateEvent(value) {
      const s1 = "<h5>The state of the item has changed from '" + this.getItemStateText(value[0]) + "' to '" + this.getItemStateText(value[1]) + "'</h5>"
      const s2 = "<h5>, the team is set to '" + value[2] + "'</h5>"
      if (value[2]) { return s1 + s2 } else return s1
    },

    mkSetTeamEvent(value) {
      return "<h5>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> including " + value[2] + " descendants</h5>"
    },

    mkSetTeamEventDescendant(value) {
      return "<h5>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> as descendant of '" + value[2] + "'</h5>"
    },

    mkSetTitleEvent(value) {
      return "<h5>The item  title has changed from: </h5>'" + value[0] + "' to '" + value[1] + "'"
    },

    mkSetSubTypeEvent(value) {
      return "<h5>The pbi subtype has changed from: </h5>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'"
    },

    mkDescriptionEvent(value) {
      return "<h5>The description of the item has changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkAcceptanceEvent(value) {
      return "<h5>The acceptance criteria of the item have changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkNodeDroppedEvent(value) {
      let txt
      if (value[5]) { txt = "<h5>The item was moved from product '" + value[5] + "' to this product.</h5>" } else txt = ''
      if (value[0] === value[1]) {
        txt += "<h5>The item changed priority to position " + (value[2] + 1) + " " + value[6] + " '" + value[3] + "'</h5>"
        txt += (value[4] > 0) ? "<p>" + value[4] + " descendants were also moved.</p>" : ""
        return txt
      } else {
        txt += "<h5>The item changed type from " + this.getLevelText(value[0]) + " to " + this.getLevelText(value[1]) + ".</h5>"
        txt += "<p>The new position is " + (value[2] + 1) + " under parent '" + value[3] + "'</p>"
        txt += (value[4] > 0) ? "<p>" + value[4] + " descendants also changed type.</p>" : ""
        return txt
      }
    },

    mkDescendantMoved(value) {
      return "<h5>Item was moved as descendant from '" + value[0] + "'</h5>"
    },

    mkRemovedFromParentEvent(value) {
      return "<h5>" + this.getLevelText(value[0]) + " with title '" + value[1] + "' and " + value[2] + " descendants are removed from this parent</h5>"
    },

    mkParentDocRemovedEvent(value) {
      return "<h5> This item and " + value[0] + " descendants are removed</h5>"
    },

    mkDocRemovedEvent(value) {
      return "<h5>This item has been removed as descendant of " + value[0] + "</h5>"
    },

    mkGrandParentDocRestoredEvent(value) {
      return "<h5>" + this.getLevelText(value[0]) + " with title '" + value[1] + "' and " + value[2] + " descendants are restored from removal</h5>"
    },

    mkDocRestoredInsideEvent(value) {
      return "<h5>This item and " + value[0] + " descendants are restored from removal</h5>"
    },

    mkDocRestoredEvent() {
      return "<h5>This item has been restored from removal</h5>"
    },

    mkBy(value) {
      return "by: " + value
    },

    mkEmail(value) {
      return "email: " + value
    },

    mkTimestamp(value) {
      return "timestamp: " + new Date(value).toString() + "<br><br>"
    },

    mkComment(value) {
      return window.atob(value[0])
    },

    mkUploadAttachmentEvent(value) {
      return "<h5>Attachment with title '" + value[0] + "' of type " + value[2] + " and size " + value[1] + " is uploaded.</h5>"
    },

    mkRemoveAttachmentEvent(value) {
      return "<h5>Attachment with title '" + value[0] + "' is removed.</h5>"
    },

    mkRootEvent(value) {
      return "<h5>" + value[0] + "</h5>"
    }
  }
}
</script>

<style scoped>
.space {
  margin: 3px;
}
.btn-seablue {
  background-color: rgb(220, 223, 217);
  color: #408fae;
}
</style>
