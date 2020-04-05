import AppHeader from '../../header/header.vue'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import CommonView from '../common_view.js'
import context from './d_context.vue'
import filters from './d_filters.vue'
import listings from './d_listings.vue'
import tosprint from './d_tosprint.vue'

const INFO = 0
const WARNING = 1
const SHORTKEYLENGTH = 5
const FILTERBUTTONTEXT = 'Filter in tree view'

export default {
  extends: CommonView,

  beforeCreate() {
    this.$store.state.treeNodes = []
    this.$store.state.skipOnce = true
    this.$store.state.currentView = 'detailProduct'
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
    this.$store.dispatch('loadCurrentProduct')
  },

  mounted() {
    // expose instance to the global namespace
    window.slVueTree = this.$refs.slVueTree
    this.sprints = this.getCurrentAndNextSprint()

    function isEmpty(str) {
      return !str.replace(/\s+/, '').length;
    }

    function shortIdCheck() {
      const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz'
      if (this.shortId.length !== SHORTKEYLENGTH) return false

      for (let i = 0; i < this.shortId.length; i++) {
        if (!alphanum.includes(this.shortId.substring(i, i + 1).toLowerCase())) return false
      }
      return true
    }

    let el = document.getElementById("findItemOnId")
    // fire the search on short id on pressing enter in the select-on-Id input field (instead of submitting the form)
    el.addEventListener("keypress", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault()
        // check for valid input and convert to lowercase
        if (shortIdCheck) {
          window.slVueTree.resetFilters('findItemOnId')
          this.findItemOnId(this.shortId.toLowerCase())
        }
      }
    })
    el.addEventListener("input", () => {
      if (isEmpty(el.value)) {
        window.slVueTree.resetFindOnId('findItemOnId')
      }
    })

    let el2 = document.getElementById("searchInput")
    // fire the search button on pressing enter in the search input field (instead of submitting the form)
    el2.addEventListener("keypress", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault()
        this.searchInTitles()
      }
    })
    el2.addEventListener("input", () => {
      if (isEmpty(el2.value)) {
        window.slVueTree.resetFilters('searchInput')
      }
    })
  },

  data() {
    return {
      sprints: []
    }
  },

  watch: {
    'selectedPbiType': function (val) {
      // prevent looping
      if (val !== this.$store.state.currentDoc.subtype) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          const now = Date.now()
          this.$store.state.nodeSelected.data.subtype = val
          this.$store.state.nodeSelected.data.lastChange = now
          this.$store.dispatch('setSubType', {
            'newSubType': val,
            'timestamp': now
          })
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoSelectedPbiType',
            oldPbiType: this.$store.state.currentDoc.subtype
          }
          this.$store.state.changeHistory.unshift(entry)
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you change the pbi type", WARNING)
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
  },

  methods: {
    inSprint(node) {
      const sprintId = node.sprintId
      if (!sprintId) {
        // item not in any sprint
        return false
      }
      if (this.sprints === undefined) {
        // no sprint definitions available
        return false
      }
      const itemSprint = this.getSprint(sprintId)
      if (itemSprint === null) {
        // sprint not found
        return false
      }
      if (sprintId === this.sprints.currentSprint.id || sprintId === this.sprints.nextSprint.id) {
        return true
      }
      return false
    },

    getSprintTxt(node) {
      const sprintId = node.sprintId
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
        // update the selected node
        this.$store.state.nodeSelected = node
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
    onNodeSelect(selNodes) {
      // update explicitly as the tree is not an input field receiving focus so that @blur on the editor is not emitted
      this.updateDescription()
      // both an update of the description and the acceptance criteria should NOT happen
      this.updateAcceptance()

      if (!window.slVueTree.haveSameParent(selNodes)) {
        this.showLastEvent('You can only select nodes with the same parent.', WARNING)
        return
      }

      this.$store.state.numberOfNodesSelected = selNodes.length
      // update the first (highest in hierarchie) selected node
      this.$store.state.nodeSelected = selNodes[0]
      // if the root node is selected do nothing
      if (this.$store.state.nodeSelected._id !== 'root') {
        // if the user clicked on a node of another product
        if (this.$store.state.currentProductId !== this.$store.state.nodeSelected.productId) {
          // clear any outstanding filters
          window.slVueTree.resetFilters('onNodeSelect')
          // collapse the previously selected product
          window.slVueTree.collapseTree()
          // update current productId and title
          this.$store.state.currentProductId = this.$store.state.nodeSelected.productId
          this.$store.state.currentProductTitle = this.$store.state.nodeSelected.title
          // expand the newly selected product up to the feature level
          window.slVueTree.expandTree()
        }
      }
      // load the document if not already in memory
      if (this.$store.state.nodeSelected._id !== this.$store.state.currentDoc._id) {
        this.$store.dispatch('loadDoc', this.$store.state.nodeSelected._id)
      }
      const warnMsg = !this.haveWritePermission[selNodes[0].level] ? " You only have READ permission" : ""
      const title = this.itemTitleTrunc(60, selNodes[0].title)
      let evt = ""
      if (selNodes.length === 1) {
        this.selectedNodesTitle = title
        evt = `${this.getLevelText(selNodes[0].level)} '${this.selectedNodesTitle}' is selected.` + warnMsg
      } else {
        this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
        evt = `${this.getLevelText(selNodes[0].level)} ${this.selectedNodesTitle} are selected.` + warnMsg
      }
      this.showLastEvent(evt, warnMsg === "" ? INFO : WARNING)
    },

    /* Use this event to check if the drag is allowed. If not, issue a warning */
    beforeNodeDropped(draggingNodes, position, cancel) {
      /*
       * 1. Disallow drop on node were the user has no write authority
       * 2. Disallow drop when moving over more than 1 level.
       * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest level (tasklevel).
       * precondition: the selected nodes have all the same parent (same level)
       */
      let checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
        const levelChange = Math.abs(targetLevel - sourceLevel)
        const failedCheck1 = !this.haveWritePermission[position.nodeModel.level]
        const failedCheck2 = levelChange > 1
        const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > this.taskLevel
        if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        return failedCheck1 || failedCheck2 || failedCheck3
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
  },

  components: {
    'app-header': AppHeader,
    Multipane,
    MultipaneResizer,
    VueEditor,
    slVueTree,
    context,
    filters,
    listings,
    tosprint
  }
}
