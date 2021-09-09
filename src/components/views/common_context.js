import { SEV, STATE, MISC } from '../../constants.js'
import { createId, expandNode } from '../../common_functions.js'
import { authorization, utilities } from '../mixins/generic.js'

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

	/* Clone a product INCLUDING its descendants */
	doCloneProduct(node) {
		this.$store.dispatch('cloneProduct', node)
	},

	/* Copy an item EXCLUDING its descendants and reset its dependencies, conditions and followers
	* Insert the new node above the original
	*/
	doCopyItem(node) {
		let newNodeLocation
		const prevNode = window.slVueTree.getPreviousNode(node.path)
		// prepare the new node for insertion
		const newNode = {
			_id: createId(),
			productId: undefined,
			parentId: undefined,
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
				state: STATE.NEW_OR_TODO,
				reqarea: node.data.reqArea,
				reqAreaItemColor: node.data.reqAreaItemColor,
				team: node.data.team,
				subtype: node.data.subtype,
				lastChange: 0
			},
			tmp: {}
		}

		if (node.path.slice(-1)[0] === 0) {
			// the previous node is the parent
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'inside'
			}
			newNode.parentId = prevNode._id
		} else {
			// the previous node is a sibling
			newNodeLocation = {
				nodeModel: prevNode,
				placement: 'after'
			}
			newNode.parentId = prevNode.parentId
		}

		// must insert the new node in the tree first to set the ind, level, productId, parentId and priority of the inserted node
		const insertedNode = window.slVueTree.insertNodes(newNodeLocation, [newNode])[0]
		// create a new document and store it
		const currentDoc = this.$store.state.currentDoc
		const newDoc = {
			productId: currentDoc.productId,
			parentId: insertedNode.parentId,
			_id: insertedNode._id,
			type: 'backlogItem',
			team: currentDoc.team,
			level: insertedNode.level,
			subtype: currentDoc.subtype,
			state: insertedNode.data.state,
			tssize: currentDoc.tssize,
			spsize: currentDoc.spsize,
			spikepersonhours: currentDoc.spikepersonhours,
			reqarea: currentDoc.reqarea,
			dependencies: [],
			conditionalFor: [],
			title: insertedNode.title,
			followers: [],
			description: window.btoa(currentDoc.description),
			acceptanceCriteria: window.btoa(currentDoc.acceptanceCriteria),
			priority: insertedNode.data.priority,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: Date.now(),
				distributeEvent: false
			}],
			history: [{
				createEvent: [insertedNode.level, window.slVueTree.getParentNode(insertedNode).title, insertedNode.ind + 1],
				by: this.$store.state.userData.user,
				timestamp: Date.now(),
				sessionId: this.$store.state.mySessionId,
				distributeEvent: true
			}]
		}
		// update the database and select this document
		this.$store.dispatch('createDocWithParentHist', { insertedNode, newDoc })
	},

	/*
	* Create and insert a new node in the tree and create a document for this new item
	* A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
	*/
	doInsertNewItem() {
		let newNodeLocation
		const now = Date.now()
		// prepare the new node for insertion and set isSelected to true
		const newNode = {
			_id: createId(),
			productId: this.contextNodeSelected.productId,
			parentId: undefined,
			title: undefined,
			dependencies: [],
			conditionalFor: [],
			children: [],
			isExpanded: false,
			isDraggable: true,
			isSelectable: true,
			isSelected: true,
			doShow: true,
			data: {
				state: STATE.NEW_OR_TODO,
				subtype: 0,
				sprintId: undefined,
				taskOwner: undefined,
				team: undefined,
				lastChange: now
			},
			tmp: {}
		}
		let insertLevel = this.contextNodeSelected.level
		if (this.contextOptionSelected === this.INSERTBELOW) {
			// new node is a sibling placed below (after) the selected node
			newNodeLocation = {
				nodeModel: this.contextNodeSelected,
				placement: 'after'
			}
			newNode.parentId = this.contextNodeSelected.parentId
		} else {
			// new node is a child placed a level lower (inside) than the selected node
			insertLevel += 1
			newNodeLocation = {
				nodeModel: this.contextNodeSelected,
				placement: 'inside'
			}
			newNode.parentId = this.contextNodeSelected._id
		}

		let team = this.myTeam
		let sprintId
		let taskOwner
		if (insertLevel === SEV.TASK) {
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
		newNode.title = newNode.parentId === MISC.AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(insertLevel)

		if (this.haveAccessInTree(insertLevel, team, 'create new items of this type')) {
			// unselect the node that was clicked before the insert
			this.contextNodeSelected.isSelected = false
			if (newNodeLocation.placement === 'inside') {
				// expand the parent node to show the inserted node
				expandNode(this.contextNodeSelected)
			}
			// must insert the new node in the tree first to set the ind, level, productId, parentId and priority of the inserted node
			const insertedNode = window.slVueTree.insertNodes(newNodeLocation, [newNode])[0]

			// create a new document and store it
			const newDoc = {
				_id: insertedNode._id,
				type: 'backlogItem',
				productId: insertedNode.productId,
				parentId: insertedNode.parentId,
				sprintId,
				team,
				level: insertedNode.level,
				subtype: 0,
				state: insertedNode.data.state,
				tssize: 3,
				spsize: 0,
				spikepersonhours: 0,
				reqarea: null,
				dependencies: [],
				conditionalFor: [],
				title: insertedNode.title,
				followers: [],
				description: window.btoa(''),
				acceptanceCriteria: insertLevel < this.taskLevel ? window.btoa('<p>Please do not neglect</p>') : window.btoa('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: insertedNode.data.priority,
				comments: [{
					ignoreEvent: 'comments initiated',
					timestamp: now,
					distributeEvent: false
				}],
				history: [{
					createEvent: [insertLevel, window.slVueTree.getParentNode(insertedNode).title, insertedNode.ind + 1],
					by: this.$store.state.userData.user,
					timestamp: now,
					sessionId: this.$store.state.mySessionId,
					distributeEvent: true,
					updateBoards: { sprintsAffected: [sprintId], teamsAffected: [team] }
				}]
			}
			// update the parent history and than save the new document
			this.$store.dispatch('createDocWithParentHist', { insertedNode, newDoc })
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
					nm.tmp.inconsistentState = true
					window.slVueTree.showPathToNode(nm)
					count++
				} else {
					nm.tmp.inconsistentState = false
				}
			}
		}, [this.contextNodeSelected])
		this.showLastEvent(`${count} inconsistent state settings are found`, SEV.INFO)
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

	/*
	* In the database both the selected node and all its descendants will be tagged with a delmark
	* The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
	*/
	doRemove() {
		const selectedNode = this.contextNodeSelected
		if (this.haveAccessInTree(selectedNode.level, selectedNode.data.team, 'remove this item')) {
			// when removing a product
			if (selectedNode.level === this.productLevel) {
				if (this.getMyAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
					// cannot remove the last assigned product or product in the tree
					this.showLastEvent('You cannot remove your last assigned product, but you can remove the epics', SEV.WARNING)
					return
				}
			}
			this.showLastEvent('Busy removing branche...', SEV.INFO)
			// set remove mark in the database on the clicked item and descendants (if any), then remove the node
			this.$store.dispatch('removeBranch', { node: selectedNode, createUndo: true })
		}
	},

	/* Undo the tree expansion and highlighting */
	undoShowDependencies(dependenciesObjects) {
		for (const o of dependenciesObjects) {
			const node = window.slVueTree.getNodeById(o._id)
			if (node) window.slVueTree.undoShowPath(node, 'dependency', 'isHighlighted_2')
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
	mixins: [authorization, utilities],
	created,
	data,
	methods
}
