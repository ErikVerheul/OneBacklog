import { SEV, STATE, MISC } from '../../constants.js'
import { createId } from '../../common_functions.js'
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
	this.CLONEBRANCH = 10
	this.CLONEITEM = 11
	this.REMOVEREQAREA = 12
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
		this.$store.dispatch('cloneBranch', node)
	},

	/* Clone a branch INCLUDING its descendants */
	doCloneBranch(node) {
		this.$store.dispatch('cloneBranch', node)
	},

	/* Copy an item EXCLUDING its descendants, attachments, sprintId, dependencies, conditions and followers
	* Insert the new node above the original (inside or after the previous node)
	*/
	doCopyItem(node) {
		const now = Date.now()
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
			_id: createId(),
			level: undefined,
			ind: undefined,
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
				priority: undefined,
				state: STATE.NEW_OR_TODO,
				reqarea: node.data.reqArea,
				reqAreaItemColor: node.data.reqAreaItemColor,
				team: node.data.team,
				subtype: node.data.subtype,
				lastChange: now
			},
			tmp: {}
		}

		const preFligthData = window.slVueTree.preFlightSingeNodeInsert(newNodeLocation, newNode)
		newNode.productId = preFligthData.productId
		newNode.parentId = preFligthData.parentId
		newNode.level = preFligthData.level
		newNode.ind = preFligthData.ind
		newNode.data.priority = preFligthData.priority

		// create a new document as a partial copy of the current document
		const currentDoc = this.$store.state.currentDoc
		const newDoc = {
			productId: newNode.productId,
			parentId: newNode.parentId,
			_id: newNode._id,
			type: 'backlogItem',
			team: currentDoc.team,
			level: newNode.level,
			subtype: currentDoc.subtype,
			state: newNode.data.state,
			tssize: currentDoc.tssize,
			spsize: currentDoc.spsize,
			spikepersonhours: currentDoc.spikepersonhours,
			reqarea: currentDoc.reqarea,
			dependencies: [],
			conditionalFor: [],
			title: newNode.title,
			followers: [],
			description: window.btoa(currentDoc.description),
			acceptanceCriteria: window.btoa(currentDoc.acceptanceCriteria),
			priority: newNode.data.priority,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: now,
				distributeEvent: false
			}],
			history: [{
				createEvent: [newNode.level, window.slVueTree.getNodeById(newNode.parentId).title, newNode.ind + 1],
				by: this.$store.state.userData.user,
				timestamp: now,
				sessionId: this.$store.state.mySessionId,
				distributeEvent: true
			}]
		}
		// update the database, create the node and select this document
		this.$store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
	},

	/*
	* Create and insert a new node in the tree and create a document for this new item
	* A new node can be inserted 'inside' or 'after' the selected node
	*/
	doInsertNewItem(node) {
		const now = Date.now()
		let newNodeLocation
		if (this.contextOptionSelected === this.INSERTBELOW) {
			// new node is a sibling placed below (after) the selected node
			newNodeLocation = {
				nodeModel: node,
				placement: 'after'
			}
		} else {
			// INSERTINSIDE: new node is a child placed a level lower (inside) than the selected node
			newNodeLocation = {
				nodeModel: node,
				placement: 'inside'
			}
		}
		// prepare the new node for insertion and set isSelected to true
		const newNode = {
			_id: createId(),
			level: undefined,
			ind: undefined,
			productId: node.productId,
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
				priority: undefined,
				state: STATE.NEW_OR_TODO,
				subtype: 0,
				sprintId: undefined,
				taskOwner: undefined,
				team: undefined,
				lastChange: now
			},
			tmp: {}
		}

		const preFligthData = window.slVueTree.preFlightSingeNodeInsert(newNodeLocation, newNode)
		newNode.productId = preFligthData.productId
		newNode.parentId = preFligthData.parentId
		newNode.level = preFligthData.level
		newNode.ind = preFligthData.ind
		newNode.data.priority = preFligthData.priority

		if (newNode.level === SEV.TASK) {
			// when inserting a task, copy the team name from the parent PBI or sibling task
			newNode.data.team = node.data.team
		} else newNode.data.team = this.myTeam

		if (this.haveAccessInTree(newNode.productId, newNode.level, newNode.data.team, 'create new items of this type')) {
			newNode.title = newNode.parentId === MISC.AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(newNode.level)
			if (newNode.level === SEV.TASK) {
				// when inserting a task, set the task owner to the current user
				newNode.data.taskOwner = this.$store.state.userData.user
				// when inserting a task, copy the sprintId from the parent PBI or sibling task
				newNode.data.sprintId = node.data.sprintId
			}

			// create a new document and store it
			const newDoc = {
				_id: newNode._id,
				type: 'backlogItem',
				productId: newNode.productId,
				parentId: newNode.parentId,
				sprintId: node.data.sprintId,
				team: newNode.data.team,
				level: newNode.level,
				subtype: 0,
				state: newNode.data.state,
				tssize: 3,
				spsize: 0,
				spikepersonhours: 0,
				reqarea: null,
				dependencies: [],
				conditionalFor: [],
				title: newNode.title,
				followers: [],
				description: window.btoa(''),
				acceptanceCriteria: newNode.level < this.taskLevel ? window.btoa('<p>Please do not neglect</p>') : window.btoa('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: newNode.data.priority,
				comments: [{
					ignoreEvent: 'comments initiated',
					timestamp: now,
					distributeEvent: false
				}],
				history: [{
					createEvent: [newNode.level, window.slVueTree.getNodeById(newNode.parentId).title, newNode.ind + 1],
					by: this.$store.state.userData.user,
					timestamp: now,
					sessionId: this.$store.state.mySessionId,
					distributeEvent: true,
					updateBoards: { sprintsAffected: [node.data.sprintId], teamsAffected: [newNode.data.team] }
				}]
			}
			// update the database, create the node and select this document
			this.$store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
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
		if (!this.$store.state.busyRemovingBranch) {
			const selectedNode = this.contextNodeSelected
			if (this.haveAccessInTree(selectedNode.productId, selectedNode.level, selectedNode.data.team, 'remove this item')) {
				// when removing a product
				if (selectedNode.level === this.productLevel) {
					if (this.getMyAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
						// cannot remove the last assigned product or product in the tree
						this.showLastEvent('You cannot remove your last assigned product, but you can remove the epics', SEV.WARNING)
						return
					}
				}
				this.showLastEvent('Busy removing branch...', SEV.INFO)
				// set remove mark in the database on the clicked item and descendants (if any), then remove the node
				this.$store.dispatch('removeBranch', { node: selectedNode, undoOnError: false })
			}
		} else this.showLastEvent('Busy removing another branch. Please try later', SEV.WARNING)
	},

	/* Undo the tree expansion and highlighting */
	undoShowDependencies(dependenciesObjects) {
		for (const o of dependenciesObjects) {
			const node = window.slVueTree.getNodeById(o._id)
			if (node) window.slVueTree.undoShowPath(node, 'dependency', 'isHighlighted_2')
		}
	},

	/* Remove the dependencies and the corresponding conditions in the tree model and the database. */
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

	/* Remove the conditions and the corresponding dependencies in the tree model and the database. */
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
