import { MISC, SEV, LEVEL, STATE } from '../../../constants.js'
import { createId, getSprintNameById, uniTob64 } from '../../../common_functions.js'
import { authorization, utilities } from '../../mixins/GenericMixin.js'
import store from '../../../store/store.js'

function created() {
	this.ONHOLDSTATE = STATE.ON_HOLD
	this.NEWSTATE = STATE.NEW
	this.DONESTATE = STATE.DONE

	this.NOTEAM = MISC.NOTEAM

	this.DATABASELEVEL = LEVEL.DATABASE
	this.PRODUCTLEVEL = LEVEL.PRODUCT
	this.EPICLEVEL = LEVEL.EPIC
	this.FEATURELEVEL = LEVEL.FEATURE
	this.USLEVEL = LEVEL.US
	this.TASKLEVEL = LEVEL.TASK

	this.INSERTBELOW = 0
	this.INSERTINSIDE = 1
	this.REMOVEITEM = 3
	this.ASIGNTOMYTEAM = 4
	this.SETDEPENDENCY = 6
	this.SHOWDEPENDENCIES = 7
	this.SHOWCONDITIONS = 8
	this.CLONEPRODUCT = 9
	this.CLONEBRANCH = 10
	this.CLONEITEM = 11
	this.REMOVEREQAREA = 12
	this.USTOSPRINT = 13
	this.TASKTOSPRINT = 14
	this.FROMSPRINT = 15

	this.eventBus.on('context-menu', (node) => {
		this.showContextMenu(node)
	})
}

function data() {
	return {
		disableOkButton: true,
		contextNodeSelected: undefined,
		contextWarning: undefined,
		contextParentTeam: '',
		contextNodeTitle: '',
		contextNodeLevel: 0,
		contextParentType: '',
		contextNodeType: '',
		contextNodeTeam: MISC.NOTEAM,
		contextChildType: '',
		contextOptionSelected: undefined,
		dependentOnNode: undefined,
		listItemText: '',
		assistanceText: 'No assistance available',
		showAssistance: false,
		contextNodeDescendants: null,
		moveSourceProductId: '',
		nodeWithDependenciesId: undefined,
		hasDependencies: false,
		hasConditions: false,
		allowRemoval: false,
		dependenciesObjects: [],
		conditionsObjects: [],
		selectedDependencyIds: [],
		selectedConditionIds: [],

		isInSprint: false,
		canAssignUsToSprint: false,
		canAssignTaskToSprint: false,
		movedNode: {},
	}
}

