import { SEV, LEVEL } from '../../constants.js'
import { dedup } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

const AREA_PRODUCTID = 'requirement-areas'
var parentNodes
var orphansFound
var levelErrorsFound

const state = {
	docsCount: 0,
	insertedCount: 0,
	orphansCount: 0,
	levelErrorCount: 0
}

const mutations = {
	/*
	 * The database is sorted by productId, level and priority.
	 * The documents are read top down by level. In the object parentNodes the created tree nodes are mapped to to their id's.
	 * The map is used to insert siblings to their parent. The CouchDb design filter sort order guarantees that the parents are read before any siblings.
	 * Note that the database is of level 0, and requirement area documents of level 1 are excluded in the database view.
	 * The root and the top level product nodes are not draggable.
	 */
	processProducts(state, payload) {
		const rootState = payload.rootState
		const rootGetters = payload.rootGetters
		for (const item of payload.batch) {
			const _id = item.id
			const productId = item.key[0]
			const itemLevel = item.key[1]
			// negate the priority
			const priority = -item.key[2]
			const parentId = item.value[1]
			const reqarea = item.value[0] || null
			const itemState = item.value[2]
			const title = item.value[3]
			const team = item.value[4]
			const subtype = item.value[5]
			const dependencies = dedup(item.value[6])
			const conditionalFor = dedup(item.value[7])
			// for future use:
			// const lastHistoryEntry = item.value[8]
			// const lastCommentEntry = item.value[9]
			const reqAreaItemColor = item.value[10] || null
			const sprintId = item.value[11]
			const lastAttachmentAddition = item.value[12] || 0
			const lastChange = item.value[13] || 0
			const lastCommentAddition = item.value[14] || 0
			const lastCommentToHistory = item.value[15] || 0
			const lastContentChange = item.value[16] || 0
			const lastPositionChange = item.value[17] || 0
			const lastStateChange = item.value[18] || 0

			// initialize with the root document
			if (itemLevel === 1) {
				rootState.treeNodes = [
					{
						path: [0],
						pathStr: '[0]',
						ind: 0,
						level: itemLevel,
						productId: null,
						parentId: null,
						_id,
						dependencies,
						conditionalFor,
						title,
						isLeaf: false,
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
							lastChange: 0
						},
						tmp: {}
					}
				]
				parentNodes.root = rootState.treeNodes[0]
				state.docsCount++
				state.insertedCount++
				continue
			}
			// create req areas to title mapper and req areas to color mapper
			if (productId === AREA_PRODUCTID) {
				if (itemLevel === 3) {
					rootState.reqAreaMapper[_id] = title
					rootState.colorMapper[_id] = { reqAreaItemColor }
				}
				continue
			}
			// skip the items of the products the user is not authorized to
			if (!rootGetters.getMyAssignedProductIds.includes(productId)) continue

			// skip the items of the products the user is not subscribed to
			if (!rootGetters.getMyProductSubscriptions.includes(productId)) continue

			// create a map with product titles
			if (itemLevel === 2) {
				rootState.productTitlesMap[_id] = title
			}

			state.docsCount++

			// expand the default product up to the feature level
			const isExpanded = productId === rootGetters.getCurrentDefaultProductId ? itemLevel < LEVEL.FEATURE : itemLevel < LEVEL.PRODUCT
			const doShow = productId === rootGetters.getCurrentDefaultProductId ? itemLevel <= LEVEL.FEATURE : itemLevel <= LEVEL.PRODUCT

			const isDraggable = itemLevel > LEVEL.PRODUCT
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
					pathStr: JSON.stringify(path),
					ind,
					level: itemLevel,
					productId,
					parentId,
					_id,
					dependencies,
					conditionalFor,
					title,
					isLeaf: itemLevel === LEVEL.TASK,
					children: [],
					isExpanded,
					isSelectable: true,
					isDraggable,
					isSelected: _id === rootGetters.getCurrentDefaultProductId,
					doShow,
					data: {
						lastAttachmentAddition,
						lastChange,
						lastCommentAddition,
						lastCommentToHistory,
						lastContentChange,
						lastPositionChange,
						lastStateChange,
						priority,
						reqarea,
						reqAreaItemColor,
						sprintId,
						state: itemState,
						subtype,
						team
					},
					tmp: {}
				}

				state.insertedCount++

				if (_id === rootGetters.getCurrentDefaultProductId) {
					rootState.selectedNodes = [newNode]
				}

				parentNode.children.push(newNode)
				parentNodes[_id] = newNode
			} else {
				state.orphansCount++
				orphansFound.push({ id: _id, parentId, productId })
			}
		}
		window.slVueTree.setDescendantsReqArea()
		window.slVueTree.dependencyViolationsFound()
	}
}

const actions = {
	/* Load current default user product and start loading the tree */
	loadProductDetails({
		rootState,
		rootGetters,
		state,
		commit,
		dispatch
	}) {
		parentNodes = {}
		orphansFound = []
		levelErrorsFound = []
		state.docsCount = 0
		state.insertedCount = 0
		state.orphansCount = 0
		state.levelErrorCount = 0
		const _id = rootGetters.getCurrentDefaultProductId
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/' + _id
		}).then(res => {
			rootState.currentProductId = _id
			rootState.currentProductTitle = res.data.title
			commit('updateNodesAndCurrentDoc', { newDoc: res.data })
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('loadProductDetails: product document with _id ' + _id + ' is loaded from database ' + rootState.userData.currentDb)
			dispatch('loadAssignedAndSubscribed')
		}).catch(error => {
			let msg = `loadProductDetails: Could not read current product document with id ${_id} from database ${rootState.userData.currentDb}`
			if (error.response && error.response.status === 404) {
				msg += ', is your default product deleted?'
			}
			dispatch('doLog', { event: msg, level: SEV.ERROR })
		})
	},

	/* Load the current product first */
	loadAssignedAndSubscribed({
		rootState,
		rootGetters,
		state,
		commit,
		dispatch
	}) {
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/details'
		}).then(res => {
			rootState.lastTreeView = 'detailProduct'
			rootState.loadedTreeDepth = LEVEL.TASK
			rootState.loadedSprintId = null
			rootState.productTitlesMap = {}
			commit('processProducts', { rootState, rootGetters, batch: res.data.rows })
			commit('showLastEvent', { txt: `${state.docsCount} documents are read. ${state.insertedCount} items are inserted. ${state.orphansCount} orphans are skipped`, severity: SEV.INFO })
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
			// all products are read; do not start listenForChanges again after sign-out/in
			if (!rootState.listenForChangesRunning) {
				dispatch('listenForChanges')
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log('loadAssignedAndSubscribed: listenForChanges is started')
			}
			// reset load parameters
			parentNodes = {}
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(res.data.rows.length + ' documents are loaded')
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(`loadAssignedAndSubscribed: Could not read a product from database ${rootState.userData.currentDb}, ${error}`)
		})
	}
}

export default {
	state,
	mutations,
	actions
}
