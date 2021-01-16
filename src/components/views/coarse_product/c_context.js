import CommonContext from '../common_context.js'
import { eventBus } from '../../../main'

const WARNING = 1

function created () {
  eventBus.$on('context-menu', (node) => {
    this.showContextMenu(node)
  })
}

const methods = {
  showContextMenu (node) {
    if (this.$store.state.selectedNodes.length === 1) {
			// select and load the item
			this.$store.commit('updateNodesAndCurrentDoc', { selectNode: node })
			const fromContextMenu = true
			window.slVueTree.emitSelect(fromContextMenu)
      this.contextOptionSelected = undefined
      this.listItemText = ''
      this.showAssistance = false
      this.disableOkButton = true
      // for access to the context menu all roles get an extra level, however they cannot change the item's properties on that level
      const allowExtraLevel = node.level < this.taskLevel
      if (this.haveAccessInTree(node.level, '*', 'open the context menu', allowExtraLevel)) {
        const parentNode = window.slVueTree.getParentNode(node)
        this.contextNodeSelected = node
        this.contextParentTeam = parentNode.data.team
        this.contextParentType = this.getLevelText(parentNode.level)
        this.contextNodeTitle = node.title
        this.contextNodeLevel = node.level
        this.contextNodeType = this.getLevelText(node.level)
				this.contextChildType = this.getLevelText(node.level + 1)
				this.contextNodeDescendants = window.slVueTree.getDescendantsInfo(node)
        this.contextNodeTeam = node.data.team
        this.hasDependencies = node.dependencies && node.dependencies.length > 0
        this.hasConditions = node.conditionalFor && node.conditionalFor.length > 0
        this.allowRemoval = true
        if (this.$refs.c_contextMenuRef) {
          // prevent error message on recompile
          this.$refs.c_contextMenuRef.show()
        }
      } else this.allowRemoval = this.isReqAreaItem
    } else this.showLastEvent('Cannot apply context menu on multiple items. Choose one', WARNING)
  },

  showSelected (idx) {
    function checkNode (vm, selNode) {
      if (selNode._id === vm.dependentOnNode._id) {
        vm.contextWarning = 'WARNING: Item cannot be dependent on it self'
        return false
			}
			if (selNode.productId !== vm.dependentOnNode.productId) {
				vm.contextWarning = 'WARNING: Cannot create a dependency between items in different products'
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
          this.listItemText = 'WARNING: this item has dependencies on other items. Remove the dependency/dependencies first.'
          this.disableOkButton = true
        } else if (this.hasConditions) {
          this.listItemText = 'WARNING: this item is conditional for other items. Remove the condition(s) first'
          this.disableOkButton = true
        } else this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendants.count} descendants`
				break
			case this.ASIGNTOMYTEAM:
				this.assistanceText = this.$store.state.help.help.team
				this.contextWarning = `Descendants of this ${this.contextNodeType} might be assigned to another team. To be save use the 'Product details' view to assign your team to this ${this.contextNodeType}`
				this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.myTeam}'`
				break
      case this.REMOVEREQAREA:
        this.assistanceText = this.$store.state.help.help.remove
        this.listItemText = 'Remove this requirement area'
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

  procSelected () {
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
      case this.REMOVEITEM:
      case this.REMOVEREQAREA:
        this.doRemove()
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
    }
  }
}

export default {
  extends: CommonContext,
  created,
  methods
}
