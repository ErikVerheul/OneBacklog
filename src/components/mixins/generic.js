import { SEV, LEVEL, STATE, MISC } from '../../constants.js'
import { mapGetters } from 'vuex'
import store from '../../store/store.js'

const constants = {
	/* Make the constants available in the context of 'this' */
	created() {
		this.SEV = SEV
		this.STATE = STATE
		this.LEVEL = LEVEL
		this.MISC = MISC
	},
}

const authorization = {
	computed: {
		...mapGetters([
			'canCreateComments',
			'canSeeAndUploadAttachments',
			'isAssistAdmin',
			'isAdmin',
			'isAPO',
			'isAuthenticated',
			'isDeveloper',
			'isGuest',
			'isPO',
			'isReqAreaItem',
			'isReqAreaTopLevel',
			'isServerAdmin',
			'getMyProductsCount',
			'getMyGenericRoles',
			'getMyProductsRoles',
			'getMyProductSubscriptions',
			'getMyAssignedProductIds'
		])
	},

	methods: {
		/*
		* Returns true if the user has write access to the product at the given level.
		* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
		* Note that level 0 is not used and the root of the tree starts with level 1.
		* Note that guests have no write permissions.
		* See README.md for the role definitions.
		*/
		haveWritePermission(productId, level) {
			const levels = []
			for (let i = 0; i <= LEVEL.TASK; i++) {
				// initialize with false
				levels.push(false)
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isServerAdmin) {
				levels[LEVEL.DATABASE] = true
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAPO) {
				levels[LEVEL.PRODUCT] = true
				// the APO has access to the requirements areas overview dummy product
				if (productId === MISC.AREA_PRODUCTID) {
					levels[LEVEL.EPIC] = true
				}
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAdmin) {
				levels[LEVEL.PRODUCT] = true
			}

			if (this.getMyAssignedProductIds.includes(productId)) {
				// assing write permissions for the product only if that product is assigned to this user
				if (this.getMyProductsRoles[productId].includes('PO')) {
					levels[LEVEL.PRODUCT] = true
					levels[LEVEL.EPIC] = true
					levels[LEVEL.FEATURE] = true
					levels[LEVEL.PBI] = true
				}

				if (this.getMyProductsRoles[productId].includes('developer')) {
					levels[LEVEL.FEATURE] = true
					levels[LEVEL.PBI] = true
					levels[LEVEL.TASK] = true
				}
			}
			if (this.getMyProductsRoles[productId]) {
				// eslint-disable-next-line no-console
				if (store.state.debug) console.log(`haveWritePermission: For productId ${productId} my roles are ${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}`)
				// eslint-disable-next-line no-console
				if (store.state.debug) console.log(`haveWritePermission: My write levels are [NOT-USED, DATABASE, PRODUCT, EPIC, FEATURE, PBI, TASK]: ${levels}`)
			}
			return levels[level]
		},

		haveAccessInTree(productId, level, itemTeam, forAction, allowExtraLevel = false) {
			if (this.isReqAreaItem) {
				// requirement areas settings are only accessable for APO's
				if (this.isAPO) {
					return true
				} else {
					this.showLastEvent(`Sorry, you must be an APO (requirement Areas Product Owner) to make changes here`, SEV.WARNING)
					return false
				}
			}
			if (productId !== MISC.AREA_PRODUCTID && this.getMyProductsRoles[productId] == undefined) {
				// do not show this message if the user tries to move a regular item into the requirement areas dummy product
				this.showLastEvent(`Sorry, the item belongs to a product that is not assigned to you. Check with your administrator for a fix.`, SEV.WARNING)
				return false
			}

			const skipTestOnTeam = itemTeam === '*' || this.isAdmin || this.isAPO || level <= LEVEL.EPIC
			const canAccessOnTeam = skipTestOnTeam || itemTeam && itemTeam === this.myTeam
			const canAccessOnLevel = this.haveWritePermission(productId, level) || allowExtraLevel && this.haveWritePermission(productId, level + 1)

			if (canAccessOnTeam && canAccessOnLevel) return true

			if (!canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] and team membership disallow you to ${forAction}`, SEV.WARNING)
			}
			if (!canAccessOnTeam && canAccessOnLevel) {
				this.showLastEvent(`You must be member of team '${itemTeam}' to ${forAction}`, SEV.WARNING)
			}
			if (canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] disallow you to ${forAction}`, SEV.WARNING)
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
			'getCurrentDefaultProductId',
			'getItemSprintName',
			'getPreviousNodeSelected',
			'getLastSelectedNode',
			'getLastEventColor',
			'getLastEventTxt',
			'isDetailsViewSelected',
			'isFollower',
			'isOverviewSelected',
			'isPlanningBoardSelected',
			'myTeam'
		]),

		/*
		* Return the current and coming next sprint objects depending on the current date and time.
		* Return undefined if not found.
		*/
		getActiveSprints() {
			const now = Date.now()
			const myCurrentSprintCalendar = store.state.myCurrentSprintCalendar
			let currentSprint
			let nextSprint
			for (let i = 0; i < myCurrentSprintCalendar.length; i++) {
				const s = myCurrentSprintCalendar[i]
				if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
					currentSprint = s
					if (myCurrentSprintCalendar[i + 1]) nextSprint = myCurrentSprintCalendar[i + 1]
					break
				}
			}
			if (currentSprint && nextSprint) {
				return { currentSprint, nextSprint }
			} else {
				alert('Error: Missing current and/or next sprint; you need to sign-in again to have the sprint calendar extended. The application will exit.')
				store.commit('endSession', 'generic: getActiveSprints - Missing current and/or next sprint')
			}
		}
	},

	methods: {
		getItemStateText(idx) {
			if (idx < 0 || idx >= store.state.configData.itemState.length) {
				return 'Error: unknown state'
			}
			return store.state.configData.itemState[idx]
		},

		getLevelText(level) {
			if (store.state.helpersRef) return store.state.helpersRef.getLevelText(level)
		},

		getSubType(idx) {
			if (store.state.helpersRef) return store.state.helpersRef.getSubType(idx)
		},

		getNodeStateText(node) {
			const idx = node.data.state
			if (node.level < LEVEL.TASK) {
				if (idx < 0 || idx >= store.state.configData.itemState.length) {
					return 'Error: unknown state'
				}
				return store.state.configData.itemState[idx]
			} else {
				if (idx < 0 || idx >= store.state.configData.taskState.length) {
					return 'Error: unknown state'
				}
				return store.state.configData.taskState[idx]
			}
		},

		getTaskStateText(idx) {
			if (idx < 0 || idx >= store.state.configData.taskState.length) {
				return 'Error: unknown state'
			}
			return store.state.configData.taskState[idx]
		},

		getTsSize(idx) {
			if (idx < 0 || idx >= store.state.configData.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return store.state.configData.tsSize[idx]
		},

		itemTitleTrunc(length, title) {
			if (title.length <= length) return title
			return title.substring(0, length - 4) + '...'
		},

		showLastEvent(txt, severity) {
			store.commit('addToEventList', { txt, severity })
		},

		showSelectionEvent(selNodes) {
			function printRoles(roles) {
				if (roles.length === 0) return 'roles for this product are not set by your administrator'
				if (roles.length === 1) return `role for this product is ${roles[0]}.`
				if (roles.length === 2) return `roles for this product are ${roles[0]} and ${roles[1]}.`
				if (roles.length === 3) return `roles for this product are ${roles[0]}, ${roles[1]} and ${roles[2]}.`
				if (roles.length === 4) return `roles for this product are ${roles[0]}, ${roles[1]}, ${roles[2]} and ${roles[3]}.`
				if (roles.length === 5) return `roles for this product are ${roles[0]}, ${roles[1]}, ${roles[2]}, ${roles[3]} and ${roles[4]}.`
				return `roles cannot have more than 3 values!`
			}
			// update the event message bar
			let evt = ''
			const lastSelectedNodeTitle = this.itemTitleTrunc(60, this.getLastSelectedNode.title)
			const itemType = this.getLevelText(this.getLastSelectedNode.level, this.getLastSelectedNode.data.subtype)
			if (selNodes.length === 1) {
				evt = `${itemType} '${lastSelectedNodeTitle}' is selected.`
				if (this.getLastSelectedNode.level === LEVEL.PRODUCT) evt += ` Your assigned ${printRoles(this.getMyProductsRoles[this.getLastSelectedNode._id])}`
				if (this.getLastSelectedNode.data.reqarea) evt += ` This ${itemType} belongs to requirement area '${store.state.reqAreaMapper[this.getLastSelectedNode.data.reqarea]}'`
			} else {
				const multiNodesTitle = `${lastSelectedNodeTitle}' + ${(selNodes.length - 1)} other item(s)`
				evt = `${itemType} ${multiNodesTitle} are selected.`
			}
			this.showLastEvent(evt, SEV.INFO)
		},

		//////////////////////////////////////// move items //////////////////////////////////////

		checkMove(nodes, cursorPosition) {
			const sourceLevel = nodes[0].level
			const targetNode = cursorPosition.nodeModel
			let targetLevel
			if (cursorPosition.placement === 'inside') {
				targetLevel = targetNode.level + 1
			} else {
				targetLevel = targetNode.level
			}

			const levelShift = targetLevel - sourceLevel
			return {
				nodes,
				cursorPosition,
				sourceLevel,
				targetLevel,
				levelShift
			}
		},

		/* Move the nodes (must have the same parent) to the position designated by cursorPosition */
		moveNodes(nodes, cursorPosition) {
			// save the status of source and target before move
			const placement = cursorPosition.placement
			const sourceProductId = nodes[0].productId
			const sourceParentId = nodes[0].parentId
			const sourceLevel = nodes[0].level
			const targetNode = cursorPosition.nodeModel
			let targetProductId = targetNode.productId
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
				targetParent = store.state.helpersRef.getParentNode(targetNode)
				targetParentId = targetNode.parentId
				targetLevel = targetNode.level
				insertInd = targetNode.ind
			}
			const sourceProductTitle = store.state.helpersRef.getNodeById(sourceProductId).title
			const sourceParentTitle = store.state.helpersRef.getNodeById(sourceParentId).title
			const targetProductTitle = store.state.helpersRef.getNodeById(targetProductId).title
			const targetParentTitle = targetParent.title

			// if moving a product (one at a time) skip the productId update in its descendants and assign the product id to the target product id
			if (targetParentId === 'root') targetProductId = nodes[0]._id

			// calculate the source sprintId from the target sprintId or visa versa
			function calcSprintId(sprintIdIn) {
				let sprintIdOut
				if (sourceLevel === targetLevel) {
					if (sourceParentId === targetParentId) {
						sprintIdOut = sprintIdIn
					} else if (targetLevel === LEVEL.TASK) {
						// if the task is moved from another PBI assign the spintId of the parent PBI to the targetSprintId
						if (targetParent.data.sprintId) {
							sprintIdOut = targetParent.data.sprintId
						}
					} else sprintIdOut = sprintIdIn
				} else {
					// move to a different level
					if (targetLevel === LEVEL.TASK) {
						// if the node is moved from any other level to task level assign the spintId of the parent PBI to the targetSprintId
						if (targetParent.data.sprintId) {
							sprintIdOut = targetParent.data.sprintId
						}
					} else {
						if (targetLevel === LEVEL.PBI) {
							if (sourceLevel === LEVEL.TASK) {
								// a task promoted to PBI preserves its sprint
								sprintIdOut = sprintIdIn
							} else {
								// items moved from feature level and above have no sprint assigned
								sprintIdOut = undefined
							}
						} else {
							// items moved to feature level and above have no sprint assigned
							sprintIdOut = undefined
						}
					}
				}
				return sprintIdOut
			}

			// map the source and target node location and the source and target sprintId to the node id
			let doRevertOrder = false
			const forwardMoveMap = []
			for (let i = 0; i < nodes.length; i++) {
				// ------------ set source and target sprint ids ---------------
				const sourceSprintId = nodes[i].data.sprintId
				let targetSprintId
				if (nodes[i].data.state === STATE.DONE) {
					// done items do not change sprint
					targetSprintId = sourceSprintId
				} else targetSprintId = calcSprintId(sourceSprintId)

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
				if (nodes[i].data.state === STATE.DONE) {
					// done items do not change sprint
					sourceSprintId = targetSprintId
				} else sourceSprintId = calcSprintId(targetSprintId)

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

			store.state.helpersRef.removeNodes(nodes)
			// if moving a product skip updating the productId; nodes are assigned their new priority
			store.state.helpersRef.insertNodes(cursorPosition, nodes, { skipUpdateProductId: targetParentId === 'root' })

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
	constants,
	authorization,
	utilities
}
