/*
 * This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree
 */

const PRODUCTLEVEL = 2
const FILTERBUTTONTEXT = 'Set filter'
const RESETFILTERBUTTONTEXT = 'Clear filter'
const INFO = 0

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
		multiselectKey: {
			type: [String, Array],
			default: function () {
				return ['ctrlKey', 'metaKey']
			},
			validator: function (value) {
				let allowedKeys = ['ctrlKey', 'metaKey', 'altKey'];
				let multiselectKeys = Array.isArray(value) ? value : [value];
				multiselectKeys = multiselectKeys.filter(keyName => allowedKeys.indexOf(keyName) !== -1);
				return !!multiselectKeys.length;
			}
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
				return this.getNodes(nodeModels);
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
			return this.getDraggable().length;
		}
	},
	methods: {

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
				children: nodeModel.children ? this.getNodes(nodeModel.children, path, isExpanded) : [],
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

		emitNodeDblclick(node, event) {
			this.getRoot().$emit('nodedblclick', node, event);
		},

		emitNodeContextmenu(node, event) {
			this.getRoot().$emit('nodecontextmenu', node, event);
		},

		onExternalDragoverHandler(node, event) {
			event.preventDefault();
			const root = this.getRoot();
			const cursorPosition = root.getCursorPositionFromCoords(event.clientX, event.clientY);
			root.setCursorPosition(cursorPosition);
			root.$emit('externaldragover', cursorPosition, event);
		},

		onExternalDropHandler(node, event) {
			const root = this.getRoot();
			const cursorPosition = root.getCursorPositionFromCoords(event.clientX, event.clientY);
			root.$emit('externaldrop', cursorPosition, event);
			this.setCursorPosition(null);
		},

		/* select a node from the current product only or select the top node of another product*/
		select(path,
			addToSelection = false,
			event = null) {

			const cursorPosition = this.getCursorPositionFromCoords(event.clientX, event.clientY);
			const destNode = cursorPosition.node;
			const placement = cursorPosition.placement;

			this.setCursorPosition({
				node: destNode,
				placement
			})

			this.saveSelectCursorPosition({
				node: destNode,
				placement
			})

			// set the current productId. emitSelect will set it globally
			let productId = destNode.productId

			const multiselectKeys = Array.isArray(this.multiselectKey) ? this.multiselectKey : [this.multiselectKey]
			const multiselectKeyIsPressed = event && !!multiselectKeys.find(key => event[key])
			addToSelection = (multiselectKeyIsPressed || addToSelection) && this.allowMultiselect

			const selectedNode = this.getNode(path)
			if (!selectedNode) return null
			const shiftSelectionMode = this.allowMultiselect && event && event.shiftKey && this.lastSelectedNode
			const selectedNodes = []
			let shiftSelectionStarted = false

			this.traverseLight((itemPath, nodeModel) => {
				if (shiftSelectionMode) {
					// only select nodes on the same level
					if (itemPath.length === this.lastSelectedNode.level &&
						(this.comparePaths(itemPath, selectedNode.path) === 0 ||
							this.comparePaths(itemPath, this.lastSelectedNode.path) === 0)) {
						nodeModel.isSelected = nodeModel.isSelectable
						shiftSelectionStarted = !shiftSelectionStarted
					}
					// only select nodes on the same level
					if (shiftSelectionStarted && itemPath.length === this.lastSelectedNode.level) {
						nodeModel.isSelected = nodeModel.isSelectable
					}
				} else if (this.comparePaths(itemPath, selectedNode.path) === 0) {
					nodeModel.isSelected = nodeModel.isSelectable
				} else if (!addToSelection) {
					// ToDo: refactor this
					if (nodeModel.isSelected) {
						nodeModel.isSelected = false
					}
				}

				if (nodeModel.isSelected) {
					let node = this.getNode(itemPath, nodeModel)
					selectedNodes.push(node)
				}
			}, productId, 'sl-vue-tree.js:select')
			// when moving to another product deselect all but the selected top node and
			// make the nodes under the product nodes of the selected product visible and the nodes under other product nodes invisible
			if (productId !== this.$store.state.load.currentProductId) {
				this.traverseLight((itemPath, nodeModel) => {
					if (nodeModel._id !== selectedNode._id) {
						nodeModel.isSelected = false
					}
					if (itemPath.length > PRODUCTLEVEL) {
						nodeModel.doShow = nodeModel.productId === selectedNode.productId
					}
				}, undefined, 'sl-vue-tree.js:select.deselect')
			}
			this.lastSelectedNode = selectedNode
			if (selectedNodes.length > 0) this.emitSelect(selectedNodes, event)
		},

		onMousemoveHandler(event) {
			if (!this.isRoot) {
				this.getRoot().onMousemoveHandler(event);
				return;
			}

			if (this.preventDrag) return;

			const initialDraggingState = this.isDragging;
			const isDragging =
				this.isDragging || (
					this.mouseIsDown &&
					(this.lastMousePos.x !== event.clientX || this.lastMousePos.y !== event.clientY)
				);

			const isDragStarted = initialDraggingState === false && isDragging === true;

			this.lastMousePos = {
				x: event.clientX,
				y: event.clientY
			};

			if (!isDragging) return;

			const $root = this.getRoot().$el;
			const rootRect = $root.getBoundingClientRect();
			const $dragInfo = this.$refs.dragInfo;
			const dragInfoTop = (event.clientY - rootRect.top + $root.scrollTop - ($dragInfo.style.marginBottom | 0));
			const dragInfoLeft = (event.clientX - rootRect.left);

			$dragInfo.style.top = dragInfoTop + 'px';
			$dragInfo.style.left = dragInfoLeft + 'px';

			const cursorPosition = this.getCursorPositionFromCoords(event.clientX, event.clientY);
			const destNode = cursorPosition.node;
			const placement = cursorPosition.placement;

			if (isDragStarted && !destNode.isSelected) {
				this.select(destNode.path, false, event);
			}

			this.isDragging = isDragging;

			this.setCursorPosition({
				node: destNode,
				placement
			});

			const scrollBottomLine = rootRect.bottom - this.scrollAreaHeight;
			const scrollDownSpeed = (event.clientY - scrollBottomLine) / (rootRect.bottom - scrollBottomLine);
			const scrollTopLine = rootRect.top + this.scrollAreaHeight;
			const scrollTopSpeed = (scrollTopLine - event.clientY) / (scrollTopLine - rootRect.top);

			if (scrollDownSpeed > 0) {
				this.startScroll(scrollDownSpeed);
			} else if (scrollTopSpeed > 0) {
				this.startScroll(-scrollTopSpeed)
			} else {
				this.stopScroll();
			}
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
					if (offsetY <= edgeSize) {
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

		onMouseleaveHandler(event) {
			if (!this.isRoot || !this.isDragging) return;
			const $root = this.getRoot().$el;
			const rootRect = $root.getBoundingClientRect();
			if (event.clientY >= rootRect.bottom) {
				this.setCursorPosition({
					node: this.nodes.slice(-1)[0],
					placement: 'after'
				});
			} else if (event.clientY < rootRect.top) {
				this.setCursorPosition({
					node: this.getFirstNode(),
					placement: 'before'
				});
			}
		},

		getNodeEl(path) {
			this.getRoot().$el.querySelector(`[path="${JSON.stringify(path)}"]`);
		},

		getLastNode() {
			let lastNode = null;
			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				lastNode = this.getNode(nodePath, nodeModel, nodeModels)
			}, undefined, 'sl-vue-tree.js:getLastNode');
			return lastNode;
		},

		getFirstNode() {
			return this.getNode([0]);
		},

		getNextNode(path, filter = null) {

			let resultNode = null;

			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				if (this.comparePaths(nodePath, path) < 1) return;

				let node = this.getNode(nodePath, nodeModel, nodeModels)
				if (!filter || filter(node)) {
					resultNode = node;
					return false
				}

			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getNextNode');

			return resultNode;
		},

		getPrevNode(path, filter) {
			let prevNodes = [];

			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				if (this.comparePaths(nodePath, path) >= 0) {
					return false;
				}
				prevNodes.push(this.getNode(nodePath, nodeModel, nodeModels));
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:getPrevNode');

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

		startScroll(speed) {
			const $root = this.getRoot().$el;
			if (this.scrollSpeed === speed) {
				return;
			} else if (this.scrollIntervalId) {
				this.stopScroll();
			}

			this.scrollSpeed = speed;
			this.scrollIntervalId = setInterval(() => {
				$root.scrollTop += this.maxScrollSpeed * speed;
			}, 20);
		},

		stopScroll() {
			clearInterval(this.scrollIntervalId);
			this.scrollIntervalId = 0;
			this.scrollSpeed = 0;
		},

		onDocumentMouseupHandler(event) {
			if (this.isDragging) this.onNodeMouseupHandler(event);
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

			// console.log('moveNodes: targetProductId = ' + targetProductId + ' targetParentId = ' + targetParentId)
			// update the product and parent ids; mark the changed nodemodels for distribution
			updateMovedNodes((nodeModel, productId, parentId) => {
				if (nodeModel.parentId !== parentId) {
					// children have the id of their parent as parentId
					nodeModel.parentId = parentId
					// console.log('updateIds-CB: _id = ' + nodeModel._id + ' parentId is set to ' + nodeModel.parentId + ' title = ' + nodeModel.title)
					nodeModel.data.sessionId = this.$store.state.sessionId
					nodeModel.data.distributeEvent = true
				}
				if (nodeModel.productId !== productId) {
					// children have the same productId as the parent
					nodeModel.productId = productId
					// console.log('updateIds-CB: _id = ' + nodeModel._id + ' productId is set to ' + nodeModel.productId + ' title = ' + nodeModel.title + ' nodeModel.parentId = ' + nodeModel.parentId)
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

		onNodeMouseupHandler(event, targetNode = null) {
			// handle only left mouse button
			if (event.button !== 0) return;

			if (!this.isRoot) {
				this.getRoot().onNodeMouseupHandler(event, targetNode);
				return;
			}

			this.mouseIsDown = false;
			if (!this.isDragging && targetNode && !this.preventDrag) {
				this.select(targetNode.path, false, event);
			}

			this.preventDrag = false;
			if (!this.cursorPosition) {
				this.stopDrag();
				return;
			}

			// if not dragging or moving an item to another product
			if (!this.isDragging || this.$store.state.moveOngoing) return

			const draggingNodes = this.getDraggable();
			// check that nodes is possible to insert
			for (let draggingNode of draggingNodes) {
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
			this.emitBeforeDrop(draggingNodes, this.cursorPosition, () => cancelled = true);

			if (cancelled) {
				this.stopDrag();
				return;
			}

			this.moveNodes(this.cursorPosition, draggingNodes)

			this.lastSelectedNode = null;
			this.emitDrop(draggingNodes, this.cursorPosition, event);
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
			this.stopScroll();
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

			const pathStr = JSON.stringify(path);
			this.traverseLight((nodePath, nodeModel) => {
				if (JSON.stringify(nodePath) !== pathStr) return;
				Object.assign(nodeModel, patch);
			}, this.$store.state.load.currentProductId, 'sl-vue-tree.js:updateNode');
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
			const selectedNodes = [];
			this.traverseLight((nodePath, nodeModel, nodeModels) => {
				const isDraggable = nodeModel.isDraggable === undefined ? true : !!nodeModel.isDraggable
				if (nodeModel.isSelected && isDraggable) {
					selectedNodes.push(this.getNode(nodePath, nodeModel, nodeModels))
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
			//eslint-disable-next-line no-console
			if (caller != undefined) console.log('TRAVERSELIGHT is called by ' + caller)

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
					if (productId === undefined || nodeModel.productId === 'root' || nodeModel.productId === productId) {
						count++
						const itemPath = parentPath.concat(nodeInd);
						// if (caller === 'sync.js:getNodeById') console.log('traverseLight: itemPath = ', itemPath + ' title = ' + nodeModel.title + ' productId = ' + productId)
						if (cb(itemPath, nodeModel, nodeModels) === false) {
							shouldStop = true
							break
						}

						if (nodeModel.children && nodeModel.children.length > 0) {
							traverse(cb, nodeModel.children, itemPath, productId)
						}
					}
				}
			}

			traverse(cb, this.currentValue, undefined, productId)
			if (caller !== undefined) {
				//eslint-disable-next-line no-console
				console.log('TRAVERSELIGHT: productId = ' + productId + ' traverse callback is called ' + count + ' times, shouldStop = ' + shouldStop)
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
				//				this.showVisibility('resetFilters')
			}
			if (this.$store.state.searchOn) {
				doReset(this, this.$store.state.load.currentProductId)
				this.showLastEvent(`Your search in product '${this.$store.state.load.currentProductTitle}' is cleared`, INFO)
				this.$store.state.searchOn = false
				this.$store.state.keyword = ''
				//				this.showVisibility('resetFilters')
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
