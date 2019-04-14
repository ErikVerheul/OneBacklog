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

	// bug? Do not put this import in curly braces
	import SlVueTree from 'sl-vue-tree'

	const INFO= 0
	const WARNING = 1
	const ERROR = 2
	const DEBUG = 3
	const PRODUCTLEVEL = 2
	const EPICLEVEL = 3
	const FEATURELEVEL = 4
	const PBILEVEL = 5
	var numberOfNodesSelected = 0
	var newNode = {}
	var newNodeLocation = null
	var insertLevel = null

	export default {
		data() {
			return {
				productLevel: PRODUCTLEVEL,
				epicLevel: EPICLEVEL,
				featureLevel: FEATURELEVEL,
				pbiLevel: PBILEVEL,
				eventBgColor: '#408FAE',
				firstNodeSelected: null,
				nodeIsSelected: false,
				removeTitle: '',
				// default to sibling node (no creation of descendant)
				insertOptionSelected: 1,
				selectedNodesTitle: '',

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
			this.setFirstNodeSelected()
		},

		computed: {
			...mapGetters([
				//from store.js
				'getUser',
				'getMyRoles',
				'isAuthenticated',
				'isFollower',
				'isServerAdmin',
				'canCreateComments',
				'canWriteLevels',
				'getCurrentDb',
				'getCurrentItemAcceptanceCriteria',
				'getCurrentItemAttachments',
				'getCurrentItemComments',
				'getCurrentItemDescription',
				'getCurrentItemFollowers',
				'getCurrentItemHistory',
				'getCurrentItemId',
				'getCurrentItemPriority',
				'getCurrentItemProductId',
				'getCurrentItemState',
				'getCurrentItemTitle',
				'getCurrentItemType',
				'getCurrentItemReqArea',
				'getCurrentItemSpSize',
				'getCurrentItemSubType',
				'getCurrentItemTeam',
				'getCurrentItemTsSize',
				'getCurrentPersonHours',
				// from load.js
				'getCurrentProductId',
				'getCurrentProductTitle',
				'getEmail',
				'getUserAssignedProductIds',
				'getTeams'
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
					return this.getCurrentItemDescription
				},
				set(newDescription) {
					this.$store.state.currentDoc.description = newDescription
				}
			},
			acceptanceCriteria: {
				get() {
					return this.getCurrentItemAcceptanceCriteria
				},
				set(newAcceptanceCriteria) {
					this.$store.state.currentDoc.acceptanceCriteria = newAcceptanceCriteria
				}
			},
			getFilteredComments() {
				var filteredComments = []
				for (let i = 0; i < this.getCurrentItemComments.length; i++) {
					let allText = window.atob(this.getCurrentItemComments[i].comment)
					allText += this.getCurrentItemComments[i].by
					allText += this.getCurrentItemComments[i].email
					allText += this.mkTimestamp(this.getCurrentItemComments[i].timestamp)
					if (allText.includes(this.filterForComment)) {
						filteredComments.push(this.getCurrentItemComments[i])
					}
				}
				return filteredComments
			},
			getFilteredHistory() {
				function removeImages(text) {
					let pos1 = text.indexOf('<img src="')
					if (pos1 == -1) return text
					else {
						let pos2 = text.indexOf('">', pos1 + 1)
						let image = text.slice(pos1, pos2 + 1)
						text = text.replace(image, '')
						return removeImages(text)
					}
				}
				var filteredComments = []
				for (let i = 0; i < this.getCurrentItemHistory.length; i++) {
					let histItem = this.getCurrentItemHistory[i]
					let allText = ""
					let keys = Object.keys(histItem)
					for (let j = 0; j < keys.length; j++) {
						if (keys[j] == "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
						if (keys[j] == "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
						if (keys[j] == "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
						if (keys[j] == "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
						if (keys[j] == "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
						if (keys[j] == "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
						if (keys[j] == "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
						if (keys[j] == "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
						if (keys[j] == "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
						if (keys[j] == "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
						if (keys[j] == "nodeDroppedEvent") allText += this.mkNodeDroppedEvent(histItem[keys[j]])
						if (keys[j] == "descendantMoved") allText += this.mkDescendantMoved(histItem[keys[j]])
						if (keys[j] == "nodeRemoveEvent") allText += this.mkNodeRemoveEvent(histItem[keys[j]])
						if (keys[j] == "by") allText += this.mkBy(histItem[keys[j]])
						if (keys[j] == "email") allText += this.mkEmail(histItem[keys[j]])
						if (keys[j] == "timestamp") allText += this.mkTimestamp(histItem[keys[j]])
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
				if (val != this.getCurrentItemSubType) {
					if (this.canWriteLevels[this.getCurrentItemType]) {
						this.firstNodeSelected.data.subtype = val
						const payload = {
							'userName': this.getUser,
							'email': this.getEmail,
							'newSubType': val
						}
						this.$store.dispatch('setSubType', payload)
					} else {
						this.showLastEvent("Sorry, your assigned role(s) disallow you change the pbi type",WARNING)
					}
				}

			},
			'startEditor': function (val) {
				if (val == true) {
					this.startEditor = false
					if (this.canCreateComments) {
						if (this.selectedForView == 'comments') this.$refs.commentsEditorRef.show()
						if (this.selectedForView == 'history') this.$refs.historyEditorRef.show()
					} else {
						this.showLastEvent("Sorry, your assigned role(s) disallow you to create comments",WARNING)
					}
				}
			},
			'startFiltering': function (val) {
				if (val == true) {
					this.startFiltering = false
					if (this.selectedForView == 'comments') this.$refs.commentsFilterRef.show()
					if (this.selectedForView == 'history') this.$refs.historyFilterRef.show()
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
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail
				}
				this.$store.dispatch('changeSubsription', payload)
			},
			filterComments() {
				this.filterForComment = this.filterForCommentPrep
			},
			filterHistory() {
				this.filterForHistory = this.filterForHistoryPrep
			},
			insertComment() {
				const payload = {
					'comment': this.newComment,
					'userName': this.getUser,
					'email': this.getEmail
				}
				this.$store.dispatch('addComment', payload)
			},
			insertHist() {
				const payload = {
					'comment': this.newHistory,
					'userName': this.getUser,
					'email': this.getEmail
				}
				this.$store.dispatch('addHistoryComment', payload)
			},
			setFirstNodeSelected() {
				this.firstNodeSelected = this.$refs.slVueTree.getSelected()[0]
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
				if (value[0] == value[1]) {
					txt = "<h5>The item changed priority to position " + (value[2] + 1) + " under parent '" + value[3] + "'</h5>"
					txt += (value[4] > 0) ? "<p>" + value[4] + " descendants were alse moved.</p>" : ""
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
				if (key == "comment") return this.mkComment(value)
				if (key == "by") return this.mkBy(value)
				if (key == "email") return this.mkEmail(value)
				if (key == "timestamp") return this.mkTimestamp(value)
			},
			prepHistoryText(key, value) {
				if (key == "subscribeEvent") return this.mkSubscribeEvent(value)
				if (key == "createEvent") return this.mkCreateEvent(value)
				if (key == "setSizeEvent") return this.mkSetSizeEvent(value)
				if (key == "setPointsEvent") return this.mkSetPointsEvent(value)
				if (key == "setHrsEvent") return this.mkSetHrsEvent(value)
				if (key == "setStateEvent") return this.mkSetStateEvent(value)
				if (key == "setTitleEvent") return this.mkSetTitleEvent(value)
				if (key == "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
				if (key == "descriptionEvent") return this.mkDescriptionEvent(value)
				if (key == "acceptanceEvent") return this.mkAcceptanceEvent(value)
				if (key == "nodeDroppedEvent") return this.mkNodeDroppedEvent(value)
				if (key == "descendantMoved") return this.mkDescendantMoved(value)
				if (key == "nodeRemoveEvent") return this.mkNodeRemoveEvent(value)
				if (key == "by") return this.mkBy(value)
				if (key == "email") return this.mkEmail(value)
				if (key == "timestamp") return this.mkTimestamp(value)
			},
			/* Database update methods */
			updateDescription() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newDescription': this.getCurrentItemDescription,
						'newId': this.firstNodeSelected.data._id
					}
					this.$store.dispatch('saveDescriptionAndLoadDoc', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the description of this item",WARNING)
				}
			},
			updateAcceptance() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newAcceptance': this.getCurrentItemAcceptanceCriteria,
						'newId': this.firstNodeSelected.data._id
					}
					this.$store.dispatch('saveAcceptanceAndLoadDoc', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the acceptance criteria of this item",WARNING)
				}
			},
			updateTsSize() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					var size = document.getElementById("tShirtSizeId").value.toUpperCase()
					const sizeArray = this.$store.state.config.tsSize
					if (sizeArray.includes(size)) {
						// update current document
						const payload = {
							'userName': this.getUser,
							'email': this.getEmail,
							'newSizeIdx': sizeArray.indexOf(size)
						}
						this.$store.dispatch('setSize', payload)
					} else {
						var sizes = ''
						for (let i = 0; i < sizeArray.length - 1; i++) {
							sizes += sizeArray[i] + ', '
						}
						alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
					}
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the t-shirt size of this item",WARNING)
				}
			},
			updateStoryPoints() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					var el = document.getElementById("storyPointsId")
					if (isNaN(el.value) || el.value < 0) {
						el.value = '?'
						return
					}
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newPoints': el.value
					}
					this.$store.dispatch('setStoryPoints', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the story points size of this item",WARNING)
				}
			},
			updatePersonHours() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					var el = document.getElementById("personHoursId")
					if (isNaN(el.value) || el.value < 0) {
						el.value = '?'
						return
					}
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newHrs': el.value
					}
					this.$store.dispatch('setPersonHours', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the person hours of this item",WARNING)
				}
			},
			onStateChange(idx) {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newState': idx
					}
					this.$store.dispatch('setState', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the state of this item",WARNING)
				}
			},
			updateTitle() {
				if (this.canWriteLevels[this.getCurrentItemType]) {
					const oldTitle = this.$store.state.currentDoc.title
					const newTitle = document.getElementById("titleField").value
					if (oldTitle == newTitle) return

					// update the tree
					const paths = this.$refs.slVueTree.getSelected().map(node => node.path);
					this.$refs.slVueTree.updateNode(paths[0], {
						title: newTitle
					})
					// update current document in database
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newTitle': newTitle
					}
					this.$store.dispatch('setDocTitle', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to change the title of this item",WARNING)
				}
			},
			/* mappings from config */
			getLevelText(level) {
				if (level < 0 || level > this.pbiLevel) {
					return 'Level not supported'
				}
				return this.$store.state.config.itemType[level]
			},
			getItemStateText(idx) {
				if (idx < 0 || idx > this.pbiLevel) {
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
			/* event handling */
			nodeSelectedEvent(selNodes) {
				// set the focus on titleField so that the vue2editors loose focus, regain focus when selected and blur when exited
				document.getElementById("titleField").focus()
				this.nodeIsSelected = true
				numberOfNodesSelected = selNodes.length
				this.firstNodeSelected = selNodes[0]
				this.$store.dispatch('loadDoc', this.firstNodeSelected.data._id)
				const warnMsg = !this.canWriteLevels[selNodes[0].level] ? " You only have READ permission" : ""
				const title = this.itemTitleTrunc(60, selNodes[0].title)
				let evt = ""
				if (selNodes.length == 1) {
					this.selectedNodesTitle = title
					evt = `${this.getLevelText(selNodes[0].level)} '${this.selectedNodesTitle}' is selected.` + warnMsg
				} else {
					this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
					evt = `${this.getLevelText(selNodes[0].level)} ${this.selectedNodesTitle} are selected.` + warnMsg
				}
				this.showLastEvent(evt, warnMsg == "" ? INFO: WARNING)
			},
			nodeToggled(node) {
				this.showLastEvent(`Node '${node.title}' is ${ node.isExpanded ? 'collapsed' : 'expanded'}`, INFO)
			},
			haveSameLevel(nodes) {
				var level = nodes[0].level
				for (let i = 0; i < nodes.length; i++) {
					if (nodes[i].level != level) {
						return false
					}
					return true
				}
			},
			getDescendantsInfo(path) {
				let descendants = []
				let initLevel = 0
				let count = 0
				let maxDepth = 0
				this.$refs.slVueTree.traverse((node) => {
					if (this.$refs.slVueTree.comparePaths(node.path, path) == 0) {
						initLevel = node.level
						maxDepth = node.level
					} else {
						if (node.level <= initLevel) return false

						if (this.$refs.slVueTree.comparePaths(node.path, path) == 1) {
							descendants.push(node)
							count++
							if (node.level > maxDepth) maxDepth = node.level
						}
					}
				})
				return {
					descendants: descendants,
					count: count,
					depth: maxDepth - initLevel
				}
			},
			/*
			/ Use this event to check if the drag is allowed. If not, cancel silently.
			*/
			beforeNodeDropped(draggingNodes, position, cancel) {
				/*
				 * Disallow drop on node were the user has no write authority
				 * Disallow drop when moving over more than 1 level.
				 * Dropping items with descendants is not possible when any descendant would land lower than the lowest level (pbilevel).
				 */
				var checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
					const levelChange = Math.abs(targetLevel - sourceLevel)
					return !this.canWriteLevels[position.node.level] || levelChange > 1 || (targetLevel + this.getDescendantsInfo(node.path).depth) > this.pbiLevel
				}
				const sourceLevel = draggingNodes[0].level
				let targetLevel = position.node.level
				// are we dropping 'inside' a node creating children to that node?
				if (position.placement == 'inside') {
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
				var siblingPath = []
				for (let i = 0; i < path.length - 1; i++) {
					siblingPath.push(path[i])
				}
				siblingPath.push(path[path.length - 1] - 1)
				return this.$refs.slVueTree.getNode(siblingPath)
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
			calcProductId(insertedNode, predecessorNode) {
				var productId
				// if the node is on the product level ...
				if (insertedNode.level == this.productLevel) {
					// a product has its own id as productId
					productId = insertedNode.data._id
					this.addNewProductToUser(productId)
				} else {
					productId = predecessorNode.data.productId
				}
				return productId
			},
			assignNewPrios(nodes, predecessorNode, successorNode) {
				var predecessorPrio
				var successorPrio
				if (predecessorNode != null) {
					predecessorPrio = predecessorNode.data.priority
				} else {
					predecessorPrio = Number.MAX_SAFE_INTEGER
				}
				if (successorNode != null) {
					successorPrio = successorNode.data.priority
				} else {
					successorPrio = Number.MIN_SAFE_INTEGER
				}
				const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))
				for (let i = 0; i < nodes.length; i++) {
					// update the tree
					let newData = Object.assign(nodes[i].data)
					newData.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
					this.$refs.slVueTree.updateNode(nodes[i].path, {
						data: newData
					})
				}
			},
			/*
			 * Recalculate the priorities of the created(inserted, one node at the time) or moved nodes(can be one or more).
			 * Get the productId of the node(s) in case they are dopped on another product. Determine the parentId.
			 * Set isLeaf depending on the level of the node and set isExanded to false as these nodes have no children
			 * Update the values in the tree
			 * precondition: the nodes are inserted in the tree  and all created or moved nodes have the same parent (same level) and have no children
			 */
			updateTree(nodes) {
				const firstNode = nodes[0]
				const level = firstNode.level
				var localProductId
				var localParentId
				var predecessorNode
				var successorNode
				if (firstNode.isFirstChild) {
					// the previous node must be the parent
					predecessorNode = null
					let parent = this.$refs.slVueTree.getPrevNode(firstNode.path)
					localProductId = this.calcProductId(firstNode, parent)
					localParentId = parent.data._id
				} else {
					// firstNode has a sibling between the parent and itself
					predecessorNode = this.getPrevSibling(firstNode)
					localProductId = this.calcProductId(firstNode, predecessorNode)
					localParentId = predecessorNode.data.parentId
				}
				const lastNode = nodes[nodes.length - 1]
				if (!lastNode.isLastChild) {
					successorNode = this.$refs.slVueTree.getNextNode(lastNode.path)
				} else {
					successorNode = null
				}
				// PRIORITY FOR PRODUCTS DOES NOT WORK. THEY ARE SORTED IN ORDER OF CREATION (OLDEST ON TOP)
				if (localParentId != 'root') this.assignNewPrios(nodes, predecessorNode, successorNode)
				for (let i = 0; i < nodes.length; i++) {
					// update the tree
					let newData = Object.assign(nodes[i].data)
					newData.productId = localProductId
					newData.parentId = localParentId
					this.$refs.slVueTree.updateNode(nodes[i].path, {
						isLeaf: (level < this.pbiLevel) ? false : true,
						isExpanded: true,
						data: newData
					})
				}
				//				for (var prop in firstNode) {
				//					//eslint-disable-next-line no-console
				//					console.log('updateTree@ready -> ' + prop, firstNode[prop]);
				//				}
				//				for (prop in firstNode.data) {
				//					//eslint-disable-next-line no-console
				//					console.log('updateTree.data@ready -> ' + prop, firstNode.data[prop]);
				//				}
			},
			/*
			 * Update the tree when one or more nodes are dropped on another location
			 * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
			 * precondition: all draggingNodes are on the same level and have no children (exluded by beforeNodeDropped())
			 * ToDo: expand the parent if a node is dropped inside that parent
			 */
			nodeDropped(draggingNodes, position) {
				// cannot use draggingnodes, use selectedNodes as the dropped nodes are all selected
				const selectedNodes = this.$refs.slVueTree.getSelected()
				let clickedLevel = draggingNodes[0].level
				let dropLevel = position.node.level
				// drop inside?
				if (position.placement == 'inside') {
					dropLevel++
				}
				let levelChange = clickedLevel - dropLevel
				// no action required when replacing a product in the tree
				if (!(clickedLevel == this.productLevel && dropLevel == this.productLevel)) {
					// when nodes are dropped to another position the type, the priorities and possibly the owning productId must be updated
					this.updateTree(selectedNodes, true)
					// update the nodes in the database
					for (let i = 0; i < selectedNodes.length; i++) {
						const payload = {
							'_id': selectedNodes[i].data._id,
							'productId': selectedNodes[i].data.productId,
							'newParentId': selectedNodes[i].data.parentId,
							'newPriority': selectedNodes[i].data.priority,
							'newParentTitle': null,
							'oldParentTitle': selectedNodes[i].title,
							'oldLevel': clickedLevel,
							'newLevel': selectedNodes[i].level,
							'newInd': selectedNodes[i].ind,
							'userName': this.getUser,
							'email': this.getEmail,
							'descendants': this.getDescendantsInfo(selectedNodes[i].path).descendants
						}
						this.$store.dispatch('updateDropped', payload)
					}
				}
				// create the event message
				const title = this.itemTitleTrunc(60, selectedNodes[0].title)
				let evt = ""
				if (selectedNodes.length == 1) {
					evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.node.title}'`
				} else {
					evt = `${this.getLevelText(clickedLevel)} '${title}' and ${selectedNodes.length - 1} other item(s) are dropped ${position.placement} '${position.node.title}'`
				}
				if (levelChange != 0) evt += ' as ' + this.getLevelText(dropLevel)
				this.showLastEvent(evt, INFO)
			},
			showRemoveModal(node, event) {
				event.preventDefault();
				// user must have write access on this level && node must be selected first && user cannot remove the database && only one node can be selected
				if (this.canWriteLevels[node.level] && this.nodeIsSelected && node.level > 1 && numberOfNodesSelected === 1) {
					this.removeTitle = `This ${this.getLevelText(node.level)} and ${this.getDescendantsInfo(node.path).count} descendants will be removed`
					this.$refs.removeModalRef.show();
				}
			},
			/*
			 * Both the clicked node and all its descendants will be tagged with a delmark
			 */
			doRemove() {
				const selectedNodes = this.$refs.slVueTree.getSelected()
				this.showLastEvent(`The ${this.getLevelText(selectedNodes[0].level)} and ${this.getDescendantsInfo(selectedNodes[0].path).count} descendants are removed`, INFO)
				const paths = selectedNodes.map(node => node.path)
				const descendants = this.getDescendantsInfo(paths[0]).descendants
				// now we can remove the nodes
				this.$refs.slVueTree.remove(paths)
				// when removing a product
				if (selectedNodes[0].level == this.productLevel) {
					var newProducts = this.getUserAssignedProductIds
					var idx = newProducts.indexOf(selectedNodes[0].data._id)
					if (idx > -1) {
						newProducts.splice(idx, 1)
					}
					this.$store.state.load.userAssignedProductIds = newProducts
					this.$store.dispatch('removeProductId', newProducts)
				}
				// set remove mark in the database on the clicked item
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'node': selectedNodes[0],
					'descendantsCount': descendants.length,
					'doRegHist': true
				}
				this.$store.dispatch('removeDoc', payload)
				// and remove the descendants without registering history in parents which are removed anyway
				for (let i = 0; i < descendants.length; i++) {
					const payload2 = {
						'userName': this.getUser,
						'email': this.getEmail,
						'node': descendants[i],
						'doRegHist': false
					}
					this.$store.dispatch('removeDoc', payload2)
				}
				// after removal no node is selected
				this.nodeIsSelected = false
			},
			/*
			 * Cannot create a database here, ask server admin
			 */
			showInsertModal(node, event) {
				event.preventDefault();
				if (this.nodeIsSelected) {
					let clickedLevel = this.firstNodeSelected.level

					if (clickedLevel === this.pbiLevel) {
						// cannot create child below PBI
						this.insertOptionSelected = 1;
					}
					if (clickedLevel === 1) {
						// cannot create a database here, ask server admin
						this.insertOptionSelected = 2;
					}
					this.$refs.insertModalRef.show()
				}
			},
			getPbiOptions() {
				this.selectedPbiType = this.getCurrentItemSubType
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
			getNodeTypeOptions() {
				let options = [{
						text: 'Option 1',
						value: 1,
						disabled: false
					},
					{
						text: 'Option 2',
						value: 2,
						disabled: false
					}
				];
				var clickedLevel = this.firstNodeSelected.level
				options[0].text = this.getLevelText(clickedLevel)
				options[1].text = this.getLevelText(clickedLevel + 1)
				// Disable the option to create a node below a PBI
				if (clickedLevel === this.pbiLevel) options[1].disabled = true
				// Disable the option to create a new database
				if (clickedLevel === 1) options[0].disabled = true
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
			 * Prepare a new node for insertion
			 */
			prepareInsert() {
				// prepare the new node for insertion later
				newNode = {
					title: 'is calculated in this method',
					isLeaf: 'is calculated in this method',
					children: [],
					isExpanded: false,
					isDraggable: true,
					isSelectable: true,
					isSelected: true,
					data: {
						_id: null,
						priority: null,
						productId: null,
						parentId: null,
						subtype: 0
					}
				}
				var clickedLevel = this.firstNodeSelected.level
				if (this.insertOptionSelected === 1) {
					// New node is a sibling placed below (after) the selected node
					insertLevel = clickedLevel

					newNodeLocation = {
						node: this.firstNodeSelected,
						placement: 'after'
					}
					newNode.title = 'New ' + this.getLevelText(insertLevel)
					newNode.isLeaf = (insertLevel < this.pbiLevel) ? false : true
					return "Insert new " + this.getLevelText(insertLevel) + " below the selected node"
				}
				if (this.insertOptionSelected === 2) {
					// new node is a child placed a level lower (inside) than the selected node
					insertLevel = clickedLevel + 1

					newNodeLocation = {
						node: this.firstNodeSelected,
						placement: 'inside'
					}
					newNode.title = 'New ' + this.getLevelText(insertLevel)
					newNode.isLeaf = (insertLevel < this.pbiLevel) ? false : true
					return "Insert new " + this.getLevelText(insertLevel) + " as a child node"
				}
				return '' // Should never happen
			},
			/*
			 * Insert the prepared node in the tree and create a document for this new item
			 */
			doInsert() {
				if (this.canWriteLevels[insertLevel]) {
					// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
					const newId = Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
					newNode.data._id = newId
					this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
					// inserting the node also selects it
					this.$refs.slVueTree.insert(newNodeLocation, newNode)
					// restore default
					this.insertOptionSelected = 1

					// unselect the node that was clicked before the insert and expand it to show the inserted node
					const clickedPath = this.$refs.slVueTree.getSelected()[0].path
					this.$refs.slVueTree.updateNode(clickedPath, {
						isSelected: false,
						isExpanded: true
					})
					// now the node is inserted and selected get the full ISlTreeNode data and set data fields
					const insertedNode = this.$refs.slVueTree.getSelected()[0]
					// productId, parentId and priority are set in this routine
					this.updateTree([insertedNode], false)
					// create a new document and store it
					const initData = {
						"_id": insertedNode.data._id,
						"productId": insertedNode.data.productId,
						"parentId": insertedNode.data.parentId,
						"team": "not assigned yet",
						"type": insertLevel,
						"subtype": 0,
						"state": 0,
						"tssize": 0,
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
							'by': this.getUser,
							'email': this.getEmail,
							'timestamp': Date.now()
						}],
						"delmark": false
					}
					// update the database
					const payload = {
						'initData': initData
					}
					this.$store.dispatch('createDoc', payload)
				} else {
					this.showLastEvent("Sorry, your assigned role(s) disallow you to create new items of this type",WARNING)
				}
			},
			doCancelInsert() {
				// restore default
				this.insertOptionSelected = 1;
			},

		},

		components: {
			Multipane,
			MultipaneResizer,
			VueEditor,
			SlVueTree,
		}
	}
