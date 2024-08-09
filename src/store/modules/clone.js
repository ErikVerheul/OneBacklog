import { SEV, LEVEL } from '../../constants.js'
import { getLocationInfo, createId } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var busyCloning = false
var runningThreadsCount
var clonedRootDoc
var clonedRootNode
var clonedDocsCount

/* Return all documents with the document with id as parent in order of priority */
function composeRangeString2(id) {
	return `startkey=["${id}",${Number.MIN_SAFE_INTEGER}]&endkey=["${id}",${Number.MAX_SAFE_INTEGER}]`
}

/* Return a priority that places the cloned item above the original */
function calcNewClonePriority(rootState, node) {
	const prevNode = rootState.helpersRef.getPreviousNode(node.path)
	let newPrio
	// place the clone above the original
	if (prevNode.level < node.level) {
		// the previous node is the parent
		newPrio = Math.floor(Number.MAX_SAFE_INTEGER / 2 + node.data.priority / 2)
	} else {
		// the previous node is a sibling
		newPrio = Math.floor(prevNode.data.priority / 2 + node.data.priority / 2)
	}
	return newPrio
}

const actions = {
	/*
	* Order of execution:
	* 1. cloneBranch, dispatches processItemsToClone for the root document of the items to be cloned (the selected node)
	* 2. processItemsToClone, dispatches getChildrenToClone for every document in the passed results array
	* 3. getChildrenToClone, dispatches processItemsToClone for every parent id and dispatches addHistToClonedDoc when all parent ids are processed
	* 4. addHistToClonedDoc, adds history to the cloned item, updates the tree view and creates undo data
	* Attachments, dependencies, conditions, sprintId, color (reqarea items), delmark, unremovedMark and history are not copied.
	* The event is not distributed to other on-line users.
	* Only one clone action can be executed at a time.
	*/
	cloneBranch({
		rootState,
		dispatch,
		commit
	}, originalNode) {
		if (busyCloning) {
			commit('addToEventList', { txt: `Cannot start a clone while another clone is busy. Please try later`, severity: SEV.WARNING })
			return
		}
		busyCloning = true
		runningThreadsCount = 0
		clonedDocsCount = 0
		let cloneProductId = undefined
		if (originalNode.level === LEVEL.PRODUCT) {
			// cloning a product; must assign the product id to all its descendants
			cloneProductId = createId()
		}
		// get the document
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + originalNode._id
		}).then(res => {
			const doc = res.data
			// pass the cloneParentNode as undefined; the root node will be inserted in the tree view after all descendants are attached
			dispatch('processItemsToClone', { originalNode, cloneProductId, results: [doc], newParentId: doc.parentId, cloneParentId: doc.parentId, cloneParentNode: undefined })
		}).catch(error => {
			const msg = `cloneBranch: Could not read the document with id ${originalNode._id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
			busyCloning = false
		})
	},

	processItemsToClone({
		rootState,
		dispatch,
		commit
	}, payload) {
		const toDispatch = []
		const clonedDocs = []
		for (const doc of payload.results) {
			// note that attachments, dependencies, conditions, sprintId, color (reqarea items), delmark, unremovedMark are not copied
			const clonedDoc = {
				_id: payload.cloneProductId && doc._id === payload.originalNode._id ? payload.cloneProductId : createId(),
				type: 'backlogItem',
				productId: payload.cloneProductId ? payload.cloneProductId : doc.productId,
				parentId: payload.cloneParentId,
				team: doc.team,
				taskOwner: doc.taskOwner,
				level: doc.level,
				subtype: doc.subtype,
				state: doc.state,
				tssize: doc.tssize,
				spikepersonhours: doc.spikepersonhours,
				reqarea: doc.reqarea,
				spsize: doc.spsize,
				title: doc._id === payload.originalNode._id ? 'Clone of ' + doc.title : doc.title,
				description: doc.description,
				acceptanceCriteria: doc.acceptanceCriteria,
				priority: doc._id === payload.originalNode._id ? calcNewClonePriority(rootState, payload.originalNode) : doc.priority,
				comments: doc.comments,
				history: [{
					ignoreEvent: ['processItemsToClone'],
					timestamp: Date.now(),
					distributeEvent: false
				}],
				delmark: false,
				// add last changes
				lastPositionChange: doc.lastPositionChange,
				lastStateChange: doc.lastStateChange,
				lastContentChange: Date.now(),
				lastCommentAddition: doc.lastCommentAddition,
				lastAttachmentAddition: doc.lastAttachmentAddition,
				lastAttachmentRemoval: doc.lastAttachmentRemoval,
				lastCommentToHistory: doc.lastCommentToHistory,
				lastChange: Date.now(),
			}
			const clonedNode = rootState.helpersRef.createNode(clonedDoc)
			if (doc._id === payload.originalNode._id) {
				clonedRootDoc = clonedDoc
				// save the root node of the new branch
				clonedRootNode = clonedNode
			}
			// add history to the created clone
			const newHist = {
				ignoreEvent: ['cloneDescendants'],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				distributeEvent: false
			}
			clonedDoc.history.unshift(newHist)
			clonedDocs.push(clonedDoc)
			runningThreadsCount++
			// attach child node to the parent; note that the retrieved children are sorted on priority
			if (payload.cloneParentNode) payload.cloneParentNode.children.push(clonedNode)
			// multiple instances can be dispatched
			toDispatch.push({
				getChildrenToClone: { originalNode: payload.originalNode, cloneProductId: payload.cloneProductId, parentId: doc._id, cloneParentId: clonedDoc._id, cloneParentNode: clonedNode }
			})
		}

		dispatch('updateBulk', {
			dbName: rootState.userData.currentDb, docs: clonedDocs, toDispatch, caller: 'processItemsToClone', onSuccessCallback: () => {
				clonedDocsCount += clonedDocs.length
				commit('startOrContinueShowProgress', `${clonedDocsCount - 1} descendants are cloned`)
			}
		})
	},

	getChildrenToClone({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMap?' + composeRangeString2(payload.parentId) + '&include_docs=true'
		}).then(res => {
			runningThreadsCount--
			const results = res.data.rows
			if (results.length > 0) {
				// process next level
				dispatch('processItemsToClone',
					{ originalNode: payload.originalNode, cloneProductId: payload.cloneProductId, results: results.map(r => r.doc), newParentId: payload.parentId, cloneParentId: payload.cloneParentId, cloneParentNode: payload.cloneParentNode })
			} else {
				if (runningThreadsCount === 0) {
					// db iteration ready
					dispatch('addHistToClonedDoc', payload)
				}
			}
		}).catch(error => {
			runningThreadsCount--
			const msg = `getChildrenToClone: Could not fetch the child documents of document with id ${payload.parentId} in database ${rootState.userData.currentDb}. ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Add history to the item that was cloned */
	addHistToClonedDoc({
		rootState,
		dispatch
	}, payload) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + payload.originalNode._id
		}).then(res => {
			const updatedDoc = res.data
			const newHist = {
				clonedBranchEvent: [payload.originalNode.level, payload.originalNode.subtype],
				by: rootState.userData.user,
				email: rootState.userData.email,
				timestamp: Date.now(),
				sessionId: rootState.mySessionId,
				distributeEvent: false
			}
			updatedDoc.history.unshift(newHist)

			if (payload.cloneProductId) {
				// copy the assigned roles
				const userRoles = rootState.userData.myDatabases[rootState.userData.currentDb].productsRoles[payload.originalNode._id]
				// update the current user's profile with the cloned product
				const newProductOption = {
					value: payload.cloneProductId,
					text: clonedRootNode.title
				}
				dispatch('assignProductToUserAction', {
					dbName: rootState.userData.currentDb, selectedUser: rootState.userData.user, newProductOption, userRoles, onFailureCallback: () => {
						busyCloning = false
					}
				})
			}

			dispatch('updateDoc', {
				dbName: rootState.userData.currentDb, updatedDoc, caller: 'addHistToClonedDoc', onSuccessCallback: () => {
					dispatch('showBranch', payload)
				}, onfailureCallback: () => {
					busyCloning = false
				}
			})
		}).catch(error => {
			const msg = `addHistToClonedDoc: Could not read the document with id ${payload.originalNode._id} from database ${rootState.userData.currentDb}, ${error}`
			dispatch('doLog', { event: msg, level: SEV.ERROR })
			busyCloning = false
		})
	},

	/* Show the cloned nodes in the tree view and add an entry to undo the clone */
	showBranch({
		rootState,
		commit,
	}, payload) {
		const parentNode = rootState.helpersRef.getNodeById(payload.originalNode.parentId)
		const locationInfo = getLocationInfo(clonedRootDoc.priority, parentNode)
		// insert the cloned root node in the tree above the original
		rootState.helpersRef.insertNodes({
			nodeModel: locationInfo.prevNode,
			placement: locationInfo.newInd === 0 ? 'inside' : 'after'
		}, [clonedRootNode], { skipUpdateProductId: true })
		// select the cloned node
		const nowSelectedNode = rootState.helpersRef.getNodeById(clonedRootDoc._id)
		commit('updateNodesAndCurrentDoc', { selectNode: nowSelectedNode })
		// create an entry for undoing the clone in a last-in first-out sequence
		const entry = {
			type: 'undoBranchClone',
			newNode: clonedRootNode,
			productWasCloned: payload.cloneProductId !== undefined
		}
		rootState.changeHistory.unshift(entry)
		commit('addToEventList', { txt: `The ${rootState.helpersRef.getLevelText(payload.originalNode.level)} '${payload.originalNode.title}' and ${clonedDocsCount - 1} descendants are cloned`, severity: SEV.INFO })
		busyCloning = false
	}
}

export default {
	actions
}
