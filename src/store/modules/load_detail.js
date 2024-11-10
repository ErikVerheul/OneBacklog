import router from '../../router'
import { SEV, LEVEL, MISC } from '../../constants.js'
import { dedup, createLoadEventText, pathToJSON } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

var parentNodes
var orphansFound
var levelErrorsFound

const state = {
	currentDefaultProductNode: null,
	docsCount: 0,
	insertedCount: 0,
	orphansCount: 0,
	levelErrorCount: 0,
}

const mutations = {
	/*
	 * The database is sorted by level, productId and priority or level, parentId and priority for top level product documents.
	 * In the object parentNodes the created tree nodes are mapped to to their id's.
	 * The map is used to insert siblings to their parent. The CouchDb design filter sort order guarantees that the parents are read before any siblings.
	 * Items the user is not authorized or subscribed to are skipped
	 */
	processProducts(state, payload) {
		const rootState = payload.rootState
		const rootGetters = payload.rootGetters
		/* Return true if the id matches the id stored in the lastSessionData or, if not available, the default product id */
		function isNodeSelected(id) {
			const lastSelectedNodeId =
				rootState.lastSessionData && rootState.lastSessionData.detailView ? rootState.lastSessionData.detailView.lastSelectedNodeId : undefined
			if (lastSelectedNodeId && id === lastSelectedNodeId) return true
			if (!lastSelectedNodeId && id === rootState.currentProductId) return true
			return false
		}

		for (const item of payload.batch) {
			const _id = item.id
			const itemLevel = item.key[0]
			// negate the priority
			const priority = -item.key[2]
			const productId = item.value[0]
			const reqarea = item.value[1] || null
			const parentId = item.value[2]
			const itemState = item.value[3]
			const title = item.value[4]
			const team = item.value[5]
			const subtype = item.value[6]
			const dependencies = dedup(item.value[7])
			const conditionalFor = dedup(item.value[8])
			const reqAreaItemColor = item.value[9] || null
			const sprintId = item.value[10]
			const lastAttachmentAddition = item.value[11] || 0
			const lastAttachmentRemoval = item.value[12] || 0
			const lastOtherChange = item.value[13] || 0
			const lastCommentAddition = item.value[14] || 0
			const lastContentChange = item.value[15] || 0
			const lastPositionChange = item.value[16] || 0
			const lastStateChange = item.value[17] || 0
			const followers = item.value[18] || []

			if (_id === 'messenger') {
				// skip messenger document
				continue
			}

			// initialize with the root document
			if (itemLevel === LEVEL.DATABASE) {
				rootState.treeNodes = [
					{
						path: [0],
						pathStr: pathToJSON([0]),
						ind: 0,
						level: itemLevel,
						productId: null,
						parentId: null,
						_id,
						dependencies,
						conditionalFor,
						title,
						isDetailViewLeaf: false,
						isCoarseViewLeaf: false,
						children: [],
						isExpanded: true,
						isSelectable: true,
						isDraggable: false,
						isSelected: false,
						doShow: true,
						data: {
							state: itemState,
							team,
							priority,
							lastOtherChange: 0,
							followers,
						},
						tmp: {},
					},
				]
				parentNodes.root = rootState.treeNodes[0]
				state.docsCount++
				state.insertedCount++
				continue
			}
			// create req areas to title mapper and req areas to color mapper
			if (productId === MISC.AREA_PRODUCTID) {
				if (itemLevel === LEVEL.EPIC) {
					rootState.reqAreaMapper[_id] = title
					rootState.colorMapper[_id] = { reqAreaItemColor }
				}
			}
			// skip the items of the products the user is not authorized to
			if (productId !== MISC.AREA_PRODUCTID && !rootGetters.getMyAssignedProductIds.includes(productId)) continue

			// skip the items of the products the user is not subscribed to
			if (productId !== MISC.AREA_PRODUCTID && !rootGetters.getMyProductSubscriptionIds.includes(productId)) continue

			// create a map with product titles
			if (itemLevel === LEVEL.PRODUCT) {
				rootState.productTitlesMap[_id] = title
			}

			state.docsCount++
			// expand the node as saved in the last session or expand the default product up to the epic level
			const isExpanded = rootState.lastSessionData.detailView
				? rootState.lastSessionData.detailView.expandedNodes.includes(_id)
				: productId !== MISC.AREA_PRODUCTID && itemLevel < LEVEL.EPIC
			const doShow = rootState.lastSessionData.detailView
				? rootState.lastSessionData.detailView.doShowNodes.includes(_id)
				: productId !== MISC.AREA_PRODUCTID && itemLevel <= LEVEL.EPIC
			// the root cannot be dragged
			const isDraggable = itemLevel >= LEVEL.PRODUCT
			if (parentNodes[parentId] !== undefined) {
				const parentNode = parentNodes[parentId]
				const ind = parentNode.children.length
				const parentPath = parentNode.path
				const path = parentPath.concat(ind)
				// check for level error
				if (itemLevel !== path.length) {
					state.levelErrorCount++
					levelErrorsFound.push({ id: _id, parentId, productId, dbLevel: itemLevel, pathLength: path.length })
				}
				const newNode = {
					path,
					pathStr: pathToJSON(path),
					ind,
					level: itemLevel,
					productId,
					parentId,
					_id,
					dependencies,
					conditionalFor,
					title,
					isDetailViewLeaf: itemLevel === LEVEL.TASK,
					isCoarseViewLeaf: itemLevel === LEVEL.PBI,
					children: [],
					isExpanded,
					isSelectable: true,
					isDraggable,
					isSelected: isNodeSelected(_id),
					doShow,
					data: {
						lastAttachmentAddition,
						lastAttachmentRemoval,
						lastOtherChange,
						lastCommentAddition,
						lastContentChange,
						lastPositionChange,
						lastStateChange,
						priority,
						reqarea,
						reqAreaItemColor,
						sprintId,
						state: itemState,
						subtype,
						followers,
						team,
					},
					tmp: {},
				}

				state.insertedCount++

				if (newNode.isSelected) {
					rootState.selectedNodes = [newNode]
				}

				if (newNode._id === rootState.currentProductId) {
					state.currentDefaultProductNode = newNode
				}

				parentNode.children.push(newNode)
				parentNodes[_id] = newNode
			} else {
				state.orphansCount++
				orphansFound.push({ id: _id, parentId, productId })
			}
		}
	},
}

