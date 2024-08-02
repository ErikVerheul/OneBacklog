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

function replaceEmpty(text) {
  if (text === "" || text === "<p></p>" || text === "<p><br></p>") return "EMPTY TEXT"
  return text
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
      if (event === 'replaceCommentEvent') allText += removeImages(this.mkComment(commentItem[event]))
      if (event === 'resetCommentsEvent') allText += this.mkResetCommentsEvent(commentItem[event])

      allText += this.mkBy(commentItem['by'])
      allText += this.mkTimestamp(commentItem['timestamp'])

      if (allText.toLowerCase().includes(store.state.filterForCommentSearchString.toLowerCase())) {
        filteredComments.push(commentItem)
      }
    }
    return filteredComments
  },

  /*
  * Loop over all history items and concatenate the text of the event name, 'by' and 'timestamp' to one string
  * If filterForHistorySearchString is a substring of that string add the history item to the filteredHistory array
  * Return that array
  */
  getFilteredHistory() {
    const filteredHistory = []
    for (const histItem of store.state.currentDoc.history) {
      let allText = ''
      /*
      *  All items in the events list are objects; by default the first 3 keys are: event name, 'by' and 'timestamp'; other keys are not relevant here.
      *  For privacy reasons (do not reveal edited text) skip creation and changes in comments but process comments to the history.
      */
      const event = Object.keys(histItem)[0]
      if (event === 'ignoreEvent' || event === 'updateTaskOrderEvent' || event === 'changeReqAreaColorEvent' || event === 'removeItemsFromSprintEvent' ||
        event === 'addCommentEvent' || event === 'replaceCommentEvent' || event === 'itemToNewTeamEvent') continue

      if (event === 'acceptanceEvent') allText += removeImages(this.mkAcceptanceEvent(histItem[event]))
      if (event === 'addSprintIdsEvent') allText += this.mkAddSprintIdsEvent(histItem[event])
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
      if (event === 'removedWithDescendantsEvent') allText += this.mkRemovedWithDescendantsEvent(histItem[event])
      if (event === 'removeSprintIdsEvent') allText += this.mkRemoveSprintIdsEvent(histItem[event])
      if (event === 'removeStoryEvent') allText += this.mkRemoveStoryEvent(histItem[event])
      if (event === 'resetHistoryEvent') allText += this.mkResetHistoryEvent(histItem[event])
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

      allText += this.mkBy(histItem['by'])
      allText += this.mkTimestamp(histItem['timestamp'])
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
    if (key === 'addSprintIdsEvent') return this.mkAddSprintIdsEvent(value)
    if (key === 'clonedBranchEvent') return this.mkClonedBranchEvent(value)
    if (key === 'cloneEvent') return this.mkCloneEvent(value)
    if (key === 'commentToHistoryEvent') return this.mkCommentToHistoryEvent(value)
    if (key === 'conditionRemovedEvent') return this.mkConditionRemovedEvent(value)
    if (key === 'createEvent') return this.mkCreateEvent(value)
    if (key === 'createRootEvent') return this.mkCreateRootEvent(value)
    if (key === 'createTaskEvent') return this.mkCreateTaskEvent(value)
    if (key === 'dependencyRemovedEvent') return this.mkDependencyRemovedEvent(value)
    if (key === 'descriptionEvent') return this.mkDescriptionEvent(value)
    if (key === 'importToSprintEvent') return this.mkImportToSprintEvent(value)
    if (key === 'itemRestoredEvent') return this.mkItemRestoredEvent(value)
    if (key === 'newChildEvent') return this.mkNewChildEvent(value)
    if (key === 'nodeMovedEvent') return this.mkNodeMovedEvent(value)
    if (key === 'removeAttachmentEvent') return this.mkRemoveAttachmentEvent(value)
    if (key === 'removeSprintIdsEvent') return this.mkRemoveSprintIdsEvent(value)
    if (key === 'removeStoryEvent') return this.mkRemoveStoryEvent(value)
    if (key === 'removedWithDescendantsEvent') return this.mkRemovedWithDescendantsEvent(value)
    if (key === 'resetHistoryEvent') return this.mkResetHistoryEvent(value)
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

    if (key === 'by') return this.mkBy(value)
    if (key === 'timestamp') return this.mkTimestamp(value)
  },

  prepCommentsText(key, value) {
    if (key === 'addCommentEvent') return this.mkComment(value)
    if (key === 'replaceCommentEvent') return this.mkComment(value)
    if (key === 'resetCommentsEvent') return this.mkResetCommentsEvent(value)

    if (key === 'by') return this.mkBy(value)
    if (key === 'timestamp') return this.mkTimestamp(value)
  },

  /* Presentation methods */
  mkAcceptanceEvent(value) {
    return '<h6>The acceptance criteria of the item have changed:(from/to)<hr></h6>' + replaceEmpty(atou(value[0])) + '<hr>' + replaceEmpty(atou(value[1]))
  },

  mkAddSprintIdsEvent(value) {
    let txt = `This ${this.getLevelText(value[0], value[1])} is assigned to sprint '${value[2]}'.`
    if (value[3]) txt += ' The item was assigned to a sprint before.'
    return `<h6> ${txt} </h6>`
  },

  mkClonedBranchEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} and its descendants have been cloned.</h6>`
  },

  mkCloneEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} has been cloned as item of product '${value[2]}'.</h6>`
  },

  mkCommentToHistoryEvent(value) {
    return replaceEmpty(atou(value[0]))
  },

  mkConditionRemovedEvent(value) {
    let s
    if (value[1]) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` } else if (value[0].length === 1) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` } else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h6>${s}</h6>`
  },

  mkCreateEvent(value) {
    return `<h6>This ${this.getLevelText(value[0])} was created under parent '${value[1]}' at position ${value[2]}.</h6>`
  },

  mkCreateRootEvent(value) {
    return '<h6>The root document was created for database ' + value[0] + '.</h6>'
  },

  mkCreateTaskEvent(value) {
    return `<h6>This task was created under parent '${value[0]}'.</h6>`
  },

  mkDependencyRemovedEvent(value) {
    let s
    if (value[1]) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` } else if (value[0].length === 1) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` } else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
    return `<h6>${s}</h6>`
  },

  mkDescriptionEvent(value) {
    return '<h6>The description of the item has changed:(from/to)<hr></h6>' + replaceEmpty(atou(value[0])) + '<hr>' + replaceEmpty(atou(value[1]))
  },

  mkImportToSprintEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} was imported from sprint '${value[2]}' to sprint '${value[3]}'.</h6>`
  },

  mkItemRestoredEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} is restored from removal including its descendants.</h6>`
  },

  mkNewChildEvent(value) {
    return `<h6>A ${this.getLevelText(value[0])} was created as a child of this item at position ${value[1]}.</h6>`
  },

  mkNodeMovedEvent(value) {
    const moveType = value[13] === 'undoMove' ? ' back' : ''
    let txt
    if (value[7] !== value[8]) { txt = `<h6>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}.</h6>` } else txt = ''
    if (value[0] === value[1]) {
      txt += `<h6>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h6>`
      txt += (value[4] > 0) ? `<p>${value[4]} children were also moved.</p>` : ''
      return txt
    } else {
      txt += `<h6>The item changed level from ${this.getLevelText(value[0])} to ${this.getLevelText(value[1])}.</h6>`
      txt += `<p>The new position is ${(value[2] + 1)} under parent '${value[3]}'</p>`
      txt += (value[4] > 0) ? `<p>${value[4]} children also changed level.</p>` : ''
      return txt
    }
  },

  mkRemoveAttachmentEvent(value) {
    return "<h6>Attachment with title '" + value[0] + "' is removed.</h6>"
  },

  mkRemovedWithDescendantsEvent(value) {
    return `<h6>This item and ${value[1] - 1} descendants are removed.</h6>
      <p>From the descendants ${value[2]} external dependencies and ${value[3]} external conditions were removed.</p>`
  },

  mkRemoveSprintIdsEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} is removed from sprint '${value[2]}.</h6>`
  },

  mkRemoveStoryEvent(value) {
    return `<h6>This ${this.getLevelText(value[0], value[1])} is removed from sprint '${value[2]}.</h6>`
  },

  mkResetHistoryEvent(value) {
    return `<h6> ${value[0]} History items are removed.</h6>`
  },

  mkSetConditionsEvent(value) {
    if (value[2]) return `<h6>The previous condition set for item '${value[1]} is undone'.</h6>`
    return `<h6>This item is set to be conditional for item '${value[1]}'.</h6>`
  },

  mkSetDependenciesEvent(value) {
    if (value[2]) return `<h6>The previous dependency set on item '${value[1]} is undone'.</h6>`
    return `<h6>This item is set to be dependent on item '${value[1]}'.</h6>`
  },

  mkSetHrsEvent(value) {
    return '<h6>Spike estimate hours changed from ' + value[0] + ' to ' + value[1] + '.</h6>'
  },

  mkSetPointsEvent(value) {
    return '<h6>Storypoints estimate changed from ' + value[0] + ' to ' + value[1] + '.</h6>'
  },

  mkSetSizeEvent(value) {
    return '<h6>T-Shirt estimate changed from </h6>' + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
  },

  mkSetStateEvent(value) {
    return `<h6>The item state changed from '${this.getItemStateText(value[0])}' to '${this.getItemStateText(value[1])}'</h6>` +
      `<p>This backlog item is realized by team '${value[2]}'</p>`
  },

  mkSetSubTypeEvent(value) {
    return "<h6>The pbi subtype has changed from: </h6>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'."
  },

  mkSetTeamEventDescendant(value) {
    return "<h6>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> as descendant of '" + value[2] + "'.</h6>"
  },

  mkSetTeamOwnerEvent(value) {
    return "<h6>The team of the item has changed from '" + value[0] + "' to '" + value[1] + "',<br> including " + value[2] + ' descendants.</h6>'
  },

  mkSetTitleEvent(value) {
    return "<h6>The item title has changed from: </h6>'" + value[0] + "' to '" + value[1] + "'."
  },

  mkSubscribeEvent(value) {
    if (value[0]) {
      return '<h6>User unsubscribed for messages about this backlog item.</h6>'
    } else {
      return '<h6>User subscribed to receive messages about this backlog item.</h6>'
    }
  },

  mkUndoBranchRemovalEvent(value) {
    return `<h6>The ${this.getLevelText(value[9], value[10])} with title '${value[11]}' and ${value[1]} descendants are restored from removal.</h6>`
  },

  mkTaskRemovedEvent(value) {
    return `<h6>Task '${value[0]}' is removed by team '${value[1]}'.</h6>`
  },

  mkUpdateTaskOwnerEvent(value) {
    return `<h6>Task owner is changed from '${value[0]}' to '${value[1]}'.</h6>`
  },

  mkUploadAttachmentEvent(value) {
    return "<h6>Attachment with title '" + value[0] + "' of type " + value[2] + ' and size ' + value[1] + ' is uploaded.</h6>'
  },

  mkComment(value) {
    return replaceEmpty(atou(value[0]))
  },

  mkResetCommentsEvent(value) {
    return `<h6> ${value[0]} Comment items are removed in a cleanup initiated by an admistrator.</h6>`
  },

  mkBy(value) {
    return 'by: ' + value
  },

  mkTimestamp(value) {
    return 'timestamp: ' + new Date(value).toString()
  },

  // ======================== methods for editing my last comment(s) ===============================

  getEvent(comment) {
    return Object.keys(comment)[0]
  },

  getEventValue(comment) {
    return comment[Object.keys(comment)[0]]
  },

  otherUserCommentedAfterme(comment, allItems) {
    let otherUserFound = false
    for (let c of allItems) {
      if (c.by !== store.state.userData.user) {
        otherUserFound = true
      }
      if (c === comment) {
        break
      }
    }
    return otherUserFound
  },

  isMyAddition(comment, eventName) {
    return comment.by === store.state.userData.user && Object.keys(comment)[0] === eventName
  },

  startEditMyComment(comment) {
    this.commentObjToBeReplaced = comment
    this.myLastCommentText = atou(this.getEventValue(comment))
    this.editMyComment = true
  },

  startEditMyHistComment(comment) {
    this.commentObjToBeReplaced = comment
    this.myLastHistCommentText = atou(this.getEventValue(comment))
    this.editMyHistComment = true
  },

  replaceEditedComment() {
    store.dispatch('replaceComment', {
      node: this.getLastSelectedNode,
      commentObjToBeReplaced: this.commentObjToBeReplaced,
      editedCommentText: this.myLastCommentText,
      timestamp: Date.now()
    })
  },

  replaceEditedHistComment() {
    store.dispatch('replaceHistComment', {
      node: this.getLastSelectedNode,
      commentObjToBeReplaced: this.commentObjToBeReplaced,
      editedCommentText: this.myLastHistCommentText,
      timestamp: Date.now()
    })
  }
}

export default {
  mixins: [utilities],
  computed,
  methods
}
