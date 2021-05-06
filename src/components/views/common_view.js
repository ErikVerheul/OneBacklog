import { SEV, LEVEL } from '../../constants.js'
import { collapseNode } from '../../common_functions.js'
import { constants, authorization, utilities } from '../mixins/generic.js'

const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const SHORTKEYLENGTH = 5
const FULLKEYLENGTH = 17

function mounted() {
	function idCheck(vm) {
		const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz'
		const trimmedItemId = vm.$store.state.itemId.trim()
		if (trimmedItemId.length !== SHORTKEYLENGTH && trimmedItemId.length < FULLKEYLENGTH) {
			vm.showLastEvent(`Wrong Id length. The length must be 5 for a short Id, or ${FULLKEYLENGTH}+ for a full Id`, SEV.WARNING)
			return false
		}

		for (let i = 0; i < trimmedItemId.length; i++) {
			if (!alphanum.includes(trimmedItemId.substring(i, i + 1).toLowerCase())) return false
		}
		return true
	}

	const el = document.getElementById('findItemOnId')
	// fire the search on id on pressing enter in the select-on-Id input field (instead of submitting the form)
	el.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			// check for valid input and convert to lowercase
			if (idCheck(this)) {
				this.findItemOnId(this.$store.state.itemId.toLowerCase().trim())
			}
		}
	})

	const el2 = document.getElementById('searchInput')
	// fire the search button on pressing enter in the search input field (instead of submitting the form)
	el2.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			this.searchInTitles()
		}
	})

	const el3 = document.getElementById('titleField')
	// update the item title on pressing enter
	el3.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			this.updateTitle()
		}
	})
}

function data() {
	return {
		userStorySubtype: 0,
		spikeSubtype: 1,
		defectSubtype: 2,
		newDescription: '',
		newAcceptance: '',
		editorToolbar: [
			[{ header: [false, 1, 2, 3, 4, 5, 6] }],
			['bold', 'italic', 'underline', 'strike'],
			[{ list: 'ordered' }, { list: 'bullet' }],
			[{ indent: '-1' }, { indent: '+1' }], // outdent/indent
			['link', 'image', 'code-block']
		],
		// set to an invalid value; must be updated before use
		selectedPbiType: -1,
		// comments, history and attachments
		doAddition: false,
		startFiltering: false,
		isCommentsFilterActive: false,
		isHistoryFilterActive: false,
		newComment: '',
		fileInfo: null,
		newHistory: '',
		filterForCommentPrep: '',
		filterForHistoryPrep: '',
		// move data
		movePreflightData: {},
		warnForMoveToOtherLevel: false
	}
}