const methods = {
	areDescendantsAssignedToOtherTeam(descendants) {
		for (const d of descendants) {
			if (d.data.team !== MISC.NOTEAM && d.data.team !== this.myTeam) return true
		}
		return false
	},

	/* Clone a product INCLUDING its descendants */
	doCloneProduct(node) {
		store.dispatch('cloneBranch', node)
	},

	/* Clone a branch INCLUDING its descendants */
	doCloneBranch(node) {
		store.dispatch('cloneBranch', node)
	},

	/* Copy an item EXCLUDING its descendants, attachments, sprintId, dependencies, conditions and followers
	 * Initiate followers with empty array (no folowers)
	 * Insert the new node above the original (inside or after the previous node)
	 */
	doCopyItem(node) {
		const now = Date.now()
		let newNodeLocation
		const prevNode = store.state.helpersRef.getPreviousNode(node.path)
		if (node.path.slice(-1)[0] === 0) {
			// the previous node is the parent
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'inside',
			}
		} else {
			// the previous node is a sibling
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'after',
			}
		}
		// prepare the new node for insertion
		let newNode = {
			_id: createId(),
			title: 'COPY: ' + node.title,
			dependencies: [],
			conditionalFor: [],
			children: [],
			isExpanded: false,
			isDraggable: true,
			isSelectable: true,
			isSelected: true,
			doShow: true,
			data: {
				state: STATE.NEW_OR_TODO,
				reqarea: node.data.reqArea,
				reqAreaItemColor: node.data.reqAreaItemColor,
				team: node.data.team,
				subtype: node.data.subtype,
				lastOtherChange: now,
				followers: [],
			},
			tmp: {},
		}

		// update the node properties as if the node is created in the tree model; after a successful document creation, the node is realy inserted
		newNode = store.state.helpersRef.preFlightSingeNodeInsert(newNodeLocation, newNode, { createNew: false, calculatePrios: true })

		// create a new document as a partial copy of the current document
		const currentDoc = store.state.currentDoc
		const newDoc = {
			_id: newNode._id,
			type: 'backlogItem',
			productId: newNode.productId,
			parentId: newNode.parentId,
			sprintId: newNode.data.sprintId,
			taskOwner: newNode.data.taskOwner,
			team: newNode.data.team,
			level: newNode.level,
			subtype: currentDoc.subtype,
			state: newNode.data.state,
			tssize: currentDoc.tssize,
			spsize: currentDoc.spsize,
			spikepersonhours: currentDoc.spikepersonhours,
			reqarea: currentDoc.reqarea,
			dependencies: [],
			conditionalFor: [],
			title: newNode.title,
			followers: newNode.data.followers || [],
			description: uniTob64(currentDoc.description),
			acceptanceCriteria: uniTob64(currentDoc.acceptanceCriteria),
			priority: newNode.data.priority,
			comments: [
				{
					ignoreEvent: 'comments initiated',
					timestamp: now,
				},
			],
			history: [
				{
					copyItemEvent: [newNode.level, store.state.helpersRef.getNodeById(newNode.parentId).title, newNode.ind + 1],
					by: store.state.userData.user,
					email: store.state.userData.email,
					timestamp: now,
					doNotMessageMyself: store.state.userData.myOptions.doNotMessageMyself === 'true',
					isListed: true,
					sessionId: store.state.mySessionId,
					distributeEvent: true,
				},
			],
			lastOtherChange: now,
		}
		store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
	},

	/*
	 * Create and insert a new node in the tree and create a document for this new item
	 * A new node can be inserted 'inside' or 'after' the selected node
	 */
	doInsertNewItem(selectedNode) {
		const now = Date.now()
		let newNodeLocation
		if (this.contextOptionSelected === this.INSERTBELOW) {
			// new node is a sibling placed below (after) the selected node
			newNodeLocation = {
				nodeModel: selectedNode,
				placement: 'after',
			}
		} else {
			// INSERTINSIDE: new node is a child placed a level lower (inside) than the selected node
			newNodeLocation = {
				nodeModel: selectedNode,
				placement: 'inside',
			}
		}
		// prepare the new node for insertion and set isSelected to true
		let newNode = {
			_id: createId(),
			dependencies: [],
			conditionalFor: [],
			children: [],
			isExpanded: false,
			isDraggable: true,
			isSelectable: true,
			isSelected: true,
			doShow: true,
			data: {
				state: STATE.NEW_OR_TODO,
				subtype: 0,
				lastOtherChange: now,
			},
			tmp: {},
		}

		// update the node properties as if the node is inserted in the tree model; after a successful document update, the node is really inserted
		newNode = store.state.helpersRef.preFlightSingeNodeInsert(newNodeLocation, newNode, { createNew: true, calculatePrios: true })

		if (this.haveAccessInTree(newNode.productId, newNode.level, newNode.data.team, 'create new items of this type')) {
			newNode.title = newNode.parentId === MISC.AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(newNode.level)

			// create a new document and store it
			const newDoc = {
				_id: newNode._id,
				type: 'backlogItem',
				productId: newNode.productId,
				parentId: newNode.parentId,
				sprintId: newNode.data.sprintId,
				taskOwner: newNode.data.taskOwner,
				team: newNode.data.team,
				level: newNode.level,
				subtype: 0,
				state: newNode.data.state,
				tssize: 3,
				spsize: 0,
				spikepersonhours: 0,
				reqarea: null,
				dependencies: [],
				conditionalFor: [],
				title: newNode.title,
				followers: newNode.data.followers || [],
				description: uniTob64(MISC.EMPTYQUILL),
				acceptanceCriteria:
					newNode.level < LEVEL.TASK ? uniTob64('<p>Please do not neglect</p>') : uniTob64('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: newNode.data.priority,
				comments: [
					{
						ignoreEvent: 'comments initiated',
						timestamp: now,
					},
				],
				history: [
					{
						createItemEvent: [newNode.level, store.state.helpersRef.getNodeById(newNode.parentId).title, newNode.ind + 1],
						by: store.state.userData.user,
						email: store.state.userData.email,
						timestamp: now,
						doNotMessageMyself: store.state.userData.myOptions.doNotMessageMyself === 'true',
						isListed: true,
						sessionId: store.state.mySessionId,
						distributeEvent: true,
						updateBoards: { sprintsAffected: [selectedNode.data.sprintId], teamsAffected: [newNode.data.team] },
					},
				],
				lastOtherChange: now,
			}
			store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
		}
	},

	doSetDependency() {
		if (store.state.selectNodeOngoing) {
			store.dispatch('setDepAndCond', { dependentOnNode: this.dependentOnNode, conditionalForNode: this.contextNodeSelected, timestamp: Date.now() })
		} else {
			// save the node the dependency will be added to
			this.dependentOnNode = this.contextNodeSelected
			store.state.selectNodeOngoing = true
		}
	},

	/*
	 * In the database both the selected node and all its descendants will be tagged with a delmark
	 * The parent node and its descendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
	 */
	doRemove() {
		const selectedNode = this.contextNodeSelected
		if (this.haveAccessInTree(selectedNode.productId, selectedNode.level, selectedNode.data.team, 'remove this item')) {
			// when removing a product
			if (selectedNode.level === LEVEL.PRODUCT) {
				if (this.getMyAssignedProductIds.length === 1 || store.state.helpersRef.getProducts().length <= 1) {
					// cannot remove the last assigned product or product in the tree
					this.showLastEvent('You cannot remove your last assigned product, but you can remove the epics', SEV.WARNING)
					return
				}
			}
			this.showLastEvent('Busy removing branch...', SEV.INFO)
			// set remove mark in the database on the clicked item and descendants (if any), then remove the node
			store.dispatch('removeBranch', { node: selectedNode, undoOnError: false })
		}
	},

	/* Undo the tree expansion and highlighting */
	undoShowDependencies() {
		store.dispatch('restoreTreeView', 'dependency')
	},

	/* Undo the tree expansion and highlighting */
	undoShowConditions() {
		store.dispatch('restoreTreeView', 'condition')
	},

	/* Remove the dependencies and the corresponding conditions in the tree model and the database. */
	doRemoveDependencies() {
		if (this.selectedDependencyIds && this.selectedDependencyIds.length > 0) {
			this.undoShowDependencies(store.state.helpersRef.getProductNodes())
			const newDeps = []
			for (const id of this.contextNodeSelected.dependencies) {
				if (!this.selectedDependencyIds.includes(id)) newDeps.push(id)
			}
			store.dispatch('removeDependenciesAsync', { node: this.contextNodeSelected, newDeps, removedIds: this.selectedDependencyIds, timestamp: Date.now() })
		}
	},

	/* Remove the conditions and the corresponding dependencies in the tree model and the database. */
	doRemoveConditions() {
		if (this.selectedConditionIds && this.selectedConditionIds.length > 0) {
			this.undoShowConditions(store.state.helpersRef.getProductNodes())
			const newConds = []
			for (const id of this.contextNodeSelected.conditionalFor) {
				if (!this.selectedConditionIds.includes(id)) newConds.push(id)
			}
			store.dispatch('removeConditionsAsync', {
				node: this.contextNodeSelected,
				newCons: newConds,
				removedIds: this.selectedConditionIds,
				timestamp: Date.now(),
			})
		}
	},

	/* Cancel the context menu */
	doCancel() {
		this.showAssistance = false
		store.state.moveOngoing = false
		store.state.selectNodeOngoing = false
		if (this.contextOptionSelected === this.SHOWDEPENDENCIES) {
			this.undoShowDependencies(store.state.helpersRef.getProductNodes())
		}
		if (this.contextOptionSelected === this.SHOWCONDITIONS) {
			this.undoShowConditions(store.state.helpersRef.getProductNodes())
		}
	},

	getDependencies() {
		this.dependenciesObjects = []
		this.allDepenciesFound = true
		store.dispatch('saveTreeView', { type: 'dependency', nodesToScan: store.state.helpersRef.getProductNodes() })
		for (const depId of this.contextNodeSelected.dependencies) {
			const item = store.state.helpersRef.getNodeById(depId)
			if (item) {
				store.state.helpersRef.showPathToNode(item, { doHighLight_2: true })
				this.dependenciesObjects.push({ _id: depId, title: item.title })
			} else this.allDepenciesFound = false
		}
		this.disableOkButton = !this.allDepenciesFound
	},

	getConditions() {
		this.conditionsObjects = []
		this.allConditionsFound = true
		store.dispatch('saveTreeView', { type: 'condition', nodesToScan: store.state.helpersRef.getProductNodes() })
		for (const conId of this.contextNodeSelected.conditionalFor) {
			const item = store.state.helpersRef.getNodeById(conId)
			if (item) {
				store.state.helpersRef.showPathToNode(item, { doHighLight_2: true })
				this.conditionsObjects.push({ _id: conId, title: item.title })
			} else this.allConditionsFound = false
		}
		this.disableOkButton = !this.allConditionsFound
	},

	showContextMenu(node) {
		if (store.state.selectedNodes.length === 1) {
			this.contextOptionSelected = undefined
			this.listItemText = ''
			this.showAssistance = false
			this.disableOkButton = true
			this.contextWarning = undefined
			// for access to the context menu all roles get an extra level, however they cannot change the item's properties on that level
			const allowExtraLevel = node.level < this.TASKLEVEL
			if (this.haveAccessInTree(node.productId, node.level, '*', 'open the context menu', allowExtraLevel)) {
				// note that getParentNode(node) can return null if requesting the parent of the root node or if the parent was removed
				const parentNode = store.state.helpersRef.getParentNode(node)
				this.contextNodeSelected = node
				this.contextParentTeam = parentNode ? parentNode.data.team : undefined
				this.contextParentType = parentNode ? this.getLevelText(parentNode.level) : undefined
				this.contextNodeTitle = node.title
				this.contextNodeLevel = node.level
				this.contextNodeType = this.getLevelText(node.level)
				this.contextChildType = this.getLevelText(node.level + 1)
				this.contextNodeDescendants = store.state.helpersRef.getDescendantsInfo(node)
				this.contextNodeTeam = node.data.team || MISC.NOTEAM
				this.hasDependencies = node.dependencies && node.dependencies.length > 0
				this.hasConditions = node.conditionalFor && node.conditionalFor.length > 0
				this.allowRemoval = true
				this.isInSprint = !!node.data.sprintId
				// can only assign user story to a sprint if not in a sprint already
				this.canAssignUsToSprint = node.level === this.USLEVEL && !node.data.sprintId
				// can only assign tasks to a sprint if not in a sprint already
				this.canAssignTaskToSprint = node.level === this.TASKLEVEL && !node.data.sprintId
				if (this.$refs.contextMenuRef) {
					// prevent error message on recompile
					this.$refs.contextMenuRef.show()
				}
			} else this.allowRemoval = false
		} else this.showLastEvent('Cannot apply context menu on multiple items. Choose one', SEV.WARNING)
	},

	showSelected(idx) {
		function checkNode(vm, selNode) {
			if (selNode._id === vm.dependentOnNode._id) {
				vm.contextWarning = 'WARNING: Item cannot be dependent on it self'
				return false
			}
			const nodeWithDependencies = vm.dependentOnNode
			if (nodeWithDependencies.dependencies.includes(selNode._id)) {
				vm.contextWarning = 'WARNING: Cannot add the same dependency twice'
				return false
			}
			if (vm.store.state.helpersRef.comparePaths(nodeWithDependencies.path, selNode.path) === -1) {
				vm.contextWarning = 'WARNING: Cannot create a dependency on an item with lower priority'
				return false
			}
			return true
		}

		this.contextOptionSelected = idx
		this.listItemText = ''
		this.contextWarning = undefined
		this.disableOkButton = false
		switch (this.contextOptionSelected) {
			case this.CLONEPRODUCT:
				this.assistanceText = store.state.help.productClone
				this.listItemText = 'Make a clone of this product including its descendant items'
				break
			case this.CLONEBRANCH:
				this.assistanceText = store.state.help.branchClone
				this.listItemText = 'Make a clone of this branch including its descendant items'
				break
			case this.CLONEITEM:
				this.assistanceText = store.state.help.itemClone
				this.listItemText = 'Make a clone of this item. No descendant items are copied'
				break
			case this.FROMSPRINT:
				if (this.contextNodeSelected.level === LEVEL.US) {
					this.assistanceText = store.state.help.usFromSprint
					this.listItemText = `Remove this User story from the assigned sprint including it's tasks`
				}
				if (this.contextNodeSelected.level === LEVEL.TASK) {
					this.assistanceText = store.state.help.taskFromSprint
					this.listItemText = `Remove this Task from the assigned sprint`
				}
				break
			case this.INSERTBELOW:
				this.assistanceText = store.state.help.insert[this.contextNodeSelected.level]
				this.listItemText = 'Insert a ' + this.contextNodeType + ' below this item'
				break
			case this.INSERTINSIDE:
				this.assistanceText = store.state.help.insert[this.contextNodeSelected.level + 1]
				this.listItemText = 'Insert a ' + this.contextChildType + ' inside this ' + this.contextNodeType
				break
			case this.USTOSPRINT:
				this.assistanceText = store.state.help.usToSprint
				this.listItemText = `Assign this ${this.contextNodeType} to the current or next sprint`
				break
			case this.TASKTOSPRINT:
				this.assistanceText = store.state.help.taskToSprint
				{
					const usNode = store.state.helpersRef.getParentNode(this.contextNodeSelected)
					if (usNode) {
						if (!usNode.data.sprintId) this.listItemText = `Assign this Task to the current or next sprint`
					} else this.listItemText('Cannot find the user story this task belongs to')
				}
				break
			case this.REMOVEITEM:
				this.assistanceText = store.state.help.remove
				if (this.hasDependencies) {
					this.contextWarning = 'WARNING: this item has dependencies on other items. Remove the dependency/dependencies first.'
					this.disableOkButton = true
				} else if (this.hasConditions) {
					this.contextWarning = 'WARNING: this item is conditional for other items. Remove the condition(s) first.'
					this.disableOkButton = true
				} else this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendants.count} descendants.`
				break
			case this.ASIGNTOMYTEAM:
				this.assistanceText = store.state.help.team
				if (this.areDescendantsAssignedToOtherTeam(this.contextNodeDescendants.descendants)) {
					this.contextWarning = `Descendants of this ${this.contextNodeType} are assigned to another team.
					Click OK to assign all these items to your team or Cancel and join team '${this.contextNodeTeam}' to open the context menu.`
				} else if (this.contextParentTeam !== 'not asigned yet' && this.contextNodeLevel > this.FEATURELEVEL && this.contextParentTeam !== this.myTeam) {
					this.contextWarning = `WARNING: The team of parent ${this.contextParentType} (${this.contextParentTeam}) and your team (${this.myTeam}) do not match. Read the assistance text.`
				}
				this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.myTeam}'.`
				break
			case this.REMOVEREQAREA:
				this.assistanceText = store.state.help.remove
				this.listItemText = 'Remove this requirement area'
				break
			case this.SETDEPENDENCY:
				this.assistanceText = store.state.help.setDependency
				if (!store.state.selectNodeOngoing) {
					this.listItemText = 'Click OK and right-click a node this item depends on.'
				} else {
					if (checkNode(this, this.contextNodeSelected)) {
						this.listItemText = 'Click OK to set this condition.'
					} else {
						this.listItemText = ''
						this.disableOkButton = true
					}
				}
				break
			case this.SHOWDEPENDENCIES:
				this.selectedDependencyIds = []
				this.assistanceText = 'No assistance available'
				this.getDependencies()
				break
			case this.SHOWCONDITIONS:
				this.assistanceText = 'No assistance available'
				this.getConditions()
				break
			default:
				this.assistanceText = 'No assistance available'
				this.listItemText = 'nothing selected as yet'
		}
	},

	procSelected() {
		this.showAssistance = false
		switch (this.contextOptionSelected) {
			case this.CLONEPRODUCT:
				this.doCloneProduct(this.contextNodeSelected)
				break
			case this.CLONEBRANCH:
				this.doCloneBranch(this.contextNodeSelected)
				break
			case this.CLONEITEM:
				this.doCopyItem(this.contextNodeSelected)
				break
			case this.INSERTBELOW:
				this.doInsertNewItem(this.contextNodeSelected)
				break
			case this.INSERTINSIDE:
				this.doInsertNewItem(this.contextNodeSelected)
				break
			case this.REMOVEITEM:
			case this.REMOVEREQAREA:
				this.doRemove()
				break
			case this.ASIGNTOMYTEAM:
				this.doAssignToMyTeam()
				break
			case this.SETDEPENDENCY:
				this.doSetDependency()
				break
			case this.SHOWDEPENDENCIES:
				this.doRemoveDependencies()
				break
			case this.SHOWCONDITIONS:
				this.doRemoveConditions()
				break
			case this.USTOSPRINT:
				this.doAddUsToSprint()
				break
			case this.TASKTOSPRINT:
				this.doAddTaskToSprint()
				break
			case this.FROMSPRINT:
				this.doRemoveFromSprint()
				break
		}
	},

	doAssignToMyTeam() {
		if (this.contextNodeSelected.level >= this.FEATURELEVEL) {
			// can assign team from feature level and down (higher level numbers)
			const node = this.contextNodeSelected
			const newTeam = this.myTeam
			store.dispatch('assignToMyTeam', { node, newTeam, timestamp: Date.now() })
		}
	},

	/* Assign the user story to the current or upcoming sprint. Ask the user to select */
	doAddUsToSprint() {
		window.assignToSprintRef.show()
	},

	/* Assign the task to the sprint of its user story; or if the user story has no sprint assigned, ask the user to select. */
	doAddTaskToSprint() {
		window.assignToSprintRef.show()
	},

	doRemoveFromSprint() {
		const node = this.contextNodeSelected
		const sprintId = node.data.sprintId
		const itemIds = [node._id]
		if (node.level === LEVEL.US) {
			for (const d of store.state.helpersRef.getDescendantsInfo(node).descendants) {
				// only remove the sprintId of descendants with the same sprintId as the parent
				if (d.data.sprintId === sprintId) itemIds.push(d._id)
			}
		}
		store.dispatch('removeSprintIds', { parentId: node._id, sprintId, itemIds, sprintName: getSprintNameById(sprintId, store.state.myCurrentSprintCalendar) })
	},
}

export default {
	mixins: [authorization, utilities],
	created,
	data,
	methods,
}
