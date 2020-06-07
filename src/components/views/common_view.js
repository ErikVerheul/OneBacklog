import { mapGetters } from 'vuex'
import { authorization, utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const ERROR = 2
const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const STATE_READY = 3
const SHORTKEYLENGTH = 5
var violationsWereFound = false

function created() {
  this.removedState = 0
  this.onholdState = 1
  this.newState = 2
  this.readyState = 3
  this.inProgressState = 4
  this.doneState = 6

  this.todoState = 2
  this.ReadyForTestReview = 5

  this.databaseLevel = 1
  this.productLevel = 2
  this.epicLevel = 3
  this.featureLevel = 4
  this.pbiLevel = 5
  this.taskLevel = 6
  this.areaProductId = '0'
}

function mounted() {
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
}

function data() {
  return {
    userStorySubtype: 0,
    spikeSubtype: 1,
    defectSubtype: 2,
    shortId: '',
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
}

const computed = {
  ...mapGetters([
    'canCreateComments',
    'canUploadAttachments',
    'getpreviousNodeSelected',
    'getNodeSelected',
    'getCurrentItemLevel',
    'getCurrentItemState',
    'getItemSprintName',
    'getCurrentItemTsSize',
    'isAPO',
    'isFollower',
    'myTeam',
    'teamCalendarInUse'
  ]),

  welcomeMessage() {
    const msg_1 = `Welcome '${this.$store.state.userData.user}'.`
    let msg_2
    if (this.myTeam === 'not assigned yet') {
      msg_2 = ' You are not a team member.'
    } else msg_2 = ` You are member of team '${this.myTeam}'.`
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
      this.showLastEvent("You are online again", INFO)
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
}

const methods = {
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

  /*
	* Restore the nodes in their previous (source) position.
	* Return true on success or false if the parent node does not exist or siblings have been removed (via sync by other user)
	*/
  moveBack(sourceParentId, targetParentId, swappedIndmap) {
    const parentNode = window.slVueTree.getNodeById(targetParentId)
    if (parentNode === null) return false

    for (let s of swappedIndmap) {
      const node = window.slVueTree.getNodeById(s.nodeId)
      if (node === null) return false

      let cursorPosition
      if (s.targetInd === 0) {
        cursorPosition = {
          nodeModel: parentNode,
          placement: 'inside'
        }
      } else {
        let topSibling
        if (sourceParentId !== targetParentId) {
          topSibling = parentNode.children[s.targetInd - 1]
        } else {
          topSibling = parentNode.children[s.targetInd - (s.sourceInd > s.targetInd ? 1 : 0)]
        }
        if (topSibling === undefined) return false

        cursorPosition = {
          nodeModel: topSibling,
          placement: 'after'
        }
      }
      window.slVueTree.remove([node])
      window.slVueTree.insert(cursorPosition, [node])
    }
    return true
  },

  onUndoEvent() {
    const entry = this.$store.state.changeHistory.shift()
    switch (entry.type) {
      case 'undoAddSprintIds':
        this.$store.dispatch('removeSprintIds', { parentId: entry.parentId, sprintId: entry.sprintId, itemIds: entry.itemIds, sprintName: entry.sprintName })
        this.showLastEvent('Item(s) to sprint assignment is undone', INFO)
        break
      case 'undoSelectedPbiType':
        this.$store.dispatch('setSubType', { node: entry.node, newSubType: entry.oldSubType, timestamp: Date.now() })
        this.showLastEvent('Change of item type is undone', INFO)
        break
      case 'undoDescriptionChange':
        this.$store.dispatch('saveDescription', { node: entry.node, newDescription: entry.oldDescription, timestamp: Date.now() })
        this.showLastEvent('Change of item description type is undone', INFO)
        break
      case 'undoAcceptanceChange':
        this.$store.dispatch('saveAcceptance', { node: entry.node, newAcceptance: entry.oldAcceptance, timestamp: Date.now() })
        this.showLastEvent('Change of item acceptance criteria type is undone', INFO)
        break
      case 'undoTsSizeChange':
        this.$store.dispatch('setTsSize', { node: entry.node, newSizeIdx: entry.oldTsSize, timestamp: Date.now() })
        this.showLastEvent('Change of item T-shirt size is undone', INFO)
        break
      case 'undoStoryPointsChange':
        this.$store.dispatch('setStoryPoints', { node: entry.node, newPoints: entry.oldPoints, timestamp: Date.now() })
        this.showLastEvent('Change of item story points is undone', INFO)
        break
      case 'undoPersonHoursChange':
        this.$store.dispatch('setPersonHours', { node: entry.node, newHrs: entry.oldPersonHours, timestamp: Date.now() })
        this.showLastEvent('Change of spike person hours is undone', INFO)
        break
      case 'undoChangeTeam':
        this.$store.dispatch('setTeam', { node: entry.node, newTeam: entry.oldTeam })
        this.showLastEvent('Change of owning team is undone', INFO)
        break
      case 'undoStateChange':
        // reset inconsistency mark if set
        entry.node.data.inconsistentState = false
        this.$store.dispatch('setState', {
          node: entry.node,
          newState: entry.oldState,
          position: entry.node.ind,
          timestamp: Date.now()
        })
        this.showLastEvent('Change of item state is undone', INFO)
        break
      case 'undoTitleChange':
        this.$store.dispatch('setDocTitle', { node: entry.node, newTitle: entry.oldTitle, timestamp: Date.now() })
        this.showLastEvent('Change of item title is undone', INFO)
        break
      case 'undoNewNode':
        if (window.slVueTree.remove([entry.newNode])) {
          this.$store.dispatch('removeItemAndDescendents', { productId: entry.newNode.productId, node: entry.newNode, descendantsIds: [], sprintIds: [] })
          this.showLastEvent('Item addition is undone', INFO)
        } else this.showLastEvent('Item was already removed', INFO)
        break
      case 'undoMove':
        {
          const beforeDropStatus = entry.beforeDropStatus
          const sourceIndMap = beforeDropStatus.movedNodesData.sourceIndMap
          // swap source and target
          const sourceParentId = beforeDropStatus.targetParentId
          const targetParentId = beforeDropStatus.sourceParentId
          const swappedIndmap = sourceIndMap.slice()
          for (let m of sourceIndMap) {
            let val = m.sourceInd
            m.sourceInd = m.targetInd
            m.targetInd = val
          }
          if (this.moveBack(sourceParentId, targetParentId, swappedIndmap)) {
            // update the nodes in the database
            this.$store.dispatch('updateMovedItemsBulk', { beforeDropStatus, swappedIndmap, undoMove: true })
            if (!this.dependencyViolationsFound()) this.showLastEvent('Item(s) move undone', INFO)
          } else this.showLastEvent('Undo failed. Sign out and -in again to recover.', ERROR)
        }
        break
      case 'undoRemove':
        {
          // restore the removed node
          let parentNode = window.slVueTree.getNodeById(entry.removedNode.parentId)
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
            // unselect the current node and select the recovered node
            this.$store.commit('updateNodeSelected', { isSelected: false })
            this.$store.commit('updateNodeSelected', { newNode: entry.removedNode })
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
        }
        break
      case 'undoRemoveSprintIds':
        this.$store.dispatch('addSprintIds', { parentId: entry.parentId, itemIds: entry.itemIds, sprintId: entry.sprintId, sprintName: entry.sprintName })
        this.showLastEvent('Item(s) from sprint removal is undone', INFO)
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
  },

  subscribeClicked() {
    this.$store.dispatch('changeSubsription')
  },

  filterComments() {
    this.$store.state.filterForComment = this.filterForCommentPrep
  },

  uploadAttachment() {
    const now = Date.now()
    this.$store.commit('updateNodeSelected', { lastAttachmentAddition: now, lastChange: now })
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
    this.$store.commit('updateNodeSelected', { lastCommentAddition: now, lastChange: now })
    this.$store.dispatch('addComment', {
      'comment': this.newComment,
      'timestamp': now
    })
  },

  insertHist() {
    const now = Date.now()
    this.$store.commit('updateNodeSelected', { lastCommentToHistory: now, lastChange: now })
    this.$store.dispatch('addHistoryComment', {
      'comment': this.newHistory,
      'timestamp': now
    })
  },

  /* Tree and database update methods */
  updateDescription() {
    if (this.$store.state.currentDoc.description !== this.newDescription) {
      // skip update when not changed
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the description of this item')) {
        this.$store.dispatch('saveDescription', {
          node: this.getNodeSelected,
          newDescription: this.newDescription,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  updateAcceptance() {
    // skip update when not changed
    if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the acceptance criteria of this item')) {
        this.$store.dispatch('saveAcceptance', {
          node: this.getNodeSelected,
          newAcceptance: this.newAcceptance,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  updateTsSize() {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the t-shirt size of this item')) {
      const node = this.getNodeSelected
      const now = Date.now()
      let size = document.getElementById("tShirtSizeId").value.toUpperCase()
      const sizeArray = this.$store.state.configData.tsSize
      if (sizeArray.includes(size)) {
        // size is not a node prop; no update needed
        this.$store.commit('updateNodeSelected', { lastChange: now })
        this.$store.dispatch('setTsSize', {
          node,
          newSizeIdx: sizeArray.indexOf(size),
          timestamp: now,
          createUndo: true
        })
      } else {
        let sizes = ''
        for (let i = 0; i < sizeArray.length - 1; i++) {
          sizes += sizeArray[i] + ', '
        }
        alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
      }
    }
  },

  /* Only authorized users who are member of the owning team can change story points. */
  updateStoryPoints() {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the story points size of this item')) {
      const node = this.getNodeSelected
      let el = document.getElementById("storyPointsId")
      if (isNaN(el.value) || el.value < 0) {
        el.value = '?'
        return
      }
      this.$store.dispatch('setStoryPoints', {
        node,
        newPoints: parseInt(el.value),
        timestamp: Date.now(),
        createUndo: true
      })
    }
  },

  updatePersonHours() {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change story person hours of this item')) {
      const node = this.getNodeSelected
      let el = document.getElementById("personHoursId")
      if (isNaN(el.value) || el.value < 0) {
        el.value = '?'
        return
      }
      this.$store.dispatch('setPersonHours', {
        node,
        newHrs: el.value,
        timestamp: Date.now(),
        createUndo: true
      })
    }
  },

  /*
  * An authorized user can change state if member of the team owning this item.
  * Issue a warning when the user assigns a state to a parent:
  * - to DONE when not all descendants are done
  * - higher than the state of any of its descendants
  */
  onStateChange(newState) {
    function changeState(vm) {
      const descendants = window.slVueTree.getDescendantsInfo(vm.getNodeSelected).descendants
      if (descendants.length > 0) {
        let highestState = vm.newState
        let allDone = true
        for (let d of descendants) {
          if (d.data.state > highestState) highestState = d.data.state
          if (d.data.state < vm.doneState && d.data.state !== vm.removedState) allDone = false
        }
        if (newState > highestState || newState === vm.doneState && !allDone) {
          // node has a higher state than any of its descendants or set to done while one of its descendants is not done
          vm.$store.commit('updateNodeSelected', { inconsistentState: true })
          if (newState === vm.doneState && !allDone) {
            vm.showLastEvent("You are assigning an inconsistant state to this node. Not all descendants are done.", WARNING)
          } else vm.showLastEvent(`You are assigning an inconsistant state to this node. You can set it to '${vm.getItemStateText(highestState)}'.`, WARNING)
        } else {
          vm.$store.commit('updateNodeSelected', { inconsistentState: false })
          vm.clearLastEvent()
        }
      }
      const node = vm.getNodeSelected
      vm.$store.dispatch('setState', {
        node,
        newState: newState,
        position: vm.getNodeSelected.ind,
        timestamp: Date.now(),
        createUndo: true
      })
    }

    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the state of this item')) {
      changeState(this)
      const parentNode = window.slVueTree.getParentNode(this.getNodeSelected)
      if (parentNode._id != 'root') {
        if (parentNode.data.team !== this.myTeam) {
          this.showLastEvent("The team of parent '" + parentNode.title + "' (" + parentNode.data.team + ") and your team (" +
            this.myTeam + ") do not match. Consider to assign team '" + parentNode.data.team + "' to this item", WARNING)
        }
      }
    }
  },

  updateTitle() {
    const oldTitle = this.$store.state.currentDoc.title
    const newTitle = document.getElementById("titleField").value
    if (oldTitle === newTitle) return

    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the title of this item')) {
      const node = this.getNodeSelected
      const now = Date.now()
      // update the current node
      this.$store.commit('updateNodeSelected', { title: newTitle, lastContentChange: now, lastChange: now })
      // update current document in database
      this.$store.dispatch('setDocTitle', {
        node,
        newTitle: newTitle,
        timestamp: now,
        createUndo: true
      })
    }
  },

  /* Update the database when one or more nodes are dropped on another location */
  nodeDropped(beforeDropStatus, draggingNodes, position) {
    const clickedLevel = beforeDropStatus.sourceLevel

    const levelShift = beforeDropStatus.targetLevel - beforeDropStatus.sourceLevel
    // update the nodes in the database
    let items = []
    for (let dn of draggingNodes) {
      const payloadItem = {
        id: dn._id,
        level: dn.level,
        sourceInd: dn.savedInd,
        newlyCalculatedPriority: dn.data.priority,
        targetInd: dn.ind,
        childCount: dn.children.length
      }
      items.push(payloadItem)
    }

    this.$store.dispatch('updateMovedItemsBulk', { beforeDropStatus, items, move: true })

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
      if (levelShift !== 0) evt += ' as ' + this.getLevelText(beforeDropStatus.targetLevel)
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

export default {
  mixins: [authorization, utilities],
  created,
  mounted,
  data,
  computed,
  methods
}
