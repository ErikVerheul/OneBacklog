/*
* Events processed in sync:
* 'addCommentEvent':							see switch(commentsEvent)
* 'addSprintIdsEvent':						see process other events for tree views
* 'acceptanceEvent':							see process other events for tree views
* 'boardReloadEvent':							see histEvent === 'boardReloadEvent'
* 'changeReqAreaColorEvent':			see if (processHistory && isReqAreaItem) and if (rootGetters.isOverviewSelected && isReqAreaItem)
* 'commentToHistoryEvent':				see process other events for tree views
* 'conditionRemovedEvent':				see process other events for tree views
* 'createEvent':									see if (processHistory && isReqAreaItem), if (rootGetters.isOverviewSelected && isReqAreaItem) and process other events for tree views	+	see if (updateBoard)
* 'createTaskEvent':							see process other events for tree views	+	see if (updateBoard)
* 'dependencyRemovedEvent':				see process other events for tree views
* 'descriptionEvent':							see process other events for tree views
* 'docRestoredEvent':							see if (processHistory && isReqAreaItem) and process other events for tree views	+	see if (updateBoard)
* 'nodeMovedEvent':								see if (rootGetters.isOverviewSelected && isReqAreaItem) and process other events for tree views	+	see if (updateBoard)
* 'removeAttachmentEvent':				see process other events for tree views
* 'removedWithDescendantsEvent':	see if (processHistory && isReqAreaItem) and process other events for tree views +	see if (updateBoard)
* 'removeSprintIdsEvent':					see process other events for tree views
* 'setConditionEvent':						see process other events for tree views
* 'setDependencyEvent':						see process other events for tree views
* 'setHrsEvent':									see process other events for tree views
* 'setPointsEvent':								see process other events for tree views	+	see if (updateBoard)
* 'setSizeEvent':									see process other events for tree views
* 'setStateEvent':								see process other events for tree views	+	see if (updateBoard)
* 'setSubTypeEvent':							see process other events for tree views	+	see if (updateBoard)
* 'setTeamOwnerEvent':						see process other events for tree views	+	see if (updateBoard)
* 'setTitleEvent':								see if (processHistory && isReqAreaItem) and process other events for tree views	+	see if (updateBoard)
* 'taskRemovedEvent':							see process other events for tree views	+	see if (updateBoard)
* 'uploadAttachmentEvent':				see process other events for tree views
* 'updateTaskOrderEvent':					see if (updateBoard)
*/

