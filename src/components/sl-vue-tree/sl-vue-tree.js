/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
const ROOTLEVEL = 1
const PRODUCTLEVEL = 2
const PBILEVEL = 5
const FILTERBUTTONTEXT = 'Recent changes'
const RESETFILTERBUTTONTEXT = 'Clear filter'
const INFO = 0
var lastSelectedNode = null
var numberOfSelectedNodes = 0
var draggableNodes = []
var selectedNodes = []
var nodeToDeselect = null

import { showLastEvent } from '../mixins/showLastEvent.js'

export default {
	name: 'sl-vue-tree',
	mixins: [showLastEvent],
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
			return this.getParent().cursorPosition;
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
			const retNodes = this.getParent().filteredNodes[this.parentInd].children.filter(node => {
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
			return !this.level
		}
	},

	methods: {
		setModelCursorPosition(pos) {
			if (this.isRoot) {
				this.rootCursorPosition = pos;
				return;
			}
			this.getParent().setModelCursorPosition(pos);
		},

		getNodes(nodeModels) {
			return nodeModels.map((nodeModel) => {
				return nodeModel
			})
		},

		getNodeModel(path, tree = this.currentValue) {
			const ind = path[0]
			if (path.length === 1) return tree[ind] || null
			return this.getNodeModel(path.slice(1), tree[ind].children)
		},

		emitSelect(selectedNodes, event) {
			this.getRoot().$emit('select', selectedNodes, event);
		},

		emitBeforeDrop(draggingNodes, position, cancel) {
			this.getRoot().$emit('beforedrop', draggingNodes, position, cancel);
		},

		emitDrop(draggingNodes, position, event) {
			this.getRoot().$emit('drop', draggingNodes, position, event);
		},

		emitToggle(toggledNode, event) {
			this.getRoot().$emit('toggle', toggledNode, event);
		},

		emitNodeClick(node, event) {
			this.getRoot().$emit('nodeclick', node, event);
		},

		emitNodeContextmenu(node, event) {
			this.getRoot().$emit('nodecontextmenu', node, event);
		},

		/* select a node from the current product or select the root or the top node of another product */
		select(cursorPosition, event) {
			this.lastSelectCursorPosition = cursorPosition
			const selNode = cursorPosition.nodeModel
			this.preventDrag = false

			// only shift-select above productlevel and selected nodes on the same level
			if (selNode.level > PRODUCTLEVEL && lastSelectedNode && selNode.level === lastSelectedNode.level && this.allowMultiselect && event && event.shiftKey) {
				selNode.isSelected = selNode.isSelectable
				selectedNodes.push(selNode)
			} else {
				// single selection mode: unselect all currently selected nodes and clear selectedNodes
				if (lastSelectedNode) lastSelectedNode.isSelected = false
				if (nodeToDeselect) nodeToDeselect.isSelected = false
				for (let node of selectedNodes) {
					node.isSelected = false
				}
				selectedNodes = []
				selNode.isSelected = selNode.isSelectable
				selectedNodes.push(selNode)
			}

			lastSelectedNode = selNode
			numberOfSelectedNodes = selectedNodes.length
			if (numberOfSelectedNodes > 0) {
				this.emitSelect(selectedNodes, event)
			}
		},

		onMousemoveHandler(event) {
			if (!this.isRoot) {
				this.getRoot().onMousemoveHandler(event)
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
			const cP = this.getCursorModelPositionFromCoords(event.clientX, event.clientY)
			this.setModelCursorPosition(cP)
		},

		onNodeMousedownHandler(event, node) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRoot().onNodeMousedownHandler(event, node);
				return;
			}
			this.mouseIsDown = true;
		},

		onNodeMouseupHandler(event) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRoot().onNodeMouseupHandler(event);
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

			// stop drag if no nodes selected or at root level or not dragging or moving an item to another product
			if (draggableNodes.length === 0 || this.cursorPosition.nodeModel.level === ROOTLEVEL || !this.isDragging || this.$store.state.moveOngoing) {
				this.stopDrag()
				return
			}

			// check that nodes is possible to insert
			for (let draggingNode of draggableNodes) {
				if (draggingNode.pathStr === this.cursorPosition.nodeModel.pathStr) {
					this.stopDrag();
					return;
				}
				if (this.checkNodeIsParent(draggingNode, this.cursorPosition.nodeModel)) {
					this.stopDrag();
					return;
				}
				// prevent drag to other product
				if (this.cursorPosition.nodeModel.productId !== this.$store.state.load.currentProductId) {
					this.stopDrag();
					return;
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

			lastSelectedNode = null;
			this.emitDrop(draggableNodes, this.cursorPosition, event);
			this.stopDrag();
		},

		onToggleHandler(event, node) {
			if (!this.allowToggleBranch) return;
			node.isExpanded = !node.isExpanded
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

		/* Returns true if the path starts with the subPath */
		isInPath(subPath, path) {
			if (subPath.length > path.length) return false
			for (let i = 0; i < subPath.length; i++) {
				if (subPath[i] !== path[i]) return false
			}
			return true
		},

		stopDrag() {
			this.isDragging = false;
			this.mouseIsDown = false;
			this.setModelCursorPosition(null);
		},

		getParent() {
			return this.$parent;
		},

		getRoot() {
			if (this.isRoot) return this;
			return this.getParent().getRoot();
		},

		getNodeSiblings(path, nodes = this.currentValue) {
			if (path.length === 1) return nodes
			return this.getNodeSiblings(path.slice(1), nodes[path[0]].children || [])
		},

		getSelectedProduct() {
			const productModels = this.currentValue[0].children
			for (let i = 0; i < productModels.length; i++) {
				if (productModels[i].isSelected) {
					return productModels[i]
				}
			}
			// ToDo: write this to the log
			console.log('getSelectedProduct: ERROR product not found')
			return null
		},

		/* Collects all nodes in the current product that are selected */
		getSelected() {
			const selectedNodes = [];
			this.traverseLight((nodePath, nodeModel) => {
				if (nodeModel.isSelected) {
					selectedNodes.push(nodeModel)
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getSelected')
			return selectedNodes
		},

		/*
		 * A faster version of the original
		 * Use the optinal parameter productId to limit the callback calls to that product only, or use the value 'undefined' to scan all products
		 */
		traverseLight(cb, productId = undefined, caller) {
			function getProductModels(treeNodes, productId) {
				const productModels = treeNodes[0].children
				for (let i = 0; i < productModels.length; i++) {
					if (productModels[i].productId === productId) {
						return {
							productNodes: productModels[i].children,
							parentPath: [0, i]
						}
					}
				}
				return null
			}

			console.log('traverseLight is called by ' + caller)
			let shouldStop = false
			function traverse(
				cb,
				nodeModels = null,
				parentPath = [],
				productId = undefined
			) {
				if (shouldStop) return

				for (let nodeInd = 0; nodeInd < nodeModels.length; nodeInd++) {
					const nodeModel = nodeModels[nodeInd];
					const itemPath = parentPath.concat(nodeInd);
					// if (caller === 'sl-vue-tree.js:getPrevVisibleNode') console.log('traverseLight: itemPath = ', itemPath + ' title = ' + nodeModel.title + ' productId = ' + productId)
					if (cb(itemPath, nodeModel, nodeModels) === false) {
						shouldStop = true
						break
					}

					if (nodeModel.children && nodeModel.children.length > 0) {
						traverse(cb, nodeModel.children, itemPath, productId)
					}
				}
			}

			let parentPath = []
			let nodeModels = this.currentValue
			if (productId !== undefined) {
				// restrict the traversal to the nodes of one product
				const product = getProductModels(this.currentValue, productId)
				if (product !== null) {
					nodeModels = product.productNodes
					parentPath = product.parentPath
				} else {
					// product not found: traverse the whole tree
					productId = undefined
				}
			}
			traverse(cb, nodeModels, parentPath, productId)
		},

		traverseModels(cb, nodeModels) {
			let shouldStop = false
			function traverse(cb, nodeModels) {
				if (shouldStop) return

				let i = nodeModels.length
				while (i--) {
					const nodeModel = nodeModels[i]
					if (nodeModel.children) traverse(cb, nodeModel.children)
					if (cb(nodeModel, nodeModels, i) === false) {
						shouldStop = true
						break
					}
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

		getPrevVisibleNode(path) {
			let prevVisiblePath
			let prevVisibleModel
			if (path.slice(-1)[0] === 0) {
				// the removed node is a first child
				prevVisiblePath = path.slice(0, path.length - 1)
			} else {
				// the removed node has a previous sibling
				prevVisiblePath = path.slice(0, path.length - 1).concat(path.slice(-1)[0] - 1)
			}
			this.traverseLight((nodePath, nodeModel) => {
				if (this.comparePaths(nodePath, prevVisiblePath) === 0) {
					prevVisibleModel = nodeModel
					return false
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getPrevVisibleNode');

			return prevVisibleModel
		},

		/* Update the descendants of the source (removal) or destination (insert) node with new position data and (possibly) new parentId and productId */
		updatePaths(parentPath, siblings, insertInd, productId = undefined, parentId = undefined) {
			for (let i = insertInd; i < siblings.length; i++) {
				const sibling = siblings[i]
				const oldPath = sibling.path.slice()
				const newPath = parentPath.concat(i)
				// const oldProductId = sibling.productId
				// const oldParentId = sibling.parentId.slice()
				if (parentId) sibling.parentId = parentId
				if (productId) sibling.productId = productId
				sibling.path = newPath
				sibling.pathStr = JSON.stringify(newPath)
				sibling.ind = i
				sibling.level = newPath.length
				sibling.isLeaf = (sibling.level < PBILEVEL) ? false : true
				if (this.comparePaths(oldPath, newPath !== 0)) {
					// mark the changed nodemodels for distribution
					sibling.data.sessionId = this.$store.state.sessionId
					sibling.data.distributeEvent = true
				}
				// console.log('updatePaths: old path = ' + oldPath + ' new path = ' + newPath + ' old parentId = ' + oldParentId + ' new parentId = ' + parentId + ' ' + sibling.title)
				if (sibling.children && sibling.children.length > 0) {
					this.updatePaths(sibling.path, sibling.children, 0, productId, sibling._id)
				}
			}
		},

		/*
		 * Recalculate the priorities of the created(inserted, one node at the time) or moved nodes(can be one or more).
		 * Precondition: the nodes are inserted in the tree and all created or moved nodes have the same parent (same level).
		 */
		updatePriorities(nodes) {
			// get the previous sibling (above the node)
			function getPrevSibling(vm, node) {
				const siblings = vm.getNodeSiblings(node.path)
				// return null if a previous node does not exist
				return siblings[node.ind - 1] || null
			}
			// get the next sibling (below the node)
			function getNextSibling(vm, node) {
				const siblings = vm.getNodeSiblings(node.path)
				// return null if a next node does not exist
				return siblings[node.ind + 1] || null
			}
			function assignNewPrios(nodes, predecessorNode, successorNode) {
				let predecessorPrio
				let successorPrio
				if (predecessorNode !== null) {
					predecessorPrio = predecessorNode.data.priority
				} else {
					predecessorPrio = Number.MAX_SAFE_INTEGER
				}
				if (successorNode !== null) {
					successorPrio = successorNode.data.priority
				} else {
					successorPrio = Number.MIN_SAFE_INTEGER
				}
				const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))
				for (let i = 0; i < nodes.length; i++) {
					// update the tree
					nodes[i].data.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
					nodes[i].data.lastChange = Date.now()
				}
			}

			const firstNode = nodes[0]
			const predecessorNode = getPrevSibling(this, firstNode)
			const lastNode = nodes[nodes.length - 1]
			const successorNode = getNextSibling(this, lastNode)
			assignNewPrios(nodes, predecessorNode, successorNode)
		},

		/*
		 * Insert the nodeModels in the tree model inside, after or before the node at cursorposition.
		 * When creating a new single node (not moving) createNew must be true
		 */
		insert(cursorPosition, nodes) {
			const destNodeModel = cursorPosition.nodeModel
			const productId = destNodeModel.productId

			if (cursorPosition.placement === 'inside') {
				const destSiblings = destNodeModel.children || []
				const parentId = destNodeModel._id
				for (let i = nodes.length - 1; i >= 0; i--) {
					nodes[i].productId = productId
					destSiblings.unshift(nodes[i])
				}
				this.updatePaths(destNodeModel.path, destSiblings, 0, productId, parentId)
			} else {
				// insert before or after the cursor position
				const destSiblings = this.getNodeSiblings(destNodeModel.path)
				const parentId = destNodeModel.parentId
				const parentPath = destNodeModel.path.slice(0, destNodeModel.path.length - 1)
				const insertInd = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
				for (let nm of nodes) {
					nm.productId = productId
					destSiblings.splice(insertInd, 0, nm)
				}
				this.updatePaths(parentPath, destSiblings, insertInd, productId, parentId)
			}
			this.updatePriorities(nodes)
		},

		insertSingle(cursorPosition, node) {
			// save this node so that it is deselected on the next select
			nodeToDeselect = node
			this.insert(cursorPosition, [node])
		},

		removeSingle(node, currentSelectedNode) {
			if (currentSelectedNode) nodeToDeselect = currentSelectedNode
			const siblings = this.getNodeSiblings(node.path)
			const removeInd = node.ind
			const parentPath = node.path.slice(0, node.path.length - 1)
			siblings.splice(removeInd, 1)
			this.updatePaths(parentPath, siblings, removeInd)
		},

		/* Remove nodeModels from the tree model */
		remove(nodes) {
			for (let node of nodes) {
				this.removeSingle(node)
			}
		},

		/* Move the nodes to the position designated by cursorPosition */
		moveNodes(cursorPosition, nodes) {
			this.remove(nodes)
			this.insert(cursorPosition, nodes)
		},

		checkNodeIsParent(sourceNode, destNode) {
			const destPath = destNode.path;
			return this.comparePaths(destPath.slice(0, sourceNode.path.length), sourceNode.pathStr) === 0
		},

		/* test code */
		showVisibility(caller) {
			this.traverseLight((itemPath, nodeModel) => {
				// collapse to the product level
				if (itemPath.length <= 3) {
					// eslint-disable-next-line no-console
					console.log('showVisibility: level = ' + itemPath.length + ' isExpanded = ' + nodeModel.isExpanded + ' doShow = ' + nodeModel.doShow + ' title = ' + nodeModel.title + ' caller = ' + caller)
				}
			}, undefined, 'showVisibility')
		},

		/* collapse all nodes of this product */
		collapseTree(productId) {
			this.traverseLight((itemPath, nodeModel) => {
				// collapse to the product level
				if (itemPath.length > PRODUCTLEVEL) {
					nodeModel.savedDoShow = nodeModel.doShow
					nodeModel.doShow = false
				}
			}, productId, 'sl-vue-tree:collapseTree')
			// this.showVisibility('collapseTree')
		},

		expandTree(level) {
			this.traverseLight((itemPath, nodeModel) => {
				// expand to level
				if (itemPath.length < level) {
					nodeModel.isExpanded = true
					nodeModel.savedIsExpanded = true
					nodeModel.doShow = true
				}
				// show the nodes
				nodeModel.doShow = true
			}, this.$store.state.load.currentProductId, 'sl-vue-tree:expandTree')
			// this.showVisibility('expandTree')
		},

		showItem(node) {
			this.traverseLight((itemPath, nodeModel) => {
				// unselect previous selections
				nodeModel.isSelected = false
				// if on the node path
				if (this.isInPath(itemPath, node.path)) {
					nodeModel.savedIsExpanded = nodeModel.isExpanded
					nodeModel.isExpanded = true
					nodeModel.savedDoShow = true
					nodeModel.doShow = true
				}
				// select the item
				if (nodeModel.shortId === node.shortId) {
					nodeModel.isSelected = true
					return false
				}
			}, undefined, 'sl-vue-tree:showItem')
			// this.showVisibility('expandTree')
		},

		/* clear any outstanding filters */
		resetFilters(caller, productSwitch = false) {
			// eslint-disable-next-line no-console
			console.log('resetFilters is called by ' + caller)

			function doReset(vm, productId) {
				vm.traverseLight((itemPath, nodeModel) => {
					if (productSwitch) {
						if (itemPath.length > PRODUCTLEVEL) {
							if (nodeModel.productId === productId) {
								nodeModel.doShow = true
								nodeModel.isExpanded = nodeModel.savedIsExpanded
							} else {
								nodeModel.doShow = false
							}
						}
					} else {
						nodeModel.doShow = nodeModel.savedDoShow
						nodeModel.isExpanded = nodeModel.savedIsExpanded
					}

				}, productId, 'sl-vue-tree:resetFilters')
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

		showParents(path) {
			let parentPath = path.slice(0, -1)
			// do not touch the database level
			if (parentPath.length < PRODUCTLEVEL) return

			this.traverseLight((itemPath, nodeModel) => {
				if (this.comparePaths(itemPath, parentPath) !== 0) {
					return
				}
				nodeModel.savedDoShow = nodeModel.doShow
				nodeModel.doShow = true
				nodeModel.savedIsExpanded = nodeModel.isExpanded
				nodeModel.isExpanded = true
				return false
			}, undefined, 'showParents')
			// recurse
			this.showParents(parentPath)
		},

		filterSince(since) {
			// if needed reset the other selection first
			if (this.$store.state.searchOn) this.resetFilters('filterSince')
			let sinceMilis = since * 60000
			let count = 0
			this.traverseLight((itemPath, nodeModel) => {
				// limit to levels higher than product
				if (itemPath.length > PRODUCTLEVEL) {
					if (Date.now() - nodeModel.data.lastChange < sinceMilis) {
						nodeModel.doShow = true
						this.showParents(itemPath)
						count++
					} else {
						nodeModel.doShow = false
					}
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree:filterSince')
			// show event
			if (count === 1) {
				this.showLastEvent(`${count} item title matches your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
			} else {
				this.showLastEvent(`${count} item titles match your filter in product '${this.$store.state.load.currentProductTitle}'`, INFO)
			}
			this.$store.state.filterText = RESETFILTERBUTTONTEXT
			this.$store.state.filterOn = true
			// this.showVisibility('filterSince')
		},

		filterOnKeyword() {
			// cannot search on empty string
			if (this.$store.state.keyword === '') return

			// if needed reset the other selection first
			if (this.$store.state.filterOn) this.resetFilters('filterOnKeyword')
			let count = 0
			this.traverseLight((itemPath, nodeModel) => {
				// limit to levels higher than product
				if (itemPath.length > PRODUCTLEVEL) {
					if (nodeModel.title.toLowerCase().includes(this.$store.state.keyword.toLowerCase())) {
						nodeModel.doShow = true
						this.showParents(itemPath)
						count++
					} else {
						nodeModel.doShow = false
					}
				}
			}, this.$store.state.load.currentProductId, 'filterOnKeyword')
			// show event
			if (count === 1) {
				this.showLastEvent(`${count} item title matches your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
			} else {
				this.showLastEvent(`${count} item titles match your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
			}
			this.$store.state.searchOn = true
			// this.showVisibility('filterOnKeyword')
		}
	}
}
