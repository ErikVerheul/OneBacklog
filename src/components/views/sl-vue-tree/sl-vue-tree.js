/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
import { SEV, LEVEL, MISC } from '../../../constants.js'
import { collapseNode, expandNode, dedup, showNode } from '../../../common_functions.js'
import { eventBus } from '../../../main'
import { utilities } from '../../mixins/generic.js'

const props = {
	edgeSize: {
		type: Number,
		default: 6
	},
	nodeLevel: {
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
}

function data() {
	return {
		debugMode: this.$store.state.debug,
		draggableNodes: [],
		rootCursorPosition: null,
		mouseIsDown: false,
		isDragging: false,
		lastMousePos: {
			x: 0,
			y: 0
		},
		preventDrag: false,
		lastSelectCursorPosition: null
	}
}

function mounted() {
	// suppress browser default context menu
	document.oncontextmenu = function () {
		return false
	}
	if (this.isRoot) {
		document.addEventListener('mouseup', this.onDocumentMouseupHandler)
	}
}

function beforeDestroy() {
	document.removeEventListener('mouseup', this.onDocumentMouseupHandler)
}

const computed = {
	cursorPosition() {
		if (this.isRoot) return this.rootCursorPosition
		return this.getParentComponent().cursorPosition
	},

	filteredNodes() {
		if (this.isRoot) {
			const retNodes = this.getNodes(this.$store.state.treeNodes)
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
	 * nodeLevel starts with 0; item level with 1
	 * @returns {number[]}
	 */
	gaps() {
		const gaps = []
		let i = this.nodeLevel
		while (i-- > 0) gaps.push(i)
		if (this.nodeLevel + 1 === this.leafLevel) gaps.push(i)
		return gaps
	},

	isRoot() {
		return this.nodeLevel === 0
	}
}

const methods = {

	/* Check for descendants selected by a filter */
	checkForFilteredDescendants(node) {
		let result = false
		this.traverseModels((nm) => {
			if (nm.tmp.isHighlighted_1) {
				result = true
				return false
			}
		}, [node])
		return result
	},

	/*
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
			if (path2[i] === undefined) return 1
			if (path1[i] > path2[i]) return 1
			if (path1[i] < path2[i]) return -1
		}
		return path2[path1.length] === undefined ? 0 : -1
	},

	/* Create a node from the document data; ind and path may be undefined if the node is inserted in the tree with the insertNode method which resolves these values */
	createNode(doc, ind, path) {
		const newNode = {
			path,
			pathStr: JSON.stringify(path),
			ind,
			level: doc.level,
			productId: doc.productId,
			parentId: doc.parentId,
			sprintId: doc.sprintId,
			_id: doc._id,
			dependencies: doc.dependencies || [],
			conditionalFor: doc.conditionalFor || [],
			title: doc.title,
			isLeaf: doc.level === this.leafLevel,
			children: [],
			isExpanded: false,
			isSelectable: true,
			isDraggable: true,
			isSelected: false,
			doShow: true,
			data: {
				priority: doc.priority,
				state: doc.state,
				reqarea: doc.reqarea,
				reqAreaItemColor: doc.color,
				team: doc.team,
				sprintId: doc.sprintId,
				subtype: doc.subtype,
				lastAttachmentAddition: doc.lastAttachmentAddition || 0,
				lastCommentAddition: doc.lastCommentAddition || 0,
				lastCommentToHistory: doc.lastCommentToHistory || 0,
				lastContentChange: doc.lastContentChange || 0,
				lastPositionChange: doc.lastPositionChange || 0,
				lastStateChange: doc.lastStateChange || 0,
				lastChange: doc.lastChange || 0
			},
			tmp: {}
		}
		return newNode
	},

	emitBeforeDrop(draggingNodes, position, cancel) {
		this.getRootComponent().$emit('beforedrop', draggingNodes, position, cancel)
	},

	emitDrop(draggingNodes, position) {
		this.getRootComponent().$emit('drop', draggingNodes, position)
	},

	// trigger the context component via the eventbus unless on root
	emitNodeContextmenu(node) {
		if (!this.isRoot) eventBus.$emit('context-menu', node)
	},

	emitSelect(fromContextMenu) {
		this.getRootComponent().$emit('nodes-are-selected', fromContextMenu)
	},

	getNodes(nodeModels) {
		return nodeModels.map((nm) => nm)
	},

	getNodeModel(path, tree = this.$store.state.treeNodes) {
		const ind = path[0]
		if (path.length === 1) return tree[ind] || null
		return this.getNodeModel(path.slice(1), tree[ind].children)
	},

	/* Return the current product node in an array */
	getCurrentProductModel() {
		return this.getProductModel(this.$store.state.currentProductId)
	},

	/* Find the ids with a set req area in the current product */
	getCurrentReqAreaIds() {
		const idsWithReqArea = []
		this.traverseModels((nm) => {
			if (nm.data.reqarea) {
				if (!idsWithReqArea.includes(nm.data.reqarea)) idsWithReqArea.push(nm.data.reqarea)
			}
		}, this.getCurrentProductModel())
		return idsWithReqArea
	},

	getCursorModelPositionFromCoords(x, y) {
		function getClosestElementWithPath($el) {
			if (!$el) return null
			if ($el.getAttribute('path')) return $el
			return getClosestElementWithPath($el.parentElement)
		}

		const $target = document.elementFromPoint(x, y)
		const $nodeItem = $target.getAttribute('path') ? $target : getClosestElementWithPath($target)
		if (!$nodeItem) return null

		let placement
		const pathStr = $nodeItem.getAttribute('path')
		const path = JSON.parse(pathStr)
		const nodeModel = this.getNodeModel(path)
		if (!nodeModel) return null

		const nodeHeight = $nodeItem.offsetHeight
		const edgeSize = this.edgeSize
		const offsetY = y - $nodeItem.getBoundingClientRect().top

		if (nodeModel.isLeaf) {
			placement = offsetY >= nodeHeight / 2 ? 'after' : 'before'
		} else {
			if (offsetY <= edgeSize) {
				placement = 'before'
			} else if (offsetY >= nodeHeight - edgeSize) {
				placement = 'after'
			} else {
				placement = 'inside'
			}
		}
		return {
			nodeModel,
			placement
		}
	},

	/* Collect meta data on the descendants of the node including the assigned sprintIds */
	getDescendantsInfo(node) {
		const ids = []
		const descendants = []
		const sprintIds = []
		const initLevel = node.level
		let count = 0
		let maxDepth = node.level
		this.traverseModels((nm) => {
			if (this.comparePaths(nm.path, node.path) === 1) {
				ids.push(nm._id)
				descendants.push(nm)
				if (nm.data.sprintId && !sprintIds.includes(nm.data.sprintId)) sprintIds.push(nm.data.sprintId)
				count++
				if (nm.level > maxDepth) maxDepth = nm.level
			}
		}, [node])
		return {
			ids,
			descendants,
			sprintIds,
			count,
			depth: maxDepth - initLevel
		}
	},

	getDescendantsInfoOnId(parentId) {
		const node = this.getNodeById(parentId)
		if (node !== null) {
			return this.getDescendantsInfo(node)
		}
	},

	getNextSibling(path) {
		const nextPath = path.slice(0, -1).concat(path.slice(-1)[0] + 1)
		return this.getNodeModel(nextPath)
	},

	/* Scan the full tree to find a node with the passed id and stop scanning at the first match */
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

	getNodeSiblings(path, nodes = this.$store.state.treeNodes) {
		if (path.length === 1) return nodes
		return this.getNodeSiblings(path.slice(1), nodes[path[0]].children || [])
	},

	getParentComponent() {
		return this.$parent
	},

	getParentNode(node) {
		for (let i = LEVEL.DATABASE; i < node.path.length; i++) {
			const path = node.path.slice(0, i)
			if (path.length === node.path.length - 1) {
				return this.getNodeModel(path)
			}
		}
	},

	/* Return an array with the node of the passed productId or an empty array if the product is not found */
	getProductModel(productId) {
		const productModels = this.getRootNode().children
		for (const p of productModels) {
			if (p.productId === productId) {
				return [p]
			}
		}
		return []
	},

	getProductTitle(productId) {
		if (this.$store.state.treeNodes[0].children) {
			const products = this.$store.state.treeNodes[0].children
			for (let i = 0; i < products.length; i++) {
				if (products[i].productId === productId) {
					return products[i].title
				}
			}
		}
		return 'product title not found'
	},

	/* Return all product nodes in an array */
	getProducts() {
		return this.$store.state.treeNodes[0].children
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
		const productModels = this.$store.state.treeNodes[0].children
		for (const p of productModels) {
			if (p._id === MISC.AREA_PRODUCTID) {
				return p.children
			}
		}
		return null
	},

	getRootComponent() {
		if (this.isRoot) return this
		return this.getParentComponent().getRootComponent()
	},

	/* Return the root node */
	getRootNode() {
		return this.$store.state.treeNodes[0]
	},

	/* Add a node, derived from its document, as last child of the parentNode's children; return the created node */
	insertDescendantNode(parentNode, doc) {
		const ind = parentNode.children.length
		const path = parentNode.path.concat(ind)
		const newNode = this.createNode(doc, ind, path)
		parentNode.children.push(newNode)
		return newNode
	},

	/* Insert the nodeModels in the tree model inside, after or before the node at cursorposition. Use the options object to suppress productId updates and/or priority recalculation */
	insertNodes(cursorPosition, nodes, options) {
		/* Recalculate the priorities of the inserted nodes. Precondition: the nodes are inserted in the tree and all created or moved nodes have the same parent (same level).*/
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
		function correctProductId(vm) {
			for (const n of nodes) {
				if (n.level === LEVEL.PRODUCT && n._id !== n.productId) {
					// eslint-disable-next-line no-console
					if (vm.debugMode) console.log(`Product item with id ${n._id} was assigned ${n.productId} as product id. Is corrected to be equal to the id`)
					n.product_id = n._id
				}
			}
		}

		correctProductId(this)
		const destNodeModel = cursorPosition.nodeModel
		const productId = options && options.skipUpdateProductId ? undefined : destNodeModel.productId
		console.log('insertNodes: productId = ' + productId)
		let predecessorNode
		let successorNode
		if (cursorPosition.placement === 'inside') {
			// insert inside a parent -> the nodes become top level children
			const destSiblings = destNodeModel.children || []
			const parentId = destNodeModel._id
			predecessorNode = null
			destSiblings.unshift(...nodes)
			successorNode = destSiblings[nodes.length] || null
			this.updatePaths(destNodeModel.path, destSiblings, 0, parentId, productId)
		} else {
			// insert before or after the cursor position
			const destSiblings = this.getNodeSiblings(destNodeModel.path)
			const parentId = destNodeModel.parentId
			const parentPath = destNodeModel.path.slice(0, -1)
			const insertInd = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
			predecessorNode = destSiblings[insertInd - 1] || null
			destSiblings.splice(insertInd, 0, ...nodes)
			successorNode = destSiblings[insertInd + nodes.length] || null
			this.updatePaths(parentPath, destSiblings, insertInd, parentId, productId)
		}
		// if not excluded in options do assign new priorities
		if (!options || options.calculatePrios || options.calculatePrios === undefined) {
			assignNewPrios(nodes, predecessorNode, successorNode)
		}
	},

	isDescendantNodeSelected(node) {
		for (const nm of node.children) {
			if (nm.isSelected) return true
			if (this.isDescendantNodeSelected(nm)) return true
		}
		return false
	},

	/* Returns true if the path starts with the subPath */
	isInPath(subPath, path) {
		if (subPath.length > path.length) return false
		for (let i = 0; i < subPath.length; i++) {
			if (subPath[i] !== path[i]) return false
		}
		return true
	},

	onMousemoveHandler(event) {
		if (!this.isRoot) {
			this.getRootComponent().onMousemoveHandler(event)
			return
		}

		if (this.preventDrag) return

		const initialDraggingState = this.isDragging
		const isDraggingLocal =
			this.isDragging || (
				this.mouseIsDown &&
				(this.lastMousePos.y !== event.clientY)
			)

		const isDragStarted = !initialDraggingState && isDraggingLocal
		// calculate only once
		if (isDragStarted) {
			this.draggableNodes = []
			for (const node of this.$store.state.selectedNodes) {
				if (node.isDraggable) {
					this.draggableNodes.push(node)
				}
			}
		}

		this.lastMousePos = {
			x: event.clientX,
			y: event.clientY
		}

		if (!isDraggingLocal) return

		if (!this.draggableNodes.length) {
			this.preventDrag = true
			return
		}

		this.isDragging = isDraggingLocal
		const cPos = this.getCursorModelPositionFromCoords(event.clientX, event.clientY)
		if (cPos !== null) this.setModelCursorPosition(cPos)
	},

	onNodeMousedownHandler(event, node) {
		// handle only left mouse button
		if (event.button !== 0) return

		if (!this.isRoot) {
			this.getRootComponent().onNodeMousedownHandler(event, node)
			return
		}
		this.mouseIsDown = true
	},

	onNodeMouseupHandler(event) {
		// handle only left mouse button
		if (event.button !== 0) return

		if (!this.isRoot) {
			this.getRootComponent().onNodeMouseupHandler(event)
			return
		}

		this.mouseIsDown = false

		if (!this.isDragging) {
			// cursorPosition not available, so get it
			const cPos = this.getCursorModelPositionFromCoords(event.clientX, event.clientY)
			if (cPos !== null) this.select(cPos, event)
			return
		}

		this.preventDrag = false

		if (!this.cursorPosition) {
			this.stopDrag()
			return
		}

		// stop drag if no nodes selected or at root level or moving an item to another product or selecting a node for registering a dependency
		if (this.draggableNodes.length === 0 || this.cursorPosition.nodeModel.level === LEVEL.DATABASE || this.$store.state.moveOngoing || this.$store.state.selectNodeOngoing) {
			if (this.$store.state.moveOngoing) this.showLastEvent('Cannot drag while moving items to another product. Complete or cancel the move in context menu.', SEV.WARNING)
			if (this.$store.state.selectNodeOngoing) this.showLastEvent('Cannot drag while selecting a dependency. Complete or cancel the selection in context menu.', SEV.WARNING)
			this.stopDrag()
			return
		}

		// check if nodes are possible to insert
		for (const dn of this.draggableNodes) {
			// cannot drag to it self
			if (dn.pathStr === this.cursorPosition.nodeModel.pathStr) {
				this.stopDrag()
				return
			}
			if (this.isInPath(dn.path, this.cursorPosition.nodeModel.path)) {
				this.showLastEvent('Cannot drop a node inside itself or its descendants', SEV.WARNING)
				this.stopDrag()
				return
			}
			// prevent dragging a product into another product
			if (this.isDetailsViewSelected && dn.level === LEVEL.PRODUCT && this.cursorPosition.placement === 'inside' ||
				this.isOverviewSelected && dn.level === LEVEL.PRODUCT && this.cursorPosition.nodeModel.parentId !== 'root') {
				this.showLastEvent('Cannot drag a product into another product', SEV.WARNING)
				this.stopDrag()
				return
			}
			// prevent dragging an item into another product when in Product details view
			if (this.isDetailsViewSelected && dn.level !== LEVEL.PRODUCT && dn.productId !== this.cursorPosition.nodeModel.productId) {
				this.showLastEvent('Cannot drag to another product. Use the context menu (right click)', SEV.WARNING)
				this.stopDrag()
				return
			}
			// prevent placement on wrong level when the user selects the parent as target node to insert after
			if (this.cursorPosition.placement === 'after' && this.cursorPosition.nodeModel.level < dn.level) {
				this.stopDrag()
				return
			}
		}

		// allow the drop to be cancelled
		let cancelled = false
		this.emitBeforeDrop(this.draggableNodes, this.cursorPosition, () => cancelled = true)

		if (cancelled) {
			this.stopDrag()
			return
		}

		// sort the nodes on priority (highest first)
		this.draggableNodes.sort((h, l) => l.data.priority - h.data.priority)

		this.emitDrop(this.draggableNodes, this.cursorPosition)
		this.stopDrag()
	},

	onToggleHandler(event, node) {
		if (!this.allowToggleBranch) return
		if (node.isExpanded) {
			collapseNode(node)
		} else expandNode(node)

		event.stopPropagation()
	},

	/* Remove nodes from the tree model. Return true if any node was removed */
	removeNodes(nodes) {
		let success = false
		for (const node of nodes) {
			const siblings = this.getNodeSiblings(node.path)
			if (siblings.length > 0) {
				const removeInd = node.ind
				const parentPath = node.path.slice(0, -1)
				siblings.splice(removeInd, 1)
				this.updatePaths(parentPath, siblings, removeInd)
				success = true
			}
		}
		return success
	},

	removeProduct(productId) {
		const newChildren = []
		for (const p of this.$store.state.treeNodes[0].children) {
			if (p._id !== productId) newChildren.push(p)
		}
		this.$store.state.treeNodes[0].children = newChildren
		// recalculate the paths in the tree
		this.updatePaths([0], newChildren)
	},

	/* Select a node from the tree; a node must have been selected before; multiple nodes must have the same parent */
	select(cursorPosition, event) {
		this.lastSelectCursorPosition = cursorPosition
		const selNode = cursorPosition.nodeModel
		if (selNode.isSelectable) {
			this.preventDrag = false
			const lastSelectedNode = this.$store.state.selectedNodes.slice(-1)[0] || selNode
			// ctrl-select or shift-select mode is allowed only if nodes have the same parent and are above productlevel (epics, features and higher)
			if (selNode.level > LEVEL.PRODUCT && this.allowMultiselect && selNode.parentId === lastSelectedNode.parentId && event && (event.ctrlKey || event.shiftKey)) {
				if (event.ctrlKey) {
					// multi selection
					this.$store.commit('addSelectedNode', selNode)
				} else {
					if (event.shiftKey) {
						// range selection
						const siblings = this.getNodeSiblings(selNode.path)
						if (selNode.ind > lastSelectedNode.ind) {
							for (const s of siblings) {
								if (s.ind > lastSelectedNode.ind && s.ind <= selNode.ind) {
									this.$store.commit('addSelectedNode', s)
								}
							}
						} else if (selNode.ind < lastSelectedNode.ind) {
							for (let i = siblings.length - 1; i >= 0; i--) {
								if (siblings[i].ind < lastSelectedNode.ind && siblings[i].ind >= selNode.ind) {
									this.$store.commit('addSelectedNode', siblings[i])
								}
							}
						}
					}
				}
			} else {
				// single selection mode
				this.$store.commit('renewSelectedNodes', selNode)
			}
			// access the selected nodes using the store: $store.state.selectedNodes
			const fromContextMenu = false
			this.emitSelect(fromContextMenu)
		}
	},

	selectNodeById(id) {
		const selNode = this.getNodeById(id)
		if (selNode === null) return
		this.$store.commit('updateNodesAndCurrentDoc', { selectNode: selNode })
	},

	setModelCursorPosition(pos) {
		if (this.isRoot) {
			this.rootCursorPosition = pos
			return
		}
		this.getParentComponent().setModelCursorPosition(pos)
	},

	/* test code */
	showVisibility(caller, toLevel = 3) {
		const nodesToScan = this.isOverviewSelected ? undefined : this.getCurrentProductModel()
		this.traverseModels((nm) => {
			if (nm.level <= toLevel) {
				// eslint-disable-next-line no-console
				console.log(`${caller}: level = ${nm.level}, isExpanded = ${nm.isExpanded}, doShow = ${nm.doShow}, title = ${nm.title}`)
			}
		}, nodesToScan)
	},

	/*
	* Show the path from productlevel up to the node and highlight or warnLight the node; if type is set prepare for undo
	*/
	showPathToNode(node, highLights, type) {
		const maxDepth = node.path.length
		for (let i = LEVEL.PRODUCT; i <= maxDepth; i++) {
			const nm = this.getNodeModel(node.path.slice(0, i))
			if (i < maxDepth) {
				if (!nm.isExpanded) {
					if (type === 'search') nm.tmp.savedIsExpandedInSearch = false
					if (type === 'dependency') nm.tmp.savedIsExpandedInDependency = false
					expandNode(nm)
				}
			} else {
				if (nm.isExpanded) {
					if (type === 'search') nm.tmp.savedIsExpandedInSearch = true
					if (type === 'dependency') nm.tmp.savedIsExpandedInDependency = true
					collapseNode(nm)
				}
				if (highLights && Object.keys(highLights).length > 0) {
					nm.tmp.isHighlighted_1 = !!highLights.doHighLight_1
					nm.tmp.isHighlighted_2 = !!highLights.doHighLight_2
					nm.tmp.isWarnLighted = !!highLights.doWarn
				}
			}
		}
	},

	stopDrag() {
		this.isDragging = false
		this.mouseIsDown = false
		this.setModelCursorPosition(null)
	},

	/*
	* Traverse the node models or the full tree (default), breadth first
	* Stop when the call back returns false
	*/
	traverseModels(cb, nodeModels = this.$store.state.treeNodes) {
		let shouldStop = false
		function traverse(cb, nodeModels) {
			if (shouldStop) return

			for (const nm of nodeModels) {
				if (cb(nm) === false) {
					shouldStop = true
					break
				}
				if (nm.children) traverse(cb, nm.children)
			}
		}
		traverse(cb, nodeModels)
	},

	/*
	* Update the descendants of the source (removal) or destination (insert) node with new position data and (if passed) new parentId and productId
	* Pass an insertInd as the lowest index of any insert to gain performance.
	*/
	updatePaths(parentPath, siblings, insertInd = 0, parentId, productId) {
		for (let i = insertInd; i < siblings.length; i++) {
			const sibling = siblings[i]
			const newPath = parentPath.concat(i)
			if (parentId) sibling.parentId = parentId
			if (productId) sibling.productId = productId
			// if moving to another product in the context menu of the Products detail view, show the inserted nodes in the new product
			if (productId && this.isDetailsViewSelected) showNode(sibling)
			sibling.path = newPath
			sibling.pathStr = JSON.stringify(newPath)
			sibling.ind = i
			sibling.level = newPath.length
			sibling.isLeaf = !((sibling.level < this.leafLevel))
			if (sibling.children && sibling.children.length > 0) {
				this.updatePaths(sibling.path, sibling.children, 0, sibling._id, productId)
			}
		}
	},

	/* Undo the changes set by showPathToNode(...) including the removal of one highlight */
	undoShowPath(node, type, undoHighLight) {
		const maxDepth = node.path.length
		for (let i = LEVEL.PRODUCT; i <= maxDepth; i++) {
			const nm = this.getNodeModel(node.path.slice(0, i))
			if (nm.isExpanded) {
				if (type === 'search' && nm.tmp.savedIsExpandedInSearch === false) collapseNode(nm)
				if (type === 'dependency' && nm.tmp.savedIsExpandedInDependency === false) collapseNode(nm)
			}
			if (i === maxDepth) {
				if (!nm.isExpanded) {
					if (type === 'search' && nm.tmp.savedIsExpandedInSearch === true) expandNode(nm)
					if (type === 'dependency' && nm.tmp.savedIsExpandedInDependency === true) expandNode(nm)
				}
				delete nm.tmp[undoHighLight]
			}
			// delete if set or not
			delete nm.tmp.savedIsExpandedInSearch
			delete nm.tmp.savedIsExpandedInDependency
		}
	},

	//////////////////// dependencies /////////////////////////////////

	/* Calculate and show dependency violations */
	checkDepencyViolations(allProducts) {
		const violations = this.findDependencyViolations(allProducts)
		if (violations.length > 0) this.showDependencyViolations(violations, allProducts)
	},

	/* When nodes are deleted orphan dependencies can be created. This method removes them. */
	correctDependencies(removedNode) {
		const removedItemIds = this.getDescendantsInfo(removedNode).ids
		const removedIntDependencies = []
		const removedIntConditions = []
		const removedExtDependencies = []
		const removedExtConditions = []
		this.traverseModels((nm) => {
			if (nm.dependencies && nm.dependencies.length > 0) {
				const newDependencies = []
				if (removedItemIds.includes(nm._id)) {
					// nm is one of the deleted nodes
					for (const d of dedup(nm.dependencies)) {
						// dependency references within the deleted nodes survive
						if (removedItemIds.includes(d)) {
							newDependencies.push(d)
						} else removedIntDependencies.push({ id: nm._id, dependentOn: d })
					}
				} else {
					// nm is an outsider
					for (const d of dedup(nm.dependencies)) {
						// outsider references not referencing any of the nodes survive
						if (!removedItemIds.includes(d)) {
							newDependencies.push(d)
						} else {
							removedExtDependencies.push({ id: nm._id, dependentOn: d })
						}
					}
				}
				nm.dependencies = newDependencies
			}

			if (nm.conditionalFor && nm.conditionalFor.length > 0) {
				const newConditionalFor = []
				if (removedItemIds.includes(nm._id)) {
					// nm is one of the deleted nodes
					for (const c of dedup(nm.conditionalFor)) {
						// dependency references within the deleted nodes survive
						if (removedItemIds.includes(c)) {
							newConditionalFor.push(c)
						} else removedIntConditions.push({ id: nm._id, conditionalFor: c })
					}
				} else {
					// nm is an outsider
					for (const c of dedup(nm.conditionalFor)) {
						// outsider references not referencing any of the nodes survive
						if (!removedItemIds.includes(c)) {
							newConditionalFor.push(c)
						} else {
							removedExtConditions.push({ id: nm._id, conditionalFor: c })
						}
					}
				}
				nm.conditionalFor = newConditionalFor
			}
		}, this.getProductModel(removedNode.productId))
		return { removedIntDependencies, removedIntConditions, removedExtDependencies, removedExtConditions }
	},

	/*
	* Find and show dependency violations in the current product (details view) or all products (coarse view).
	* Undo the tree expansion from a previous scan on violations if no violations are faund.
	* Return true if violations are found, false otherwise.
	*/
	dependencyViolationsFound() {
		let violationsWereFound = false
		const violations = this.findDependencyViolations(this.isOverviewSelected)
		if (violations.length > 0) {
			violationsWereFound = true
			this.showLastEvent('This product has priority inconsistencies. Undo the change or remove the dependency.', SEV.WARNING)
			this.showDependencyViolations(violations, this.isOverviewSelected)
		} else {
			// reset the tree view
			const nodesToScan = this.isOverviewSelected ? undefined : window.slVueTree.getCurrentProductModel()
			// traverse the tree to reset to the tree view state
			window.slVueTree.traverseModels((nm) => {
				// skip root level
				if (nm.level === LEVEL.DATABASE) return
				// skip requirement areas dummy product items
				if (nm._id === MISC.AREA_PRODUCTID) return

				if (nm.tmp.savedIsExpandedInDependency === false) this.collapseNode(nm)
				if (nm.tmp.savedIsExpandedInDependency === true) this.expandNode(nm)
				// delete if set or not
				delete nm.tmp.savedIsExpandedInDependency
			}, nodesToScan)
		}
		return violationsWereFound
	},

	findDependencyViolations(allProducts) {
		const nodesToScan = allProducts ? undefined : this.getCurrentProductModel()
		const violations = []
		this.traverseModels((nm) => {
			// remove any left dependency markers
			if (nm.tmp.markedViolations) delete nm.tmp.markedViolations
			// remove any left dependency warning highlights
			if (nm.tmp.isWarnLighted) delete nm.tmp.isWarnLighted
			// find violations
			if (nm.dependencies && nm.dependencies.length > 0) {
				for (const depId of nm.dependencies) {
					const cond = this.getNodeById(depId)
					if (cond !== null && this.comparePaths(nm.path, cond.path) === -1) {
						violations.push({ condNode: cond, depNode: nm })
					}
				}
			}
		}, nodesToScan)
		return violations
	},

	/* If a feature belongs to a req area, set that area also to its descendants */
	setDescendantsReqArea() {
		let reqArea = null
		this.traverseModels((nm) => {
			if (nm.level < LEVEL.FEATURE) {
				return
			}
			if (nm.level === LEVEL.FEATURE) {
				reqArea = nm.data.reqarea || null
				return
			}
			nm.data.reqarea = reqArea
		})
	},

	/* Show the path from condNode to depNode including both nodes */
	showDependencyViolations(violations, allProducts) {
		const nodesToScan = allProducts ? undefined : this.getCurrentProductModel()
		for (let column = 0; column < violations.length; column++) {
			const v = violations[column]
			this.showPathToNode(v.condNode, { doWarn: true }, 'dependency')
			this.showPathToNode(v.depNode, { doWarn: true }, 'dependency')
			this.traverseModels((nm) => {
				if ((this.comparePaths(v.depNode.path, nm.path) !== 1) && (this.comparePaths(nm.path, v.condNode.path) !== 1)) {
					if (nm.tmp.markedViolations) {
						nm.tmp.markedViolations.push(column)
					} else nm.tmp.markedViolations = [column]
				}
			}, nodesToScan)
		}
	}
}

export default {
	name: 'sl-vue-tree',
	props,
	mixins: [utilities],
	data,
	mounted,
	beforeDestroy,
	computed,
	methods
}
