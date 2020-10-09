import { mapGetters } from 'vuex'
import { authorization, utilities } from '../mixins/generic.js'

const INFO = 0
const WARNING = 1
const ERROR = 2
const HOURINMILIS = 3600000
const MAXUPLOADSIZE = 100000000
const SHORTKEYLENGTH = 5

function created () {
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
  this.areaProductId = 'requirement-areas'
}

function mounted () {
  function isEmpty (str) {
    return !str.replace(/\s+/, '').length
  }

  function shortIdCheck () {
    const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz'
    if (this.shortId.length !== SHORTKEYLENGTH) return false

    for (let i = 0; i < this.shortId.length; i++) {
      if (!alphanum.includes(this.shortId.substring(i, i + 1).toLowerCase())) return false
    }
    return true
  }

  const el = document.getElementById('findItemOnId')
  // fire the search on short id on pressing enter in the select-on-Id input field (instead of submitting the form)
  el.addEventListener('keypress', (event) => {
    if (event.keyCode === 13) {
      event.preventDefault()
      // check for valid input and convert to lowercase
      if (shortIdCheck) {
        window.slVueTree.resetFilters('findItemOnId')
        this.findItemOnId(this.shortId.toLowerCase())
      }
    }
  })
  el.addEventListener('input', () => {
    if (isEmpty(el.value)) {
      window.slVueTree.resetFindOnId('findItemOnId')
    }
  })

  const el2 = document.getElementById('searchInput')
  // fire the search button on pressing enter in the search input field (instead of submitting the form)
  el2.addEventListener('keypress', (event) => {
    if (event.keyCode === 13) {
      event.preventDefault()
      this.searchInTitles()
    }
  })
  el2.addEventListener('input', () => {
    if (isEmpty(el2.value)) {
      window.slVueTree.resetFilters('searchInput')
    }
  })

  const el3 = document.getElementById('titleField')
  // update the item title on pressing enter
  el3.addEventListener('keypress', (event) => {
    if (event.keyCode === 13) {
      event.preventDefault()
      this.updateTitle()
    }
  })
}

