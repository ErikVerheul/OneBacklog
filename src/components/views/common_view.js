import { SEV, LEVEL, STATE } from '../../constants.js'
import { areStringsEqual } from '../../common_functions.js'
import { constants, authorization, utilities } from '../mixins/generic.js'
import store from '../../store/store.js'

const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const SHORTKEYLENGTH = 5
const FULLKEYLENGTH = 17

function data() {
	return {
		userStorySubtype: 0,
		spikeSubtype: 1,
		defectSubtype: 2,
		docToUpdate: null,
		newDescription: "<p><br></p>",
		newAcceptance: "<p><br></p>",
		editorToolbar: [
			[{ header: [false, 1, 2, 3, 4, 5, 6] }],
			['bold', 'italic', 'underline', 'strike'],
			[{ list: 'ordered' }, { list: 'bullet' }],
			[{ indent: '-1' }, { indent: '+1' }], // outdent/indent
			['link', 'image', 'code-block']
		],
		// set to an invalid value; must be updated before use
		selectedPbiType: '',
		// comments, history and attachments
		doAddition: false,
		startFiltering: false,
		isDescriptionEdited: false,
		isAcceptanceEdited: false,
		isCommentsFilterActive: false,
		isHistoryFilterActive: false,
		newComment: "<p><br></p>",
		fileInfo: null,
		newHistory: "<p><br></p>",
		filterForCommentPrep: '',
		filterForHistoryPrep: '',
		// move data
		movePreflightData: {},
		warnForMoveToOtherLevel: false
	}
}

const computed = {
	attachmentsLabel() {
		let count = 0
		if (store.state.currentDoc._attachments) {
			count = Object.keys(store.state.currentDoc._attachments).length
		}
		return 'Attachments (' + count + ')'
	},

	undoTitle() {
		const changes = store.state.changeHistory
		if (changes && changes.length > 0) {
			const changeType = changes[0].type
			switch (changeType) {
				case 'undoAcceptanceChange':
					return 'your change of the item acceptance criteria'
				case 'undoAddSprintIds':
					return 'your assignment to a sprint'
				case 'undoBranchClone':
					return 'the creation of a product or branch clone'
				case 'undoChangeTeam':
					return 'your change to another team'
				case 'undoDescriptionChange':
					return 'your change of the item description'
				case 'undoMove':
					return 'your change of priority (move of items)'
				case 'undoNewNode':
					return 'your creation of a new item'
				case 'undoReqAreaColorChange':
					return 'your change of the color indicator for a requirement area'
				case 'undoPersonHoursChange':
					return 'your assigned effort in person hours for the spike'
				case 'undoRemove':
					return 'your removal of the item or branch of items'
				case 'undoRemoveSprintIds':
					return 'your removal of this item from a sprint'
				case 'undoSelectedPbiType':
					return 'your change of PBI type (User story, Spike or Defect)'
				case 'undoSetDependency':
					return 'your assignment of a dependency'
				case 'undoStateChange':
					return 'your change of item state'
				case 'undoStoryPointsChange':
					return 'your change of assigned story points of the feature or story/defect'
				case 'undoTitleChange':
					return 'your change of the title'
				case 'undoTsSizeChange':
					return 'your change of the T-shirt size of the epic'
				case 'undoUpdateReqArea':
					return 'your assigment of a requirement area to the epic or feature'
				default:
					return 'no tooltip available for ' + changeType
			}
		}
	},

	welcomeMessage() {
		let msg_2
		if (this.myTeam === 'not assigned yet') { msg_2 = ' You are not a team member.' }
		else msg_2 = ` You are member of team '${this.myTeam}'.`

		let msg_4
		if (this.getMyAssignedProductIds.length === 1) { msg_4 = ` You have 1 product.` }
		else msg_4 = ` You selected ${this.getMyProductSubscriptions.length} from ${this.getMyAssignedProductIds.length} products.`

		return `Welcome '${store.state.userData.user}'.` + msg_2 + ` Your current database is set to '${store.state.userData.currentDb}'.` + msg_4
	},

	squareText() {
		if (store.state.online) { return 'sync' } else {
			return 'offline'
		}
	},

	squareColor() {
		return store.state.online ? store.state.eventSyncColor : '#ff0000'
	},

	getSubscribeButtonTxt() {
		if (store.state.busyChangingSubscriptions) {
			return "Busy, please wait ..."
		}
		if (this.isFollower) {
			return 'Unsubscribe to change notices'
		} else return 'Subscribe to change notices'
	},

	invalidFileName() {
		return this.fileInfo === null || this.fileInfo.name === ''
	},

	uploadTooLarge() {
		return this.fileInfo !== null && this.fileInfo.size > MAXUPLOADSIZE
	},

	description: {
		get: () => {
			let retVal = store.state.currentDoc.description
			if (retVal === "") {
				// correct empty field
				retVal = "<p><br></p>"
			}
			return retVal
		},
		set(newDescription) {
			this.newDescription = newDescription
		}
	},

	acceptanceCriteria: {
		get: () => {
			let retVal = store.state.currentDoc.acceptanceCriteria
			if (retVal === "") {
				// correct empty field
				retVal = "<p><br></p>"
			}
			return retVal
		},
		set(newAcceptanceCriteria) {
			this.newAcceptance = newAcceptanceCriteria
		}
	},

	// return true if the root node is selected or false if another or no node is selected
	isRootSelected() {
		return !!this.getLastSelectedNode && this.getLastSelectedNode._id === 'root'
	}
}