const actions = {
	/* Check the presence of the current product document and start loading the tree */
	checkProductAndStartLoading({ rootState, state, dispatch }) {
		parentNodes = {}
		orphansFound = []
		levelErrorsFound = []
		state.docsCount = 0
		state.insertedCount = 0
		state.orphansCount = 0
		state.levelErrorCount = 0
		const _id = rootState.currentProductId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id,
		})
			.then((res) => {
				// after this assignment the access rights can be set in the store
				rootState.currentProductTitle = res.data.title
				if (rootState.debug)
					console.log(
						'checkProductAndStartLoading: the current product document is found. Start loading the tree from database ' + rootState.userData.currentDb,
					)
				// start loading the tree and open the detail products view by default
				dispatch('loadAssignedAndSubscribed', {
					onSuccessCallback: () => {
						rootState.helpersRef.setDescendantsReqArea()
						rootState.helpersRef.dependencyViolationsFound()
						router.push('/detailProduct')
					},
				})
			})
			.catch((error) => {
				let msg = `checkProductAndStartLoading: Could not read current product document with id ${_id} from database ${rootState.userData.currentDb}`
				if (error.response && error.response.status === 404) {
					msg += ', is your default product deleted?'
				}
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
	},

	/* Get all items from the current database */
	loadAssignedAndSubscribed({ rootState, rootGetters, state, commit, dispatch }, payload) {
		// initialize the helpers functions
		dispatch('createHelpers')
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/details',
		})
			.then((res) => {
				rootState.lastTreeView = 'detailProduct'
				rootState.loadedTreeDepth = LEVEL.TASK
				rootState.loadedSprintId = null
				rootState.productTitlesMap = {}
				commit('processProducts', { rootState, rootGetters, batch: res.data.rows })

				// all backlog items are read and all nodes created; reset load parameters
				parentNodes = {}

				if (rootState.selectedNodes.length === 0) {
					const msg = `No match found for the last selected node in lastSessionData; assign the current default product node`
					dispatch('doLog', { event: msg, level: SEV.WARNING })
					state.currentDefaultProductNode.isSelected = true
					rootState.selectedNodes = [state.currentDefaultProductNode]
				}
				// load the the selected node
				dispatch('loadDoc', {
					id: rootGetters.getSelectedNode._id,
				})
				const severity = state.orphansCount === 0 ? SEV.INFO : SEV.CRITICAL
				commit('addToEventList', { txt: createLoadEventText(state), severity })
				// log any detected orphans, if present
				if (state.orphansCount > 0) {
					for (const o of orphansFound) {
						const msg = `Orphan found with Id = ${o.id}, parentId = ${o.parentId} and productId = ${o.productId}`
						dispatch('doLog', { event: msg, level: SEV.CRITICAL })
					}
				}
				// log any detected level errors, if present
				if (state.levelErrorCount > 0) {
					for (const l of levelErrorsFound) {
						const msg1 = `Level error found with Id = ${l.id}, parentId = ${l.parentId} and productId = ${l.productId}.`
						const msg2 = `The level read in the document is ${l.dbLevel}. According to the read parent the level should be ${l.pathLength}.`
						dispatch('doLog', { event: msg1 + ' ' + msg2, level: SEV.CRITICAL })
					}
				}

				if (!rootState.lastSessionData || !rootState.lastSessionData.coarseView) {
					// no lastSessionData for the coarse view available; create a default and show the nodes up to the epic level
					rootState.lastSessionData.coarseView = { expandedNodes: [], doShowNodes: [] }
					rootState.helpersRef.traverseModels((nm) => {
						if (nm._id === MISC.AREA_PRODUCTID || (nm.productId !== MISC.AREA_PRODUCTID && nm.level < LEVEL.EPIC)) {
							rootState.lastSessionData.coarseView.expandedNodes.push(nm._id)
						}
						if (nm.productId === MISC.AREA_PRODUCTID || nm.level <= LEVEL.EPIC) {
							rootState.lastSessionData.coarseView.doShowNodes.push(nm._id)
						}
					})
					rootState.lastSessionData.coarseView.lastSelectedNodeId = rootState.currentProductId
					rootState.lastSessionData.coarseView.lastSelectedProductId = 'root'
				}

				if (rootState.debug) console.log(res.data.rows.length + ' backlogItem documents are processed')
				if (payload.onSuccessCallback) payload.onSuccessCallback()
			})
			.catch((error) => {
				if (rootState.debug) console.log(`loadAssignedAndSubscribed: Could not read a product from database ${rootState.userData.currentDb}, ${error}`)
			})
	},
}

export default {
	state,
	mutations,
	actions,
}