function data () {
  return {
    userStorySubtype: 0,
    spikeSubtype: 1,
    defectSubtype: 2,
    shortId: '',
    newDescription: '',
    newAcceptance: '',
    editorToolbar: [
      [{ header: [false, 1, 2, 3, 4, 5, 6] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
      ['link', 'image', 'code-block']
    ],
    // set to an invalid value; must be updated before use
    selectedPbiType: -1,
    // comments, history and attachments
    doAddition: false,
    startFiltering: false,
    isCommentsFilterActive: false,
    isHistoryFilterActive: false,
    newComment: '',
    fileInfo: null,
    newHistory: '',
    filterForCommentPrep: '',
    filterForHistoryPrep: '',
    violationsWereFound: false
  }
}

const computed = {
  ...mapGetters([
    'canCreateComments',
    'canUploadAttachments',
    'getpreviousNodeSelected',
    'getLastSelectedNode',
    'getCurrentItemLevel',
    'getCurrentItemState',
    'getItemSprintName',
    'getCurrentItemTsSize',
    'isAPO',
    'isFollower',
    'myAssignedProductIds',
    'myTeam',
    'teamCalendarInUse'
  ]),

  welcomeMessage () {
    const msg_1 = `Welcome '${this.$store.state.userData.user}'.`
    let msg_2
    if (this.myTeam === 'not assigned yet') {
      msg_2 = ' You are not a team member.'
    } else msg_2 = ` You are member of team '${this.myTeam}'.`
    let msg_3
    if (this.myAssignedProductIds.length === 1) { msg_3 = ` Your current database is set to '${this.$store.state.userData.currentDb}. You have 1 product.` } else {
      msg_3 = ` Your current database is set to '${this.$store.state.userData.currentDb}'.` +
        ` You selected ${this.$store.state.userData.myProductSubscriptions.length} from ${this.myAssignedProductIds.length} products.`
    }
    return msg_1 + msg_2 + msg_3
  },

  squareText () {
    if (this.$store.state.online) {
      this.showLastEvent('You are online again', INFO)
      return 'sync'
    } else {
      this.showLastEvent('You are offline. Restore the connection or wait to continue', WARNING)
      return 'offline'
    }
  },

  squareColor () {
    return this.$store.state.online ? this.$store.state.eventSyncColor : '#ff0000'
  },

  subsribeTitle () {
    if (this.isFollower) {
      return 'Unsubscribe to change notices'
    } else return 'Subscribe to change notices'
  },

  invalidFileName () {
    return this.fileInfo === null || this.fileInfo.name === ''
  },

  uploadToLarge () {
    return this.fileInfo !== null && this.fileInfo.size > MAXUPLOADSIZE
  },

  description: {
    get () {
      return this.$store.state.currentDoc.description
    },
    set (newDescription) {
      this.newDescription = newDescription
    }
  },

  acceptanceCriteria: {
    get () {
      return this.$store.state.currentDoc.acceptanceCriteria
    },
    set (newAcceptanceCriteria) {
      this.newAcceptance = newAcceptanceCriteria
    }
  }
}

const methods = {
  dependencyViolationsFound () {
    const violations = window.slVueTree.findDependencyViolations()
    if (violations.length > 0) {
      this.violationsWereFound = true
      this.showLastEvent('This product has priority inconsistencies. Undo the change or remove the dependency.', WARNING)
      for (const v of violations) {
        window.slVueTree.showDependencyViolations(v)
      }
    } else {
      if (this.violationsWereFound) this.clearLastEvent()
      this.violationsWereFound = false
    }
    return this.violationsWereFound
  },

  stopFiltering () {
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

  resetFindId () {
    this.shortId = ''
    window.slVueTree.resetFindOnId('resetFindId')
  },

  resetSearchTitles () {
    this.$store.state.keyword = ''
    window.slVueTree.resetFilters('resetSearchTitles')
  },

  patchTitle (node) {
    let patch = ''
    if (node.dependencies && node.dependencies.length > 0) patch = '▲ '
    if (node.conditionalFor && node.conditionalFor.length > 0) patch = patch + '▼ '
    if (node.markViolation) patch = patch + '↑ '
    return patch + node.title
  },

  /* Return true if the state of the node has changed in the last hour */
  hasNodeMoved (node) {
    return node.data.lastPositionChange ? Date.now() - node.data.lastPositionChange < HOURINMILIS : false
  },

  hasNewState (node) {
    return node.data.lastStateChange ? Date.now() - node.data.lastStateChange < HOURINMILIS : false
  },

  hasContentChanged (node) {
    return node.data.lastContentChange ? Date.now() - node.data.lastContentChange < HOURINMILIS : false
  },

  hasNewComment (node) {
    return node.data.lastCommentAddition ? Date.now() - node.data.lastCommentAddition < HOURINMILIS : false
  },

  isAttachmentAdded (node) {
    return node.data.lastAttachmentAddition ? Date.now() - node.data.lastAttachmentAddition < HOURINMILIS : false
  },

  hasCommentToHistory (node) {
    return node.data.lastCommentToHistory ? Date.now() - node.data.lastCommentToHistory < HOURINMILIS : false
  },

  hasOtherUpdate (node) {
    return node.data.lastChange ? Date.now() - node.data.lastChange < HOURINMILIS : false
  },

  onSetMyFilters () {
    if (this.$store.state.filterOn) {
      window.slVueTree.resetFilters('onSetMyFilters')
      window.slVueTree.resetFindOnId('onSetMyFilters')
    } else {
      // update the available req area options
      const currReqAreaIds = window.slVueTree.getCurrentReqAreaIds()
      this.$store.state.reqAreaOptions = []
      for (const id of currReqAreaIds) {
        this.$store.state.reqAreaOptions.push({ id, title: this.$store.state.reqAreaMapper[id] })
      }
      window.myFilters.show()
    }
  },

  searchInTitles () {
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
  moveBack (sourceParentId, targetParentId, reverseMoveMap) {
    const parentNode = window.slVueTree.getNodeById(targetParentId)
    if (parentNode === null) return false

    for (const r of reverseMoveMap) {
      const node = r.node
      if (!node) return false

      let cursorPosition
      if (r.targetInd === 0) {
        cursorPosition = {
          nodeModel: parentNode,
          placement: 'inside'
        }
      } else {
        let topSibling
        if (sourceParentId !== targetParentId) {
          topSibling = parentNode.children[r.targetInd - 1]
        } else {
          topSibling = parentNode.children[r.targetInd - (r.sourceInd > r.targetInd ? 1 : 0)]
        }
        if (topSibling === undefined) return false

        cursorPosition = {
          nodeModel: topSibling,
          placement: 'after'
        }
      }
      window.slVueTree.remove([node])
      window.slVueTree.insert(cursorPosition, [node])
      // restore the sprintId
      this.$store.commit('updateNodesAndCurrentDoc', { node, sprintId: r.sprintId })
    }
    return true
  },

  onUndoEvent () {
    const entry = this.$store.state.changeHistory.shift()
    switch (entry.type) {
      case 'undoAcceptanceChange':
        this.$store.dispatch('saveAcceptance', { node: entry.node, newAcceptance: entry.oldAcceptance, timestamp: entry.prevLastContentChange })
        break
      case 'undoAddSprintIds':
        this.$store.dispatch('removeSprintIds', { parentId: entry.parentId, sprintId: entry.sprintId, itemIds: entry.itemIds, sprintName: entry.sprintName })
        break
      case 'undoChangeTeam':
        this.$store.dispatch('assignToMyTeam', { node: entry.node, newTeam: entry.oldTeam, timestamp: entry.prevLastChange })
        break
      case 'undoDescriptionChange':
        this.$store.dispatch('saveDescription', { node: entry.node, newDescription: entry.oldDescription, timestamp: entry.prevLastContentChange })
        break
      case 'undoMove':
        {
          const moveDataContainer = entry.moveDataContainer
          const reverseMoveMap = moveDataContainer.reverseMoveMap
          // swap source and target
          const sourceParentId = moveDataContainer.targetParentId
          const targetParentId = moveDataContainer.sourceParentId
          // the nodes are restored prior to the database update as we need the newly calculated priority to store
          if (this.moveBack(sourceParentId, targetParentId, reverseMoveMap)) {
            // update the nodes in the database
            this.$store.dispatch('updateMovedItemsBulk', { moveDataContainer, undoMove: true })
            if (!this.dependencyViolationsFound()) this.showLastEvent('Item(s) move undone', INFO)
          } else this.showLastEvent('Undo failed. Sign out and -in again to recover.', ERROR)
        }
        break
      case 'undoNewNode':
        this.$store.dispatch('removeBranch', { node: entry.newNode, showUndoneMsg: true })
        break
      case 'undoReqAreaColorChange':
        this.$store.dispatch('updateColorDb', { node: entry.node, newColor: entry.prevColor, createUndo: false })
        break
      case 'undoPersonHoursChange':
        this.$store.dispatch('setPersonHours', { node: entry.node, newHrs: entry.oldPersonHours, timestamp: entry.prevLastChange })
        break
      case 'undoRemove':
        this.showLastEvent('Busy undoing remove...', INFO)
        this.$store.dispatch('restoreItemAndDescendents', entry)
        break
      case 'undoRemoveSprintIds':
        this.$store.dispatch('addSprintIds', { parentId: entry.parentId, itemIds: entry.itemIds, sprintId: entry.sprintId, sprintName: entry.sprintName })
        break
      case 'undoSelectedPbiType':
        this.$store.dispatch('setSubType', { node: entry.node, newSubType: entry.oldSubType, timestamp: entry.prevLastChange })
        break
      case 'undoSetDependency':
        this.$store.dispatch('undoSetDependencyAsync', entry)
        break
      case 'undoStateChange':
        this.$store.dispatch('setState', { node: entry.node, newState: entry.oldState, position: entry.node.ind, timestamp: entry.prevLastChange, showUndoneMsg: true })
        break
      case 'undoStoryPointsChange':
        this.$store.dispatch('setStoryPoints', { node: entry.node, newPoints: entry.oldPoints, timestamp: entry.prevLastChange })
        break
      case 'undoTitleChange':
        this.$store.dispatch('setDocTitle', { node: entry.node, newTitle: entry.oldTitle, timestamp: entry.prevLastContentChange })
        break
      case 'undoTsSizeChange':
        this.$store.dispatch('setTsSize', { node: entry.node, newSizeIdx: entry.oldTsSize, timestamp: entry.prevLastChange })
        break
    }
  },

  subscribeClicked () {
    this.$store.dispatch('changeSubsription', { node: this.getLastSelectedNode, timestamp: Date.now() })
  },

  filterComments () {
    this.$store.state.filterForComment = this.filterForCommentPrep
  },

  uploadAttachment () {
    this.$store.dispatch('uploadAttachmentAsync', {
      node: this.getLastSelectedNode,
      fileInfo: this.fileInfo,
      currentDocId: this.$store.state.currentDoc._id,
      timestamp: Date.now()
    })
  },

  filterHistory () {
    this.$store.state.filterForHistory = this.filterForHistoryPrep
  },

  insertComment () {
    this.$store.dispatch('addComment', {
      node: this.getLastSelectedNode,
      comment: this.newComment,
      timestamp: Date.now()
    })
  },

  insertHist () {
    this.$store.dispatch('addHistoryComment', {
      node: this.getLastSelectedNode,
      comment: this.newHistory,
      timestamp: Date.now()
    })
  },

  /* Tree and database update methods */
  updateDescription (node = this.getLastSelectedNode) {
    if (this.$store.state.currentDoc.description !== this.newDescription) {
      // skip update when not changed
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the description of this item')) {
        this.$store.dispatch('saveDescription', {
          node,
          newDescription: this.newDescription,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  updateAcceptance (node = this.getLastSelectedNode) {
    // skip update when not changed
    if (this.$store.state.currentDoc.acceptanceCriteria !== this.newAcceptance) {
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the acceptance criteria of this item')) {
        this.$store.dispatch('saveAcceptance', {
          node,
          newAcceptance: this.newAcceptance,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  updateTsSize () {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the t-shirt size of this item')) {
      const node = this.getLastSelectedNode
      const size = document.getElementById('tShirtSizeId').value.toUpperCase()
      const sizeArray = this.$store.state.configData.tsSize
      if (sizeArray.includes(size)) {
        const newSizeIdx = sizeArray.indexOf(size)
        if (newSizeIdx !== this.$store.state.currentDoc.tssize) {
          this.$store.dispatch('setTsSize', {
            node,
            newSizeIdx,
            timestamp: Date.now(),
            createUndo: true
          })
        }
      } else {
        let sizes = ''
        for (let i = 0; i < sizeArray.length - 1; i++) {
          sizes += sizeArray[i] + ', '
        }
        alert(size + ' is not a known T-shirt size. Valid values are: ' + sizes + ' and ' + sizeArray[sizeArray.length - 1])
      }
    }
  },

  /* Only authorized users who are member of the owning team can change story points. */
  updateStoryPoints () {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the story points size of this item')) {
      const node = this.getLastSelectedNode
      const el = document.getElementById('storyPointsId')
      if (isNaN(el.value) || el.value < 0) {
        el.value = '?'
        return
      }
      const newPoints = parseInt(el.value)
      if (newPoints !== this.$store.state.currentDoc.spsize) {
        this.$store.dispatch('setStoryPoints', {
          node,
          newPoints,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  updatePersonHours () {
    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change story person hours of this item')) {
      const node = this.getLastSelectedNode
      const el = document.getElementById('personHoursId')
      if (isNaN(el.value) || el.value < 0) {
        el.value = '?'
        return
      }
      const newHrs = el.value
      if (newHrs !== this.$store.state.currentDoc.spikepersonhours) {
        this.$store.dispatch('setPersonHours', {
          node,
          newHrs,
          timestamp: Date.now(),
          createUndo: true
        })
      }
    }
  },

  /*
  * An authorized user can change state if member of the team owning this item.
  * Issue a warning when the user assigns a state to a parent:
  * - to DONE when not all descendants are done
  * - higher than the state of any of its descendants
  *  ToDo: when setting the state to on-hold also set the state of all descendants to on-hold
  */
  onStateChange (newState) {
    function changeState (vm) {
      const node = vm.getLastSelectedNode
      const descendants = window.slVueTree.getDescendantsInfo(node).descendants
      if (descendants.length > 0) {
        let highestState = vm.newState
        let allDone = true
        for (const d of descendants) {
          if (d.data.state > highestState) highestState = d.data.state
          if (d.data.state < vm.doneState) allDone = false
        }
        if (newState > highestState || newState === vm.doneState && !allDone) {
          // node has a higher state than any of its descendants or set to done while one of its descendants is not done
          vm.$store.commit('updateNodesAndCurrentDoc', { node, inconsistentState: true })
          if (newState === vm.doneState && !allDone) {
            vm.showLastEvent('You are assigning an inconsistant state to this item. Not all descendants are done.', WARNING)
          } else vm.showLastEvent('You are assigning an inconsistant state to this item. None of the item\'s descendants reached this state.', WARNING)
        } else {
          vm.$store.commit('updateNodesAndCurrentDoc', { node, inconsistentState: false })
          vm.clearLastEvent()
        }
      }

      vm.$store.dispatch('setState', { node, newState, position: vm.getLastSelectedNode.ind, timestamp: Date.now(), createUndo: true })
    }
    if (newState !== this.$store.state.currentDoc.state) {
      if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the state of this item')) {
        changeState(this)
        const parentNode = window.slVueTree.getParentNode(this.getLastSelectedNode)
        if (parentNode._id != 'root') {
          if (parentNode.data.team !== this.myTeam) {
            this.showLastEvent("The team of parent '" + parentNode.title + "' (" + parentNode.data.team + ') and your team (' +
              this.myTeam + ") do not match. Consider to assign team '" + parentNode.data.team + "' to this item", WARNING)
          }
        }
      }
    }
  },

  updateTitle () {
    const oldTitle = this.$store.state.currentDoc.title
    const newTitle = document.getElementById('titleField').value
    if (oldTitle === newTitle) return

    if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the title of this item')) {
      const node = this.getLastSelectedNode
      // update current document in database
      this.$store.dispatch('setDocTitle', {
        node,
        newTitle: newTitle,
        timestamp: Date.now(),
        createUndo: true
      })
    }
  },

  /* Move the nodes and save the status 'as is' before the move and pdate the database when one or more nodes are dropped on another location */
  nodeDropped (nodes, cursorPosition) {
    const moveDataContainer = this.moveNodes(nodes, cursorPosition)
    const clickedLevel = moveDataContainer.sourceLevel
    const levelShift = moveDataContainer.targetLevel - moveDataContainer.sourceLevel
    this.$store.dispatch('updateMovedItemsBulk', { moveDataContainer, move: true })

    if (!this.dependencyViolationsFound()) {
      // show the event message if no dependency message is displayed
      const title = this.itemTitleTrunc(60, nodes[0].title)
      let evt = ''
      if (nodes.length === 1) {
        evt = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${cursorPosition.placement} '${cursorPosition.nodeModel.title}'`
      } else evt = `${this.getLevelText(clickedLevel)} '${title}' and ${nodes.length - 1} other item(s) are dropped ${cursorPosition.placement} '${cursorPosition.nodeModel.title}'`
      if (levelShift !== 0) evt += ' as ' + this.getLevelText(moveDataContainer.targetLevel)
      this.showLastEvent(evt, INFO)
    }
  },

  getViewOptions () {
    const options = [
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
