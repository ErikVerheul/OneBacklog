<template lang="html">
  <div>
    <ul v-if="$store.state.selectedForView==='comments'">
      <li v-for="comment in getFilteredComments" :key="comment.timestamp">
        <div v-for="(value, key) in comment" :key="key">
          <div v-html="prepCommentsText(key, value)"></div>
        </div>
      </li>
    </ul>
    <ul v-if="$store.state.selectedForView==='attachments'">
      <div v-if="!isUploadDone">loading...</div>
      <div v-for="(attach, index) in getAttachments()" :key="attach.title + attach.data.digest">
        <span>
          <template v-if="getNrOfTitles() > 1">
            {{ index + 1 }}/{{ getNrOfTitles() }}
          </template>
          <b-button class="space3px" variant="seablue" @click="showAttachment(attach)"> {{ attach.title }} </b-button>
          <b-button class="space3px" variant="danger" @click="removeAttachment(attach)">X</b-button>
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

const baseURL = 'https://onebacklog.net:6984/'

function convertToShortIds(ids) {
  if (!ids || ids.length === 0) return 'none'

  const shortIds = []
  for (let id of ids) {
    if (id === null) continue
    shortIds.push(id.slice(-5))
  }
  if (shortIds.length === 0) return 'none'
  return shortIds
}

