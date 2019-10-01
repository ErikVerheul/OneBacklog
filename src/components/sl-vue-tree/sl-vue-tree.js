/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
const ROOTLEVEL = 1
const PRODUCTLEVEL = 2
const PBILEVEL = 5
const FILTERBUTTONTEXT = 'Recent changes'
const INFO = 0
var lastSelectedNode = null
var draggableNodes = []
var selectedNodes = []
var nodeToDeselect = null

import { eventBus } from "../../main"
import { utilities } from '../mixins/utilities.js'

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
		value: function (newValue) {
			this.currentValue = newValue;
		}
	},

	computed: {
		cursorPosition() {
			if (this.isRoot) return this.rootCursorPosition;
			return this.getParentComponent().cursorPosition;
		},

		filteredNodes() {
			if (this.isRoot) {
				const nodeModels = this.currentValue
				const retNodes = this.getNodes(nodeModels.filter(node => {
					return node.doShow
				}))
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
		 * gaps is using for nodes indentation
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
			return nodeModels.map((nodeModel) => nodeModel)
		},

		getNodeModel(path, tree = this.currentValue) {
			const ind = path[0]
			if (path.length === 1) return tree[ind] || null
			return this.getNodeModel(path.slice(1), tree[ind].children)
		},

		emitSelect(selectedNodes, event) {
			this.getRootComponent().$emit('select', selectedNodes, event);
		},

		emitBeforeDrop(draggingNodes, position, cancel) {
			this.getRootComponent().$emit('beforedrop', draggingNodes, position, cancel);
		},

		emitDrop(draggingNodes, position, event) {
			this.getRootComponent().$emit('drop', draggingNodes, position, event);
		},

		emitToggle(toggledNode, event) {
			this.getRootComponent().$emit('toggle', toggledNode, event);
		},

		emitNodeClick(node, event) {
			this.getRootComponent().$emit('nodeclick', node, event);
		},

		// trigger the context component via the eventbus
		emitNodeContextmenu(node) {
			eventBus.$emit('context', node)
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

			// stop drag if no nodes selected or at root level or moving an item to another product
			if (draggableNodes.length === 0 || this.cursorPosition.nodeModel.level === ROOTLEVEL || this.$store.state.moveOngoing) {
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
				// prevent drag to other product
				if (this.cursorPosition.nodeModel.productId !== this.$store.state.load.currentProductId) {
					this.stopDrag()
					return
				}
				// prevent confusion when the user selects a target node to insert before when that node has a lower level (higher in the hierarchy)
				if (this.cursorPosition.placement === 'before' && this.cursorPosition.nodeModel.level < draggingNode.level) {
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
			// console.log('onNodeMouseupHandler: moveNodes is called, draggableNodes.length = ' + draggableNodes.length)
			// console.log('onNodeMouseupHandler: JSON.stringify(draggableNodes, null, 2) = ' + JSON.stringify(draggableNodes, null, 2))
			this.moveNodes(this.cursorPosition, draggableNodes)

			this.emitDrop(draggableNodes, this.cursorPosition, event);
			this.stopDrag();
		},

		onToggleHandler(event, node) {
			if (!this.allowToggleBranch) return;
			node.isExpanded = !node.isExpanded
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
			const descendants = []
			let initLevel = node.level
			let count = 0
			let maxDepth = node.level
			this.traverseModels((nodeModel) => {
				if (this.comparePaths(nodeModel.path, node.path) === 1) {
					descendants.push(nodeModel)
					count++
					if (nodeModel.level > maxDepth) maxDepth = nodeModel.level
				}
			}, [node])
			return {
				descendants: descendants,
				count: count,
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

		/* Get the product selected during load */
		getSelectedProduct() {
			const productModels = this.currentValue[0].children
			for (let i = 0; i < productModels.length; i++) {
				const node = productModels[i]
				if (node.isSelected) {
					lastSelectedNode = node
					return node
				}
			}
		},

		getProductModels(productId = this.$store.state.load.currentProductId) {
			const productModels = this.currentValue[0].children
			for (let i = 0; i < productModels.length; i++) {
				if (productModels[i].productId === productId) {
					return productModels[i].children
				}
			}
			// return the full tree if not found
			return this.currentValue
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
			this.traverseModels((nodeModel) => {
				if (nodeModel._id === id) {
					resultNode = nodeModel
					return false
				}
			}, this.currentValue)
			return resultNode
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

		/* Update the descendants of the source (removal) or destination (insert) node with new position data and (if defined) new parentId and productId */
		updatePaths(parentPath, siblings, insertInd, productId = undefined, parentId = undefined) {
			for (let i = insertInd; i < siblings.length; i++) {
				const sibling = siblings[i]
				const oldPath = sibling.path.slice()
				const newPath = parentPath.concat(i)
				if (parentId) sibling.parentId = parentId
				if (productId) sibling.productId = productId
				// if moving to another product show the inserted nodes in the new product
				if (productId) sibling.doShow = true
				sibling.path = newPath
				sibling.pathStr = JSON.stringify(newPath)
				sibling.ind = i
				sibling.level = newPath.length
				sibling.isLeaf = (sibling.level < PBILEVEL) ? false : true
				if (this.comparePaths(oldPath, newPath !== 0)) {
					// mark the changed nodemodels for distribution
					sibling.data.sessionId = this.$store.state.userData.sessionId
					sibling.data.distributeEvent = true
				}
				if (sibling.children && sibling.children.length > 0) {
					this.updatePaths(sibling.path, sibling.children, 0, productId, sibling._id)
				}
			}
		},

		/*
		 * Insert the nodeModels in the tree model inside, after or before the node at cursorposition.
		 * When creating a new single node (not moving) createNew must be true
		 */
		insert(cursorPosition, nodes) {
			// recalculate the priorities of the created(inserted, one node at the time) or moved nodes(can be one or more).
			// precondition: the nodes are inserted in the tree and all created or moved nodes have the same parent (same level).
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
					// update the tree
					nodes[i].data.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
					nodes[i].data.lastChange = Date.now()
				}
			}
			const destNodeModel = cursorPosition.nodeModel
			const productId = destNodeModel.productId
			let predecessorNode
			let successorNode
			// sort the nodes on priority (highest first)
			nodes.sort((h, l) => l.data.priority - h.data.priority)
			if (cursorPosition.placement === 'inside') {
				// insert inside a parent -> the nodes become top level children
				const destSiblings = destNodeModel.children || []
				const parentId = destNodeModel._id
				predecessorNode = null
				destSiblings.unshift(...nodes)
				successorNode = destSiblings[nodes.length] || null
				this.updatePaths(destNodeModel.path, destSiblings, 0, productId, parentId)
			} else {
				// insert before or after the cursor position
				const destSiblings = this.getNodeSiblings(destNodeModel.path)
				const parentId = destNodeModel.parentId
				const parentPath = destNodeModel.path.slice(0, -1)
				const insertInd = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
				predecessorNode = destSiblings[insertInd - 1] || null
				destSiblings.splice(insertInd, 0, ...nodes)
				successorNode = destSiblings[insertInd + nodes.length] || null
				this.updatePaths(parentPath, destSiblings, insertInd, productId, parentId)
			}
			assignNewPrios(nodes, predecessorNode, successorNode)
		},

		/* Insert the node and save it so that it is deselected on the next select */
		insertSingle(cursorPosition, node) {
			nodeToDeselect = node
			this.insert(cursorPosition, [node])
		},

		/* Remove nodes from the tree model */
		remove(nodes) {
			for (let node of nodes) {
				const siblings = this.getNodeSiblings(node.path)
				const removeInd = node.ind
				const parentPath = node.path.slice(0, -1)
				siblings.splice(removeInd, 1)
				this.updatePaths(parentPath, siblings, removeInd)
			}
		},

		/* Remove the node and save the current selected node so that it is deselected on the next select */
		removeSingle(node, currentSelectedNode) {
			nodeToDeselect = currentSelectedNode
			this.remove([node])
		},

		/* Move the nodes to the position designated by cursorPosition */
		moveNodes(cursorPosition, nodes) {
			this.remove(nodes)
			this.insert(cursorPosition, nodes)
		},

		/* test code */
		showVisibility(caller, toLevel = 3) {
			this.traverseModels((nodeModel) => {
				// collapse to the product level
				if (nodeModel.level <= toLevel) {
					// eslint-disable-next-line no-console
					console.log('showVisibility: path = ' + nodeModel.path + ' level = ' + nodeModel.level +
						' isExpanded = ' + nodeModel.isExpanded + ' doShow = ' + nodeModel.doShow + ' title = ' + nodeModel.title + ' caller = ' + caller)
				}
			})
		},

		/* collapse all nodes of this product */
		collapseTree(productId) {
			this.getNodeById(productId).isExpanded = false
			this.traverseModels((nodeModel) => {
				// collapse to the product level
				if (nodeModel.level > PRODUCTLEVEL) {
					nodeModel.savedDoShow = nodeModel.doShow
					nodeModel.doShow = false
				}
			}, this.getProductModels(productId))
			// this.showVisibility('collapseTree')
		},

		expandTree(level) {
			this.traverseModels((nodeModel) => {
				// expand to level
				if (nodeModel.level < level) {
					nodeModel.isExpanded = true
					nodeModel.savedIsExpanded = true
					nodeModel.doShow = true
				}
				// show the nodes
				nodeModel.doShow = true
			}, this.getProductModels())
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
			this.traverseModels((nodeModel) => {
				// unselect any previous selections
				nodeModel.isSelected = false
				// if on the node path
				if (isInPath(nodeModel.path, node.path)) {
					nodeModel.savedIsExpanded = true
					nodeModel.isExpanded = true
					nodeModel.savedDoShow = true
					nodeModel.doShow = true
				}
				// select the item
				if (nodeModel.shortId === node.shortId) {
					nodeModel.isSelected = true
					// save this node so that it is deselected on the next select
					nodeToDeselect = nodeModel
					return false
				}
			})
			// this.showVisibility('expandTree')
		},

		/* clear any outstanding filters */
		resetFilters(caller) {
			// eslint-disable-next-line no-console
			console.log('resetFilters is called by ' + caller)

			function doReset(vm, productId) {
				vm.traverseModels((nodeModel) => {
					if (nodeModel.level > PRODUCTLEVEL) {
						if (nodeModel.productId === productId) {
							nodeModel.doShow = true
							nodeModel.isExpanded = nodeModel.savedIsExpanded
						} else {
							nodeModel.doShow = false
						}
					} else {
						nodeModel.doShow = nodeModel.savedDoShow
						nodeModel.isExpanded = nodeModel.savedIsExpanded
					}

				}, vm.getProductModels(productId))
			}

			if (this.$store.state.filterOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your filter in product '${this.$store.state.load.currentProductTitle}' is cleared`, INFO)
				this.$store.state.filterText = FILTERBUTTONTEXT
				this.$store.state.filterOn = false
			}
			if (this.$store.state.searchOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your search in product '${this.$store.state.load.currentProductTitle}' is cleared`, INFO)
				this.$store.state.searchOn = false
			}
			if (this.$store.state.findIdOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your view on product '${this.$store.state.load.currentProductTitle}' is restored`, INFO)
				this.$store.state.findIdOn = false
			}
		},

		/* Show the path from productlevel to and including the node  */
		showPathToNode(node) {
			for (let i = PRODUCTLEVEL; i < node.path.length; i++) {
				const nm = this.getNodeModel(node.path.slice(0, i))
				nm.savedDoShow = nm.doShow
				nm.doShow = true
				nm.savedIsExpanded = nm.isExpanded
				nm.isExpanded = true
			}
		}
	}
}
