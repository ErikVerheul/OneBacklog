import { SEV, LEVEL, MISC } from '../../constants.js'
import { dedup } from '../../common_functions.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)

var parentNodes
var orphansFound
var levelErrorsFound

const state = {
	docsCount: 0,
	insertedCount: 0,
	orphansCount: 0,
	levelErrorCount: 0
}

const actions = {
	/* Load all items from all products */
	loadOverview({
		rootState,
		rootGetters,
		state,
		dispatch,
		commit
	}) {
		parentNodes = {}
		orphansFound = []
		levelErrorsFound = []
		state.docsCount = 0
		state.insertedCount = 0
		state.orphansCount = 0
		state.levelErrorCount = 0
		rootState.productTitlesMap = {}
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + '/_design/design1/_view/overview'
		}).then(res => {
			rootState.lastTreeView = 'coarseProduct'
			rootState.loadedTreeDepth = LEVEL.FEATURE
			rootState.loadedSprintId = null
			const batch = res.data.rows
			for (const item of batch) {
				const _id = item.id
				// the productId of the 'requirement-areas' top dummy product document is null to have it ordened below root in the details view
				const productId = item.key[1] || MISC.AREA_PRODUCTID
				const itemLevel = item.key[2]
				const priority = -item.key[3]
				const parentId = item.value[1]
				const reqarea = item.value[0] || null
				const itemState = item.value[2]
				const title = item.value[3]
				const team = item.value[4]
				const subtype = item.value[5]
				const dependencies = dedup(item.value[6])
				const conditionalFor = dedup(item.value[7])
				const reqAreaItemColor = item.value[10] || null
				const sprintId = item.value[11]
				const lastAttachmentAddition = item.value[12] || 0
				const lastChange = item.value[13] || 0
				const lastCommentAddition = item.value[14] || 0
				const lastCommentToHistory = item.value[15] || 0
				const lastContentChange = item.value[16] || 0
				const lastPositionChange = item.value[17] || 0
				const lastStateChange = item.value[18] || 0

				if (itemLevel === 1) {
					state.docsCount++
					// initialize with the root document
					rootState.treeNodes = [
						{
							path: [0],
							pathStr: '[0]',
							ind: 0,
							level: itemLevel,
							productId,
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
					state.insertedCount++
					continue
				}

				// skip the items of the products the user is not authorized to
				if (productId !== MISC.AREA_PRODUCTID && !rootGetters.getMyAssignedProductIds.includes(productId)) continue

				// skip the items of the products the user is not subscribed to
				if (productId !== MISC.AREA_PRODUCTID && !rootGetters.getMyProductSubscriptions.includes(productId)) continue

				// create a map with product titles
				if (itemLevel === 2) {
					rootState.productTitlesMap[_id] = title
				}

				state.docsCount++
				// expand the default product up to the feature level
				const isExpanded = productId === rootGetters.getCurrentDefaultProductId ? itemLevel < LEVEL.FEATURE : itemLevel < LEVEL.PRODUCT
				const doShow = productId === rootGetters.getCurrentDefaultProductId ? itemLevel <= LEVEL.FEATURE : itemLevel <= LEVEL.PRODUCT
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
						pathStr: JSON.stringify(path),
						ind,
						level: itemLevel,
						productId,
						parentId,
						_id,
						dependencies,
						conditionalFor,
						title,
						isLeaf: itemLevel === LEVEL.FEATURE,
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
			window.slVueTree.dependencyViolationsFound()
			commit('createColorMapper')
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
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(batch.length + ' documents are loaded')
			parentNodes = {}
		}).catch(error => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(`loadOverview: Could not read from database ${rootState.userData.currentDb}, ${error}`)
		})
	}
}

export default {
	state,
	actions
}
