import { mapGetters } from 'vuex'
import { eventBus } from "../../main"
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const ERROR = 2
const REMOVED = 0
const DONE = 5
const STATENEW = 0
const PBILEVEL = 5
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
    this.CLONEPRODUCT = 9
    this.CLONEITEM = 10
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
      nodeWithDependenciesId: undefined,
      hasDependencies: false,
      hasConditions: false,
      allowRemoval: false,
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
      // for access to the context menu all roles get an extra level, however they cannot change the item's properties
      const extraLevel = node.level < PBILEVEL ? node.level + 1 : node.level
      if (this.haveWritePermission[extraLevel] && node._id === this.$store.state.nodeSelected._id &&
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
        this.allowRemoval = this.haveWritePermission[node.level]
        window.showContextMenuRef.show()
      }
    },

    // returns null when the node does not exist
    getNodeWithDependencies() {
      return window.slVueTree.getNodeById(this.nodeWithDependenciesId)
    },

    showSelected(idx) {
      function checkNode(vm, selNode) {
        if (selNode._id === vm.nodeWithDependenciesId) {
          vm.contextWarning = "WARNING: Item cannot be dependent on it self"
          return false
        }
        const nodeWithDependencies = vm.getNodeWithDependencies()
        if (nodeWithDependencies.dependencies.includes(selNode._id)) {
          vm.contextWarning = "WARNING: Cannot add the same dependency twice"
          return false
        }
        if (window.slVueTree.comparePaths(nodeWithDependencies.path, selNode.path) === 1) {
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
        case this.CLONEPRODUCT:
          this.assistanceText = this.$store.state.help.help.productClone
          this.listItemText = 'Make a clone of this product'
          break
        case this.CLONEITEM:
          this.assistanceText = this.$store.state.help.help.itemClone
          this.listItemText = 'Make a clone of this item'
          break
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
          if (this.hasDependencies) {
            this.listItemText = "WARNING: this item has dependencies on other items. Remove them first."
            this.disableOkButton = true
          } else if (this.hasConditions) {
            this.listItemText = "WARNING: this item is conditional for other items. Remove them first"
            this.disableOkButton = true
          } else this.listItemText = `Remove this ${this.contextNodeType} and ${this.contextNodeDescendantsCount} descendants`
          break
        case this.ASIGNTOMYTEAM:
          this.assistanceText = this.$store.state.help.help.team
          if (this.contextNodeLevel > this.FEATURELEVEL && this.contextParentTeam !== this.$store.state.userData.myTeam) {
            this.contextWarning = "WARNING: The team of parent " + this.contextParentType + " (" + this.contextParentTeam +
              ") and your team (" + this.$store.state.userData.myTeam + ") do not match. Please read the assistance text"
          } else this.contextWarning = undefined
          this.listItemText = `Assign this ${this.contextNodeType} to my team '${this.$store.state.userData.myTeam}'`
          break
        case this.CHECKSTATES:
          this.assistanceText = this.$store.state.help.help.consistencyCheck
          this.listItemText = `Start the check. See in the tree if any red badges appear`
          break
        case this.SETDEPENDENCY:
          this.assistanceText = this.$store.state.help.help.setDependency
          if (!this.$store.state.selectNodeOngoing) {
            this.listItemText = 'Click OK to choose a node this item depends on'
          } else {
            if (checkNode(this, this.contextNodeSelected)) {
              this.listItemText = 'Click OK to set this condition'
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
        case this.CLONEPRODUCT:
          this.doCloneProduct()
          break
        case this.CLONEITEM:
          this.doCloneItem(this.contextNodeSelected)
          break
        case this.INSERTBELOW:
          this.doInsertNewItem()
          break
        case this.INSERTINSIDE:
          this.doInsertNewItem()
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
          this.doSetDependency()
          break
        case this.SHOWDEPENDENCIES:
          this.doUpdateDependencies()
          break
        case this.SHOWCONDITIONS:
          this.doUpdateConditions()
          break
      }
    },

    doCloneProduct() {
      this.$store.dispatch('cloneProduct')
    },

    doCloneItem(node) {
      const newShortId = Math.random().toString(36).replace('0.', '').substr(0, 5)
      const newId = Date.now().toString().concat(newShortId)
      let insertPosition

      const prevNode = window.slVueTree.getPreviousNode(node.path)
      if (node.path.slice(-1)[0] === 0) {
        // the previous node is the parent
        insertPosition = {
          nodeModel: prevNode,
          placement: 'inside'
        }
      } else {
        // the previous node is a sibling
        insertPosition = {
          nodeModel: prevNode,
          placement: 'after'
        }
      }

      // prepare the new node for insertion
      newNode = {
        _id: newId,
        shortId: newShortId,
        title: 'COPY: ' + node.title,
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
          state: STATENEW,
          lastStateChange: Date.now(),
          team: node.data.team,
          subtype: node.data.subtype,
          sessionId: this.$store.state.userData.sessionId,
          distributeEvent: true
        }
      }
      // unselect the node that was clicked before the insert
      this.contextNodeSelected.isSelected = false
      // insert the new node in the tree and assign the priority to this node
      window.slVueTree.insertSingle(insertPosition, newNode)
      // and select the new node
      this.$store.state.nodeSelected = newNode

      this.showLastEvent("Item of type " + this.getLevelText(newNode.level) + " is inserted as a copy of '" + node.title + "'.", INFO)
      // create a new document and store it
      const parentTitle = window.slVueTree.getNodeById(newNode.parentId).title
      const currentDoc = this.$store.state.currentDoc
      const newDoc = {
        "productId": currentDoc.productId,
        "parentId": newNode.parentId,
        "_id": newNode._id,
        "shortId": newNode.shortId,
        "type": "backlogItem",
        "team": currentDoc.team,
        "level": newNode.level,
        "subtype": currentDoc.subtype,
        "state": STATENEW,
        "tssize": currentDoc.tssize,
        "spsize": currentDoc.spsize,
        "spikepersonhours": currentDoc.spikepersonhours,
        "reqarea": null,
        "dependencies": [],
        "conditionalFor": [],
        "title": newNode.title,
        "followers": [],
        "description": window.btoa(currentDoc.description),
        "acceptanceCriteria": window.btoa(currentDoc.acceptanceCriteria),
        "priority": newNode.data.priority,
        "comments": [{
          "ignoreEvent": 'comments initiated',
          "timestamp": 0,
          "distributeEvent": false
        }],
        "history": [{
          "createEvent": [newNode.level, parentTitle, newNode.ind + 1],
          "by": this.$store.state.userData.user,
          "email": this.$store.state.userData.email,
          "timestamp": Date.now(),
          "sessionId": this.$store.state.userData.sessionId,
          "distributeEvent": true
        }],
        "delmark": false
      }
      // create a history event for the parent to trigger an email message to followers
      const parentHist = {
        "newChildEvent": [newNode.level, newNode.ind + 1],
        "by": this.$store.state.userData.user,
        "email": this.$store.state.userData.email,
        "timestamp": Date.now(),
        "distributeEvent": false
      }
      // update the database
      this.$store.dispatch('createDoc', { newDoc , parentHist })
      // create an entry for undoing the change in a last-in first-out sequence
      const entry = {
        type: 'undoNewNode',
        newNode
      }
      this.$store.state.changeHistory.unshift(entry)
    },

		/*
		 * Create and insert a new node in the tree and create a document for this new item
		 * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
		 */
    doInsertNewItem() {
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
          state: STATENEW,
          lastStateChange: now,
          team: 'not assigned yet',
          subtype: 0,
          lastChange: now,
          sessionId: this.$store.state.userData.sessionId,
          distributeEvent: true
        }
      }
      let insertLevel = this.contextNodeSelected.level
      let parentTitle
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
        parentTitle = window.slVueTree.getNodeById(newNode.parentId).title
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
        parentTitle = this.contextNodeSelected.title
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
        const newDoc = {
          "_id": newNode._id,
          "shortId": newNode.shortId,
          "type": "backlogItem",
          "productId": newNode.productId,
          "parentId": newNode.parentId,
          "team": "not assigned yet",
          "level": insertLevel,
          "subtype": 0,
          "state": STATENEW,
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
          "comments": [{
            "ignoreEvent": 'comments initiated',
            "timestamp": 0,
            "distributeEvent": false
          }],
          "history": [{
            "createEvent": [insertLevel, parentTitle, newNode.ind + 1],
            "by": this.$store.state.userData.user,
            "email": this.$store.state.userData.email,
            "timestamp": Date.now(),
            "sessionId": this.$store.state.userData.sessionId,
            "distributeEvent": true
          }],
          "delmark": false
        }
        // create a history event for the parent to trigger an email message to followers
        const parentHist = {
          "newChildEvent": [insertLevel, newNode.ind + 1],
          "by": this.$store.state.userData.user,
          "email": this.$store.state.userData.email,
          "timestamp": Date.now(),
          "distributeEvent": false
        }
        // update the database
        this.$store.dispatch('createDoc', { newDoc , parentHist })
        // create an entry for undoing the change in a last-in first-out sequence
        const entry = {
          type: 'undoNewNode',
          newNode
        }
        this.$store.state.changeHistory.unshift(entry)
      } else {
        this.showLastEvent("Sorry, your assigned role(s) disallow you to create new items of this type", WARNING)
      }
    },

    /*
    * In the database both the selected node and all its descendants will be tagged with a delmark
    * The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
    */
    doRemove() {
      const selectedNode = this.contextNodeSelected
      const descendantsInfo = window.slVueTree.getDescendantsInfo(selectedNode)
      this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
      const path = selectedNode.path
      // when removing a product
      if (selectedNode.level === this.PRODUCTLEVEL) {
        // cannot remove the last assigned product or product in the tree
        if (this.$store.state.userData.userAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
          this.showLastEvent("You cannot remove your last assigned product, but you can remove the epics", WARNING)
          return
        }
      }
      // set remove mark in the database on the clicked item and decendants (if any)
      this.$store.dispatch('registerHistInGrandParent', { productId: this.$store.state.load.currentProductId, node: selectedNode, descendantsIds: descendantsInfo.ids })
      // remove any dependency references to/from outside the removed items; note: these cannot be undone
      const removed = window.slVueTree.correctDependencies(this.$store.state.load.currentProductId, descendantsInfo.ids)
      // create an entry for undoing the remove in a last-in first-out sequence
      const entry = {
        type: 'removedNode',
        removedNode: selectedNode,
        isProductRemoved: selectedNode.level === this.PRODUCTLEVEL,
        grandParentId: selectedNode.parentId,
        parentId: selectedNode._id,
        parentPath: selectedNode.path,
        descendants: descendantsInfo.descendants,
        removedIntDependencies: removed.removedIntDependencies,
        removedIntConditions: removed.removedIntConditions,
        removedExtDependencies: removed.removedExtDependencies,
        removedExtConditions: removed.removedExtConditions
      }

      if (entry.isProductRemoved) {
        entry.removedProductRoles = this.$store.state.userData.myProductsRoles[selectedNode._id]
      }

      this.$store.state.changeHistory.unshift(entry)
      // before removal select the predecessor or successor of the removed node (sibling or parent)
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
            if (this.convertState(desc.data.state) > highestState) highestState = this.convertState(desc.data.state)
            if (this.convertState(desc.data.state) < DONE && this.convertState(desc.data.state) !== REMOVED) allDone = false
          }
          if (this.convertState(nm.data.state) > highestState || this.convertState(nm.data.state) === DONE && !allDone) {
            // node has a higher state than any of its descendants or set to done while one of its descendants is not done
            nm.data.inconsistentState = true
            count++
          } else nm.data.inconsistentState = false
        }
      }, [this.contextNodeSelected])
      this.showLastEvent(`${count} inconsistencies are found.`, INFO)
    },

    doSetDependency() {
      if (this.$store.state.selectNodeOngoing) {
        if (this.contextNodeSelected.conditionalFor) {
          this.contextNodeSelected.conditionalFor.push(this.nodeWithDependenciesId)
        } else this.contextNodeSelected.conditionalFor = this.nodeWithDependenciesId
        const conditionalForPayload = { _id: this.contextNodeSelected._id, conditionalFor: this.contextNodeSelected.conditionalFor }
        const nodeWithDependencies = this.getNodeWithDependencies()
        nodeWithDependencies.dependencies.push(this.contextNodeSelected._id)
        const dependenciesPayload = { _id: nodeWithDependencies._id, dependencies: nodeWithDependencies.dependencies, conditionalForPayload }
        this.$store.dispatch('SetDepAndCond', dependenciesPayload)
        this.$store.state.selectNodeOngoing = false
      } else {
        // save the id of the node the dependencies will be attached to
        this.nodeWithDependenciesId = this.contextNodeSelected._id
        this.$store.state.selectNodeOngoing = true
      }
    },

    getDependencies() {
      this.dependenciesObjects = []
      for (let depObj of this.contextNodeSelected.dependencies) {
        const item = window.slVueTree.getNodeById(depObj)
        if (item) {
          this.dependenciesObjects.push({ _id: depObj, title: item.title })
        }
      }
    },

    getConditions() {
      this.conditionsObjects = []
      for (let conObj of this.contextNodeSelected.conditionalFor) {
        const item = window.slVueTree.getNodeById(conObj)
        if (item) {
          this.conditionsObjects.push({ _id: conObj, title: item.title })
        }
      }
    },

    /* Remove the dependency from the view only, not yet in the database. */
    removeDependency(id) {
      const objArray = []
      for (let depObj of this.dependenciesObjects) {
        if (id !== depObj._id) objArray.push(depObj)
      }
      this.dependenciesObjects = objArray
    },

    /* Remove the condition from the view only, not yet in the database. */
    removeCondition(id) {
      const objArray = []
      for (let conObj of this.conditionsObjects) {
        if (id !== conObj._id) objArray.push(conObj)
      }
      this.conditionsObjects = objArray
    },

    /* Update the dependencies and the corresponding conditions in the tree model and the database. */
    doUpdateDependencies() {
      const depIdArray = []
      for (let depObj of this.dependenciesObjects) {
        depIdArray.push(depObj._id)
      }
      let removedIds = []
      for (let id of this.contextNodeSelected.dependencies) {
        if (!depIdArray.includes(id)) removedIds.push(id)
      }
      // update the dependencies in the tree
      this.contextNodeSelected.dependencies = depIdArray
      // dispatch the update in the database
      this.$store.dispatch('updateDep', { _id: this.contextNodeSelected._id, newDeps: depIdArray, removedIds })
      // update the conditions in the tree
      for (let id of removedIds) {
        const node = window.slVueTree.getNodeById(id)
        if (node === null) {
          this.showLastEvent('Unexpected error. Node not found.', ERROR)
          break
        }

        const conIdArray = []
        for (let condId of node.conditionalFor) {
          if (condId !== this.contextNodeSelected._id) conIdArray.push(id)
        }
        node.conditionalFor = conIdArray
      }
    },

    /* Update the conditions and the corresponding dependencies in the tree model and the database. */
    doUpdateConditions() {
      const conIdArray = []
      for (let conObj of this.conditionsObjects) {
        conIdArray.push(conObj._id)
      }
      let removedIds = []
      for (let id of this.contextNodeSelected.conditionalFor) {
        if (!conIdArray.includes(id)) removedIds.push(id)
      }
      // update the conditions in the tree
      this.contextNodeSelected.conditionalFor = conIdArray
      // dispatch the update in the database
      this.$store.dispatch('updateCon', { _id: this.contextNodeSelected._id, newCons: conIdArray, removedIds })
      // update the dependencies in the tree
      for (let id of removedIds) {
        const node = window.slVueTree.getNodeById(id)
        if (node === null) {
          this.showLastEvent('Unexpected error. Node not found.', ERROR)
          break
        }

        const depIdArray = []
        for (let depId of node.dependencies) {
          if (depId !== this.contextNodeSelected._id) depIdArray.push(id)
        }
        node.dependencies = depIdArray
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
        if (sourceProductNode === null) {
          this.showLastEvent('Unexpected error. Node not found.', ERROR)
          return
        }

        // move the node to the new place and update the productId and parentId
        window.slVueTree.moveNodes(targetPosition, [movedNode])
        // the path to new node is immediately below the selected node
        const newPath = targetNode.path.concat([0])
        const newNode = window.slVueTree.getNodeModel(newPath)
        const newParentNode = window.slVueTree.getNodeById(newNode.parentId)
        if (newParentNode === null) {
          this.showLastEvent('Unexpected error. Node not found.', ERROR)
          return
        }

        const descendantsInfo = window.slVueTree.getDescendantsInfo(newNode)
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
          'nrOfDescendants': descendantsInfo.count,
          'descendants': descendantsInfo.descendants
        }
        // update the database
        this.$store.dispatch('updateMovedItemsBulk', { items: [payloadItem] })
        this.$store.state.moveOngoing = false
      } else {
        this.$store.state.moveOngoing = true
        this.moveSourceProductId = this.$store.state.load.currentProductId
        movedNode = this.contextNodeSelected
      }
    }
  }
}
