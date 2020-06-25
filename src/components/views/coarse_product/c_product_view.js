import AppHeader from '../../header/header.vue'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import CommonView from '../common_view.js'
import CcontextMenu from './c_context.vue'
import Filters from './c_filters.vue'
import Listings from './c_listings.vue'
import { eventBus } from '../../../main'
import { mapGetters } from 'vuex'

const INFO = 0
const WARNING = 1
const ALLPRODUCTS = true
const FILTERBUTTONTEXT = 'Filter in tree view'
const thisView = 'coarseProduct'
var returning = false

function beforeCreate() {
  this.$store.state.currentView = thisView
  if (thisView !== this.$store.state.lastTreeView) {
    this.$store.state.treeNodes = []
    this.$store.state.changeHistory = []
    this.$store.state.loadreqareas.docsCount = 0
    this.$store.state.loadreqareas.insertedCount = 0
    this.$store.state.loadreqareas.orphansCount = 0
    this.$store.state.loadreqareas.orphansFound = { userData: null, orphans: [] }
    // reset filters and searches
    this.$store.state.filterText = FILTERBUTTONTEXT
    this.$store.state.filterOn = false
    this.$store.state.searchOn = false
    this.$store.state.findIdOn = false
    this.$store.dispatch('loadOverview')
  } else returning = true
}

function created() {
  // must reset the event listener to prevent duplicated
  eventBus.$off('contextMenu')
}

function mounted() {
  // expose instance to the global namespace
  window.slVueTree = this.$refs.slVueTree
  if (returning) {
    // window.slVueTree.getSelectedNodes()
    this.showLastEvent(`Returning to the Products overview`, INFO)
  }
}

function data() {
  return {
    colorOptions: [
      { color: 'red', hexCode: '#FF0000' },
      { color: 'yellow', hexCode: '#FFFF00' },
      { color: 'green', hexCode: '#008000' },
      { color: 'blue', hexCode: '#0000ff' },
      { color: 'other color', hexCode: 'user choice' }
    ],
    colorSelectShow: false,
    userReqAreaItemcolor: '#567cd6',
    setReqAreaShow: false,
    selReqAreaId: undefined
  }
}

const computed = {
  ...mapGetters([
    'isReqAreaItem'
  ]),

  /*
  * Check for a valid color hex code:
  * #          -> a hash
  * [0-9A-F]   -> any integer from 0 to 9 and any letter from A to F
  * {6}        -> the previous group appears exactly 6 times
  * $          -> match end
  * i          -> ignore case
  */
  colorState() {
    return /^#[0-9A-F]{6}$/i.test(this.userReqAreaItemcolor)
  }
}

