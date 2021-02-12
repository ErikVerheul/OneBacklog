/*
* Events processed in sync:
* 'acceptanceEvent':						see process other events for tree views
* 'addCommentEvent':						see switch (commentsEvent)
* 'addSprintIdsEvent':					see process other events for tree views
* 'boardReloadEvent':						see histEvent === 'boardReloadEvent'
* 'changeReqAreaColorEvent':		see updateTree && doc.productId === MISC.AREA_PRODUCTID
* 'commentToHistoryEvent':			see process other events for tree views
* 'conditionRemovedEvent':			see process other events for tree views
* 'createEvent':								see process other events for tree views	+	see if (updateBoard)
* 'createTaskEvent':						see process other events for tree views	+	see if (updateBoard)
* 'dependencyRemovedEvent':			see process other events for tree views
* 'descriptionEvent':						see process other events for tree views
* 'docRestoredEvent':						see process other events for tree views	+	see if (updateBoard)
* 'nodeMovedEvent':							see process other events for tree views	+	see if (updateBoard)
* 'removeAttachmentEvent':			see process other events for tree views
* 'removedWithDescendantsEvent':	see process other events for tree views +	see if (updateBoard)
* 'removeSprintIdsEvent':				see process other events for tree views
* 'setConditionEvent':					see process other events for tree views
* 'setDependencyEvent':					see process other events for tree views
* 'setHrsEvent':								see process other events for tree views
* 'setPointsEvent':							see process other events for tree views	+	see if (updateBoard)
* 'setSizeEvent':								see process other events for tree views
* 'setStateEvent':							see process other events for tree views	+	see if (updateBoard)
* 'setSubTypeEvent':						see process other events for tree views	+	see if (updateBoard)
* 'setTeamOwnerEvent':					see process other events for tree views	+	see if (updateBoard)
* 'setTitleEvent':							see process other events for tree views	+	see if (updateBoard)
* 'taskRemovedEvent':						see if (updateBoard)
* 'uploadAttachmentEvent':			see process other events for tree views +	see if (updateBoard)
* 'updateTaskOrderEvent':				see if (updateBoard)
* 'uploadTaskOwnerEvent':				see if (updateBoard)
*/

import { SEV, LEVEL, MISC } from '../../constants.js'
import { getLocationInfo } from '../../common_functions.js'
import globalAxios from 'axios'
var lastSeq = undefined
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly  (if omitted the previous event will be processed again)

/*
* Listen for any changes in the user subscribed products made by other users and update the products tree view.
* - Select from the changes in documents of type 'backlogItem' the items with a history or comments array and a first entry tagged for distribution (exluding config, log and possibly others)
* - When a user starts multiple sessions each session has a different sessionId. These sessions are synced also.
* - Only updates for products the user is subscribed to are processed and those products which were remotely deleted so that these deletetions can be remotely undone.
* After sign-in an up-to-date state of the database is loaded. Any pending sync request are ignored once.
*/

