import CommonContext from '../common_context.js'

const INFO = 0
const WARNING = 1
const PBILEVEL = 5
const TASKLEVEL = 6
var movedNode = null

function created() {
  this.TOSPRINT = 11
  this.FROMSPRINT = 12
  this.sprints = this.getCurrentAndNextSprint()
}

function data() {
  return {
    isInSprint: false
  }
}

const methods = {
  showContextMenu(node) {
    this.contextOptionSelected = undefined
    this.listItemText = ''
    this.showAssistance = false
    this.disableOkButton = true
    // user must have write access on this level && user cannot remove the database && only one node can be selected
    // for access to the context menu all roles get an extra level, however they cannot change the item's properties
    const extraLevel = node.level < this.taskLevel ? node.level + 1 : node.level
    if (this.haveWritePermission[extraLevel] && node.level > this.databaseLevel && this.$store.state.numberOfNodesSelected === 1) {
      const parentNode = window.slVueTree.getParentNode(node)
      this.contextNodeSelected = node
      this.contextParentTeam = parentNode.data.team
      this.contextParentType = this.getLevelText(parentNode.level)
      this.contextNodeTitle = node.title
      this.contextNodeLevel = node.level
      this.contextNodeType = this.getLevelText(node.level)
      this.contextChildType = this.getLevelText(node.level + 1)
      this.contextNodeDescendantsCount = window.slVueTree.getDescendantsInfo(node).count
      this.contextNodeTeam = node.data.team
      this.hasDependencies = node.dependencies && node.dependencies.length > 0
      this.hasConditions = node.conditionalFor && node.conditionalFor.length > 0
      this.allowRemoval = this.haveWritePermission[node.level]
      this.isInSprint = node.sprintId && this.isCurrentOrNextPrintId(node.sprintId)
      window.showContextMenuRef.show()
    }
  },

  showSelected(idx) {
    function checkNode(vm, selNode) {
      if (selNode._id === vm.nodeWithDependenciesId) {
        vm.contextWarning = "WARNING: Item cannot be dependent on it self"
        return false
      }
      const nodeWithDependencies = vm.getNodeWithDependencies()
      if (nodeWithDependencies.dependencies.includes(selNode._id)) {
        vm.contextWarning = "WARNING: Cannot add the same dependency twice"
        return false
      }
      if (window.slVueTree.comparePaths(nodeWithDependencies.path, selNode.path) === -1) {
        vm.contextWarning = "WARNING: Cannot create a dependency on an item with lower priority"
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
        this.listItemText = 'Make a clone of this product'
        break
      case this.CLONEITEM:
        this.assistanceText = this.$store.state.help.help.itemClone
        this.listItemText = 'Make a clone of this item'
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
          this.listItemText = "WARNING: this item has dependencies on other items. Remove them first."
          this.disableOkButton = true
        } else if (this.hasConditions) {
          this.listItemText = "WARNING: this item is conditional for other items. Remove them first"
          this.disableOkButton = true
        } else this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendantsCount} descendants`
        break
      case this.ASIGNTOMYTEAM:
        this.assistanceText = this.$store.state.help.help.team
        if (this.contextNodeLevel > this.featureLevel && this.contextParentTeam !== this.$store.state.userData.myTeam) {
          this.contextWarning = "WARNING: The team of parent " + this.contextParentType + " (" + this.contextParentTeam +
            ") and your team (" + this.$store.state.userData.myTeam + ") do not match. Please read the assistance text"
        } else this.contextWarning = undefined
        this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.$store.state.userData.myTeam}'`
        break
      case this.CHECKSTATES:
        this.assistanceText = this.$store.state.help.help.consistencyCheck
        this.listItemText = `Start the check. See in the tree if any red badges appear`
        break
      case this.SETDEPENDENCY:
        this.assistanceText = this.$store.state.help.help.setDependency
        if (!this.$store.state.selectNodeOngoing) {
          this.listItemText = 'Click OK to choose a node this item depends on'
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
        this.doCloneProduct()
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
        this.doChangeTeam()
        break
      case this.CHECKSTATES:
        this.doCheckStates()
        break
      case this.SETDEPENDENCY:
        this.doSetDependency()
        break
      case this.SHOWDEPENDENCIES:
        this.doUpdateDependencies()
        break
      case this.SHOWCONDITIONS:
        this.doUpdateConditions()
        break
      case this.TOSPRINT:
        this.doAddToSprint()
        break
      case this.FROMSPRINT:
        this.doRemoveFromSprint()
        break
    }
  },

  /*
  * In the database both the selected node and all its descendants will be tagged with a delmark
  * The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
  */
  doRemove() {
    const selectedNode = this.contextNodeSelected
    if (this.haveWritePermission[selectedNode.level]) {
      const descendantsInfo = window.slVueTree.getDescendantsInfo(selectedNode)
      this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
      // when removing a product
      if (selectedNode.level === this.productLevel) {
        // cannot remove the last assigned product or product in the tree
        if (this.$store.state.userData.userAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
          this.showLastEvent("You cannot remove your last assigned product, but you can remove the epics", WARNING)
          return
        }
      }
      // set remove mark in the database on the clicked item and descendants (if any)
      this.$store.dispatch('removeItemAndDescendents', { productId: this.$store.state.currentProductId, node: selectedNode, descendantsIds: descendantsInfo.ids })
      // remove any dependency references to/from outside the removed items
      const removed = window.slVueTree.correctDependencies(this.$store.state.currentProductId, descendantsInfo.ids)
      // create an entry for undoing the remove in a last-in first-out sequence
      const entry = {
        type: 'undoRemove',
        removedNode: selectedNode,
        isProductRemoved: selectedNode.level === this.productLevel,
        descendants: descendantsInfo.descendants,
        removedIntDependencies: removed.removedIntDependencies,
        removedIntConditions: removed.removedIntConditions,
        removedExtDependencies: removed.removedExtDependencies,
        removedExtConditions: removed.removedExtConditions
      }

      if (entry.isProductRemoved) {
        entry.removedProductRoles = this.$store.state.userData.myProductsRoles[selectedNode._id]
      }

      this.$store.state.changeHistory.unshift(entry)
      // before removal select the predecessor or successor of the removed node (sibling or parent)
      const prevNode = window.slVueTree.getPreviousNode(selectedNode.path)
      let nowSelectedNode = prevNode
      if (prevNode.level === this.databaseLevel) {
        // if a product is to be removed and the previous node is root, select the next product
        const nextProduct = window.slVueTree.getNextSibling(selectedNode.path)
        if (nextProduct === null) {
          // there is no next product; cannot remove the last product; note that this action is already blocked with a warming
          return
        }
        nowSelectedNode = nextProduct
      }
      this.$store.commit('updateNodeSelected', { newNode: nowSelectedNode, isSelected: true })
      this.$store.state.currentProductId = nowSelectedNode.productId
      // load the new selected item
      this.$store.dispatch('loadDoc', nowSelectedNode._id)
      // remove the node and its children
      window.slVueTree.remove([selectedNode])
    } else this.showLastEvent("Sorry, your assigned role(s) disallow you to remove this item", WARNING)
  },

  doChangeTeam() {
    this.contextNodeSelected.data.team = this.$store.state.userData.myTeam
    if (this.contextNodeSelected.level > this.featureLevel) {
      this.$store.dispatch('setTeam', [])
      this.showLastEvent(`The owning team of '${this.contextNodeSelected.title}' is changed to '${this.$store.state.userData.myTeam}'.`, INFO)
    } else {
      if (this.contextNodeSelected.level >= this.productLevel) {
        const descendantsInfo = window.slVueTree.getDescendantsInfo(this.contextNodeSelected)
        for (let desc of descendantsInfo.descendants) {
          desc.data.team = this.$store.state.userData.myTeam
        }
        this.$store.dispatch('setTeam', descendantsInfo.descendants)
        this.showLastEvent(`The owning team of '${this.contextNodeSelected.title}' and ${descendantsInfo.count} descendants is changed to '${this.$store.state.userData.myTeam}'.`, INFO)
      }
    }
  },

  moveItemToOtherProduct() {
    if (this.$store.state.moveOngoing) {
      const targetPosition = window.slVueTree.lastSelectCursorPosition
      // only allow to drop the node inside a new parent 1 level higher (lower value) than the source node
      if (targetPosition.nodeModel.level !== movedNode.level - 1) {
        this.showLastEvent('You can only drop inside a ' + this.getLevelText(movedNode.level - 1), WARNING)
        return
      }

      const savedInd = movedNode.ind

      // move the node to the new place and update the productId and parentId; movedNode is updated by this call
      const beforeDropStatus = window.slVueTree.moveNodes(targetPosition, [movedNode])

      // create an entry for undoing the move in a last-in first-out sequence
      const entry = {
        type: 'undoMove',
        beforeDropStatus
      }
      this.$store.state.changeHistory.unshift(entry)

      const moveInfo = {
        // this info is the same for all nodes moved
        type: 'move',
        sourceProductId: beforeDropStatus.sourceProductId,
        sourceParentId: beforeDropStatus.sourceParentId,
        sourceLevel: beforeDropStatus.sourceLevel,
        levelShift: beforeDropStatus.targetLevel - beforeDropStatus.sourceLevel,
        targetProductId: beforeDropStatus.targetProductId,
        targetParentId: beforeDropStatus.targetParentId,
        placement: targetPosition.placement,
        sourceProductTitle: beforeDropStatus.sourceProductTitle,
        sourceParentTitle: beforeDropStatus.sourceParentTitle,
        targetProductTitle: beforeDropStatus.targetProductTitle,
        targetParentTitle: beforeDropStatus.targetParentTitle
      }

      const oneItem = {
        id: movedNode._id,
        sourceInd: savedInd,
        newlyCalculatedPriority: movedNode.data.priority,
        targetInd: movedNode.ind,
        childCount: movedNode.children.length
      }

      // update the database
      this.$store.dispatch('updateMovedItemsBulk', { moveInfo, items: [oneItem] })
      this.$store.state.moveOngoing = false
    } else {
      this.$store.state.moveOngoing = true
      this.moveSourceProductId = this.$store.state.currentProductId
      movedNode = this.contextNodeSelected
    }
  },

  doAddToSprint() {
    window.assignToSprintRef.show()
  },

  getSprintName(id) {
    if (id === this.sprints.currentSprint.id) {
      return this.sprints.currentSprint.name
    } else return this.sprints.nextSprint.name
  },

  doRemoveFromSprint() {
    const currentId = this.$store.state.currentDoc._id
    const node = window.slVueTree.getNodeById(currentId)
    if (node === null) return

    const sprintId = node.sprintId
    let itemIds = []
    if (this.$store.state.currentDoc.level === PBILEVEL) {
      itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
    }
    if (this.$store.state.currentDoc.level === TASKLEVEL) {
      itemIds = [currentId]
    }
    // show children nodes
    window.slVueTree.getNodeById(currentId).isExpanded = true
    this.$store.dispatch('removeSprintIds', { itemIds, sprintName: this.getSprintName(sprintId) })
    // create an entry for undoing the remove-from-sprint in a last-in first-out sequence
    const entry = {
      type: 'undoRemoveSprintIds',
      itemIds,
      sprintId,
      sprintName: this.getSprintName(this.selectedSprint)
    }
    this.$store.state.changeHistory.unshift(entry)
  }
}

export default {
  extends: CommonContext,
  created,
  data,
  methods
}
