import {
	mapGetters
} from 'vuex'

import {
	Multipane,
	MultipaneResizer
} from 'vue-multipane'

import {
	VueEditor
} from 'vue2-editor'

import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'

import { showLastEvent } from '../mixins/showLastEvent.js'

const INFO = 0
const WARNING = 1
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
var nodeSelected
var numberOfNodesSelected = 0
var newNode = {}
var movedNode = null

export default {
	mixins: [showLastEvent],
	data() {
		return {
			databaseLevel: DATABASELEVEL,
			productLevel: PRODUCTLEVEL,
			epicLevel: EPICLEVEL,
			featureLevel: FEATURELEVEL,
			pbiLevel: PBILEVEL,
			newDescription: '',
			newAcceptance: '',
			contextNodeSelected: undefined,
			contextNodeTitle: '',
			contextNodeLevel: 0,
			contextNodeType: '',
			contextChildType: '',
			contextSelected: undefined,
			contextWarning: undefined,
			removeDescendantsCount: 0,
			// default to sibling node (no creation of descendant)
			insertOptionSelected: 1,
			selectedNodesTitle: '',
			moveSourceProductId: '',

			editorToolbar: [
				[{
					header: [false, 1, 2, 3, 4, 5, 6]
				}],
				['bold', 'italic', 'underline', 'strike'],
				[{
					'list': 'ordered'
				}, {
					'list': 'bullet'
				}],
				[{
					indent: "-1"
				}, {
					indent: "+1"
				}], // outdent/indent
				['link', 'image', 'code-block']
			],
			// set to an invalid value; must be updated before use
			selectedPbiType: -1,
			// comments, history and attachments
			selectedForView: 'comments',
			startEditor: false,
			newComment: "",
			newHistory: "",
			startFiltering: false,
			filterForCommentPrep: "",
			filterForComment: "",
			filterForHistoryPrep: "",
			filterForHistory: ""
		}
	},

	/* Select the users default top product node. Note that at all times at least one node must be selected */
	mounted() {
		window.history.scrollRestoration = "manual"
		// expose instance to the global namespace
		window.slVueTree = this.$refs.slVueTree
		// the product is selected in load.js
		nodeSelected = window.slVueTree.getSelectedProduct()
	},

	computed: {
		...mapGetters([
			//from store.js
			'isAuthenticated',
			'isFollower',
			'isServerAdmin',
			'canCreateComments',
			'getCurrentItemLevel',
			'getCurrentItemTsSize',
			// from load.js
			'canWriteLevels'
		]),
		subsribeTitle() {
			if (this.isFollower) {
				return "Unsubscribe to change notices"
			} else {
				return "Subscribe to change notices"
			}
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
		getFilteredComments() {
			let filteredComments = []
			let comments = this.$store.state.currentDoc.comments
			for (let i = 0; i < comments.length; i++) {
				let allText = window.atob(comments[i].comment)
				allText += comments[i].by
				allText += comments[i].email
				allText += this.mkTimestamp(comments[i].timestamp)
				if (allText.includes(this.filterForComment)) {
					filteredComments.push(comments[i])
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
			let filteredComments = []
			for (let i = 0; i < this.$store.state.currentDoc.history.length; i++) {
				let histItem = this.$store.state.currentDoc.history[i]
				let allText = ""
				let keys = Object.keys(histItem)
				for (let j = 0; j < keys.length; j++) {
					if (keys[j] === "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
					if (keys[j] === "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
					if (keys[j] === "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
					if (keys[j] === "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
					if (keys[j] === "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
					if (keys[j] === "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
					if (keys[j] === "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
					if (keys[j] === "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
					if (keys[j] === "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
					if (keys[j] === "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
					if (keys[j] === "nodeDroppedEvent") allText += this.mkNodeDroppedEvent(histItem[keys[j]])
					if (keys[j] === "descendantMoved") allText += this.mkDescendantMoved(histItem[keys[j]])
					if (keys[j] === "nodeRemoveEvent") allText += this.mkNodeRemoveEvent(histItem[keys[j]])
					if (keys[j] === "by") allText += this.mkBy(histItem[keys[j]])
					if (keys[j] === "email") allText += this.mkEmail(histItem[keys[j]])
					if (keys[j] === "timestamp") allText += this.mkTimestamp(histItem[keys[j]])
				}
				if (allText.includes(this.filterForHistory)) {
					filteredComments.push(histItem)
				}
			}
			return filteredComments
		}
	},

	watch: {
		'selectedPbiType': function (val) {
			// prevent looping
			if (val !== this.$store.state.currentDoc.subtype) {
				if (this.canWriteLevels[this.getCurrentItemLevel]) {
					nodeSelected.data.subtype = val
					nodeSelected.data.lastChange = Date.now()
					this.$store.dispatch('setSubType', {
						'newSubType': val
					})
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you change the pbi type", WARNING)
				}
			}

		},
		'startEditor': function (val) {
			if (val === true) {
				this.startEditor = false
				if (this.canCreateComments) {
					if (this.selectedForView === 'comments') {
						this.newComment = ''
						this.$refs.commentsEditorRef.show()
					}
					if (this.selectedForView === 'history') {
						this.newHistory = ''
						this.$refs.historyEditorRef.show()
					}
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to create comments", WARNING)
				}
			}
		},
		'startFiltering': function (val) {
			if (val === true) {
				this.startFiltering = false
				if (this.selectedForView === 'comments') this.$refs.commentsFilterRef.show()
				if (this.selectedForView === 'history') this.$refs.historyFilterRef.show()
			}
		}
	},

	methods: {
		subscribeClicked() {
			this.$store.dispatch('changeSubsription')
		},
		filterComments() {
			this.filterForComment = this.filterForCommentPrep
		},
		filterHistory() {
			this.filterForHistory = this.filterForHistoryPrep
		},
		insertComment() {
			this.$store.dispatch('addComment', {
				'comment': this.newComment
			})
		},
		insertHist() {
			this.$store.dispatch('addHistoryComment', {
				'comment': this.newHistory
			})
		},
		/* Presentation methods */
		mkSubscribeEvent(value) {
			if (value[0]) {
				return "<h5>You unsubscribed for messages about this backlog item.</h5>"
			} else {
				return "<h5>You subscribed to receive messages about this backlog item.</h5>"
			}
		},
		mkCreateEvent(value) {
			return "<h5>This " + this.getLevelText(value[0]) + " was created under parent '" + value[1] + "'</h5>"
		},
		mkSetSizeEvent(value) {
			return "<h5>T-Shirt estimate changed from </h5>" + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
		},
		mkSetPointsEvent(value) {
			return "<h5>Storypoints estimate changed from </h5>" + value[0] + ' to ' + value[1]
		},
		mkSetHrsEvent(value) {
			return "<h5>Spike estimate hours changed from </h5>" + value[0] + ' to ' + value[1]
		},
		mkSetStateEvent(value) {
			return "<h5>The state of the item has changed from '" + this.getItemStateText(value[0]) + "' to '" + this.getItemStateText(value[1]) + "'</h5>"
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
			let txt = ""
			if (value[0] === value[1]) {
				txt = "<h5>The item changed priority to position " + (value[2] + 1) + " under parent '" + value[3] + "'</h5>"
				txt += (value[4] > 0) ? "<p>" + value[4] + " descendants were also moved.</p>" : ""
				return txt
			} else {
				let txt = ""
				txt = "<h5>The item changed type from " + this.getLevelText(value[0]) + " to " + this.getLevelText(value[1]) + ".</h5>"
				txt += "<p>The new position is " + (value[2] + 1) + " under parent '" + value[3] + "'</p>"
				txt += (value[4] > 0) ? "<p>" + value[4] + " descendants also changed type.</p>" : ""
				return txt
			}
		},
		mkDescendantMoved(value) {
			return "<h5>Item was moved as descendant from '" + value[0] + "'</h5>"
		},
		mkNodeRemoveEvent(value) {
			return "<h5>" + this.getLevelText(value[0]) + " with title '" + value[1] + "' and " + value[2] + " descendants are removed</h5>"
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
		prepCommentsText(key, value) {
			if (key === "comment") return this.mkComment(value)
			if (key === "by") return this.mkBy(value)
			if (key === "email") return this.mkEmail(value)
			if (key === "timestamp") return this.mkTimestamp(value)
		},
		prepHistoryText(key, value) {
			if (key === "comment") return this.mkComment(value)
			if (key === "subscribeEvent") return this.mkSubscribeEvent(value)
			if (key === "createEvent") return this.mkCreateEvent(value)
			if (key === "setSizeEvent") return this.mkSetSizeEvent(value)
			if (key === "setPointsEvent") return this.mkSetPointsEvent(value)
			if (key === "setHrsEvent") return this.mkSetHrsEvent(value)
			if (key === "setStateEvent") return this.mkSetStateEvent(value)
			if (key === "setTitleEvent") return this.mkSetTitleEvent(value)
			if (key === "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
			if (key === "descriptionEvent") return this.mkDescriptionEvent(value)
			if (key === "acceptanceEvent") return this.mkAcceptanceEvent(value)
			if (key === "nodeDroppedEvent") return this.mkNodeDroppedEvent(value)
			if (key === "descendantMoved") return this.mkDescendantMoved(value)
			if (key === "nodeRemoveEvent") return this.mkNodeRemoveEvent(value)
			if (key === "by") return this.mkBy(value)
			if (key === "email") return this.mkEmail(value)
			if (key === "timestamp") return this.mkTimestamp(value)
		},
		/* Database update methods */
		updateDescription() {
			// skip update when not changed
			if (this.$store.state.currentDoc.description !== this.newDescription) {
				if (this.canWriteLevels[this.getCurrentItemLevel]) {
					// update the current doc in memory
					this.$store.state.currentDoc.description = this.newDescription
					nodeSelected.data.lastChange = Date.now()
					// update the doc in the database
					this.$store.dispatch('saveDescription', {
						'newDescription': this.newDescription
					})
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the description of this item", WARNING)
				}
			}
		},
		updateAcceptance() {
			// skip update when not changed
			if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
				if (this.canWriteLevels[this.getCurrentItemLevel]) {
					// update the current doc in memory
					this.$store.state.currentDoc.acceptanceCriteria = this.newAcceptance
					nodeSelected.data.lastChange = Date.now()
					// update the doc in the database
					this.$store.dispatch('saveAcceptance', {
						'newAcceptance': this.newAcceptance
					})
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the acceptance criteria of this item", WARNING)
				}
			}
		},
		updateTsSize() {
			if (this.canWriteLevels[this.getCurrentItemLevel]) {
				let size = document.getElementById("tShirtSizeId").value.toUpperCase()
				const sizeArray = this.$store.state.config.tsSize
				if (sizeArray.includes(size)) {
					nodeSelected.data.lastChange = Date.now()
					this.$store.dispatch('setSize', {
						'newSizeIdx': sizeArray.indexOf(size)
					})
				} else {
					let sizes = ''
					for (let i = 0; i < sizeArray.length - 1; i++) {
						sizes += sizeArray[i] + ', '
					}
					alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
				}
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to change the t-shirt size of this item", WARNING)
			}
		},
		updateStoryPoints() {
			if (this.canWriteLevels[this.getCurrentItemLevel]) {
				let el = document.getElementById("storyPointsId")
				if (isNaN(el.value) || el.value < 0) {
					el.value = '?'
					return
				}
				nodeSelected.data.lastChange = Date.now()
				this.$store.dispatch('setStoryPoints', {
					'newPoints': el.value
				})
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to change the story points size of this item", WARNING)
			}
		},
		updatePersonHours() {
			if (this.canWriteLevels[this.getCurrentItemLevel]) {
				let el = document.getElementById("personHoursId")
				if (isNaN(el.value) || el.value < 0) {
					el.value = '?'
					return
				}
				nodeSelected.data.lastChange = Date.now()
				this.$store.dispatch('setPersonHours', {
					'newHrs': el.value
				})
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to change the person hours of this item", WARNING)
			}
		},
		onStateChange(idx) {
			if (this.canWriteLevels[this.getCurrentItemLevel]) {
				// update the tree
				nodeSelected.data.state = idx
				nodeSelected.data.lastChange = Date.now()
				// update current document in database
				this.$store.dispatch('setState', {
					'newState': idx
				})
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to change the state of this item", WARNING)
			}
		},
		updateTitle() {
			const oldTitle = this.$store.state.currentDoc.title
			const newTitle = document.getElementById("titleField").value
			if (oldTitle === newTitle) return

			if (this.canWriteLevels[this.getCurrentItemLevel]) {
				// update the tree
				let node = nodeSelected
				node.title = newTitle
				node.data.lastChange = Date.now()
				// update current document in database
				this.$store.dispatch('setDocTitle', {
					'newTitle': newTitle
				})
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to change the title of this item", WARNING)
			}
		},
		/* mappings from config */
		getLevelText(level) {
			if (level < 0 || level > PBILEVEL) {
				return 'Level not supported'
			}
			return this.$store.state.config.itemType[level]
		},
		getItemStateText(idx) {
			if (idx < 0 || idx > PBILEVEL) {
				return 'Error: unknown state'
			}
			return this.$store.state.config.itemState[idx]
		},
		getTsSize(idx) {
			if (idx < 0 || idx >= this.$store.state.config.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return this.$store.state.config.tsSize[idx]
		},
		getSubType(idx) {
			if (idx < 0 || idx >= this.$store.state.config.subtype.length) {
				return 'Error: unknown subtype'
			}
			return this.$store.state.config.subtype[idx]
		},
		getKnownRoles() {
			return this.$store.state.config.knownRoles
		},
		itemTitleTrunc(length, title) {
			if (title.length <= length) return title;
			return title.substring(0, length - 4) + '...';
		},
		haveSameParent(nodes) {
			let parentId = nodes[0].parentId
			if (nodes.length > 0) {
				for (let i = 1; i < nodes.length; i++) {
					if (nodes[i].parentId !== parentId) {
						return false
					}
				}
			}
			return true
		},
		/* event handling */
		nodeSelectedEvent(selNodes) {
			// update explicitly as the tree is not an input field receiving focus so that @blur on the editor is not emitted
			this.updateDescription()
			// both an update of the description and the acceptance criteria should NOT happen
			this.updateAcceptance()
			if (!this.haveSameParent(selNodes)) {
				this.showLastEvent('You can only select nodes with the same parent.', WARNING)
				return
			}
			numberOfNodesSelected = selNodes.length
			// update the first (highest in hierarchie) selected node
			nodeSelected = selNodes[0]
			// if the root node is selected do nothing
			if (nodeSelected._id !== 'root') {
				// if the user clicked on a node of another product
				if (this.$store.state.load.currentProductId !== nodeSelected.productId) {
					// clear any outstanding filters
					if (this.$store.state.filterOn || this.$store.state.searchOn) {
						window.slVueTree.resetFilters('nodeSelectedEvent')
					}
					// collapse the previously selected product
					window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
					// update current productId and title
					this.$store.state.load.currentProductId = nodeSelected.productId
					this.$store.state.load.currentProductTitle = nodeSelected.title
					// expand the newly selected product up to the feature level and select the product node again
					window.slVueTree.expandTree(FEATURELEVEL)
				}
			}
			// load the document if not already in memory
			if (nodeSelected._id !== this.$store.state.currentDoc._id) {
				this.$store.dispatch('loadDoc', nodeSelected._id)
			}
			const warnMsg = !this.canWriteLevels[selNodes[0].level] ? " You only have READ permission" : ""
			const title = this.itemTitleTrunc(60, selNodes[0].title)
			let evt = ""
			if (selNodes.length === 1) {
				this.selectedNodesTitle = title
				evt = `${this.getLevelText(selNodes[0].level)} '${this.selectedNodesTitle}' is selected.` + warnMsg
			} else {
				this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
				evt = `${this.getLevelText(selNodes[0].level)} ${this.selectedNodesTitle} are selected.` + warnMsg
			}
			this.showLastEvent(evt, warnMsg === "" ? INFO : WARNING)
		},
		nodeToggled(node) {
			this.showLastEvent(`Node '${node.title}' is ${node.isExpanded ? 'collapsed' : 'expanded'}`, INFO)
		},
		getDescendantsInfo(node) {
			const path = node.path
			const descendants = []
			let initLevel = node.level
			let count = 0
			let maxDepth = node.level
			window.slVueTree.traverseModels((nodeModel) => {
				if (window.slVueTree.comparePaths(nodeModel.path, path) === 1) {
					descendants.push(nodeModel)
					count++
					if (nodeModel.level > maxDepth) maxDepth = nodeModel.level
				}
			}, [node])
			return {
				descendants: descendants,
				count: count,
				depth: maxDepth - initLevel
			}
		},
		/*
		/ Use this event to check if the drag is allowed. If not, issue a warning.
		*/
		beforeNodeDropped(draggingNodes, position, cancel) {
			/*
			 * Disallow drop on node were the user has no write authority
			 * Disallow drop when moving over more than 1 level.
			 * Dropping items with descendants is not possible when any descendant would land higher than the highest level (pbilevel).
			 * precondition: the selected nodes have all the same parent (same level)
			 */
			let checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
				const levelChange = Math.abs(targetLevel - sourceLevel)
				let failedCheck1 = !this.canWriteLevels[position.nodeModel.level]
				let failedCheck2 = levelChange > 1
				let failedCheck3 = (targetLevel + this.getDescendantsInfo(node).depth) > PBILEVEL
				if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
				return failedCheck1 || failedCheck2 || failedCheck3
			}
			const sourceLevel = draggingNodes[0].level
			let targetLevel = position.nodeModel.level
			// are we dropping 'inside' a node creating children to that node?
			if (position.placement === 'inside') {
				targetLevel++
				if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
					cancel(true)
					return
				}
			} else {
				// a drop before of after an existing sibling
				if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
					cancel(true)
					return
				}
			}
		},
		/*
		 * Update the tree when one or more nodes are dropped on another location
		 * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
		 */
		nodeDropped(draggingNodes, position) {
			let clickedLevel = draggingNodes[0].level
			let dropLevel = position.nodeModel.level
			// drop inside?
			if (position.placement === 'inside') {
				dropLevel++
			}
			let levelChange = clickedLevel - dropLevel
			// update the nodes in the database
			let payloadArray = []
			for (let i = 0; i < draggingNodes.length; i++) {
				let descendants = this.getDescendantsInfo(draggingNodes[i]).descendants
				const payloadItem = {
					'_id': draggingNodes[i]._id,
					'productId': draggingNodes[i].productId,
					'newParentId': draggingNodes[i].parentId,
					'newPriority': draggingNodes[i].data.priority,
					'newParentTitle': null,
					'oldParentTitle': draggingNodes[i].title,
					'oldLevel': clickedLevel,
					'newLevel': draggingNodes[i].level,
					'newInd': draggingNodes[i].ind,
					'descendants': descendants
				}
				payloadArray.push(payloadItem)
			}
			this.$store.dispatch('updateDropped', {
				next: 0,
				payloadArray: payloadArray
			})
			// create the event message
			const title = this.itemTitleTrunc(60, draggingNodes[0].title)
			let evt = ""
			if (draggingNodes.length === 1) {
				evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.nodeModel.title}'`
			} else {
				evt = `${this.getLevelText(clickedLevel)} '${title}' and ${draggingNodes.length - 1} other item(s) are dropped ${position.placement} '${position.nodeModel.title}'`
			}
			if (levelChange !== 0) evt += ' as ' + this.getLevelText(dropLevel)
			this.showLastEvent(evt, INFO)
		},
		showContextMenu(node) {
			this.contextSelected = undefined
			this.insertOptionSelected = 1
			// user must have write access on this level && node must be selected first && user cannot remove the database && only one node can be selected
			if (this.canWriteLevels[node.level] && node._id === nodeSelected._id && node.level > 1 && numberOfNodesSelected === 1) {
				this.contextNodeSelected = node
				this.contextNodeTitle = node.title
				this.contextNodeLevel = node.level
				this.contextNodeType = this.getLevelText(node.level)
				this.contextChildType = this.getLevelText(node.level + 1)
				this.removeDescendantsCount = this.getDescendantsInfo(node).count
				this.$refs.contextMenuRef.show()
			}
		},
		showSelected() {
			switch (this.contextSelected) {
				case 0:
					this.contextWarning = undefined
					this.insertOptionSelected = 1
					return 'Insert a ' + this.contextNodeType + ' below this item'
				case 1:
					this.insertOptionSelected = 2
					this.contextWarning = undefined
					return 'Insert a ' + this.contextChildType + ' inside this ' + this.contextNodeType
				case 2:
					this.contextWarning = undefined
					if (!this.$store.state.moveOngoing) {
						return 'Item selected. Choose drop position in any other product'
					} else {
						return 'Drop position is set'
					}
				case 3:
					this.contextWarning = 'WARNING: this action cannot be undone!'
					return `Remove this ${this.contextNodeType} and ${this.removeDescendantsCount} descendants`
				default:
					this.contextWarning = undefined
					return 'nothing selected as yet'
			}
		},
		procSelected() {
			switch (this.contextSelected) {
				case 0:
					this.doInsert()
					break
				case 1:
					this.doInsert()
					break
				case 2:
					this.moveItemToOtherProduct()
					break
				case 3:
					this.doRemove()
					break
			}
		},
		moveItemToOtherProduct() {
			if (this.$store.state.moveOngoing) {
				const targetPosition = window.slVueTree.lastSelectCursorPosition
				// only allow move to new parent 1 level higher (lower value) than the source node
				if (targetPosition.nodeModel.level !== movedNode.level - 1) {
					this.showLastEvent('You can only move to a ' + this.getLevelText(movedNode.level - 1), WARNING)
					return
				}
				// move the node to the new place and update the productId and parentId
				window.slVueTree.moveNodes(targetPosition, [movedNode])
				const targetNode = targetPosition.nodeModel
				// the path to new node is immediately below the selected node
				const newPath = targetNode.path.concat([0])
				const newNode = window.slVueTree.getNodeModel(newPath)
				const descendants = this.getDescendantsInfo(newNode).descendants
				const payloadItem = {
					'_id': newNode._id,
					'oldProductId': this.moveSourceProductId, // ToDo: use this field in the history record
					'productId': newNode.productId,
					'newParentId': newNode.parentId,
					'newPriority': newNode.data.priority,
					'newParentTitle': null, // will be set by 'updateDropped'
					'oldParentTitle': newNode.title,
					'oldLevel': newNode.level,
					'newLevel': newNode.level, // the level cannot change
					'newInd': 0, // immediately below the parent
					'descendants': descendants
				}
				// update the database
				this.$store.dispatch('updateDropped', {
					next: 0,
					payloadArray: [payloadItem]
				})
				this.$store.state.moveOngoing = false
			} else {
				this.$store.state.moveOngoing = true
				this.moveSourceProductId = this.$store.state.load.currentProductId
				movedNode = this.contextNodeSelected
			}
		},
		/*
		 * In the database both the selected node and all its descendants will be tagged with a delmark
		 */
		doRemove() {
			const selectedNode = this.contextNodeSelected
			const descendantsInfo = this.getDescendantsInfo(selectedNode)
			this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
			const path = selectedNode.path
			const descendants = descendantsInfo.descendants
			// when removing a product
			if (selectedNode.level === this.productLevel) {
				// cannot remove the last assigned product
				if (this.$store.state.load.userAssignedProductIds.length === 1) {
					this.showLastEvent("You cannot remove your last assigned product, but you can remove the epics", WARNING)
					return
				}
				// remove from the menu options
				for (let i = 0; i < this.$store.state.load.myProductOptions.length; i++) {
					if (this.$store.state.load.myProductOptions[i].value === selectedNode._id) {
						this.$store.state.load.myProductOptions.splice(i, 1)
					}
				}
				// remove from the user assingned products
				let newProducts = this.$store.state.load.userAssignedProductIds
				const idx = newProducts.indexOf(selectedNode._id)
				if (idx > -1) {
					newProducts.splice(idx, 1)
				}
				this.$store.state.load.userAssignedProductIds = newProducts
				// Add the removed product id to the removeProducts list in the config document
				this.$store.dispatch('addToRemovedProducts', selectedNode._id)
			}
			// set remove mark in the database on the clicked item
			const payload = {
				'node': selectedNode,
				'descendantsCount': descendants.length,
				'doRegHist': true
			}
			this.$store.dispatch('removeDoc', payload)
			// for items lower in the hierarchie than product remove the descendants without registering history in parents which are removed anyway
			if (descendants.length > 0) {
				this.$store.dispatch('removeDescendantsBulk', descendants)
			}
			// collapse the branch and make the removed node invisible
			selectedNode.isExpanded = false
			selectedNode.doShow = false
			// after removal select the visible predecessor of the removed node
			const prevNode = window.slVueTree.getPrevVisibleNode(path)
			prevNode.isSelected = true
			nodeSelected = prevNode
			// now we can remove the node and its children
			window.slVueTree.removeSingle(selectedNode, prevNode)
		},
		getPbiOptions() {
			this.selectedPbiType = this.$store.state.currentDoc.subtype
			let options = [{
				text: 'User story',
				value: 0,
			},
			{
				text: 'Spike',
				value: 1,
			},
			{
				text: 'Defect',
				value: 2,
			}
			]
			return options
		},
		getViewOptions() {
			let options = [{
				text: 'Comments',
				value: 'comments',
			},
			{
				text: 'Attachments',
				value: 'attachments',
			},
			{
				text: 'History',
				value: 'history',
			}
			]
			return options
		},
		/*
		 * Create and insert a new node in the tree and create a document for this new item
		 * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
		 */
		doInsert() {
			const locationPath = this.contextNodeSelected.path
			let newNodeLocation
			let path
			let idx
			// prepare the new node for insertion and set isSelected to true
			newNode = {
				productId: this.$store.state.load.currentProductId,
				children: [],
				isExpanded: false,
				savedIsExpanded: false,
				isDraggable: true,
				isSelectable: true,
				isSelected: true,
				doShow: true,
				savedDoShow: true,
				data: {
					priority: null,
					state: 0,
					subtype: 0,
					lastChange: Date.now(),
					sessionId: this.$store.state.sessionId,
					distributeEvent: true
				}
			}
			let insertLevel = this.contextNodeSelected.level
			if (this.insertOptionSelected === 1) {
				// new node is a sibling placed below (after) the selected node
				newNodeLocation = {
					nodeModel: this.contextNodeSelected,
					placement: 'after'
				}
				idx = locationPath.slice(-1)[0] + 1
				path = locationPath.slice(0, locationPath.length - 1).concat(idx)
				newNode.parentId = this.contextNodeSelected.parentId
				newNode.title = 'New ' + this.getLevelText(insertLevel)
				newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
			} else {
				// new node is a child placed a level lower (inside) than the selected node
				insertLevel += 1

				newNodeLocation = {
					nodeModel: this.contextNodeSelected,
					placement: 'inside'
				}
				idx = 0
				path = this.contextNodeSelected.path.concat(0)
				newNode.parentId = this.contextNodeSelected._id
				newNode.title = 'New ' + this.getLevelText(insertLevel)
				newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
			}
			// add the location values
			newNode.path = path
			newNode.pathStr = JSON.stringify(path)
			newNode.ind = idx
			newNode.level = path.length

			if (this.canWriteLevels[insertLevel]) {
				// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
				const newId = Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
				newNode._id = newId
				newNode.shortId = newId.slice(-5)
				if (newNodeLocation.placement === 'inside') {
					// unselect the node that was clicked before the insert and expand it to show the inserted node
					this.contextNodeSelected.isSelected = false
					this.contextNodeSelected.isExpanded = true
				} else {
					// unselect the node that was clicked before the insert
					this.contextNodeSelected.isSelected = false
				}
				nodeSelected = newNode
				// insert the new node in the tree
				window.slVueTree.insertSingle(newNodeLocation, newNode)
				this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
				// create a new document and store it
				const initData = {
					"_id": newNode._id,
					"shortId": newNode.shortId,
					"type": "backlogItem",
					"productId": newNode.productId,
					"parentId": newNode.parentId,
					"team": "not assigned yet",
					"level": insertLevel,
					"subtype": 0,
					"state": 0,
					"tssize": 3,
					"spsize": 0,
					"spikepersonhours": 0,
					"reqarea": null,
					"title": newNode.title,
					"followers": [],
					"description": "",
					"acceptanceCriteria": window.btoa("<p>Please don't forget</p>"),
					"priority": newNode.data.priority,
					"attachments": [],
					"comments": [],
					"history": [{
						"createEvent": null,
						"by": this.$store.state.user,
						"email": this.$store.state.load.email,
						"timestamp": Date.now(),
						"sessionId": this.$store.state.sessionId,
						"distributeEvent": true
					}],
					"delmark": false
				}
				// update the database
				this.$store.dispatch('createDoc', {
					'initData': initData
				})
			} else {
				this.showLastEvent("Sorry, your assigned role(s) disallow you to create new items of this type", WARNING)
			}
		},
		doCancel() {
			this.$store.state.moveOngoing = false
		}
	},

	components: {
		Multipane,
		MultipaneResizer,
		VueEditor,
		slVueTree
	}
}
