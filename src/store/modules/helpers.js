/*
 * Global functions that need access to the Vuex store
 * Unlike getters these functions need no return value and are not re-evaluated and cached when some of its dependencies have changed.
 * Use in components by calling store.state.helpersRef.functionName(params)
 * Use in Vuex actions by calling rootState.helpersRef.functionName(params)
 * Note that the store must be initialized before use
 */

import { LEVEL, MISC, SEV, STATE } from '../../constants.js'
import { collapseNode, expandNode, dedup, showNode } from '../../common_functions.js'
const actions = {
	createHelpers({ rootState, rootGetters, commit }) {
		rootState.helpersRef = {
			name: 'OneBacklog global helper functions',

			/* Convenience function */
			getLeafLevel() {
				return rootGetters.leafLevel
			},

			/* Pad a number to a string with a fixed number of digits */
			pad(num, size) {
				var s = '000' + num
				return s.substring(s.length - size)
			},

			/* Return the subtype description (on PBI level only) */
			getSubType(idx) {
				if (idx < 0 || idx >= rootState.configData.subtype.length) {
					return 'Error: unknown subtype'
				}
				return rootState.configData.subtype[idx]
			},

			/* Return the description of the give level, or the subtype description if the level equals the PBI level */
			getLevelText(level, subtype = 0) {
				if (level < 0 || level > LEVEL.TASK) {
					return 'Error: Level not supported'
				}
				if (level === LEVEL.PBI) {
					return rootState.helpersRef.getSubType(subtype)
				}
				return rootState.configData.itemType[level]
			},

			/* Return the nodeModel on the given path in the given tree branch (default: the complete tree) or null if not found */
			getNodeModel(path, branch = rootGetters.getTreeModel) {
				const ind = path[0]
				if (path.length === 1) return branch[ind] || null
				return rootState.helpersRef.getNodeModel(path.slice(1), branch[ind].children)
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
					isLeaf: doc.level === rootGetters.leafLevel,
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
						lastChange: doc.lastChange || 0,
						followers: doc.followers || [],
					},
					tmp: {},
				}
				return newNode
			},

			/* Add a node, derived from its document, as last child of the parentNode's children; return the created node */
			appendDescendantNode(parentNode, doc) {
				const ind = parentNode.children.length
				const path = parentNode.path.concat(ind)
				const newNode = rootState.helpersRef.createNode(doc, ind, path)
				parentNode.children.push(newNode)
				return newNode
			},

			/* Return the node on top of the node with the passed path or null if not found */
			getPreviousNode(path) {
				let prevPath
				if (path.slice(-1)[0] === 0) {
					// the node is a first child
					prevPath = path.slice(0, -1)
				} else {
					// the node has a previous sibling
					prevPath = path.slice(0, -1).concat(path.slice(-1)[0] - 1)
				}
				return rootState.helpersRef.getNodeModel(prevPath)
			},

			getNodeSiblings(path, nodes = rootGetters.getTreeModel) {
				if (path.length === 1) return nodes
				return rootState.helpersRef.getNodeSiblings(path.slice(1), nodes[path[0]].children || [])
			},

			/* Return the sibling node below the node with the passed path or null if not found */
			getNextSibling(path) {
				const nextPath = path.slice(0, -1).concat(path.slice(-1)[0] + 1)
				return rootState.helpersRef.getNodeModel(nextPath)
			},

			/* Return all product nodes in an array */
			getProducts() {
				return rootGetters.getTreeModel[0].children
			},

			/* Area nodes are per definition children of product with id AREA_PRODUCTID. Return these nodes or null if none found */
			getReqAreaNodes() {
				const productModels = rootGetters.getTreeModel[0].children
				for (const p of productModels) {
					if (p._id === MISC.AREA_PRODUCTID) {
						return p.children
					}
				}
				return null
			},

			isDescendantNodeSelected(node) {
				for (const nm of node.children) {
					if (nm.isSelected) return true
					if (rootState.helpersRef.isDescendantNodeSelected(nm)) return true
				}
				return false
			},

			/*
			 * Traverse the node models or the full tree (default), breadth first
			 * Stop when the callback returns false
			 * nodeModels: array of nodes
			 */
			traverseModels: function (cb, nodeModels = rootGetters.getTreeModel) {
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

			findDependencyViolations(allProducts) {
				const nodesToScan = allProducts ? undefined : rootState.helpersRef.getCurrentProductModel()
				const violations = []
				rootState.helpersRef.traverseModels((nm) => {
					// remove any left dependency markers
					if (nm.tmp.markedViolations) delete nm.tmp.markedViolations
					// remove any left dependency warning highlights
					if (nm.tmp.isWarnLighted) delete nm.tmp.isWarnLighted
					// find violations
					if (nm.dependencies && nm.dependencies.length > 0) {
						for (const depId of nm.dependencies) {
							const cond = rootState.helpersRef.getNodeById(depId)
							if (cond !== null && rootState.helpersRef.comparePaths(nm.path, cond.path) === -1) {
								violations.push({ condNode: cond, depNode: nm })
							}
						}
					}
				}, nodesToScan)
				return violations
			},

			/* Show the path from PRODUCTLEVEL up to the node and highlight or warnLight the node */
			showPathToNode(node, highLights) {
				const maxDepth = node.path.length
				for (let i = LEVEL.PRODUCT; i <= maxDepth; i++) {
					const nm = rootState.helpersRef.getNodeModel(node.path.slice(0, i))
					if (nm === null) {
						// node not found; skip
						continue
					}
					if (i < maxDepth) {
						expandNode(nm)
					}
				}
				// set the highlight; highLights.noHighlight sets nothing
				if (highLights && Object.keys(highLights).length > 0) {
					node.tmp.isHighlighted_1 = !!highLights.doHighLight_1
					node.tmp.isHighlighted_2 = !!highLights.doHighLight_2
					node.tmp.isWarnLighted = !!highLights.doWarn
				}
			},

			/* Show the path from condNode to depNode including both nodes */
			showDependencyViolations(violations, allProducts) {
				const nodesToScan = allProducts ? undefined : rootState.helpersRef.getCurrentProductModel()
				commit('saveTreeView', { nodesToScan, type: 'condition' })
				commit('saveTreeView', { nodesToScan, type: 'dependency' })
				for (let column = 0; column < violations.length; column++) {
					const v = violations[column]
					rootState.helpersRef.showPathToNode(v.condNode, { doWarn: true })
					rootState.helpersRef.showPathToNode(v.depNode, { doWarn: true })
					rootState.helpersRef.traverseModels((nm) => {
						if (rootState.helpersRef.comparePaths(v.depNode.path, nm.path) !== 1 && rootState.helpersRef.comparePaths(nm.path, v.condNode.path) !== 1) {
							if (nm.tmp.markedViolations) {
								nm.tmp.markedViolations.push(column)
							} else nm.tmp.markedViolations = [column]
						}
					}, nodesToScan)
				}
			},

			/* Calculate and show dependency violations */
			checkDepencyViolations(allProducts) {
				const violations = rootState.helpersRef.findDependencyViolations(allProducts)
				if (violations.length > 0) rootState.helpersRef.showDependencyViolations(violations, allProducts)
			},

			/*
			 * Find and show dependency violations in the current product (details view) or all products (coarse view).
			 * Undo the tree expansion from a previous scan on violations if no violations are found.
			 * Return true if violations are found, false otherwise.
			 */
			dependencyViolationsFound() {
				let violationsWereFound = false
				const violations = rootState.helpersRef.findDependencyViolations(rootGetters.isOverviewSelected)
				if (violations.length > 0) {
					violationsWereFound = true
					commit('addToEventList', { txt: 'This product has priority inconsistencies. Undo the change or remove the dependency.', severity: SEV.WARNING })
					rootState.helpersRef.showDependencyViolations(violations, rootGetters.isOverviewSelected)
				} else {
					// reset the tree view
					const nodesToScan = rootGetters.isOverviewSelected ? undefined : rootState.helpersRef.getCurrentProductModel()
					// traverse the tree to reset to the tree view state
					rootState.helpersRef.traverseModels((nm) => {
						// skip root level
						if (nm.level === LEVEL.DATABASE) return
						// skip requirement areas dummy product items
						if (nm._id === MISC.AREA_PRODUCTID) return

						if (nm.tmp.savedIsExpandedInDependency === false) collapseNode(nm)
						if (nm.tmp.savedIsExpandedInDependency === true) expandNode(nm)
						// delete if set or not
						delete nm.tmp.savedIsExpandedInDependency
					}, nodesToScan)
				}
				return violationsWereFound
			},

			/* Scan the full tree to find a node with the passed id and stop scanning at the first match; return null when no match is found */
			getNodeById: function (id) {
				let resultNode = null
				rootState.helpersRef.traverseModels((nm) => {
					if (nm._id === id) {
						resultNode = nm
						return false
					}
				})
				return resultNode
			},

			/*
			 * Update the descendants of the source (removal) or destination (insert) node with new position data and (if passed) new parentId and productId
			 * Pass an insertInd as the lowest index of any insert to gain performance.
			 */
			updatePaths: function (parentPath, siblings, insertInd = 0, parentId, productId) {
				for (let i = insertInd; i < siblings.length; i++) {
					const sibling = siblings[i]
					const newPath = parentPath.concat(i)
					if (parentId) sibling.parentId = parentId
					if (productId) sibling.productId = productId
					// if moving to another product in the context menu of the Products detail view, show the inserted nodes in the new product
					if (productId && rootGetters.isDetailsViewSelected) showNode(sibling)
					sibling.path = newPath
					sibling.pathStr = JSON.stringify(newPath)
					sibling.ind = i
					sibling.level = newPath.length
					sibling.isLeaf = !(sibling.level < rootGetters.leafLevel)
					if (sibling.children && sibling.children.length > 0) {
						rootState.helpersRef.updatePaths(sibling.path, sibling.children, 0, sibling._id, productId)
					}
				}
			},

			removeProduct: function (productId) {
				const newChildren = []
				for (const p of rootGetters.getTreeModel[0].children) {
					if (p._id !== productId) newChildren.push(p)
				}
				rootGetters.getTreeModel[0].children = newChildren
				// recalculate the paths in the tree
				rootState.helpersRef.updatePaths([0], newChildren)
			},

			/* If a feature belongs to a req area, set that area also to its descendants */
			setDescendantsReqArea() {
				let reqArea = null
				rootState.helpersRef.traverseModels((nm) => {
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

			/* Return the root node */
			getRootNode() {
				return rootGetters.getTreeModel[0]
			},

			/* Get the productnodes but skip the requirement area dummy product items*/
			getProductNodes() {
				const rootChildren = rootState.helpersRef.getRootNode().children
				const productNodes = []
				for (const child of rootChildren) {
					if (child.productId !== 'requirement-areas') {
						productNodes.push(child)
					}
				}
				return productNodes
			},

			/* Return an array with the node of the passed productId or an empty array if the product is not found */
			getProductModel(productId) {
				const productModels = rootState.helpersRef.getRootNode().children
				for (const p of productModels) {
					if (p.productId === productId) {
						return [p]
					}
				}
				return []
			},

			/* Return the current product node in an array */
			getCurrentProductModel() {
				return rootState.helpersRef.getProductModel(rootState.currentProductId)
			},

			/* Find the ids with a set req area in the current product */
			getCurrentReqAreaIds() {
				const idsWithReqArea = []
				rootState.helpersRef.traverseModels((nm) => {
					if (nm.data.reqarea) {
						if (!idsWithReqArea.includes(nm.data.reqarea)) idsWithReqArea.push(nm.data.reqarea)
					}
				}, rootState.helpersRef.getCurrentProductModel())
				return idsWithReqArea
			},

			/* Count the number of user stories done assigned to a given sprint, in the current product */
			countStoriesInSprint(sprintId) {
				let count = 0
				rootState.helpersRef.traverseModels((nm) => {
					if (nm.data.sprintId === sprintId) {
						if (nm.level === LEVEL.PBI && nm.data.state === STATE.DONE) {
							count++
						}
					}
				}, rootState.helpersRef.getCurrentProductModel())
				return count
			},

			selectNodeById(id) {
				const selNode = rootState.helpersRef.getNodeById(id)
				if (selNode === null) return
				commit('updateNodesAndCurrentDoc', { selectNode: selNode })
			},

			/* Collect meta data on the descendants of the node including the assigned sprintIds */
			getDescendantsInfo(node) {
				const ids = []
				const descendants = []
				const sprintIds = []
				const teams = []
				const initLevel = node.level
				let count = 0
				let maxDepth = node.level
				rootState.helpersRef.traverseModels(
					(nm) => {
						if (rootState.helpersRef.comparePaths(nm.path, node.path) === 1) {
							ids.push(nm._id)
							descendants.push(nm)
							if (nm.data.sprintId && !sprintIds.includes(nm.data.sprintId)) sprintIds.push(nm.data.sprintId)
							if (nm.data.team && !teams.includes(nm.data.team)) teams.push(nm.data.team)
							count++
							if (nm.level > maxDepth) maxDepth = nm.level
						}
					},
					[node],
				)
				return {
					ids,
					descendants,
					sprintIds,
					teams,
					count,
					depth: maxDepth - initLevel,
				}
			},

			/* Return the parent or null if not found */
			getParentNode(node) {
				const path = node.path.slice(0, -1)
				return rootState.helpersRef.getNodeModel(path)
			},

			getDescendantsInfoOnId(parentId) {
				const node = rootState.helpersRef.getNodeById(parentId)
				if (node !== null) {
					return rootState.helpersRef.getDescendantsInfo(node)
				} else
					return {
						ids: [],
						descendants: [],
						sprintIds: [],
						teams: [],
						count: 0,
						depth: 0,
					}
			},

			/* Check for descendants selected by a filter */
			checkForFilteredDescendants(node) {
				let result = false
				rootState.helpersRef.traverseModels(
					(nm) => {
						if (nm.tmp.isHighlighted_1) {
							result = true
							return false
						}
					},
					[node],
				)
				return result
			},

			/* When nodes are deleted orphan dependencies can be created. This method removes them. */
			correctDependencies(removedNode) {
				const removedItemIds = rootState.helpersRef.getDescendantsInfo(removedNode).ids
				rootState.helpersRef.traverseModels((nm) => {
					if (nm.dependencies && nm.dependencies.length > 0) {
						const newDependencies = []
						if (removedItemIds.includes(nm._id)) {
							// nm is one of the deleted nodes
							for (const d of dedup(nm.dependencies)) {
								// dependency references within the deleted nodes survive
								if (removedItemIds.includes(d)) {
									newDependencies.push(d)
								}
							}
						} else {
							// nm is an outsider
							for (const d of dedup(nm.dependencies)) {
								// outsider references not referencing any of the nodes survive
								if (!removedItemIds.includes(d)) {
									newDependencies.push(d)
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
								}
							}
						} else {
							// nm is an outsider
							for (const c of dedup(nm.conditionalFor)) {
								// outsider references not referencing any of the nodes survive
								if (!removedItemIds.includes(c)) {
									newConditionalFor.push(c)
								}
							}
						}
						nm.conditionalFor = newConditionalFor
					}
				}, rootState.helpersRef.getProductModel(removedNode.productId))
			},

			/* Return the productId, parentId, level, the index position, priority and parentFollowers if this node is to be inserted */
			preFlightSingeNodeInsert(cursorPosition, node) {
				/* Recalculate the priorities of the inserted nodes. */
				function calcNewPrio(node, predecessorNode, successorNode) {
					let predecessorPrio
					let successorPrio
					if (predecessorNode !== null) {
						predecessorPrio = predecessorNode.data.priority
					} else predecessorPrio = Number.MAX_SAFE_INTEGER

					if (successorNode !== null) {
						successorPrio = successorNode.data.priority
					} else successorPrio = Number.MIN_SAFE_INTEGER

					const stepSize = Math.floor((predecessorPrio - successorPrio) / 2)
					return Math.floor(predecessorPrio - stepSize)
				}

				let predecessorNode
				let successorNode
				let parentId
				let level
				let ind
				let parentFollowers
				const destNodeModel = cursorPosition.nodeModel
				if (cursorPosition.placement === 'inside') {
					// insert inside a parent -> the nodes become top level children
					const destSiblings = destNodeModel.children || []
					parentId = destNodeModel._id
					level = destNodeModel.level + 1
					ind = 0
					predecessorNode = null
					successorNode = destSiblings[0] || null
				} else {
					// insert before or after the cursor position
					const destSiblings = rootState.helpersRef.getNodeSiblings(destNodeModel.path)
					parentId = destNodeModel.parentId
					level = destNodeModel.level
					ind = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
					predecessorNode = destSiblings[ind - 1] || null
					successorNode = destSiblings[ind] || null
				}
				parentFollowers = rootState.helpersRef.getNodeById(parentId).data.followers || []
				return { productId: destNodeModel.productId, parentId, level, ind, priority: calcNewPrio(node, predecessorNode, successorNode), parentFollowers }
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

				const destNodeModel = cursorPosition.nodeModel
				const productId = options && options.skipUpdateProductId ? undefined : destNodeModel.productId
				// check and correction for error: product level items must have their own id as productId; ToDo: log this event
				for (const n of nodes) {
					if (n.level === LEVEL.PRODUCT && n._id !== n.productId) {
						 
						if (rootState.debug)
							console.log(`insertNodes: Product item with id ${n._id} was assigned ${n.productId} as product id. Is corrected to be equal to the id`)
						n.product_id = n._id
					}
				}
				let predecessorNode
				let successorNode
				if (cursorPosition.placement === 'inside') {
					// insert inside a parent -> the nodes become top level children
					const destSiblings = destNodeModel.children || []
					const parentId = destNodeModel._id
					predecessorNode = null
					destSiblings.unshift(...nodes)
					successorNode = destSiblings[nodes.length] || null
					rootState.helpersRef.updatePaths(destNodeModel.path, destSiblings, 0, parentId, productId)
					// expand the parent node to show the inserted nodes
					destNodeModel.isExpanded = true
				} else {
					// insert before or after the cursor position
					const destSiblings = rootState.helpersRef.getNodeSiblings(destNodeModel.path)
					const parentId = destNodeModel.parentId
					const parentPath = destNodeModel.path.slice(0, -1)
					const insertInd = cursorPosition.placement === 'before' ? destNodeModel.ind : destNodeModel.ind + 1
					predecessorNode = destSiblings[insertInd - 1] || null
					destSiblings.splice(insertInd, 0, ...nodes)
					successorNode = destSiblings[insertInd + nodes.length] || null
					rootState.helpersRef.updatePaths(parentPath, destSiblings, insertInd, parentId, productId)
				}
				// if not excluded in options do assign new priorities
				if (!options || options.calculatePrios || options.calculatePrios === undefined) {
					assignNewPrios(nodes, predecessorNode, successorNode)
				}
				// return the inserted nodes
				return nodes
			},

			/* Remove nodes from the tree model. Return true if any node was removed */
			removeNodes(nodes) {
				let success = false
				for (const node of nodes) {
					const siblings = rootState.helpersRef.getNodeSiblings(node.path)
					if (siblings.length > 0) {
						const removeInd = node.ind
						const parentPath = node.path.slice(0, -1)
						siblings.splice(removeInd, 1)
						rootState.helpersRef.updatePaths(parentPath, siblings, removeInd)
						success = true
					}
				}
				return success
			},

			/* Set all nodes of the branch to be not selectable including the branchRoot itself */
			setBranchUnselectable(branchRoot) {
				rootState.helpersRef.traverseModels(
					(nm) => {
						nm.isSelectable = false
					},
					[branchRoot],
				)
			},
		}
	},
}

export default {
	actions,
}
