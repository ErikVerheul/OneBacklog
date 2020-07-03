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

const computed = {
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
      if (keys[0] === "ignoreEvent" || keys[0] === "updateTaskOrderEvent") continue

      for (let j = 0; j < keys.length; j++) {
        if (keys[j] === "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
        if (keys[j] === "cloneEvent") allText += this.mkCloneEvent(histItem[keys[j]])
        if (keys[j] === "commentToHistoryEvent") allText += this.mkCommentToHistoryEvent(histItem[keys[j]])
        if (keys[j] === "conditionRemovedEvent") allText += this.mkConditionRemovedEvent(histItem[keys[j]])
        if (keys[j] === "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
        if (keys[j] === "createTaskEvent") allText += this.mkCreateTaskEvent(histItem[keys[j]])
        if (keys[j] === "createRootEvent") allText += this.mkCreateRootEvent(histItem[keys[j]])
        if (keys[j] === "dependencyRemovedEvent") allText += this.mkDependencyRemovedEvent(histItem[keys[j]])
        if (keys[j] === "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
        if (keys[j] === "docRestoredEvent") allText += this.mkDocRestoredEvent(histItem[keys[j]])
        if (keys[j] === "grandParentDocRestoredEvent") allText += this.mkGrandParentDocRestoredEvent(histItem[keys[j]])
        if (keys[j] === "importToSprintEvent") allText += this.mkImportToSprintEvent(histItem[keys[j]])
        if (keys[j] === "newChildEvent") allText += this.mkNewChildEvent(histItem[keys[j]])
        if (keys[j] === "nodeMovedEvent") allText += this.mkNodeMovedEvent(histItem[keys[j]])
        if (keys[j] === "removeAttachmentEvent") allText += this.mkRemoveAttachmentEvent(histItem[keys[j]])
        if (keys[j] === "removedFromParentEvent") allText += this.mkRemovedFromParentEvent(histItem[keys[j]])
        if (keys[j] === "removedWithDescendantsEvent") allText += this.mkRemovedWithDescendantsEvent(histItem[keys[j]])
        if (keys[j] === "setConditionEvent") allText += this.mkSetConditionsEvent(histItem[keys[j]])
        if (keys[j] === "setDependencyEvent") allText += this.mkSetDependenciesEvent(histItem[keys[j]])
        if (keys[j] === "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
        if (keys[j] === "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
        if (keys[j] === "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
        if (keys[j] === "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
        if (keys[j] === "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
        if (keys[j] === "setTeamEventDescendant") allText += this.mkSetTeamEventDescendant(histItem[keys[j]])
        if (keys[j] === "setTeamOwnerEvent") allText += this.mkSetTeamOwnerEvent(histItem[keys[j]])
        if (keys[j] === "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
        if (keys[j] === "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
        if (keys[j] === "taskRemovedEvent") allText += this.mkTaskRemovedEvent(histItem[keys[j]])
        if (keys[j] === "updateTaskOwnerEvent") allText += this.mkUpdateTaskOwnerEvent(histItem[keys[j]])
        if (keys[j] === "uploadAttachmentEvent") allText += this.mkUploadAttachmentEvent(histItem[keys[j]])
        if (keys[j] === "resetHistoryEvent") allText += this.mkResetHistoryEvent(histItem[keys[j]])
        if (keys[j] === "addSprintIdsEvent") allText += this.mkAddSprintIdsEvent(histItem[keys[j]])
        if (keys[j] === "removeSprintIdsEvent") allText += this.mkRemoveSprintIdsEvent(histItem[keys[j]])

        if (keys[j] === "by") allText += this.mkBy(histItem[keys[j]])
        if (keys[j] === "timestamp") allText += this.mkTimestamp(histItem[keys[j]])
      }
      if (allText.includes(this.$store.state.filterForHistory)) {
        filteredHistory.push(histItem)
      }
    }
    return filteredHistory
  }
}

const methods = {
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
    if (key === "createTaskEvent") return this.mkCreateTaskEvent(value)
    if (key === "createRootEvent") return this.mkCreateRootEvent(value)
    if (key === "dependencyRemovedEvent") return this.mkDependencyRemovedEvent(value)
    if (key === "descriptionEvent") return this.mkDescriptionEvent(value)
    if (key === "docRestoredEvent") return this.mkDocRestoredEvent(value)
    if (key === "grandParentDocRestoredEvent") return this.mkGrandParentDocRestoredEvent(value)
    if (key === "importToSprintEvent") return this.mkImportToSprintEvent(value)
    if (key === "newChildEvent") return this.mkNewChildEvent(value)
    if (key === "nodeMovedEvent") return this.mkNodeMovedEvent(value)
    if (key === "removeAttachmentEvent") return this.mkRemoveAttachmentEvent(value)
    if (key === "removedFromParentEvent") return this.mkRemovedFromParentEvent(value)
    if (key === "removedWithDescendantsEvent") return this.mkRemovedWithDescendantsEvent(value)
    if (key === "setConditionEvent") return this.mkSetConditionsEvent(value)
    if (key === "setDependencyEvent") return this.mkSetDependenciesEvent(value)
    if (key === "setHrsEvent") return this.mkSetHrsEvent(value)
    if (key === "setPointsEvent") return this.mkSetPointsEvent(value)
    if (key === "setSizeEvent") return this.mkSetSizeEvent(value)
    if (key === "setStateEvent") return this.mkSetStateEvent(value)
    if (key === "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
    if (key === "setTeamEventDescendant") return this.mkSetTeamEventDescendant(value)
    if (key === "setTeamOwnerEvent") return this.mkSetTeamOwnerEvent(value)
    if (key === "setTitleEvent") return this.mkSetTitleEvent(value)
    if (key === "subscribeEvent") return this.mkSubscribeEvent(value)
    if (key === "taskRemovedEvent") return this.mkTaskRemovedEvent(value)
    if (key === "updateTaskOwnerEvent") return this.mkUpdateTaskOwnerEvent(value)
    if (key === "uploadAttachmentEvent") return this.mkUploadAttachmentEvent(value)
    if (key === "resetHistoryEvent") return this.mkResetHistoryEvent(value)
    if (key === "addSprintIdsEvent") return this.mkAddSprintIdsEvent(value)
    if (key === "removeSprintIdsEvent") return this.mkRemoveSprintIdsEvent(value)

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
      return "<h5>User unsubscribed for messages about this backlog item.</h5>"
    } else {
      return "<h5>User subscribed to receive messages about this backlog item.</h5>"
    }
  },

  mkCreateRootEvent(value) {
    return "<h5>The root document was created for database " + value[0] + ".</h5>"
  },

  mkCreateEvent(value) {
    return `<h5>This ${this.getLevelText(value[0])} was created under parent '${value[1]}' at position ${value[2]}.</h5>`
  },

  mkCreateTaskEvent(value) {
    return `<h5>This task was created under parent '${value[0]}'.</h5>`
  },

  mkConditionRemovedEvent(value) {
    let s
    if (value[1]) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`}
    else if (value[0].length === 1) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` }
    else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h5>${s}</h5>`
  },

  mkDependencyRemovedEvent(value) {
    let s
    if (value[1]) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`}
    else if (value[0].length === 1) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` }
    else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h5>${s}</h5>`
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
    return `<h5>The item state changed from '${this.getItemStateText(value[0])}' to '${this.getItemStateText(value[1])}'</h5>` +
      `<p>This backlog item is realized by team '${value[2]}'</p>`
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

  mkNodeMovedEvent(value) {
    const moveType = value[13] === 'undoMove' ? ' back' : ''
    let txt
    if (value[7] !== value[8]) { txt = `<h5>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}.</h5>` } else txt = ''
    if (value[0] === value[1]) {
      txt += `<h5>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h5>`
      txt += (value[4] > 0) ? `<p>${value[4]} children were also moved.</p>` : ""
      return txt
    } else {
      txt += `<h5>The item changed type from ${this.getLevelText(value[0])} to ${this.getLevelText(value[1])}.</h5>`
      txt += `<p>The new position is ${(value[2] + 1)} under parent '${value[3]}'</p>`
      txt += (value[4] > 0) ? `<p>${value[4]} children also changed type.</p>` : ""
      return txt
    }
  },

  mkRemovedFromParentEvent(value) {
    return `<h5>The ${this.getLevelText(value[0], value[3])} with title '${value[1]}' and ${value[2]} descendants are removed from this parent.</h5>`
  },

  mkRemovedWithDescendantsEvent(value) {
    return `<h5>This item and ${value[1].length} descendants are removed.</h5>
      <p>From the descendants ${value[2]} external dependencies and ${value[3]} external conditions were removed.</p>`
  },

  mkGrandParentDocRestoredEvent(value) {
    return `<h5>The ${this.getLevelText(value[0], value[3])} with title '${value[1]}' and ${value[2]} descendants are restored from removal.</h5>`
  },

  mkImportToSprintEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} was imported from sprint '${value[2]}' to sprint '${value[3]}'.</h5>`
  },

  mkNewChildEvent(value) {
    return `<h5>A ${this.getLevelText(value[0])} was created as a child of this item at position ${value[1]}.</h5>`
  },

  mkDocRestoredEvent(value) {
    return `<h5>This item and ${value[0]} descendants are restored from removal.</h5>`
  },

  mkSetConditionsEvent(value) {
    if (value[2]) return `<h5>The previous condition set for item '${value[1]} is undone'.</h5>`
    return `<h5>This item is set to be conditional for item '${value[1]}'.</h5>`
  },

  mkSetDependenciesEvent(value) {
    if (value[2]) return `<h5>The previous dependency set on item '${value[1]} is undone'.</h5>`
    return `<h5>This item is set to be dependent on item '${value[1]}'.</h5>`
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

  mkTaskRemovedEvent(value) {
    return `<h5>This task is removed from story '${value[0]}'.</h5>`
  },

  mkUpdateTaskOwnerEvent(value) {
    return `<h5>Task owner is changed from '${value[0]}' to '${value[1]}'.</h5>`
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
    return `<h5> ${value[0]} History items are removed.</h5>`
  },

  mkAddSprintIdsEvent(value) {
   let txt =  `This ${this.getLevelText(value[0], value[1])} is assigned to sprint '${value[2]}'.`
   if (value[3]) txt += ` The item was assigned to a sprint before.`
   return `<h5> ${txt} </h5>`
  },

  mkRemoveSprintIdsEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} is removed from sprint '${value[2]}</h5>`
  },

  mkResetCommentsEvent(value) {
    return `<h5> ${value[0]} Comment items are removed.</h5>`
  },

  mkCloneEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} has been cloned as item of product '${value[2]}'.</h5>`
  }
}

export default {
  mixins: [utilities],
  computed,
  methods
}
