import { utilities } from '../../mixins/utilities.js'
import { mapGetters } from 'vuex'
import CommonContext from '../common_context.js'
import { eventBus } from '../../../main'

const WARNING = 1
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const REMOVED = 0
const ON_HOLD = 1
var movedNode = null

function created() {
  this.TOSPRINT = 11
  this.FROMSPRINT = 12
  this.TASKTOSPRINT = 13
  this.sprints = this.getCurrentAndNextSprint()
  eventBus.$on('contextMenu', (node) => {
    this.showContextMenu(node)
  })
}

function data() {
  return {
    isInSprint: false,
    canAssignSprint: false,
    canAssignSprintToTask: false
  }
}

const computed = {
  ...mapGetters([
    'myTeam'
  ]),
}

const methods = {
  showContextMenu(node) {
    if (this.$store.state.selectedNodes.length === 1) {
      this.contextOptionSelected = undefined
      this.listItemText = ''
      this.showAssistance = false
      this.disableOkButton = true
      // for access to the context menu all roles get an extra level, however they cannot change the item's properties on that level
      const allowExtraLevel = node.level < this.taskLevel
      if (this.haveAccessInTree(node.level, node.data.team, 'open the context menu', this.isPO, allowExtraLevel)) {
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
        this.allowRemoval = true
        this.isInSprint = node.data.sprintId && this.isCurrentOrNextPrintId(node.data.sprintId)
        this.canAssignSprint = this.calcCanAssignSprint(node)
        this.canAssignSprintToTask = this.calcCanAssignSprintToTask(node)
        if (this.$refs.d_contextMenuRef) {
          // prevent error message on recompile
          this.$refs.d_contextMenuRef.show()
        }
      } else this.allowRemoval = false
    } else this.showLastEvent(`Cannot apply context menu on multiple items. Choose one.`, WARNING)
  },

  /* Can only assign features and pbi's to a sprint; Cannot assign a feature without pbi's to a sprint; cannot assign Removed or On-hold items */
  calcCanAssignSprint(node) {
    if (node.level === this.featureLevel) {
      if (!node.children || node.children && node.children.length === 0) return false
    }
    return node.data.state !== REMOVED && node.data.state !== ON_HOLD &&
      (this.contextNodeLevel === this.featureLevel || this.contextNodeLevel === this.pbiLevel)
  },
  /* Can only assign tasks to a sprint if not in a sprint yet and not Removed or On-hold */
  calcCanAssignSprintToTask(node) {
    if (node.level === this.taskLevel) {
      return !node.data.sprintId && node.data.state !== REMOVED && node.data.state !== ON_HOLD
    }
  },

  showSelected(idx) {
    function checkNode(vm, selNode) {
      if (selNode._id === vm.dependentOnNode._id) {
        vm.contextWarning = "WARNING: Item cannot be dependent on it self"
        return false
      }
      const nodeWithDependencies = vm.dependentOnNode
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
        if (this.contextNodeLevel > this.featureLevel && this.contextParentTeam !== this.myTeam) {
          this.contextWarning = "WARNING: The team of parent " + this.contextParentType + " (" + this.contextParentTeam +
            ") and your team (" + this.myTeam + ") do not match. Read the assistance text."
        } else this.contextWarning = undefined
        this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.myTeam}'`
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
      case this.TOSPRINT:
        this.doAddToSprint()
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
        this.showLastEvent('You can only drop inside a ' + this.getLevelText(movedNode.level - 1), WARNING)
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

  doAddToSprint() {
    window.assignToSprintRef.show()
  },

  doAddTaskToSprint() {
    const currentId = this.$store.state.currentDoc._id
    const node = window.slVueTree.getNodeById(currentId)
    if (node === null) return
    const parent = window.slVueTree.getParentNode(node)
    const sprintId = parent.data.sprintId
    const sprintName = this.getSprintName(sprintId)
    this.$store.dispatch('addSprintIds', { parentId: currentId, itemIds: [currentId], sprintId, sprintName, createUndo: true })
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

    const sprintId = node.data.sprintId
    let itemIds = []
    if (this.$store.state.currentDoc.level === FEATURELEVEL) {
      itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
    }
    if (this.$store.state.currentDoc.level === PBILEVEL) {
      itemIds = [currentId].concat(window.slVueTree.getDescendantsInfoOnId(currentId).ids)
    }
    if (this.$store.state.currentDoc.level === TASKLEVEL) {
      itemIds = [currentId]
    }
    this.$store.dispatch('removeSprintIds', { parentId: currentId, sprintId, itemIds, sprintName: this.getSprintName(sprintId), createUndo: false })
  }
}

export default {
  mixins: [utilities],
  extends: CommonContext,
  created,
  data,
  computed,
  methods
}
