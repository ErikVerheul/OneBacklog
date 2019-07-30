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

const INFO = 0
const WARNING = 1
const ERROR = 2
const DEBUG = 3
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
var numberOfNodesSelected = 0
var newNode = {}
var newNodeLocation = null
var movedNode = null

export default {
	data() {
		return {
			databaseLevel: DATABASELEVEL,
			productLevel: PRODUCTLEVEL,
			epicLevel: EPICLEVEL,
			featureLevel: FEATURELEVEL,
			pbiLevel: PBILEVEL,
			eventBgColor: '#408FAE',
			firstNodeSelected: null,
			newDescription: '',
			newAcceptance: '',
			nodeIsSelected: false,
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

	mounted() {
		window.history.scrollRestoration = "manual"
		// expose instance to the global namespace
		window.slVueTree = this.$refs.slVueTree
		// the product is selected in load.js
		this.firstNodeSelected = window.slVueTree.getSelected()[0]
		this.nodeIsSelected = true
		//eslint-disable-next-line no-console
		if (this.$store.state.debug) console.log('product.js:mounted: this.firstNodeSelected is set to product = ' + this.firstNodeSelected.title)
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
					this.firstNodeSelected.data.subtype = val
					this.firstNodeSelected.data.lastChange = Date.now()
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
		showLastEvent(txt, level) {
			switch (level) {
				case INFO:
					this.eventBgColor = '#408FAE'
					break
				case WARNING:
					this.eventBgColor = 'orange'
					break
				case ERROR:
					this.eventBgColor = 'red'
					break
				case DEBUG:
					this.eventBgColor = 'yellow'
			}
			this.$store.state.load.lastEvent = txt
		},
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
					this.firstNodeSelected.data.lastChange = Date.now()
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
					this.firstNodeSelected.data.lastChange = Date.now()
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
					this.firstNodeSelected.data.lastChange = Date.now()
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
				this.firstNodeSelected.data.lastChange = Date.now()
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
				this.firstNodeSelected.data.lastChange = Date.now()
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
				this.firstNodeSelected.data.state = idx
				this.firstNodeSelected.data.lastChange = Date.now()
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
				// update the tree; must use an explicit updateNode
				let node = this.firstNodeSelected
				let newData = Object.assign(node.data)
				newData.lastChange = Date.now()
				window.slVueTree.updateNode(node.path, {
					title: newTitle,
					data: newData
				})
				// update current document in database
				const payload = {
					'newTitle': newTitle
				}
				this.$store.dispatch('setDocTitle', payload)
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
			let parentId = nodes[0].data.parentId
			if (nodes.length > 0) {
				for (let i = 1; i < nodes.length; i++) {
					if (nodes[i].data.parentId !== parentId) {
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
			this.nodeIsSelected = true
			numberOfNodesSelected = selNodes.length
			this.firstNodeSelected = selNodes[0]
			// if the user clicked on a node of another product
			if (this.$store.state.load.currentProductId !== this.firstNodeSelected.data.productId) {
				// clear any outstanding filters
				if (this.$store.state.filterOn || this.$store.state.searchOn) {
					window.slVueTree.resetFilters('nodeSelectedEvent')
				}
				// collapse the previously selected product
				window.slVueTree.collapseTree()
				// update current productId
				this.$store.state.load.currentProductId = this.firstNodeSelected.data.productId
				// expand the newly selected product up to the feature level
				window.slVueTree.expandTree(FEATURELEVEL)
				// update the product title
				this.$store.dispatch('readProductTitle', this.firstNodeSelected.data.productId)
			}
			// load the document if not already in memory
			if (this.firstNodeSelected.data._id !== this.$store.state.currentDoc._id) {
				this.$store.dispatch('loadDoc', this.firstNodeSelected.data._id)
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
		getDescendantsInfo(path) {
			let descendants = []
			let initLevel = 0
			let count = 0
			let maxDepth = 0
			window.slVueTree.traverseLight((nodePath, nodeModel, nodeModels) => {
				if (window.slVueTree.comparePaths(nodePath, path) === 0) {
					initLevel = path.length
					maxDepth = path.length
				} else {
					if (nodePath.length <= initLevel) return false

					if (window.slVueTree.comparePaths(nodePath, path) === 1) {
						descendants.push(window.slVueTree.getNode(nodePath, nodeModel, nodeModels))
						count++
						if (nodePath.length > maxDepth) maxDepth = nodePath.length
					}
				}
			}, this.$store.state.load.currentProductId, 'product.js:getDescendantsInfo')
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
				let failedCheck1 = !this.canWriteLevels[position.node.level]
				let failedCheck2 = levelChange > 1
				let failedCheck3 = (targetLevel + this.getDescendantsInfo(node.path).depth) > PBILEVEL
				if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
				return failedCheck1 || failedCheck2 || failedCheck3
			}
			const sourceLevel = draggingNodes[0].level
			let targetLevel = position.node.level
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
		 * Get the next sibling above the node with the same level as the node itself
		 * precondition: the node is NOT firstChild
		 */
		getPrevSibling(node) {
			let path = node.path
			let siblingPath = []
			for (let i = 0; i < path.length - 1; i++) {
				siblingPath.push(path[i])
			}
			siblingPath.push(path[path.length - 1] - 1)
			return window.slVueTree.getNode(siblingPath)
		},
		/*
		 * Get the next sibling below the node with the same level as the node itself
		 * precondition: the node is NOT lastChild
		 */
		getNextSibling(path) {
			let siblingPath = []
			for (let i = 0; i < path.length - 1; i++) {
				siblingPath.push(path[i])
			}
			siblingPath.push(path[path.length - 1] + 1)
			return window.slVueTree.getNode(siblingPath)
		},
		/*
		 * When this user created a new product this user gets access rights automatically
		 */
		addNewProductToUser(productId) {
			let prodsArray = this.$store.state.load.userAssignedProductIds
			if (!prodsArray.includes(productId)) {
				prodsArray.push(productId)
				// also update the user profile
				this.$store.dispatch('addProductId', productId)
			}
		},
		assignNewPrios(nodes, predecessorNode, successorNode) {
			let predecessorPrio
			let successorPrio
			if (predecessorNode !== null) {
				predecessorPrio = predecessorNode.data.priority
			} else {
				predecessorPrio = Number.MAX_SAFE_INTEGER
			}
			if (successorNode !== null) {
				successorPrio = successorNode.data.priority
			} else {
				successorPrio = Number.MIN_SAFE_INTEGER
			}
			const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))
			for (let i = 0; i < nodes.length; i++) {
				// update the tree
				nodes[i].data.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
				nodes[i].data.lastChange = Date.now()
			}
		},
		/*
		 * Recalculate the priorities of the created(inserted, one node at the time) or moved nodes(can be one or more).
		 * Determine the parentId and set the productId.
		 * Set isLeaf depending on the level of the node and set isExanded to false as these nodes have no children. Update the level of the item in the tree node.
		 * Update the values in the tree.
		 * Precondition: the nodes are inserted in the tree and all created or moved nodes have the same parent (same level).
		 */
		updateTree2(nodes) {
			for (let i = 0; i < nodes.length; i++) {
				console.log('updateTree2: nodes [' + i + '] title = ' + nodes[i].title + ' path = ' + nodes[i].path + ' parentId = ' + nodes[i].data.parentId)
			}
			const firstNode = nodes[0]
			const level = firstNode.level
			const parentPath = firstNode.path.slice(0, firstNode.path.length - 1)
			let localParentId
			window.slVueTree.traverseLight((nodePath, nodeModel) => {
				if (window.slVueTree.comparePaths(nodePath, parentPath) === 0) {
					localParentId = nodeModel.data._id
					return false
				}
			}, undefined, 'product.js:updateTree2-findParentId')
			console.log('updateTree2: parentPath = ' + parentPath + ' localParentId = '+ localParentId)
			let predecessorNode
			let successorNode
			if (firstNode.isFirstChild) {
				// the previous node must be the parent
				predecessorNode = null
			} else {
				// firstNode has a sibling between the parent and itself
				predecessorNode = this.getPrevSibling(firstNode)
			}
			const lastNode = nodes[nodes.length - 1]
			if (!lastNode.isLastChild) {
				successorNode = this.getNextSibling(lastNode.path)
			} else {
				successorNode = null
			}
			// PRIORITY FOR PRODUCTS DOES NOT WORK. THEY ARE SORTED IN ORDER OF CREATION (OLDEST ON TOP)
			if (localParentId !== 'root') this.assignNewPrios(nodes, predecessorNode, successorNode)
			// update the tree
			let initLevel = firstNode.path.length
			window.slVueTree.traverseLight2((nodePath, nodeModel) => {
				// exit at the first encountered sibling of the first node
				if (nodePath.length === initLevel && nodePath.slice(-1) > firstNode.path.slice(-1)) return false

				switch (window.slVueTree.comparePaths(nodePath, firstNode.path)) {
					case -1:
						// skip top levels but expand and deselect the parent
						if (nodeModel.data._id === localParentId) {
							nodeModel.isExpanded = true
							nodeModel.isSelected = false
						}
						return
					case 0:
						nodeModel.data.productId = this.$store.state.load.currentProductId
						console.log('updateTree2: parentId ' + localParentId + ' is set to ' + nodeModel.title)
						nodeModel.data.parentId = localParentId
						nodeModel.data.sessionId = this.$store.state.sessionId
						nodeModel.data.distributeEvent = true
						nodeModel.isExpanded = false
						nodeModel.isSelected = true
						nodeModel.isLeaf = (level < PBILEVEL) ? false : true
						return
					case 1:
						// process descendant
						nodeModel.data.productId = this.$store.state.load.currentProductId
						// parent has not changed
						nodeModel.data.sessionId = this.$store.state.sessionId
						nodeModel.data.distributeEvent = true
						nodeModel.isLeaf = (nodePath.length < PBILEVEL) ? false : true
				}
			}, firstNode.data._id, 'product.js:updateTree2')
		},
		/*
		 * Update the tree when one or more nodes are dropped on another location
		 * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
		 */
		nodeDropped(draggingNodes, position) {
			// get the nodes after being dropped with the full IDlTreeNode properties (draggingNodes only have IslNodeModel properties)
			const selectedNodes = window.slVueTree.getSelected()
			let clickedLevel = selectedNodes[0].level
			let dropLevel = position.node.level
			// drop inside?
			if (position.placement === 'inside') {
				dropLevel++
			}
			let levelChange = clickedLevel - dropLevel

			// no action required when moving a product in the tree
			if (!(clickedLevel === this.productLevel && dropLevel === this.productLevel)) {
				// when nodes are dropped to another position the type and the priorities must be updated
				this.updateTree2(selectedNodes, position.node)
				// update the nodes in the database
				let payloadArray = []
				for (let i = 0; i < selectedNodes.length; i++) {
					let descendants = this.getDescendantsInfo(selectedNodes[i].path).descendants
					const payloadItem = {
						'_id': selectedNodes[i].data._id,
						'productId': selectedNodes[i].data.productId,
						'newParentId': selectedNodes[i].data.parentId,
						'newPriority': selectedNodes[i].data.priority,
						'newParentTitle': null,
						'oldParentTitle': selectedNodes[i].title,
						'oldLevel': clickedLevel,
						'newLevel': selectedNodes[i].level,
						'newInd': selectedNodes[i].ind,
						'descendants': descendants
					}
					payloadArray.push(payloadItem)
				}
				this.$store.dispatch('updateDropped', {
					next: 0,
					payloadArray: payloadArray
				})
			}
			// create the event message
			const title = this.itemTitleTrunc(60, selectedNodes[0].title)
			let evt = ""
			if (selectedNodes.length === 1) {
				evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.node.title}'`
			} else {
				evt = `${this.getLevelText(clickedLevel)} '${title}' and ${selectedNodes.length - 1} other item(s) are dropped ${position.placement} '${position.node.title}'`
			}
			if (levelChange !== 0) evt += ' as ' + this.getLevelText(dropLevel)
			this.showLastEvent(evt, INFO)
		},
		showContextMenu(node, event) {
			event.preventDefault()
			this.contextSelected = undefined
			this.insertOptionSelected = 1
			// user must have write access on this level && node must be selected first && user cannot remove the database && only one node can be selected
			if (this.canWriteLevels[node.level] && node.data._id === this.firstNodeSelected.data._id && node.level > 1 && numberOfNodesSelected === 1) {
				this.contextNodeSelected = node
				this.contextNodeTitle = node.title
				this.contextNodeLevel = node.level
				this.contextNodeType = this.getLevelText(node.level)
				this.contextChildType = this.getLevelText(node.level + 1)
				this.removeDescendantsCount = this.getDescendantsInfo(node.path).count
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
					this.moveItem()
					break
				case 3:
					this.doRemove()
					break
			}
		},
		getDescendantsInfo2(path) {
			let descendants = []
			let initLevel = 0
			let count = 0
			let maxDepth = 0
			window.slVueTree.traverseLight((nodePath, nodeModel, nodeModels) => {
				console.log('getDescendantsInfo2: nodePath = ' + nodePath + ' path = ' + path)
				if (window.slVueTree.comparePaths(nodePath, path) === 0) {
					initLevel = path.length
					maxDepth = path.length
				} else {
					if (nodePath.length <= initLevel) return false

					if (window.slVueTree.comparePaths(nodePath, path) === 1) {
						descendants.push(window.slVueTree.getNode(nodePath, nodeModel, nodeModels))
						count++
						if (nodePath.length > maxDepth) maxDepth = nodePath.length
					}
				}
			}, this.$store.state.load.currentProductId, 'product.js:getDescendantsInfo2')
			return {
				descendants: descendants,
				count: count,
				depth: maxDepth - initLevel
			}
		},
		moveItem() {
			if (this.$store.state.moveOngoing) {
				let cursorPosition = window.slVueTree.lastSelectCursorPosition
				// only allow move to new parent 1 level higher (lower value) than the source node
				if (cursorPosition.node.path.length !== movedNode.path.length - 1) {
					console.log('moveItem: cursorPosition.node.path.length = ' + cursorPosition.node.path.length)
					console.log('moveItem: movedNode.path.length = ' + movedNode.path.length)
					console.log('moveItem: Error = only allow move to new parent 1 level higher than the source node')
					return
				}
				console.log('moveItem:cursorPosition.node.path = ' + cursorPosition.node.path)
				console.log('moveItem:cursorPosition.placement = ' + cursorPosition.placement)
				console.log('moveItem:cursorPosition.node.data.productId = ' + cursorPosition.node.data.productId)

				// insert the node in the new place
				window.slVueTree.moveNodes(cursorPosition, [movedNode])
				const selectedNode = window.slVueTree.getSelected()[0]
				// the path to new node is immediately below the selected node
				const newPath = selectedNode.path.concat([0])
				console.log('moveItem: newPath = ' + newPath)
				const newNode = window.slVueTree.getNode(newPath)
				console.log('moveItem: newNode.path = ' + newNode.path + ' newNode.title = ' + newNode.title)

				// productId, parentId and priority are set in this routine
				this.updateTree2([newNode], selectedNode)
				const descendants = this.getDescendantsInfo(newPath).descendants
				for (let i = 0; i < descendants.length; i++) {
					console.log('moveItem: descendant[' + i + '] = ' + descendants[i].path + ' productId = ' + descendants[i].data.productId + ' ' + descendants[i].title)
				}
				const payloadItem = {
					'_id': newNode.data._id,
					'oldProductId': this.moveSourceProductId, // ToDo: use this field in the history record
					'productId': this.$store.state.load.currentProductId,
					'newParentId': newNode.data.parentId,
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
		 * Both the selected node and all its descendants will be tagged with a delmark
		 */
		doRemove() {
			const selectedNode = this.contextNodeSelected
			const descendantsInfo = this.getDescendantsInfo(selectedNode.path)
			this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
			const path = selectedNode.path
			const descendants = descendantsInfo.descendants
			// now we can remove the nodes
			window.slVueTree.remove([path])
			// when removing a product
			if (selectedNode.level === this.productLevel) {
				var newProducts = this.$store.state.load.userAssignedProductIds
				var idx = newProducts.indexOf(selectedNode.data._id)
				if (idx > -1) {
					newProducts.splice(idx, 1)
				}
				this.$store.state.load.userAssignedProductIds = newProducts
				this.$store.dispatch('removeProductId', newProducts)
			}
			// set remove mark in the database on the clicked item
			const payload = {
				'node': selectedNode,
				'descendantsCount': descendants.length,
				'doRegHist': true
			}
			this.$store.dispatch('removeDoc', payload)
			// and remove the descendants without registering history in parents which are removed anyway
			for (let i = 0; i < descendants.length; i++) {
				const payload2 = {
					'node': descendants[i],
					'doRegHist': false
				}
				this.$store.dispatch('removeDoc', payload2)
			}
			// after removal no node is selected
			this.nodeIsSelected = false
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
		 */
		doInsert() {
			let newNodeLocation
			// prepare the new node of type ISlTreeNodeModel for insertion
			newNode = {
				title: 'is calculated in this method',
				isLeaf: 'is calculated in this method',
				children: [],
				isExpanded: false,
				savedIsExpanded: false,
				isDraggable: true,
				isSelectable: true,
				isSelected: true,
				doShow: true,
				savedDoShow: true,
				data: {
					_id: null,
					priority: null,
					productId: this.$store.state.load.currentProductId,
					parentId: null,
					state: 0,
					subtype: 0,
					lastChange: Date.now(),
					sessionId: this.$store.state.sessionId,
					distributeEvent: true
				}
			}
			let insertLevel = this.contextNodeSelected.level
			if (this.insertOptionSelected === 1) {
				// New node is a sibling placed below (after) the selected node
				newNodeLocation = {
					node: this.contextNodeSelected,
					placement: 'after'
				}
				newNode.title = 'New ' + this.getLevelText(insertLevel)
				newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
			} else {
				// new node is a child placed a level lower (inside) than the selected node
				insertLevel += 1

				newNodeLocation = {
					node: this.contextNodeSelected,
					placement: 'inside'
				}
				newNode.title = 'New ' + this.getLevelText(insertLevel)
				newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
			}
			if (this.canWriteLevels[insertLevel]) {
				// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
				const newId = Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
				newNode.data._id = newId
				newNode.data.parentId = this.contextNodeSelected.data.parentId
				this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
				if (newNodeLocation.placement === 'inside') {
					// unselect the node that was clicked before the insert and expand it to show the inserted node
					window.slVueTree.updateNode(this.contextNodeSelected.path, {
						isSelected: false,
						isExpanded: true
					})
				} else {
					// unselect the node that was clicked before the insert
					window.slVueTree.updateNode(this.contextNodeSelected.path, {
						isSelected: false
					})
				}
				newNode.isSelected = true
				// insert the node that has the property isSelected = true
				window.slVueTree.insert(newNodeLocation, newNode)
				// now the node is inserted and selected get the full ISlTreeNode data
				const insertedNode = window.slVueTree.getSelected()[0]
				this.firstNodeSelected = insertedNode
				// parentId and priority are set in this routine
				this.updateTree2([insertedNode])
				// create a new document and store it
				const initData = {
					"_id": insertedNode.data._id,
					"type": "backlogItem",
					"productId": insertedNode.data.productId,
					"parentId": insertedNode.data.parentId,
					"team": "not assigned yet",
					"level": insertLevel,
					"subtype": 0,
					"state": 0,
					"tssize": 3,
					"spsize": 0,
					"spikepersonhours": 0,
					"reqarea": null,
					"title": insertedNode.title,
					"followers": [],
					"description": "",
					"acceptanceCriteria": window.btoa("Please don't forget"),
					"priority": insertedNode.data.priority,
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
