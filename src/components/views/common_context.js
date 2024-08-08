import { SEV, STATE, MISC } from '../../constants.js'
import { uniTob64, createId } from '../../common_functions.js'
import { authorization, utilities } from '../mixins/generic.js'
import store from '../../store/store.js'

function created() {
	this.ONHOLDSTATE = 1
	this.NEWSTATE = 2
	this.DONESTATE = 6

	this.DATABASELEVEL = 1
	this.PRODUCTLEVEL = 2
	this.EPICLEVEL = 3
	this.FEATURELEVEL = 4
	this.PBILEVEL = 5
	this.TASKLEVEL = 6

	this.INSERTBELOW = 0
	this.INSERTINSIDE = 1
	this.MOVETOPRODUCT = 2
	this.REMOVEITEM = 3
	this.ASIGNTOMYTEAM = 4
	this.SETDEPENDENCY = 6
	this.SHOWDEPENDENCIES = 7
	this.SHOWCONDITIONS = 8
	this.CLONEPRODUCT = 9
	this.CLONEBRANCH = 10
	this.CLONEITEM = 11
	this.REMOVEREQAREA = 12
	this.USTOSPRINT = 13
	this.TASKTOSPRINT = 14
	this.FROMSPRINT = 15
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
		store.dispatch('cloneBranch', node)
	},

	/* Clone a branch INCLUDING its descendants */
	doCloneBranch(node) {
		store.dispatch('cloneBranch', node)
	},

	/* Copy an item EXCLUDING its descendants, attachments, sprintId, dependencies, conditions and followers
	* Initiate followers with empty array (no folowers)
	* Insert the new node above the original (inside or after the previous node)
	*/
	doCopyItem(node) {
		const now = Date.now()
		let newNodeLocation
		const prevNode = store.state.helpersRef.getPreviousNode(node.path)
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
				lastChange: now,
				followers: []
			},
			tmp: {}
		}

		const preFligthData = store.state.helpersRef.preFlightSingeNodeInsert(newNodeLocation, newNode)
		newNode.productId = preFligthData.productId
		newNode.parentId = preFligthData.parentId
		newNode.level = preFligthData.level
		newNode.ind = preFligthData.ind
		newNode.data.priority = preFligthData.priority

		// create a new document as a partial copy of the current document
		const currentDoc = store.state.currentDoc
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
			description: uniTob64(currentDoc.description),
			acceptanceCriteria: uniTob64(currentDoc.acceptanceCriteria),
			priority: newNode.data.priority,
			comments: [{
				ignoreEvent: 'comments initiated',
				timestamp: now,
				distributeEvent: false
			}],
			history: [{
				copyItemEvent: [newNode.level, store.state.helpersRef.getNodeById(newNode.parentId).title, newNode.ind + 1],
				by: store.state.userData.user,
				email: store.state.userData.email,
				timestamp: now,
				sessionId: store.state.mySessionId,
				doNotMessageMyself: store.state.userData.myOptions.doNotMessageMyself === 'true',
				distributeEvent: true
			}]
		}
		store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
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

		const preFligthData = store.state.helpersRef.preFlightSingeNodeInsert(newNodeLocation, newNode)
		newNode.productId = preFligthData.productId
		newNode.parentId = preFligthData.parentId
		newNode.level = preFligthData.level
		newNode.ind = preFligthData.ind
		newNode.data.priority = preFligthData.priority
		// copy the parent's followers
		newNode.data.followers = preFligthData.parentFollowers

		if (newNode.level === SEV.TASK) {
			// when inserting a task, copy the team name from the parent PBI or sibling task
			newNode.data.team = node.data.team
		} else newNode.data.team = this.myTeam

		if (this.haveAccessInTree(newNode.productId, newNode.level, newNode.data.team, 'create new items of this type')) {
			newNode.title = newNode.parentId === MISC.AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(newNode.level)
			if (newNode.level === SEV.TASK) {
				// when inserting a task, set the task owner to the current user
				newNode.data.taskOwner = store.state.userData.user
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
				followers: newNode.data.followers,
				description: uniTob64('<p><br></p>'),
				acceptanceCriteria: newNode.level < this.TASKLEVEL ? uniTob64('<p>Please do not neglect</p>') : uniTob64('<p>See the acceptance criteria of the story/spike/defect.</p>'),
				priority: newNode.data.priority,
				comments: [{
					ignoreEvent: 'comments initiated',
					timestamp: now,
					distributeEvent: false
				}],
				history: [{
					createItemEvent: [newNode.level, store.state.helpersRef.getNodeById(newNode.parentId).title, newNode.ind + 1],
					by: store.state.userData.user,
					email: store.state.userData.email,
					timestamp: now,
					sessionId: store.state.mySessionId,
					doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true',
					distributeEvent: true,
					updateBoards: { sprintsAffected: [node.data.sprintId], teamsAffected: [newNode.data.team] }
				}]
			}
			store.dispatch('createDocWithParentHist', { newNodeLocation, newNode, newDoc })
		}
	},

	doSetDependency() {
		if (store.state.selectNodeOngoing) {
			store.dispatch('setDepAndCond', { dependentOnNode: this.dependentOnNode, conditionalForNode: this.contextNodeSelected, timestamp: Date.now() })
		} else {
			// save the node the dependency will be added to
			this.dependentOnNode = this.contextNodeSelected
			store.state.selectNodeOngoing = true
		}
	},

	/*
	* In the database both the selected node and all its descendants will be tagged with a delmark
	* The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
	*/
	doRemove() {
		const selectedNode = this.contextNodeSelected
		if (this.haveAccessInTree(selectedNode.productId, selectedNode.level, selectedNode.data.team, 'remove this item')) {
			// when removing a product
			if (selectedNode.level === this.PRODUCTLEVEL) {
				if (this.getMyAssignedProductIds.length === 1 || store.state.helpersRef.getProducts().length <= 1) {
					// cannot remove the last assigned product or product in the tree
					this.showLastEvent('You cannot remove your last assigned product, but you can remove the epics', SEV.WARNING)
					return
				}
			}
			this.showLastEvent('Busy removing branch...', SEV.INFO)
			// set remove mark in the database on the clicked item and descendants (if any), then remove the node
			store.dispatch('removeBranch', { node: selectedNode, undoOnError: false })
		}
	},

	/* Return an array with the product node aNode is a descendant of, or an empty array if no parent is found */
	getProductNode(aNode) {
		const allProductNodes = store.state.helpersRef.getProducts()
		for (let nm of allProductNodes) {
			if (nm.productId === aNode.productId) return [nm]
		}
		return []
	},

	/* Undo the tree expansion and highlighting */
	undoShowDependencies(nodesToScan) {
		store.commit('restoreTreeView', { type: 'dependency', nodesToScan })
	},

	/* Undo the tree expansion and highlighting */
	undoShowConditions(nodesToScan) {
		store.commit('restoreTreeView', { type: 'condition', nodesToScan })
	},

	/* Remove the dependencies and the corresponding conditions in the tree model and the database. */
	doRemoveDependencies() {
		if (this.selectedDependencyIds && this.selectedDependencyIds.length > 0) {
			this.undoShowDependencies(this.getProductNode(this.contextNodeSelected))
			const newDeps = []
			for (const id of this.contextNodeSelected.dependencies) {
				if (!this.selectedDependencyIds.includes(id)) newDeps.push(id)
			}
			store.dispatch('removeDependenciesAsync', { node: this.contextNodeSelected, newDeps, removedIds: this.selectedDependencyIds, timestamp: Date.now() })
		}
	},

	/* Remove the conditions and the corresponding dependencies in the tree model and the database. */
	doRemoveConditions() {
		if (this.selectedConditionIds && this.selectedConditionIds.length > 0) {
			this.undoShowConditions(this.getProductNode(this.contextNodeSelected))
			const newCons = []
			for (const id of this.contextNodeSelected.conditions) {
				if (!this.selectedConditionIds.includes(id)) newCons.push(id)
			}
			store.dispatch('removeConditionsAsync', { node: this.contextNodeSelected, newCons, removedIds: this.selectedConditionIds, timestamp: Date.now() })
		}
	},

	/* Cancel the context menu */
	doCancel() {
		this.showAssistance = false
		store.state.moveOngoing = false
		store.state.selectNodeOngoing = false
		if (this.contextOptionSelected === this.SHOWDEPENDENCIES) {
			this.undoShowDependencies(this.getProductNode(this.contextNodeSelected))
		}
		if (this.contextOptionSelected === this.SHOWCONDITIONS) {
			this.undoShowConditions(this.getProductNode(this.contextNodeSelected))
		}
	},

	getDependencies() {
		this.dependenciesObjects = []
		this.allDepenciesFound = true
		const nodesToScan = this.getProductNode(this.contextNodeSelected)
		store.commit('saveTreeView', { nodesToScan, type: 'dependency' })
		for (const depId of this.contextNodeSelected.dependencies) {
			const item = store.state.helpersRef.getNodeById(depId)
			if (item) {
				store.state.helpersRef.showPathToNode(item, { doHighLight_2: true })
				this.dependenciesObjects.push({ _id: depId, title: item.title })
			} else this.allDepenciesFound = false
		}
		this.disableOkButton = !this.allDepenciesFound
	},

	getConditions() {
		this.conditionsObjects = []
		this.allConditionsFound = true
		const nodesToScan = this.getProductNode(this.contextNodeSelected)
		store.commit('saveTreeView', { nodesToScan, type: 'condition' })
		for (const conId of this.contextNodeSelected.conditionalFor) {
			const item = store.state.helpersRef.getNodeById(conId)
			if (item) {
				store.state.helpersRef.showPathToNode(item, { doHighLight_2: true })
				this.conditionsObjects.push({ _id: conId, title: item.title })
			} else this.allConditionsFound = false
		}
		this.disableOkButton = !this.allConditionsFound
	}
}

export default {
	mixins: [authorization, utilities],
	created,
	data,
	methods
}
