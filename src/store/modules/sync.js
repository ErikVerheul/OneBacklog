import { SEV, LEVEL, MISC } from '../../constants.js'
import { getLevelText, getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
var lastSeq = undefined
const SPECIAL_TEXT = true
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be processed again)

/*
* Listen for any changes in the user subscribed products made by other users and update the products tree view.
* - Select from the changes in documents of type 'backlogItem' the items with a history or comments array and a first entry tagged for distribution (exluding config, log and possibly others)
* - When a user starts multiple sessions each session has a different sessionId. These sessions are synced also.
* - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone.
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/

const actions = {
	processDoc({
		rootState,
		rootGetters,
		commit,
		dispatch
	}, doc) {
		function doBlinck(doc) {
			if (rootState.debug) {
				// eslint-disable-next-line no-console
				console.log(
					`listenForChanges: document with _id ${doc._id} is processed, priority = ${doc.priority}, sprintId = ${doc.sprintId}, current view = ${rootState.currentView},
				commentsEvent = ${commentsEvent}, distributed = ${lastCommentsObj.distributeEvent}, timestamp = ${String(new Date(lastCommentsTimestamp)).substring(0, 24)}, processComment = ${processComment} title = '${doc.title}',
				histEvent = ${histEvent}, distributed = ${lastHistObj.distributeEvent}, timestamp = ${String(new Date(lastHistoryTimestamp)).substring(0, 24)}, processHistory = ${processHistory}, title = '${doc.title}',
				updateTree = ${updateTree}, updateThisBoard = ${updateThisBoard}`)
			}
			rootState.eventSyncColor = '#e6f7ff'
			setTimeout(function () {
				rootState.eventSyncColor = '#004466'
			}, 1000)
		}

		function reportOddTimestamp(event, docId) {
			if (Date.now() - event.timestamp > 60000) {
				const msg = `Received event '${Object.keys(event)[0]}' from user ${event.by}. The event is dated ${new Date(event.timestamp).toString()} and older than 1 minute`
				commit('showLastEvent', { txt: msg, severity: SEV.WARNING })
				dispatch('doLog', { event: msg + ` The document id is ${docId}.`, level: SEV.WARNING })
			}
		}

		function getProductTitle(id) {
			return rootState.productTitlesMap[id]
		}

		function showSyncMessage(text, severity, specialText = false) {
			if (specialText) {
				if (isSameUserInDifferentSession) {
					commit('showLastEvent', { txt: `You ${text} in another session`, severity })
				} else commit('showLastEvent', { txt: `Another user ${text}`, severity })
			} else {
				const standardTxt = `${getLevelText(rootState.configData, doc.level, doc.subtype)} '${doc.title}' in product '${getProductTitle(doc.productId)}'`
				if (isSameUserInDifferentSession) {
					commit('showLastEvent', { txt: `You ${text} ${standardTxt} in another session`, severity })
				} else commit('showLastEvent', { txt: `Another user ${text} ${standardTxt}`, severity })
			}
		}

		function logIllegalMove(targetLevel, sourceLevel, id) {
			const msg = `sync.nodeMovedEvent: illegal move, targetLevel = ${targetLevel}, sourceLevel = ${sourceLevel}, doc._id = ${id}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		}

		/*
		* Return false if there are no affected items.
		* Return true if at least one combination of sprintId and team matches with the current board in view.
		*/
		function mustUpdateThisBoard(affectedItems) {
			if (!affectedItems) return false

			if (affectedItems.sprintsAffected && affectedItems.teamsAffected) {
				// check for a match with the current sprint and team in view
				return affectedItems.sprintsAffected.includes(rootState.loadedSprintId) && affectedItems.teamsAffected.includes(rootState.userData.myTeam)
			} else return false
		}

		function createNewNode(doc) {
			const parentNode = window.slVueTree.getNodeById(doc.parentId)
			if (parentNode === null) {
				const msg = `listenForChanges: no parent node available yet - doc.productId = ${doc.productId}, doc.parentId = ${doc.parentId}, doc._id = ${doc._id}, title = '${doc.title}'`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
				return
			}
			// create the node
			const locationInfo = getLocationInfo(doc.priority, parentNode)
			const node = {
				path: locationInfo.newPath,
				pathStr: JSON.stringify(locationInfo.newPath),
				ind: locationInfo.newInd,
				level: locationInfo.newPath.length,

				productId: doc.productId,
				parentId: doc.parentId,
				sprintId: doc.sprintId,
				_id: doc._id,
				dependencies: doc.dependencies || [],
				conditionalFor: doc.conditionalFor || [],
				title: doc.title,
				isLeaf: !((locationInfo.newPath.length < rootGetters.leafLevel)),
				children: [],
				isSelected: false,
				isExpanded: true,
				isSelectable: true,
				isDraggable: doc.level >= LEVEL.PRODUCT,
				doShow: true,
				data: {
					state: doc.state,
					sprintId: doc.sprintId,
					subtype: 0,
					priority: undefined,
					team: doc.team,
					lastPositionChange: 0,
					lastStateChange: 0,
					lastContentChange: 0,
					lastCommentAddition: 0,
					lastAttachmentAddition: 0,
					lastCommentToHistory: 0,
					lastChange: lastHistoryTimestamp
				},
				tmp: {}
			}
			window.slVueTree.insertNodes({
				nodeModel: locationInfo.prevNode,
				placement: locationInfo.newInd === 0 ? 'inside' : 'after'
			}, [node])
			// not committing any changes to the tree model. As the user has to navigate to the new node the data will be loaded.
		}

		function moveNode(node, newParentId) {
			const newParentNode = window.slVueTree.getNodeById(newParentId)
			if (newParentNode === null) return
			const item = lastHistObj.nodeMovedEvent
			const targetLevel = item[1]
			const newPriority = item[10]
			const targetSprintId = item[12]
			const moveType = item[13]
			const lastPositionChange = item[14]
			const isProductMoved = item[15]
			if (targetLevel > rootState.loadedTreeDepth) {
				// skip items that are not available in the tree
				return
			}
			if (node.level === LEVEL.PBI || node.level === LEVEL.TASK) commit('updateNodesAndCurrentDoc', { node, sprintId: targetSprintId })
			const locationInfo = getLocationInfo(newPriority, newParentNode)
			if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) !== 0) {
				// move the node to the new position w/r to its siblings; first remove the node, then insert
				window.slVueTree.removeNodes([node])
				node.data.priority = newPriority
				// do not recalculate the priority during insert
				if (locationInfo.newInd === 0) {
					window.slVueTree.insertNodes({
						nodeModel: locationInfo.prevNode,
						placement: 'inside'
					}, [node], { calculatePrios: false, skipUpdateProductId: isProductMoved })
				} else {
					// insert after prevNode
					window.slVueTree.insertNodes({
						nodeModel: locationInfo.prevNode,
						placement: 'after'
					}, [node], { calculatePrios: false, skipUpdateProductId: isProductMoved })
				}
				if (moveType === 'move') commit('updateNodesAndCurrentDoc', { node, lastPositionChange: lastHistoryTimestamp })
				if (moveType === 'undoMove') commit('updateNodesAndCurrentDoc', { node, lastPositionChange })
			}
		}

		function doProc(doc) {
			try {
				if (updateTree || updateThisBoard) doBlinck(doc)
				const node = window.slVueTree.getNodeById(doc._id)
				// note that both updateTree and updateThisBoard can be true
				if (updateTree) {
					// check for exception 'node not found'; skip the check for events that do not map to a node
					if (node === null && !(histEvent === 'createEvent' || histEvent === 'createTaskEvent' || histEvent === 'changeReqAreaColorEvent')) {
						showSyncMessage(`changed item ${doc._id} which is missing in your view`, SEV.WARNING, SPECIAL_TEXT)
						dispatch('doLog', { event: 'sync: cannot find node with id = ' + doc._id, level: SEV.WARNING })
						return
					}

					const isCurrentDocument = doc._id === rootState.currentDoc._id
					if (processComment) {
						// process the last event from the document comments array (in the tree)
						reportOddTimestamp(lastCommentsObj, doc._id)
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log('sync:update the comments with event ' + commentsEvent)
						switch (commentsEvent) {
							case 'addCommentEvent':
								node.data.lastCommentAddition = lastCommentsTimestamp
								// show the comments update
								if (isCurrentDocument) commit('updateNodesAndCurrentDoc', { node, replaceComments: doc.comments })
								showSyncMessage(`added a comment to item`, SEV.INFO)
								break
							case 'removeCommentEvent':
								node.data.lastCommentAddition = lastCommentsTimestamp
								// show the comments update
								if (isCurrentDocument) commit('updateNodesAndCurrentDoc', { node, replaceComments: doc.comments })
								showSyncMessage(`removed the last comment to item`, SEV.INFO)
								break
							default:
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log('sync.trees.comments: event not found, name = ' + commentsEvent)
						}
					}
					if (processHistory) {
						// if not a comment, process the last event from the document history array (in the tree and/or board)
						reportOddTimestamp(lastHistObj, doc._id)
						// show the history update in he currently visable document
						if (isCurrentDocument) rootState.currentDoc.history = doc.history
						// eslint-disable-next-line no-console
						if (rootState.debug) console.log('sync:update the tree with event ' + histEvent)
						// process requirement area items
						if (rootGetters.isOverviewSelected && isReqAreaItem) {
							switch (histEvent) {
								case 'changeReqAreaColorEvent':
									commit('updateColorMapper', { id: doc._id, newColor: doc.color })
									commit('updateNodesAndCurrentDoc', { node, reqAreaItemColor: doc.color })
									showSyncMessage(`changed the color indication of ${getLevelText(rootState.configData, doc.level, doc.subtype)} '${doc.title}'`, SEV.INFO, true)
									break
								case 'createEvent':
									if (node === null) {
										createNewNode(doc)
										showSyncMessage(`created`, SEV.INFO)
									}
									break
								case 'nodeMovedEvent':
									moveNode(node, doc.parentId)
									showSyncMessage(`moved`, SEV.INFO)
									break
								case 'removedWithDescendantsEvent':
									if (node) {
										// remove references from the requirement area
										const reqAreaId = lastHistObj.removedWithDescendantsEvent[0]
										window.slVueTree.traverseModels((nm) => {
											if (nm.data.reqarea === reqAreaId) {
												delete nm.data.reqarea
											}
										})
										window.slVueTree.removeNodes([node])
										showSyncMessage(`removed`, SEV.INFO)
									}
									break
								case 'setTitleEvent':
									commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the title of`, SEV.INFO)
									break
								case 'undoBranchRemovalEvent':
									// does also update the board
									dispatch('syncRestoreBranch', {
										histArray: lastHistObj.undoBranchRemovalEvent,
										restoreReqArea: true
									})
									break
							}
						} else {
							// process events for non requirement area items
							switch (histEvent) {
								case 'acceptanceEvent':
									commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: window.atob(doc.acceptanceCriteria), lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the acceptance criteria for`, SEV.INFO)
									break
								case 'addSprintIdsEvent':
									commit('updateNodesAndCurrentDoc', { node, sprintId: doc.sprintId, lastChange: doc.lastChange })
									showSyncMessage(`set the sprint for`, SEV.INFO)
									break
								case 'changeReqAreaColorEvent':
									if (rootGetters.isDetailsViewSelected) {
										commit('updateColorMapper', { id: doc._id, newColor: doc.color })
										showSyncMessage(`changed the color indication of ${getLevelText(rootState.configData, doc.level, doc.subtype)} '${doc.title}'`, SEV.INFO, true)
									}
									break
								case 'commentToHistoryEvent':
									commit('updateNodesAndCurrentDoc', { node, lastCommentToHistory: doc.lastCommentToHistory })
									showSyncMessage(`added a comment to the history of`, SEV.INFO)
									break
								case 'conditionRemovedEvent':
									commit('updateNodesAndCurrentDoc', { node, conditionsremoved: doc.conditionalFor, lastChange: doc.lastChange })
									showSyncMessage(`removed condition`, SEV.INFO)
									break
								case 'createEvent':
								case 'createTaskEvent':
									if (node === null) {
										createNewNode(doc)
										showSyncMessage(`created`, SEV.INFO)
									}
									break
								case 'dependencyRemovedEvent':
									commit('updateNodesAndCurrentDoc', { node, dependenciesRemoved: doc.dependencies, lastChange: doc.lastChange })
									showSyncMessage(`removed a condition for`, SEV.INFO)
									break
								case 'descriptionEvent':
									commit('updateNodesAndCurrentDoc', { node, description: window.atob(doc.description), lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the description of`, SEV.INFO)
									break
								case 'undoBranchRemovalEvent':
									// does also update the board
									dispatch('syncRestoreBranch', {
										histArray: lastHistObj.undoBranchRemovalEvent,
										isSameUserInDifferentSession,
										updateThisBoard,
										sprintId: rootState.loadedSprintId,
										team: rootState.userData.myTeam
									})
									break
								case 'nodeMovedEvent':
									moveNode(node, doc.parentId)
									showSyncMessage(`moved`, SEV.INFO)
									break
								case 'removeAttachmentEvent':
									commit('updateNodesAndCurrentDoc', { node, lastAttachmentAddition: doc.lastAttachmentAddition })
									showSyncMessage(`removed an attachment from`, SEV.INFO)
									break
								case 'removeCommentFromHistoryEvent':
									commit('updateNodesAndCurrentDoc', { node, replaceHistory: doc.history })
									showSyncMessage(`removed the last comment to the history of`, SEV.INFO)
									break
								case 'removedWithDescendantsEvent':
									if (node && doc.delmark) {
										// remove any dependency references to/from outside the removed items
										window.slVueTree.correctDependencies(node)
										let signOut = false
										if (node.isSelected || window.slVueTree.isDescendantNodeSelected(node)) {
											// before removal select the predecessor of the removed node (sibling or parent)
											const prevNode = window.slVueTree.getPreviousNode(node.path)
											let nowSelectedNode = prevNode
											if (prevNode.level === LEVEL.DATABASE) {
												// if a product is to be removed and the previous node is root, select the next product
												const nextProduct = window.slVueTree.getNextSibling(node.path)
												if (nextProduct === null) {
													// there is no next product
													alert('WARNING - the only product you are viewing is removed by another user! You will be signed out. Contact your administrator.')
													signOut = true
												}
												nowSelectedNode = nextProduct
											}
											commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode })
										}
										if (node.level === LEVEL.PRODUCT) {
											// remove the product from the users product roles, subscriptions and product selection array and update the user's profile
											dispatch('removeFromMyProducts', { productId: node._id, isSameUserInDifferentSession, signOut })
										}
										window.slVueTree.removeNodes([node])
										showSyncMessage(`removed the`, SEV.INFO)
									}
									break
								case 'removeSprintIdsEvent':
									commit('updateNodesAndCurrentDoc', { node, sprintId: undefined, lastChange: doc.lastChange })
									showSyncMessage(`removed the sprint for`, SEV.INFO)
									break
								case 'removeStoryEvent':
									commit('updateNodesAndCurrentDoc', { node, sprintId: undefined, lastChange: doc.lastChange })
									showSyncMessage(`unassigned the sprint from`, SEV.INFO)
									break
								case 'setConditionEvent':
									if (lastHistObj.setConditionEvent[2]) {
										// undo single addition
										commit('updateNodesAndCurrentDoc', { node, removeLastConditionalFor: null, lastChange: doc.lastChange })
										showSyncMessage(`undid a dependency setting on`, SEV.INFO)
									} else {
										const dependentOnNodeId = lastHistObj.setConditionEvent[0]
										commit('updateNodesAndCurrentDoc', { node, addConditionalFor: dependentOnNodeId, lastChange: doc.lastChange })
										showSyncMessage(`set a dependency on`, SEV.INFO)
									}
									break
								case 'setDependencyEvent':
									if (lastHistObj.setDependencyEvent[2]) {
										// undo single addition
										commit('updateNodesAndCurrentDoc', { node, removeLastDependencyOn: null, lastChange: doc.lastChange })
										showSyncMessage(`undid a condition setting for`, SEV.INFO)
									} else {
										const conditionalForNodeId = lastHistObj.setDependencyEvent[0]
										commit('updateNodesAndCurrentDoc', { node, addDependencyOn: conditionalForNodeId, lastChange: doc.lastChange })
										showSyncMessage(`set a condition for`, SEV.INFO)
									}
									break
								case 'setHrsEvent':
									commit('updateNodesAndCurrentDoc', { node, spikepersonhours: doc.spikepersonhours, lastChange: doc.lastChange })
									showSyncMessage(`changed the maximum effort of`, SEV.INFO)
									break
								case 'setPointsEvent':
									commit('updateNodesAndCurrentDoc', { node, spsize: doc.spsize, lastChange: doc.lastChange })
									showSyncMessage(`changed the story points of`, SEV.INFO)
									break
								case 'setSizeEvent':
									commit('updateNodesAndCurrentDoc', { node, tssize: doc.tssize, lastChange: doc.lastChange })
									showSyncMessage(`changed the T-shirt size of`, SEV.INFO)
									break
								case 'setStateEvent':
									commit('updateNodesAndCurrentDoc', { node, state: doc.state, lastStateChange: doc.lastStateChange })
									showSyncMessage(`changed the state of`, SEV.INFO)
									break
								case 'setSubTypeEvent':
									commit('updateNodesAndCurrentDoc', { node, subtype: doc.subtype, lastChange: doc.lastChange })
									showSyncMessage(`changed the type of`, SEV.INFO)
									break
								case 'setTeamOwnerEvent':
									commit('updateNodesAndCurrentDoc', { node, team: doc.team, lastChange: doc.lastChange })
									break
								case 'setTitleEvent':
									commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the title of`, SEV.INFO)
									break
								case 'taskRemovedEvent':
									if (rootState.lastTreeView === 'detailProduct') {
										const taskId = lastHistObj.taskRemovedEvent[3]
										const taskTitle = lastHistObj.taskRemovedEvent[0]
										const team = lastHistObj.taskRemovedEvent[1]
										// remove the node from the tree view
										const node = window.slVueTree.getNodeById(taskId)
										if (node) {
											if (node.isSelected) {
												// before removal select the predecessor of the removed node (sibling or parent)
												const prevNode = window.slVueTree.getPreviousNode(node.path)
												let nowSelectedNode = prevNode
												commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode })
											}
											window.slVueTree.removeNodes([node])
											showSyncMessage(`from team '${team}' removed task '${taskTitle}' from product '${getProductTitle(rootState, doc.productId)}'`, SEV.INFO, SPECIAL_TEXT)
										}
									}
									break
								case 'uploadAttachmentEvent':
									commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastAttachmentAddition: doc.lastAttachmentAddition })
									showSyncMessage(`uploaded an attachment to`, SEV.INFO)
									break
								case 'updateReqAreaEvent':
									dispatch('updateReqAreaInTree', lastHistObj)
									break
								//////////////////////////////// changes originating from planning board ///////////////////////////////////////////////////////
								case 'updateTaskOrderEvent':
									if (rootState.lastTreeView === 'detailProduct') {
										// update the position of the tasks of the story and update the index and priority values in the tree
										const afterMoveIds = lastHistObj.updateTaskOrderEvent.afterMoveIds
										const storyNode = window.slVueTree.getNodeById(doc._id)
										if (!storyNode) return

										const mapper = []
										for (const c of storyNode.children) {
											if (afterMoveIds.includes(c._id)) {
												mapper.push({ child: c, priority: c.data.priority, reordered: true })
											} else mapper.push({ child: c, reordered: false })
										}
										const newTreeChildren = []
										let ind = 0
										let afterMoveIdx = 0
										for (const m of mapper) {
											if (!m.reordered) {
												newTreeChildren.push(m.child)
											} else {
												for (const c of storyNode.children) {
													if (c._id === afterMoveIds[afterMoveIdx]) {
														c.ind = ind
														c.data.priority = m.priority
														newTreeChildren.push(c)
														afterMoveIdx++
														break
													}
												}
											}
											ind++
										}
										storyNode.children = newTreeChildren
									}
									showSyncMessage(`changed the priority of`, SEV.INFO)
									break
								case 'updateTaskOwnerEvent':
									commit('updateNodesAndCurrentDoc', { node, taskOwner: doc.taskOwner, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the task owner of`, SEV.INFO)
									break
								default:
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('sync.trees: event not found, name = ' + histEvent)
							}
						}
					}
				}

				if (updateThisBoard) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('sync:update the board with event ' + histEvent)
					reportOddTimestamp(lastHistObj, doc._id)

					// process events for the planning board
					switch (histEvent) {
						case 'addItemsToSprintEvent':
							{
								const newPBI = lastHistObj.addItemsToSprintEvent[0]
								if (newPBI) commit('addEmptyStoryToBoard', newPBI)
								const newTasks = lastHistObj.addItemsToSprintEvent[1]
								for (const t of newTasks) {
									commit('addTaskToBoard', t)
								}
							}
							break
						case 'boardReloadEvent':
							// this event is passed via the 'messenger' dummy backlogitem, the sprintId and the team name are in the message not in the doc
							{
								const sprintId = lastHistObj.boardReloadEvent[0]
								const team = lastHistObj.boardReloadEvent[1]
								if (sprintId === rootState.loadedSprintId && team === rootState.userData.myTeam) {
									dispatch('loadPlanningBoard', { sprintId, team: rootState.userData.myTeam })
								}
							}
							break
						case 'createEvent':
						case 'createTaskEvent':
							if (doc.level === LEVEL.PBI) {
								// a new story is created on another user's product details view
								commit('addEmptyStoryToBoard', doc)
							}
							if (doc.level === LEVEL.TASK) {
								// a new task is created on another user's product details view or board
								commit('addTaskToBoard', doc)
							}
							break
						case 'undoBranchRemovalEvent':
							// is handled in 'processHistory'
							break
						case 'nodeMovedEvent':
							// process moves initiated from the details view
							{
								const item = lastHistObj.nodeMovedEvent
								const sourceLevel = item[0]
								const targetLevel = item[1]
								const sourceParentId = item[7]
								const targetParentId = item[8]
								const newlyCalculatedPriority = item[10]
								const sourceSprintId = item[11]
								const targetSprintId = item[12]
								const moveToOtherProduct = item[15]
								if (moveToOtherProduct) {
									dispatch('renewPlanningBoard')
								} else
								switch (targetLevel) {
									case LEVEL.TASK:
										switch (sourceLevel) {
											case LEVEL.TASK:
												// a task is positioned on or away from the current board
												if (targetSprintId !== rootState.loadedSprintId) {
													// task is moved to another sprint or to no sprint
													commit('removeTaskFromBoard', { storyId: sourceParentId, taskId: doc._id, taskState: doc.state })
													break
												}
												if (sourceSprintId !== rootState.loadedSprintId) {
													// task is moved into the loaded sprint
													commit('addTaskToBoard', doc)
													break
												}
												if (targetSprintId === rootState.loadedSprintId && sourceSprintId === rootState.loadedSprintId) {
													// task is moved within the loaded sprint
													if (sourceParentId === targetParentId && sourceLevel === LEVEL.TASK) {
														// task is moved within a story
														commit('moveTaskWithinStory', { targetParentId, doc, newlyCalculatedPriority })
													}
													if (sourceParentId !== targetParentId) {
														// task is moved between stories
														commit('removeTaskFromBoard', { storyId: sourceParentId, taskId: doc._id, taskState: doc.state })
														commit('addTaskToBoard', doc)
													}
												}
												break
											case LEVEL.PBI:
												// a PBI is demoted to a task
												commit('removeStoryFromBoard', doc._id)
												commit('addTaskToBoard', doc)
												break
											default:
												logIllegalMove(targetLevel, sourceLevel, doc._id)
										}
										break
									case LEVEL.PBI:
										switch (sourceLevel) {
											case LEVEL.TASK:
												// a task is promoted to a PBI
												commit('removeTaskFromBoard', { storyId: sourceParentId, taskId: doc._id, taskState: doc.state })
												commit('addEmptyStoryToBoard', doc)
												break
											case LEVEL.PBI:
											case LEVEL.FEATURE:
												// case LEVEL.PBI: a PBI is moved within the board ||
												// case LEVEL.FEATURE: a FEATURE is demoted to a PBI
												dispatch('renewPlanningBoard')
												break
											default:
												logIllegalMove(targetLevel, sourceLevel, doc._id)
										}
										break
									case LEVEL.FEATURE:
									case LEVEL.EPIC:
									case LEVEL.PRODUCT:
										// case LEVEL.FEATURE: a PBI is promoted to a feature || a FEATURE is moved within the board || an EPIC is demoted to a FEATURE ||
										// case LEVEL.EPIC: a FEATURE is promoted to an EPIC || an EPIC is is moved within the board ||
										// case LEVEL.PRODUCT: a PRODUCT is moved within the board
										dispatch('renewPlanningBoard')
										break
									default:
										logIllegalMove(targetLevel, sourceLevel, doc._id)
								}
							}
							break
						case 'removeStoryEvent':
							{
								const removedSprintId = lastHistObj.removeStoryEvent[3]
								if (removedSprintId === rootState.loadedSprintId) {
									dispatch('syncRemoveItemsFromBoard', { doc, removedSprintId: removedSprintId })
								}
							}
							break
						case 'removedWithDescendantsEvent':
							{
								const delmark = lastHistObj.removedWithDescendantsEvent[5]
								// the item and its descendants are removed, so no longer assigned to any sprint and must be removed from the board. ('*' = all sprints)
								dispatch('syncRemoveItemsFromBoard', { doc, removedSprintId: '*', delmark })
							}
							break
						case 'removeItemsFromSprintEvent':
							{
								const storyIdToRemove = lastHistObj.removeItemsFromSprintEvent[0]
								if (storyIdToRemove) commit('removeStoryFromBoard', storyIdToRemove)
								const tasksToRemove = lastHistObj.removeItemsFromSprintEvent[1]
								for (const t of tasksToRemove) {
									commit('removeTaskFromBoard', t)
								}
							}
							break
						case 'setHrsEvent':
							if (doc.level === LEVEL.PBI) {
								for (const s of rootState.planningboard.stories) {
									if (s.storyId === doc._id) {
										s.spikePersonHours = doc.spikepersonhours
										break
									}
								}
							}
							break
						case 'setPointsEvent':
							if (doc.level === LEVEL.PBI) {
								for (const s of rootState.planningboard.stories) {
									if (s.storyId === doc._id) {
										s.size = doc.spsize
										break
									}
								}
							}
							break
						case 'setStateEvent':
							if (doc.level === LEVEL.TASK) {
								const prevState = lastHistObj.setStateEvent[0]
								const newTaskPosition = lastHistObj.setStateEvent[3]
								for (const s of rootState.planningboard.stories) {
									if (s.storyId === doc.parentId) {
										const sourceColumn = s.tasks[prevState]
										const targetColumn = s.tasks[doc.state]
										let movedTask
										const newSourceColumn = []
										for (const t of sourceColumn) {
											if (t.id === doc._id) {
												movedTask = t
											} else newSourceColumn.push(t)
										}
										if (movedTask) {
											s.tasks[prevState] = newSourceColumn
											if (newTaskPosition !== 0) {
												targetColumn.splice(newTaskPosition, 0, movedTask)
											} else targetColumn.unshift(movedTask)
										}
										break
									}
								}
							}
							break
						case 'setSubTypeEvent':
							if (doc.level === LEVEL.PBI) {
								for (const s of rootState.planningboard.stories) {
									if (s.storyId === doc._id) {
										s.subType = doc.subtype
										break
									}
								}
							}
							break
						case 'setTeamOwnerEvent':
							// a user assigned items to his team, remove them from my team
							dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
							break
						case 'setTitleEvent':
							switch (doc.level) {
								case LEVEL.PBI:
									for (const s of rootState.planningboard.stories) {
										if (s.storyId === doc._id) {
											s.title = doc.title
											break
										}
									}
									break
								case LEVEL.TASK:
									for (const s of rootState.planningboard.stories) {
										if (s.storyId === doc.parentId) {
											const tasks = s.tasks
											const targetColumn = tasks[doc.state]
											for (const t of targetColumn) {
												if (t.id === doc._id) {
													t.title = doc.title
													break
												}
											}
											break
										}
									}
									break
							}
							break
						case 'taskRemovedEvent':
							{
								const storyId = lastHistObj.taskRemovedEvent[2]
								const taskId = lastHistObj.taskRemovedEvent[3]
								const taskState = lastHistObj.taskRemovedEvent[4]
								commit('removeTaskFromBoard', { storyId, taskId, taskState })
							}
							break
						case 'updateTaskOrderEvent':
							{
								const taskUpdates = lastHistObj.updateTaskOrderEvent.taskUpdates
								rootState.planningboard.stories[taskUpdates.idx].tasks[taskUpdates.taskState] = taskUpdates.tasks
							}
							break
						case 'updateTaskOwnerEvent':
							for (const s of rootState.planningboard.stories) {
								if (s.storyId === doc.parentId) {
									const tasks = s.tasks
									const targetColumn = tasks[doc.state]
									for (const t of targetColumn) {
										if (t.id === doc._id) {
											t.taskOwner = doc.taskOwner
											break
										}
									}
									break
								}
							}
							break
						default:
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log('sync.planningBoard: event not found, name = ' + histEvent)
					}
				}
			} catch (error) {
				const msg = `Listening for changes made by other users failed while processing document with id ${doc._id}, ${error}`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
			}
		}

		const lastCommentsObj = doc.comments[0]
		const lastCommentsTimestamp = lastCommentsObj.timestamp
		const commentsEvent = Object.keys(lastCommentsObj)[0]

		const lastHistObj = doc.history[0]
		// console.log('sync: lastHistObj = ' + JSON.stringify(lastHistObj, null, 2))
		const lastHistoryTimestamp = lastHistObj.timestamp
		const histEvent = Object.keys(lastHistObj)[0]

		// process the last comment event if not to be ignored and distributed and newer than the last history event
		const processComment = commentsEvent !== 'ignoreEvent' && lastCommentsObj.distributeEvent && lastCommentsTimestamp > lastHistoryTimestamp
		// process the last history event if not to be ignored and distributed and newer or of the same date (giving precedence to the history event) as the last comment event
		const processHistory = histEvent !== 'ignoreEvent' && lastHistObj.distributeEvent && lastHistoryTimestamp >= lastCommentsTimestamp
		if (!processComment && !processHistory) {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('sync: nothing to process for commentsEvent = ' + commentsEvent + ' and histEvent = ' + histEvent + ', doc.title = ' + doc.title)
			return
		}

		const isSameUserInDifferentSession = processComment ? lastCommentsObj.by === rootState.userData.user : lastHistObj.by === rootState.userData.user
		const isReqAreaItem = doc.productId === MISC.AREA_PRODUCTID
		// update the tree only for documents available in the currently loaded tree model (eg. 'products overview' has no pbi and task items)
		const updateTree = doc.level <= rootState.loadedTreeDepth && histEvent !== 'boardReloadEvent'
		// update the board if the event changes the current view (sprintId and team) effecting any PBIs and/or tasks
		const updateThisBoard = mustUpdateThisBoard(lastHistObj.updateBoards)
		// process the event if the user is subscribed for the event's product, or it's a changeReqAreaColorEvent, or to restore removed products, or the item is a requirement area item while the overview is in view
		if (rootGetters.getMyProductSubscriptions.includes(doc.productId) ||
			histEvent === 'changeReqAreaColorEvent' || (histEvent === 'undoBranchRemovalEvent' && doc.level === LEVEL.DATABASE) || (rootGetters.isOverviewSelected && isReqAreaItem)) doProc(doc)
	},

	/* Listen for document changes. The timeout, if no changes are available, is 60 seconds (default maximum) */
	listenForChanges({
		rootState,
		dispatch,
		commit
	}) {
		// stop listening if not online or authenticated. sync will start it again
		if (!rootState.online || !rootState.authentication.cookieAuthenticated) return

		rootState.listenForChangesRunning = true
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_changes?filter=filters/sync_filter&feed=longpoll&include_docs=true&since=now'
		}).then(res => {
			// note that, when no data are received, receiving a response can last up to 60 seconds (time-out)
			dispatch('listenForChanges')
			const data = res.data
			if (data.results.length > 0) {
				// only process events with included documents
				for (const r of data.results) {
					// skip consecutive changes with the same sequence number (Couchdb bug?)
					if (r.seq === lastSeq) break

					lastSeq = r.seq
					const doc = r.doc
					// console.log('listenForChanges: doc = ' + JSON.stringify(doc, null, 2))
					const isLastCommentNewer = doc.comments[0].timestamp > doc.history[0].timestamp
					if (
						// compare with the session id of the most recent distributed comments or history event
						doc.comments[0].distributeEvent && isLastCommentNewer && doc.comments[0].sessionId !== rootState.mySessionId ||
						doc.history[0].distributeEvent && !isLastCommentNewer && doc.history[0].sessionId !== rootState.mySessionId
					) {
						// process either a comments or a history event on backlog items received from other sessions (not the session that created the event)
						dispatch('processDoc', doc)
					}
				}
			}
		}).catch(error => {
			rootState.listenForChangesRunning = false
			if (error.response && error.response.status === 404) {
				// database not found; cannot log; possible cause is that the server admin is restoring the current database
				commit('endSession')
				return
			}
			if (error.message === 'Request aborted') {
				// the user typed F5 or Ctrl-F5
				commit('endSession')
			} else {
				if (error.response && error.response.status === 401) rootState.authentication.cookieAuthenticated = false
				if (error.message === 'Network error') rootState.online = false
				const msg = `Listening for changes made by other users failed. ${error}`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
			}
		})
	}
}

export default {
	actions
}
