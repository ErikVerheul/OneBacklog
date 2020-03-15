import appHeader from '../../header/header.vue'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import CommonView from '../common_view.js'
import context from './c_context.vue'
import filters from './c_filters.vue'
import listings from './c_listings.vue'

const INFO = 0
const WARNING = 1
const SHORTKEYLENGTH = 5
const ALLPRODUCTS = true
const FILTERBUTTONTEXT = 'Filter in tree view'

export default {

  beforeCreate() {
    this.$store.state.treeNodes = []
    this.$store.state.skipOnce = true
    this.$store.state.currentView = 'reqarea'
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
    this.$store.dispatch('getAllItems')
  },

  extends: CommonView,

  mounted() {
    // expose instance to the global namespace
    window.slVueTree = this.$refs.slVueTree

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
          window.slVueTree.resetFilters('findItemOnId', ALLPRODUCTS)
          this.findItemOnId(this.shortId.toLowerCase())
        }
      }
    })
    el.addEventListener("input", () => {
      if (isEmpty(el.value)) {
        window.slVueTree.resetFindOnId('findItemOnId', ALLPRODUCTS)
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
        window.slVueTree.resetFilters('searchInput', ALLPRODUCTS)
      }
    })
  },

  data() {
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
  },

  computed: {
    isReqAreaItem() {
      return this.$store.state.currentDoc.productId === this.areaProductId
    },

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
  },

  watch: {
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
          // update current productId and title
          this.$store.state.currentProductId = this.$store.state.nodeSelected.productId
          this.$store.state.currentProductTitle = this.$store.state.nodeSelected.title
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
       * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest permitted level.
       * 4. The requirement area nodes cannot be moved from their parent or inside each other
       * precondition: the selected nodes have all the same parent (same level)
       */
      let checkDropNotAllowed = (node) => {
        const sourceLevel = draggingNodes[0].level
        let targetLevel = position.nodeModel.level
        // are we dropping 'inside' a node creating children to that node?
        if (position.placement === 'inside') targetLevel++
        const levelChange = Math.abs(targetLevel - sourceLevel)
        const failedCheck1 = !this.haveWritePermission[position.nodeModel.level]
        const failedCheck2 = levelChange > 1
        const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > this.pbiLevel
        const failedCheck4 = node.parentId === this.areaProductId && position.nodeModel.parentId !== this.areaProductId || position.placement === 'inside'
        if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        return failedCheck1 || failedCheck2 || failedCheck3 || failedCheck4
      }

      if (checkDropNotAllowed(draggingNodes[0])) {
        cancel(true)
        return
      }
      // save the current index and parentId
      for (let n of draggingNodes) {
        n.savedInd = n.ind
        n.savedParentId = n.parentId
      }
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
        this.$store.state.nodeSelected.data.reqAreaItemcolor = this.$store.state.currentDoc.color
        this.createColorMapper()
        this.$store.dispatch('updateColorDb', this.$store.state.currentDoc.color)
      }
    },

    setUserColor() {
      this.$store.state.nodeSelected.data.reqAreaItemcolor = this.userReqAreaItemcolor
      this.createColorMapper()
      this.$store.dispatch('updateColorDb', this.userReqAreaItemcolor)
    },

    setReqArea(reqarea) {
      if (this.$store.getters.isAPO) {
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
      const oldParentReqArea = this.$store.state.nodeSelected.data.reqarea
      const newReqAreaId = this.selReqAreaId
      this.$store.state.nodeSelected.data.reqarea = newReqAreaId
      this.$store.state.currentDoc.reqarea = newReqAreaId
      // set reqarea for the child nodes
      const childNodes = window.slVueTree.getChildNodesOfParent(this.$store.state.currentDoc._id)
      for (let c of childNodes) {
        const currentReqArea = c.data.reqarea
        if (newReqAreaId !== null) {
          // set: set for items which have no req area set yet
          if (!currentReqArea || currentReqArea === oldParentReqArea) {
            c.data.reqarea = newReqAreaId
          }
        } else {
          // remove: if reqarea was set and equal to old req area of the parent delete it
          if (currentReqArea && currentReqArea === oldParentReqArea) {
            c.data.reqarea = null
          }
        }
      }
      // update the db
      const childIds = window.slVueTree.getChildIdsOfParent(this.$store.state.currentDoc._id)
      this.$store.dispatch('updateReqArea', { reqarea: this.selReqAreaId, childIds })
    }
  },

  components: {
    'app-header': appHeader,
    Multipane,
    MultipaneResizer,
    VueEditor,
    slVueTree,
    context,
    filters,
    listings
  }
}