const actions = {
  processDoc ({
		rootState,
		rootGetters,
    commit,
    dispatch
  }, doc) {
    function reportOddTimestamp (event, docId) {
      if (Date.now() - event.timestamp > 1000) {
        const msg = `Received event '${Object.keys(event)[0]}' from user ${event.by}. The event is dated ${new Date(event.timestamp).toString()} and older than 1 second`
        commit('showLastEvent', { txt: msg, severity: SEV.WARNING })
				dispatch('doLog', { event: msg + ` The document id is ${docId}.`, level: SEV.WARNING })
      }
    }

    function getLevelText (level, subtype = 0) {
      if (level < 0 || level > LEVEL.TASK) {
        return 'Level not supported'
      }
      if (level === LEVEL.PBI) {
        return getSubType(subtype)
      }
      return rootState.configData.itemType[level]
    }

    function getSubType (idx) {
      if (idx < 0 || idx >= rootState.configData.subtype.length) {
        return 'Error: unknown subtype'
      }
      return rootState.configData.subtype[idx]
    }

    function createNode (doc) {
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

    function moveNode (doc) {
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

		function doProc(doc, isSameUserInDifferentSession) {
      try {
        if (updateTree) {
          // eslint-disable-next-line no-console
          if (rootState.debug) console.log('sync:updateTree with event ' + histEvent)
          // process events on tree items that are loaded (eg. 'products overview' has no pbi and task items)
          const isCurrentDocument = doc._id === rootState.currentDoc._id
          if (isCurrentDocument) {
            // replace the history of the currently opened document
            rootState.currentDoc.history = doc.history
          }
          const node = window.slVueTree.getNodeById(doc._id)
          // process comments
          if (doc.comments[0].distributeEvent && (!lastHistObj.distributed || doc.comments[0].timestamp > lastHistoryTimestamp)) {
            const commentsEvent = Object.keys(doc.comments[0])[0]
            reportOddTimestamp(doc.comments[0], doc._id)
            switch (commentsEvent) {
              case 'addCommentEvent':
                node.data.lastCommentAddition = doc.comments[0].timestamp
                // show the comments update
                if (isCurrentDocument) rootState.currentDoc.comments = doc.comments
                break
            }
            // nothing else to do when processing a comments change
            return
          }
          // check for exception
          if (node === null && histEvent !== 'docRestoredEvent' && histEvent !== 'createEvent' && histEvent !== 'createTaskEvent') {
            commit('showLastEvent', { txt: `Another user changed item ${doc._id} which is missing in your view`, severity: SEV.WARNING })
            dispatch('doLog', { event: 'sync: cannot find node with id = ' + doc._id, level: SEV.WARNING })
            return
          }
          reportOddTimestamp(doc.history[0], doc._id)
          // process other events for tree views
          switch (histEvent) {
            case 'acceptanceEvent':
              commit('updateNodesAndCurrentDoc', { node, acceptanceCriteria: doc.acceptanceCriteria, lastContentChange: doc.lastContentChange })
              break
            case 'addSprintIdsEvent':
              commit('updateNodesAndCurrentDoc', { node, sprintId: doc.sprintId, lastChange: doc.lastChange })
              break
            case 'commentToHistoryEvent':
              commit('updateNodesAndCurrentDoc', { node, lastCommentToHistory: doc.lastCommentToHistory })
              break
            case 'conditionRemovedEvent':
              commit('updateNodesAndCurrentDoc', { node, conditionsremoved: doc.conditionalFor, lastChange: doc.lastChange })
              break
            case 'createEvent':
            case 'createTaskEvent':
              if (node === null) createNode(doc)
              break
            case 'dependencyRemovedEvent':
              commit('updateNodesAndCurrentDoc', { node, dependenciesRemoved: doc.dependencies, lastChange: doc.lastChange })
              break
            case 'descriptionEvent':
              commit('updateNodesAndCurrentDoc', { node, description: doc.description, lastContentChange: doc.lastContentChange })
              break
            case 'docRestoredEvent':
              {
                commit('showLastEvent', { txt: `Busy restoring ${getLevelText(doc.level, doc.subtype)} as initiated in another session...`, severity: SEV.INFO })
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
                    if (lastHistObj.by === rootState.userData.user) {
											commit('showLastEvent', { txt: `You restored the removed ${getLevelText(doc.level, doc.subtype)} '${doc.title}' in another session`, severity: SEV.INFO })
										} else commit('showLastEvent', { txt: `Another user restored the removed ${getLevelText(doc.level, doc.subtype)} '${doc.title}'`, severity: SEV.INFO })
                  }
                })
              }
              break
            case 'nodeMovedEvent':
              moveNode(doc)
              break
            case 'removeAttachmentEvent':
              commit('updateNodesAndCurrentDoc', { node, lastAttachmentAddition: doc.lastAttachmentAddition })
              break
						case 'removedWithDescendantsEvent':
							if (node && doc.delmark) {
								// remove any dependency references to/from outside the removed items
								window.slVueTree.correctDependencies(node.productId, lastHistObj.removedWithDescendantsEvent[1])
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
								if (lastHistObj.by === rootState.userData.user) {
									commit('showLastEvent', { txt: `You removed the ${getLevelText(doc.level, doc.subtype)} '${doc.title}' in another session`, severity: SEV.INFO })
								} else commit('showLastEvent', { txt: `Another user removed the ${getLevelText(doc.level, doc.subtype)} '${doc.title}'`, severity: SEV.INFO })
							}
							break
            case 'removeSprintIdsEvent':
              commit('updateNodesAndCurrentDoc', { node, sprintId: undefined, lastChange: doc.lastChange })
              break
            case 'setConditionEvent':
              if (lastHistObj.setConditionEvent[2]) {
                // undo single addition
                commit('updateNodesAndCurrentDoc', { node, removeLastConditionalFor: null, lastChange: doc.lastChange })
              } else {
                const dependentOnNodeId = lastHistObj.setConditionEvent[0]
                commit('updateNodesAndCurrentDoc', { node, addConditionalFor: dependentOnNodeId, lastChange: doc.lastChange })
              }
              break
            case 'setDependencyEvent':
              if (lastHistObj.setDependencyEvent[2]) {
                // undo single addition
                commit('updateNodesAndCurrentDoc', { node, removeLastDependencyOn: null, lastChange: doc.lastChange })
              } else {
                const conditionalForNodeId = lastHistObj.setDependencyEvent[0]
                commit('updateNodesAndCurrentDoc', { node, addDependencyOn: conditionalForNodeId, lastChange: doc.lastChange })
              }
              break
            case 'setHrsEvent':
              commit('updateNodesAndCurrentDoc', { node, spikepersonhours: doc.spikepersonhours, lastChange: doc.lastChange })
              break
            case 'setPointsEvent':
              commit('updateNodesAndCurrentDoc', { node, spsize: doc.spsize, lastChange: doc.lastChange })
              break
            case 'setSizeEvent':
              commit('updateNodesAndCurrentDoc', { node, tssize: doc.tssize, lastChange: doc.lastChange })
              break
            case 'setStateEvent':
              commit('updateNodesAndCurrentDoc', { node, state: doc.state, lastStateChange: doc.lastStateChange })
              break
            case 'setSubTypeEvent':
              commit('updateNodesAndCurrentDoc', { node, subtype: doc.subtype, lastChange: doc.lastChange })
              break
            case 'setTeamOwnerEvent':
              commit('updateNodesAndCurrentDoc', { node, team: doc.team, lastChange: doc.lastChange })
              break
            case 'setTitleEvent':
              commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
              break
            case 'uploadAttachmentEvent':
              commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastAttachmentAddition: doc.lastAttachmentAddition })
              break
              /// //////////////////////////// changes originating from planning board ///////////////////////////////////////////////////////
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
              break
            default:
              // eslint-disable-next-line no-console
              if (rootState.debug) console.log('sync.trees: event not found, name = ' + histEvent)
          }
        }

        if (updateBoard) {
          // eslint-disable-next-line no-console
          if (rootState.debug) console.log('sync:updateBoard with event ' + histEvent)
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
                const prevState = lastHistObj.taskRemovedEvent[1]
                commit('removeTaskFromBoard', { prevState, doc })
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

		const lastHistObj = doc.history[0]
    // get data from last history addition
    const lastHistoryTimestamp = lastHistObj.timestamp
    const lastHistoryOwner = lastHistObj.by
		const histEvent = Object.keys(lastHistObj)[0]
		/* Update the tree only for documents available in the currently loaded tree model */
		const updateTree = histEvent !== 'ignoreEvent' && doc.level <= rootState.loadedTreeDepth
		const isSameUserInDifferentSession = updateTree && (lastHistoryOwner === rootState.userData.user)
		/*
    * Update the board only if loaded and the item represented by the document is assigned to my team. Exceptions for events:
    * - setTeamOwnerEvent: also update the board if an item changes team (the doc is assigned to another team or no team)
		* - triggerBoardReload: also trigger a reload from the feature level (the doc is the feature parent and has no team ownership)
		*/
		const updateBoard = histEvent !== 'ignoreEvent' && rootGetters.isPlanningBoardSelected &&
			(doc.team === rootState.userData.myTeam || histEvent === 'setTeamOwnerEvent' || histEvent === 'triggerBoardReload')

    if (histEvent === 'boardReloadEvent') {
      // boardReloadEvent: This event is passed via the 'messenger' dummy backlogitem, the team name is in the message not in the doc; always process this event
      const sprintId = lastHistObj.boardReloadEvent[0]
      const team = lastHistObj.boardReloadEvent[1]
      if (sprintId === rootState.loadedSprintId && team === rootState.userData.myTeam) {
        dispatch('doBlinck', doc)
        dispatch('loadPlanningBoard', { sprintId, team: rootState.userData.myTeam })
      }
    } else {
      if (updateTree && doc.productId === MISC.AREA_PRODUCTID) {
        // special case: requirement areas changes
        dispatch('doBlinck', doc)
        switch (histEvent) {
          case 'changeReqAreaColorEvent':
            commit('updateColorMapper', { id: doc._id, newColor: doc.color })
            break
          case 'docRestoredEvent':
            {
              // restore references to the requirement area
              const reqAreaId = doc._id
              const itemsRemovedFromReqArea = lastHistObj.docRestoredEvent[7]
              window.slVueTree.traverseModels((nm) => {
                if (itemsRemovedFromReqArea.includes(nm._id)) {
                  nm.data.reqarea = reqAreaId
                }
              })
              window.slVueTree.setDescendentsReqArea()
            }
            break
          case 'removedWithDescendantsEvent':
            {
              // remove references to the requirement area
              const reqAreaId = lastHistObj.removedWithDescendantsEvent[0]
              window.slVueTree.traverseModels((nm) => {
                if (nm.data.reqarea === reqAreaId) {
                  delete nm.data.reqarea
                }
              })
            }
            break
        }
				// special case: requirement areas changes- continued
				if (rootGetters.isOverviewSelected) {
          const node = window.slVueTree.getNodeById(doc._id)
          switch (histEvent) {
            case 'changeReqAreaColorEvent':
              commit('updateNodesAndCurrentDoc', { node, reqAreaItemColor: doc.color })
              break
            case 'createEvent':
              if (node === null) createNode(doc)
              break
            case 'docRestoredEvent':
              dispatch('restoreBranch', {
                doc,
                onSuccessCallback: () => {
                  if (lastHistObj.by === rootState.userData.user) {
                    commit('showLastEvent', { txt: 'You restored a removed requirement area in another session', severity: SEV.INFO })
                  } else commit('showLastEvent', { txt: 'Another user restored a removed requirement area', severity: SEV.INFO })
                }
              })
              break
            case 'nodeMovedEvent':
              moveNode(doc)
              break
            case 'removedWithDescendantsEvent':
              if (node) {
                window.slVueTree.remove([node])
                if (lastHistObj.by === rootState.userData.user) {
                  commit('showLastEvent', { txt: 'You removed a requirement area in another session', severity: SEV.INFO })
                } else commit('showLastEvent', { txt: 'Another user removed a requirement area', severity: SEV.INFO })
              }
              break
            case 'setTitleEvent':
              commit('updateNodesAndCurrentDoc', { node, title: doc.title, lastContentChange: doc.lastContentChange })
              break
          }
        }
      } else {
        // not AREA_PRODUCTID, continue with updateTree and updateBoard; allow removed products to be restored
				if ((histEvent === 'docRestoredEvent' && doc.level === LEVEL.PRODUCT) || rootGetters.getMyProductSubscriptions.includes(doc.productId)) {
          // only process updates of items the user is authorised to
          dispatch('doBlinck', doc)
					doProc(doc, isSameUserInDifferentSession)
        }
      }
    }
  },

  doBlinck ({
    rootState
  }, doc) {
    if (rootState.debug) {
			// eslint-disable-next-line no-console
      console.log(`listenForChanges: document with _id ${doc._id} is processed, current view = ${rootState.currentView}, priority = ${doc.priority},
			lastHistType = ${Object.keys(doc.history[0])[0]}, history timestamp = ${String(new Date(doc.history[0].timestamp)).substring(0, 24)},
			comments timestamp = ${String(new Date(doc.comments[0].timestamp)).substring(0, 24)}, title = '${doc.title}'`)
    }
    rootState.eventSyncColor = '#e6f7ff'
    setTimeout(function () {
      rootState.eventSyncColor = '#004466'
    }, 1000)
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
