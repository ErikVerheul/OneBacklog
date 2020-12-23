import { mapGetters } from 'vuex'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3
const DEFAULTCOLOR = '#408FAE'

const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6

const AREA_PRODUCTID = 'requirement-areas'

const authorization = {
	computed: {
		...mapGetters([
			'canCreateComments',
			'canUploadAttachments',
			'isAdmin',
			'isAPO',
			'isAuthenticated',
			'isDeveloper',
			'isGuest',
			'isPO',
			'isReqAreaItem',
			'isServerAdmin',
			'getMyGenericRoles',
			'getMyProductsRoles',
			'getMyProductSubscriptions',
			'getMyAssignedProductIds'
		])
	},

	methods: {
		/*
		* Returns true if the user has write access to the product at the given level. If no productId is specified the current productId is used.
		* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
		* Note that level 0 is not used and the root of the tree starts with level 1.
		* Note that guests have no write permissions.
		* See README.md for the role definitions.
		*/
		haveWritePermission(level, productId = this.$store.state.currentProductId) {
			const levels = []
			for (let i = 0; i <= TASKLEVEL; i++) {
				// initialize with false
				levels.push(false)
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isServerAdmin) {
				levels[DATABASELEVEL] = true
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAPO) {
				levels[PRODUCTLEVEL] = true
				// the APO has access to the requirements areas overview dummy product
				if (productId === AREA_PRODUCTID) {
					levels[EPICLEVEL] = true
				}
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAdmin) {
				levels[PRODUCTLEVEL] = true
			}

			if (this.getMyAssignedProductIds.includes(productId)) {
				// assing write permissions for the product only if that product is assigned to this user
				if (this.getMyProductsRoles[productId].includes('PO')) {
					levels[PRODUCTLEVEL] = true
					levels[EPICLEVEL] = true
					levels[FEATURELEVEL] = true
					levels[PBILEVEL] = true
				}

				if (this.getMyProductsRoles[productId].includes('developer')) {
					levels[FEATURELEVEL] = true
					levels[PBILEVEL] = true
					levels[TASKLEVEL] = true
				}
			}
			// eslint-disable-next-line no-console
			if (this.$store.state.debug) console.log(`haveWritePermission: For productId ${productId} my roles are ${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}`)
			// eslint-disable-next-line no-console
			if (this.$store.state.debug) console.log(`haveWritePermission: My write levels are [NOT-USED, DATABASELEVEL, PRODUCTLEVEL, EPICLEVEL, FEATURELEVEL, PBILEVEL, TASKLEVEL]: ${levels}`)
			return levels[level]
		},

		haveAccessInTree(level, itemTeam, forAction, allowExtraLevel = false) {
			const productId = this.$store.state.currentProductId
			const skipTestOnTeam = this.isAdmin || this.isAPO
			const canAccessOnTeam = skipTestOnTeam || itemTeam === this.myTeam
			const canAccessOnLevel = this.haveWritePermission(level, productId) || allowExtraLevel && this.haveWritePermission(level + 1, productId)

			if (canAccessOnTeam && canAccessOnLevel) return true

			if (!canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] and team membership disallow you to ${forAction}`, WARNING)
			}
			if (!canAccessOnTeam && canAccessOnLevel) {
				this.showLastEvent(`You must be member of team '${itemTeam}' to ${forAction}`, WARNING)
			}
			if (canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] disallow you to ${forAction}`, WARNING)
			}
			return false
		}
	}
}