const watch = {
	doAddition: function (val) {
		if (val === true) {
			this.doAddition = false
			if (store.state.selectedForView === 'attachments') {
				this.fileInfo = null
				this.$refs.uploadRef.show()
			}
			if (store.state.selectedForView === 'comments') {
				if (this.canCreateComments) {
					this.newComment = "<p><br></p>"
					this.$refs.commentsEditorRef.show()
				} else {
					this.showLastEvent('Sorry, your assigned role(s) disallow you to create comments', SEV.WARNING)
				}
			}
		}
	},

	startFiltering: function (val) {
		if (val === true) {
			this.startFiltering = false
			if (store.state.selectedForView === 'comments') {
				this.$refs.commentsFilterRef.show()
				this.isCommentsFilterActive = true
			}
			if (store.state.selectedForView === 'history') {
				this.$refs.historyFilterRef.show()
				this.isHistoryFilterActive = true
			}
		}
	}
}

const methods = {
	initNewDescription() {
		this.isDescriptionEdited = true
		this.isAcceptanceEdited = false
	},

	initNewAcceptance() {
		this.isDescriptionEdited = false
		this.isAcceptanceEdited = true
	},

	stopFiltering() {
		if (store.state.selectedForView === 'comments') {
			this.filterForCommentPrep = ''
			this.filterComments()
			this.isCommentsFilterActive = false
		}
		if (store.state.selectedForView === 'history') {
			this.filterForHistoryPrep = ''
			this.filterHistory()
			this.isHistoryFilterActive = false
		}
	},

	resetFindId() {
		store.dispatch('resetFindOnId', { caller: 'resetFindId' })
	},

	resetSearchTitles() {
		store.dispatch('resetSearchInTitles', { caller: 'resetSearchTitles', toDispatch: [] })
	},

	patchTitle(node) {
		if (store.state.userData.myOptions.proUser === 'false') return node.title
		let patch = ''
		if (node.dependencies && node.dependencies.length > 0) patch = '▲ '
		if (node.conditionalFor && node.conditionalFor.length > 0) patch = patch + '▼ '
		return patch + node.title
	},

	rowLength(violation) {
		let l = 0
		for (let v of violation) {
			if (v > l) l = v
		}
		return l + 1
	},

	createRow(violation) {
		violation.sort()
		const row = []
		for (let i = 0; i < this.rowLength(violation); i++) {
			if (violation.includes(i)) {
				row.push(' △.' + (i + 1))
			} else row.push('')
		}
		row.reverse()
		return row
	},

	/* Return true if the state of the node has changed in the last hour */
	hasNodeMoved(node) {
		return node.data.lastPositionChange ? Date.now() - node.data.lastPositionChange < HOURINMILIS : false
	},

	hasNewState(node) {
		return node.data.lastStateChange ? Date.now() - node.data.lastStateChange < HOURINMILIS : false
	},

	hasContentChanged(node) {
		return node.data.lastContentChange ? Date.now() - node.data.lastContentChange < HOURINMILIS : false
	},

	hasNewComment(node) {
		return node.data.lastCommentAddition ? Date.now() - node.data.lastCommentAddition < HOURINMILIS : false
	},

	isAttachmentAdded(node) {
		return node.data.lastAttachmentAddition ? Date.now() - node.data.lastAttachmentAddition < HOURINMILIS : false
	},

	hasCommentToHistory(node) {
		return node.data.lastCommentToHistory ? Date.now() - node.data.lastCommentToHistory < HOURINMILIS : false
	},

	/*
	* Check for 'done' items with sub-items not 'done' and highlight them with a warning badge 'Done?' in the tree view.
	* Check for items with a higher state than any of its decendants and highlight them with a warning badge '<state?>' in the tree view.
	*/
	hasInconsistentState(node) {
		if (node._id === "requirement-areas") {
			// skip this dummy product
			return false
		}
		const descendants = store.state.helpersRef.getDescendantsInfo(node).descendants
		if (descendants.length > 0) {
			let highestState = STATE.NEW
			let allDone = true
			for (const d of descendants) {
				if (d.data.state > highestState) highestState = d.data.state
				if (d.data.state < STATE.DONE && d.data.state !== STATE.ON_HOLD) allDone = false
			}
			return (node.data.state > highestState || node.data.state === STATE.DONE && !allDone)
		}
	},

	hasOtherUpdate(node) {
		return node.data.lastChange ? Date.now() - node.data.lastChange < HOURINMILIS : false
	},

	getFilterButtonText() {
		if (store.state.resetFilter === null) {
			return "Filter in tree"
		} else return "Reset filter"
	},

	onSetMyFilters() {
		if (store.state.resetFilter) {
			// if this filter was on, reset it after resetting any set search and reset the label of the button; pass the array of productmodels to apply the reset on
			const productModels = this.isOverviewSelected ? undefined : store.state.helpersRef.getCurrentProductModel()
			store.dispatch('resetFilterAndSearches', { caller: 'onSetMyFilters', productModels })
		} else {
			// this filter was not set; update the available req area options first
			const currReqAreaIds = store.state.helpersRef.getCurrentReqAreaIds()
			store.state.reqAreaOptions = []
			for (const id of currReqAreaIds) {
				store.state.reqAreaOptions.push({ id, title: store.state.reqAreaMapper[id] })
			}
			// open the modal to set the filters
			window.myFilters.show()
		}
	},

	idCheck(id) {
		const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz'
		const trimmedItemId = id.trim()
		if (trimmedItemId.length !== SHORTKEYLENGTH && trimmedItemId.length < FULLKEYLENGTH) {
			this.showLastEvent(`Wrong Id length. The length must be 5 for a short Id, or ${FULLKEYLENGTH}+ for a full Id`, SEV.WARNING)
			return false
		}

		for (let i = 0; i < trimmedItemId.length; i++) {
			if (!alphanum.includes(trimmedItemId.substring(i, i + 1).toLowerCase())) {
				this.showLastEvent(`Wrong Id. The id contains other than digits and alphabetical characters`, SEV.WARNING)
				return false
			}
		}
		return true
	},

	/* Find, load and select an item with a given short or full Id. Scan the full tree */
	doFindItemOnId(id) {
		if (!this.idCheck(id)) {
			// return on invalid id string
			return
		}

		if (store.state.resetSearchOnTitle !== null) {
			// reset the search on id first
			const toDispatch = [{ findItemOnId: { id } }]
			store.dispatch('resetSearchInTitles', { caller: 'doFindItemOnId', toDispatch })
		} else store.dispatch('findItemOnId', { id })
	},

	/* Find all items with the key as a substring in their title in the current product branch */
	doSeachOnTitle() {
		if (store.state.keyword === '') {
			// return on empty keyword
			return
		}

		if (store.state.resetSearchOnId !== null) {
			// reset the search on title first
			const toDispatch = [{ seachOnTitle: {} }]
			store.dispatch('resetFindOnId', { caller: 'doSeachOnTitle', toDispatch })
		} else store.dispatch('seachOnTitle')
	},

	/*
	* Restore the nodes in their previous (source) position.
	* Return true on success or false if the parent node does not exist or siblings have been removed (via sync by other user)
	*/
	moveBack(sourceParentId, targetParentId, reverseMoveMap) {
		const parentNode = store.state.helpersRef.getNodeById(targetParentId)
		if (parentNode === null) return false

		for (const r of reverseMoveMap) {
			const node = r.node
			if (!node) return false

			let cursorPosition
			if (r.targetInd === 0) {
				cursorPosition = {
					nodeModel: parentNode,
					placement: 'inside'
				}
			} else {
				let topSibling
				if (sourceParentId !== targetParentId) {
					topSibling = parentNode.children[r.targetInd - 1]
				} else {
					topSibling = parentNode.children[r.targetInd - (r.sourceInd > r.targetInd ? 1 : 0)]
				}
				if (topSibling === undefined) return false

				cursorPosition = {
					nodeModel: topSibling,
					placement: 'after'
				}
			}
			store.state.helpersRef.removeNodes([node])
			// the node is assigned a new priority
			store.state.helpersRef.insertNodes(cursorPosition, [node], { skipUpdateProductId: node.parentId === 'root' })
			// restore the sprintId
			store.commit('updateNodesAndCurrentDoc', { node, sprintId: r.sprintId })
		}
		return true
	},

	/* Undo a change that was recorded in the change history. Pass isUndoAction: true to indicate that this is a undo operation and no new undo must be created in the change history */
	onUndoEvent() {
		if (store.state.busyWithLastUndo) {
			this.showLastEvent('The last undo has not finished. Please try later', SEV.WARNING)
			return
		}
		const isUndoAction = true
		const entry = store.state.changeHistory.shift()
		switch (entry.type) {
			case 'undoAcceptanceChange':
				store.dispatch('saveAcceptance', { node: entry.node, newAcceptance: entry.oldAcceptance, timestamp: entry.prevLastContentChange, isUndoAction })
				break
			case 'undoAddSprintIds':
				store.dispatch('removeSprintIds', { parentId: entry.id, sprintId: entry.sprintId, itemIds: entry.itemIds, sprintName: entry.sprintName, isUndoAction })
				break
			case 'undoBranchClone':
				store.dispatch('removeBranch', { node: entry.newNode, undoOnError: false, isUndoAction })
				break
			case 'undoChangeTeam':
				store.dispatch('assignToMyTeam', { node: entry.node, newTeam: entry.oldTeam, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoDescriptionChange':
				store.dispatch('saveDescription', { node: entry.node, newDescription: entry.oldDescription, timestamp: entry.prevLastContentChange, isUndoAction })
				break
			case 'undoMove':
				{
					const moveDataContainer = entry.moveDataContainer
					const reverseMoveMap = moveDataContainer.reverseMoveMap
					// swap source and target
					const sourceParentId = moveDataContainer.targetParentId
					const targetParentId = moveDataContainer.sourceParentId
					// the nodes are restored prior to the database update as we need the newly calculated priority to store
					if (this.moveBack(sourceParentId, targetParentId, reverseMoveMap)) {
						// show the event message before the database update is finished (a callback is not feasible as the update uses multiple parallel threads)
						if (!store.state.helpersRef.dependencyViolationsFound()) this.showLastEvent('Item(s) move is undone', SEV.INFO)
						// update the nodes in the database
						store.dispatch('updateMovedItemsBulk', { moveDataContainer, isUndoAction })
					} else {
						this.showLastEvent('Undo failed. Sign out and -in again to recover.', SEV.ERROR)
						store.state.busyWithLastUndo = false
					}
				}
				break
			case 'undoNewNode':
				store.dispatch('removeBranch', { node: entry.newNode, undoOnError: false, isUndoAction })
				break
			case 'undoReqAreaColorChange':
				store.dispatch('updateColorDb', { node: entry.node, newColor: entry.prevColor, isUndoAction })
				break
			case 'undoPersonHoursChange':
				store.dispatch('setPersonHours', { node: entry.node, newHrs: entry.oldPersonHours, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoRemove':
				store.dispatch('undoRemovedBranch', entry)
				break
			case 'undoRemoveSprintIds':
				store.dispatch('addSprintIds', { parentId: entry.parentId, itemIds: entry.itemIds, sprintId: entry.sprintId, sprintName: entry.sprintName, isUndoAction })
				break
			case 'undoSelectedPbiType':
				store.dispatch('setSubType', { node: entry.node, newSubType: entry.oldSubType, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoSetDependency':
				store.dispatch('undoSetDependencyAsync', entry)
				break
			case 'undoStateChange':
				store.dispatch('setState', { node: entry.node, newState: entry.oldState, position: entry.node.ind, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoStoryPointsChange':
				store.dispatch('setStoryPoints', { node: entry.node, newPoints: entry.oldPoints, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoTitleChange':
				store.dispatch('setDocTitle', { node: entry.node, newTitle: entry.oldTitle, timestamp: entry.prevLastContentChange, isUndoAction })
				break
			case 'undoTsSizeChange':
				store.dispatch('setTsSize', { node: entry.node, newSizeIdx: entry.oldTsSize, timestamp: entry.prevLastChange, isUndoAction })
				break
			case 'undoUpdateReqArea':
				store.dispatch('updateReqArea', { node: entry.node, reqareaId: entry.oldAreaId, timestamp: entry.prevLastChange, isUndoAction })
				break
		}
	},

	subscribeClicked() {
		if (store.state.userData.myOptions.subscribeDescendants === 'do_not_subscribe_descendants')
			store.dispatch('changeSubsription', { node: this.getLastSelectedNode, timestamp: Date.now() })
		if (!store.state.busyChangingSubscriptions && store.state.userData.myOptions.subscribeDescendants === 'do_subscribe_descendants')
			store.dispatch('changeSubsriptionsBulk', { node: this.getLastSelectedNode, timestamp: Date.now() })
	},

	filterComments() {
		store.state.filterForCommentSearchString = this.filterForCommentPrep
	},

	uploadAttachment() {
		store.dispatch('uploadAttachmentAsync', {
			node: this.getLastSelectedNode,
			fileInfo: this.fileInfo,
			currentDocId: store.state.currentDoc._id,
			timestamp: Date.now()
		})
	},

	filterHistory() {
		store.state.filterForHistorySearchString = this.filterForHistoryPrep
	},

	insertComment() {
		store.dispatch('addComment', {
			node: this.getLastSelectedNode,
			comment: this.newComment,
			timestamp: Date.now()
		})
	},

	/* Tree and database update methods */
	updateDescription(payload) {
		// node is either the current node (descripton changed and a click outside description and not on a node) or
		// the previous selected node (description changed and clicked on a node)
		const node = payload.node
		if (areStringsEqual(store.state.currentDoc.description, this.newDescription)) {
			// update skipped when not changed; load the doc of last clicked node
			this.isDescriptionEdited = false
			store.dispatch('loadDoc', { id: this.getLastSelectedNode._id, onSuccessCallback: payload.cb })
		} else {
			const toDispatch = [{ loadDoc: { id: this.getLastSelectedNode._id, onSuccessCallback: payload.cb } }]
			if (this.haveAccessInTree(node.productId, this.getCurrentItemLevel, store.state.currentDoc.team, 'change the description of this item')) {
				store.dispatch('saveDescription', {
					node,
					newDescription: this.newDescription,
					timestamp: Date.now(),
					toDispatch
				})
			} else this.isDescriptionEdited = false
		}
	},

	updateAcceptance(payload) {
		// node is either the current node (descripton changed and a click outside description and not on a node) or
		// the previous selected node (description changed and clicked on a node)
		const node = payload.node
		if (node._id !== 'requirement-areas' && node.parentId !== 'requirement-areas') {
			if (areStringsEqual(store.state.currentDoc.acceptanceCriteria, this.newAcceptance)) {
				// update skipped when not changed; load the doc of last clicked node
				this.isAcceptanceEdited = false
				store.dispatch('loadDoc', { id: this.getLastSelectedNode._id, onSuccessCallback: payload.cb })
			} else {
				const toDispatch = [{ loadDoc: { id: this.getLastSelectedNode._id, onSuccessCallback: payload.cb } }]
				if (this.haveAccessInTree(node.productId, this.getCurrentItemLevel, store.state.currentDoc.team, 'change the acceptance criteria of this item')) {
					store.dispatch('saveAcceptance', {
						node,
						newAcceptance: this.newAcceptance,
						timestamp: Date.now(),
						toDispatch
					})
				} else this.isAcceptanceEdited = false
			}
		}
	},

	/* Save the document to update for changes that take effect after a @blur event and a possible change of the current doc (the user selected another node in the tree view) */
	prepUpdate(doc) {
		this.docToUpdate = doc
	},

	/* Only authorized users who are member of the owning team can change T-shirt size. */
	updateTsSize() {
		if (this.docToUpdate && this.haveAccessInTree(this.docToUpdate.productId, this.docToUpdate.level, this.docToUpdate.team, 'change the t-shirt size of this item')) {
			const size = document.getElementById('tShirtSizeId').value.toUpperCase()
			const sizeArray = store.state.configData.tsSize
			if (sizeArray.includes(size)) {
				const newSizeIdx = sizeArray.indexOf(size)
				if (newSizeIdx !== this.docToUpdate.tssize) {
					store.dispatch('setTsSize', {
						node: store.state.helpersRef.getNodeById(this.docToUpdate._id),
						newSizeIdx,
						timestamp: Date.now()
					})
				}
			} else {
				let sizes = ''
				for (let i = 0; i < sizeArray.length - 1; i++) {
					sizes += sizeArray[i] + ', '
				}
				alert(size + ' is not a known T-shirt size. Valid values are: ' + sizes + ' and ' + sizeArray[sizeArray.length - 1])
			}
		}
	},

	/* Only authorized users who are member of the owning team can change story points. */
	updateStoryPoints() {
		if (this.docToUpdate && this.haveAccessInTree(this.docToUpdate.productId, this.docToUpdate.level, this.docToUpdate.team, 'change the story points size of this item')) {
			const el = document.getElementById('storyPointsId')
			if (isNaN(el.value) || el.value < 0) {
				el.value = '?'
				return
			}
			const newPoints = parseInt(el.value)
			if (newPoints !== this.docToUpdate.spsize) {
				store.dispatch('setStoryPoints', {
					node: store.state.helpersRef.getNodeById(this.docToUpdate._id),
					newPoints,
					timestamp: Date.now()
				})
			}
		}
	},

	/* Only authorized users who are member of the owning team can change person hours. */
	updatePersonHours() {
		if (this.docToUpdate && this.haveAccessInTree(this.docToUpdate.productId, this.docToUpdate.level, this.docToUpdate.team, 'change story person hours of this item')) {
			const el = document.getElementById('personHoursId')
			if (isNaN(el.value) || el.value < 0) {
				el.value = '?'
				return
			}
			const newHrs = parseInt(el.value)
			if (newHrs !== this.docToUpdate.spikepersonhours) {
				store.dispatch('setPersonHours', {
					node: store.state.helpersRef.getNodeById(this.docToUpdate._id),
					newHrs,
					timestamp: Date.now()
				})
			}
		}
	},

	/*
	* An authorized user can change state if member of the team owning this item.
	* Issue a warning when the user assigns a state to a parent:
	* - to DONE when not all descendants are done
	* - higher than the state of any of its descendants
	*/
	onStateChange(newState) {
		if (newState !== store.state.currentDoc.state) {
			const node = this.getLastSelectedNode
			if (this.haveAccessInTree(node.productId, this.getCurrentItemLevel, store.state.currentDoc.team, 'change the state of this item')) {
				store.dispatch('setState', {
					node,
					newState,
					position: node.ind,
					timestamp: Date.now()
				})
			}
		}
	},

	updateTitle() {
		if (this.docToUpdate) {
			const oldTitle = this.docToUpdate.title
			const newTitle = document.getElementById('titleField').value
			if (oldTitle === newTitle) return
			if (this.haveAccessInTree(this.docToUpdate.productId, this.docToUpdate.level, this.docToUpdate.team, 'change the title of this item')) {
				// update current document in database
				store.dispatch('setDocTitle', {
					node: store.state.helpersRef.getNodeById(this.docToUpdate._id),
					newTitle,
					timestamp: Date.now()
				})
			}
		}
	},

	nodeDropped(nodes, cursorPosition) {
		this.movePreflightData = this.checkMove(nodes, cursorPosition)
		if (store.state.userData.myOptions.levelShiftWarning === 'do_warn' && this.movePreflightData.levelShift !== 0) {
			// move to another level; let the user decide to continue or cancel
			this.warnForMoveToOtherLevel = true
		} else {
			this.doMove(nodes, cursorPosition)
		}
	},

	continueMove() {
		const nodes = this.movePreflightData.nodes
		const cursorPosition = this.movePreflightData.cursorPosition
		this.doMove(nodes, cursorPosition)
	},

	/*
	* Move the nodes and save the status 'as is' before the move and update the database when one or more nodes are dropped on another location.
	* IMPORTANT: To guarantee an immediate response, as an exception to the rule, the tree is updated before the database.
	* If the move fails in the database the user must reload the tree to return to the previous state.
	*/
	doMove(nodes, cursorPosition) {
		const moveDataContainer = this.moveNodes(nodes, cursorPosition)
		// show the event message before the database update is finished
		if (!store.state.helpersRef.dependencyViolationsFound()) {
			// if dependency violations were found dependencyViolationsFound displayed a message; if not, display a success message
			const clickedLevel = moveDataContainer.sourceLevel
			const levelShift = moveDataContainer.targetLevel - moveDataContainer.sourceLevel
			const title = this.itemTitleTrunc(60, nodes[0].title)
			let evt
			if (nodes.length === 1) {
				evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${cursorPosition.placement} '${cursorPosition.nodeModel.title}'`
			} else evt = `${this.getLevelText(clickedLevel)} '${title}' and ${nodes.length - 1} other item(s) are dropped ${cursorPosition.placement} '${cursorPosition.nodeModel.title}'`
			if (levelShift !== 0) evt += ' as ' + this.getLevelText(moveDataContainer.targetLevel)
			this.showLastEvent(evt, SEV.INFO)
		}
		store.dispatch('updateMovedItemsBulk', { moveDataContainer })
	},

	getViewOptions() {
		const options = [
			{ text: 'Comments', value: 'comments' },
			{ text: this.attachmentsLabel, value: 'attachments', disabled: !this.canSeeAndUploadAttachments },
			{ text: 'History', value: 'history' }
		]
		return options
	},

	showMoreMessages() {
		store.commit('resetfroozenEventDisplay')
		this.$refs.historyEventRef.show()
	}
}

export default {
	mixins: [constants, authorization, utilities],
	data,
	computed,
	watch,
	methods
}
