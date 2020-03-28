import { mapGetters } from 'vuex'
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const REMOVED = 0
const STATE_NEW_OR_TODO = 2
const STATE_READY_OR_INPROGRESS = 3
const DONE = 5
var violationsWereFound = false

export default {
  mixins: [utilities],

  created() {
    this.databaseLevel = 1
    this.productLevel = 2
    this.epicLevel = 3
    this.featureLevel = 4
    this.pbiLevel = 5
    this.taskLevel = 6
    this.areaProductId = '0'
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
      filterForHistoryPrep: ""
    }
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

  methods: {
    dependencyViolationsFound() {
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
      return violationsWereFound
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
      this.shortId = ''
      window.slVueTree.resetFindOnId('resetFindId')
    },

    resetSearchTitles() {
      this.$store.state.keyword = ''
      window.slVueTree.resetFilters('resetSearchTitles')
    },

    patchTitle(node) {
      let patch = ''
      if (node.dependencies && node.dependencies.length > 0) patch = '▲ '
      if (node.conditionalFor && node.conditionalFor.length > 0) patch = patch + '▼ '
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
        window.slVueTree.resetFilters('onSetMyFilters')
        window.slVueTree.resetFindOnId('onSetMyFilters')
      } else {
        // update the available req area options
        const currReqAreaIds = window.slVueTree.getCurrentReqAreaIds()
        this.$store.state.reqAreaOptions = []
        for (let id of currReqAreaIds) {
          this.$store.state.reqAreaOptions.push({ id, title: this.$store.state.reqAreaMapper[id] })
        }
        window.myFilters.show()
      }
    },

    searchInTitles() {
      // cannot search on empty string
      if (this.$store.state.keyword === '') return

      // reset the other selections first
      window.slVueTree.resetFilters('searchInTitles')
      window.slVueTree.resetFindOnId('searchInTitles')
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
        case 'undoAddSprintIds':
          this.$store.dispatch('removeSprintIds', { itemIds: entry.itemIds, sprintName: entry.sprintName })
          break
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
          {
            window.slVueTree.moveBack(entry)
            const beforeDropStatus = entry.beforeDropStatus
            // update the nodes in the database; swap source and target
            const moveInfo = {
              type: 'undoMove',
              sourceProductId: beforeDropStatus.targetProductId,
              sourceParentId: beforeDropStatus.targetParentId,
              sourceLevel: beforeDropStatus.targetLevel,
              levelShift: beforeDropStatus.sourceLevel - beforeDropStatus.targetLevel,
              targetProductId: beforeDropStatus.sourceProductId,
              targetParentId: beforeDropStatus.sourceParentId,
              // placement: not available
            }
            const items = []
            for (let m of beforeDropStatus.movedNodesData.sourceIndMap) {
              // remove the <moved> badge
              m.node.data.lastPositionChange = 0
              const payloadItem = {
                id: m.node._id,
                sourceInd: m.targetInd,
                newlyCalculatedPriority: m.node.data.priority,
                targetInd: m.sourceInd,
                childCount: m.node.children.length
              }
              items.push(payloadItem)
            }
            this.$store.dispatch('updateMovedItemsBulk', { moveInfo, items })
            if (!this.dependencyViolationsFound()) this.showLastEvent('Item(s) move undone', INFO)
          }
          break
        case 'undoRemove':
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
            this.$store.state.currentProductId = entry.removedNode.productId
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
        case 'undoRemoveSprintIds':
          this.$store.dispatch('addSprintIds', { itemIds: entry.itemIds, sprintId: entry.sprintId, sprintName: entry.sprintName })
        break
        case 'undoSetDependency':
          {
            const lastDependencyId = entry.nodeWithDependencies.dependencies.pop()
            const conditionalForNode = window.slVueTree.getNodeById(lastDependencyId)
            if (conditionalForNode !== null) {
              conditionalForNode.conditionalFor.pop()
              const _id = entry.nodeWithDependencies._id
              const newDeps = entry.nodeWithDependencies.dependencies
              // dispatch the update in the database
              this.$store.dispatch('updateDep', { _id, newDeps, removedIds: [lastDependencyId] })
              this.showLastEvent('Dependency set is undone', INFO)
            } else {
              entry.nodeWithDependencies.dependencies.push(lastDependencyId)
              this.showLastEvent('Cannot undo dependency set. The item with the condition is missing', WARNING)
            }
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
            if (desc.data.state > highestState) highestState = desc.data.state
            if (desc.data.state < DONE && desc.data.state !== REMOVED) allDone = false
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
        if (currentNode.data.state === STATE_NEW_OR_TODO && idx === STATE_READY_OR_INPROGRESS) {
          changeState(this, this.$store.state.userData.myTeam)
          const parentNode = window.slVueTree.getParentNode(currentNode)
          if (parentNode.level >= this.featureLevel && parentNode.data.team !== this.$store.state.userData.myTeam) {
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

    /*
     * Update the database when one or more nodes are dropped on another location
     * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
     */
    nodeDropped(beforeDropStatus, draggingNodes, position) {
      const clickedLevel = beforeDropStatus.sourceLevel

      let levelChange = beforeDropStatus.sourceLevel - beforeDropStatus.targetLevel
      // update the nodes in the database
      const moveInfo = {
        // this info is the same for all nodes moved
        type: 'move',
        sourceProductId: beforeDropStatus.sourceProductId,
        sourceParentId : beforeDropStatus.sourceParentId,
        sourceLevel: beforeDropStatus.sourceLevel,
        levelShift: beforeDropStatus.targetLevel - beforeDropStatus.sourceLevel,
        targetProductId: beforeDropStatus.targetProductId,
        targetParentId: beforeDropStatus.targetParentId,
        placement: position.placement
      }
      let items = []
      for (let dn of draggingNodes) {
        const payloadItem = {
          id: dn._id,
          sourceInd: dn.savedInd,
          newlyCalculatedPriority: dn.data.priority,
          targetInd: dn.ind,
          childCount: dn.children.length
        }
        items.push(payloadItem)
      }
      // console.log('nodeDropped: moveInfo = ' + JSON.stringify(moveInfo, null, 2))
      // console.log('nodeDropped: items = ' + JSON.stringify(items, null, 2))
      this.$store.dispatch('updateMovedItemsBulk', { moveInfo, items })

      // create an entry for undoing the move in a last-in first-out sequence
      const entry = {
        type: 'undoMove',
        beforeDropStatus
      }
      this.$store.state.changeHistory.unshift(entry)

      for (let n of draggingNodes) {
        n.data.lastPositionChange = Date.now()
      }

      if (!this.dependencyViolationsFound()) {
        // create the event message
        const title = this.itemTitleTrunc(60, draggingNodes[0].title)
        let evt = ""
        if (draggingNodes.length === 1) {
          evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.nodeModel.title}'`
        } else {
          evt = `${this.getLevelText(clickedLevel)} '${title}' and ${draggingNodes.length - 1} other item(s) are dropped ${position.placement} '${position.nodeModel.title}'`
        }
        if (levelChange !== 0) evt += ' as ' + this.getLevelText(beforeDropStatus.targetLevel)
        this.showLastEvent(evt, INFO)
      }
    },

    getViewOptions() {
      let options = [
        { text: 'Comments', value: 'comments' },
        { text: 'Attachments', value: 'attachments' },
        { text: 'History', value: 'history' }
      ]
      return options
    }
  }
}
