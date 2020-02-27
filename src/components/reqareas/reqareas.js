import Header from '../header/header.vue'
import { mapGetters } from 'vuex'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import { utilities } from '../mixins/utilities.js'
import context from './apo_context.vue'
import filters from './apo_filters.vue'
import listings from './apo_listings.vue'

const INFO = 0
const WARNING = 1
const SHORTKEYLENGTH = 5
const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const REMOVED = 0
const NEW = 0
const READY = 1
const DONE = 4
const ALLPRODUCTS = true
var violationsWereFound = false

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
    this.$store.dispatch('getAllItems')
  },

  mixins: [utilities],

  created() {
    this.DATABASELEVEL = 1
    this.PRODUCTLEVEL = 2
    this.EPICLEVEL = 3
    this.FEATURELEVEL = 4
    this.PBILEVEL = 5
    this.AREA_PRODUCTID = '0'
  },

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

  updated() {
    // refresh to obtain reactivity
    this.refreshColorMapper()
  },

  data() {
    return {
      userStorySubtype: 0,
      spikeSubtype: 1,
      defectSubtype: 2,
      shortId: "",
      newDescription: '',
      newAcceptance: '',
      selectedNodesTitle: '',
      editorToolbar: [
        [{ header: [false, 1, 2, 3, 4, 5, 6] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
        ['link', 'image', 'code-block']
      ],
      // set to an invalid value; must be updated before use
      selectedPbiType: -1,
      // comments, history and attachments
      doAddition: false,
      startFiltering: false,
      isCommentsFilterActive: false,
      isHistoryFilterActive: false,
      newComment: "",
      fileInfo: null,
      newHistory: "",
      filterForCommentPrep: "",
      filterForHistoryPrep: "",
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
      selReqAreaId: undefined,
      reqAreaOptions: []
    }
  },

  beforeUpdate() {
    // this.checkForDependencyViolations()
  },

  computed: {
    ...mapGetters([
      // from store.js
      'isFollower',
      'canCreateComments',
      'canUploadAttachments',
      'getCurrentItemLevel',
      'getCurrentItemTsSize',
      // from startup.js
      'haveWritePermission'
    ]),

    isReqAreaItem() {
      return this.$store.state.currentDoc.productId === this.AREA_PRODUCTID
    },

    welcomeMessage() {
      const msg_1 = `Welcome '${this.$store.state.userData.user}'.`
      let msg_2
      if (this.$store.state.userData.myTeam === 'not assigned yet') {
        msg_2 = ' You are not a team member.'
      } else msg_2 = ` You are member of team '${this.$store.state.userData.myTeam}'.`
      let msg_3
      if (this.$store.state.userData.userAssignedProductIds.length === 1)
        msg_3 = ` Your current database is set to '${this.$store.state.userData.currentDb}. You have 1 product.`
      else
        msg_3 = ` Your current database is set to '${this.$store.state.userData.currentDb}'.` +
          ` You selected ${this.$store.state.userData.myProductSubscriptions.length} from ${this.$store.state.userData.userAssignedProductIds.length} products.`
      return msg_1 + msg_2 + msg_3
    },

    squareText() {
      if (this.$store.state.online) {
        if (!this.$store.state.skipOnce) this.showLastEvent("You are online again", INFO)
        this.$store.state.skipOnce = false
        return 'sync'
      } else {
        this.showLastEvent("You are offline. Restore the connection or wait to continue", WARNING)
        return 'offline'
      }
    },

    squareColor() {
      return this.$store.state.online ? this.$store.state.eventSyncColor : '#ff0000'
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
    },

    subsribeTitle() {
      if (this.isFollower) {
        return "Unsubscribe to change notices"
      } else return "Subscribe to change notices"
    },

    invalidFileName() {
      return this.fileInfo === null || this.fileInfo.name === ''
    },

    uploadToLarge() {
      return this.fileInfo !== null && this.fileInfo.size > MAXUPLOADSIZE
    },

    description: {
      get() {
        return this.$store.state.currentDoc.description
      },
      set(newDescription) {
        this.newDescription = newDescription
      }
    },

    acceptanceCriteria: {
      get() {
        return this.$store.state.currentDoc.acceptanceCriteria
      },
      set(newAcceptanceCriteria) {
        this.newAcceptance = newAcceptanceCriteria
      }
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
    checkForDependencyViolations() {
      const violations = window.slVueTree.findDependencyViolations()
      if (violations.length > 0) {
        violationsWereFound = true
        this.showLastEvent('This product has priority inconsistencies. Undo the change or remove the dependency.', WARNING)
        for (let v of violations) {
          window.slVueTree.showDependencyViolations(v)
        }
      } else {
        if (violationsWereFound) this.clearLastEvent()
        violationsWereFound = false
      }
    },

    stopFiltering() {
      if (this.$store.state.selectedForView === 'comments') {
        this.filterForCommentPrep = ''
        this.filterComments()
        this.isCommentsFilterActive = false
      }
      if (this.$store.state.selectedForView === 'history') {
        this.filterForHistoryPrep = ''
        this.filterHistory()
        this.isHistoryFilterActive = false
      }
    },

    resetFindId() {
      window.slVueTree.resetFindOnId('resetFindId', ALLPRODUCTS)
    },

    resetSearchTitles() {
      window.slVueTree.resetFilters('resetSearchTitles', ALLPRODUCTS)
    },

    patchTitle(node) {
      let patch = ''
      if (node.dependencies && node.dependencies.length > 0) patch = '▼ '
      if (node.conditionalFor && node.conditionalFor.length > 0) patch = patch + '▲ '
      if (node.markViolation) patch = patch + '↑ '
      return patch + node.title
    },

    /* Return true if the state of the node has changed in the last hour */
    hasNodeMoved(node) {
      return node.data.lastPositionChange ? Date.now() - node.data.lastPositionChange < HOURINMILIS : false
    },

    hasNewState(node) {
      return node.data.lastStateChange ? Date.now() - node.data.lastStateChange < HOURINMILIS : false
    },

    hasContentChanged(node) {
      return node.data.lastContentChange ? Date.now() - node.data.lastContentChange < HOURINMILIS : false
    },

    hasNewComment(node) {
      return node.data.lastCommentAddition ? Date.now() - node.data.lastCommentAddition < HOURINMILIS : false
    },

    isAttachmentAdded(node) {
      return node.data.lastAttachmentAddition ? Date.now() - node.data.lastAttachmentAddition < HOURINMILIS : false
    },

    hasCommentToHistory(node) {
      return node.data.lastCommentToHistory ? Date.now() - node.data.lastCommentToHistory < HOURINMILIS : false
    },

    onSetMyFilters() {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters('onSetMyFilters', ALLPRODUCTS)
        window.slVueTree.resetFindOnId('onSetMyFilters', ALLPRODUCTS)
      } else {
        window.myFilters.show()
      }
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

    searchInTitles() {
      // cannot search on empty string
      if (this.$store.state.keyword === '') return

      // reset the other selections first
      window.slVueTree.resetFilters('searchInTitles', ALLPRODUCTS)
      window.slVueTree.resetFindOnId('searchInTitles', ALLPRODUCTS)
      let count = 0
      window.slVueTree.traverseModels((nodeModel) => {
        if (nodeModel.title.toLowerCase().includes(this.$store.state.keyword.toLowerCase())) {
          window.slVueTree.showPathToNode(nodeModel)
          // mark if selected
          nodeModel.isHighlighted = true
          count++
        } else {
          nodeModel.savedIsExpanded = nodeModel.isExpanded
          nodeModel.isExpanded = false
          nodeModel.savedDoShow = nodeModel.doShow
          // do not block expansion of the found nodes
          const parentNode = window.slVueTree.getParentNode(nodeModel)
          if (!parentNode.isHighlighted) {
            nodeModel.savedDoShow = nodeModel.doShow
            nodeModel.doShow = false
          }
        }
      }, window.slVueTree.getProductModels())
      // show event
      let s
      count === 1 ? s = 'title matches' : s = 'titles match'
      this.showLastEvent(`${count} item ${s} your search in product '${this.$store.state.currentProductTitle}'`, INFO)
      this.$store.state.searchOn = true
      // window.slVueTree.showVisibility('searchInTitles', FEATURELEVEL)
    },

    onUndoEvent() {
      const entry = this.$store.state.changeHistory.splice(0, 1)[0]
      switch (entry.type) {
        case 'undoSelectedPbiType':
          this.$store.state.nodeSelected.data.subtype = entry.oldPbiType
          this.$store.dispatch('setSubType', { 'newSubType': entry.oldPbiType, 'timestamp': Date.now() })
          this.showLastEvent('Change of item type is undone', INFO)
          break
        case 'undoDescriptionChange':
          this.$store.state.currentDoc.description = entry.oldDescription
          this.$store.dispatch('saveDescription', { 'newDescription': entry.oldDescription, 'timestamp': Date.now() })
          this.showLastEvent('Change of item description type is undone', INFO)
          break
        case 'undoAcceptanceChange':
          this.$store.state.currentDoc.acceptanceCriteria = entry.oldAcceptance
          this.$store.dispatch('saveAcceptance', { 'newAcceptance': entry.oldAcceptance, 'timestamp': Date.now() })
          this.showLastEvent('Change of item acceptance criteria type is undone', INFO)
          break
        case 'undoTsSizeChange':
          this.$store.dispatch('setSize', { 'newSizeIdx': entry.oldTsSize, 'timestamp': Date.now() })
          this.showLastEvent('Change of item T-shirt size is undone', INFO)
          break
        case 'undoStoryPointsChange':
          this.$store.dispatch('setStoryPoints', { 'newPoints': entry.oldStoryPoints, 'timestamp': Date.now() })
          this.showLastEvent('Change of item story points is undone', INFO)
          break
        case 'undoPersonHoursChange':
          this.$store.dispatch('setPersonHours', { 'newHrs': entry.oldPersonHours, 'timestamp': Date.now() })
          this.showLastEvent('Change of spike person hours is undone', INFO)
          break
        case 'undoStateChange':
          entry.node.data.state = entry.oldState
          // reset inconsistency mark if set
          entry.node.data.inconsistentState = false
          this.$store.dispatch('setState', { 'newState': entry.oldState, 'team': entry.node.data.team, 'timestamp': Date.now() })
          this.showLastEvent('Change of item state is undone', INFO)
          break
        case 'undoTitleChange':
          this.$store.state.nodeSelected.title = entry.oldTitle
          this.$store.dispatch('setDocTitle', { 'newTitle': entry.oldTitle, 'timestamp': Date.now() })
          this.showLastEvent('Change of item title is undone', INFO)
          break
        case 'undoNewNode':
          if (window.slVueTree.remove([entry.newNode])) {
            this.$store.dispatch('removeItemAndDescendents', { 'node': entry.newNode, 'descendantsIds': [] })
            this.showLastEvent('Item addition is undone', INFO)
          } else this.showLastEvent('Item was already removed', INFO)
          break
        case 'undoMove':
          window.slVueTree.moveBack(entry)
          // update the nodes in the database
          var payloadArray = []
          for (let n of entry.beforeDropStatus.nodes) {
            n.data.lastPositionChange = 0
            const descendantsInfo = window.slVueTree.getDescendantsInfo(n)
            const payloadItem = {
              '_id': n._id,
              'type': 'undoMove',
              'newLevel': n.level,
              'newParentId': n.parentId,
              'productId': n.productId,
              'newPriority': n.data.priority,
              'descendants': descendantsInfo.descendants
            }
            payloadArray.push(payloadItem)
          }
          this.$store.dispatch('updateMovedItemsBulk', { items: payloadArray })
          this.showLastEvent('Item(s) move undone', INFO)
          break
        case 'removedNode':
          // restore the removed node
          var parentNode = window.slVueTree.getNodeById(entry.removedNode.parentId)
          if (parentNode) {
            this.$store.dispatch("restoreItemAndDescendents", entry)
            const path = entry.removedNode.path
            const prevNode = window.slVueTree.getPreviousNode(path)
            if (entry.removedNode.path.slice(-1)[0] === 0) {
              // the previous node is the parent
              const cursorPosition = {
                nodeModel: prevNode,
                placement: 'inside'
              }
              // do not recalculate priorities when inserting a product node
              window.slVueTree.insert(cursorPosition, [entry.removedNode], parentNode._id !== 'root')
            } else {
              // the previous node is a sibling
              const cursorPosition = {
                nodeModel: prevNode,
                placement: 'after'
              }
              // do not recalculate priorities when inserting a product node
              window.slVueTree.insert(cursorPosition, [entry.removedNode], parentNode._id !== 'root')
            }
            // select the recovered node
            this.$store.state.nodeSelected.isSelected = false
            entry.removedNode.isSelected = true
            this.$store.state.nodeSelected = entry.removedNode
            // restore the removed dependencies
            for (let d of entry.removedIntDependencies) {
              const node = window.slVueTree.getNodeById(d.id)
              if (node !== null) node.dependencies.push(d.dependentOn)
            }
            for (let d of entry.removedExtDependencies) {
              const node = window.slVueTree.getNodeById(d.id)
              if (node !== null) node.dependencies.push(d.dependentOn)
            }
            for (let c of entry.removedIntConditions) {
              const node = window.slVueTree.getNodeById(c.id)
              if (node !== null) node.conditionalFor.push(c.conditionalFor)
            }
            for (let c of entry.removedExtConditions) {
              const node = window.slVueTree.getNodeById(c.id)
              if (node !== null) node.conditionalFor.push(c.conditionalFor)
            }
            this.showLastEvent('Item(s) remove is undone', INFO)
          } else {
            this.showLastEvent(`Cannot restore the removed items in the tree view. The parent node was removed`, WARNING)
          }
          break
      }
      // window.slVueTree.showVisibility('onUndoEvent', FEATURELEVEL)
    },

    subscribeClicked() {
      this.$store.dispatch('changeSubsription')
    },

    filterComments() {
      this.$store.state.filterForComment = this.filterForCommentPrep
    },

    uploadAttachment() {
      const now = Date.now()
      this.$store.state.nodeSelected.data.lastChange = now
      this.$store.state.nodeSelected.data.lastAttachmentAddition = now
      this.$store.dispatch('uploadAttachmentAsync', {
        fileInfo: this.fileInfo,
        currentDocId: this.$store.state.currentDoc._id,
        timestamp: now
      })
    },

    filterHistory() {
      this.$store.state.filterForHistory = this.filterForHistoryPrep
    },

    insertComment() {
      const now = Date.now()
      this.$store.state.nodeSelected.data.lastChange = now
      this.$store.state.nodeSelected.data.lastCommentAddition = now
      this.$store.dispatch('addComment', {
        'comment': this.newComment,
        'timestamp': now
      })
    },

    insertHist() {
      const now = Date.now()
      this.$store.state.nodeSelected.data.lastChange = now
      this.$store.state.nodeSelected.data.lastCommentToHistory = now
      this.$store.dispatch('addHistoryComment', {
        'comment': this.newHistory,
        'timestamp': now
      })
    },

    /* Tree and database update methods */
    updateDescription() {
      // skip update when not changed
      if (this.$store.state.currentDoc.description !== this.newDescription) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          const oldDescription = this.$store.state.currentDoc.description
          const now = Date.now()
          this.$store.state.nodeSelected.data.lastChange = now
          this.$store.state.nodeSelected.data.lastContentChange = now
          // update the current doc in memory
          this.$store.state.currentDoc.description = this.newDescription
          // update the doc in the database
          this.$store.dispatch('saveDescription', {
            'newDescription': this.newDescription,
            'timestamp': now
          })
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoDescriptionChange',
            oldDescription
          }
          this.$store.state.changeHistory.unshift(entry)
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to change the description of this item", WARNING)
        }
      }
    },

    updateAcceptance() {
      // skip update when not changed
      if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          const oldAcceptance = this.$store.state.currentDoc.acceptanceCriteria
          const now = Date.now()
          this.$store.state.nodeSelected.data.lastChange = now
          this.$store.state.nodeSelected.data.lastContentChange = now
          // update the current doc in memory
          this.$store.state.currentDoc.acceptanceCriteria = this.newAcceptance
          // update the doc in the database
          this.$store.dispatch('saveAcceptance', {
            'newAcceptance': this.newAcceptance,
            'timestamp': now
          })
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoAcceptanceChange',
            oldAcceptance
          }
          this.$store.state.changeHistory.unshift(entry)
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to change the acceptance criteria of this item", WARNING)
        }
      }
    },

    updateTsSize() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
          const now = Date.now()
          let size = document.getElementById("tShirtSizeId").value.toUpperCase()
          const sizeArray = this.$store.state.configData.tsSize
          if (sizeArray.includes(size)) {
            this.$store.state.nodeSelected.data.lastChange = now
            this.$store.dispatch('setSize', {
              'newSizeIdx': sizeArray.indexOf(size),
              'timestamp': now
            })
            // create an entry for undoing the change in a last-in first-out sequence
            const entry = {
              type: 'undoTsSizeChange',
              oldTsSize: this.$store.state.currentDoc.tssize
            }
            this.$store.state.changeHistory.unshift(entry)
          } else {
            let sizes = ''
            for (let i = 0; i < sizeArray.length - 1; i++) {
              sizes += sizeArray[i] + ', '
            }
            alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
          }
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change the t-shirt size of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the t-shirt size of this item", WARNING)
      }
    },

    updateStoryPoints() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
          const oldStoryPoints = this.$store.state.currentDoc.spsize
          const now = Date.now()
          let el = document.getElementById("storyPointsId")
          if (isNaN(el.value) || el.value < 0) {
            el.value = '?'
            return
          }
          this.$store.state.nodeSelected.data.lastChange = now
          this.$store.dispatch('setStoryPoints', {
            'newPoints': el.value,
            'timestamp': now
          })
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoStoryPointsChange',
            oldStoryPoints
          }
          this.$store.state.changeHistory.unshift(entry)
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change story points of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the story points size of this item", WARNING)
      }
    },

    updatePersonHours() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
          const oldPersonHours = this.$store.state.currentDoc.spikepersonhours
          const now = Date.now()
          let el = document.getElementById("personHoursId")
          if (isNaN(el.value) || el.value < 0) {
            el.value = '?'
            return
          }
          this.$store.state.nodeSelected.data.lastChange = now
          this.$store.dispatch('setPersonHours', {
            'newHrs': el.value,
            'timestamp': now
          })
          // create an entry for undoing the change in a last-in first-out sequence
          const entry = {
            type: 'undoPersonHoursChange',
            oldPersonHours
          }
          this.$store.state.changeHistory.unshift(entry)
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change story person hours of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the person hours of this item", WARNING)
      }
    },

    /*
    * An authorized user can change state if member of the team which owns this item or when the item is new and changed to 'Ready'.
    * Issue a warning when assigns a higher state to a parent with children witch all have a lower state.
    */
    onStateChange(idx) {
      const currentNode = this.$store.state.nodeSelected

      function changeState(vm, owningTeam) {
        const descendants = window.slVueTree.getDescendantsInfo(currentNode).descendants
        if (descendants.length > 0) {
          let highestState = 0
          let allDone = true
          for (let desc of descendants) {
            if (vm.convertState(desc.data.state) > highestState) highestState = vm.convertState(desc.data.state)
            if (vm.convertState(desc.data.state) < DONE && vm.convertState(desc.data.state) !== REMOVED) allDone = false
          }
          if (idx > highestState || idx === DONE && !allDone) {
            // node has a higher state than any of its descendants or set to done while one of its descendants is not done
            currentNode.data.inconsistentState = true
            if (idx === DONE && !allDone) {
              vm.showLastEvent("You are assigning an inconsistant state to this node. Not all descendants are done.", WARNING)
            } else vm.showLastEvent(`You are assigning an inconsistant state to this node. You can set it to '${vm.getItemStateText(highestState)}'.`, WARNING)
          } else {
            currentNode.data.inconsistentState = false
            vm.clearLastEvent()
          }
        }
        const oldState = vm.$store.state.currentDoc.state
        const now = Date.now()
        currentNode.data.state = idx
        currentNode.data.lastChange = now
        currentNode.data.lastStateChange = now
        currentNode.data.team = owningTeam
        vm.$store.dispatch('setState', {
          'newState': idx,
          'team': owningTeam,
          'timestamp': now
        })
        // create an entry for undoing the change in a last-in first-out sequence
        const entry = {
          type: 'undoStateChange',
          oldState,
          node: currentNode
        }
        vm.$store.state.changeHistory.unshift(entry)
      }

      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        // any user can change from state 'New' to state 'Ready'; the owning team of the item is set to the users team
        if (currentNode.data.state === NEW && idx === READY) {
          changeState(this, this.$store.state.userData.myTeam)
          const parentNode = window.slVueTree.getParentNode(currentNode)
          if (parentNode.level >= this.FEATURELEVEL && parentNode.data.team !== this.$store.state.userData.myTeam) {
            this.showLastEvent("The team of parent '" + parentNode.title + "' (" + parentNode.data.team + ") and your team (" +
              this.$store.state.userData.myTeam + ") do not match. Consider to assign team '" + parentNode.data.team + "' to this item", WARNING)
          }
        } else {
          if (currentNode.data.team === this.$store.state.userData.myTeam) {
            // all other state changes; no team update
            changeState(this, currentNode.data.team)
          } else this.showLastEvent("Sorry, only members of team '" + currentNode.data.team + "' can change the state of this item", WARNING)
        }
      } else this.showLastEvent("Sorry, your assigned role(s) disallow you to change the state of this item", WARNING)
    },

    updateTitle() {
      const oldTitle = this.$store.state.currentDoc.title
      const newTitle = document.getElementById("titleField").value
      if (oldTitle === newTitle) return

      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        const now = Date.now()
        // update the tree
        let node = this.$store.state.nodeSelected
        node.title = newTitle
        node.data.lastChange = now
        node.data.lastContentChange = now
        // update current document in database
        this.$store.dispatch('setDocTitle', {
          'newTitle': newTitle,
          'timestamp': now
        })
        // create an entry for undoing the change in a last-in first-out sequence
        const entry = {
          type: 'undoTitleChange',
          oldTitle
        }
        this.$store.state.changeHistory.unshift(entry)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the title of this item", WARNING)
      }
    },

    /* event handling */
    nodeSelectedEvent(selNodes) {
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
      // load the document if not already in memory
      if (this.$store.state.nodeSelected._id !== this.$store.state.currentDoc._id) {
        // cannot wait for the loadDoc call to return to update the current productId
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
       * 0. Requirement area items cannot be moved
       * 1. Disallow drop on node were the user has no write authority
       * 2. Disallow drop when moving over more than 1 level.
       * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest permitted level.
       * precondition: the selected nodes have all the same parent (same level)
       */
      let checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
        const failedCheck0 = draggingNodes[0].productId === this.AREA_PRODUCTID
        const levelChange = Math.abs(targetLevel - sourceLevel)
        const failedCheck1 = !this.haveWritePermission[position.nodeModel.level]
        const failedCheck2 = levelChange > 1
        const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > this.PBILEVEL
        if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        return failedCheck0 || failedCheck1 || failedCheck2 || failedCheck3
      }
      const sourceLevel = draggingNodes[0].level
      let targetLevel = position.nodeModel.level
      // are we dropping 'inside' a node creating children to that node?
      if (position.placement === 'inside') targetLevel++
      if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
        cancel(true)
        return
      }
      // save the current index and parentId
      for (let n of draggingNodes) {
        n.savedInd = n.ind
        n.savedParentId = n.parentId
      }
    },

    /*
     * Update the database when one or more nodes are dropped on another location
     * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
     */
    nodeDropped(beforeDropStatus, draggingNodes, position) {
      const targetNode = position.nodeModel
      const clickedLevel = draggingNodes[0].level
      let dropLevel = targetNode.level
      // drop inside?
      if (position.placement === 'inside') {
        dropLevel++
      }
      let levelChange = clickedLevel - dropLevel
      // update the nodes in the database
      let payloadArray = []
      for (let n of draggingNodes) {
        const descendantsInfo = window.slVueTree.getDescendantsInfo(n)
        const payloadItem = {
          '_id': n._id,
          'type': 'move',
          'oldProductTitle': null,
          'productId': n.productId,
          'oldParentId': n.savedParentId,
          'newParentId': n.parentId,
          'newPriority': n.data.priority,
          'newParentTitle': targetNode.title,
          'oldParentTitle': window.slVueTree.getNodeById(n.savedParentId).title,
          'oldLevel': clickedLevel,
          'newLevel': n.level,
          'oldInd': n.savedInd,
          'newInd': n.ind,
          'placement': position.placement,
          'nrOfDescendants': descendantsInfo.count,
          'descendants': descendantsInfo.descendants
        }
        payloadArray.push(payloadItem)
      }
      this.$store.dispatch('updateMovedItemsBulk', { items: payloadArray })

      // create an entry for undoing the move in a last-in first-out sequence
      const entry = {
        type: 'undoMove',
        beforeDropStatus
      }
      this.$store.state.changeHistory.unshift(entry)
      for (let n of draggingNodes) {
        n.data.lastPositionChange = Date.now()
      }

      // create the event message
      const title = this.itemTitleTrunc(60, draggingNodes[0].title)
      let evt = ""
      if (draggingNodes.length === 1) {
        evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.nodeModel.title}'`
      } else {
        evt = `${this.getLevelText(clickedLevel)} '${title}' and ${draggingNodes.length - 1} other item(s) are dropped ${position.placement} '${position.nodeModel.title}'`
      }
      if (levelChange !== 0) evt += ' as ' + this.getLevelText(dropLevel)
      this.showLastEvent(evt, INFO)
    },

    refreshColorMapper() {
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
        this.$store.dispatch('updateColorDb', this.$store.state.currentDoc.color)
      }
    },

    setUserColor() {
      this.$store.state.nodeSelected.data.reqAreaItemcolor = this.userReqAreaItemcolor
      this.$store.dispatch('updateColorDb', this.userReqAreaItemcolor)
    },

    setReqArea(reqarea) {
      this.selReqAreaId = reqarea
      const currReqAreaNodes = window.slVueTree.getReqAreaNodes()
      this.reqAreaOptions = []
      for (let nm of currReqAreaNodes) {
        this.reqAreaOptions.push({ id: nm._id, title: nm.title })
      }
      if (this.selReqAreaId !== null) this.reqAreaOptions.push({ id: null, title: 'Remove item from requirement areas' })
      this.setReqAreaShow = true

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
    },

    getViewOptions() {
      let options = [
        { text: 'Comments', value: 'comments' },
        { text: 'Attachments', value: 'attachments' },
        { text: 'History', value: 'history' }
      ]
      return options
    },

  },

  components: {
    'app-header': Header,
    Multipane,
    MultipaneResizer,
    VueEditor,
    slVueTree,
    context,
    filters,
    listings
  }
}