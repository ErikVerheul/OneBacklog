// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other (async) database updates are done.
import { SEV, LEVEL } from '../../constants.js'
import { collapseNode, isInPath } from '../../common_functions.js'
import globalAxios from 'axios'

const state = {
	resetFilter: null,
	resetSearchOnId: null,
	resetSearchOnTitle: null,
	itemId: '',
	keyword: '',
}

const mutations = {
	resetSearchesAndFilters(state) {
		state.resetFilter = null
		state.resetSearchOnId = null
		state.resetSearchOnTitle = null
	},
}

const getters = {
	isResetFilterSet(state) {
		return state.resetFilter !== null
	},
}

const actions = {
	/*
	 * Traverse the tree to save the view state before change
	 * No async calls are made. Cannot be a mutation as getters are used
	 */
	saveTreeView({ rootState }, payload) {
		rootState.helpersRef.traverseModels((nm) => {
			if (payload.type === 'condition') {
				nm.tmp.savedIsExpandedInCondition = nm.isExpanded
				nm.tmp.savedDoShowInCondition = nm.doShow
				nm.tmp.savedHighLigthsInCondition = {
					isHighlighted_1: nm.tmp.isHighlighted_1,
					isHighlighted_2: nm.tmp.isHighlighted_2,
					isWarnLighted: nm.tmp.isWarnLighted,
				}
			}

			if (payload.type === 'dependency') {
				nm.tmp.savedIsExpandedInDependency = nm.isExpanded
				nm.tmp.savedDoShowInDependency = nm.doShow
				nm.tmp.savedHighLigthsInDependency = {
					isHighlighted_1: nm.tmp.isHighlighted_1,
					isHighlighted_2: nm.tmp.isHighlighted_2,
					isWarnLighted: nm.tmp.isWarnLighted,
				}
			}

			if (payload.type === 'findId') {
				nm.tmp.savedIsExpandedInFindId = nm.isExpanded
				nm.tmp.savedDoShowInFindId = nm.doShow
				nm.tmp.savedHighLigthsInFindId = {
					isHighlighted_1: nm.tmp.isHighlighted_1,
					isHighlighted_2: nm.tmp.isHighlighted_2,
					isWarnLighted: nm.tmp.isWarnLighted,
				}
			}

			if (payload.type === 'filter') {
				nm.tmp.savedIsExpandedInFilter = nm.isExpanded
				nm.tmp.savedDoShowInFilter = nm.doShow
				nm.tmp.savedHighLigthsInFilter = {
					isHighlighted_1: nm.tmp.isHighlighted_1,
					isHighlighted_2: nm.tmp.isHighlighted_2,
					isWarnLighted: nm.tmp.isWarnLighted,
				}
			}

			if (payload.type === 'titles') {
				nm.tmp.savedIsExpandedInTitles = nm.isExpanded
				nm.tmp.savedDoShowInTitles = nm.doShow
				nm.tmp.savedHighLigthsInTitles = {
					isHighlighted_1: nm.tmp.isHighlighted_1,
					isHighlighted_2: nm.tmp.isHighlighted_2,
					isWarnLighted: nm.tmp.isWarnLighted,
				}
			}
			// remove highLights
			delete nm.tmp.isHighlighted_1
			delete nm.tmp.isHighlighted_2
			delete nm.tmp.isWarnLighted
		}, payload.nodesToScan)
	},

	/*
	 * Traverse the tree to reset to the state before the view change
	 * Do not hide the currently selected node
	 * No async calls are made. Cannot be a mutation as getters are used
	 */
	restoreTreeView({ rootState, state, rootGetters }, type) {
		function resetHighLights(node, highLights) {
			if (highLights && Object.keys(highLights).length > 0) {
				node.tmp.isHighlighted_1 = !!highLights.isHighlighted_1
				node.tmp.isHighlighted_2 = !!highLights.isHighlighted_2
				node.tmp.isWarnLighted = !!highLights.isWarnLighted
			}
		}

		const selectedNodePath = rootGetters.getSelectedNode.path
		let nodesToScan = undefined
		switch (type) {
			case 'condition':
				nodesToScan = rootState.helpersRef.getProductNodes()
				break
			case 'dependency':
				nodesToScan = rootState.helpersRef.getProductNodes()
				break
			case 'findId':
				nodesToScan = state.resetSearchOnId.nodesTouched
				break
			case 'filter':
				nodesToScan = state.resetFilter.nodesTouched
				break
			case 'titles':
				nodesToScan = state.resetSearchOnTitle.nodesTouched
				break
		}

		rootState.helpersRef.traverseModels((nm) => {
			// reset the view state
			if (type === 'condition') {
				if (!isInPath(nm.path, selectedNodePath)) {
					nm.isExpanded = nm.tmp.savedIsExpandedInCondition
					nm.doShow = nm.tmp.savedDoShowInCondition
				}
				delete nm.tmp.savedIsExpandedInCondition
				delete nm.tmp.savedDoShowInCondition
				resetHighLights(nm, nm.tmp.savedHighLigthsInCondition)
			}

			if (type === 'dependency') {
				if (!isInPath(nm.path, selectedNodePath)) {
					nm.isExpanded = nm.tmp.savedIsExpandedInDependency
					nm.doShow = nm.tmp.savedDoShowInDependency
				}
				delete nm.tmp.savedIsExpandedInDependency
				delete nm.tmp.savedDoShowInDependency
				resetHighLights(nm, nm.tmp.savedHighLigthsInDependency)
			}

			if (type === 'findId') {
				if (!isInPath(nm.path, selectedNodePath)) {
					nm.isExpanded = nm.tmp.savedIsExpandedInFindId
					nm.doShow = nm.tmp.savedDoShowInFindId
				}
				delete nm.tmp.savedIsExpandedInFindId
				delete nm.tmp.savedDoShowInFindId
				resetHighLights(nm, nm.tmp.savedHighLigthsInFindId)
			}

			if (type === 'filter') {
				if (!isInPath(nm.path, selectedNodePath)) {
					nm.isExpanded = nm.tmp.savedIsExpandedInFilter
					nm.doShow = nm.tmp.savedDoShowInFilter
				}
				delete nm.tmp.savedIsExpandedInFilter
				delete nm.tmp.savedDoShowInFilter
				resetHighLights(nm, nm.tmp.savedHighLigthsInFilter)
			}

			if (type === 'titles') {
				if (!isInPath(nm.path, selectedNodePath)) {
					nm.isExpanded = nm.tmp.savedIsExpandedInTitles
					nm.doShow = nm.tmp.savedDoShowInTitles
				}
				delete nm.tmp.savedIsExpandedInTitles
				delete nm.tmp.savedDoShowInTitles
				resetHighLights(nm, nm.tmp.savedHighLigthsInTitles)
			}
			// if nodesToScan is undefined the full tree is scanned
		}, nodesToScan)
	},

	/* Find a full or short id in whithin all product branches */
	findItemOnId({ rootState, dispatch, commit }, payload) {
		const SHORTKEYLENGTH = 5
		const id = payload.id
		// scan all items of the current products
		const isShortId = id.length === SHORTKEYLENGTH
		let nodeFound
		rootState.helpersRef.traverseModels((nm) => {
			if ((isShortId && nm._id.slice(-5) === id) || (!isShortId && nm._id === id)) {
				// short id or full id did match
				nodeFound = nm
				return false
			}
		}, rootState.helpersRef.getProductNodes())

		if (nodeFound) {
			// select the node after loading the document
			dispatch('loadDoc', {
				id: nodeFound._id,
				onSuccessCallback: () => {
					const nodesOnPath = rootState.helpersRef.getUnexpandedNodesOnPath(nodeFound)
					// create reset object
					state.resetSearchOnId = {
						nodesTouched: nodesOnPath,
					}
					// save display state of the branch up to the found node
					dispatch('saveTreeView', { type: 'findId', nodesToScan: nodesOnPath })
					// expand the tree view up to the found item
					rootState.helpersRef.showPathToNode(nodeFound, { noHighLight: true })
					commit('renewSelectedNodes', nodeFound)
					commit('addToEventList', {
						txt: `The item with full Id ${nodeFound._id} is found and selected in product '${rootState.currentProductTitle}'`,
						severity: SEV.INFO,
					})
				},
			})
		} else {
			// the node is not found in the current product selection; try to find it in the database using the short id
			const lookUpId = isShortId ? id : id.slice(-5)
			dispatch('loadItemByShortId', lookUpId)
		}
	},

	/* Load a backlog item by short id */
	loadItemByShortId({ rootState, rootGetters, dispatch, commit }, shortId) {
		const rangeStr = `/_design/design1/_view/shortIdFilter?startkey=["${shortId}"]&endkey=["${shortId}"]&include_docs=true`
		globalAxios({
			method: 'GET',
			url: rootState.userData.currentDb + rangeStr,
		})
			.then((res) => {
				const rows = res.data.rows
				if (rows.length > 0) {
					if (rootState.debug) console.log('loadItemByShortId: ' + rows.length + ' documents are found')
					// take the fist document found
					const doc = rows[0].doc
					if (rootGetters.getMyAssignedProductIds.includes(doc.productId)) {
						if (rootGetters.getMyProductSubscriptionIds.includes(doc.productId)) {
							if (rows.length > 1) {
								commit('addToEventList', { txt: `${rows.length} documents with id ${shortId} are found. The first one is displayed`, severity: SEV.INFO })
								let ids = ''
								for (let i = 0; i < rows.length; i++) {
									ids += rows[i].doc._id + ', '
								}
								const msg = 'Multiple documents found for shortId ' + shortId + ' The documents ids are ' + ids
								dispatch('doLog', { event: msg, level: SEV.WARNING })
							}
							commit('updateNodewithDocChange', { newDoc: doc })
						} else {
							commit('addToEventList', {
								txt: `The document with id ${doc._id} is found but not in your selected products. Select all products and try again`,
								severity: SEV.INFO,
							})
						}
					} else {
						commit('addToEventList', { txt: `The document with id ${doc._id} is found but not in your assigned products`, severity: SEV.WARNING })
					}
				} else commit('addToEventList', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: SEV.WARNING })
			})
			.catch(() => {
				commit('addToEventList', { txt: `The document with short id ${shortId} is NOT found in the database`, severity: SEV.WARNING })
			})
	},

	/* Find all items with the key as a substring in their title in the currently selected branch */
	seachOnTitle({ rootState, dispatch, commit, rootGetters }) {
		const branchHead = rootGetters.getSelectedNode
		const nodesFound = []
		// save display state of the branch
		dispatch('saveTreeView', { type: 'titles', nodesToScan: [branchHead] })
		rootState.helpersRef.traverseModels(
			(nm) => {
				if (nm.title.toLowerCase().includes(state.keyword.toLowerCase())) {
					// expand the product up to the found item and highlight it
					rootState.helpersRef.showPathToNode(nm, { doHighLight_1: true })
					nodesFound.push(nm)
				} else {
					// collapse nodes with no findings in their subtree
					if (nm.level > LEVEL.PRODUCT) {
						if (nm.isExpanded) {
							collapseNode(nm)
						}
					}
				}
			},
			[branchHead],
		)

		// create reset object
		state.resetSearchOnTitle = {
			nodesTouched: [branchHead],
		}

		if (nodesFound.length > 0) {
			// load and select the first node found
			dispatch('loadDoc', {
				id: nodesFound[0]._id,
				onSuccessCallback: () => {
					commit('renewSelectedNodes', nodesFound[0])
					if (nodesFound.length === 1) {
						commit('addToEventList', { txt: `One item title matches your search in branch '${branchHead.title}'. This item is selected`, severity: SEV.INFO })
					} else
						commit('addToEventList', {
							txt: `${nodesFound.length} item titles match your search in branch '${branchHead.title}'. The first match is selected`,
							severity: SEV.INFO,
						})
				},
			})
		} else commit('addToEventList', { txt: `No item titles match your search in branch '${branchHead.title}'`, severity: SEV.INFO })
	},

	resetFindOnId({ state, dispatch, commit }) {
		if (!state.resetSearchOnId) {
			// there is no pending search or the search did not find a node
			state.itemId = ''
			return
		}
		dispatch('restoreTreeView', 'findId')
		commit('addToEventList', { txt: 'The search for an item on Id is cleared', severity: SEV.INFO })
		state.itemId = ''
		state.resetSearchOnId = null
	},

	resetSearchInTitles({ state, dispatch, commit }) {
		if (!state.resetSearchOnTitle) {
			// there is no pending search on titles or the search did not find a node
			state.keyword = ''
			return
		}
		dispatch('restoreTreeView', 'titles')
		commit('addToEventList', { txt: `The search for item titles is cleared`, severity: SEV.INFO })
		state.keyword = ''
		state.resetSearchOnTitle = null
	},

	/* Reset the filter to the tree state as before the filter was set */
	resetFilterAction({ state, dispatch, commit }) {
		dispatch('restoreTreeView', 'filter')
		commit('addToEventList', { txt: `Your filter is cleared`, severity: SEV.INFO })
		state.resetFilter = null
	},
}

export default {
	state,
	mutations,
	getters,
	actions,
}