export default {
  mixins: [utilities],

  computed: {
    isUploadDone() {
      // force a re-render
      this.$forceUpdate()
      return this.$store.state.uploadDone
    },

    getFilteredComments() {
      let filteredComments = []
      let comments = this.$store.state.currentDoc.comments
      let allText = ""
      for (let c of comments) {
        if (c.ignoreEvent) continue

        if (c.addCommentEvent) {
          const comment = window.atob(c.addCommentEvent)
          allText += comment
        }
        if (c.resetCommentsEvent) {
          const comment = c.resetCommentsEvent
          allText += comment
        }
        allText += c.by
        allText += this.mkTimestamp(c.timestamp)
        if (allText.includes(this.$store.state.filterForComment)) {
          filteredComments.push(c)
        }
      }
      return filteredComments
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
        if (keys[0] === "ignoreEvent") continue
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] === "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
          if (keys[j] === "cloneEvent") allText += this.mkCloneEvent(histItem[keys[j]])
          if (keys[j] === "commentToHistoryEvent") allText += this.mkCommentToHistoryEvent(histItem[keys[j]])
          if (keys[j] === "conditionRemovedEvent") allText += this.mkConditionRemovedEvent(histItem[keys[j]])
          if (keys[j] === "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
          if (keys[j] === "createRootEvent") allText += this.mkCreateRootEvent(histItem[keys[j]])
          if (keys[j] === "dependencyRemovedEvent") allText += this.mkDependencyRemovedEvent(histItem[keys[j]])
          if (keys[j] === "descendantMoved") allText += this.mkDescendantMoved(histItem[keys[j]])
          if (keys[j] === "descendantUndoMove") allText += this.mkDescendantUndoMove(histItem[keys[j]])
          if (keys[j] === "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
          if (keys[j] === "docRemovedDescendantEvent") allText += this.mkDocRemovedDescendantEvent(histItem[keys[j]])
          if (keys[j] === "docRestoredEvent") allText += this.mkDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "grandParentDocRestoredEvent") allText += this.mkGrandParentDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "newChildEvent") allText += this.mkNewChildEvent(histItem[keys[j]])
          if (keys[j] === "nodeDroppedEvent") allText += this.mkNodeDroppedEvent(histItem[keys[j]])
          if (keys[j] === "nodeUndoMoveEvent") allText += this.mkNodeUndoMoveEvent(histItem[keys[j]])
          if (keys[j] === "removeAttachmentEvent") allText += this.mkRemoveAttachmentEvent(histItem[keys[j]])
          if (keys[j] === "removedFromParentEvent") allText += this.mkRemovedFromParentEvent(histItem[keys[j]])
          if (keys[j] === "removeParentEvent") allText += this.mkRemoveParentEvent(histItem[keys[j]])
          if (keys[j] === "setConditionsEvent") allText += this.mkSetConditionsEvent(histItem[keys[j]])
          if (keys[j] === "setDependenciesEvent") allText += this.mkSetDependenciesEvent(histItem[keys[j]])
          if (keys[j] === "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
          if (keys[j] === "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
          if (keys[j] === "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
          if (keys[j] === "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
          if (keys[j] === "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
          if (keys[j] === "setTeamEventDescendant") allText += this.mkSetTeamEventDescendant(histItem[keys[j]])
          if (keys[j] === "setTeamOwnerEvent") allText += this.mkSetTeamOwnerEvent(histItem[keys[j]])
          if (keys[j] === "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
          if (keys[j] === "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
          if (keys[j] === "uploadAttachmentEvent") allText += this.mkUploadAttachmentEvent(histItem[keys[j]])
          if (keys[j] === "resetHistoryEvent") allText += this.mkResetHistoryEvent(histItem[keys[j]])

          if (keys[j] === "by") allText += this.mkBy(histItem[keys[j]])
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
    getAttachments() {
      if (this.$store.state.currentDoc._attachments) {
        let titles = Object.keys(this.$store.state.currentDoc._attachments)
        const attachmentObjects = []
        for (let title of titles) {
          attachmentObjects.push({ title, data: this.$store.state.currentDoc._attachments[title] })
        }
        return attachmentObjects
      } else return []
    },

    getNrOfTitles() {
      return this.$store.state.currentDoc._attachments ? Object.keys(this.$store.state.currentDoc._attachments).length : 0
    },

    showAttachment(attachment) {
      const _id = this.$store.state.currentDoc._id
      const url = baseURL + this.$store.state.userData.currentDb + '/' + _id + '/' + attachment.title
      window.open(url)
    },

    removeAttachment(attachment) {
      delete this.$store.state.currentDoc._attachments[attachment.title]
      // force a re-render
      this.$forceUpdate()
      this.$store.dispatch('removeAttachmentAsync', attachment.title)
    },

    prepHistoryText(key, value) {
      if (key === "acceptanceEvent") return this.mkAcceptanceEvent(value)
      if (key === "cloneEvent") return this.mkCloneEvent(value)
      if (key === "commentToHistoryEvent") return this.mkCommentToHistoryEvent(value)
      if (key === "conditionRemovedEvent") return this.mkConditionRemovedEvent(value)
      if (key === "createEvent") return this.mkCreateEvent(value)
      if (key === "createRootEvent") return this.mkCreateRootEvent(value)
      if (key === "dependencyRemovedEvent") return this.mkDependencyRemovedEvent(value)
      if (key === "descendantMoved") return this.mkDescendantMoved(value)
      if (key === "descendantUndoMove") return this.mkDescendantUndoMove(value)
      if (key === "descriptionEvent") return this.mkDescriptionEvent(value)
      if (key === "docRemovedDescendantEvent") return this.mkDocRemovedDescendantEvent(value)
      if (key === "docRestoredEvent") return this.mkDocRestoredEvent(value)
      if (key === "grandParentDocRestoredEvent") return this.mkGrandParentDocRestoredEvent(value)
      if (key === "newChildEvent") return this.mkNewChildEvent(value)
      if (key === "nodeDroppedEvent") return this.mkNodeDroppedEvent(value)
      if (key === "nodeUndoMoveEvent") return this.mkNodeUndoMoveEvent(value)
      if (key === "removeAttachmentEvent") return this.mkRemoveAttachmentEvent(value)
      if (key === "removedFromParentEvent") return this.mkRemovedFromParentEvent(value)
      if (key === "removeParentEvent") return this.mkRemoveParentEvent(value)
      if (key === "setConditionsEvent") return this.mkSetConditionsEvent(value)
      if (key === "setDependenciesEvent") return this.mkSetDependenciesEvent(value)
      if (key === "setHrsEvent") return this.mkSetHrsEvent(value)
      if (key === "setPointsEvent") return this.mkSetPointsEvent(value)
      if (key === "setSizeEvent") return this.mkSetSizeEvent(value)
      if (key === "setStateEvent") return this.mkSetStateEvent(value)
      if (key === "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
      if (key === "setTeamEventDescendant") return this.mkSetTeamEventDescendant(value)
      if (key === "setTeamOwnerEvent") return this.mkSetTeamOwnerEvent(value)
      if (key === "setTitleEvent") return this.mkSetTitleEvent(value)
      if (key === "subscribeEvent") return this.mkSubscribeEvent(value)
      if (key === "uploadAttachmentEvent") return this.mkUploadAttachmentEvent(value)
      if (key === "resetHistoryEvent") return this.mkResetHistoryEvent(value)

      if (key === "by") return this.mkBy(value)
      if (key === "timestamp") return this.mkTimestamp(value)
    },

    prepCommentsText(key, value) {
      if (key === "addCommentEvent") return this.mkComment(value)
      if (key === "resetCommentsEvent") return this.mkResetCommentsEvent(value)
      if (key === "by") return this.mkBy(value)
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
      return "<h5>The root document was created for database " + value[0] + ".</h5>"
    },

    mkCreateEvent(value) {
      return `<h5>This ${this.getLevelText(value[0])} was created under parent '${value[1]}' at position ${value[2]}.</h5>`
    },

    mkConditionRemovedEvent(value) {
      return `<h5>The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.</h5>`
    },

    mkDependencyRemovedEvent(value) {
      return `<h5>The dependencies on items ${convertToShortIds(value[0])} (short Ids) were removed from this item.</h5>`
    },

    mkSetSizeEvent(value) {
      return "<h5>T-Shirt estimate changed from </h5>" + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
    },

    mkSetPointsEvent(value) {
      return "<h5>Storypoints estimate changed from " + value[0] + ' to ' + value[1] + ".</h5>"
    },

    mkSetHrsEvent(value) {
      return "<h5>Spike estimate hours changed from " + value[0] + ' to ' + value[1] + ".</h5>"
    },

    mkSetStateEvent(value) {
      const s1 = "<h5>The state of the item has changed from '" + this.getItemStateText(value[0]) + "' to '" + this.getItemStateText(value[1]) + "'</h5>"
      const s2 = "<h5>, the team is set to '" + value[2] + "'.</h5>"
      if (value[2]) { return s1 + s2 } else return s1
    },

    mkSetTeamOwnerEvent(value) {
      return "<h5>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> including " + value[2] + " descendants.</h5>"
    },

    mkSetTeamEventDescendant(value) {
      return "<h5>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> as descendant of '" + value[2] + "'.</h5>"
    },

    mkSetTitleEvent(value) {
      return "<h5>The item title has changed from: </h5>'" + value[0] + "' to '" + value[1] + "'."
    },

    mkSetSubTypeEvent(value) {
      return "<h5>The pbi subtype has changed from: </h5>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'."
    },

    mkDescriptionEvent(value) {
      return "<h5>The description of the item has changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkAcceptanceEvent(value) {
      return "<h5>The acceptance criteria of the item have changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkNodeDroppedEvent(value) {
      let txt
      if (value[7] !== value[8]) { txt = `<h5>The item was moved from parent '${value[5]}', position ${value[9] + 1}.</h5>` } else txt = ''
      if (value[0] === value[1]) {
        txt += `<h5>The item changed priority to position ${value[2] + 1} ${value[6]} '${value[3]}'</h5>`
        txt += (value[4] > 0) ? `<p>${value[4]} descendants were also moved.</p>` : ""
        return txt
      } else {
        txt += `<h5>The item changed type from ${this.getLevelText(value[0])} to ${this.getLevelText(value[1])}.</h5>`
        txt += `<p>The new position is ${(value[2] + 1)} under parent '${value[3]}'</p>`
        txt += (value[4] > 0) ? `<p>${value[4]} descendants also changed type.</p>` : ""
        return txt
      }
    },

    mkNodeUndoMoveEvent(value) {
      return `<h5>The previous move by user '${value[0]}' is undone</h5>`
    },

    mkDescendantMoved(value) {
      return "<h5>Item was moved as descendant of '" + value[0] + "'.</h5>"
    },

    mkDescendantUndoMove(value) {
      return "<h5>The move of the item is undone by the user as a descendant of '" + value[0] + "'.</h5>"
    },

    mkRemovedFromParentEvent(value) {
      return `<h5>The ${this.getLevelText(value[0], value[3])} with title '${value[1]}' and ${value[2]} descendants are removed from this parent.</h5>
        <p>From the descendants ${value[4]} external dependencies and ${value[5]} external conditions were removed.</p>`
    },

    mkDocRemovedDescendantEvent(value) {
      return `<h5>This item was removed as descendant of ${this.getLevelText(value[0], value[1])} '${value[2]}'</h5>`
    },

    mkRemoveParentEvent(value) {
      return `<h5>This item and ${value[0].length} descendants are removed.</h5>
        <p>From the descendants ${value[1]} external dependencies and ${value[2]} external conditions were removed.</p>`
    },

    mkGrandParentDocRestoredEvent(value) {
      return `<h5>The ${this.getLevelText(value[0], value[3])} with title '${value[1]}' and ${value[2]} descendants are restored from removal.</h5>`
    },

    mkNewChildEvent(value) {
      return `<h5>A ${this.getLevelText(value[0])} was created as a child of this item at position ${value[1]}.</h5>`
    },

    mkDocRestoredEvent(value) {
      return `<h5>This item and ${value[0]} descendants are restored from removal.</h5>`
    },

    mkSetDependenciesEvent(value) {
      return `<h5>Dependencies set for this item changed from '${convertToShortIds(value[0])}' to '${convertToShortIds(value[1])}' (short Ids).</h5>`
    },

    mkSetConditionsEvent(value) {
      return `<h5>Conditions set for this item changed from '${convertToShortIds(value[1])}' to '${convertToShortIds(value[2])}' (short Ids).</h5>`
    },

    mkBy(value) {
      return "by: " + value
    },

    mkTimestamp(value) {
      return "timestamp: " + new Date(value).toString() + "<br><br>"
    },

    mkComment(value) {
      return window.atob(value)
    },

    mkUploadAttachmentEvent(value) {
      return "<h5>Attachment with title '" + value[0] + "' of type " + value[2] + " and size " + value[1] + " is uploaded.</h5>"
    },

    mkCommentToHistoryEvent(value) {
      return window.atob(value[0])
    },

    mkRemoveAttachmentEvent(value) {
      return "<h5>Attachment with title '" + value[0] + "' is removed.</h5>"
    },

    mkResetHistoryEvent(value) {
      return "<h5>" + value[0] + ".</h5>"
    },

    mkResetCommentsEvent(value) {
      return "<h5>" + value + ".</h5>"
    },

    mkCloneEvent(value) {
      return `<h5>This ${this.getLevelText(value[0], value[1])} has been cloned as item of product '${value[2]}'.</h5>`
    }
  }
}
</script>

<style scoped>
.space3px {
  margin: 3px;
}
.btn-seablue {
  background-color: rgb(220, 223, 217);
  color: #408fae;
}
</style>
