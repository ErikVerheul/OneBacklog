/*
 * By default the comments to the current item are loaded and dsplayed. The text of all comments is accumulated te enable a filter on text snippets.
 * When the 'History' radio button is clicked the same happens to the accumulated events saved in history.
 * When the 'Attachments" radio button is clicked the attachments to this item are listed. These can be removed. New attchments can be oploaded.
 */
import { MISC } from '../../constants.js'
import { utilities } from '../mixins/GenericMixin.js'
import { decodeHtml } from '../../common_functions.js'
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
	if (text === '' || text === '<p></p>' || text === MISC.EMPTYQUILL) return 'EMPTY TEXT'
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

			if (event === 'addCommentEvent') allText += removeImages(this.mkComment(commentItem[event], commentItem.encoding))
			if (event === 'replaceCommentEvent') allText += removeImages(this.mkComment(commentItem[event], commentItem.encoding))
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
	 * Loop over all history items where isListed = true and concatenate the text of the event name, 'by' and 'timestamp' to one string
	 * If filterForHistorySearchString is a substring of that string add the history item to the filteredHistory array
	 * Return that array
	 */
	getFilteredHistory() {
		const filteredHistory = []
		for (const histItem of store.state.currentDoc.history) {
			const event = Object.keys(histItem)[0]
			if (event === 'ignoreEvent' || !histItem.isListed) continue

			let allText = ''
			if (event === 'acceptanceEvent') allText += removeImages(this.mkAcceptanceEvent(histItem[event], histItem.encoding))
			if (event === 'addSprintIdsEvent') allText += this.mkAddSprintIdsEvent(histItem[event])
			if (event === 'clonedBranchEvent') allText += this.mkClonedBranchEvent(histItem[event])
			if (event === 'copyItemEvent') allText += this.mkCopyItemEvent(histItem[event])
			if (event === 'conditionRemovedEvent') allText += this.mkConditionRemovedEvent(histItem[event])
			if (event === 'createItemEvent') allText += this.mkCreateItemEvent(histItem[event])
			if (event === 'createTaskEvent') allText += this.mkCreateTaskEvent(histItem[event])
			if (event === 'createRootEvent') allText += this.mkCreateRootEvent(histItem[event])
			if (event === 'dependencyRemovedEvent') allText += this.mkDependencyRemovedEvent(histItem[event])
			if (event === 'descriptionEvent') allText += removeImages(this.mkDescriptionEvent(histItem[event], histItem.encoding))
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
	},

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
}

