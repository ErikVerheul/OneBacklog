import { mapGetters } from 'vuex'
import { eventBus } from "../../main"
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const ROOTLEVEL = 1
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const PBILEVEL = 5
const REMOVED = 0
const DONE = 5
var newNode = {}
var movedNode = null

export default {
  mixins: [utilities],
  data() {
    return {
      pbiLevel: PBILEVEL,
      featureLevel: FEATURELEVEL,
      productLevel: PRODUCTLEVEL,
      contextNodeSelected: undefined,
      contextParentTeam: '',
      contextNodeTitle: '',
      contextNodeLevel: 0,
      contextParentType: '',
      contextNodeType: '',
      contextNodeTeam: '',
      contextChildType: '',
      contextSelected: undefined,
      insertOptionSelected: 1,
      currentAssistanceNr: undefined,
      assistanceText: "",
      showAssistance: false,
      contextNodeDescendantsCount: 0,
      moveSourceProductId: '',
    }
  },

  mounted() {
    // to fix this.$refs.contextMenuRef undefined when routing away and back, expose instance to the global namespace
    window.showContextMenuRef = this.$refs.contextMenuRef
    eventBus.$on('context', (node) => {
      this.showContextMenu(node)
    })
  },

  computed: {
    ...mapGetters([
      // from load.js
      'haveWritePermission'
    ]),
  },

  methods: {
    showContextMenu(node) {
      this.contextSelected = undefined
      this.currentAssistanceNr = undefined
      this.insertOptionSelected = 1
      // user must have write access on this level && node must be selected first && user cannot remove the database && only one node can be selected
      if (this.haveWritePermission[node.level] && node._id === this.$store.state.nodeSelected._id && node.level > 1 && this.$store.state.numberOfNodesSelected === 1) {
        const parentNode = window.slVueTree.getParentNode(node)
        this.contextNodeSelected = node
        this.contextParentTeam = parentNode.data.team
        this.contextParentType = this.getLevelText(parentNode.level)
        this.contextNodeTitle = node.title
        this.contextNodeLevel = node.level
        this.contextNodeType = this.getLevelText(node.level)
        this.contextChildType = this.getLevelText(node.level + 1)
        this.contextNodeDescendantsCount = window.slVueTree.getDescendantsInfo(node).count
        this.contextNodeTeam = node.data.team
        window.showContextMenuRef.show()
      }
    },

    showSelected() {
      switch (this.contextSelected) {
        case 0:
          this.contextWarning = undefined
          this.insertOptionSelected = 1
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          return 'Insert a ' + this.contextNodeType + ' below this item'
        case 1:
          this.insertOptionSelected = 2
          this.contextWarning = undefined
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          return 'Insert a ' + this.contextChildType + ' inside this ' + this.contextNodeType
        case 2:
          this.contextWarning = undefined
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          if (!this.$store.state.moveOngoing) {
            return 'Item selected. Choose drop position in any other product'
          } else {
            return 'Drop position is set'
          }
        case 3:
          this.contextWarning = undefined
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          return `Remove this ${this.contextNodeType} and ${this.contextNodeDescendantsCount} descendants`
        case 4:
          if (this.contextNodeLevel > 4 && this.contextParentTeam !== this.$store.state.userData.myTeam) {
            this.contextWarning = "WARNING: The team of parent " + this.contextParentType + " (" + this.contextParentTeam +
              ") and your team (" + this.$store.state.userData.myTeam + ") do not match. Please read the assistance text."
          } else this.contextWarning = undefined
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          return `Assign this ${this.contextNodeType} to my team '${this.$store.state.userData.myTeam}'`
        case 5:
          this.contextWarning = undefined
          this.showAssistance = this.currentAssistanceNr !== undefined && this.contextSelected === this.currentAssistanceNr
          return `Start the check. See in the tree if any red badges appear`
        default:
          this.contextWarning = undefined
          return 'nothing selected as yet'
      }
    },

    contextAssistance(opt) {
      this.currentAssistanceNr = opt
      switch (opt) {
        case 0:
          this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level]
          break
        case 1:
          this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level + 1]
          break
        case 2:
          this.assistanceText = this.$store.state.help.help.move
          break
        case 3:
          this.assistanceText = this.$store.state.help.help.remove
          break
        case 4:
          this.assistanceText = this.$store.state.help.help.team
          break
        case 5:
          this.assistanceText = this.$store.state.help.help.consistencyCheck
          break
        default:
          this.assistanceText = 'No assistance available'
      }
    },

    procSelected() {
      this.currentAssistanceNr = undefined
      switch (this.contextSelected) {
        case 0:
          this.doInsert()
          break
        case 1:
          this.doInsert()
          break
        case 2:
          this.moveItemToOtherProduct()
          break
        case 3:
          this.doRemove()
          break
        case 4:
          this.doChangeTeam()
          break
        case 5:
          this.doCheckStates()
          break
      }
    },

		/*
		 * Create and insert a new node in the tree and create a document for this new item
		 * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
		 */
    doInsert() {
      const locationPath = this.contextNodeSelected.path
      let newNodeLocation
      let path
      let idx
      let now = Date.now()
      // prepare the new node for insertion and set isSelected to true
      newNode = {
        productId: this.$store.state.load.currentProductId,
        children: [],
        isExpanded: false,
        savedIsExpanded: false,
        isDraggable: true,
        isSelectable: true,
        isSelected: true,
        doShow: true,
        savedDoShow: true,
        data: {
          priority: null,
          state: 0,
          lastStateChange: now,
          team: 'not assigned yet',
          subtype: 0,
          lastChange: now,
          sessionId: this.$store.state.userData.sessionId,
          distributeEvent: true
        }
      }
      let insertLevel = this.contextNodeSelected.level
      if (this.insertOptionSelected === 1) {
        // new node is a sibling placed below (after) the selected node
        newNodeLocation = {
          nodeModel: this.contextNodeSelected,
          placement: 'after'
        }
        idx = locationPath.slice(-1)[0] + 1
        path = locationPath.slice(0, -1).concat(idx)
        newNode.parentId = this.contextNodeSelected.parentId
        newNode.title = 'New ' + this.getLevelText(insertLevel)
        newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
      } else {
        // new node is a child placed a level lower (inside) than the selected node
        insertLevel += 1

        newNodeLocation = {
          nodeModel: this.contextNodeSelected,
          placement: 'inside'
        }
        idx = 0
        path = this.contextNodeSelected.path.concat(0)
        newNode.parentId = this.contextNodeSelected._id
        newNode.title = 'New ' + this.getLevelText(insertLevel)
        newNode.isLeaf = (insertLevel < PBILEVEL) ? false : true
      }
      // add the location values
      newNode.path = path
      newNode.pathStr = JSON.stringify(path)
      newNode.ind = idx
      newNode.level = path.length

      if (this.haveWritePermission[insertLevel]) {
        // create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
        const extension = Math.random().toString(36).replace('0.', '').substr(0, 5)
        const newId = Date.now().toString().concat(extension)
        newNode._id = newId
        newNode.shortId = extension
        if (newNodeLocation.placement === 'inside') {
          // unselect the node that was clicked before the insert and expand it to show the inserted node
          this.contextNodeSelected.isSelected = false
          this.contextNodeSelected.isExpanded = true
        } else {
          // unselect the node that was clicked before the insert
          this.contextNodeSelected.isSelected = false
        }
        // insert the new node in the tree
        window.slVueTree.insertSingle(newNodeLocation, newNode)
        // and select the new node
        this.$store.state.nodeSelected = newNode
        this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
        // create a new document and store it
        const initData = {
          "_id": newNode._id,
          "shortId": newNode.shortId,
          "type": "backlogItem",
          "productId": newNode.productId,
          "parentId": newNode.parentId,
          "team": "not assigned yet",
          "level": insertLevel,
          "subtype": 0,
          "state": 0,
          "tssize": 3,
          "spsize": 0,
          "spikepersonhours": 0,
          "reqarea": null,
          "title": newNode.title,
          "followers": [],
          "description": window.btoa(""),
          "acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
          "priority": newNode.data.priority,
          "attachments": [],
          "comments": [],
          "history": [{
            "createEvent": [insertLevel, this.contextNodeSelected.title],
            "by": this.$store.state.userData.user,
            "email": this.$store.state.userData.email,
            "timestamp": Date.now(),
            "sessionId": this.$store.state.userData.sessionId,
            "distributeEvent": true
          }],
          "delmark": false
        }
        // update the database
        this.$store.dispatch('createDoc', {
          'initData': initData
        })
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to create new items of this type", WARNING)
      }
    },

    /* In the database both the selected node and all its descendants will be tagged with a delmark */
    doRemove() {
      const selectedNode = this.contextNodeSelected
      const descendantsInfo = window.slVueTree.getDescendantsInfo(selectedNode)
      this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
      const path = selectedNode.path
      const descendants = descendantsInfo.descendants
      // when removing a product
      if (selectedNode.level === PRODUCTLEVEL) {
        // cannot remove the last assigned product or product in the tree
        if (this.$store.state.userData.userAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
          this.showLastEvent("You cannot remove your last assigned product, but you can remove the epics", WARNING)
          return
        }
        // Add the removed product id to the removeProducts list in the config document
        this.$store.dispatch('addToRemovedProducts', selectedNode._id)
      }
      // set remove mark in the database on the clicked item and decendants (if any)
      const payload = {
        'node': selectedNode,
        'descendants': descendants
      }
      this.$store.dispatch('removeDoc', payload)

      // create an entry for undoing the remove in a last-in first-out sequence
      const entry = {
        removedNode: selectedNode,
        isProductRemoved: selectedNode.level === PRODUCTLEVEL,
        grandParentId: selectedNode.parentId,
        parentId: selectedNode._id,
        parentPath: selectedNode.path,
        descendants: descendants
      }

      this.$store.state.removeHistory.unshift(entry)
      // before removal select the predecessor or sucessor of the removed node (sibling or parent)
      const prevNode = window.slVueTree.getPreviousNode(path)
      let nowSelectedNode = prevNode
      if (prevNode.level === ROOTLEVEL) {
        // if a product is to be removed and the previous node is root, select the next product
        const nextProduct = window.slVueTree.getNextSibling(path)
        if (nextProduct === null) {
          // there is no next product; cannot remove the last product; note that this action is already blocked with a warming
          return
        }
        nowSelectedNode = nextProduct
      }
      nowSelectedNode.isSelected = true
      this.$store.state.nodeSelected = nowSelectedNode
      this.$store.state.load.currentProductId = nowSelectedNode.productId
      // load the new selected item
      this.$store.dispatch('loadDoc', nowSelectedNode._id)
      // remove the node and its children
      window.slVueTree.removeSingle(selectedNode, nowSelectedNode)
    },

    doChangeTeam() {
      this.contextNodeSelected.data.team = this.$store.state.userData.myTeam
      if (this.contextNodeSelected.level > FEATURELEVEL) {
        this.$store.dispatch('setTeam', [])
        this.showLastEvent(`The owning team of '${this.contextNodeSelected.title}' is changed to '${this.$store.state.userData.myTeam}'.`, INFO)
      } else {
        if (this.contextNodeSelected.level >= PRODUCTLEVEL) {
          const descendantsInfo = window.slVueTree.getDescendantsInfo(this.contextNodeSelected)
          for (let desc of descendantsInfo.descendants) {
            desc.data.team = this.$store.state.userData.myTeam
          }
          this.$store.dispatch('setTeam', descendantsInfo.descendants)
          this.showLastEvent(`The owning team of '${this.contextNodeSelected.title}' and ${descendantsInfo.count} descendants is changed to '${this.$store.state.userData.myTeam}'.`, INFO)
        }
      }
    },

    doCheckStates() {
      let count = 0
      window.slVueTree.traverseModels((nm) => {
        let descendants = window.slVueTree.getDescendantsInfo(nm).descendants
        if (descendants.length > 0) {
          let highestState = 0
          let allDone = true
          for (let desc of descendants) {
            if (desc.data.state > highestState) highestState = desc.data.state
            if (desc.data.state < DONE && desc.data.state !== REMOVED) allDone = false
          }
          if (nm.data.state > highestState || nm.data.state === DONE && !allDone) {
            // node has a higher state than one or more of its descendants or set to done while one of its descendants is not done
            nm.data.inconsistentState = true
            count++
          } else nm.data.inconsistentState = false
        }
      }, [this.contextNodeSelected])
      this.showLastEvent(`${count} inconsistencies are found.`, INFO)
    },

    doCancel() {
      this.currentAssistanceNr = undefined
      this.$store.state.moveOngoing = false
    },

    moveItemToOtherProduct() {
      if (this.$store.state.moveOngoing) {
        const targetPosition = window.slVueTree.lastSelectCursorPosition
        const targetNode = targetPosition.nodeModel
        // only allow move to new parent 1 level higher (lower value) than the source node
        if (targetPosition.nodeModel.level !== movedNode.level - 1) {
          this.showLastEvent('You can only move to a ' + this.getLevelText(movedNode.level - 1), WARNING)
          return
        }
        const sourceProductNode = window.slVueTree.getNodeById(movedNode.productId)
        // move the node to the new place and update the productId and parentId
        window.slVueTree.moveNodes(targetPosition, [movedNode])
        // the path to new node is immediately below the selected node
        const newPath = targetNode.path.concat([0])
        const newNode = window.slVueTree.getNodeModel(newPath)
        const newParentNode = window.slVueTree.getNodeById(newNode.parentId)
        const payloadItem = {
          '_id': newNode._id,
          'oldProductTitle': sourceProductNode.title,
          'productId': newNode.productId,
          'newParentId': newNode.parentId,
          'newPriority': newNode.data.priority,
          'newParentTitle': newParentNode.title,
          'oldParentTitle': newNode.title,
          'oldLevel': newNode.level,
          'newLevel': newNode.level, // the level cannot change
          'newInd': 0, // immediately below the parent
          'placement': 'inside',
          'descendants': window.slVueTree.getDescendantsInfo(newNode).descendants
        }
        // update the database
        this.$store.dispatch('updateDropped', {
          next: 0,
          payloadArray: [payloadItem]
        })
        this.$store.state.moveOngoing = false
      } else {
        this.$store.state.moveOngoing = true
        this.moveSourceProductId = this.$store.state.load.currentProductId
        movedNode = this.contextNodeSelected
      }
    },

  }
}
