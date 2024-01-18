/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
import { SEV, LEVEL } from '../../../constants.js'
import { collapseNode, expandNode } from '../../../common_functions.js'
import commonView from '../common_view.js'
import store from '../../../store/store.js'

// in px; used to calculate the node closest to the current cursor position
const edgeSize = 6

const props = {
	nodeLevel: {
		type: Number,
		default: 0
	},

	parentInd: {
		type: Number
	}
}

function data() {
	return {
		draggableNodes: [],
		rootCursorPosition: null,
		mouseIsDown: false,
		isDragging: false,
		lastMousePos: {
			x: 0,
			y: 0
		},
		preventDrag: false,
		lastSelectedNode: {}
	}
}

function mounted() {
	// suppress browser default context menu
	document.oncontextmenu = function () {
		return false
	}
}

const computed = {
	cursorPosition() {
		if (this.isRoot) return this.rootCursorPosition
		return this.getParentComponent().cursorPosition
	},

	filteredNodes() {
		if (this.isRoot) {
			const retNodes = store.state.treeNodes.map((nm) => nm)
			// console.log('filteredNodes1: returning the root node')
			return retNodes
		}
		const retNodes = this.getParentComponent().filteredNodes[this.parentInd].children.filter(node => {
			return node.doShow
		})
		// console.log('filteredNodes2: returning ' + retNodes.length + ' nodes')
		return retNodes
	},

	/*
	 * gaps is used for nodes indentation
	 * nodeLevel starts with 0; item level with 1
	 * @returns {number[]}
	 */
	gaps() {
		const gaps = []
		let i = this.nodeLevel
		while (i-- > 0) gaps.push(i)
		if (this.nodeLevel + 1 === store.state.helpersRef.getLeafLevel()) {
			// create an extra array member for an extra indent on leaf level (this level has no leading chevron in the tree view)
			gaps.push(i)
		}
		return gaps
	},

	isRoot() {
		return this.nodeLevel === 0
	}
}

const methods = {

	emitBeforeDrop(draggingNodes, position, cancel) {
		this.getRootComponent().$emit('beforedrop', draggingNodes, position, cancel)
	},

	emitDrop(draggingNodes, position) {
		this.getRootComponent().$emit('drop', draggingNodes, position)
	},

	// trigger the context component via the eventbus if the node is selectable
	emitNodeContextmenu(node) {
		if (node.isSelectable) this.eventBus.emit('context-menu', node)
	},

	emitSelect(fromContextMenu) {
		this.getRootComponent().$emit('nodes-are-selected', fromContextMenu)
	},

	/* Return the node closest to the current cursor position or null if not found */
	getCursorModelPositionFromCoords(x, y) {
		function getClosestElementWithPath(el) {
			if (!el) return null
			if (el.getAttribute('path')) return el
			return getClosestElementWithPath(el.parentElement)
		}

		const topelement = document.elementFromPoint(x, y)
		if (!topelement) return null
		const nodeItem = topelement.getAttribute('path') ? topelement : getClosestElementWithPath(topelement)
		if (!nodeItem) return null

		const pathStr = nodeItem.getAttribute('path')
		const path = JSON.parse(pathStr)
		const nodeModel = store.state.helpersRef.getNodeModel(path)
		if (!nodeModel) return null

		const nodeHeight = nodeItem.offsetHeight
		const offsetY = y - nodeItem.getBoundingClientRect().top

		let placement
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

	getParentComponent() {
		return this.$parent
	},

	getRootComponent() {
		if (this.isRoot) return this
		return this.getParentComponent().getRootComponent()
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

		if (this.preventDrag || !this.lastSelectedNode.isSelected) return

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
			for (const node of store.state.selectedNodes) {
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
		this.lastSelectedNode = node
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
		if (!this.lastSelectedNode.isSelected || this.cursorPosition.nodeModel.level === LEVEL.DATABASE || store.state.moveOngoing || store.state.selectNodeOngoing) {
			if (store.state.moveOngoing) this.showLastEvent('Cannot drag while moving items to another product. Complete or cancel the move in context menu.', SEV.WARNING)
			if (store.state.selectNodeOngoing) this.showLastEvent('Cannot drag while selecting a dependency. Complete or cancel the selection in context menu.', SEV.WARNING)
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
		}

		// if the cursor is placed below the last child of a parent item insert the moved item(s) as childs of that parent
		const sourceParent = store.state.helpersRef.getParentNode(this.lastSelectedNode)
		const nextParent = store.state.helpersRef.getNextSibling(sourceParent.path)
		if (sourceParent === null) {
			// cancel the drop
			this.showLastEvent('The parent of the selected node is not found', SEV.ERROR)
			this.stopDrag()
			return
		}
		if (this.cursorPosition.placement === 'before' && this.cursorPosition.nodeModel === nextParent) {
			// change the cursorPosition.nodeModel to the last child of the sourceParent and insert after this child
			this.cursorPosition.nodeModel = sourceParent.children.slice(-1)[0]
			this.cursorPosition.placement = 'after'
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
		if (node.isExpanded) {
			collapseNode(node)
		} else expandNode(node)

		event.stopPropagation()
	},

	/* Select a node from the tree; another node must have been selected before; multiple nodes must have the same parent */
	select(cursorPosition, event) {
		store.state.lastSelectCursorPosition = cursorPosition
		const selNode = cursorPosition.nodeModel
		if (selNode.isSelectable) {
			this.preventDrag = false
			const prevSelectedNode = store.state.selectedNodes.slice(-1)[0] || selNode
			// ctrl-select or shift-select mode is allowed only if in professional mode and nodes have the same parent and are above PRODUCTLEVEL (epics, features and higher)
			if (store.state.userData.myOptions.proUser === 'true' && selNode.level > LEVEL.PRODUCT && selNode.parentId === prevSelectedNode.parentId && event && (event.ctrlKey || event.shiftKey)) {
				if (event.ctrlKey) {
					// multi selection
					store.commit('addSelectedNode', selNode)
				} else {
					if (event.shiftKey) {
						// range selection
						const siblings = store.state.helpersRef.getNodeSiblings(selNode.path)
						if (selNode.ind > prevSelectedNode.ind) {
							for (const s of siblings) {
								if (s.ind > prevSelectedNode.ind && s.ind <= selNode.ind) {
									store.commit('addSelectedNode', s)
								}
							}
						} else if (selNode.ind < prevSelectedNode.ind) {
							for (let i = siblings.length - 1; i >= 0; i--) {
								if (siblings[i].ind < prevSelectedNode.ind && siblings[i].ind >= selNode.ind) {
									store.commit('addSelectedNode', siblings[i])
								}
							}
						}
					}
				}
			} else {
				// single selection mode
				store.commit('renewSelectedNodes', selNode)
			}
			// access the selected nodes using the store: store.state.selectedNodes
			const fromContextMenu = false
			this.emitSelect(fromContextMenu)
		}
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
		const nodesToScan = this.isOverviewSelected ? undefined : store.state.helpersRef.getCurrentProductModel()
		store.state.helpersRef.traverseModels((nm) => {
			if (nm.level <= toLevel) {
				// eslint-disable-next-line no-console
				console.log(`${caller}: level = ${nm.level}, isExpanded = ${nm.isExpanded}, doShow = ${nm.doShow}, title = ${nm.title}`)
			}
		}, nodesToScan)
	},

	stopDrag() {
		this.isDragging = false
		this.mouseIsDown = false
		this.setModelCursorPosition(null)
	},

}

export default {
	extends: commonView,
	name: 'sl-vue-tree',
	props,
	data,
	mounted,
	computed,
	methods
}
