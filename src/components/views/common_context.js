import { constants, authorization, utilities } from '../mixins/generic.js'

const STATE_NEW_OR_TODO = 2
const AREA_PRODUCTID = 'requirement-areas'

function created() {
	this.onholdState = 1
	this.newState = 2
	this.doneState = 6
	this.databaseLevel = 1
	this.productLevel = 2
	this.epicLevel = 3
	this.featureLevel = 4
	this.pbiLevel = 5
	this.taskLevel = 6
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
	this.REMOVEREQAREA = 11
}

function data() {
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
		dependentOnNode: undefined,
		listItemText: '',
		assistanceText: 'No assistance available',
		showAssistance: false,
		contextNodeDescendants: null,
		moveSourceProductId: '',
		nodeWithDependenciesId: undefined,
		hasDependencies: false,
		hasConditions: false,
		allowRemoval: false,
		dependenciesObjects: [],
		conditionsObjects: [],
		selectedDependencyIds: [],
		selectedConditionIds: []
	}
}

const methods = {
	areDescendantsAssignedToOtherTeam(descendants) {
		for (const d of descendants) {
			if (d.data.team !== 'not assigned yet' && d.data.team !== this.myTeam) return true
		}
		return false
	},

	doCloneProduct(node) {
		this.$store.dispatch('cloneProduct', node)
	},

	doCloneItem(node) {
		const newId = this.createId()
		let newNodeLocation
		const prevNode = window.slVueTree.getPreviousNode(node.path)
		if (node.path.slice(-1)[0] === 0) {
			// the previous node is the parent
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'inside'
			}
		} else {
			// the previous node is a sibling
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'after'
			}
		}
		// prepare the new node for insertion
		const newNode = {
			_id: newId,
			title: 'COPY: ' + node.title,
			isLeaf: node.isLeaf,
			dependencies: [],
			conditionalFor: [],
			children: [],
			isExpanded: false,
			isDraggable: true,
			isSelectable: true,
			isSelected: true,
			doShow: true,
			data: {
				state: STATE_NEW_OR_TODO,
				reqarea: node.data.reqArea,
				reqAreaItemColor: node.data.reqAreaItemColor,
				team: node.data.team,
				subtype: node.data.subtype,
				lastChange: 0
			}
		}
		// must insert the new node in the tree first to get the productId, parentId, pririty and set the location parameters
		window.slVueTree.insert(newNodeLocation, [newNode])
		// create a new document and store it
		const currentDoc = this.$store.state.currentDoc
		const newDoc = {
			productId: currentDoc.productId,
			parentId: newNode.parentId,
			_id: newNode._id,
			type: 'backlogItem',
			team: currentDoc.team,
			level: newNode.level,
			subtype: currentDoc.subtype,
			state: STATE_NEW_OR_TODO,
			tssize: currentDoc.tssize,
			spsize: currentDoc.spsize,
			spikepersonhours: currentDoc.spikepersonhours,
			reqarea: null,
			dependencies: [],
			conditionalFor: [],
			title: newNode.title,
			followers: [],
			description: window.btoa(currentDoc.description),
			acceptanceCriteria: window.btoa(currentDoc.acceptanceCriteria),
			priority: newNode.data.priority,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			history: [{
				createEvent: [newNode.level, window.slVueTree.getParentNode(newNode).title, newNode.ind + 1],
				by: this.$store.state.userData.user,
				timestamp: Date.now(),
				sessionId: this.$store.state.mySessionId,
				distributeEvent: true
			}],
			delmark: false
		}
		// update the database and select this document
		this.$store.dispatch('createDocWithParentHist', { newNode, newDoc })
	},

	/*
		 * Create and insert a new node in the tree and create a document for this new item
		 * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
		 * This method also contains 'Product details' view specific code
		 */
	doInsertNewItem() {
		let newNodeLocation
		const now = Date.now()
		// prepare the new node for insertion and set isSelected to true
		const _id = this.createId()
		const newNode = {
			_id,
			dependencies: [],
			conditionalFor: [],
			children: [],
			isExpanded: false,
			isDraggable: true,
			isSelectable: true,
			isSelected: true,
			doShow: true,
			data: {
				state: STATE_NEW_OR_TODO,
				subtype: 0,
				lastChange: now
			}
		}
		let insertLevel = this.contextNodeSelected.level
		if (this.contextOptionSelected === this.INSERTBELOW) {
			// new node is a sibling placed below (after) the selected node
			newNodeLocation = {
				nodeModel: this.contextNodeSelected,
				placement: 'after'
			}
		} else {
			// new node is a child placed a level lower (inside) than the selected node
			insertLevel += 1
			newNodeLocation = {
				nodeModel: this.contextNodeSelected,
				placement: 'inside'
			}
		}

		let team = this.myTeam
		let sprintId
		let taskOwner
		if (insertLevel === this.SEV.TASK) {
			// when inserting a task, copy the team name from the parent PBI or sibling task
			team = this.contextNodeSelected.data.team
			// and set the task owner
			taskOwner = this.$store.state.userData.user
			newNode.data.taskOwner = taskOwner
			// when inserting a task, copy the sprintId from the parent PBI or sibling task
			sprintId = this.contextNodeSelected.data.sprintId
			newNode.data.sprintId = sprintId
		}
		newNode.data.team = team
		newNode.title = newNode.parentId === AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(insertLevel)

		if (this.haveAccessInTree(insertLevel, team, 'create new items of this type')) {
			if (newNodeLocation.placement === 'inside') {
				// unselect the node that was clicked before the insert and expand it to show the inserted node
				this.contextNodeSelected.isSelected = false
				this.contextNodeSelected.isExpanded = true
			} else {
				// unselect the node that was clicked before the insert
				this.contextNodeSelected.isSelected = false
			}
			// must insert the new node in the tree first to get the productId, parentId, priority and set the location parameters
			window.slVueTree.insert(newNodeLocation, [newNode])

			// create a new document and store it
			const newDoc = {
				_id: _id,
				type: 'backlogItem',
				productId: newNode.productId,
				parentId: newNode.parentId,
				sprintId: sprintId,
				team: team,
				taskOwner: newNode.data.taskOwner,
				level: insertLevel,
				subtype: 0,
				state: STATE_NEW_OR_TODO,
				tssize: 3,
				spsize: 0,
				spikepersonhours: 0,
				reqarea: null,
				dependencies: [],
				conditionalFor: [],
				title: newNode.title,
				followers: [],
				description: window.btoa(''),
				acceptanceCriteria: insertLevel < this.taskLevel ? window.btoa('<p>Please do not neglect</p>') : window.btoa('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: newNode.data.priority,
				comments: [{
					ignoreEvent: 'comments initiated',
					timestamp: Date.now(),
					distributeEvent: false
				}],
				history: [{
					createEvent: [insertLevel, window.slVueTree.getParentNode(newNode).title, newNode.ind + 1],
					by: this.$store.state.userData.user,
					timestamp: Date.now(),
					sessionId: this.$store.state.mySessionId,
					distributeEvent: true
				}],
				delmark: false
			}
			// update the parent history and than save the new document
			this.$store.dispatch('createDocWithParentHist', { newNode, newDoc })
		}
	},

	/*
	* Check for 'done' items with sub-items not 'done' and highlight them with a warning badge 'Done?' in the tree view.
	* Check for items with a higher state than any of its decendants and highlight them with a warning badge '<state?>' in the tree view.
	*/
	doCheckStates() {
		let count = 0
		window.slVueTree.traverseModels((nm) => {
			const descendants = window.slVueTree.getDescendantsInfo(nm).descendants
			if (descendants.length > 0) {
				let highestState = this.newState
				let allDone = true
				for (const desc of descendants) {
					if (desc.data.state > highestState) highestState = desc.data.state
					if (desc.data.state < this.doneState && desc.data.state !== this.onholdState) allDone = false
				}
				if (nm.data.state > highestState || nm.data.state === this.doneState && !allDone) {
					// node has a higher state than any of its descendants or set to done while one of its descendants is not done
					nm.data.inconsistentState = true
					window.slVueTree.showPathToNode(nm)
					count++
				} else {
					nm.data.inconsistentState = false
				}
			}
		}, [this.contextNodeSelected])
		this.showLastEvent(`${count} inconsistent state settings are found`, this.SEV.INFO)
	},

	doSetDependency() {
		if (this.$store.state.selectNodeOngoing) {
			this.$store.dispatch('setDepAndCond', { dependentOnNode: this.dependentOnNode, conditionalForNode: this.contextNodeSelected, timestamp: Date.now() })
		} else {
			// save the node the dependency will be added to
			this.dependentOnNode = this.contextNodeSelected
			this.$store.state.selectNodeOngoing = true
		}
	},

	getDependencies() {
		this.dependenciesObjects = []
		for (const depId of this.contextNodeSelected.dependencies) {
			const item = window.slVueTree.getNodeById(depId)
			if (item) {
				window.slVueTree.showPathToNode(item, { doHighLight_2: true })
				this.dependenciesObjects.push({ _id: depId, title: item.title })
			}
		}
	},

	getConditions() {
		this.conditionsObjects = []
		for (const conId of this.contextNodeSelected.conditionalFor) {
			const item = window.slVueTree.getNodeById(conId)
			if (item) {
				window.slVueTree.showPathToNode(item, { doHighLight_2: true })
				this.conditionsObjects.push({ _id: conId, title: item.title })
			}
		}
	},

	/*
	* In the database both the selected node and all its descendants will be tagged with a delmark
	* The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
	*/
	doRemove() {
		const selectedNode = this.contextNodeSelected
		if (this.haveAccessInTree(selectedNode.level, selectedNode.data.team, 'remove this item')) {
			// when removing a product
			if (selectedNode.level === this.productLevel) {
				// cannot remove the last assigned product or product in the tree
				if (this.getMyAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
					this.showLastEvent('You cannot remove your last assigned product, but you can remove the epics', this.SEV.WARNING)
					return
				}
			}
			// set remove mark in the database on the clicked item and descendants (if any), then remove the node
			this.$store.dispatch('removeBranch', { node: selectedNode, createUndo: true })
		}
	},

	/* Undo the tree expansion and highlighting */
	undoShowDependencies(objects) {
		for (const o of objects) {
			const node = window.slVueTree.getNodeById(o._id)
			if (node) window.slVueTree.undoShowPath(node, { highlighted_2: true })
		}
	},

	/* Update the dependencies and the corresponding conditions in the tree model and the database. */
	doRemoveDependencies() {
		this.undoShowDependencies(this.dependenciesObjects)
		if (this.selectedDependencyIds.length > 0) {
			const newDeps = []
			for (const id of this.contextNodeSelected.dependencies) {
				if (!this.selectedDependencyIds.includes(id)) newDeps.push(id)
			}
			this.$store.dispatch('removeDependenciesAsync', { node: this.contextNodeSelected, newDeps, removedIds: this.selectedDependencyIds, timestamp: Date.now() })
		}
	},

	/* Update the conditions and the corresponding dependencies in the tree model and the database. */
	doRemoveConditions() {
		this.undoShowDependencies(this.conditionsObjects)
		if (this.selectedConditionIds.length > 0) {
			const newCons = []
			for (const obj of this.conditionsObjects) {
				if (!this.selectedConditionIds.includes(obj._id)) newCons.push(obj)
			}
			this.$store.dispatch('removeConditionsAsync', { node: this.contextNodeSelected, newCons, removedIds: this.selectedConditionIds, timestamp: Date.now() })
		}
	},

	doCancel() {
		this.showAssistance = false
		this.$store.state.moveOngoing = false
		this.$store.state.selectNodeOngoing = false
		if (this.contextOptionSelected === this.SHOWDEPENDENCIES) {
			this.undoShowDependencies(this.dependenciesObjects)
		}
		if (this.contextOptionSelected === this.SHOWCONDITIONS) {
			this.undoShowDependencies(this.conditionsObjects)
		}
	}
}

export default {
	mixins: [constants, authorization, utilities],
	created,
	data,
	methods
}