const methods = {
	getEventName(event) {
		return Object.keys(event)[0]
	},

	getEventValue(event) {
		return event[Object.keys(event)[0]]
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
		store.dispatch('removeAttachmentAsync', { node: this.getSelectedNode, attachmentTitle: attachment.title })
	},

	mkCommentHeader(comment) {
		if (comment.addCommentEvent) {
			return `User '${comment.by}' created a comment to this ${this.getLevelText(store.state.currentDoc.level, store.state.currentDoc.subtype)}`
		} else {
			if (comment.replaceCommentEvent) {
				return `User '${comment.by}' amended the comment to this ${this.getLevelText(store.state.currentDoc.level, store.state.currentDoc.subtype)}`
			} else {
				if (comment.resetCommentsEvent) {
					return `Administrator '${comment.by}' did remove comments upto this items date`
				}
			}
		}
	},

	mkHistHeader(histItem) {
		if (histItem.resetHistoryEvent) return `Administrator '${histItem.by}' did remove history upto this items date`
		return `User '${histItem.by}' made a change in this ${this.getLevelText(store.state.currentDoc.level, store.state.currentDoc.subtype)}`
	},

	prepHistoryText(key, value, encoding) {
		if (key === 'acceptanceEvent') return this.mkAcceptanceEvent(value, encoding)
		if (key === 'addSprintIdsEvent') return this.mkAddSprintIdsEvent(value)
		if (key === 'clonedBranchEvent') return this.mkClonedBranchEvent(value)
		if (key === 'commentAmendedEvent') return this.mkCommentAmendedEvent()
		if (key === 'conditionRemovedEvent') return this.mkConditionRemovedEvent(value)
		if (key === 'copyItemEvent') return this.mkCopyItemEvent(value)
		if (key === 'createItemEvent') return this.mkCreateItemEvent(value)
		if (key === 'createRootEvent') return this.mkCreateRootEvent(value)
		if (key === 'createTaskEvent') return this.mkCreateTaskEvent(value)
		if (key === 'dependencyRemovedEvent') return this.mkDependencyRemovedEvent(value)
		if (key === 'descriptionEvent') return this.mkDescriptionEvent(value, encoding)
		if (key === 'importToSprintEvent') return this.mkImportToSprintEvent(value)
		if (key === 'itemRestoredEvent') return this.mkItemRestoredEvent(value)
		if (key === 'newChildEvent') return this.mkNewChildEvent(value)
		if (key === 'newCommentEvent') return this.mkNewCommentEvent()
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
	},

	mkCommentFooter(commentItem) {
		return `${this.mkTimestamp(commentItem.timestamp)}`
	},

	mkHistFooter(histItem) {
		return `${this.mkTimestamp(histItem.timestamp)}`
	},

	prepCommentsText(key, value, encoding) {
		if (key === 'addCommentEvent') return this.mkComment(value, encoding)
		if (key === 'replaceCommentEvent') return this.mkComment(value, encoding)
		if (key === 'resetCommentsEvent') return this.mkResetCommentsEvent(value)
	},

	/* Presentation methods */
	mkAcceptanceEvent(value, encoding) {
		const insStr = value[2] ? 'changes for this item are <b>undone</b>' : 'for this item have changed'
		const s = '<h6>The acceptance criteria ' + insStr + ': (from/to)<hr></h6>'
		return s + replaceEmpty(decodeHtml(value[0], encoding)) + '<hr>' + replaceEmpty(decodeHtml(value[1], encoding))
	},

	mkAddSprintIdsEvent(value) {
		let txt = `This ${this.getLevelText(value[0], value[1])} is assigned to sprint '${value[2]}'.`
		if (value[3]) txt += ` The item was assigned to sprint ${value[3]} before.`
		return `<h6> ${txt} </h6>`
	},

	mkClonedBranchEvent(value) {
		return `<h6>This ${this.getLevelText(value[0], value[1])} and its descendants have been cloned.</h6>`
	},

	mkCommentAmendedEvent() {
		return `<h6>The user changed his comment. See the contents for the new version at the same timestamp.</h6>`
	},

	mkConditionRemovedEvent(value) {
		let s
		if (value[1]) {
			s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`
		} else if (value[0].length === 1) {
			s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.`
		} else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
		return `<h6>${s}</h6>`
	},

	mkCopyItemEvent(value) {
		return `<h6>This ${this.getLevelText(value[0], value[1])} has been copied as item of product '${value[2]}'.</h6>`
	},

	mkCreateItemEvent(value) {
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
		if (value[1]) {
			s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`
		} else if (value[0].length === 1) {
			s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.`
		} else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
		return `<h6>${s}</h6>`
	},

	mkDescriptionEvent(value, encoding) {
		const insStr = value[2] ? 'change of this item is <b>undone</b>' : 'of this item has changed'
		const s = '<h6>The description ' + insStr + ': (from/to)<hr></h6>'
		return s + replaceEmpty(decodeHtml(value[0], encoding)) + '<hr>' + replaceEmpty(decodeHtml(value[1], encoding))
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

	mkNewCommentEvent() {
		return `<h6>The user created a new comment. See the comments for the content.</h6>`
	},

	mkNodeMovedEvent(value) {
		const moveType = value[13] === 'undoMove' ? ' back' : ''
		let txt
		if (value[7] !== value[8]) {
			txt = `<h6>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}.</h6>`
		} else txt = ''
		if (value[0] === value[1]) {
			txt += `<h6>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h6>`
			txt += value[4] > 0 ? `<p>${value[4]} children were also moved.</p>` : ''
			return txt
		} else {
			txt += `<h6>The item changed level from ${this.getLevelText(value[0])} to ${this.getLevelText(value[1])}.</h6>`
			txt += `<p>The new position is ${value[2] + 1} under parent '${value[3]}'</p>`
			txt += value[4] > 0 ? `<p>${value[4]} children also changed level.</p>` : ''
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
		return (
			`<h6>The item state changed from '${this.getItemStateText(value[0])}' to '${this.getItemStateText(value[1])}'</h6>` +
			`<p>This backlog item is realized by team '${value[2]}'</p>`
		)
	},

	mkSetSubTypeEvent(value) {
		return "<h6>The user story subtype has changed from: </h6>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'."
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
		return `<h6>Attachment with file name '${value[0]}' of type ${value[2]} and size ${value[1]} is uploaded.</h6>`
	},

	mkComment(value, encoding) {
		return replaceEmpty(decodeHtml(value[0], encoding))
	},

	mkResetCommentsEvent(value) {
		return `<h6>${value[0]} Comment items older than ${new Date(value[1]).toString().substring(0, 33)} are removed in a cleanup initiated by an administrator.</h6>`
	},

	mkBy(value) {
		return 'by: ' + value
	},

	mkTimestamp(value) {
		return 'timestamp: ' + new Date(value).toString()
	},
}

export default {
	mixins: [utilities],
	computed,
	methods,
}
