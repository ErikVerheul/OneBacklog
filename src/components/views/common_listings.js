import { utilities } from '../mixins/generic.js'
import { atou } from '../../common_functions.js'
import store from '../../store/store.js'


function convertToShortIds(ids) {
  if (!ids || ids.length === 0) return 'none'

  const shortIds = []
  for (const id of ids) {
    if (id === null) continue
    shortIds.push(id.slice(-5))
  }
  if (shortIds.length === 0) return 'none'
  return shortIds
}

/* Remove all images from a html text */
function removeImages(html) {
  const pos1 = html.indexOf('<img src="')
  if (pos1 === -1) return html
  else {
    const pos2 = html.indexOf('">', pos1 + 1)
    const image = html.slice(pos1, pos2 + 2)
    html = html.replace(image, '')
    return removeImages(html)
  }
}

const computed = {
  isUploadDone() {
    return store.state.uploadDone
  },

  /* Loop over all comments and concatenate the text if filterForCommentSearchString is a substring in the text of that comment */
  getFilteredComments() {
    const filteredComments = []
    for (const commentItem of store.state.currentDoc.comments) {
      let allText = ''
      // all items in the events list are objects; by default the first 3 keys are: event name, 'by' and 'timestamp'; other keys are not relevant here
      const event = Object.keys(commentItem)[0]
      if (event === 'ignoreEvent') continue

      if (event === 'addCommentEvent') allText += removeImages(this.mkComment(commentItem[event]))
      if (event === 'removeCommentEvent') allText += this.mkRemoveCommentEvent(commentItem[event])
      if (event === 'resetCommentsEvent') allText += this.mkResetCommentsEvent(commentItem[event])

      const by = Object.keys(commentItem)[1]
      if (by === 'by') allText += this.mkBy(commentItem[by])
      const ts = Object.keys(commentItem)[2]
      if (ts === 'timestamp') allText += this.mkTimestamp(commentItem[ts])

      if (allText.toLowerCase().includes(store.state.filterForCommentSearchString.toLowerCase())) {
        filteredComments.push(commentItem)
      }
    }
    return filteredComments
  },

  /*
  * Loop over all history items and concatenate the text if filterForHistorySearchString is a substring in the text of that history item
  * Return an array with the history items that include the search string
  */
  getFilteredHistory() {
    const filteredHistory = []
    for (const histItem of store.state.currentDoc.history) {
      let allText = ''
      // all items in the events list are objects; by default the first 3 keys are: event name, 'by' and 'timestamp'; other keys are not relevant here
      const event = Object.keys(histItem)[0]
      if (event === 'ignoreEvent' || event === 'updateTaskOrderEvent' || event === 'changeReqAreaColorEvent' || event === 'removeItemsFromSprintEvent') continue

      if (event === 'acceptanceEvent') allText += removeImages(this.mkAcceptanceEvent(histItem[event]))
      if (event === 'clonedBranchEvent') allText += this.mkClonedBranchEvent(histItem[event])
      if (event === 'cloneEvent') allText += this.mkCloneEvent(histItem[event])
      if (event === 'commentToHistoryEvent') allText += removeImages(this.mkCommentToHistoryEvent(histItem[event]))
      if (event === 'conditionRemovedEvent') allText += this.mkConditionRemovedEvent(histItem[event])
      if (event === 'createEvent') allText += this.mkCreateEvent(histItem[event])
      if (event === 'createTaskEvent') allText += this.mkCreateTaskEvent(histItem[event])
      if (event === 'createRootEvent') allText += this.mkCreateRootEvent(histItem[event])
      if (event === 'dependencyRemovedEvent') allText += this.mkDependencyRemovedEvent(histItem[event])
      if (event === 'descriptionEvent') allText += removeImages(this.mkDescriptionEvent(histItem[event]))
      if (event === 'importToSprintEvent') allText += this.mkImportToSprintEvent(histItem[event])
      if (event === 'itemRestoredEvent') allText += this.mkItemRestoredEvent(histItem[event])
      if (event === 'newChildEvent') allText += this.mkNewChildEvent(histItem[event])
      if (event === 'nodeMovedEvent') allText += this.mkNodeMovedEvent(histItem[event])
      if (event === 'removeAttachmentEvent') allText += this.mkRemoveAttachmentEvent(histItem[event])
      if (event === 'removeCommentFromHistoryEvent') allText += this.mkRemoveCommentFromHistoryEvent(histItem[event])
      if (event === 'removedWithDescendantsEvent') allText += this.mkRemovedWithDescendantsEvent(histItem[event])
      if (event === 'setConditionEvent') allText += this.mkSetConditionsEvent(histItem[event])
      if (event === 'setDependencyEvent') allText += this.mkSetDependenciesEvent(histItem[event])
      if (event === 'setHrsEvent') allText += this.mkSetHrsEvent(histItem[event])
      if (event === 'setPointsEvent') allText += this.mkSetPointsEvent(histItem[event])
      if (event === 'setSizeEvent') allText += this.mkSetSizeEvent(histItem[event])
      if (event === 'setStateEvent') allText += this.mkSetStateEvent(histItem[event])
      if (event === 'setSubTypeEvent') allText += this.mkSetSubTypeEvent(histItem[event])
      if (event === 'setTeamEventDescendant') allText += this.mkSetTeamEventDescendant(histItem[event])
      if (event === 'setTeamOwnerEvent') allText += this.mkSetTeamOwnerEvent(histItem[event])
      if (event === 'setTitleEvent') allText += this.mkSetTitleEvent(histItem[event])
      if (event === 'subscribeEvent') allText += this.mkSubscribeEvent(histItem[event])
      if (event === 'taskRemovedEvent') allText += this.mkTaskRemovedEvent(histItem[event])
      if (event === 'undoBranchRemovalEvent') allText += this.mkUndoBranchRemovalEvent(histItem[event])
      if (event === 'updateTaskOwnerEvent') allText += this.mkUpdateTaskOwnerEvent(histItem[event])
      if (event === 'uploadAttachmentEvent') allText += this.mkUploadAttachmentEvent(histItem[event])
      if (event === 'resetHistoryEvent') allText += this.mkResetHistoryEvent(histItem[event])
      if (event === 'addSprintIdsEvent') allText += this.mkAddSprintIdsEvent(histItem[event])
      if (event === 'removeSprintIdsEvent') allText += this.mkRemoveSprintIdsEvent(histItem[event])

      const by = Object.keys(histItem)[1]
      if (by === 'by') allText += this.mkBy(histItem[by])
      const ts = Object.keys(histItem)[2]
      if (ts === 'timestamp') allText += this.mkTimestamp(histItem[ts])
      // push anyway if filterForHistorySearchString is empty => selecting all
      if (allText.toLowerCase().includes(store.state.filterForHistorySearchString.toLowerCase())) {
        filteredHistory.push(histItem)
      }
    }
    return filteredHistory
  }
}

