import { mapGetters } from 'vuex'
import { eventBus } from "../../main"
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const REMOVED = 0
const DONE = 5
var newNode = {}
var movedNode = null

export default {
  mixins: [utilities],

  created() {
    this.DATABASELEVEL = 1
    this.PRODUCTLEVEL = 2
    this.FEATURELEVEL = 4
    this.PBILEVEL = 5
    this.INSERTBELOW = 0
    this.INSERTINSIDE = 1
    this.MOVETOPRODUCT = 2
    this.REMOVEITEM = 3
    this.ASIGNTOMYTEAM = 4
    this.CHECKSTATES = 5
    this.SETDEPENDENCY = 6
    this.SHOWDEPENDENCIES = 7
    this.SHOWCONDITIONS = 8
  },

  data() {
    return {
      disableOkButton: true,
      contextNodeSelected: undefined,
      contextWarning: undefined,
      contextParentTeam: '',
      contextNodeTitle: '',
      contextNodeLevel: 0,
      contextParentType: '',
      contextNodeType: '',
      contextNodeTeam: '',
      contextChildType: '',
      contextOptionSelected: undefined,
      listItemText: '',
      assistanceText: 'No assistance available',
      showAssistance: false,
      contextNodeDescendantsCount: 0,
      moveSourceProductId: '',
      nodeWithDependencies: undefined,
      hasDependencies: false,
      hasConditions: false,
      dependenciesObjects: [],
      conditionsObjects: []
    }
  },

  mounted() {
    // to fix this.$refs.contextMenuRef undefined when routing away and back, expose instance to the global namespace
    window.showContextMenuRef = this.$refs.contextMenuRef
    eventBus.$on('contextMenu', (node) => {
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
      this.contextOptionSelected = undefined
      this.listItemText = ''
      this.showAssistance = false
      this.disableOkButton = true
      // user must have write access on this level && node must be selected first && user cannot remove the database && only one node can be selected
      if (this.haveWritePermission[node.level] && node._id === this.$store.state.nodeSelected._id &&
        node.level > this.DATABASELEVEL && this.$store.state.numberOfNodesSelected === 1) {
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
        this.hasDependencies = node.dependencies && node.dependencies.length > 0
        this.hasConditions = node.conditionalFor && node.conditionalFor.length > 0
        window.showContextMenuRef.show()
      }
    },

    showSelected(idx) {
      function checkNode(vm, selNode) {
        if (selNode._id === vm.nodeWithDependencies._id) {
          vm.contextWarning = "WARNING: Item cannot be dependent on it self"
          return false
        }
        if (vm.nodeWithDependencies.dependencies.includes(selNode._id)) {
          vm.contextWarning = "WARNING: Cannot add the same dependency twice"
          return false
        }
        if (window.slVueTree.comparePaths(vm.nodeWithDependencies.path, selNode.path) === 1) {
          vm.contextWarning = "WARNING: Cannot create a dependency on an item with higher priority"
          return false
        }
        return true
      }

      this.contextOptionSelected = idx
      this.listItemText = ''
      this.contextWarning = undefined
      this.disableOkButton = false
      switch (this.contextOptionSelected) {
        case this.INSERTBELOW:
          this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level]
          this.listItemText = 'Insert a ' + this.contextNodeType + ' below this item'
          break
        case this.INSERTINSIDE:
          this.assistanceText = this.$store.state.help.help.insert[this.contextNodeSelected.level + 1]
          this.listItemText = 'Insert a ' + this.contextChildType + ' inside this ' + this.contextNodeType
          break
        case this.MOVETOPRODUCT:
          this.assistanceText = this.$store.state.help.help.move
          if (!this.$store.state.moveOngoing) {
            this.listItemText = 'Item selected. Choose drop position in any other product'
          } else this.listItemText = 'Drop position is set'
          break
        case this.REMOVEITEM:
          this.assistanceText = this.$store.state.help.help.remove
          this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendantsCount} descendants`
          break
        case this.ASIGNTOMYTEAM:
          this.assistanceText = this.$store.state.help.help.team
          if (this.contextNodeLevel > this.FEATURELEVEL && this.contextParentTeam !== this.$store.state.userData.myTeam) {
            this.contextWarning = "WARNING: The team of parent " + this.contextParentType + " (" + this.contextParentTeam +
              ") and your team (" + this.$store.state.userData.myTeam + ") do not match. Please read the assistance text."
          } else this.contextWarning = undefined
          this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.$store.state.userData.myTeam}'`
          break
        case this.CHECKSTATES:
          this.assistanceText = this.$store.state.help.help.consistencyCheck
          this.listItemText = `Start the check. See in the tree if any red badges appear`
          break
        case this.SETDEPENDENCY:
          this.assistanceText = 'No assistance available'
          if (!this.$store.state.selectNodeOngoing) {
            this.listItemText = 'Click OK to choose a node this item depends on'
          } else {
            if (checkNode(this, this.contextNodeSelected)) {
              this.listItemText = 'Click OK to set this condition.'
            } else {
              this.listItemText = ''
              this.disableOkButton = true
            }
          }
          break
        case this.SHOWDEPENDENCIES:
          this.assistanceText = 'No assistance available'
          this.getDependencies()
          break
        case this.SHOWCONDITIONS:
          this.assistanceText = 'No assistance available'
          this.getConditions()
          break
        default:
          this.assistanceText = 'No assistance available'
          this.listItemText = 'nothing selected as yet'
      }
    },

    procSelected() {
      this.showAssistance = false
      switch (this.contextOptionSelected) {
        case this.INSERTBELOW:
          this.doInsert()
          break
        case this.INSERTINSIDE:
          this.doInsert()
          break
        case this.MOVETOPRODUCT:
          this.moveItemToOtherProduct()
          break
        case this.REMOVEITEM:
          this.doRemove()
          break
        case this.ASIGNTOMYTEAM:
          this.doChangeTeam()
          break
        case this.CHECKSTATES:
          this.doCheckStates()
          break
        case this.SETDEPENDENCY:
          this.doSelectDependency()
          break
        case this.SHOWDEPENDENCIES:
          this.updateDependencies()
          break
        case this.SHOWCONDITIONS:
          this.updateConditions()
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
        dependencies: [],
        conditionalFor: [],
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
          state: 2,
          lastStateChange: now,
          team: 'not assigned yet',
          subtype: 0,
          lastChange: now,
          sessionId: this.$store.state.userData.sessionId,
          distributeEvent: true
        }
      }
      let insertLevel = this.contextNodeSelected.level
      if (this.contextOptionSelected === this.INSERTBELOW) {
        // new node is a sibling placed below (after) the selected node
        newNodeLocation = {
          nodeModel: this.contextNodeSelected,
          placement: 'after'
        }
        idx = locationPath.slice(-1)[0] + 1
        path = locationPath.slice(0, -1).concat(idx)
        newNode.parentId = this.contextNodeSelected.parentId
        newNode.title = 'New ' + this.getLevelText(insertLevel)
        newNode.isLeaf = (insertLevel < this.PBILEVEL) ? false : true
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
        newNode.isLeaf = (insertLevel < this.PBILEVEL) ? false : true
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
          "state": 2,
          "tssize": 3,
          "spsize": 0,
          "spikepersonhours": 0,
          "reqarea": null,
          "dependencies": [],
          "conditionalFor": [],
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
      if (selectedNode.level === this.PRODUCTLEVEL) {
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
        type: 'removedNode',
        removedNode: selectedNode,
        isProductRemoved: selectedNode.level === this.PRODUCTLEVEL,
        grandParentId: selectedNode.parentId,
        parentId: selectedNode._id,
        parentPath: selectedNode.path,
        descendants: descendants
      }

      this.$store.state.changeHistory.unshift(entry)
      // before removal select the predecessor or sucessor of the removed node (sibling or parent)
      const prevNode = window.slVueTree.getPreviousNode(path)
      let nowSelectedNode = prevNode
      if (prevNode.level === this.DATABASELEVEL) {
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
      if (this.contextNodeSelected.level > this.FEATURELEVEL) {
        this.$store.dispatch('setTeam', [])
        this.showLastEvent(`The owning team of '${this.contextNodeSelected.title}' is changed to '${this.$store.state.userData.myTeam}'.`, INFO)
      } else {
        if (this.contextNodeSelected.level >= this.PRODUCTLEVEL) {
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
            // node has a higher state than any of its descendants or set to done while one of its descendants is not done
            nm.data.inconsistentState = true
            count++
          } else nm.data.inconsistentState = false
        }
      }, [this.contextNodeSelected])
      this.showLastEvent(`${count} inconsistencies are found.`, INFO)
    },

    doSelectDependency() {
      if (this.$store.state.selectNodeOngoing) {
        this.nodeWithDependencies.dependencies.push(this.contextNodeSelected._id)
        this.$store.dispatch('setDependencies', { _id: this.nodeWithDependencies._id, dependencies: this.nodeWithDependencies.dependencies })

        this.contextNodeSelected.conditionalFor.push(this.nodeWithDependencies._id)
        this.$store.dispatch('setConditions', { _id: this.contextNodeSelected._id, conditionalFor: this.contextNodeSelected.conditionalFor })

        this.$store.state.selectNodeOngoing = false
      } else {
        // save the node the dependencies will be attached to; Note: will be undefined when autocompiled at file save
        this.nodeWithDependencies = this.contextNodeSelected
        this.$store.state.selectNodeOngoing = true
      }
    },

    getDependencies() {
      this.dependenciesObjects = []
      for (let depId of this.contextNodeSelected.dependencies) {
        const item = window.slVueTree.getNodeById(depId)
        if (item) {
          this.dependenciesObjects.push({ _id: depId, title: item.title })
        }
      }
    },

    getConditions() {
      this.conditionsObjects = []
      for (let condId of this.contextNodeSelected.conditionalFor) {
        const item = window.slVueTree.getNodeById(condId)
        if (item) {
          this.conditionsObjects.push({ _id: condId, title: item.title })
        }
      }
    },

    /* Remove the dependency from the view only, not yet in the database. */
    removeDependency(id) {
      let iDArray = []
      for (let depId of this.dependenciesObjects) {
        if (id !== depId._id) iDArray.push(depId)
      }
      this.dependenciesObjects = iDArray
    },

    /* Remove the condition from the view only, not yet in the database. */
    removeCondition(id) {
      let iDArray = []
      for (let condId of this.conditionsObjects) {
        if (id !== condId._id) iDArray.push(condId)
      }
      this.conditionsObjects = iDArray
    },

    /* Update the dependencies and the corresponding conditions in the tree model and the database. */
    updateDependencies() {
      let iDArray = []
      for (let depId of this.dependenciesObjects) {
        iDArray.push(depId._id)
      }
      let removedIds = []
      for (let id of this.contextNodeSelected.dependencies) {
        if (!iDArray.includes(id)) removedIds.push(id)
      }
      this.contextNodeSelected.dependencies = iDArray
      this.$store.dispatch('setDependencies', { _id: this.contextNodeSelected._id, dependencies: iDArray })
      for (let id of removedIds) {
        const node = window.slVueTree.getNodeById(id)
        let iDArray = []
        for (let condId of node.conditionalFor) {
          if (condId !== this.contextNodeSelected._id) iDArray.push(id)
        }
        node.conditionalFor = iDArray
        this.$store.dispatch('setConditions', { _id: node._id, conditionalFor: iDArray })
      }
    },

    /* Update the conditions and the corresponding dependencies in the tree model and the database. */
    updateConditions() {
      let iDArray = []
      for (let condId of this.conditionsObjects) {
        iDArray.push(condId._id)
      }
      let removedIds = []
      for (let id of this.contextNodeSelected.conditionalFor) {
        if (!iDArray.includes(id)) removedIds.push(id)
      }
      this.contextNodeSelected.conditionalFor = iDArray
      this.$store.dispatch('setConditions', { _id: this.contextNodeSelected._id, conditionalFor: iDArray })
      for (let id of removedIds) {
        const node = window.slVueTree.getNodeById(id)
        let iDArray = []
        for (let depId of node.dependencies) {
          if (depId !== this.contextNodeSelected._id) iDArray.push(id)
        }
        node.dependencies = iDArray
        this.$store.dispatch('setDependencies', { _id: node._id, dependencies: iDArray })
      }
    },

    doCancel() {
      this.showAssistance = false
      this.$store.state.moveOngoing = false
      this.$store.state.selectNodeOngoing = false
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
          'type': 'move',
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
        this.$store.dispatch('nodesMovedorBack', {
          next: 0,
          payloadArray: [payloadItem]
        })
        this.$store.state.moveOngoing = false
      } else {
        this.$store.state.moveOngoing = true
        this.moveSourceProductId = this.$store.state.load.currentProductId
        movedNode = this.contextNodeSelected
      }
    }
  }
}