const computed = {
	undoTitle() {
		const changes = this.$store.state.changeHistory
		if (changes && changes.length > 0) {
			const changeType = changes[0].type
			switch (changeType) {
				case 'undoAcceptanceChange':
					return 'your change of the item acceptance criteria'
				case 'undoAddSprintIds':
					return 'your assignment to a sprint'
				case 'undoChangeTeam':
					return 'your change to another team'
				case 'undoDescriptionChange':
					return 'your change of the item description'
				case 'undoMove':
					return 'your change of priority (move of items)'
				case 'undoNewComment':
					return 'Remove your last added comment'
				case 'undoNewCommentToHistory':
					return 'Remove your last added comment to history'
				case 'undoNewNode':
					return 'your creation of a new item'
				case 'undoReqAreaColorChange':
					return 'your change of the color indicator for a requirement area'
				case 'undoPersonHoursChange':
					return 'your assigned effort in person hours for the spike'
				case 'undoRemove':
					return 'your removal of the item or branche of items'
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

		return `Welcome '${this.$store.state.userData.user}'.` + msg_2 + ` Your current database is set to '${this.$store.state.userData.currentDb}'.` + msg_4
	},

	squareText() {
		if (this.$store.state.online) { return 'sync' } else {
			return 'offline'
		}
	},

	squareColor() {
		return this.$store.state.online ? this.$store.state.eventSyncColor : '#ff0000'
	},

	subsribeTitle() {
		if (this.isFollower) {
			return 'Unsubscribe to change notices'
		} else return 'Subscribe to change notices'
	},

	invalidFileName() {
		return this.fileInfo === null || this.fileInfo.name === ''
	},

	uploadToLarge() {
		return this.fileInfo !== null && this.fileInfo.size > MAXUPLOADSIZE
	},

	description: {
		get() {
			return this.$store.state.currentDoc.description
		},
		set(newDescription) {
			this.newDescription = newDescription
		}
	},

	acceptanceCriteria: {
		get() {
			return this.$store.state.currentDoc.acceptanceCriteria
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
			if (this.$store.state.selectedForView === 'attachments') {
				this.fileInfo = null
				this.$refs.uploadRef.show()
			}
			if (this.$store.state.selectedForView === 'comments') {
				if (this.canCreateComments) {
					this.newComment = ''
					this.$refs.commentsEditorRef.show()
				} else {
					this.showLastEvent('Sorry, your assigned role(s) disallow you to create comments', SEV.WARNING)
				}
			}
			if (this.$store.state.selectedForView === 'history') {
				this.newHistory = ''
				this.$refs.historyEditorRef.show()
			}
		}
	},

	startFiltering: function (val) {
		if (val === true) {
			this.startFiltering = false
			if (this.$store.state.selectedForView === 'comments') {
				this.$refs.commentsFilterRef.show()
				this.isCommentsFilterActive = true
			}
			if (this.$store.state.selectedForView === 'history') {
				this.$refs.historyFilterRef.show()
				this.isHistoryFilterActive = true
			}
		}
	}
}

const methods = {
	stopFiltering() {
		if (this.$store.state.selectedForView === 'comments') {
			this.filterForCommentPrep = ''
			this.filterComments()
			this.isCommentsFilterActive = false
		}
		if (this.$store.state.selectedForView === 'history') {
			this.filterForHistoryPrep = ''
			this.filterHistory()
			this.isHistoryFilterActive = false
		}
	},

	resetFindId() {
		this.$store.dispatch('resetFindOnId', { caller: 'resetFindId' })
	},

	resetSearchTitles() {
		this.$store.dispatch('resetSearchInTitles', { caller: 'resetSearchTitles' })
	},

	patchTitle(node) {
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

	hasOtherUpdate(node) {
		return node.data.lastChange ? Date.now() - node.data.lastChange < HOURINMILIS : false
	},

	onSetMyFilters() {
		if (this.$store.state.filterTreeIsSet) {
			// if this filter was on, reset it after resetting any set search and reset the label of the button; pass the array of productmodels to apply the reset on
			const productModels = this.isOverviewSelected ? undefined : window.slVueTree.getCurrentProductModel()
			this.$store.dispatch('resetFilterAndSearches', { caller: 'onSetMyFilters', productModels })
		} else {
			// update the available req area options
			const currReqAreaIds = window.slVueTree.getCurrentReqAreaIds()
			this.$store.state.reqAreaOptions = []
			for (const id of currReqAreaIds) {
				this.$store.state.reqAreaOptions.push({ id, title: this.$store.state.reqAreaMapper[id] })
			}
			// open the modal to set the filters
			window.myFilters.show()
		}
	},

	/* Find, load and select an item with a given short or full Id. Scan the full tree */
	findItemOnId(id) {
		// reset any active search first
		this.$store.dispatch('resetAnySearches', {
			caller: 'findItemOnId', onSuccessCallback: () => {
				const isShortId = id.length === SHORTKEYLENGTH
				let node
				window.slVueTree.traverseModels((nm) => {
					if (isShortId && nm._id.slice(-5) === id || !isShortId && nm._id === id) {
						// short id or full id did match
						node = nm
						return false
					}
				})
				if (node) {
					// load and select the document if not already current
					if (node._id !== this.$store.state.currentDoc._id) {
						// select the node after loading the document
						this.$store.dispatch('loadDoc', {
							id: node._id, onSuccessCallback: () => {
								// create reset object
								this.$store.state.resetSearch = {
									searchType: 'findItemOnId',
									view: 'detailProduct',
									currentSelectedNode: this.getLastSelectedNode,
									node,
									highLight: 'noHighLight'
								}
								if (this.isDetailsViewSelected && node.productId !== this.$store.state.currentProductId) {
									// the node is found but not in the current product; collapse the currently selected product and switch to the new product
									this.$store.commit('switchCurrentProduct', node.productId)
								}
								// expand the product up to the found item
								window.slVueTree.showPathToNode(node, { noHighLight: true }, 'search')
								this.$store.commit('updateNodesAndCurrentDoc', { selectNode: node })
								this.showLastEvent(`The item with full Id ${node._id} is found and selected in product '${this.$store.state.currentProductTitle}'`, SEV.INFO)
							}
						})
					}
				} else {
					// the node is not found in the current product selection; try to find it in the database using the short id
					const lookUpId = isShortId ? id : id.slice(-5)
					this.$store.dispatch('loadItemByShortId', lookUpId)
				}
			}
		})
	},

	searchInTitles() {
		// cannot search on empty string
		if (this.$store.state.keyword === '') return

		// reset any active search first
		this.$store.dispatch('resetAnySearches', {
			caller: 'searchInTitles', onSuccessCallback: () => {
				const nodesFound = []
				const nodesCollapsed = []
				const nodesToScan = this.isOverviewSelected ? undefined : window.slVueTree.getCurrentProductModel()
				window.slVueTree.traverseModels((nm) => {
					// save node display state
					nm.tmp.savedIsExpandedInSearch = nm.isExpanded
					if (nm.title.toLowerCase().includes(this.$store.state.keyword.toLowerCase())) {
						// expand the product up to the found item and highlight it
						window.slVueTree.showPathToNode(nm, { doHighLight_1: true }, 'search')
						nodesFound.push(nm)
					} else {
						// collapse nodes with no findings in their subtree
						if (nm.level > LEVEL.PRODUCT) {
							if (nm.isExpanded) {
								collapseNode(nm)
								nodesCollapsed.push(nm)
							}
						}
					}
				}, nodesToScan)

				// create reset object
				this.$store.state.resetSearch = {
					searchType: 'searchInTitles',
					nodesFound,
					nodesCollapsed,
					view: 'detailProduct',
					currentSelectedNode: this.getLastSelectedNode
				}

				const productStr = this.isOverviewSelected ? 'all products' : ` product '${this.$store.state.currentProductTitle}'`
				if (nodesFound.length > 0) {
					// load and select the first node found
					this.$store.dispatch('loadDoc', {
						id: nodesFound[0]._id, onSuccessCallback: () => {
							this.$store.commit('updateNodesAndCurrentDoc', { selectNode: nodesFound[0] })
							if (nodesFound.length === 1) {
								this.showLastEvent(`One item title matches your search in ${productStr}. This item is selected`, SEV.INFO)
							} else this.showLastEvent(`${nodesFound.length} item titles match your search in ${productStr}. The first match is selected`, SEV.INFO)
						}
					})
				} else this.showLastEvent(`No item titles match your search in ${productStr}`, SEV.INFO)
			}
		})
	},

	/*
	* Restore the nodes in their previous (source) position.
	* Return true on success or false if the parent node does not exist or siblings have been removed (via sync by other user)
	*/
	moveBack(sourceParentId, targetParentId, reverseMoveMap) {
		const parentNode = window.slVueTree.getNodeById(targetParentId)
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
			window.slVueTree.removeNodes([node])
			// the node is assigned a new priority
			window.slVueTree.insertNodes(cursorPosition, [node], { skipUpdateProductId: node.parentId === 'root' })
			// restore the sprintId
			this.$store.commit('updateNodesAndCurrentDoc', { node, sprintId: r.sprintId })
		}
		return true
	},

	onUndoEvent() {
		const entry = this.$store.state.changeHistory.shift()
		switch (entry.type) {
			case 'undoAcceptanceChange':
				this.$store.dispatch('saveAcceptance', { node: entry.node, newAcceptance: entry.oldAcceptance, timestamp: entry.prevLastContentChange, createUndo: false })
				break
			case 'undoAddSprintIds':
				this.$store.dispatch('removeSprintIds', { parentId: entry.id, sprintId: entry.sprintId, itemIds: entry.itemIds, sprintName: entry.sprintName, createUndo: false })
				break
			case 'undoChangeTeam':
				this.$store.dispatch('assignToMyTeam', { node: entry.node, newTeam: entry.oldTeam, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoDescriptionChange':
				this.$store.dispatch('saveDescription', { node: entry.node, newDescription: entry.oldDescription, timestamp: entry.prevLastContentChange, createUndo: false })
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
						if (!window.slVueTree.dependencyViolationsFound()) this.showLastEvent('Item(s) move is undone', SEV.INFO)
						// update the nodes in the database
						this.$store.dispatch('updateMovedItemsBulk', { moveDataContainer, undoMove: true })
					} else this.showLastEvent('Undo failed. Sign out and -in again to recover.', SEV.ERROR)
				}
				break
			case 'undoNewNode':
				this.$store.dispatch('removeBranch', { node: entry.newNode, createUndo: false })
				break
			case 'undoNewComment':
				this.$store.dispatch('undoNewCommentAsync', { node: entry.node })
				break
			case 'undoNewCommentToHistory':
				this.$store.dispatch('undoNewCommentToHistoryAsync', { node: entry.node })
				break
			case 'undoReqAreaColorChange':
				this.$store.dispatch('updateColorDb', { node: entry.node, newColor: entry.prevColor, createUndo: false })
				break
			case 'undoPersonHoursChange':
				this.$store.dispatch('setPersonHours', { node: entry.node, newHrs: entry.oldPersonHours, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoRemove':
				this.$store.dispatch('restoreItemAndDescendants', entry)
				break
			case 'undoRemoveSprintIds':
				this.$store.dispatch('addSprintIds', { parentId: entry.parentId, itemIds: entry.itemIds, sprintId: entry.sprintId, sprintName: entry.sprintName, createUndo: false })
				break
			case 'undoSelectedPbiType':
				this.$store.dispatch('setSubType', { node: entry.node, newSubType: entry.oldSubType, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoSetDependency':
				this.$store.dispatch('undoSetDependencyAsync', entry)
				break
			case 'undoStateChange':
				this.$store.dispatch('setState', { node: entry.node, newState: entry.oldState, position: entry.node.ind, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoStoryPointsChange':
				this.$store.dispatch('setStoryPoints', { node: entry.node, newPoints: entry.oldPoints, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoTitleChange':
				this.$store.dispatch('setDocTitle', { node: entry.node, newTitle: entry.oldTitle, timestamp: entry.prevLastContentChange, createUndo: false })
				break
			case 'undoTsSizeChange':
				this.$store.dispatch('setTsSize', { node: entry.node, newSizeIdx: entry.oldTsSize, timestamp: entry.prevLastChange, createUndo: false })
				break
			case 'undoUpdateReqArea':
				this.$store.dispatch('updateReqArea', { node: entry.node, reqareaId: entry.oldAreaId, timestamp: entry.prevLastChange, createUndo: false })
				break
		}
	},

	subscribeClicked() {
		this.$store.dispatch('changeSubsription', { node: this.getLastSelectedNode, timestamp: Date.now() })
	},

	filterComments() {
		this.$store.state.filterForComment = this.filterForCommentPrep
	},

	uploadAttachment() {
		this.$store.dispatch('uploadAttachmentAsync', {
			node: this.getLastSelectedNode,
			fileInfo: this.fileInfo,
			currentDocId: this.$store.state.currentDoc._id,
			timestamp: Date.now()
		})
	},

	filterHistory() {
		this.$store.state.filterForHistory = this.filterForHistoryPrep
	},

	insertComment() {
		this.$store.dispatch('addComment', {
			node: this.getLastSelectedNode,
			comment: this.newComment,
			timestamp: Date.now()
		})
	},

	insertHist() {
		this.$store.dispatch('addHistoryComment', {
			node: this.getLastSelectedNode,
			comment: this.newHistory,
			timestamp: Date.now()
		})
	},

	/* Tree and database update methods */
	updateDescription(node = this.getLastSelectedNode) {
		if (this.$store.state.currentDoc.description !== this.newDescription) {
			// skip update when not changed
			if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the description of this item')) {
				this.$store.dispatch('saveDescription', {
					node,
					newDescription: this.newDescription,
					timestamp: Date.now(),
					createUndo: true
				})
			}
		}
	},

	updateAcceptance(node = this.getLastSelectedNode) {
		// skip update when not changed
		if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
			if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the acceptance criteria of this item')) {
				this.$store.dispatch('saveAcceptance', {
					node,
					newAcceptance: this.newAcceptance,
					timestamp: Date.now(),
					createUndo: true
				})
			}
		}
	},

	updateTsSize() {
		if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the t-shirt size of this item')) {
			const node = this.getLastSelectedNode
			const size = document.getElementById('tShirtSizeId').value.toUpperCase()
			const sizeArray = this.$store.state.configData.tsSize
			if (sizeArray.includes(size)) {
				const newSizeIdx = sizeArray.indexOf(size)
				if (newSizeIdx !== this.$store.state.currentDoc.tssize) {
					this.$store.dispatch('setTsSize', {
						node,
						newSizeIdx,
						timestamp: Date.now(),
						createUndo: true
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
		if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the story points size of this item')) {
			const node = this.getLastSelectedNode
			const el = document.getElementById('storyPointsId')
			if (isNaN(el.value) || el.value < 0) {
				el.value = '?'
				return
			}
			const newPoints = parseInt(el.value)
			if (newPoints !== this.$store.state.currentDoc.spsize) {
				this.$store.dispatch('setStoryPoints', {
					node,
					newPoints,
					timestamp: Date.now(),
					createUndo: true
				})
			}
		}
	},

	updatePersonHours() {
		if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change story person hours of this item')) {
			const node = this.getLastSelectedNode
			const el = document.getElementById('personHoursId')
			if (isNaN(el.value) || el.value < 0) {
				el.value = '?'
				return
			}
			const newHrs = parseInt(el.value)
			if (newHrs !== this.$store.state.currentDoc.spikepersonhours) {
				this.$store.dispatch('setPersonHours', {
					node,
					newHrs,
					timestamp: Date.now(),
					createUndo: true
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
		if (newState !== this.$store.state.currentDoc.state) {
			if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the state of this item')) {
				const node = this.getLastSelectedNode
				this.$store.dispatch('setState', {
					node,
					newState,
					position: node.ind,
					timestamp: Date.now(),
					createUndo: true
				})
			}
		}
	},

	updateTitle() {
		const oldTitle = this.$store.state.currentDoc.title
		const newTitle = document.getElementById('titleField').value
		if (oldTitle === newTitle) return

		if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the title of this item')) {
			const node = this.getLastSelectedNode
			// update current document in database
			this.$store.dispatch('setDocTitle', {
				node,
				newTitle: newTitle,
				timestamp: Date.now(),
				createUndo: true
			})
		}
	},

	nodeDropped(nodes, cursorPosition) {
		this.movePreflightData = this.checkMove(nodes, cursorPosition)
		if (this.$store.state.userData.myOptions.levelShiftWarning === 'do_warn' && this.movePreflightData.levelShift !== 0) {
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
	* IMPORTANT: To guarantee an immediate response, as an exception to the rule the tree is updated before the database.
	* If the move fails in the database the user must reload the tree to return to the previous state.
	*/
	doMove(nodes, cursorPosition) {
		const moveDataContainer = this.moveNodes(nodes, cursorPosition)
		// show the event message before the database update is finished
		if (!window.slVueTree.dependencyViolationsFound()) {
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
		this.$store.dispatch('updateMovedItemsBulk', { moveDataContainer, move: true })
	},

	getViewOptions() {
		const options = [
			{ text: 'Comments', value: 'comments' },
			{ text: 'Attachments', value: 'attachments', disabled: !this.canSeeAndUploadAttachments },
			{ text: 'History', value: 'history' }
		]
		return options
	},

	showMoreMessages() {
		this.$refs.historyEventRef.show()
	}
}

export default {
	mixins: [constants, authorization, utilities],
	mounted,
	data,
	computed,
	watch,
	methods
}