const methods = {
  getAttachments() {
    if (store.state.currentDoc._attachments) {
      const titles = Object.keys(store.state.currentDoc._attachments)
      const attachmentObjects = []
      for (const title of titles) {
        attachmentObjects.push({ title, data: store.state.currentDoc._attachments[title] })
      }
      return attachmentObjects
    } else return []
  },

  getNrOfTitles() {
    return store.state.currentDoc._attachments ? Object.keys(store.state.currentDoc._attachments).length : 0
  },

  showAttachment(attachment) {
    const _id = store.state.currentDoc._id
    const url = import.meta.env.VITE_API_URL + '/' + store.state.userData.currentDb + '/' + _id + '/' + attachment.title
    window.open(url)
  },

  removeAttachment(attachment) {
    delete store.state.currentDoc._attachments[attachment.title]
    store.dispatch('removeAttachmentAsync', { node: this.getLastSelectedNode, attachmentTitle: attachment.title })
  },

  prepHistoryText(key, value) {
    if (key === 'acceptanceEvent') return this.mkAcceptanceEvent(value)
    if (key === 'clonedBranchEvent') return this.mkClonedBranchEvent(value)
    if (key === 'cloneEvent') return this.mkCloneEvent(value)
    if (key === 'commentToHistoryEvent') return this.mkCommentToHistoryEvent(value)
    if (key === 'conditionRemovedEvent') return this.mkConditionRemovedEvent(value)
    if (key === 'createEvent') return this.mkCreateEvent(value)
    if (key === 'createTaskEvent') return this.mkCreateTaskEvent(value)
    if (key === 'createRootEvent') return this.mkCreateRootEvent(value)
    if (key === 'dependencyRemovedEvent') return this.mkDependencyRemovedEvent(value)
    if (key === 'descriptionEvent') return this.mkDescriptionEvent(value)
    if (key === 'importToSprintEvent') return this.mkImportToSprintEvent(value)
    if (key === 'itemRestoredEvent') return this.mkItemRestoredEvent(value)
    if (key === 'newChildEvent') return this.mkNewChildEvent(value)
    if (key === 'nodeMovedEvent') return this.mkNodeMovedEvent(value)
    if (key === 'removeCommentFromHistoryEvent') return this.mkRemoveCommentFromHistoryEvent(value)
    if (key === 'removeAttachmentEvent') return this.mkRemoveAttachmentEvent(value)
    if (key === 'removedWithDescendantsEvent') return this.mkRemovedWithDescendantsEvent(value)
    if (key === 'setConditionEvent') return this.mkSetConditionsEvent(value)
    if (key === 'setDependencyEvent') return this.mkSetDependenciesEvent(value)
    if (key === 'setHrsEvent') return this.mkSetHrsEvent(value)
    if (key === 'setPointsEvent') return this.mkSetPointsEvent(value)
    if (key === 'setSizeEvent') return this.mkSetSizeEvent(value)
    if (key === 'setStateEvent') return this.mkSetStateEvent(value)
    if (key === 'setSubTypeEvent') return this.mkSetSubTypeEvent(value)
    if (key === 'setTeamEventDescendant') return this.mkSetTeamEventDescendant(value)
    if (key === 'setTeamOwnerEvent') return this.mkSetTeamOwnerEvent(value)
    if (key === 'setTitleEvent') return this.mkSetTitleEvent(value)
    if (key === 'subscribeEvent') return this.mkSubscribeEvent(value)
    if (key === 'taskRemovedEvent') return this.mkTaskRemovedEvent(value)
    if (key === 'undoBranchRemovalEvent') return this.mkUndoBranchRemovalEvent(value)
    if (key === 'updateTaskOwnerEvent') return this.mkUpdateTaskOwnerEvent(value)
    if (key === 'uploadAttachmentEvent') return this.mkUploadAttachmentEvent(value)
    if (key === 'resetHistoryEvent') return this.mkResetHistoryEvent(value)
    if (key === 'addSprintIdsEvent') return this.mkAddSprintIdsEvent(value)
    if (key === 'removeSprintIdsEvent') return this.mkRemoveSprintIdsEvent(value)

    if (key === 'by') return this.mkBy(value)
    if (key === 'timestamp') return this.mkTimestamp(value)
  },

  prepCommentsText(key, value) {
    if (key === 'addCommentEvent') return this.mkComment(value)
    if (key === 'removeCommentEvent') return this.mkRemoveCommentEvent(value)
    if (key === 'resetCommentsEvent') return this.mkResetCommentsEvent(value)
    if (key === 'by') return this.mkBy(value)
    if (key === 'timestamp') return this.mkTimestamp(value)
  },

  /* Presentation methods */
  mkSubscribeEvent(value) {
    if (value[0]) {
      return '<h5>User unsubscribed for messages about this backlog item.</h5>'
    } else {
      return '<h5>User subscribed to receive messages about this backlog item.</h5>'
    }
  },

  mkUndoBranchRemovalEvent(value) {
    return `<h5>The ${this.getLevelText(value[9], value[10])} with title '${value[11]}' and ${value[1]} descendants are restored from removal.</h5>`
  },

  mkCreateRootEvent(value) {
    return '<h5>The root document was created for database ' + value[0] + '.</h5>'
  },

  mkCreateEvent(value) {
    return `<h5>This ${this.getLevelText(value[0])} was created under parent '${value[1]}' at position ${value[2]}.</h5>`
  },

  mkCreateTaskEvent(value) {
    return `<h5>This task was created under parent '${value[0]}'.</h5>`
  },

  mkConditionRemovedEvent(value) {
    let s
    if (value[1]) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` } else if (value[0].length === 1) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` } else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h5>${s}</h5>`
  },

  mkDependencyRemovedEvent(value) {
    let s
    if (value[1]) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` } else if (value[0].length === 1) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` } else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h5>${s}</h5>`
  },

  mkSetSizeEvent(value) {
    return '<h5>T-Shirt estimate changed from </h5>' + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
  },

  mkSetPointsEvent(value) {
    return '<h5>Storypoints estimate changed from ' + value[0] + ' to ' + value[1] + '.</h5>'
  },

  mkSetHrsEvent(value) {
    return '<h5>Spike estimate hours changed from ' + value[0] + ' to ' + value[1] + '.</h5>'
  },

  mkSetStateEvent(value) {
    return `<h5>The item state changed from '${this.getItemStateText(value[0])}' to '${this.getItemStateText(value[1])}'</h5>` +
      `<p>This backlog item is realized by team '${value[2]}'</p>`
  },

  mkSetTeamOwnerEvent(value) {
    return "<h5>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> including " + value[2] + ' descendants.</h5>'
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
    return '<h5>The description of the item has changed:<hr></h5>' + atou(value[0]) + '<hr>' + atou(value[1]) + '<hr>'
  },

  mkAcceptanceEvent(value) {
    return '<h5>The acceptance criteria of the item have changed:<hr></h5>' + atou(value[0]) + '<hr>' + atou(value[1]) + '<hr>'
  },

  mkNodeMovedEvent(value) {
    const moveType = value[13] === 'undoMove' ? ' back' : ''
    let txt
    if (value[7] !== value[8]) { txt = `<h5>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}.</h5>` } else txt = ''
    if (value[0] === value[1]) {
      txt += `<h5>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h5>`
      txt += (value[4] > 0) ? `<p>${value[4]} children were also moved.</p>` : ''
      return txt
    } else {
      txt += `<h5>The item changed type from ${this.getLevelText(value[0])} to ${this.getLevelText(value[1])}.</h5>`
      txt += `<p>The new position is ${(value[2] + 1)} under parent '${value[3]}'</p>`
      txt += (value[4] > 0) ? `<p>${value[4]} children also changed type.</p>` : ''
      return txt
    }
  },

  mkRemovedWithDescendantsEvent(value) {
    return `<h5>This item and ${value[1] - 1} descendants are removed.</h5>
      <p>From the descendants ${value[2]} external dependencies and ${value[3]} external conditions were removed.</p>`
  },

  mkImportToSprintEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} was imported from sprint '${value[2]}' to sprint '${value[3]}'.</h5>`
  },

  mkItemRestoredEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} is restored from removal including its descendants.</h5>`
  },

  mkNewChildEvent(value) {
    return `<h5>A ${this.getLevelText(value[0])} was created as a child of this item at position ${value[1]}.</h5>`
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
    return 'by: ' + value
  },

  mkTimestamp(value) {
    return 'timestamp: ' + new Date(value).toString() + '<br><br>'
  },

  mkComment(value) {
    return atou(value[0])
  },

  mkTaskRemovedEvent(value) {
    return `<h5>Task '${value[0]}' is removed by team '${value[1]}'.</h5>`
  },

  mkUpdateTaskOwnerEvent(value) {
    return `<h5>Task owner is changed from '${value[0]}' to '${value[1]}'.</h5>`
  },

  mkUploadAttachmentEvent(value) {
    return "<h5>Attachment with title '" + value[0] + "' of type " + value[2] + ' and size ' + value[1] + ' is uploaded.</h5>'
  },

  mkCommentToHistoryEvent(value) {
    return atou(value[0])
  },

  mkRemoveAttachmentEvent(value) {
    return "<h5>Attachment with title '" + value[0] + "' is removed.</h5>"
  },

  mkRemoveCommentEvent() {
    return `<h5>Your last comment on this ${this.getLevelText(store.state.currentDoc.level, store.state.currentDoc.subtype)} is removed.</h5>`
  },

  mkRemoveCommentFromHistoryEvent() {
    return `<h5>Your last comment on the history of this ${this.getLevelText(store.state.currentDoc.level, store.state.currentDoc.subtype)} is removed.</h5>`
  },

  mkResetHistoryEvent(value) {
    return `<h5> ${value[0]} History items are removed.</h5>`
  },

  mkAddSprintIdsEvent(value) {
    let txt = `This ${this.getLevelText(value[0], value[1])} is assigned to sprint '${value[2]}'.`
    if (value[3]) txt += ' The item was assigned to a sprint before.'
    return `<h5> ${txt} </h5>`
  },

  mkRemoveSprintIdsEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} is removed from sprint '${value[2]}.</h5>`
  },

  mkResetCommentsEvent(value) {
    return `<h5> ${value[0]} Comment items are removed in a cleanup initiated by an admistrator.</h5>`
  },

  mkClonedBranchEvent(value) {
    return `<h5>This ${this.getLevelText(value[0], value[1])} and its descendants have been cloned.</h5>`
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
