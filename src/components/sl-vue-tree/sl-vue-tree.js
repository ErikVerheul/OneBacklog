/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const FILTERBUTTONTEXT = 'Filter in tree view'
const INFO = 0
const WARNING = 1
const FEATURELEVEL = 4
const PBILEVEL = 5
const AREA_PRODUCTID = '0'
var lastSelectedNode = null
var draggableNodes = []
var selectedNodes = []
var nodeToDeselect = null

import { eventBus } from "../../main"
import { utilities } from '../mixins/utilities.js'

/*
* Update the descendants of the source (removal) or destination (insert) node with new position data and (if defined) new parentId and productId
* Pass an insertInd as the lowest index of any insert to gain performance.
*/
function updatePaths(parentPath, siblings, currentView, insertInd = 0, parentId = undefined, productId = undefined) {
	let leafLevel
	switch (currentView) {
		case 'products':
			leafLevel = PBILEVEL
			break
		case 'reqarea':
			leafLevel = FEATURELEVEL
			break
		default:
			leafLevel = PBILEVEL
	}
	for (let i = insertInd; i < siblings.length; i++) {
		const sibling = siblings[i]
		const newPath = parentPath.concat(i)
		if (parentId) sibling.parentId = parentId
		if (productId) sibling.productId = productId
		// if moving to another product show the inserted nodes in the new product
		if (productId) sibling.doShow = true
		sibling.path = newPath
		sibling.pathStr = JSON.stringify(newPath)
		sibling.ind = i
		sibling.level = newPath.length
		sibling.isLeaf = (sibling.level < leafLevel) ? false : true
		if (sibling.children && sibling.children.length > 0) {
			updatePaths(sibling.path, sibling.children, currentView, 0, sibling._id, productId)
		}
	}
}

/*
* Recalculate the priorities of the created(inserted, one node at the time) or moved nodes(can be one or more).
* Precondition: the nodes are inserted in the tree and all created or moved nodes have the same parent (same level).
*/
function assignNewPrios(nodes, predecessorNode, successorNode) {
	let predecessorPrio
	let successorPrio
	if (predecessorNode !== null) {
		predecessorPrio = predecessorNode.data.priority
	} else predecessorPrio = Number.MAX_SAFE_INTEGER

	if (successorNode !== null) {
		successorPrio = successorNode.data.priority
	} else successorPrio = Number.MIN_SAFE_INTEGER

	const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))
	for (let i = 0; i < nodes.length; i++) {
		// update the tree; timestamp is recorded in the history in the database
		nodes[i].data.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
		nodes[i].data.lastChange = Date.now()
	}
}

