import Header from '../header/header.vue'
import { mapGetters } from 'vuex'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import { utilities } from '../mixins/utilities.js'
import context from './context.vue'
import filters from './filters.vue'
import listings from './listings.vue'

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
      startEditor: false,
      startFiltering: false,
      newComment: "",
      newHistory: "",
      filterForCommentPrep: "",
      filterForHistoryPrep: ""
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
        this.searchInTitles()
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
    },

    'startFiltering': function (val) {
      if (val === true) {
        this.startFiltering = false
        if (this.$store.state.selectedForView === 'comments') this.$refs.commentsFilterRef.show()
        if (this.$store.state.selectedForView === 'history') this.$refs.historyFilterRef.show()
      }
    }
  },

  methods: {
    /* Return true if the state of the node has changed in the last hour */
    hasNewState(node) {
      return node.data.lastStateChange ? node.data.lastStateChange - Date.now() < 3600000 : false
    },

    onSetMyFilters() {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters('onSetMyFilters')
      } else {
        window.myFilters.show()
      }
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
          window.slVueTree.resetFilters('nodeSelectedEvent')
          // collapse the previously selected product
          window.slVueTree.collapseTree()
          // update current productId and title
          this.$store.state.load.currentProductId = node.productId
          this.$store.state.load.currentProductTitle = window.slVueTree.getProductTitle(node.productId)
        } else {
          // node on current product; collapse the currently selected product
          window.slVueTree.collapseTree()
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

    searchInTitles() {
      // cannot search on empty string
      if (this.$store.state.keyword === '') return

      // reset the other selections first
      window.slVueTree.resetFilters('searchInTitles')
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
      this.showLastEvent(`${count} item ${s} your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
      this.$store.state.searchOn = true
      // window.slVueTree.showVisibility('searchInTitles', FEATURELEVEL)
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

    subscribeClicked() {
      this.$store.dispatch('changeSubsription')
    },

    filterComments() {
      this.$store.state.filterForComment = this.filterForCommentPrep
    },

    filterHistory() {
      this.$store.state.filterForHistory = this.filterForHistoryPrep
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
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
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
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change the t-shirt size of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the t-shirt size of this item", WARNING)
      }
    },

    updateStoryPoints() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
          let el = document.getElementById("storyPointsId")
          if (isNaN(el.value) || el.value < 0) {
            el.value = '?'
            return
          }
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          this.$store.dispatch('setStoryPoints', {
            'newPoints': el.value
          })
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change story points of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the story points size of this item", WARNING)
      }
    },

    updatePersonHours() {
      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
          let el = document.getElementById("personHoursId")
          if (isNaN(el.value) || el.value < 0) {
            el.value = '?'
            return
          }
          this.$store.state.nodeSelected.data.lastChange = Date.now()
          this.$store.dispatch('setPersonHours', {
            'newHrs': el.value
          })
        } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change story person hours of this item", WARNING)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to change the person hours of this item", WARNING)
      }
    },

    /* An authorized user can change state if member of the team which owns this item or when the item is new and changed to 'Ready' */
    onStateChange(idx) {
      function changeState(vm, newTeam) {
        const now = Date.now()
        vm.$store.state.nodeSelected.data.state = idx
        vm.$store.state.nodeSelected.data.lastChange = now
        vm.$store.state.nodeSelected.data.lastStateChange = now
        if (newTeam) {
          vm.$store.state.nodeSelected.data.team = newTeam
        }
        vm.$store.dispatch('setState', {
          'newState': idx, 'team': newTeam, lastStateChange: now
        })
      }

      if (this.haveWritePermission[this.getCurrentItemLevel]) {
        // any user can change from state 'New' to state 'Ready'; the owning team of the item is set to the users team
        if (this.$store.state.nodeSelected.data.state === 0 && idx === 1) {
          changeState(this, this.$store.state.userData.myTeam)
          const parentNode = window.slVueTree.getParentNode(this.$store.state.nodeSelected)
          if (parentNode.level >= FEATURELEVEL && parentNode.data.team !== this.$store.state.userData.myTeam) {
            this.showLastEvent("The team of parent '" + parentNode.title + "' (" + parentNode.data.team + ") and your team (" +
            this.$store.state.userData.myTeam + ") do not match. Consider to assign team '" + parentNode.data.team + "' to this item", WARNING)
          }
        } else {
          if (this.$store.state.nodeSelected.data.team === this.$store.state.userData.myTeam) {
            if (idx === 0) {
              // change from any other state to 'New' and set the team of the item to 'not asigned yet'
              changeState(this, 'not assigned yet')
            } else {
              // all other state changes; no team update
              changeState(this, null)
            }
          } else this.showLastEvent("Sorry, only members of team '" + this.$store.state.nodeSelected.data.team + "' can change the state of this item", WARNING)
        }
      } else this.showLastEvent("Sorry, your assigned role(s) disallow you to change the state of this item", WARNING)
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
          window.slVueTree.resetFilters('nodeSelectedEvent')
          // collapse the previously selected product
          window.slVueTree.collapseTree()
          // update current productId and title
          this.$store.state.load.currentProductId = this.$store.state.nodeSelected.productId
          this.$store.state.load.currentProductTitle = this.$store.state.nodeSelected.title
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
    context,
    filters,
    listings
  }
}