const utilities = {
	computed: {
		...mapGetters([
			'getCurrentItemLevel',
			'getCurrentItemState',
			'getCurrentItemTsSize',
			'getItemSprintName',
			'getPreviousNodeSelected',
			'getLastSelectedNode',
			'isFollower',
			'leafLevel',
			'myTeam',
			'teamCalendarInUse'
		])
	},

	methods: {
		clearLastEvent() {
			this.$store.state.lastEvent = 'Event message is cleared.'
			this.$store.state.eventBgColor = DEFAULTCOLOR
		},

		showSelectionEvent(selNodes) {
			function printRoles(roles) {
				if (roles.length === 0) return 'roles for this product are not set by your administrator'
				if (roles.length === 1) return `role for this product is ${roles[0]}`
				if (roles.length === 2) return `roles for this product are ${roles[0]} and ${roles[1]}`
				if (roles.length === 3) return `roles for this product are ${roles[0]}, ${roles[1]} and ${roles[2]}`
				return `product roles cannot have more than 3 values!`
			}
			// update the event message bar
			let evt = ''
			const lastSelectedNodeTitle = this.itemTitleTrunc(60, this.getLastSelectedNode.title)
			if (selNodes.length === 1) {
				evt = `${this.getLevelText(this.getLastSelectedNode.level, this.getLastSelectedNode.data.subtype)} '${lastSelectedNodeTitle}' is selected.`
				if (this.getLastSelectedNode.level === PRODUCTLEVEL) evt += ` Your assigned ${printRoles(this.getMyProductsRoles[this.getLastSelectedNode._id])}`
			} else {
				const multiNodesTitle = `'${lastSelectedNodeTitle}' + ${(selNodes.length - 1)} other item(s)`
				evt = `${this.getLevelText(this.getLastSelectedNode.level, this.getLastSelectedNode.data.subtype)} ${multiNodesTitle} are selected.`
			}
			this.showLastEvent(evt, INFO)
		},

		/* Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value */
		createId() {
			const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
			return Date.now().toString().concat(ext)
		},

		getItemStateText(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
				return 'Error: unknown state'
			}
			return this.$store.state.configData.itemState[idx]
		},

		/* mappings from config document */
		getLevelText(level, subtype = 0) {
			if (level < 0 || level > TASKLEVEL) {
				return 'Level not supported'
			}
			if (level === PBILEVEL) {
				return this.getSubType(subtype)
			}
			return this.$store.state.configData.itemType[level]
		},

		getNodeStateText(node) {
			const idx = node.data.state
			if (node.level < TASKLEVEL) {
				if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.itemState[idx]
			} else {
				if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.taskState[idx]
			}
		},

		getSubType(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.subtype.length) {
				return 'Error: unknown subtype'
			}
			return this.$store.state.configData.subtype[idx]
		},

		getTaskStateText(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
				return 'Error: unknown state'
			}
			return this.$store.state.configData.taskState[idx]
		},

		getTsSize(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return this.$store.state.configData.tsSize[idx]
		},

		itemTitleTrunc(length, title) {
			if (title.length <= length) return title
			return title.substring(0, length - 4) + '...'
		},

		showLastEvent(txt, severity) {
			let eventBgColor = DEFAULTCOLOR
			switch (severity) {
				case DEBUG:
					eventBgColor = 'yellow'
					break
				case INFO:
					eventBgColor = DEFAULTCOLOR
					break
				case WARNING:
					eventBgColor = 'orange'
					break
				case ERROR:
					eventBgColor = 'red'
					break
				case CRITICAL:
					eventBgColor = '#ff5c33'
			}
			this.$store.state.lastEvent = txt
			this.$store.state.eventBgColor = eventBgColor
		},

		////////////////////////////////////////// sprints ////////////////////////////////////////
		// ToDo: make this a computed prop so that it comes into effect immediately when the current sprint ends
		getCurrentAndNextSprint() {
			const now = Date.now()
			let currentSprint
			let nextSprint
			for (let i = 0; i < this.$store.state.sprintCalendar.length; i++) {
				const s = this.$store.state.sprintCalendar[i]
				if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
					currentSprint = s
					nextSprint = this.$store.state.sprintCalendar[i + 1]
					break
				}
			}
			return { currentSprint, nextSprint }
		},

		/* Return the sprint record with the id or null if not found */
		getSprint(id) {
			for (const s of this.$store.state.sprintCalendar) {
				if (s.id === id) return s
			}
			return null
		},

		//////////////////////////////////////// move items //////////////////////////////////////

		/* Move the nodes (must have the same parent) to the position designated by cursorPosition */
		moveNodes(nodes, cursorPosition) {
			// save the status of source and target before move
			const placement = cursorPosition.placement
			const sourceProductId = nodes[0].productId
			const sourceParentId = nodes[0].parentId
			const sourceLevel = nodes[0].level
			const targetNode = cursorPosition.nodeModel
			const targetProductId = targetNode.productId
			let targetParent
			let targetParentId
			let targetLevel
			let insertInd
			if (cursorPosition.placement === 'inside') {
				targetParent = targetNode
				targetParentId = targetNode._id
				targetLevel = targetNode.level + 1
				insertInd = 0
			} else {
				targetParent = window.slVueTree.getParentNode(targetNode)
				targetParentId = targetNode.parentId
				targetLevel = targetNode.level
				insertInd = targetNode.ind
			}
			const sourceProductTitle = window.slVueTree.getNodeById(sourceProductId).title
			const sourceParentTitle = window.slVueTree.getNodeById(sourceParentId).title
			const targetProductTitle = window.slVueTree.getNodeById(targetProductId).title
			const targetParentTitle = targetParent.title

			// map the source and target node location and the source and target sprintId to the node id
			let doRevertOrder = false
			const forwardMoveMap = []
			for (let i = 0; i < nodes.length; i++) {
				// ------------ set source and target sprint ids ---------------
				const sourceSprintId = nodes[i].data.sprintId
				let targetSprintId
				if (targetLevel === this.pbiLevel || targetLevel === this.taskLevel) {
					// node is moved from any level to pbi or task level
					if (targetParent.data.sprintId) {
						targetSprintId = targetParent.data.sprintId
					}
				}

				// check if the undo mapping need to be sorted in reverse order to accommodate the restore of multiple items
				if (sourceParentId === targetParentId && insertInd < nodes[i].ind) doRevertOrder = true
				forwardMoveMap.push({
					node: nodes[i],
					sourceInd: nodes[i].ind,
					targetInd: insertInd + i,
					sourceSprintId,
					targetSprintId
				})
			}
			// create a mapping to move the items back to their original position on undo; also restore the sprintId and the date/time the item was moved
			const reverseMoveMap = []
			for (let i = 0; i < nodes.length; i++) {
				// ------------ set source and target sprint ids ---------------
				const targetSprintId = nodes[i].data.sprintId
				let sourceSprintId
				if (targetLevel === this.pbiLevel || targetLevel === this.taskLevel) {
					// node is moved from any level to pbi or task level
					if (targetParent.data.sprintId) {
						sourceSprintId = targetParent.data.sprintId
					}
				}

				reverseMoveMap.push({
					node: nodes[i],
					sourceInd: insertInd + i,
					targetInd: nodes[i].ind,
					sourceSprintId,
					targetSprintId,
					lastPositionChange: nodes[i].data.lastPositionChange
				})
			}

			let sortedIndMap
			if (doRevertOrder) {
				// revert the order to enable proper undo when moving multiple items
				sortedIndMap = reverseMoveMap.sort((a, b) => b.targetInd - a.targetInd)
			} else sortedIndMap = reverseMoveMap

			window.slVueTree.remove(nodes)
			window.slVueTree.insert(cursorPosition, nodes)

			return {
				placement,
				sourceProductId,
				sourceProductTitle,
				sourceParentId,
				sourceParentTitle,
				sourceLevel,
				targetProductId,
				targetProductTitle,
				targetParentId,
				targetParentTitle,
				targetLevel,
				forwardMoveMap,
				reverseMoveMap: sortedIndMap
			}
		}
	}
}

export {
	authorization,
	utilities
}