import { SEV, LEVEL, MISC } from '../../constants.js'
import { getLocationInfo } from '../../common_functions.js'
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
					`listenForChanges: document with _id ${doc._id} is processed, priority = ${doc.priority}, current view = ${rootState.currentView},
				commentsEvent = ${commentsEvent}, distributed = ${lastCommentsObj.distributeEvent}, timestamp = ${String(new Date(lastCommentsTimestamp)).substring(0, 24)}, process = ${processComment} title = '${doc.title}',
				histEvent = ${histEvent}, distributed = ${lastHistObj.distributeEvent}, timestamp = ${String(new Date(lastHistoryTimestamp)).substring(0, 24)}, process = ${processHistory}, title = '${doc.title}',
				updateTree = ${updateTree}, updateBoard = ${updateBoard},`)
			}
			rootState.eventSyncColor = '#e6f7ff'
			setTimeout(function () {
				rootState.eventSyncColor = '#004466'
			}, 1000)
		}

		function reportOddTimestamp(event, docId) {
			if (Date.now() - event.timestamp > 1000) {
				const msg = `Received event '${Object.keys(event)[0]}' from user ${event.by}. The event is dated ${new Date(event.timestamp).toString()} and older than 1 second`
				commit('showLastEvent', { txt: msg, severity: SEV.WARNING })
				dispatch('doLog', { event: msg + ` The document id is ${docId}.`, level: SEV.WARNING })
			}
		}

		function getLevelText(doc) {
			if (doc.level < 0 || doc.level > LEVEL.TASK) {
				return 'Level not supported'
			}
			if (doc.level === LEVEL.PBI) {
				return getSubType(doc.subtype)
			}
			if (doc.level === LEVEL.EPIC && doc.parentId === MISC.AREA_PRODUCTID) {
				return 'requirement area'
			}
			return rootState.configData.itemType[doc.level]
		}

		function getProductTitle(id) {
			return rootState.productTitlesMap[id]
		}

		function getSubType(idx) {
			if (idx < 0 || idx >= rootState.configData.subtype.length) {
				return 'Error: unknown subtype'
			}
			return rootState.configData.subtype[idx]
		}

		function showSyncMessage(text, severity, specialText = false) {
			if (specialText) {
				if (isSameUserInDifferentSession) {
					commit('showLastEvent', { txt: `You ${text} in another session`, severity })
				} else commit('showLastEvent', { txt: `Another user ${text}`, severity })
			} else {
				const standardTxt = `${getLevelText(doc)} '${doc.title}' in product '${getProductTitle(doc.productId)}'`
				if (isSameUserInDifferentSession) {
					commit('showLastEvent', { txt: `You ${text} ${standardTxt} in another session`, severity })
				} else commit('showLastEvent', { txt: `Another user ${text} ${standardTxt}`, severity })
			}
		}

		function createNode(doc) {
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
				isDraggable: doc.level > LEVEL.PRODUCT,
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
			window.slVueTree.insert({
				nodeModel: locationInfo.prevNode,
				placement: locationInfo.newInd === 0 ? 'inside' : 'after'
			}, [node])
			// not committing any changes to the tree model. As the user has to navigate to the new node the data will be loaded.
		}

		function moveNode(doc) {
			const parentNode = window.slVueTree.getNodeById(doc.parentId)
			if (parentNode === null) return
			const item = lastHistObj.nodeMovedEvent
			if (item[1] > rootState.loadedTreeDepth) {
				// skip items that are not available in the tree
				return
			}
			const node = window.slVueTree.getNodeById(doc._id)
			if (node.level === LEVEL.PBI || node.level === LEVEL.TASK) commit('updateNodesAndCurrentDoc', { node, sprintId: item[12] })
			const locationInfo = getLocationInfo(item[10], parentNode)
			if (window.slVueTree.comparePaths(locationInfo.newPath, node.path) !== 0) {
				// move the node to the new position w/r to its siblings; first remove the node, then insert
				window.slVueTree.remove([node])
				node.data.priority = item[10]
				// do not recalculate the priority during insert
				if (locationInfo.newInd === 0) {
					window.slVueTree.insert({
						nodeModel: locationInfo.prevNode,
						placement: 'inside'
					}, [node], false)
				} else {
					// insert after prevNode
					window.slVueTree.insert({
						nodeModel: locationInfo.prevNode,
						placement: 'after'
					}, [node], false)
				}
				if (item[13] === 'move') commit('updateNodesAndCurrentDoc', { node, lastPositionChange: lastHistoryTimestamp })
				if (item[13] === 'undoMove') commit('updateNodesAndCurrentDoc', { node, lastPositionChange: item[14] })
			}
		}

		function doProc(doc) {
			doBlinck(doc)
			try {
				// note that both updateTree and updateBoard can be true
				if (updateTree) {
					const node = window.slVueTree.getNodeById(doc._id)
					// check for exception 'node not found'
					if (node === null && histEvent !== 'docRestoredEvent' && histEvent !== 'createEvent' && histEvent !== 'createTaskEvent') {
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
								if (isCurrentDocument) rootState.currentDoc.comments = doc.comments
								showSyncMessage(`added a comment to item`, SEV.INFO)
								break
							default:
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log('sync.trees.comments: event not found, name = ' + commentsEvent)
						}
					} else {
						// if not a comment, process the last event from the document history array (in the tree and/or board)
						reportOddTimestamp(lastHistObj, doc._id)
						// show the history update
						if (isCurrentDocument) rootState.currentDoc.history = doc.history
						// process requirement area items
						if (rootGetters.isOverviewSelected && isReqAreaItem) {
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log('sync:update the requiremnet areas with event ' + histEvent)
							const node = window.slVueTree.getNodeById(doc._id)
							switch (histEvent) {
								case 'changeReqAreaColorEvent':
									commit('updateNodesAndCurrentDoc', { node, reqAreaItemColor: doc.color })
									showSyncMessage(`changed the color indication of`, SEV.INFO)
									break
								case 'createEvent':
									if (node === null) {
										createNode(doc)
										showSyncMessage(`created`, SEV.INFO)
									}
									break
								case 'nodeMovedEvent':
									moveNode(doc)
									showSyncMessage(`moved`, SEV.INFO)
									break
								case 'removedWithDescendantsEvent':
									if (node) {
										window.slVueTree.remove([node])
										showSyncMessage(`removed`, SEV.INFO)
									}
									break
								case 'setTitleEvent':
									commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the title of`, SEV.INFO)
									break
								default:
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('sync.trees.isReqAreaItem: event not found, name = ' + histEvent)
							}
						} else {
							// eslint-disable-next-line no-console
							if (rootState.debug) console.log('sync:update the tree with event ' + histEvent)
							// process events for non requirement area items
							switch (histEvent) {
								case 'acceptanceEvent':
									commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: doc.acceptanceCriteria, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the acceptance criteria for`, SEV.INFO)
									break
								case 'addSprintIdsEvent':
									commit('updateNodesAndCurrentDoc', { node, sprintId: doc.sprintId, lastChange: doc.lastChange })
									showSyncMessage(`set the sprint for`, SEV.INFO)
									break
								case 'boardReloadEvent':
									// nothing to do here
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
										createNode(doc)
										showSyncMessage(`created`, SEV.INFO)
									}
									break
								case 'dependencyRemovedEvent':
									commit('updateNodesAndCurrentDoc', { node, dependenciesRemoved: doc.dependencies, lastChange: doc.lastChange })
									showSyncMessage(`removed a condition for`, SEV.INFO)
									break
								case 'descriptionEvent':
									commit('updateNodesAndCurrentDoc', { node, description: doc.description, lastContentChange: doc.lastContentChange })
									showSyncMessage(`changed the description of`, SEV.INFO)
									break
								case 'docRestoredEvent':
									{
										commit('showLastEvent', { txt: `Busy restoring ${getLevelText(doc)} as initiated in another session...`, severity: SEV.INFO })
										let toDispatch
										if (updateBoard && doc.level !== LEVEL.TASK) {
											// postpone the board update until the document is restored
											toDispatch = [{ loadPlanningBoard: { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam } }]
										}
										dispatch('restoreBranch', {
											doc,
											toDispatch,
											onSuccessCallback: () => {
												if (doc.level === LEVEL.PRODUCT) {
													// re-enter all the current users product roles, and update the user's subscriptions and product selection arrays with the removed product
													dispatch('addToMyProducts', { newRoles: lastHistObj.docRestoredEvent[5], productId: doc._id, productTitle: doc.title, isSameUserInDifferentSession })
												}
												showSyncMessage(`restored the removed`, SEV.INFO)
											}
										})
									}
									break
								case 'nodeMovedEvent':
									moveNode(doc)
									showSyncMessage(`moved`, SEV.INFO)
									break
								case 'removeAttachmentEvent':
									commit('updateNodesAndCurrentDoc', { node, lastAttachmentAddition: doc.lastAttachmentAddition })
									showSyncMessage(`removed an attachment from`, SEV.INFO)
									break
								case 'removedWithDescendantsEvent':
									if (node && doc.delmark) {
										// remove any dependency references to/from outside the removed items
										window.slVueTree.correctDependencies(doc.productId, lastHistObj.removedWithDescendantsEvent[1])
										let signOut = false
										if (node.isSelected || window.slVueTree.descendantNodeIsSelected(node)) {
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
										window.slVueTree.remove([node])
										showSyncMessage(`removed the`, SEV.INFO)
									}
									break
								case 'removeSprintIdsEvent':
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
											window.slVueTree.remove([node])
											showSyncMessage(`from team '${team}' removed task '${taskTitle}' from product '${getProductTitle(rootState, doc.productId)}'`, SEV.INFO, SPECIAL_TEXT)
										}
									}
									break
								case 'uploadAttachmentEvent':
									commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastAttachmentAddition: doc.lastAttachmentAddition })
									showSyncMessage(`uploaded an attachment to`, SEV.INFO)
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
								default:
									// eslint-disable-next-line no-console
									if (rootState.debug) console.log('sync.trees: event not found, name = ' + histEvent)
							}
						}
					}
				}

				if (updateBoard) {
					// eslint-disable-next-line no-console
					if (rootState.debug) console.log('sync:update the board with event ' + histEvent)
					reportOddTimestamp(lastHistObj, doc._id)
					// process events for the planning board
					switch (histEvent) {
						case 'createEvent':
						case 'createTaskEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								if (doc.level === LEVEL.TASK) {
									// a new task is created on another user's product details view or board
									commit('addTaskToBoard', doc)
								} else if (doc.level === LEVEL.PBI) {
									// a user story is created
									dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
								}
							}
							break
						case 'docRestoredEvent':
							{
								const involvedSprintIds = [doc.sprintId].concat(lastHistObj.docRestoredEvent[6])
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// one or more of the removed items or their descendants assigned to the loaded sprint are restored
									if (doc.level === LEVEL.TASK) {
										// a task removal is undone from a user story currently on the planning board
										commit('addTaskToBoard', doc)
									}
								}
							}
							break
						case 'nodeMovedEvent':
							{
								const item = lastHistObj.nodeMovedEvent
								const sourceSprintId = item[11]
								const targetSprintId = item[12]
								const involvedSprintIds = [doc.sprintId].concat([sourceSprintId]).concat([targetSprintId]).concat(window.slVueTree.getDescendantsInfoOnId(doc._id).sprintIds)
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// the item is moved in, within or out of the loaded sprint
									const sourceLevel = item[0]
									const targetLevel = item[1]
									const sourceParentId = item[7]
									const targetParentId = item[8]
									const newlyCalculatedPriority = item[10]

									if (sourceLevel === LEVEL.TASK && targetLevel === LEVEL.TASK && sourceParentId === targetParentId) {
										// move position of items within the same user story
										let tasks
										for (const s of rootState.stories) {
											if (s.storyId === targetParentId) {
												const columnKeys = Object.keys(s.tasks)
												for (const ck of columnKeys) {
													if (targetSprintId === rootState.loadedSprintId) {
														for (const t of s.tasks[ck]) {
															// move position of the item within the same task column
															if (t.id === doc._id) {
																t.priority = newlyCalculatedPriority
																tasks = s.tasks[ck]
																break
															}
														}
													}
												}
												if (tasks) break
											}
										}
										tasks.sort((a, b) => b.priority - a.priority)
									} else {
										// the item was moved to another user story in or out of this sprint
										dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
									}
								}
							}
							break
						case 'removedWithDescendantsEvent':
							{
								const involvedSprintIds = [doc.sprintId].concat(lastHistObj.removedWithDescendantsEvent[4])
								if (involvedSprintIds.includes(rootState.loadedSprintId)) {
									// the item or its descendants are no longer assigned to the loaded sprint and must be removed from the board
									if (doc.level === LEVEL.TASK) {
										// a task is removed from a user story currently displayed on the planning board
										for (const s of rootState.stories) {
											if (s.storyId === doc.parentId) {
												const newArray = []
												for (const t of s.tasks[doc.state]) {
													if (t.id !== doc._id) newArray.push(t)
												}
												s.tasks[doc.state] = newArray
												break
											}
										}
									} else {
										// a user story is removed from the planning board
										dispatch('loadPlanningBoard', { sprintId: rootState.loadedSprintId, team: rootState.userData.myTeam })
									}
								}
							}
							break
						case 'setPointsEvent':
							if (doc.sprintId === rootState.loadedSprintId && doc.level === LEVEL.PBI) {
								for (const s of rootState.stories) {
									if (s.storyId === doc._id) {
										s.size = doc.spsize
										break
									}
								}
							}
							break
						case 'setStateEvent':
							if (doc.sprintId === rootState.loadedSprintId && doc.level === LEVEL.TASK) {
								const prevState = lastHistObj.setStateEvent[0]
								const newTaskPosition = lastHistObj.setStateEvent[3]
								for (const s of rootState.stories) {
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
							if (doc.sprintId === rootState.loadedSprintId && doc.level === LEVEL.PBI) {
								for (const s of rootState.stories) {
									if (s.storyId === doc._id) {
										s.subType = doc.subtype
										break
									}
								}
							}
							break
						case 'setTeamOwnerEvent':
							// the item is now owned by my team. ToDo: if the item is a task, insert direct without reload
							dispatch('loadPlanningBoard', { sprintId: doc.sprintId, team: rootState.userData.myTeam })
							break
						case 'setTitleEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								switch (doc.level) {
									case LEVEL.FEATURE:
										for (const s of rootState.stories) {
											if (s.featureId === doc._id) {
												s.featureName = doc.title
												break
											}
										}
										break
									case LEVEL.PBI:
										for (const s of rootState.stories) {
											if (s.storyId === doc._id) {
												s.title = doc.title
												break
											}
										}
										break
									case LEVEL.TASK:
										for (const s of rootState.stories) {
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
							}
							break
						case 'taskRemovedEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								const storyId = lastHistObj.taskRemovedEvent[2]
								const taskId = lastHistObj.taskRemovedEvent[3]
								const taskState = lastHistObj.taskRemovedEvent[4]
								commit('removeTaskFromBoard', { storyId, taskId, taskState })
							}
							break
						case 'updateTaskOrderEvent':
							if (doc.sprintId === rootState.loadedSprintId) {
								const taskUpdates = lastHistObj.updateTaskOrderEvent.taskUpdates
								rootState.stories[taskUpdates.idx].tasks[taskUpdates.state] = taskUpdates.tasks
							}
							break
						default:
							if (doc.sprintId === rootState.loadedSprintId) {
								// eslint-disable-next-line no-console
								if (rootState.debug) console.log('sync.planningBoard: event not found, name = ' + histEvent)
							}
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
		const lastHistoryTimestamp = lastHistObj.timestamp
		const histEvent = Object.keys(lastHistObj)[0]

		// process the last event from the document comments array if more recent than then the last distributed event of the document history array
		const processComment = lastCommentsObj.distributeEvent && (!lastHistObj.distributeEvent || (lastCommentsTimestamp > lastHistoryTimestamp))
		const processHistory = !processComment
		// 'ignoreEvent' should be tagged with distributeEvent === false and filtered by the sync_filter. Skip the event in case the tag is missing
		if (processComment && commentsEvent === 'ignoreEvent' || processHistory && histEvent === 'ignoreEvent') return

		const logEvent = processComment ? commentsEvent : histEvent
		// eslint-disable-next-line no-console
		if (rootState.debug) console.log('sync:updateTree with event ' + logEvent)

		const isSameUserInDifferentSession = processComment ? lastCommentsObj.by === rootState.userData.user : lastHistObj.by === rootState.userData.user

		// handle special 'boardReloadEvent' and return
		if (processHistory && rootGetters.isPlanningBoardSelected && histEvent === 'boardReloadEvent') {
			// this event is passed via the 'messenger' dummy backlogitem, the team name is in the message not in the doc; always process this event if the board is loaded
			const sprintId = lastHistObj.boardReloadEvent[0]
			const team = lastHistObj.boardReloadEvent[1]
			if (sprintId === rootState.loadedSprintId && team === rootState.userData.myTeam) {
				dispatch('loadPlanningBoard', { sprintId, team: rootState.userData.myTeam })
				doBlinck(doc)
			}
			return
		}

		const isReqAreaItem = doc.productId === MISC.AREA_PRODUCTID
		// update the tree only for documents available in the currently loaded tree model (eg. 'products overview' has no pbi and task items)
		const updateTree = doc.level <= rootState.loadedTreeDepth
		// update the board only if loaded AND loaded for my team OR setTeamOwnerEvent is received
		const updateBoard = rootGetters.isPlanningBoardSelected && (doc.team === rootState.userData.myTeam || histEvent === 'setTeamOwnerEvent')

		// (pre)process requirement area items which do not refence the node
		if (processHistory && isReqAreaItem) {
			switch (histEvent) {
				case 'changeReqAreaColorEvent':
					commit('updateColorMapper', { id: doc._id, newColor: doc.color })
					showSyncMessage(`changed the color indicator of`, SEV.INFO)
					break
				case 'docRestoredEvent':
					dispatch('restoreBranch', {
						doc,
						onSuccessCallback: () => {
							// restore references to the requirement area
							const reqAreaId = doc._id
							const itemsRemovedFromReqArea = lastHistObj.docRestoredEvent[7]
							window.slVueTree.traverseModels((nm) => {
								if (itemsRemovedFromReqArea.includes(nm._id)) {
									nm.data.reqarea = reqAreaId
								}
							})
							window.slVueTree.setDescendentsReqArea()
							showSyncMessage(`restored removed`, SEV.INFO)
						}
					})
					break
				case 'removedWithDescendantsEvent':
					{
						// remove references from the requirement area
						const reqAreaId = lastHistObj.removedWithDescendantsEvent[0]
						window.slVueTree.traverseModels((nm) => {
							if (nm.data.reqarea === reqAreaId) {
								delete nm.data.reqarea
							}
						})
					}
					break
			}
		}

		// process the event if the user is subscribed for the event's product or to restore removed products or the item is requirement area item
		if (rootGetters.getMyProductSubscriptions.includes(doc.productId) || histEvent === 'docRestoredEvent' && doc.level === LEVEL.PRODUCT || isReqAreaItem) {
			doProc(doc)
		}
	},

	/* Listen for document changes. The timeout, if no changes are available is 60 seconds (default maximum) */
	listenForChanges({
		rootState,
		dispatch
	}) {
		// stop listening if offline. Watchdog will start it automatically when online again
		if (rootState.stopListenForChanges || !rootState.online) return

		rootState.listenForChangesRunning = true
		const url = rootState.userData.currentDb + '/_changes?filter=filters/sync_filter&feed=longpoll&include_docs=true&since=now'
		globalAxios({
			method: 'GET',
			url
		}).then(res => {
			// note that receiving a response can last up to 60 seconds (time-out)
			if (rootState.online) dispatch('listenForChanges')
			const data = res.data
			if (data.results.length > 0) {
				// only process events with included documents
				for (const r of data.results) {
					// skip consecutive changes with the same sequence number (Couchdb bug?)
					if (r.seq === lastSeq) break

					lastSeq = r.seq
					const doc = r.doc
					// console.log('listenForChanges: doc = ' + JSON.stringify(doc, null, 2))
					if (doc.type == 'backlogItem' && (doc.history[0].sessionId !== rootState.mySessionId)) {
						// process distributed events on backlog items from other sessions (not the session that created the event)
						dispatch('processDoc', doc)
					}
				}
			}
		}).catch(error => {
			rootState.listenForChangesRunning = false
			const msg = 'Listening for changes made by other users failed, ' + error
			// do not try to save the log if a network error is detected, just queue the log
			const skipSaving = error.message = 'Network error'
			dispatch('doLog', { event: msg, level: SEV.WARNING, skipSaving })
		})
	}
}

export default {
	actions
}
