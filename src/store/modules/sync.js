import { SEV, LEVEL, MISC } from '../../constants.js'
import { getLocationInfo, localTimeAndMilis, pathToJSON, prepareDocForPresentation, startMsgSquareBlink } from '../../common_functions.js'
import globalAxios from 'axios'
var lastSeq = undefined

// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be processed again)

/*
 * Listen for any changes in the user subscribed products made by other users and update the products tree view.
 * - Select from the changes in documents of type 'backlogItem' the items with a history and a first entry tagged for distribution (exluding config, log and possibly others)
 * - When a user starts multiple sessions each session has a different sessionId. These sessions are synced also.
 * - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone.
 * After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
 */

const actions = {
	processDoc({ rootState, rootGetters, commit, dispatch }, doc) {
		function doBlinck(doc) {
			if (rootState.debug) {
				console.log(
					`listenforChanges @${localTimeAndMilis(new Date())}` +
						`\ndocument with _id ${doc._id} is processed` +
						`\ncurrent view = ${rootState.currentView}` +
						`\nhistEvent = ${histEvent}` +
						`\ntimestamp = ${String(new Date(lastHistoryTimestamp)).substring(0, 24)}` +
						`\nitem level = ${rootState.helpersRef.getLevelText(doc.level, doc.subtype)}` +
						`\ntitle = '${doc.title}'` +
						`\nupdateThisBoard = ${updateThisBoard}` +
						`\nsprintId = ${doc.sprintId}`,
				)
			}
			rootState.nowSyncing = true
			setTimeout(() => {
				rootState.nowSyncing = false
			}, 1000)
		}

		function reportOddTimestamp(event, docId) {
			if (Date.now() - event.timestamp > 60000) {
				const msg = `Received event '${Object.keys(event)[0]}' from user ${event.by}. The event is dated ${new Date(event.timestamp).toString()} and older than 1 minute.`
				commit('addToEventList', { txt: msg, severity: SEV.WARNING })
				dispatch('doLog', { event: msg + ` The document id is ${docId}.`, level: SEV.WARNING })
			}
		}

		function getProductTitle(id) {
			return rootState.productTitlesMap[id]
		}

		function showSyncMessage(text, severity, specialText = false) {
			if (specialText) {
				if (isSameUserInDifferentSession) {
					commit('addToEventList', { txt: `You ${text} in another session`, severity })
				} else commit('addToEventList', { txt: `Another user ${text}`, severity })
			} else {
				const standardTxt = `${rootState.helpersRef.getLevelText(doc.level, doc.subtype)} '${doc.title}' in product '${getProductTitle(doc.productId)}'`
				if (isSameUserInDifferentSession) {
					commit('addToEventList', { txt: `You ${text} ${standardTxt} in another session`, severity })
				} else commit('addToEventList', { txt: `Another user ${text} ${standardTxt}`, severity })
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
			if (rootState.currentView !== 'planningBoard' || !affectedItems) return false

			if (affectedItems.sprintsAffected === undefined && affectedItems.teamsAffected) {
				// check for a match with the current team in view
				return affectedItems.teamsAffected.includes(rootState.userData.myTeam)
			}

			if (affectedItems.sprintsAffected && affectedItems.teamsAffected) {
				// check for a match with the current sprint and team in view
				return affectedItems.sprintsAffected.includes(rootState.loadedSprintId) && affectedItems.teamsAffected.includes(rootState.userData.myTeam)
			} else return false
		}

		function createNewNode(doc) {
			const parentNode = rootState.helpersRef.getNodeById(doc.parentId)
			if (parentNode === null) {
				const msg = `listenForChanges: no parent node available yet - doc.productId = ${doc.productId}, doc.parentId = ${doc.parentId}, doc._id = ${doc._id}, title = '${doc.title}'`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
				return
			}
			// create the node
			const locationInfo = getLocationInfo(doc.priority, parentNode)
			const node = {
				path: locationInfo.newPath,
				pathStr: pathToJSON(locationInfo.newPath),
				ind: locationInfo.newInd,
				level: locationInfo.newPath.length,

				productId: doc.productId,
				parentId: doc.parentId,
				sprintId: doc.sprintId,
				_id: doc._id,
				dependencies: doc.dependencies || [],
				conditionalFor: doc.conditionalFor || [],
				title: doc.title,
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
					lastAttachmentRemoval: 0,
					lastOtherChange: lastHistoryTimestamp,
				},
				tmp: {},
			}
			rootState.helpersRef.insertNodes(
				{
					nodeModel: locationInfo.prevNode,
					placement: locationInfo.newInd === 0 ? 'inside' : 'after',
				},
				[node],
				{ createNew: true },
			)
			// not committing any changes to the tree model. As the user has to navigate to the new node the data will be loaded.
		}

		function moveNode(node, newParentId) {
			const newParentNode = rootState.helpersRef.getNodeById(newParentId)
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
			if (node.level === LEVEL.US || node.level === LEVEL.TASK) commit('updateNodewithDocChange', { node, sprintId: targetSprintId, lastOtherChange: Date.now() })
			const locationInfo = getLocationInfo(newPriority, newParentNode)
			if (rootState.helpersRef.comparePaths(locationInfo.newPath, node.path) !== 0) {
				// move the node to the new position w/r to its siblings; first remove the node, then insert
				rootState.helpersRef.removeNodes([node])
				node.data.priority = newPriority
				// do not recalculate the priority during insert
				if (locationInfo.newInd === 0) {
					rootState.helpersRef.insertNodes(
						{
							nodeModel: locationInfo.prevNode,
							placement: 'inside',
						},
						[node],
						{ calculatePrios: false, skipUpdateProductId: isProductMoved },
					)
				} else {
					// insert after prevNode
					rootState.helpersRef.insertNodes(
						{
							nodeModel: locationInfo.prevNode,
							placement: 'after',
						},
						[node],
						{ calculatePrios: false, skipUpdateProductId: isProductMoved },
					)
				}
				if (moveType === 'move') commit('updateNodewithDocChange', { node, lastPositionChange: lastHistoryTimestamp })
				if (moveType === 'undoMove') commit('updateNodewithDocChange', { node, lastPositionChange })
			}
		}

		function doProc(doc) {
			try {
				doBlinck(doc)
				let node
				if (
					// events passed via the 'messenger' dummy backlogitem have no associated node
					doc._id === 'messenger' ||
					// these events do not map to a node
					histEvent === 'addItemsToSprintEvent' ||
					histEvent === 'boardReloadEvent' ||
					histEvent === 'createItemEvent' ||
					histEvent === 'createTaskEvent' ||
					histEvent === 'changeReqAreaColorEvent' ||
					histEvent === 'messageReceivedEvent' ||
					histEvent === 'messageReplacedEvent' ||
					histEvent === 'removeItemsFromSprintEvent' ||
					histEvent === 'teamChangeEvent'
				) {
					node = null
				} else {
					// all other events should map to a node
					node = rootState.helpersRef.getNodeById(doc._id)
					// check for exception 'node not found'
					if (node === null) {
						showSyncMessage(`changed item ${doc._id} which is missing in your view`, SEV.WARNING, MISC.SPECIAL_TEXT)
						dispatch('doLog', { event: `sync: event ${histEvent} cannot find node with id = ${doc._id}`, level: SEV.WARNING })
						return
					}
				}

				reportOddTimestamp(lastHistObj, doc._id)
				if (doc._id === rootState.currentDoc._id) {
					// set default team and decode text fields
					rootState.currentDoc = prepareDocForPresentation(doc)
				}
				if (rootState.debug) console.log('sync:update the tree with event ' + histEvent)
				// process requirement area items
				if (isReqAreaItem) {
					switch (histEvent) {
						case 'changeReqAreaColorEvent':
							commit('updateColorMapper', { id: doc._id, newColor: doc.color })
							commit('updateNodewithDocChange', { node, reqAreaItemColor: doc.color })
							showSyncMessage(`changed the color indication of ${rootState.helpersRef.getLevelText(doc.level, doc.subtype)} '${doc.title}'`, SEV.INFO, true)
							break
						case 'createItemEvent':
							if (node === null) {
								createNewNode(doc)
								showSyncMessage(`created`, SEV.INFO)
							}
							break
						case 'descriptionEvent':
							commit('updateNodewithDocChange', { lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the description of`, SEV.INFO)
							break
						case 'nodeMovedEvent':
							moveNode(node, doc.parentId)
							showSyncMessage(`moved`, SEV.INFO)
							break
						case 'removedWithDescendantsEvent':
							if (node) {
								// remove references from the requirement area
								const reqAreaId = lastHistObj.removedWithDescendantsEvent[0]
								rootState.helpersRef.traverseModels((nm) => {
									if (nm.data.reqarea === reqAreaId) {
										delete nm.data.reqarea
									}
								})
								rootState.helpersRef.removeNodes([node])
								showSyncMessage(`removed`, SEV.INFO)
							}
							break
						case 'setTitleEvent':
							commit('updateNodewithDocChange', { node, title: doc.title, lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the title of`, SEV.INFO)
							break
						case 'undoBranchRemovalEvent':
							// does also update the board
							dispatch('syncRestoreBranch', {
								histArray: lastHistObj.undoBranchRemovalEvent,
								restoreReqArea: true,
							})
							break
					}
				} else {
					// process events for non requirement area items
					switch (histEvent) {
						case 'acceptanceEvent':
							commit('updateNodewithDocChange', { node, lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the acceptance criteria for`, SEV.INFO)
							break
						case 'addSprintIdsEvent':
							commit('updateNodewithDocChange', { node, sprintId: doc.sprintId, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`set the sprint for`, SEV.INFO)
							break
						case 'allItemsAreMoved':
							// check for created or resolved dependency violations; show a dedicated message if found
							if (rootState.helpersRef.checkDepencyViolations(false)) {
								commit('addToEventList', {
									txt: 'This move created a dependency violation. Wait for the creator to fix it or undo the move or remove the dependency',
									severity: SEV.WARNING,
								})
							}
							break
						case 'changeReqAreaColorEvent':
							commit('updateColorMapper', { id: doc._id, newColor: doc.color })
							showSyncMessage(`changed the color indication of ${rootState.helpersRef.getLevelText(doc.level, doc.subtype)} '${doc.title}'`, SEV.INFO, true)
							break
						case 'commentAmendedEvent':
							node.data.lastCommentAddition = doc.comments[0].timestamp
							showSyncMessage(`changed a comment to item`, SEV.INFO)
							break
						case 'conditionRemovedEvent':
							commit('updateNodewithDocChange', { node, conditionsremoved: doc.conditionalFor, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`removed condition`, SEV.INFO)
							break
						case 'createItemEvent':
						case 'createTaskEvent':
							if (node === null) {
								createNewNode(doc)
								showSyncMessage(`created`, SEV.INFO)
							}
							break
						case 'dependencyRemovedEvent':
							commit('updateNodewithDocChange', { node, dependenciesRemoved: doc.dependencies, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`removed a condition for`, SEV.INFO)
							break
						case 'descriptionEvent':
							commit('updateNodewithDocChange', { node, lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the description of`, SEV.INFO)
							break
						case 'itemToNewTeamEvent': {
							const team = lastHistObj.itemToNewTeamEvent[0]
							commit('updateNodewithDocChange', { node, team })
							break
						}
						case 'newCommentEvent':
							node.data.lastCommentAddition = doc.comments[0].timestamp
							showSyncMessage(`added a comment to item`, SEV.INFO)
							break
						case 'messageReceivedEvent':
							startMsgSquareBlink(rootState)
							// load new messages
							dispatch('getMyTeamMessagesAction')
							break
						case 'messageReplacedEvent':
							startMsgSquareBlink(rootState)
							// load updated messages
							dispatch('getMyTeamMessagesAction')
							break
						case 'newChildEvent':
							// do nothing
							break
						case 'nodeMovedEvent':
							moveNode(node, doc.parentId)
							showSyncMessage(`moved`, SEV.INFO)
							break
						case 'removeAttachmentEvent':
							commit('updateNodewithDocChange', { node, lastAttachmentRemoval: doc.lastAttachmentRemoval })
							showSyncMessage(`removed an attachment from`, SEV.INFO)
							break
						case 'removedWithDescendantsEvent':
							if (node && doc.delmark) {
								// remove any dependency references to/from outside the removed items
								rootState.helpersRef.correctDependencies(node)
								let doSignOut = false
								if (node.isSelected || rootState.helpersRef.isDescendantNodeSelected(node)) {
									// before removal select the predecessor of the removed node (sibling or parent)
									const prevNode = rootState.helpersRef.getPreviousNode(node.path)
									let nowSelectedNode = prevNode
									if (prevNode.level === LEVEL.DATABASE) {
										// if a product is to be removed and the previous node is root, select the next product
										const nextProduct = rootState.helpersRef.getNextSibling(node.path)
										if (nextProduct === null) {
											// there is no next product
											alert('WARNING - the only product you are viewing is removed by another user! You will be signed out. Contact your administrator.')
											doSignOut = true
										}
										nowSelectedNode = nextProduct
									}
									commit('renewSelectedNodes', nowSelectedNode)
									// load the new selected item
									dispatch('loadDoc', { id: nowSelectedNode._id })
								}
								if (node.level === LEVEL.PRODUCT) {
									// remove the product from the users product roles, subscriptions and product selection array and update the user's profile
									dispatch('removeFromMyProducts', { productId: node._id, isSameUserInDifferentSession, doSignOut })
								}
								rootState.helpersRef.removeNodes([node])
								showSyncMessage(`removed the`, SEV.INFO)
							}
							break
						case 'removeSprintIdsEvent':
							commit('updateNodewithDocChange', { node, sprintId: undefined, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`removed the sprint for`, SEV.INFO)
							break
						case 'removeStoryEvent':
							commit('updateNodewithDocChange', { node, sprintId: undefined, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`unassigned the sprint from`, SEV.INFO)
							break
						case 'setConditionEvent':
							if (lastHistObj.setConditionEvent[2]) {
								// undo single addition
								commit('updateNodewithDocChange', { node, removeLastConditionalFor: null, lastOtherChange: doc.lastOtherChange })
								showSyncMessage(`undid a dependency setting on`, SEV.INFO)
							} else {
								const dependentOnNodeId = lastHistObj.setConditionEvent[0]
								commit('updateNodewithDocChange', { node, addConditionalFor: dependentOnNodeId, lastOtherChange: doc.lastOtherChange })
								showSyncMessage(`set a dependency on`, SEV.INFO)
							}
							break
						case 'setDependencyEvent':
							if (lastHistObj.setDependencyEvent[2]) {
								// undo single addition
								commit('updateNodewithDocChange', { node, removeLastDependencyOn: null, lastOtherChange: doc.lastOtherChange })
								showSyncMessage(`undid a condition setting for`, SEV.INFO)
							} else {
								const conditionalForNodeId = lastHistObj.setDependencyEvent[0]
								commit('updateNodewithDocChange', { node, addDependencyOn: conditionalForNodeId, lastOtherChange: doc.lastOtherChange })
								showSyncMessage(`set a condition for`, SEV.INFO)
							}
							break
						case 'setHrsEvent':
							commit('updateNodewithDocChange', { node, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`changed the maximum effort of`, SEV.INFO)
							break
						case 'setPointsEvent':
							commit('updateNodewithDocChange', { node, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`changed the story points of`, SEV.INFO)
							break
						case 'setSizeEvent':
							commit('updateNodewithDocChange', { node, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`changed the T-shirt size of`, SEV.INFO)
							break
						case 'setStateEvent':
							commit('updateNodewithDocChange', { node, state: doc.state, lastStateChange: doc.lastStateChange })
							showSyncMessage(`changed the state of`, SEV.INFO)
							break
						case 'setSubTypeEvent':
							commit('updateNodewithDocChange', { node, subtype: doc.subtype, lastOtherChange: doc.lastOtherChange })
							showSyncMessage(`changed the type of`, SEV.INFO)
							break
						case 'setTeamOwnerEvent':
							commit('updateNodewithDocChange', { node, team: doc.team, lastOtherChange: doc.lastOtherChange })
							break
						case 'setTitleEvent':
							commit('updateNodewithDocChange', { node, title: doc.title, lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the title of`, SEV.INFO)
							break
						case 'taskRemovedEvent':
							{
								const taskId = lastHistObj.taskRemovedEvent[3]
								const taskTitle = lastHistObj.taskRemovedEvent[0]
								const team = lastHistObj.taskRemovedEvent[1]
								// remove the node from the tree view
								const node = rootState.helpersRef.getNodeById(taskId)
								if (node) {
									if (node.isSelected) {
										// before removal select the predecessor of the removed node (sibling or parent)
										const prevNode = rootState.helpersRef.getPreviousNode(node.path)
										let nowSelectedNode = prevNode
										commit('renewSelectedNodes', nowSelectedNode)
									}
									rootState.helpersRef.removeNodes([node])
									showSyncMessage(`from team '${team}' removed task '${taskTitle}' from product '${getProductTitle(rootState, doc.productId)}'`, SEV.INFO, MISC.SPECIAL_TEXT)
								}
							}
							break
						case 'teamChangeEvent': {
							const newTeam = lastHistObj.teamChangeEvent[1]
							rootState.userData.myTeam = newTeam
							break
						}
						case 'undoBranchRemovalEvent':
							// does also update the board
							dispatch('syncRestoreBranch', {
								histArray: lastHistObj.undoBranchRemovalEvent,
								isSameUserInDifferentSession,
								updateThisBoard,
								sprintId: rootState.loadedSprintId,
								team: rootState.userData.myTeam,
							})
							break
						case 'uploadAttachmentEvent':
							commit('updateNodewithDocChange', { node, title: doc.title, lastAttachmentAddition: doc.lastAttachmentAddition })
							showSyncMessage(`uploaded an attachment to`, SEV.INFO)
							break
						case 'updateReqAreaEvent':
							dispatch('updateReqAreaInTree', lastHistObj)
							break
						//////////////////////////////// changes originating from planning board ///////////////////////////////////////////////////////
						case 'updateTaskOrderEvent':
							// update the position of the tasks of the story and update the index and priority values in the tree
							{
								const afterMoveIds = lastHistObj.updateTaskOrderEvent.afterMoveIds
								const storyNode = rootState.helpersRef.getNodeById(doc._id)
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
								showSyncMessage(`changed the priority of`, SEV.INFO)
							}
							break
						case 'updateTaskOwnerEvent':
							commit('updateNodewithDocChange', { node, taskOwner: doc.taskOwner, lastContentChange: doc.lastContentChange })
							showSyncMessage(`changed the task owner of`, SEV.INFO)
							break
						default:
							if (rootState.debug) console.log('sync.treeview: event not found, name = ' + histEvent)
					}
				}

				if (updateThisBoard) {
					if (rootState.debug) console.log('sync:update the board with event ' + histEvent)
					reportOddTimestamp(lastHistObj, doc._id)

					// process events for the planning board
					switch (histEvent) {
						case 'addItemsToSprintEvent':
							{
								const newUS = lastHistObj.addItemsToSprintEvent[0]
								if (newUS) dispatch('addStoryToBoard', newUS)
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
						case 'createItemEvent':
						case 'createTaskEvent':
							if (doc.level === LEVEL.US) {
								// a new story is created on another user's Backlog tree view
								dispatch('addStoryToBoard', doc)
							}
							if (doc.level === LEVEL.TASK) {
								// a new task is created on another user's Backlog tree view or board
								commit('addTaskToBoard', doc)
							}
							break
						case 'undoBranchRemovalEvent':
							break
						case 'nodeMovedEvent':
							{
								const item = lastHistObj.nodeMovedEvent
								const sourceLevel = item[0]
								const targetLevel = item[1]
								const sourceParentId = item[7]
								const targetParentId = item[8]
								const newlyCalculatedPriority = item[10]
								const sourceSprintId = item[11]
								const targetSprintId = item[12]
								const moveProduct = item[15]
								if (!moveProduct)
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
												case LEVEL.US:
													// a user story is demoted to a task
													commit('removeStoryFromBoard', doc._id)
													commit('addTaskToBoard', doc)
													break
												default:
													logIllegalMove(targetLevel, sourceLevel, doc._id)
											}
											break
										case LEVEL.US:
											switch (sourceLevel) {
												case LEVEL.TASK:
													// a task is promoted to a user story
													commit('removeTaskFromBoard', { storyId: sourceParentId, taskId: doc._id, taskState: doc.state })
													dispatch('addStoryToBoard', doc)
													break
												case LEVEL.US:
												case LEVEL.FEATURE:
													// case LEVEL.US: a user story is moved within the board ||
													// case LEVEL.FEATURE: a FEATURE is demoted to a user story
													dispatch('renewPlanningBoard')
													break
												default:
													logIllegalMove(targetLevel, sourceLevel, doc._id)
											}
											break
										case LEVEL.FEATURE:
										case LEVEL.EPIC:
										case LEVEL.PRODUCT:
											// case LEVEL.FEATURE: a user story is promoted to a feature || a FEATURE is moved within the board || an EPIC is demoted to a FEATURE ||
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
						case 'removedWithDescendantsEvent': {
							const delmark = lastHistObj.removedWithDescendantsEvent[5]
							// the item and its descendants are removed, so no longer assigned to any sprint and must be removed from the board. ('*' = all sprints)
							dispatch('syncRemoveItemsFromBoard', { doc, removedSprintId: '*', delmark })
							break
						}
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
							if (doc.level === LEVEL.US) {
								for (const s of rootState.planningboard.stories) {
									if (s.storyId === doc._id) {
										s.spikePersonHours = doc.spikepersonhours
										break
									}
								}
							}
							break
						case 'setPointsEvent':
							if (doc.level === LEVEL.US) {
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
							if (doc.level === LEVEL.US) {
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
							dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam, caller: 'sync.setTeamOwnerEvent' })
							break
						case 'setTitleEvent':
							switch (doc.level) {
								case LEVEL.US:
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
						case 'teamChangeEvent': {
							// this event is passed via the 'messenger' dummy backlogitem, the new team name is in the message, not in the doc
							const newTeam = lastHistObj.teamChangeEvent[1]
							rootState.userData.myTeam = newTeam
							break
						}
						case 'updateMovedItemParentEvent':
							dispatch('renewPlanningBoard')
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
							if (rootState.debug) console.log('sync.planningBoard: event not found, name = ' + histEvent)
					}
				}
			} catch (error) {
				const msg = `Listening for changes made by other users failed while processing document with id ${doc._id}, ${error}`
				dispatch('doLog', { event: msg, level: SEV.WARNING })
			}
		}

		const lastHistObj = doc.history[0]
		const lastHistoryTimestamp = lastHistObj.timestamp
		const histEvent = Object.keys(lastHistObj)[0]
		const isSameUserInDifferentSession = lastHistObj.by === rootState.userData.user
		const isReqAreaItem = doc.productId === MISC.AREA_PRODUCTID
		// update the board if the event changes the current view (sprintId and team) effecting any user stories and/or tasks
		const updateThisBoard = mustUpdateThisBoard(lastHistObj.updateBoards)

		/*
		 * Process the event if the user is subscribed for the event's product, or it's a changeReqAreaColorEvent, or to restore removed products,
		 * or the item is a requirement area item
		 */
		if (
			rootGetters.getMyProductSubscriptionIds.includes(doc.productId) ||
			histEvent === 'changeReqAreaColorEvent' ||
			(histEvent === 'undoBranchRemovalEvent' && doc.level === LEVEL.DATABASE) ||
			isReqAreaItem
		)
			doProc(doc)
	},

	/* Is started by the watchdog. Listens for document changes. The timeout, if no changes are available, is 60 seconds (default maximum) */
	listenForChanges({ rootState, dispatch, commit }, since) {
		const listenForChangesWasRunning = rootState.listenForChangesRunning
		if (rootState.signedOut || rootState.stopListeningForChanges) {
			rootState.listenForChangesRunning = false
			return
		}
		rootState.listenForChangesRunning = true
		if (rootState.debugConnectionAndLogging && !listenForChangesWasRunning) {
			dispatch('doLog', { event: 'sync: listenForChanges started.', level: SEV.INFO })
		}
		globalAxios({
			method: 'GET',
			// the sync filter selects docs with a history of events, the event is NOT 'ignoreEvent' and the event has the 'distributeEvent===true' property
			url: `${rootState.userData.currentDb}/_changes?filter=filters/sync_filter&feed=longpoll&include_docs=true&since=${since}`,
		})
			.then((res) => {
				const data = res.data
				if (data.last_seq !== lastSeq) {
					// skip consecutive changes with the same sequence number (Couchdb bug?)
					for (const r of data.results) {
						const doc = r.doc
						if (doc && doc.history) {
							// only process events with included documents
							if (doc.history[0].sessionId === rootState.mySessionId) {
								// do not process events of the session that created the event
								continue
							}
							if (rootState.debug && doc._id === 'messenger') {
								console.log('MESSENGER DOC received')
							}
							// process a history event on backlog items received from other sessions (not the session that created the event)
							dispatch('processDoc', doc)
						}
					}
					lastSeq = data.last_seq
				}
				// send a new request to retrieve subsequent events
				// note that, when no data are received, receiving a response can last up to 60 seconds (time-out)
				dispatch('listenForChanges', lastSeq)
			})
			.catch((error) => {
				rootState.listenForChangesRunning = false
				if (rootState.stopListeningForChanges) {
					return
				}
				if (error.response && error.response.status === 404) {
					alert(`Database not found; cannot log; possible cause is that the server admin is restoring the current database.`)
					commit('endSession', 'listenForChanges: catch:error.response.status === 404')
					return
				}
				if (error.message === 'Request aborted') {
					// the user typed F5 or Ctrl-F5 or Vite reloaded
					if (!rootState.signedOut) {
						commit('endSession', 'listenForChanges: catch:Request aborted')
					}
				} else {
					dispatch('doLog', { event: `Listening for changes made by other users failed. ${error}`, level: SEV.WARNING })
				}
			})
	},
}

export default {
	actions,
}
