import { SEV, LEVEL } from '../../../constants.js'
import commonContext from '../common_context.js'
import { eventBus } from '../../../main'

// is initiated in method moveItemToOtherProduct
var movedNode

function created() {
	this.PBITOSPRINT = 11
	this.FROMSPRINT = 12
	this.TASKTOSPRINT = 13
	eventBus.$on('context-menu', (node) => {
		this.showContextMenu(node)
	})
}

function data() {
	return {
		isInSprint: false,
		canAssignPbiToSprint: false,
		canAssignTaskToSprint: false
	}
}

const methods = {
	showContextMenu(node) {
		if (this.$store.state.selectedNodes.length === 1) {
			// select and load the item
			this.$store.commit('updateNodesAndCurrentDoc', { selectNode: node })
			const fromContextMenu = true
			window.slVueTree.emitSelect(fromContextMenu)
			this.contextOptionSelected = undefined
			this.listItemText = ''
			this.showAssistance = false
			this.disableOkButton = true
			this.contextWarning = undefined
			// for access to the context menu all roles get an extra level, however they cannot change the item's properties on that level
			const allowExtraLevel = node.level < this.taskLevel
			if (this.haveAccessInTree(node.level, '*', 'open the context menu', allowExtraLevel)) {
				const parentNode = window.slVueTree.getParentNode(node)
				this.contextNodeSelected = node
				this.contextParentTeam = parentNode.data.team
				this.contextParentType = this.getLevelText(parentNode.level)
				this.contextNodeTitle = node.title
				this.contextNodeLevel = node.level
				this.contextNodeType = this.getLevelText(node.level, node.data.subtype)
				this.contextChildType = this.getLevelText(node.level + 1)
				this.contextNodeDescendants = window.slVueTree.getDescendantsInfo(node)
				this.contextNodeTeam = node.data.team
				this.hasDependencies = node.dependencies && node.dependencies.length > 0
				this.hasConditions = node.conditionalFor && node.conditionalFor.length > 0
				this.allowRemoval = true
				this.isInSprint = !!node.data.sprintId
				// can only assign pbi's to a sprint if not in a sprint already
				this.canAssignPbiToSprint = node.level === this.pbiLevel && !node.data.sprintId
				// can only assign tasks to a sprint if not in a sprint already
				this.canAssignTaskToSprint = node.level === this.taskLevel && !node.data.sprintId
				if (this.$refs.d_contextMenuRef) {
					// prevent error message on recompile
					this.$refs.d_contextMenuRef.show()
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
			if (window.slVueTree.comparePaths(nodeWithDependencies.path, selNode.path) === -1) {
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
				this.assistanceText = this.$store.state.help.help.productClone
				this.listItemText = 'Make a clone of this product including its descendant items.'
				break
			case this.CLONEITEM:
				this.assistanceText = this.$store.state.help.help.itemClone
				this.listItemText = 'Make a clone of this item. No descendant items are copied.'
				break
			case this.INSERTBELOW:
				this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level]
				this.listItemText = 'Insert a ' + this.contextNodeType + ' below this item'
				break
			case this.INSERTINSIDE:
				this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level + 1]
				this.listItemText = 'Insert a ' + this.contextChildType + ' inside this ' + this.contextNodeType
				break
			case this.MOVETOPRODUCT:
				this.assistanceText = this.$store.state.help.help.move
				if (!this.$store.state.moveOngoing) {
					this.listItemText = `Item selected. Choose a ${this.getLevelText(this.contextNodeSelected.level - 1)} as drop position in any other product`
				} else this.listItemText = 'Drop position is set'
				break
			case this.REMOVEITEM:
				this.assistanceText = this.$store.state.help.help.remove
				if (this.hasDependencies) {
					this.listItemText = 'WARNING: this item has dependencies on other items. Remove the dependency/dependencies first.'
					this.disableOkButton = true
				} else if (this.hasConditions) {
					this.listItemText = 'WARNING: this item is conditional for other items. Remove the condition(s) first'
					this.disableOkButton = true
				} else this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendants.count} descendants`
				break
			case this.ASIGNTOMYTEAM:
				this.assistanceText = this.$store.state.help.help.team
				if (this.areDescendantsAssignedToOtherTeam(this.contextNodeDescendants.descendants)) {
					this.contextWarning = `Descendants of this ${this.contextNodeType} are assigned to another team.
					Click OK to assign all these items to your team or Cancel and join team '${this.contextNodeTeam}' to open the context menu.`
				} else if (this.contextParentTeam !== 'not asigned yet' && this.contextNodeLevel > this.featureLevel && this.contextParentTeam !== this.myTeam) {
					this.contextWarning = `WARNING: The team of parent ${this.contextParentType} (${this.contextParentTeam}) and your team (${this.myTeam}) do not match. Read the assistance text.`
				}
				this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.myTeam}'`
				break
			case this.CHECKSTATES:
				this.assistanceText = this.$store.state.help.help.consistencyCheck
				this.listItemText = 'Start the check. See in the tree if any red badges appear'
				break
			case this.SETDEPENDENCY:
				this.assistanceText = this.$store.state.help.help.setDependency
				if (!this.$store.state.selectNodeOngoing) {
					this.listItemText = 'Click OK and right-click a node this item depends on'
				} else {
					if (checkNode(this, this.contextNodeSelected)) {
						this.listItemText = 'Click OK to set this condition'
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
			case this.CLONEITEM:
				this.doCloneItem(this.contextNodeSelected)
				break
			case this.INSERTBELOW:
				this.doInsertNewItem()
				break
			case this.INSERTINSIDE:
				this.doInsertNewItem()
				break
			case this.MOVETOPRODUCT:
				this.moveItemToOtherProduct()
				break
			case this.REMOVEITEM:
				this.doRemove()
				break
			case this.ASIGNTOMYTEAM:
				this.doAssignToMyTeam()
				break
			case this.CHECKSTATES:
				this.doCheckStates()
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
			case this.PBITOSPRINT:
				this.doAddPbiToSprint()
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
		if (this.contextNodeSelected.level > this.productLevel) {
			// can assign team from epic level and down (higher level numbers)
			const node = this.contextNodeSelected
			const newTeam = this.myTeam
			this.$store.dispatch('assignToMyTeam', { node, newTeam, timestamp: Date.now(), createUndo: true })
		}
	},

	moveItemToOtherProduct() {
		if (this.$store.state.moveOngoing) {
			const targetPosition = window.slVueTree.lastSelectCursorPosition
			// only allow to drop the node inside a new parent 1 level higher (lower value) than the source node
			if (targetPosition.nodeModel.level !== movedNode.level - 1) {
				this.showLastEvent('You can only drop inside a ' + this.getLevelText(movedNode.level - 1), SEV.WARNING)
				return
			}

			// move the node to the new place and update the productId and parentId; movedNode is updated by this call
			const moveDataContainer = window.slVueTree.moveNodes([movedNode], targetPosition)

			// update the database
			this.$store.dispatch('updateMovedItemsBulk', { moveDataContainer, move: true })
			this.$store.state.moveOngoing = false
		} else {
			this.$store.state.moveOngoing = true
			this.moveSourceProductId = this.$store.state.currentProductId
			movedNode = this.contextNodeSelected
		}
	},

	getDependencies() {
		this.dependenciesObjects = []
		for (const depId of this.contextNodeSelected.dependencies) {
			const item = window.slVueTree.getNodeById(depId)
			if (item) {
				window.slVueTree.showPathToNode(item, { doHighLight_2: true }, 'dependency')
				this.dependenciesObjects.push({ _id: depId, title: item.title })
			}
		}
	},

	getConditions() {
		this.conditionsObjects = []
		for (const conId of this.contextNodeSelected.conditionalFor) {
			const item = window.slVueTree.getNodeById(conId)
			if (item) {
				window.slVueTree.showPathToNode(item, { doHighLight_2: true }, 'dependency')
				this.conditionsObjects.push({ _id: conId, title: item.title })
			}
		}
	},

	doAddPbiToSprint() {
		window.assignToSprintRef.show()
	},

	/* Assign the task to the sprint of its PBI; or if the PBI has no sprint assigned, ask the user to select. */
	doAddTaskToSprint() {
		const taskNode = this.contextNodeSelected
		const pbiNode = window.slVueTree.getParentNode(taskNode)
		const pbiSprintId = pbiNode.data.sprintId
		if (pbiSprintId) {
			const sprintName = this.getSprintNameById(pbiSprintId)
			// assign the task to the same sprint the PBI is assigned to
			this.$store.dispatch('addSprintIds', { parentId: pbiNode._id, itemIds: [taskNode._id], sprintId: pbiSprintId, sprintName, createUndo: true })
		} else {
			window.assignToSprintRef.show()
		}
	},

	doRemoveFromSprint() {
		const node = this.contextNodeSelected
		const sprintId = node.data.sprintId
		const itemIds = [node._id]
		if (node.level === LEVEL.PBI) {
			for (const d of window.slVueTree.getDescendantsInfo(node).descendants) {
				// only remove the sprintId of descendants with the same sprintId as the parent
				if (d.data.sprintId === sprintId) itemIds.push(d._id)
			}
		}
		this.$store.dispatch('removeSprintIds', { parentId: node._id, sprintId, itemIds, sprintName: this.getSprintNameById(sprintId) })
	}
}

export default {
	extends: commonContext,
	created,
	data,
	methods
}
