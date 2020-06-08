import AppHeader from '../../header/header.vue'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import CommonView from '../common_view.js'
import DcontextMenu from './d_context.vue'
import Filters from './d_filters.vue'
import Listings from './d_listings.vue'
import ToSprint from './d_tosprint.vue'
import { eventBus } from '../../../main'

const INFO = 0
const WARNING = 1
const FILTERBUTTONTEXT = 'Filter in tree view'
const thisView = 'detailProduct'
var returning = false

function beforeCreate() {
  this.$store.state.currentView = thisView
  this.$store.state.stopListenForChanges = false
  if (thisView !== this.$store.state.lastTreeView) {
    this.$store.state.treeNodes = []
    this.$store.state.changeHistory = []
    this.$store.state.loadproducts.docsCount = 0
    this.$store.state.loadproducts.insertedCount = 0
    this.$store.state.loadproducts.orphansCount = 0
    this.$store.state.loadproducts.orphansFound = { userData: null, orphans: [] }
    // reset filters and searches
    this.$store.state.filterText = FILTERBUTTONTEXT
    this.$store.state.filterOn = false
    this.$store.state.searchOn = false
    this.$store.state.findIdOn = false
    this.$store.dispatch('loadProductDetails')
  } else returning = true
}

function created() {
  // must reset the event listener to prevent duplication
  eventBus.$off('contextMenu')
  this.sprints = this.getCurrentAndNextSprint()
}

function mounted() {
  // expose instance to the global namespace
  window.slVueTree = this.$refs.slVueTree
  if (returning) {
    // window.slVueTree.getSelectedNodes()
    this.showLastEvent(`Returning to the Product details`, INFO)
  }
}

function data() {
  return {
    sprints: []
  }
}

const watch = {
  'selectedPbiType': function (val) {
    // prevent looping
    if (val !== this.$store.state.currentDoc.subtype) {
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the pbi type')) {
        const node = this.getNodeSelected
        const now = Date.now()
        this.$store.commit('updateNodeSelected', { subtype: val, lastChange: now })
        this.$store.dispatch('setSubType', {
          node,
          newSubType: val,
          timestamp: now,
          createUndo: true
        })
      }
    }
  },

  'doAddition': function (val) {
    if (val === true) {
      this.doAddition = false
      if (this.$store.state.selectedForView === 'attachments') {
        if (this.canUploadAttachments) {
          this.fileInfo = null
          this.$refs.uploadRef.show()
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to upload attachments", WARNING)
        }
      } else {
        if (this.canCreateComments) {
          if (this.$store.state.selectedForView === 'comments') {
            this.newComment = ''
            this.$refs.commentsEditorRef.show()
          }
          if (this.$store.state.selectedForView === 'history') {
            this.newHistory = ''
            this.$refs.historyEditorRef.show()
          }
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to create comments", WARNING)
        }
      }
    }
  },

  'startFiltering': function (val) {
    if (val === true) {
      this.startFiltering = false
      if (this.$store.state.selectedForView === 'comments') {
        this.$refs.commentsFilterRef.show()
        this.isCommentsFilterActive = true
      }
      if (this.$store.state.selectedForView === 'history') {
        this.$refs.historyFilterRef.show()
        this.isHistoryFilterActive = true
      }
    }
  }
}