export default {
	name: 'sl-vue-tree',
	mixins: [utilities],
	props: {
		value: {
			type: Array,
			default: () => []
		},
		edgeSize: {
			type: Number,
			default: 3
		},
		showBranches: {
			type: Boolean,
			default: false
		},
		level: {
			type: Number,
			default: 0
		},
		parentInd: {
			type: Number
		},
		allowMultiselect: {
			type: Boolean,
			default: true
		},
		allowToggleBranch: {
			type: Boolean,
			default: true
		}
	},

	data() {
		return {
			rootCursorPosition: null,
			mouseIsDown: false,
			isDragging: false,
			lastMousePos: {
				x: 0,
				y: 0
			},
			preventDrag: false,
			currentValue: this.value,
			lastSelectCursorPosition: null
		};
	},

	mounted() {
		// suppress browser default context menu
		document.oncontextmenu = function () {
			return false;
		}
		if (this.isRoot) {
			document.addEventListener('mouseup', this.onDocumentMouseupHandler);
		}
	},

	beforeDestroy() {
		document.removeEventListener('mouseup', this.onDocumentMouseupHandler);
	},

	watch: {
		value(newValue) {
			this.currentValue = newValue
			this.emitNodesAreLoaded()
		}
	},

	computed: {
		cursorPosition() {
			if (this.isRoot) return this.rootCursorPosition;
			return this.getParentComponent().cursorPosition;
		},

		filteredNodes() {
			if (this.isRoot) {
				const retNodes = this.getNodes(this.currentValue)
				// console.log('filteredNodes1: returning ' + retNodes.length + ' nodes')
				return retNodes
			}
			const retNodes = this.getParentComponent().filteredNodes[this.parentInd].children.filter(node => {
				return node.doShow
			})
			// console.log('filteredNodes2: returning ' + retNodes.length + ' nodes')
			return retNodes
		},

		/**
		 * gaps is used for nodes indentation
		 * @returns {number[]}
		 */
		gaps() {
			const gaps = [];
			let i = this.level - 1;
			if (!this.showBranches) i++;
			while (i-- > 0) gaps.push(i);
			return gaps;
		},

		isRoot() {
			return this.level === 0
		}
	},

	methods: {
		setModelCursorPosition(pos) {
			if (this.isRoot) {
				this.rootCursorPosition = pos;
				return;
			}
			this.getParentComponent().setModelCursorPosition(pos);
		},

		getNodes(nodeModels) {
			return nodeModels.map((nm) => nm)
		},

		getNodeModel(path, tree = this.currentValue) {
			const ind = path[0]
			if (path.length === 1) return tree[ind] || null
			return this.getNodeModel(path.slice(1), tree[ind].children)
		},

		emitNodesAreLoaded() {
			this.getRootComponent().$emit('loaded')
		},

		emitSelect(selectedNodes, event) {
			this.getRootComponent().$emit('select', selectedNodes, event);
		},

		emitBeforeDrop(draggingNodes, position, cancel) {
			this.getRootComponent().$emit('beforedrop', draggingNodes, position, cancel);
		},

		emitDrop(beforeDropStatus, draggingNodes, position, event) {
			this.getRootComponent().$emit('drop', beforeDropStatus, draggingNodes, position, event);
		},

		emitToggle(toggledNode, event) {
			this.getRootComponent().$emit('toggle', toggledNode, event);
		},

		emitNodeClick(node, event) {
			this.getRootComponent().$emit('nodeclick', node, event);
		},

		// trigger the context component via the eventbus
		emitNodeContextmenu(node) {
			eventBus.$emit('contextMenu', node)
		},

		haveSameParent(nodes) {
			let parentId = nodes[0].parentId
			for (let i = 1; i < nodes.length; i++) {
				if (nodes[i].parentId !== parentId) {
					return false
				}
			}
			return true
		},

		/*
		* Select a node from the current product or select the root or the top node of another product.
		* Shift-select mode is allowed only if nodes are above productlevel and on the same level
		*/
		select(cursorPosition, event) {
			this.lastSelectCursorPosition = cursorPosition
			const selNode = cursorPosition.nodeModel
			this.preventDrag = false
			// if not in shift-select mode; note that lastSelectedNode can be null after a recompile without a new load
			if (!(selNode.level > PRODUCTLEVEL && lastSelectedNode && selNode.level === lastSelectedNode.level && this.allowMultiselect && event && event.shiftKey)) {
				// single selection mode: unselect all currently selected nodes, clear selectedNodes array and select the clicked node
				if (lastSelectedNode) lastSelectedNode.isSelected = false
				if (nodeToDeselect) nodeToDeselect.isSelected = false
				for (let node of selectedNodes) node.isSelected = false
				selectedNodes = []
			}
			selNode.isSelected = selNode.isSelectable
			lastSelectedNode = selNode
			selectedNodes.push(selNode)
			this.emitSelect(selectedNodes, event)
		},

		selectNodeById(id) {
			const selNode = this.getNodeById(id)
			if (selNode === null) return

			// single selection mode: unselect all currently selected nodes, clear selectedNodes array and select the clicked node
			if (lastSelectedNode) lastSelectedNode.isSelected = false
			if (nodeToDeselect) nodeToDeselect.isSelected = false
			for (let node of selectedNodes) node.isSelected = false
			selectedNodes = [selNode]
			selNode.isSelected = selNode.isSelectable
			lastSelectedNode = selNode
		},

		setLastSelectedNode(node) {
			lastSelectedNode = node
		},

		onMousemoveHandler(event) {
			if (!this.isRoot) {
				this.getRootComponent().onMousemoveHandler(event)
				return
			}

			if (this.preventDrag) return

			const initialDraggingState = this.isDragging;
			const isDragging =
				this.isDragging || (
					this.mouseIsDown &&
					(this.lastMousePos.y !== event.clientY)
				);

			const isDragStarted = !initialDraggingState && isDragging
			// calculate only once
			if (isDragStarted) {
				draggableNodes = []
				for (let node of selectedNodes) {
					if (node.isDraggable) {
						draggableNodes.push(node)
					}
				}
			}

			this.lastMousePos = {
				x: event.clientX,
				y: event.clientY
			};

			if (!isDragging) return

			if (!draggableNodes.length) {
				this.preventDrag = true
				return
			}

			this.isDragging = isDragging
			const cPos = this.getCursorModelPositionFromCoords(event.clientX, event.clientY)
			this.setModelCursorPosition(cPos)
		},

		onNodeMousedownHandler(event, node) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRootComponent().onNodeMousedownHandler(event, node);
				return;
			}
			this.mouseIsDown = true;
		},

		onNodeMouseupHandler(event) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRootComponent().onNodeMouseupHandler(event);
				return;
			}

			this.mouseIsDown = false;

			if (!this.isDragging) {
				// cursorPosition not available
				const cPos = this.getCursorModelPositionFromCoords(event.clientX, event.clientY)
				this.select(cPos, event)
				return
			}

			this.preventDrag = false;

			if (!this.cursorPosition) {
				this.stopDrag();
				return;
			}

			// stop drag if no nodes selected or at root level or moving an item to another product or selecting a node for registering a dependency
			if (draggableNodes.length === 0 || this.cursorPosition.nodeModel.level === DATABASELEVEL || this.$store.state.moveOngoing || this.$store.state.selectNodeOngoing) {
				if (this.$store.state.moveOngoing) this.showLastEvent('Cannot drag while moving items to another product. Complete or cancel the move in context menu.', WARNING)
				if (this.$store.state.selectNodeOngoing) this.showLastEvent('Cannot drag while selecting a dependency. Complete or cancel the selection in context menu.', WARNING)
				this.stopDrag()
				return
			}

			// check if nodes are possible to insert
			for (let draggingNode of draggableNodes) {
				// cannot drag to it self
				if (draggingNode.pathStr === this.cursorPosition.nodeModel.pathStr) {
					this.stopDrag()
					return
				}
				// prevent drag to other product when not in reqarea view
				if (this.$store.state.currentView != 'reqarea' && this.cursorPosition.nodeModel.productId !== this.$store.state.currentProductId) {
					this.showLastEvent('Cannot drag to another product. Use the context menu (right click)', WARNING)
					this.stopDrag()
					return
				}
				// prevent placement on wrong level when the user selects the parent as target node to insert after
				if (this.cursorPosition.placement === 'after' && this.cursorPosition.nodeModel.level < draggingNode.level) {
					this.stopDrag()
					return
				}
			}

			// allow the drop to be cancelled
			let cancelled = false;
			this.emitBeforeDrop(draggableNodes, this.cursorPosition, () => cancelled = true);

			if (cancelled) {
				this.stopDrag();
				return;
			}

			// sort the nodes on priority (highest first)
			draggableNodes.sort((h, l) => l.data.priority - h.data.priority)
			// save the status 'as is' before the move
			const beforeDropStatus = this.moveNodes(this.cursorPosition, draggableNodes)

			this.emitDrop(beforeDropStatus, draggableNodes, this.cursorPosition, event)
			this.stopDrag()
		},

		/* When filters did hide nodes undo this when the user expands a node */
		unhideDescendants(node) {
			this.traverseModels((nm) => {
				nm.doShow = true
			}, [node])
		},

		onToggleHandler(event, node) {
			if (!this.allowToggleBranch) return;
			node.isExpanded = !node.isExpanded
			if (node.isExpanded) this.unhideDescendants(node)
			this.showLastEvent(`Node '${node.title}' is ${node.isExpanded ? 'expanded' : 'collapsed'}`, INFO)
			this.emitToggle(node, event);
			event.stopPropagation();
		},

		getCursorModelPositionFromCoords(x, y) {
			function getClosestElementWithPath($el) {
				if (!$el) return null;
				if ($el.getAttribute('path')) return $el;
				return getClosestElementWithPath($el.parentElement);
			}

			const $target = document.elementFromPoint(x, y);
			const $nodeItem = $target.getAttribute('path') ? $target : getClosestElementWithPath($target);
			if (!$nodeItem) return

			let placement
			const pathStr = $nodeItem.getAttribute('path')
			const path = JSON.parse(pathStr)
			const nodeModel = this.getNodeModel(path)
			const nodeHeight = $nodeItem.offsetHeight
			const edgeSize = this.edgeSize
			const offsetY = y - $nodeItem.getBoundingClientRect().top

			if (nodeModel.isLeaf) {
				placement = offsetY >= nodeHeight / 2 ? 'after' : 'before';
			} else {
				// multiply edgeSize with 2 to enlarge the window for 'before' placement
				if (offsetY <= edgeSize * 2) {
					placement = 'before';
				} else if (offsetY >= nodeHeight - edgeSize) {
					placement = 'after';
				} else {
					placement = 'inside';
				}
			}
			return {
				nodeModel,
				placement
			}
		},

		getDescendantsInfo(node) {
			const ids = []
			const descendants = []
			let initLevel = node.level
			let count = 0
			let maxDepth = node.level
			this.traverseModels((nm) => {
				if (this.comparePaths(nm.path, node.path) === 1) {
					ids.push(nm._id)
					descendants.push(nm)
					count++
					if (nm.level > maxDepth) maxDepth = nm.level
				}
			}, [node])
			return {
				ids,
				descendants,
				count,
				depth: maxDepth - initLevel
			}
		},

		getProductTitle(productId) {
			if (this.currentValue[0].children) {
				const products = this.currentValue[0].children
				for (let i = 0; i < products.length; i++) {
					if (products[i].productId === productId) {
						return products[i].title
					}
				}
			}
			return 'product title not found'
		},

		/**
		 * returns 1 if path1 > path2
		 * returns -1 if path1 < path2
		 * returns 0 if path1 === path2
		 *
		 * examples
		 *
		 * [1, 2, 3] < [1, 2, 4]
		 * [1, 1, 3] < [1, 2, 3]
		 * [1, 2, 3] > [1, 2, 0]
		 * [1, 2, 3] > [1, 1, 3]
		 * [1, 2] < [1, 2, 0]
		 *
		 */
		comparePaths(path1, path2) {
			for (let i = 0; i < path1.length; i++) {
				if (path2[i] === undefined) return 1;
				if (path1[i] > path2[i]) return 1;
				if (path1[i] < path2[i]) return -1;
			}
			return path2[path1.length] === undefined ? 0 : -1;
		},

		stopDrag() {
			this.isDragging = false;
			this.mouseIsDown = false;
			this.setModelCursorPosition(null);
		},

		getParentComponent() {
			return this.$parent;
		},

		getRootComponent() {
			if (this.isRoot) return this;
			return this.getParentComponent().getRootComponent();
		},

		getNodeSiblings(path, nodes = this.currentValue) {
			if (path.length === 1) return nodes
			return this.getNodeSiblings(path.slice(1), nodes[path[0]].children || [])
		},

		// return the node of the selected productId / current productId or the full tree if the product is not found
		getProductModels(productId = this.$store.state.currentProductId) {
			const productModels = this.currentValue[0].children
			for (let p of productModels) {
				if (p.productId === productId) {
					return [p]
				}
			}
			return this.currentValue
		},

		removeProduct(productId) {
			const newChildren = []
			for (let p of this.currentValue[0].children) {
				if (p._id !== productId) newChildren.push(p)
			}
			this.currentValue[0].children = newChildren
			// recalculate the paths in the tree
			updatePaths([0], newChildren, this.$store.state.currentView)
		},

		getRootNode() {
			return this.currentValue[0]
		},

		getProducts() {
			return this.currentValue[0].children
		},

		getChildNodesOfParent(id) {
			const node = this.getNodeById(id)
			if (node === null) return []
			return node.children
		},

		getChildIdsOfParent(id) {
			const node = this.getNodeById(id)
			if (node === null) return []
			const childIds = []
			for (let c of node.children) {
				childIds.push(c._id)
			}
			return childIds
		},

		traverseModels(cb, nodeModels = this.currentValue) {
			let shouldStop = false
			function traverse(cb, nodeModels) {
				if (shouldStop) return

				for (let nm of nodeModels) {
					if (cb(nm) === false) {
						shouldStop = true
						break
					}
					if (nm.children) traverse(cb, nm.children)
				}
			}
			traverse(cb, nodeModels)
		},

		getNodeById(id) {
			let resultNode = null
			this.traverseModels((nm) => {
				if (nm._id === id) {
					resultNode = nm
					return false
				}
			})
			return resultNode
		},

		getNextSibling(path) {
			const nextPath = path.slice(0, -1).concat(path.slice(-1)[0] + 1)
			return this.getNodeModel(nextPath)
		},

		getPreviousNode(path) {
			let prevPath
			if (path.slice(-1)[0] === 0) {
				// the node is a first child
				prevPath = path.slice(0, -1)
			} else {
				// the node has a previous sibling
				prevPath = path.slice(0, -1).concat(path.slice(-1)[0] - 1)
			}
			return this.getNodeModel(prevPath)
		},

		/* Area nodes are per definition children of product with id AREA_PRODUCTID. Return these nodes or null if none found */
		getReqAreaNodes() {
			const productModels = this.currentValue[0].children
			for (let p of productModels) {
				if (p._id === AREA_PRODUCTID) {
					return p.children
				}
			}
			return null
		},

		/* Find the ids with a set req area in the current product */
		getCurrentReqAreaIds() {
			const idsWithReqArea = []
			this.traverseModels((nm) => {
				if (nm.data.reqarea) {
					if (!idsWithReqArea.includes(nm.data.reqarea)) idsWithReqArea.push(nm.data.reqarea)
				}
			}, this.getProductModels())
			return idsWithReqArea
		},

		resetReqArea(id) {
			this.traverseModels((nm) => {
				if (nm.data.reqarea === id) {
					nm.data.reqarea = null
				}
			})
		},

		/* Insert the nodeModels in the tree model inside, after or before the node at cursorposition. */
		insert(cursorPosition, nodes, calculatePrios = true) {
			const destNodeModel = cursorPosition.nodeModel
			const productId = destNodeModel.productId
			let predecessorNode
			let successorNode
			if (cursorPosition.placement === 'inside') {
				// insert inside a parent -> the nodes become top level children
				const destSiblings = destNodeModel.children || []
				const parentId = destNodeModel._id
				predecessorNode = null
				destSiblings.unshift(...nodes)
				successorNode = destSiblings[nodes.length] || null
				if (destNodeModel.path.length === 1) {
					// inserting a product
					updatePaths(destNodeModel.path, destSiblings, this.$store.state.currentView)
				} else updatePaths(destNodeModel.path, destSiblings, this.$store.state.currentView, 0, parentId, productId)
			} else {
				// insert before or after the cursor position
				const destSiblings = this.getNodeSiblings(destNodeModel.path)
				const parentId = destNodeModel.parentId
				const parentPath = destNodeModel.path.slice(0, -1)
				const insertInd = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
				predecessorNode = destSiblings[insertInd - 1] || null
				destSiblings.splice(insertInd, 0, ...nodes)
				successorNode = destSiblings[insertInd + nodes.length] || null
				if (parentPath.length === 1) {
					// inserting a product
					updatePaths(parentPath, destSiblings, this.$store.state.currentView, insertInd)
				} else updatePaths(parentPath, destSiblings, this.$store.state.currentView, insertInd, parentId, productId)
			}
			if (calculatePrios) assignNewPrios(nodes, predecessorNode, successorNode)
		},

		/* Insert the node and save it so that it is deselected on the next select */
		insertSingle(cursorPosition, node) {
			nodeToDeselect = node
			this.insert(cursorPosition, [node])
		},

		/* Remove nodes from the tree model. Return true if any node was removed */
		remove(nodes) {
			let success = false
			for (let node of nodes) {
				const siblings = this.getNodeSiblings(node.path)
				if (siblings.length > 0) {
					const removeInd = node.ind
					const parentPath = node.path.slice(0, -1)
					siblings.splice(removeInd, 1)
					updatePaths(parentPath, siblings, this.$store.state.currentView, removeInd)
					success = true
				}
			}
			return success
		},


		moveBack(entry) {
			function isRestoredNode(child, nodes) {
				for (let n of nodes) {
					if (n._id === child._id) return true
				}
				return false
			}
			/* Find patches of consecutive inserted items to recalculate their priorities against the predecessor and the successor of the patch */
			function recalculatePriorities(nodes, children) {
				// sort the nodes on priority (highest first)
				nodes.sort((h, l) => l.data.priority - h.data.priority)
				// find patches of restored nodes
				let predecessorNode = null
				let successorNode
				let patch = []
				for (let c of children) {
					if (isRestoredNode(c, nodes)) {
						patch.push(c)
					} else {
						if (patch.length === 0) {
							predecessorNode = c
						} else {
							successorNode = c
							assignNewPrios(patch, predecessorNode, successorNode)
							// find the next patch
							predecessorNode = c
							patch = []
						}
					}
				}
				// last element in children was restored
				if (patch.length !== 0) {
					assignNewPrios(patch, predecessorNode, null)
				}
			}

			const beforeDropStatus = entry.beforeDropStatus
			const restoredChildren = []
			const restoredSourceChildren = []
			const restoredTargetChildren = []
			if (beforeDropStatus.sourceParentId === beforeDropStatus.targetParentId) {
				for (let id of beforeDropStatus.savedSourceChildrenIds) {
					const node = this.getNodeById(id)
					restoredChildren.push(node)
				}
				const commonParent = this.getNodeById(beforeDropStatus.sourceParentId)
				commonParent.children = restoredChildren
				updatePaths(commonParent.path, commonParent.children, this.$store.state.currentView)
			} else {
				for (let id of beforeDropStatus.savedSourceChildrenIds) {
					const node = this.getNodeById(id)
					restoredSourceChildren.push(node)
				}
				const sourceParent = this.getNodeById(beforeDropStatus.sourceParentId)
				sourceParent.children = restoredSourceChildren
				updatePaths(sourceParent.path, sourceParent.children, this.$store.state.currentView, 0, beforeDropStatus.sourceParentId)

				for (let id of beforeDropStatus.savedTargetChildrenIds) {
					const node = this.getNodeById(id)
					restoredTargetChildren.push(node)
				}
				const targetParent = this.getNodeById(beforeDropStatus.targetParentId)
				targetParent.children = restoredTargetChildren
				updatePaths(targetParent.path, targetParent.children, this.$store.state.currentView, 0, beforeDropStatus.targetParentId)
			}
			if (restoredChildren.length > 0) recalculatePriorities(beforeDropStatus.nodes, restoredChildren)
			if (restoredSourceChildren.length > 0) recalculatePriorities(beforeDropStatus.nodes, restoredSourceChildren)
			if (restoredTargetChildren.length > 0) recalculatePriorities(beforeDropStatus.nodes, restoredTargetChildren)
		},

		/* Remove the node and save the current selected node so that it is deselected on the next select */
		removeSingle(node, currentSelectedNode) {
			nodeToDeselect = currentSelectedNode
			this.remove([node])
		},

		getChildrenIds(parentId) {
			const node = this.getNodeById(parentId)
			const ids = []
			for (let c of node.children) {
				ids.push(c._id)
			}
			return ids
		},

		/* Move the nodes (must have the same parent) to the position designated by cursorPosition */
		moveNodes(cursorPosition, nodes) {
			// save the status of source and target before move
			const sourceParentId = nodes[0].parentId
			const targetParentId = cursorPosition.placement === 'inside' ? cursorPosition.nodeModel._id : cursorPosition.nodeModel.parentId
			const savedSourceChildrenIds = this.getChildrenIds(sourceParentId)
			const savedTargetChildrenIds = this.getChildrenIds(targetParentId)
			const beforeDropStatus = { nodes, sourceParentId, savedSourceChildrenIds, targetParentId, savedTargetChildrenIds }

			this.remove(nodes)
			this.insert(cursorPosition, nodes)
			return beforeDropStatus
		},

		/* test code */
		showVisibility(caller, toLevel = 3) {
			this.traverseModels((nm) => {
				// collapse to the product level
				if (nm.level <= toLevel) {
					// eslint-disable-next-line no-console
					console.log('showVisibility: path = ' + nm.path + ' level = ' + nm.level + ' isExpanded = ' + nm.isExpanded +
						' savedIsExpanded = ' + nm.savedIsExpanded + ' doShow = ' + nm.doShow + ' title = ' + nm.title + ' caller = ' + caller)
				}
			})
		},

		/* collapse the branch below the current product and hide the nodes */
		collapseTree(allProducts) {
			const currentProduct = allProducts ? undefined : this.getProductModels()
			this.traverseModels((nm) => {
				if (nm.level === PRODUCTLEVEL) {
					// skip requirements area dummy product
					if (nm._id === AREA_PRODUCTID) return
					nm.isExpanded = false
				}
				if (nm.level > PRODUCTLEVEL) {
					nm.doShow = false
				}
			}, currentProduct)
			// this.showVisibility('collapseTree')
		},

		/* show the current selected product */
		expandTree(allProducts) {
			const currentProduct = allProducts ? undefined : this.getProductModels()
			this.traverseModels((nm) => {
				if (nm.level < FEATURELEVEL) {
					nm.isExpanded = true
				}
				if (nm.level <= FEATURELEVEL) {
					nm.doShow = true
				}
			}, currentProduct)
			// this.showVisibility('expandTree')

		},

		showAndSelectItem(node) {
			// returns true if the path starts with the subPath
			function isInPath(subPath, path) {
				if (subPath.length > path.length) return false
				for (let i = 0; i < subPath.length; i++) {
					if (subPath[i] !== path[i]) return false
				}
				return true
			}
			this.traverseModels((nm) => {
				// unselect any previous selections
				nm.isSelected = false
				// if on the node path
				if (isInPath(nm.path, node.path)) {
					nm.savedIsExpanded = true
					nm.isExpanded = true
					nm.savedDoShow = true
					nm.doShow = true
				}
				// select the item
				if (nm.shortId === node.shortId) {
					nm.isSelected = true
					// save this node so that it is deselected on the next select
					nodeToDeselect = nm
					return false
				}
			})
			// this.showVisibility('showAndSelectItem')
		},

		resetTree(allProducts) {
			const currentProduct = allProducts ? undefined : this.getProductModels()
			this.traverseModels((nm) => {
				// skip requirements area dummy product
				if (nm._id === AREA_PRODUCTID) return

				nm.isHighlighted = false
				nm.doShow = nm.savedDoShow
				nm.isExpanded = nm.savedIsExpanded
			}, currentProduct)
		},

		/* clear any outstanding filters and searches of the current product (default) or all products */
		resetFilters(caller, allProducts) {
			// eslint-disable-next-line no-console
			console.log('resetFilters is called by ' + caller)
			if (this.$store.state.filterOn) {
				this.resetTree(allProducts)
				allProducts ? this.showLastEvent(`Your filter is cleared`, INFO) :
					this.showLastEvent(`Your filter in product '${this.$store.state.currentProductTitle}' is cleared`, INFO)
				this.$store.state.filterText = FILTERBUTTONTEXT
				this.$store.state.filterOn = false
			}
			if (this.$store.state.searchOn) {
				this.resetTree(allProducts)
				allProducts ? this.showLastEvent(`Your search is cleared`, INFO) :
					this.showLastEvent(`Your search in product '${this.$store.state.currentProductTitle}' is cleared`, INFO)
				this.$store.state.searchOn = false
			}
		},

		resetFindOnId(caller, ALLPRODUCTS) {
			// eslint-disable-next-line no-console
			console.log('resetFindOnId is called by ' + caller)
			this.resetTree(ALLPRODUCTS)
			ALLPRODUCTS ? this.showLastEvent(`Your view is restored`, INFO) :
				this.showLastEvent(`Your view on product '${this.$store.state.currentProductTitle}' is restored`, INFO)
			this.$store.state.findIdOn = false
		},

		/* Show the path from productlevel to and including the node */
		showPathToNode(node) {
			for (let i = PRODUCTLEVEL; i < node.path.length; i++) {
				const nm = this.getNodeModel(node.path.slice(0, i))
				nm.doShow = true
				nm.isExpanded = true
			}
		},

		getParentNode(node) {
			for (let i = DATABASELEVEL; i < node.path.length; i++) {
				let path = node.path.slice(0, i)
				if (path.length === node.path.length - 1) {
					return this.getNodeModel(path)
				}
			}
		},

		/*
		* Show the path from productlevel to the node up to an maximum depth
		* Return true if the node is shown, that is when the parent is expanded
		*/
		expandPathToNode(node, maxDepth = node.level) {
			for (let i = PRODUCTLEVEL; i < node.level; i++) {
				const nm = this.getNodeModel(node.path.slice(0, i))
				if (i < maxDepth) {
					nm.isExpanded = true
				}
			}
			return node.level <= maxDepth
		},

		hasHighlightedDescendants(node) {
			let result = false
			this.traverseModels((nm) => {
				if (nm.isHighlighted) {
					result = true
					return false
				}
			}, [node])
			return result
		},

		findDependencyViolations(allProducts) {
			const currentProduct = allProducts ? undefined : this.getProductModels()
			let violations = []
			this.traverseModels((nm) => {
				// remove any left dependency markers
				if (nm.markViolation) nm.markViolation = false
				if (nm.conditionalFor && nm.conditionalFor.length > 0) {
					for (let condId of nm.conditionalFor) {
						const dep = this.getNodeById(condId)
						if (dep !== null && this.comparePaths(nm.path, dep.path) === -1) {
							violations.push({ condNode: nm, depNode: dep })
						}
					}
				}
			}, currentProduct)
			return violations
		},

		/* Show the path from condNode to depNode not including both nodes */
		showDependencyViolations(violation, allProducts) {
			const currentProduct = allProducts ? undefined : this.getProductModels()
			this.traverseModels((nm) => {
				if ((this.comparePaths(violation.depNode.path, nm.path) === 1) && (this.comparePaths(nm.path, violation.condNode.path) === 1)) {
					this.getParentNode(violation.condNode).isExpanded = true
					this.getParentNode(violation.depNode).isExpanded = true
					nm.doShow = true
					nm.markViolation = true
				}
			}, currentProduct)
		},

		/* When nodes are deleted orphan dependencies can be created. This method removes them. */
		correctDependencies(productId, nodeIds) {
			const removedIntDependencies = []
			const removedIntConditions = []
			const removedExtDependencies = []
			const removedExtConditions = []
			this.traverseModels((nm) => {
				const newDependencies = []
				if (nm.dependencies && nm._id) {
					if (nodeIds.includes(nm._id)) {
						// nm is one of the nodes
						for (let d of nm.dependencies) {
							// dependency references within the nodes survive
							if (nodeIds.includes(d)) {
								newDependencies.push(d)
							} else removedIntDependencies.push({ id: nm._id, dependentOn: d })
						}
					} else {
						// nm is an outsider
						for (let d of nm.dependencies) {
							// outsider references not referencing any of the nodes survive
							if (!nodeIds.includes(d)) {
								newDependencies.push(d)
							} else removedExtDependencies.push({ id: nm._id, dependentOn: d })
						}
					}
					nm.dependencies = newDependencies
				}

				const newConditionalFor = []
				if (nm.conditionalFor && nm._id) {
					if (nodeIds.includes(nm._id)) {
						// nm is one of the nodes
						for (let c of nm.conditionalFor) {
							// dependency references within the nodes survive
							if (nodeIds.includes(c)) {
								newConditionalFor.push(c)
							} else removedIntConditions.push({ id: nm._id, conditionalFor: c })
						}
					} else {
						// nm is an outsider
						for (let c of nm.conditionalFor) {
							// outsider references not referencing any of the nodes survive
							if (!nodeIds.includes(c)) {
								newConditionalFor.push(c)
							} else removedExtConditions.push({ id: nm._id, conditionalFor: c })
						}
					}
					nm.conditionalFor = newConditionalFor
				}
			}, this.getProductModels(productId))
			return { removedIntDependencies, removedIntConditions, removedExtDependencies, removedExtConditions }
		}
	}
}