const watch = {
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
      txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${this.$store.state.currentDoc.team}'`
    }
    return txt
  },

  onTreeIsLoaded() {
    this.dependencyViolationsFound()
    this.createColorMapper()
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
      window.slVueTree.collapseTree(ALLPRODUCTS)

      this.showLastEvent(`The item is found in product '${this.$store.state.currentProductTitle}'`, INFO)
      // expand the newly selected product up to the found item
      window.slVueTree.showAndSelectItem(node)
      // load the document if not already in memory
      if (node._id !== this.$store.state.currentDoc._id) {
        // select the node after loading the document
        this.$store.dispatch('loadDoc', { id: node._id, onSuccessCallback: () => { this.$store.commit('updateNodesAndCurrentDoc', { selectNode: node }) } })
      }
    } else {
      // the node is not found in the current product selection; try to find it in the database
      this.$store.dispatch('loadItemByShortId', shortId)
    }
  },

  /* event handling */
  onNodesSelected() {
    const selNodes = this.$store.state.selectedNodes
    // update explicitly as the tree is not an input field receiving focus so that @blur on the editor is not emitted
    this.updateDescription(this.getpreviousNodeSelected)
    this.updateAcceptance(this.getpreviousNodeSelected)
    // if the user clicked on a node of another product (not root)
    if (this.getNodeSelected._id !== 'root' && this.$store.state.currentProductId !== this.getNodeSelected.productId) {
      // update current productId and title
      this.$store.state.currentProductId = this.getNodeSelected.productId
      this.$store.state.currentProductTitle = this.getNodeSelected.title
    }
    // load the document if not already in memory
    if (this.getNodeSelected._id !== this.$store.state.currentDoc._id) {
      this.$store.dispatch('loadDoc', { id: this.getNodeSelected._id })
    }
    const title = this.itemTitleTrunc(60, this.getNodeSelected.title)
    let evt = ""
    if (selNodes.length === 1) {
      this.selectedNodesTitle = title
      evt = `${this.getLevelText(this.getNodeSelected.level)} '${this.selectedNodesTitle}' is selected.`
      if (this.getNodeSelected.data.reqarea) evt += ` The item is member of requirement area '${this.$store.state.reqAreaMapper[this.getNodeSelected.data.reqarea]}'`
    } else {
      this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
      evt = `${this.getLevelText(this.getNodeSelected.level)} ${this.selectedNodesTitle} are selected.`
    }
    this.showLastEvent(evt, INFO)
  },

  /* Use this event to check if the drag is allowed. If not, issue a warning */
  beforeNodeDropped(draggingNodes, position, cancel) {
    /*
     * 1. Disallow drop on node were the user has no write authority and below a parent owned by another team
     * 2. Disallow drop when moving over more than 1 level
     * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest permitted level
     * 4. Disallow the drop of multiple nodes within the range of the selected nodes.
     * 5. The requirement area nodes cannot be moved from their parent or inside each other (silent cancel)
     * 6. Cannot move regular items into the 'Requirement areas overview' dummy product (silent cancel)
     * precondition: the selected nodes have all the same parent (same level)
     */
    const parentNode = position.placement === 'inside' ? position.nodeModel : window.slVueTree.getParentNode(position.nodeModel)
    if (this.haveAccessInTree(position.nodeModel.level, parentNode.data.team, 'drop on this position')) {

      let checkDropNotAllowed = (node) => {
        const sourceProductId = draggingNodes[0].productId
        const targetProductId = position.nodeModel.productId
        const sourceLevel = draggingNodes[0].level
        let targetLevel = position.nodeModel.level
        // are we dropping 'inside' a node creating children to that node?
        if (position.placement === 'inside') targetLevel++
        const levelChange = Math.abs(targetLevel - sourceLevel)
        const failedCheck2 = levelChange > 1
        const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > this.pbiLevel
        const dropInd = position.nodeModel.ind
        let sourceMinInd = Number.MAX_SAFE_INTEGER
        let sourceMaxind = 0
        for (let d of draggingNodes) {
          if (d.ind < sourceMinInd) sourceMinInd = d.ind
          if (d.ind > sourceMaxind) sourceMaxind = d.ind
        }
        const failedCheck4 = levelChange === 0 && position.placement !== 'inside' && dropInd > sourceMinInd && dropInd < sourceMaxind
        const failedCheck5 = node.parentId === this.areaProductId && (position.nodeModel.parentId !== this.areaProductId || position.placement === 'inside')
        const failedCheck6 = targetProductId === this.areaProductId && sourceProductId !== this.areaProductId
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        if (failedCheck4) this.showLastEvent('Cannot drop multiple nodes within the selected range', WARNING)
        return failedCheck2 || failedCheck3 || failedCheck4 || failedCheck5 || failedCheck6
      }

      if (checkDropNotAllowed(draggingNodes[0])) {
        cancel(true)
        return
      }
    } else cancel(true)
  },

  /* Create a new object to maintain reactivity */
  createColorMapper() {
    const currReqAreaNodes = window.slVueTree.getReqAreaNodes()
    const newColorMapper = {}
    for (let nm of currReqAreaNodes) {
      newColorMapper[nm._id] = { reqAreaItemcolor: nm.data.reqAreaItemcolor }
    }
    this.$store.state.colorMapper = newColorMapper
  },

  updateColor() {
    if (this.$store.state.currentDoc.color === 'user choice') {
      this.$store.state.currentDoc.color = '#567cd6'
      this.colorSelectShow = true
    } else {
      this.$store.dispatch('updateColorDb', { newColor: this.$store.state.currentDoc.color, timestamp: Date.now(), recreateColorMapper: () => { this.createColorMapper() } })
    }
  },

  setUserColor() {
    this.$store.dispatch('updateColorDb', { newColor: this.userReqAreaItemcolor, timestamp: Date.now(), recreateColorMapper: () => { this.createColorMapper() } })
  },

  setReqArea(reqarea) {
    if (this.isAPO) {
      this.selReqAreaId = reqarea
      // set the req area options
      const currReqAreaNodes = window.slVueTree.getReqAreaNodes()
      this.$store.state.reqAreaOptions = []
      for (let nm of currReqAreaNodes) {
        this.$store.state.reqAreaOptions.push({ id: nm._id, title: nm.title })
      }
      if (this.selReqAreaId !== null) this.$store.state.reqAreaOptions.push({ id: null, title: 'Remove item from requirement areas' })
      this.setReqAreaShow = true
    } else this.showLastEvent("Sorry, your assigned role(s) disallow you to assing requirement areas", WARNING)
  },

  /*
  * Update the req area of the item (null for no req area set)
  * If the item is an epic also assign this req area to the children which have no req area assigned yet / when removing do the reverse
  */
  doSetReqArea() {
    this.$store.dispatch('updateReqArea', { node: this.getNodeSelected, reqarea: this.selReqAreaId, timestamp: Date.now() })
  }
}

const components = {
  'app-header': AppHeader,
  Multipane,
  MultipaneResizer,
  VueEditor,
  slVueTree,
  CcontextMenu,
  Filters,
  Listings
}

export default {
  extends: CommonView,
  beforeCreate,
  created,
  mounted,
  data,
  computed,
  watch,
  methods,
  components
}