const methods = {
  getItemInfo() {
    let txt = ''
    if (this.getCurrentItemLevel !== this.productLevel) {
      if (this.getCurrentItemLevel < this.taskLevel) {
        txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${this.$store.state.currentDoc.team}'`
      } else {
        txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by '${this.$store.state.currentDoc.taskOwner}' of team '${this.$store.state.currentDoc.team}'`
      }
      if (this.getItemSprintName) {
        txt += ` (Sprint '${this.getItemSprintName})'`
      }
    }
    return txt
  },

  /* Return true if in the current or next sprint */
  inSprint(node) {
    const sprintId = node.data.sprintId
    if (!sprintId) {
      // item not in any sprint
      return false
    }
    if (this.sprints === undefined) {
      // no sprint definitions available
      return false
    }
    if (this.getSprint(sprintId) === null) {
      // sprint not found
      return false
    }
    if (sprintId === this.sprints.currentSprint.id || sprintId === this.sprints.nextSprint.id) {
      return true
    }
    return false
  },

  getSprintText(node) {
    const sprintId = node.data.sprintId
    if (sprintId === this.sprints.currentSprint.id) {
      return 'current'
    }
    if (sprintId === this.sprints.nextSprint.id) {
      return 'next'
    }
  },

  onTreeIsLoaded() {
    window.slVueTree.setDescendentsReqArea()
    this.dependencyViolationsFound()
  },

  showReqAreaTitle(node) {
    if (node.data.reqarea) this.showLastEvent(`This item belongs to requirement area '${this.$store.state.reqAreaMapper[node.data.reqarea]}'`, INFO)
  },

  findItemOnId(shortId) {
    let node
    window.slVueTree.traverseModels((nodeModel) => {
      if (nodeModel.shortId === shortId) {
        node = nodeModel
        return false
      }
    })
    if (node) {
      this.$store.state.findIdOn = true
      // if the user clicked on a node of another product
      if (this.$store.state.currentProductId !== node.productId) {
        // clear any outstanding filters
        window.slVueTree.resetFilters('findItemOnId')
        // collapse the previously selected product
        window.slVueTree.collapseTree()
        // update current productId and title
        this.$store.state.currentProductId = node.productId
        this.$store.state.currentProductTitle = window.slVueTree.getProductTitle(node.productId)
      } else {
        // node on current product; collapse the currently selected product
        window.slVueTree.collapseTree()
      }

      this.showLastEvent(`The item is found in product '${this.$store.state.currentProductTitle}'`, INFO)
      // expand the newly selected product up to the found item
      window.slVueTree.showAndSelectItem(node)
      // select the node
      this.$store.commit('updateNodeSelected', { newNode: node })
      // load the document if not already in memory
      if (node._id !== this.$store.state.currentDoc._id) {
        this.$store.dispatch('loadDoc', node._id)
      }
    } else {
      // the node is not found in the current product selection; try to find it in the database
      this.$store.dispatch('loadItemByShortId', shortId)
    }
  },

  /* event handling */
  onNodesSelected(selNodes) {
    // update explicitly as the tree is not an input field receiving focus so that @blur on the editor is not emitted
    this.updateDescription(this.getpreviousNodeSelected)
    this.updateAcceptance(this.getpreviousNodeSelected)
    // if the root node is selected do nothing
    if (this.getNodeSelected._id !== 'root') {
      // if the user clicked on a node of another product
      if (this.$store.state.currentProductId !== this.getNodeSelected.productId) {
        // clear any outstanding filters
        window.slVueTree.resetFilters('onNodesSelected')
        // collapse the previously selected product
        window.slVueTree.collapseTree()
        // update current productId and title
        this.$store.state.currentProductId = this.getNodeSelected.productId
        this.$store.state.currentProductTitle = this.getNodeSelected.title
        // expand the newly selected product up to the feature level
        window.slVueTree.expandTree()
      }
    }
    // load the document if not already in memory
    if (this.getNodeSelected._id !== this.$store.state.currentDoc._id) {
      this.$store.dispatch('loadDoc', this.getNodeSelected._id)
    }
    const title = this.itemTitleTrunc(60, selNodes[0].title)
    let evt = ""
    if (selNodes.length === 1) {
      this.selectedNodesTitle = title
      evt = `${this.getLevelText(selNodes[0].level)} '${this.selectedNodesTitle}' is selected.`
    } else {
      this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
      evt = `${this.getLevelText(selNodes[0].level)} ${this.selectedNodesTitle} are selected.`
    }
    this.showLastEvent(evt, INFO)
  },

  /* Use this event to check if the drag is allowed. If not, issue a warning */
  beforeNodeDropped(draggingNodes, position, cancel) {
    /*
     * 1. Disallow drop on node were the user has no write authority and below a parent owned by another team
     * 2. Disallow drop when moving over more than 1 level.
     * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest level (tasklevel).
     * 4. Disallow the drop of multiple nodes within the range of the selected nodes.
     * precondition: the selected nodes have all the same parent (same level)
     */
    const parentNode = position.placement === 'inside' ? position.nodeModel : window.slVueTree.getParentNode(position.nodeModel)
    if (this.haveAccessInTree(position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
      const dropInd = position.nodeModel.ind
      let sourceMinInd = Number.MAX_SAFE_INTEGER
      let sourceMaxind = 0
      for (let d of draggingNodes) {
        if (d.ind < sourceMinInd) sourceMinInd = d.ind
        if (d.ind > sourceMaxind) sourceMaxind = d.ind
      }
      let checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
        const levelChange = Math.abs(targetLevel - sourceLevel)
        const failedCheck2 = levelChange > 1
        const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > this.taskLevel
        const failedCheck4 = levelChange === 0 && position.placement !== 'inside' && dropInd > sourceMinInd && dropInd < sourceMaxind
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        if (failedCheck4) this.showLastEvent('Cannot drop multiple nodes within the selected range', WARNING)
        return failedCheck2 || failedCheck3 || failedCheck4
      }
      const sourceLevel = draggingNodes[0].level
      let targetLevel = position.nodeModel.level
      // are we dropping 'inside' a node creating children to that node?
      if (position.placement === 'inside') targetLevel++
      if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
        cancel(true)
        return
      }
      // save the current index
      for (let n of draggingNodes) {
        n.savedInd = n.ind
      }
    } else cancel(true)
  },

  getPbiOptions() {
    this.selectedPbiType = this.$store.state.currentDoc.subtype
    let options = [
      { text: 'User story', value: 0 },
      { text: 'Spike', value: 1 },
      { text: 'Defect', value: 2 }
    ]
    return options
  }
}

const components = {
  'app-header': AppHeader,
  Multipane,
  MultipaneResizer,
  VueEditor,
  slVueTree,
  DcontextMenu,
  Filters,
  Listings,
  ToSprint
}

export default {
  extends: CommonView,
  beforeCreate,
  created,
  mounted,
  data,
  watch,
  methods,
  components
}
