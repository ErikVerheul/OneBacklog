/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */
const ROOTLEVEL = 1
const PRODUCTLEVEL = 2
const FILTERBUTTONTEXT = 'Recent changes'
const RESETFILTERBUTTONTEXT = 'Clear filter'
const INFO = 0
var numberOfSelectedNodes = 0
var draggableNodes = []

export default {
	name: 'sl-vue-tree',
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
		},
		scrollAreaHeight: {
			type: Number,
			default: 70
		},
		maxScrollSpeed: {
			type: Number,
			default: 20
		}
	},

	data() {
		return {
			rootCursorPosition: null,
			scrollIntervalId: 0,
			scrollSpeed: 0,
			lastSelectedNode: null,
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
				const nodeModels = this.currentValue.filter(node => {
					return node.doShow
				})
				return this.getNodes(nodeModels)
			}
			return this.getParent().filteredNodes[this.parentInd].children.filter(node => {
				return node.doShow
			})
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
		},

		dragSize() {
			return draggableNodes.length;
		}
	},
	methods: {

		getProductNodes(treeNodes, productId) {
			const projectModels = treeNodes[0].children
			for (let i = 0; i < projectModels.length; i++) {
				if (projectModels[i].productId === productId) {
					return {
						projectNodes: projectModels[i].children,
						parentPath: [0, i]
					}
				}
			}
			console.log('getProductNodes: WARNING product with id ' + productId + ' not found')
			return null
		},

		setCursorPosition(pos) {
			if (this.isRoot) {
				this.rootCursorPosition = pos;
				return;
			}
			this.getParent().setCursorPosition(pos);
		},

		saveSelectCursorPosition(pos) {
			this.lastSelectCursorPosition = pos
		},

		getNodes(nodeModels, parentPath = [], isVisible = true) {

			return nodeModels.map((nodeModel, ind) => {
				const nodePath = parentPath.concat(ind);
				return this.getNode(nodePath, nodeModel, nodeModels, isVisible);
			})
		},

		getNode(
			path,
			nodeModel = null,
			siblings = null,
			isVisible = null
		) {
			const ind = path.slice(-1)[0];

			// calculate nodeModel, siblings, isVisible fields if it is not passed as arguments
			siblings = siblings || this.getNodeSiblings(this.currentValue, path);
			nodeModel = nodeModel || (siblings && siblings[ind]) || null;

			if (isVisible === null) {
				isVisible = this.isVisible(path);
			}

			if (!nodeModel) return null;

			const doShow = nodeModel.doShow === undefined ? true : !!nodeModel.doShow
			const savedDoShow = nodeModel.savedDoShow === undefined ? true : !!nodeModel.savedDoShow
			const isExpanded = nodeModel.isExpanded === undefined ? true : !!nodeModel.isExpanded
			const savedIsExpanded = nodeModel.savedIsExpanded === undefined ? true : !!nodeModel.savedIsExpanded
			const isDraggable = nodeModel.isDraggable === undefined ? true : !!nodeModel.isDraggable;
			const isSelectable = nodeModel.isSelectable === undefined ? true : !!nodeModel.isSelectable;

			const node = {
				// define the all ISlTreeNodeModel props
				productId: nodeModel.productId,
				parentId: nodeModel.parentId,
				_id: nodeModel._id,
				title: nodeModel.title,
				isLeaf: !!nodeModel.isLeaf,
				children: nodeModel.children && nodeModel.children.length > 0 ? this.getNodes(nodeModel.children, path, isExpanded) : [],
				isSelected: !!nodeModel.isSelected,
				isExpanded,
				savedIsExpanded,
				isVisible,
				isDraggable,
				isSelectable,
				doShow,
				savedDoShow,
				data: nodeModel.data !== undefined ? nodeModel.data : {},

				// define the all ISlTreeNode computed props
				path: path,
				pathStr: JSON.stringify(path),
				level: path.length,
				ind,
				isFirstChild: ind === 0,
				isLastChild: ind === siblings.length - 1
			};
			return node;
		},

		isVisible(path) {
			if (path.length < 2) return true;
			let nodeModels = this.currentValue;

			for (let i = 0; i < path.length - 1; i++) {
				let ind = path[i];
				let nodeModel = nodeModels[ind];
				let isExpanded = nodeModel.isExpanded === undefined ? true : !!nodeModel.isExpanded;
				if (!isExpanded) return false;
				nodeModels = nodeModel.children;
			}

			return true;
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
			const selectedNode = cursorPosition.node
			const path = selectedNode.path

			this.saveSelectCursorPosition({
				node: selectedNode,
				placement: cursorPosition.placement
			})

			// set the current productId. when on root level leave as is. emitSelect will set it a change globally
			let productId = path.length === ROOTLEVEL ? this.$store.state.load.currentProductId : selectedNode.productId
			const selectedNodes = []

			if (path.length > PRODUCTLEVEL) {
				const shiftSelectionMode = this.allowMultiselect && event && event.shiftKey && this.lastSelectedNode
				// only select nodes on the same level
				if (shiftSelectionMode && path.length !== this.lastSelectedNode.level) return

				this.traverseLight((itemPath, nodeModel) => {
					if (shiftSelectionMode) {
						if (this.comparePaths(itemPath, selectedNode.path) === 0) {
							nodeModel.isSelected = nodeModel.isSelectable
						}
					} else if (this.comparePaths(itemPath, selectedNode.path) === 0) {
						nodeModel.isSelected = nodeModel.isSelectable
					} else nodeModel.isSelected = false

					if (nodeModel.isSelected) {
						let node = this.getNode(itemPath, nodeModel)
						selectedNodes.push(node)
					}
				}, productId, 'sl-vue-tree.js:select')
			} else {
				// root or a product top node is selected
				selectedNodes.push(selectedNode)
			}

			// when moving to another product deselect all but the selected top node
			// make the nodes under the product nodes of the selected product visible and the nodes under other product nodes invisible
			// collapse the branche of the product that was slected before
			const previousProductId = this.$store.state.load.currentProductId
			if (productId !== previousProductId) {
				this.traverseLight((itemPath, nodeModel) => {
					if (nodeModel._id !== selectedNode._id) {
						nodeModel.isSelected = false
					}
					if (itemPath.length > PRODUCTLEVEL) {
						nodeModel.doShow = nodeModel.productId === selectedNode.productId
					}
					if (nodeModel.productId === previousProductId) {
						nodeModel.isExpanded = false
					}
				}, undefined, 'sl-vue-tree.js:select.deselect')
			}

			this.lastSelectedNode = selectedNode
			numberOfSelectedNodes = selectedNodes.length
			if (numberOfSelectedNodes > 0) this.emitSelect(selectedNodes, event)
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
				draggableNodes = this.getDraggable()
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

			const cursorPosition = this.getCursorPositionFromCoords(event.clientX, event.clientY)
			const destNode = cursorPosition.node
			const placement = cursorPosition.placement

			if (isDragStarted && !destNode.isSelected) {
				this.select(cursorPosition, event)
			}

			this.isDragging = isDragging

			this.setCursorPosition({
				node: destNode,
				placement
			});
		},

		getCursorPositionFromCoords(x, y) {
			const $target = document.elementFromPoint(x, y);
			const $nodeItem = $target.getAttribute('path') ? $target : this.getClosetElementWithPath($target);
			let destNode;
			let placement;

			if ($nodeItem) {

				if (!$nodeItem) return;

				destNode = this.getNode(JSON.parse($nodeItem.getAttribute('path')));

				const nodeHeight = $nodeItem.offsetHeight;
				const edgeSize = this.edgeSize;
				const offsetY = y - $nodeItem.getBoundingClientRect().top;

				if (destNode.isLeaf) {
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
			} else {
				const $root = this.getRoot().$el;
				const rootRect = $root.getBoundingClientRect();
				if (y > rootRect.top + (rootRect.height / 2)) {
					placement = 'after';
					destNode = this.getLastNode();
					console.log('getCursorPositionFromCoords: after: destNode.title = ' + destNode.title)
				} else {
					placement = 'before';
					destNode = this.getFirstNode();
					console.log('getCursorPositionFromCoords: before: destNode.title = ' + destNode.title)
				}
			}
			return {
				node: destNode,
				placement
			};
		},

		getClosetElementWithPath($el) {
			if (!$el) return null;
			if ($el.getAttribute('path')) return $el;
			return this.getClosetElementWithPath($el.parentElement);
		},

		getNodeEl(path) {
			this.getRoot().$el.querySelector(`[path="${JSON.stringify(path)}"]`);
		},

		getLastNode() {
			let lastPath = []
			let lastNode
			function traverse(nodes) {
				const ind = nodes.length - 1
				lastPath = lastPath.concat(ind)
				lastNode = nodes[ind]
				const children = lastNode.children
				if (children && children.length > 0) {
					traverse(children)
				}
			}
			traverse(this.currentValue)
			return this.getNode(lastPath, lastNode)
		},

		getFirstNode() {
			return this.getNode([0]);
		},

		getNextNode(path, filter = null) {
			let resultNode = null;
			const productId = path.length === PRODUCTLEVEL ? undefined : this.$store.state.load.currentProductId
			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				if (this.comparePaths(nodePath, path) < 1) return;

				let node = this.getNode(nodePath, nodeModel, nodeModels)
				if (!filter || filter(node)) {
					resultNode = node;
					return false
				}

			}, productId, 'sl-vue-tree.js:getNextNode');

			return resultNode;
		},

		getPrevNode(path, filter) {
			let prevNodes = [];

			const productId = path.length === PRODUCTLEVEL ? undefined : this.$store.state.load.currentProductId
			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				if (this.comparePaths(nodePath, path) >= 0) {
					return false;
				}
				prevNodes.push(this.getNode(nodePath, nodeModel, nodeModels));
			}, productId, 'sl-vue-tree.js:getPrevNode');

			let i = prevNodes.length;
			while (i--) {
				const node = prevNodes[i];
				if (!filter || filter(node)) return node;
			}

			return null;
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

		onNodeMousedownHandler(event, node) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRoot().onNodeMousedownHandler(event, node);
				return;
			}
			this.mouseIsDown = true;
		},

		/* Move the nodes to the position designated by cursorPosition */
		moveNodes(cursorPosition, nodes) {
			const targetProductId = cursorPosition.node.productId
			const nodeModelsSubjectToDelete = []
			const nodeModelsSubjectToInsert = []

			function updateMovedNodes(cb, nodeModels, productId) {
				// inRange means that the recursion processes items of the requested product
				let inRange = false
				function traverse(
					cb,
					nodeModels,
					parentPath = [],
					parentId = undefined) {
					for (let nodeInd = 0; nodeInd < nodeModels.length; nodeInd++) {
						const nodeModel = nodeModels[nodeInd]
						const itemPath = parentPath.concat(nodeInd)
						// skip the root
						if (nodeModel.productId === 'root') {
							traverse(cb, nodeModel.children, itemPath, nodeModel._id)
						} else {
							if (itemPath.length === PRODUCTLEVEL) {
								// exit the recursion if the range has been processed
								if (inRange && nodeModel.productId !== productId) break
								inRange = nodeModel.productId === productId
							}
							// console.log('updateIds: inRange = ' + inRange + ' nodeModel._id = ' + nodeModel._id + ' nodeModel.productId = ' + nodeModel.productId + ' nodeModel.parentId = ' + nodeModel.parentId)

							if (inRange) cb(nodeModel, productId, parentId)

							if (nodeModel.children && nodeModel.children.length > 0) {
								traverse(cb, nodeModel.children, itemPath, nodeModel._id)
							}
						}
					}
				}
				traverse(cb, nodeModels)
			}

			// find model to delete and to insert
			const firstNodeLevel = nodes[0].level
			for (let node of nodes) {
				const sourceSiblings = this.getNodeSiblings(this.currentValue, node.path)
				nodeModelsSubjectToDelete.push(sourceSiblings[node.ind])
				// no need to insert the children as they are part of the higher level nodes anyway
				if (node.level === firstNodeLevel) {
					nodeModelsSubjectToInsert.push(node)
				}
			}

			// mark nodes in model to delete
			for (let nodeModel of nodeModelsSubjectToDelete) {
				nodeModel['_markToDelete'] = true;
			}

			// insert nodes to the new place
			this.insertModels(cursorPosition, nodeModelsSubjectToInsert, this.currentValue)

			// update the product and parent ids; mark the changed nodemodels for distribution
			updateMovedNodes((nodeModel, productId, parentId) => {
				if (nodeModel.parentId !== parentId) {
					// children have the id of their parent as parentId
					nodeModel.parentId = parentId
					nodeModel.data.sessionId = this.$store.state.sessionId
					nodeModel.data.distributeEvent = true
				}
				if (nodeModel.productId !== productId) {
					// children have the same productId as the parent
					nodeModel.productId = productId
					nodeModel.data.sessionId = this.$store.state.sessionId
					nodeModel.data.distributeEvent = true
				}
			}, this.currentValue, targetProductId)

			// delete nodes from the old place
			this.traverseModels((nodeModel, siblings, ind) => {
				if (!nodeModel._markToDelete) return;
				siblings.splice(ind, 1);
			}, this.currentValue);
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
				const cPos = this.getCursorPositionFromCoords(event.clientX, event.clientY)
				this.select(cPos, event)
				return
			}

			this.preventDrag = false;

			if (!this.cursorPosition) {
				this.stopDrag();
				return;
			}

			// if no nodes selected or at root level or not dragging or moving an item to another product
			if (draggableNodes.length === 0 || this.cursorPosition.node.path.length === ROOTLEVEL || !this.isDragging || this.$store.state.moveOngoing) {
				this.stopDrag()
				return
			}

			// check that nodes is possible to insert
			for (let draggingNode of draggableNodes) {
				if (draggingNode.pathStr === this.cursorPosition.node.pathStr) {
					this.stopDrag();
					return;
				}
				if (this.checkNodeIsParent(draggingNode, this.cursorPosition.node)) {
					this.stopDrag();
					return;
				}
				// prevent drag to other product
				if (this.cursorPosition.node.productId !== this.$store.state.load.currentProductId) {
					this.stopDrag();
					return;
				}
				// prevent confusion when the user selects a target node to insert before when that node has a lower level (higher in the hierarchy)
				if (this.cursorPosition.placement === 'before' && this.cursorPosition.node.level < draggingNode.level) {
					this.stopDrag()
					return
				}
				// prevent placement on wrong level when the user selects the parent as target node to insert after
				if (this.cursorPosition.placement === 'after' && this.cursorPosition.node.level < draggingNode.level) {
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

			this.moveNodes(this.cursorPosition, draggableNodes)

			this.lastSelectedNode = null;
			this.emitDrop(draggableNodes, this.cursorPosition, event);
			this.stopDrag();
		},

		onToggleHandler(event, node) {
			if (!this.allowToggleBranch) return;
			let newVal = !node.isExpanded
			this.updateNode(node.path, {
				isExpanded: newVal,
				// save the state so that filters can revert to it
				savedDoShow: node.doShow,
				savedIsExpanded: newVal
			});
			this.emitToggle(node, event);
			event.stopPropagation();
		},

		stopDrag() {
			this.isDragging = false;
			this.mouseIsDown = false;
			this.setCursorPosition(null);
		},

		getParent() {
			return this.$parent;
		},

		getRoot() {
			if (this.isRoot) return this;
			return this.getParent().getRoot();
		},

		getNodeSiblings(nodes, path) {
			if (path.length === 1) return nodes;
			return this.getNodeSiblings(nodes[path[0]].children, path.slice(1));
		},


		updateNode(path, patch) {
			if (!this.isRoot) {
				this.getParent().updateNode(path, patch);
				return;
			}

			const productId = path.length <= PRODUCTLEVEL ? undefined : this.$store.state.load.currentProductId
			this.traverseLight((nodePath, nodeModel) => {
				if (this.comparePaths(nodePath, path) === 0) {
					Object.assign(nodeModel, patch)
					return false
				}
			}, productId, 'sl-vue-tree.js:updateNode')
		},

		getSelectedProduct() {
			const projectModels = this.currentValue[0].children
			for (let i = 0; i < projectModels.length; i++) {
				if (projectModels[i].isSelected) {
					return this.getNode([0, i], projectModels[i])
				}
			}
			console.log('getSelectedProduct: ERROR product not found')
			return null
		},

		/* Collects all nodes in the current product that are selected */
		getSelected() {
			const selectedNodes = [];
			this.traverseLight((nodePath, nodeModel) => {
				if (nodeModel.isSelected) {
					let node = this.getNode(nodePath, nodeModel)
					selectedNodes.push(node)
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getSelected')
			return selectedNodes
		},

		getDraggable() {
			const selectedNodes = []
			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				const isDraggable = nodeModel.isDraggable === undefined ? true : !!nodeModel.isDraggable
				if (nodeModel.isSelected && isDraggable) {
					selectedNodes.push(this.getNode(nodePath, nodeModel, nodeModels))
					// quit the search if all selected nodes are found
					if (selectedNodes.length === numberOfSelectedNodes) return false
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getDraggable');
			return selectedNodes;
		},

		/*
		 * A faster version of the original
		 * Use the optinal parameter productId to limit the callback calls to that product only, or use the value 'undefined' to scan all products
		 * Use the optinal parameter caller to console log the source of the call.
		 */
		traverseLight(
			cb,
			productId = undefined,
			caller = undefined) {

			let shouldStop = false
			let count = 0
			function traverse(
				cb,
				nodeModels = null,
				parentPath = [],
				productId = undefined
			) {
				if (shouldStop) return

				for (let nodeInd = 0; nodeInd < nodeModels.length; nodeInd++) {
					const nodeModel = nodeModels[nodeInd];
					count++
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
				const product = this.getProductNodes(this.currentValue, productId)
				if (product !== null) {
					nodeModels = product.projectNodes
					parentPath = product.parentPath
				} else {
					// product not found: traverse the whole tree
					productId = undefined
				}
			}
			traverse(cb, nodeModels, parentPath, productId)

			if (caller !== undefined) {
				console.log('TRAVERSELIGHT: was called by: ' + caller + ' productId = ' + productId + ' traverse callback is called ' + count + ' times, shouldStop = ' + shouldStop)
			}
		},

		traverseModels(cb, nodeModels) {
			let i = nodeModels.length;
			while (i--) {
				const nodeModel = nodeModels[i];
				if (nodeModel.children) this.traverseModels(cb, nodeModel.children);
				cb(nodeModel, nodeModels, i);
			}
			return nodeModels;
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

			return this.getNode(prevVisiblePath, prevVisibleModel)
		},

		remove(paths) {
			const pathsStr = paths.map(path => JSON.stringify(path));
			this.traverseLight((nodePath, nodeModel) => {
				for (const pathStr of pathsStr) {
					if (JSON.stringify(nodePath) === pathStr) nodeModel._markToDelete = true;
				}
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:remove');

			this.traverseModels((nodeModel, siblings, ind) => {
				if (!nodeModel._markToDelete) return;
				siblings.splice(ind, 1);
			}, this.currentValue)
		},
		/*
		 * Inserts the nodes in array nodeModels after (when moving down)
		 * or before (when moving up) node cursorposition in the newNodes array model.
		 * Return the parentId the models are inserted under.
		 */
		insertModels(cursorPosition, nodeModels, newNodes) {
			const destNode = cursorPosition.node;
			const destSiblings = this.getNodeSiblings(newNodes, destNode.path);
			const destNodeModel = destSiblings[destNode.ind];
			let parentId
			if (cursorPosition.placement === 'inside') {
				parentId = destNode._id
				destNodeModel.children = destNodeModel.children || [];
				destNodeModel.children.unshift(...nodeModels);
			} else {
				const insertInd = cursorPosition.placement === 'before' ? destNode.ind : destNode.ind + 1;
				destSiblings.splice(insertInd, 0, ...nodeModels);
				parentId = destNode.parentId
			}
			return parentId
		},

		insert(cursorPosition, nodeModel) {
			const nodeModels = Array.isArray(nodeModel) ? nodeModel : [nodeModel];
			this.insertModels(cursorPosition, nodeModels, this.currentValue);
		},

		checkNodeIsParent(sourceNode, destNode) {
			const destPath = destNode.path;
			return JSON.stringify(destPath.slice(0, sourceNode.path.length)) == sourceNode.pathStr;
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

		showLastEvent(txt, level) {
			switch (level) {
				case INFO:
					this.eventBgColor = '#408FAE'
			}
			this.$store.state.load.lastEvent = txt
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
				// show the node
				nodeModel.doShow = true
			}, this.$store.state.load.currentProductId, 'sl-vue-tree:expandTree')
			// this.showVisibility('expandTree')
		},

		/* clear any outstanding filters */
		resetFilters(caller) {
			// eslint-disable-next-line no-console
			console.log('resetFilters is called by ' + caller)

			function doReset(vm, productId) {
				vm.traverseLight((itemPath, nodeModel) => {
					nodeModel.doShow = nodeModel.savedDoShow
					nodeModel.isExpanded = nodeModel.savedIsExpanded
				}, productId, 'sl-vue-tree:resetFilters')
			}

			if (this.$store.state.filterOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your filter in product '${this.$store.state.load.currentProductTitle}' is cleared`, INFO)
				this.$store.state.filterText = FILTERBUTTONTEXT
				this.$store.state.filterOn = false
				// this.showVisibility('resetFilters')
			}
			if (this.$store.state.searchOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your search in product '${this.$store.state.load.currentProductTitle}' is cleared`, INFO)
				this.$store.state.searchOn = false
				this.$store.state.keyword = ''
				// this.showVisibility('resetFilters')
			}
		},

		showParents(path) {
			let parentPath = path.slice(0, -1)
			// do not touch the database level
			if (parentPath.length < PRODUCTLEVEL) return

			this.traverseLight((itemPath, nodeModel) => {
				if (JSON.stringify(itemPath) !== JSON.stringify(parentPath)) {
					return
				}
				nodeModel.doShow = true
				nodeModel.isExpanded = true
				return false
			}, this.$store.state.load.currentProductId, 'showParents')
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
			//			this.showVisibility('filterSince')
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
			//			this.showVisibility('filterOnKeyword')
		},
	}
}
