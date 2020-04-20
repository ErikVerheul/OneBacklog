import CommonContext from '../common_context.js'

const INFO = 0
const WARNING = 1
const AREA_PRODUCTID = '0'

const methods = {
  showContextMenu(node) {
    this.contextOptionSelected = undefined
    this.listItemText = ''
    this.showAssistance = false
    this.disableOkButton = true
    // user must have write access on this level && user cannot remove the database && only one node can be selected
    // for access to the context menu all roles get an extra level, however they cannot change the item's properties
    const extraLevel = node.level < this.pbiLevel ? node.level + 1 : node.level
    if (this.isReqAreaItem || this.haveWritePermission[extraLevel] &&
      node.level > this.databaseLevel && this.$store.state.numberOfNodesSelected === 1) {
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
      this.allowRemoval = this.isReqAreaItem || this.haveWritePermission[node.level]
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
      case this.REMOVEITEM:
        this.doRemove()
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
      // when removing a requirement area, items assigned to this area should be updated
      if (selectedNode.productId === AREA_PRODUCTID) {
        window.slVueTree.resetReqArea(selectedNode._id)
      }
      // set remove mark in the database on the clicked item and descendants (if any)
      this.$store.dispatch('removeItemAndDescendents', { productId: this.$store.state.currentProductId, node: selectedNode, descendantsIds: descendantsInfo.ids })
      // remove any dependency references to/from outside the removed items; note: these cannot be undone
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
}

export default {
  extends: CommonContext,
  methods
}
