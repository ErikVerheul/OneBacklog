import Header from '../header/header.vue'
import { mapGetters } from 'vuex'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import { utilities } from '../mixins/utilities.js'
import context from './context.vue'

const INFO = 0
const WARNING = 1
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const SHORTKEYLENGTH = 5

export default {
  mixins: [utilities],
  data() {
    return {
      databaseLevel: DATABASELEVEL,
      productLevel: PRODUCTLEVEL,
      epicLevel: EPICLEVEL,
      featureLevel: FEATURELEVEL,
      pbiLevel: PBILEVEL,
      shortId: "",
      fromDate: undefined,
      toDate: undefined,
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
      selectedForView: 'comments',
      startEditor: false,
      newComment: "",
      newHistory: "",
      startFiltering: false,
      filterForCommentPrep: "",
      filterForComment: "",
      filterForHistoryPrep: "",
      filterForHistory: ""
    }
  },

  /* Select the users default top product node. Note that at all times at least one node must be selected */
  mounted() {
    // expose instance to the global namespace
    window.slVueTree = this.$refs.slVueTree
    // note that the product is selected in load.js
    this.$store.state.nodeSelected = window.slVueTree.getSelectedProduct()

    function isEmpty(str) {
      return !str.replace(/\s+/, '').length;
    }

    let el = document.getElementById("selectOnId")
    // fire the search on short id on pressing enter in the select-on-Id input field (instead of submitting the form)
    el.addEventListener("keypress", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault()
        // check for valid input and convert to lowercase
        if (this.shortIdCheck) {
          window.slVueTree.resetFilters('selectOnId')
          this.selectNode(this.shortId.toLowerCase())
        }
      }
    })
    el.addEventListener("input", () => {
      if (isEmpty(el.value)) {
        window.slVueTree.resetFilters('selectOnId')
      }
    })

    let el2 = document.getElementById("searchInput")
    // fire the search button on pressing enter in the search input field (instead of submitting the form)
    el2.addEventListener("keypress", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault()
        this.filterOnKeyword()
      }
    })
    el2.addEventListener("input", () => {
      if (isEmpty(el2.value)) {
        window.slVueTree.resetFilters('showSearchInTitles')
      }
    })
  },

  computed: {
    ...mapGetters([
      // from store.js
      'isFollower',
      'canCreateComments',
      'getCurrentItemLevel',
      'getCurrentItemTsSize',
      // from load.js
      'haveWritePermission'
    ]),

    welcomeMessage() {
      const msg_1 = `Welcome '${this.$store.state.userData.user}'.`
      let msg_2
      if (this.$store.state.userData.myTeam === 'not in a team') {
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

    shortIdCheck() {
      const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz'
      if (this.shortId.length !== SHORTKEYLENGTH) return false

      for (let i = 0; i < this.shortId.length; i++) {
        if (!alphanum.includes(this.shortId.substring(i, i + 1).toLowerCase())) return false
      }
      return true
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

    subsribeTitle() {
      if (this.isFollower) {
        return "Unsubscribe to change notices"
      } else {
        return "Subscribe to change notices"
      }
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
    },

    getFilteredComments() {
      let filteredComments = []
      let comments = this.$store.state.currentDoc.comments
      for (let i = 0; i < comments.length; i++) {
        let allText = window.atob(comments[i].comment)
        allText += comments[i].by
        allText += comments[i].email
        allText += this.mkTimestamp(comments[i].timestamp)
        if (allText.includes(this.filterForComment)) {
          filteredComments.push(comments[i])
        }
      }
      return filteredComments
    },

    getFilteredHistory() {
      function removeImages(text) {
        let pos1 = text.indexOf('<img src="')
        if (pos1 === -1) return text
        else {
          let pos2 = text.indexOf('">', pos1 + 1)
          let image = text.slice(pos1, pos2 + 1)
          text = text.replace(image, '')
          return removeImages(text)
        }
      }
      let filteredComments = []
      for (let i = 0; i < this.$store.state.currentDoc.history.length; i++) {
        let histItem = this.$store.state.currentDoc.history[i]
        let allText = ""
        let keys = Object.keys(histItem)
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] === "rootEvent") allText += this.mkRootEvent(histItem[keys[j]])
          if (keys[j] === "subscribeEvent") allText += this.mkSubscribeEvent(histItem[keys[j]])
          if (keys[j] === "createEvent") allText += this.mkCreateEvent(histItem[keys[j]])
          if (keys[j] === "setSizeEvent") allText += this.mkSetSizeEvent(histItem[keys[j]])
          if (keys[j] === "setPointsEvent") allText += this.mkSetPointsEvent(histItem[keys[j]])
          if (keys[j] === "setHrsEvent") allText += this.mkSetHrsEvent(histItem[keys[j]])
          if (keys[j] === "setStateEvent") allText += this.mkSetStateEvent(histItem[keys[j]])
          if (keys[j] === "setTitleEvent") allText += this.mkSetTitleEvent(histItem[keys[j]])
          if (keys[j] === "setSubTypeEvent") allText += this.mkSetSubTypeEvent(histItem[keys[j]])
          if (keys[j] === "descriptionEvent") allText += removeImages(this.mkDescriptionEvent(histItem[keys[j]]))
          if (keys[j] === "acceptanceEvent") allText += removeImages(this.mkAcceptanceEvent(histItem[keys[j]]))
          if (keys[j] === "nodeDroppedEvent") allText += this.mkNodeDroppedEvent(histItem[keys[j]])
          if (keys[j] === "descendantMoved") allText += this.mkDescendantMoved(histItem[keys[j]])
          if (keys[j] === "removedFromParentEvent") allText += this.mkRemovedFromParentEvent(histItem[keys[j]])
          if (keys[j] === "parentDocRemovedEvent") allText += this.mkParentDocRemovedEvent(histItem[keys[j]])
          if (keys[j] === "docRemovedEvent") allText += this.mkDocRemovedEvent(histItem[keys[j]])
          if (keys[j] === "grandParentDocRestoredEvent") allText += this.mkGrandParentDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "docRestoredInsideEvent") allText += this.mkDocRestoredInsideEvent(histItem[keys[j]])
          if (keys[j] === "docRestoredEvent") allText += this.mkDocRestoredEvent(histItem[keys[j]])
          if (keys[j] === "by") allText += this.mkBy(histItem[keys[j]])
          if (keys[j] === "email") allText += this.mkEmail(histItem[keys[j]])
          if (keys[j] === "timestamp") allText += this.mkTimestamp(histItem[keys[j]])
        }
        if (allText.includes(this.filterForHistory)) {
          filteredComments.push(histItem)
        }
      }
      return filteredComments
    }
  },

  watch: {
    'selectedPbiType': function (val) {
      // prevent looping
      if (val !== this.$store.state.currentDoc.subtype) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          this.$store.state.nodeSelected.data.subtype = val
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          this.$store.dispatch('setSubType', {
            'newSubType': val
          })
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you change the pbi type", WARNING)
        }
      }

    },

    'startEditor': function (val) {
      if (val === true) {
        this.startEditor = false
        if (this.canCreateComments) {
          if (this.selectedForView === 'comments') {
            this.newComment = ''
            this.$refs.commentsEditorRef.show()
          }
          if (this.selectedForView === 'history') {
            this.newHistory = ''
            this.$refs.historyEditorRef.show()
          }
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to create comments", WARNING)
        }
      }
    },

    'startFiltering': function (val) {
      if (val === true) {
        this.startFiltering = false
        if (this.selectedForView === 'comments') this.$refs.commentsFilterRef.show()
        if (this.selectedForView === 'history') this.$refs.historyFilterRef.show()
      }
    }
  },

  methods: {
    /* Show the items in the current selected product which have changed since (in minutes) */
    onFilterSinceEvent(since) {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters("onFilterSinceEvent")
      }
      if (since !== 0) {
        this.filterSince(since)
      } else this.$refs.otherPeriodRef.show()
    },

    /* Show the items in the current selected product which have changed since (in minutes) */
    filterSince(since) {
      // if needed, reset the other selection first
      if (this.$store.state.searchOn || this.$store.state.findIdOn) window.slVueTree.resetFilters('filterSince')
      let count = 0
      let cb
      if (since === 0 && this.fromDate && this.toDate) {
        // process a period from fromDate(inclusive) to toDate(exclusive); date format is yyyy-mm-dd
        const fromMilis = Date.parse(this.fromDate)
        const endOfToMilis = Date.parse(this.toDate) + 24 * 60 * 60000
        cb = (nodeModel) => {
          if (nodeModel.data.lastChange >= fromMilis && nodeModel.data.lastChange < endOfToMilis) {
            window.slVueTree.showPathToNode(nodeModel)
            count++
          } else nodeModel.doShow = false
        }
      } else {
        const sinceMilis = since * 60000
        const now = Date.now()
        cb = (nodeModel) => {
          if (now - nodeModel.data.lastChange < sinceMilis) {
            window.slVueTree.showPathToNode(nodeModel)
            count++
          } else nodeModel.doShow = false
        }
      }
      window.slVueTree.traverseModels(cb, window.slVueTree.getProductModels())
      let s
      count === 1 ? s = 'title matches' : s = 'titles match'
      this.showLastEvent(`${count} item ${s} your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
      this.$store.state.filterText = 'Clear filter'
      this.$store.state.filterOn = true
      // window.slVueTree.showVisibility('filterSince', FEATURELEVEL)
    },

    selectNode(shortId) {
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
        if (this.$store.state.load.currentProductId !== node.productId) {
          // clear any outstanding filters
          if (this.$store.state.filterOn || this.$store.state.searchOn) {
            window.slVueTree.resetFilters('nodeSelectedEvent')
          }
          // collapse the previously selected product
          window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
          // update current productId and title
          this.$store.state.load.currentProductId = node.productId
          this.$store.state.load.currentProductTitle = window.slVueTree.getProductTitle(node.productId)
        } else {
          // node on current product; collapse the currently selected product
          window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
        }

        this.showLastEvent(`The item is found in product '${this.$store.state.load.currentProductTitle}'`, INFO)
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

    filterOnKeyword() {
      // cannot search on empty string
      if (this.$store.state.keyword === '') return

      // if needed reset the other selection first
      if (this.$store.state.filterOn || this.$store.state.findIdOn) window.slVueTree.resetFilters('filterOnKeyword')
      let count = 0
      window.slVueTree.traverseModels((nodeModel) => {
        if (nodeModel.title.toLowerCase().includes(this.$store.state.keyword.toLowerCase())) {
          window.slVueTree.showPathToNode(nodeModel)
          count++
        } else {
          nodeModel.doShow = false
        }
      }, window.slVueTree.getProductModels())
      // show event
      let s
      count === 1 ? s = 'title matches' : s = 'titles match'
      this.showLastEvent(`${count} item ${s} your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
      this.$store.state.searchOn = true
      // window.slVueTree.showVisibility('filterOnKeyword', FEATURELEVEL)
    },

    onUndoRemoveEvent() {
      const entry = this.$store.state.removeHistory.splice(0, 1)[0]
      this.$store.dispatch("unDoRemove", entry)
      // restore the removed node
      const parentNode = window.slVueTree.getNodeById(entry.removedNode.parentId)
      if (parentNode) {
        let path
        if (window.slVueTree.comparePaths(parentNode.path, entry.removedNode.path.slice(0, -1)) === 0) {
          // the removed node path has not changed
          path = entry.removedNode.path
        } else {
          // the removed node path has changed; correct it for the new parent path
          path = parentNode.path.concat(entry.removedNode.path.slice(-1))
        }
        const prevNode = window.slVueTree.getPreviousNode(path)
        if (entry.removedNode.path.slice(-1)[0] === 0) {
          // the previous node is the parent
          const cursorPosition = {
            nodeModel: prevNode,
            placement: 'inside'
          }
          window.slVueTree.insert(cursorPosition, [entry.removedNode])
        } else {
          // the previous node is a sibling
          const cursorPosition = {
            nodeModel: prevNode,
            placement: 'after'
          }
          window.slVueTree.insert(cursorPosition, [entry.removedNode])
        }
        // select the recovered node
        this.$store.state.nodeSelected.isSelected = false
        entry.removedNode.isSelected = true
        this.$store.state.nodeSelected = entry.removedNode
        this.$store.state.load.currentProductId = entry.removedNode.productId
      } else {
        this.showLastEvent(`Cannot restore the removed items in the tree view. Sign out and -in again to recover'`, WARNING)
      }
      // window.slVueTree.showVisibility('onUndoRemoveEvent', FEATURELEVEL)
    },

    onClearFilterEvent() {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters("onClearFilterEvent")
      }
    },

    subscribeClicked() {
      this.$store.dispatch('changeSubsription')
    },

    filterComments() {
      this.filterForComment = this.filterForCommentPrep
    },

    filterHistory() {
      this.filterForHistory = this.filterForHistoryPrep
    },

    insertComment() {
      this.$store.dispatch('addComment', {
        'comment': this.newComment
      })
    },

    insertHist() {
      this.$store.dispatch('addHistoryComment', {
        'comment': this.newHistory
      })
    },

    /* Presentation methods */
    mkSubscribeEvent(value) {
      if (value[0]) {
        return "<h5>You unsubscribed for messages about this backlog item.</h5>"
      } else {
        return "<h5>You subscribed to receive messages about this backlog item.</h5>"
      }
    },

    mkCreateEvent(value) {
      return "<h5>This " + this.getLevelText(value[0]) + " was created under parent '" + value[1] + "'</h5>"
    },

    mkSetSizeEvent(value) {
      return "<h5>T-Shirt estimate changed from </h5>" + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
    },

    mkSetPointsEvent(value) {
      return "<h5>Storypoints estimate changed from </h5>" + value[0] + ' to ' + value[1]
    },

    mkSetHrsEvent(value) {
      return "<h5>Spike estimate hours changed from </h5>" + value[0] + ' to ' + value[1]
    },

    mkSetStateEvent(value) {
      return "<h5>The state of the item has changed from '" + this.getItemStateText(value[0]) + "' to '" + this.getItemStateText(value[1]) + "'</h5>"
    },

    mkSetTitleEvent(value) {
      return "<h5>The item  title has changed from: </h5>'" + value[0] + "' to '" + value[1] + "'"
    },

    mkSetSubTypeEvent(value) {
      return "<h5>The pbi subtype has changed from: </h5>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'"
    },

    mkDescriptionEvent(value) {
      return "<h5>The description of the item has changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkAcceptanceEvent(value) {
      return "<h5>The acceptance criteria of the item have changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
    },

    mkNodeDroppedEvent(value) {
      let txt
      if (value[5]) { txt = "<h5>The item was moved from product '" + value[5] + "' to this product.</h5>" } else txt = ''
      if (value[0] === value[1]) {
        txt += "<h5>The item changed priority to position " + (value[2] + 1) + " " + value[6] + " '" + value[3] + "'</h5>"
        txt += (value[4] > 0) ? "<p>" + value[4] + " descendants were also moved.</p>" : ""
        return txt
      } else {
        txt += "<h5>The item changed type from " + this.getLevelText(value[0]) + " to " + this.getLevelText(value[1]) + ".</h5>"
        txt += "<p>The new position is " + (value[2] + 1) + " under parent '" + value[3] + "'</p>"
        txt += (value[4] > 0) ? "<p>" + value[4] + " descendants also changed type.</p>" : ""
        return txt
      }
    },

    mkDescendantMoved(value) {
      return "<h5>Item was moved as descendant from '" + value[0] + "'</h5>"
    },

    mkRemovedFromParentEvent(value) {
      return "<h5>" + this.getLevelText(value[0]) + " with title '" + value[1] + "' and " + value[2] + " descendants are removed from this parent</h5>"
    },

    mkParentDocRemovedEvent(value) {
      return "<h5> This item and " + value[0] + " descendants are removed</h5>"
    },

    mkDocRemovedEvent(value) {
      return "<h5>This item has been removed as descendant of " + value[0] + "</h5>"
    },

    mkGrandParentDocRestoredEvent(value) {
      return "<h5>" + this.getLevelText(value[0]) + " with title '" + value[1] + "' and " + value[2] + " descendants are restored from removal</h5>"
    },

    mkDocRestoredInsideEvent(value) {
      return "<h5>This item and " + value[0] + " descendants are restored from removal</h5>"
    },

    mkDocRestoredEvent() {
      return "<h5>This item has been restored from removal</h5>"
    },

    mkBy(value) {
      return "by: " + value
    },

    mkEmail(value) {
      return "email: " + value
    },

    mkTimestamp(value) {
      return "timestamp: " + new Date(value).toString() + "<br><br>"
    },

    mkComment(value) {
      return window.atob(value[0])
    },

    mkRootEvent(value) {
      return "<h5>" + value[0] + "</h5>"
    },

    prepCommentsText(key, value) {
      if (key === "comment") return this.mkComment(value)
      if (key === "by") return this.mkBy(value)
      if (key === "email") return this.mkEmail(value)
      if (key === "timestamp") return this.mkTimestamp(value)
    },

    prepHistoryText(key, value) {
      if (key === "rootEvent") return this.mkRootEvent(value)
      if (key === "comment") return this.mkComment(value)
      if (key === "subscribeEvent") return this.mkSubscribeEvent(value)
      if (key === "createEvent") return this.mkCreateEvent(value)
      if (key === "setSizeEvent") return this.mkSetSizeEvent(value)
      if (key === "setPointsEvent") return this.mkSetPointsEvent(value)
      if (key === "setHrsEvent") return this.mkSetHrsEvent(value)
      if (key === "setStateEvent") return this.mkSetStateEvent(value)
      if (key === "setTitleEvent") return this.mkSetTitleEvent(value)
      if (key === "setSubTypeEvent") return this.mkSetSubTypeEvent(value)
      if (key === "descriptionEvent") return this.mkDescriptionEvent(value)
      if (key === "acceptanceEvent") return this.mkAcceptanceEvent(value)
      if (key === "nodeDroppedEvent") return this.mkNodeDroppedEvent(value)
      if (key === "descendantMoved") return this.mkDescendantMoved(value)
      if (key === "removedFromParentEvent") return this.mkRemovedFromParentEvent(value)
      if (key === "parentDocRemovedEvent") return this.mkParentDocRemovedEvent(value)
      if (key === "docRemovedEvent") return this.mkDocRemovedEvent(value)
      if (key === "grandParentDocRestoredEvent") return this.mkGrandParentDocRestoredEvent(value)
      if (key === "docRestoredInsideEvent") return this.mkDocRestoredInsideEvent(value)
      if (key === "docRestoredEvent") return this.mkDocRestoredEvent(value)
      if (key === "by") return this.mkBy(value)
      if (key === "email") return this.mkEmail(value)
      if (key === "timestamp") return this.mkTimestamp(value)
    },

    /* Database update methods */
    updateDescription() {
      // skip update when not changed
      if (this.$store.state.currentDoc.description !== this.newDescription) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          // update the current doc in memory
          this.$store.state.currentDoc.description = this.newDescription
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          // update the doc in the database
          this.$store.dispatch('saveDescription', {
            'newDescription': this.newDescription
          })
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to change the description of this item", WARNING)
        }
      }
    },

    updateAcceptance() {
      // skip update when not changed
      if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
        if (this.haveWritePermission[this.getCurrentItemLevel]) {
          // update the current doc in memory
          this.$store.state.currentDoc.acceptanceCriteria = this.newAcceptance
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          // update the doc in the database
          this.$store.dispatch('saveAcceptance', {
            'newAcceptance': this.newAcceptance
          })
        } else {
          this.showLastEvent("Sorry, your assigned role(s) disallow you to change the acceptance criteria of this item", WARNING)
        }
      }
    },

    updateTsSize() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        let size = document.getElementById("tShirtSizeId").value.toUpperCase()
        const sizeArray = this.$store.state.configData.tsSize
        if (sizeArray.includes(size)) {
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          this.$store.dispatch('setSize', {
            'newSizeIdx': sizeArray.indexOf(size)
          })
        } else {
          let sizes = ''
          for (let i = 0; i < sizeArray.length - 1; i++) {
            sizes += sizeArray[i] + ', '
          }
          alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
        }
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the t-shirt size of this item", WARNING)
      }
    },

    updateStoryPoints() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        let el = document.getElementById("storyPointsId")
        if (isNaN(el.value) || el.value < 0) {
          el.value = '?'
          return
        }
        this.$store.state.nodeSelected.data.lastChange = Date.now()
        this.$store.dispatch('setStoryPoints', {
          'newPoints': el.value
        })
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the story points size of this item", WARNING)
      }
    },

    updatePersonHours() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        let el = document.getElementById("personHoursId")
        if (isNaN(el.value) || el.value < 0) {
          el.value = '?'
          return
        }
        this.$store.state.nodeSelected.data.lastChange = Date.now()
        this.$store.dispatch('setPersonHours', {
          'newHrs': el.value
        })
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the person hours of this item", WARNING)
      }
    },

    onStateChange(idx) {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        // update the tree
        this.$store.state.nodeSelected.data.state = idx
        this.$store.state.nodeSelected.data.lastChange = Date.now()
        // update current document in database
        this.$store.dispatch('setState', {
          'newState': idx
        })
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the state of this item", WARNING)
      }
    },

    updateTitle() {
      const oldTitle = this.$store.state.currentDoc.title
      const newTitle = document.getElementById("titleField").value
      if (oldTitle === newTitle) return

      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        // update the tree
        let node = this.$store.state.nodeSelected
        node.title = newTitle
        node.data.lastChange = Date.now()
        // update current document in database
        this.$store.dispatch('setDocTitle', {
          'newTitle': newTitle
        })
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
      if (!this.haveSameParent(selNodes)) {
        this.showLastEvent('You can only select nodes with the same parent.', WARNING)
        return
      }
      this.$store.state.numberOfNodesSelected = selNodes.length
      // update the first (highest in hierarchie) selected node
      this.$store.state.nodeSelected = selNodes[0]
      // if the root node is selected do nothing
      if (this.$store.state.nodeSelected._id !== 'root') {
        // if the user clicked on a node of another product
        if (this.$store.state.load.currentProductId !== this.$store.state.nodeSelected.productId) {
          // clear any outstanding filters
          if (this.$store.state.filterOn || this.$store.state.searchOn) {
            window.slVueTree.resetFilters('nodeSelectedEvent')
          }
          // collapse the previously selected product
          window.slVueTree.collapseTree(this.$store.state.load.currentProductId)
          // update current productId and title
          this.$store.state.load.currentProductId = this.$store.state.nodeSelected.productId
          this.$store.state.load.currentProductTitle = this.$store.state.nodeSelected.title
          // expand the newly selected product up to the feature level and select the product node again
          window.slVueTree.expandTree(FEATURELEVEL)
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

		/*
		/ Use this event to check if the drag is allowed. If not, issue a warning.
		*/
    beforeNodeDropped(draggingNodes, position, cancel) {
			/*
			 * Disallow drop on node were the user has no write authority
			 * Disallow drop when moving over more than 1 level.
			 * Dropping items with descendants is not possible when any descendant would land higher than the highest level (pbilevel).
			 * precondition: the selected nodes have all the same parent (same level)
			 */
      let checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
        const levelChange = Math.abs(targetLevel - sourceLevel)
        let failedCheck1 = !this.haveWritePermission[position.nodeModel.level]
        let failedCheck2 = levelChange > 1
        let failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > PBILEVEL
        if (failedCheck1) this.showLastEvent('Your role settings do not allow you to drop on this position', WARNING)
        if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', WARNING)
        if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', WARNING)
        return failedCheck1 || failedCheck2 || failedCheck3
      }
      const sourceLevel = draggingNodes[0].level
      let targetLevel = position.nodeModel.level
      // are we dropping 'inside' a node creating children to that node?
      if (position.placement === 'inside') {
        targetLevel++
        if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
          cancel(true)
          return
        }
      } else {
        // a drop before of after an existing sibling
        if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
          cancel(true)
          return
        }
      }
    },

		/*
		 * Update the tree when one or more nodes are dropped on another location
		 * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
		 */
    nodeDropped(draggingNodes, position) {
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
      for (let i = 0; i < draggingNodes.length; i++) {
        const payloadItem = {
          '_id': draggingNodes[i]._id,
          'oldProductTitle': null,
          'productId': draggingNodes[i].productId,
          'newParentId': draggingNodes[i].parentId,
          'newPriority': draggingNodes[i].data.priority,
          'newParentTitle': targetNode.title,
          'oldParentTitle': draggingNodes[i].title,
          'oldLevel': clickedLevel,
          'newLevel': draggingNodes[i].level,
          'newInd': draggingNodes[i].ind,
          'placement': position.placement,
          'descendants': window.slVueTree.getDescendantsInfo(draggingNodes[i]).descendants
        }
        payloadArray.push(payloadItem)
      }
      this.$store.dispatch('updateDropped', {
        next: 0,
        payloadArray: payloadArray
      })
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

    getPbiOptions() {
      this.selectedPbiType = this.$store.state.currentDoc.subtype
      let options = [
        { text: 'User story', value: 0 },
        { text: 'Spike', value: 1 },
        { text: 'Defect', value: 2 }
      ]
      return options
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
    context
  }
}
