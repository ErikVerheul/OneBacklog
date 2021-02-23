import globalAxios from 'axios'
import router from '../router'
import { expandNode, collapseNode, addToArray, removeFromArray } from '../common_functions.js'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
import { SEV, LEVEL, STATE, MISC } from '../constants.js'
import Vue from 'vue'
import Vuex from 'vuex'
import attachments from './modules/attachments'
import authentication from './modules/authentication'
import calendars from './modules/calendars'
import clone from './modules/clone'
import dependencies from './modules/dependencies'
import help from './modules/help'
import initdb from './modules/initdb'
import loadoverview from './modules/load_coarse'
import loadproducts from './modules/load_detail'
import logging from './modules/logging'
import move from './modules/move'
import planningboard from './modules/planningboard'
import removebranch from './modules/removebranch'
import restorebranches from './modules/restorebranches'
import startup from './modules/startup'
import sync from './modules/sync'
import teams from './modules/teams'
import traverstree from './modules/traverstree'
import undo from './modules/undo'
import update from './modules/update'
import useracc from './modules/useracc'
import utils from './modules/utils'


const MAX_EVENTLIST_SIZE = 100

function createEvent(payload) {
	function pad(num, size) {
		var s = "000" + num
		return s.substr(s.length - size)
	}
	const now = new Date()
	let color = '#408FAE'
	let severityStr = 'INFO'
	switch (payload.severity) {
		case SEV.DEBUG:
			severityStr = 'DEBUG'
			color = 'yellow'
			break
		case SEV.INFO:
			severityStr = 'INFO'
			color = '#408FAE'
			break
		case SEV.WARNING:
			severityStr = 'WARNING'
			color = 'orange'
			break
		case SEV.ERROR:
			severityStr = 'ERROR'
			color = 'red'
			break
		case SEV.CRITICAL:
			severityStr = 'CRITICAL'
			color = '#ff5c33'
	}
	const newEvent = {
		eventKey: payload.eventKey,
		time: `${now.toLocaleTimeString()}.${pad(now.getMilliseconds(), 3)}`,
		txt: payload.txt,
		severity: severityStr,
		color
	}
	return newEvent
}

Vue.use(Vuex)

/* If the node is selectable, store the currently selected nodes, unselect all previous selected nodes and select the node */
function renewSelection(state, node) {
	if (node.isSelectable) {
		state.previousSelectedNodes = state.selectedNodes || [node]
		for (const n of state.selectedNodes) n.isSelected = false
		node.isSelected = true
		state.selectedNodes = [node]
	}
}

/* Remove 'ignoreEvent' elements from history */
function cleanHistory(doc) {
	const cleanedHistory = []
	for (const h of doc.history) {
		if (Object.keys(h)[0] !== 'ignoreEvent') cleanedHistory.push(h)
	}
	doc.history = cleanedHistory
	return doc
}

export default new Vuex.Store({
	state: {
		// console log settings
		debug: process.env.VUE_APP_DEBUG === 'true' || false,
		debugConnectionAndLogging: process.env.VUE_APP_DEBUG_CONNECTION === 'true' || false,
		// creating a CouchDb instance
		createDefaultCalendar: false,
		isDatabaseInitiated: false,
		// logging
		logState: {
			logSavePending: false,
			runningWatchdogId: null,
			savedLogs: [],
			unsavedLogs: []
		},

		// authentication, refresh every 9 minutes (CouchDB defaults at 10 min.)
		cookieRefreshInterval: 540,
		mySessionId: null,
		// startup
		availableProductIds: [],
		currentProductId: null,
		currentProductTitle: '',
		iAmAPO: false,
		iAmAdmin: false,
		iAmAssistAdmin: false,
		iAmServerAdmin: false,
		myAssignedDatabases: undefined,
		// tree loading
		allTeams: {},
		loadedTreeDepth: undefined,
		productTitlesMap: {},
		treeNodes: [],
		// detail tree view
		reqAreaMapper: {},
		// coarse tree view
		currentView: undefined,
		colorMapper: {},
		reqAreaOptions: [],
		// detail & coarse tree views
		currentDoc: null,
		changeHistory: [],
		eventKey: 0,
		eventList: [],
		filterForComment: '',
		filterForHistory: '',
		filterTreeIsSet: false,
		itemId: '',
		keyword: '',
		moveOngoing: false,
		lastTreeView: undefined,
		searchOn: false,
		selectedForView: 'comments',
		previousSelectedNodes: undefined,
		resetSearch: {},
		selectedNodes: [],
		selectNodeOngoing: false,
		uploadDone: true,
		// utilities for server Admin and admin
		areDatabasesFound: false,
		areProductsFound: false,
		areTeamsFound: false,
		areTeamsRemoved: false,
		backendMessages: [],
		currentCalendar: [],
		databaseOptions: undefined,
		fetchedTeams: [],
		isCurrentDbChanged: false,
		isDatabaseCreated: false,
		isDbDeleted: false,
		isHistAndCommReset: false,
		isLogLoaded: false,
		isProductAssigned: false,
		isProductCreated: false,
		isPurgeReady: false,
		isDefaultCalendarFound: false,
		isTeamCalendarFound: false,
		isCalendarSaved: false,
		isRestoreReady: false,
		isTeamCreated: false,
		isUserCreated: false,
		isUserDeleted: false,
		isUserFound: false,
		isUserRemoved: false,
		isUserUpdated: false,
		logEntries: [],
		selectedDatabaseName: '',
		seqKey: 0,
		teamsToRemoveIds: [],
		userOptions: [],
		warning: '',
		// traverseTree
		descendantIds: [],
		// app wide globals
		configData: null,
		demo: process.env.VUE_APP_IS_DEMO === 'true' || false,
		eventSyncColor: '#004466',
		listenForChangesRunning: false,
		myProductOptions: [],
		online: true,
		showHeaderDropDowns: true,
		userData: {},
		// planning board
		cannotImportProducts: [],
		loadedSprintId: null,
		sprintCalendar: [],
		stories: [],
		warningText: ''
	},

	getters: {
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},

		isFollower(state) {
			if (!state.currentDoc.followers) return false

			const emails = state.currentDoc.followers.map(e => e.email)
			if (state.currentDoc) return emails.includes(state.userData.email)
		},

		isReqAreaTopLevel(state) {
			return state.currentDoc._id === MISC.AREA_PRODUCTID
		},

		isReqAreaItem(state) {
			return state.currentDoc._id === MISC.AREA_PRODUCTID || state.currentDoc.productId === MISC.AREA_PRODUCTID
		},

		getCurrentDefaultProductId(state) {
			if (state.userData.myDatabases) {
				const currentDbSettings = state.userData.myDatabases[state.userData.currentDb]
				if (currentDbSettings && Object.keys(currentDbSettings.productsRoles).length > 0) {
					// the first (index 0) product in the current db subscriptions is by definition the default product
					return currentDbSettings.subscriptions[0]
				}
			}
		},

		getCurrentItemTsSize(state) {
			if (state.configData) return state.configData.tsSize[state.currentDoc.tssize]
		},

		getCurrentItemLevel(state) {
			if (state.currentDoc) return state.currentDoc.level
		},

		getCurrentItemState(state) {
			if (state.currentDoc) return state.currentDoc.state
		},

		getFilterButtonText(state) {
			let txt = 'Filter in tree view'
			if (state.filterTreeIsSet) {
				txt = 'Clear filter'
				if (state.resetSearch.searchType === 'findItemOnId') {
					txt += ' and Id selection'
				}
				if (state.resetSearch.searchType === 'searchInTitles') {
					txt += ' and title search'
				}
			}
			return txt
		},

		getItemSprintName(state) {
			if (state.currentDoc.sprintId && state.sprintCalendar) {
				for (const s of state.sprintCalendar) {
					if (s.id === state.currentDoc.sprintId) return s.name
				}
			}
		},

		getLastEventTxt(state) {
			if (state.eventList[0]) return state.eventList[0].txt
		},

		getLastEventColor(state) {
			if (state.eventList[0]) {
				return state.eventList[0].color
			}
		},

		/* Return the last selected node or undefined when no node is selected */
		getLastSelectedNode(state) {
			return state.selectedNodes.slice(-1)[0]
		},

		getMyGenericRoles(state) {
			const genericRoles = []
			if (state.iAmAssistAdmin && !state.iAmAdmin) genericRoles.push('assistAdmin')
			if (state.iAmAdmin) genericRoles.push('admin')
			if (state.iAmAPO) genericRoles.push('APO')
			return genericRoles
		},

		/* Return the number of products in the currrent database */
		getMyProductsCount(state) {
			if (state.userData.myDatabases) {
				const productsRoles = state.userData.myDatabases[state.userData.currentDb].productsRoles
				return Object.keys(productsRoles).length
			}
		},

		/* Return all my products with my assigned roles in my current database */
		getMyProductsRoles(state) {
			if (state.userData.currentDb) {
				return state.userData.myDatabases[state.userData.currentDb].productsRoles
			}
			return {}
		},

		/* Return the productIds of the products assigned to me in all my assigned databases */
		getAllMyAssignedProductIds(state) {
			const allIds = []
			if (state.userData.myDatabases) {
				for (const db of Object.values(state.userData.myDatabases)) {
					const productsRoles = db.productsRoles
					for (const k of Object.keys(productsRoles)) {
						if (!allIds.includes(k)) allIds.push(k)
					}
				}
			}
			return allIds
		},

		/* Return the productIds of the products assigned to me in my current database */
		getMyAssignedProductIds(state) {
			if (state.userData.myDatabases) {
				const productsRoles = state.userData.myDatabases[state.userData.currentDb].productsRoles
				return Object.keys(productsRoles)
			}
		},

		getMyProductSubscriptions(state, getters) {
			if (state.userData.myDatabases && state.availableProductIds.length > 0) {
				const currentDbSettings = state.userData.myDatabases[state.userData.currentDb]
				let screenedSubscriptions = []
				for (const p of currentDbSettings.subscriptions) {
					if (state.availableProductIds.includes(p)) {
						screenedSubscriptions.push(p)
					}
				}
				if (screenedSubscriptions.length === 0) {
					// if no default is set, assign the first defined product from the productsRoles if present
					const myAssignedProductIds = getters.getMyAssignedProductIds
					if (myAssignedProductIds.length > 0) {
						screenedSubscriptions = myAssignedProductIds[0]
					}
				}
				return screenedSubscriptions
			} else return []
		},

		/* Return the previous selected node or the currently selected node if no previous node was selected */
		getPreviousNodeSelected(state, getters) {
			if (state.previousSelectedNodes) {
				return state.previousSelectedNodes.slice(-1)[0]
			} else return getters.getLastSelectedNode
		},

		isDetailsViewSelected(state) {
			return state.currentView === 'detailProduct'
		},

		isOverviewSelected(state) {
			return state.currentView === 'coarseProduct'
		},

		isPlanningBoardSelected(state) {
			return state.currentView === 'planningBoard'
		},

		leafLevel(state, getters) {
			if (getters.isDetailsViewSelected) return LEVEL.TASK
			if (getters.isOverviewSelected) return LEVEL.FEATURE
			return LEVEL.PBI
		},

		myTeam(state) {
			if (state.userData.myDatabases) {
				return state.userData.myTeam
			}
		},

		/////////////////// generic (not product nor database specific) roles /////////////////
		isServerAdmin(state, getters) {
			return getters.isAuthenticated && state.iAmServerAdmin
		},
		isAdmin(state, getters) {
			return getters.isAuthenticated && state.iAmAdmin
		},
		isAPO(state, getters) {
			return getters.isAuthenticated && state.iAmAPO
		},

		////// generic (but limited to the user's assigned databases and products) role ///////
		isAssistAdmin(state, getters) {
			return getters.isAuthenticated && state.iAmAssistAdmin && !state.iAmAdmin
		},

		//////////////////////////////// product specific roles ///////////////////////////////
		////   available after the the user data are read and the currentProductId is set   ///
		isPO(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes('PO')
			} else return false
		},
		isDeveloper(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes('developer')
			} else return false
		},
		isGuest(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes('guest')
			} else return false
		},
		canCreateComments(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return myCurrentProductRoles &&
					(getters.isServerAdmin || getters.isAssistAdmin || getters.isAdmin || getters.isAPO ||
						myCurrentProductRoles.includes('PO') ||
						myCurrentProductRoles.includes('developer'))
			} else return false
		},
		canSeeAndUploadAttachments(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return myCurrentProductRoles &&
					(getters.isAssistAdmin || getters.isAdmin || getters.isAPO ||
						myCurrentProductRoles.includes('PO') ||
						myCurrentProductRoles.includes('developer'))
			} else return false
		},
		//////////////////////////////// planning board getters //////////////////////////////
		////                     not available in mixins (generic.js)                      ///
		getStoryPoints(state) {
			let sum = 0
			for (const s of state.stories) {
				sum += s.size
			}
			return sum
		},
		getStoryPointsDone(state) {
			let sum = 0
			for (const s of state.stories) {
				if (s.tasks[STATE.TODO].length === 0 &&
					s.tasks[STATE.INPROGRESS].length === 0 &&
					s.tasks[STATE.TESTREVIEW].length === 0 &&
					s.tasks[STATE.DONE].length > 0) sum += s.size
			}
			return sum
		}
	},

	actions: {
		/* Launch additional actions if provided in the payload */
		additionalActions({ state, dispatch }, payload) {
			if (payload.toDispatch) {
				for (const td of payload.toDispatch) {
					const name = Object.keys(td)[0]
					// eslint-disable-next-line no-console
					if (state.debug) console.log('additionalActions: dispatching ' + name)
					dispatch(name, td[name])
				}
			}
		},

		resetTreeFilter({ state, commit }, payload) {
			// eslint-disable-next-line no-console
			if (state.debug) console.log(`resetTreeFilter is called by ${payload.caller}`)
			commit('restoreTreeView', { productModels: payload.productModels, undoHighLight: 'isHighlighted_1' })
			commit('addToEventList', { txt: `Your filter is cleared`, severity: SEV.INFO })
			if (payload.onSuccessCallback) payload.onSuccessCallback()
			// do NOT execute passed actions if provided
		},

		resetFindOnId({ state, dispatch, commit }, payload) {
			// eslint-disable-next-line no-console
			if (state.debug) console.log(`resetFindOnId is called by ${payload.caller}, state.resetSearch.searchType = ${state.resetSearch.searchType}`)
			const node = state.resetSearch.node
			const prevSelectedNode = state.resetSearch.currentSelectedNode
			if (state.resetSearch.view === 'detailProduct' && node.productId !== prevSelectedNode.productId) {
				// the node was found in another product
				commit('switchCurrentProduct', prevSelectedNode.productId)
			} else {
				window.slVueTree.undoShowPath(node, 'search', 'isHighlighted_1')
			}
			// select the node after loading the document
			dispatch('loadDoc', {
				id: prevSelectedNode._id, onSuccessCallback: () => {
					state.itemId = ''
					state.resetSearch = {}
					commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
					commit('addToEventList', { txt: 'The search for an item on Id is cleared', severity: SEV.INFO })
				}
			})
			if (payload.caller === 'findItemOnId' || payload.caller === 'searchInTitles' || payload.caller === 'onSetMyFilters') {
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}
		},

		resetSearchInTitles({ state, dispatch, commit }, payload) {
			const prevSelectedNode = state.resetSearch.currentSelectedNode
			for (const n of state.resetSearch.nodesFound) {
				window.slVueTree.undoShowPath(n, 'search', 'isHighlighted_1')
			}
			for (const n of state.resetSearch.nodesCollapsed) {
				expandNode(n)
			}
			// select the node after loading the document
			dispatch('loadDoc', {
				id: prevSelectedNode._id, onSuccessCallback: () => {
					state.keyword = ''
					state.resetSearch = {}
					commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
					commit('addToEventList', { txt: `The search for item titles is cleared`, severity: SEV.INFO })
				}
			})
			if (payload.caller === 'findItemOnId' || payload.caller === 'searchInTitles' || payload.caller === 'onSetMyFilters') {
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}
		},

		/* Clear any outstanding searches and execute the callback and/or actions if provided */
		resetAnySearches({ state, dispatch }, payload) {
			if (state.resetSearch.searchType) {
				// only one search can/will be reset
				if (state.resetSearch.searchType === 'findItemOnId') {
					dispatch('resetFindOnId', payload)
				}
				if (state.resetSearch.searchType === 'searchInTitles') {
					dispatch('resetSearchInTitles', payload)
				}
			} else {
				// no searches were set; execute the callbacks
				if (payload.onSuccessCallback) payload.onSuccessCallback()
				// execute passed actions if provided
				dispatch('additionalActions', payload)
			}
		},

		/* Clear any outstanding filters and searches and execute the callback and/or actions if provided */
		resetFilterAndSearches({ state, dispatch }, payload) {
			if (state.filterTreeIsSet) {
				// create an action to reset the tree filter after the searches are reset
				payload.toDispatch = [{ 'resetTreeFilter': payload }]
			}
			dispatch('resetAnySearches', payload)
		},

		/* Add the product to my profile and update my available products and my product options	*/
		addToMyProducts({ state, dispatch }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user
			}).then(res => {
				const updateProducts = () => {
					if (!state.availableProductIds.includes(payload.productId)) {
						// add the id to my available products
						state.availableProductIds = addToArray(state.availableProductIds, payload.productId)
					}
					// add an object to my product options
					state.myProductOptions = addToArray(state.myProductOptions, {
						value: payload.productId,
						text: payload.productTitle
					})
				}

				// prevent updating the user's profile twice
				if (payload.isSameUserInDifferentSession) {
					state.userData.myDatabases[state.userData.currentDb].productsRoles[payload.productId] = payload.newRoles
					state.userData.myDatabases[state.userData.currentDb].subscriptions = addToArray(state.userData.myDatabases[state.userData.currentDb].subscriptions, payload.productId)
					updateProducts()
				} else {
					const tmpUserData = res.data
					tmpUserData.myDatabases[tmpUserData.currentDb].productsRoles[payload.productId] = payload.newRoles
					tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = addToArray(tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions, payload.productId)
					dispatch('updateUser', { data: tmpUserData, onSuccessCallback: updateProducts })
				}
			}).catch(error => {
				const msg = `addToMyProducts: User ${state.userData.user} cannot save its updated profile. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		},

		/* Remove the product from my profile and update my available products and my product options	*/
		removeFromMyProducts({ state, getters, dispatch, commit }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user
			}).then(res => {
				const updateProducts = () => {
					if (state.availableProductIds.includes(payload.productId)) {
						// delete the id from my available products
						state.availableProductIds = removeFromArray(state.availableProductIds, payload.productId)
					}
					const newOptions = []
					for (const o of state.myProductOptions) {
						// delete the removed option object
						if (o.value !== payload.productId) newOptions.push(o)
					}
					state.myProductOptions = newOptions
					if (payload.signOut) {
						commit('endSession')
						router.replace('/')
					}
				}

				// prevent updating the user's profile twice
				if (payload.isSameUserInDifferentSession) {
					// delete product from my profile
					delete state.userData.myDatabases[state.userData.currentDb].productsRoles[payload.productId]
					updateProducts()
				} else {
					const tmpUserData = res.data
					// delete product from my profile
					delete tmpUserData.myDatabases[tmpUserData.currentDb].productsRoles[payload.productId]
					if (getters.getMyProductSubscriptions.includes(payload.productId)) {
						// delete the id from my subscriptions
						tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = removeFromArray(tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions, payload.productId)
					}
					dispatch('updateUser', { data: tmpUserData, onSuccessCallback: updateProducts })
				}
			}).catch(error => {
				const msg = `removeFromMyProducts: User ${state.userData.user} cannot save its updated profile. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		},

		updateMyProductSubscriptions({ state, dispatch }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user
			}).then(res => {
				const tmpUserData = res.data
				tmpUserData.myDatabases[state.userData.currentDb].subscriptions = payload.productIds
				dispatch('updateUser', { data: tmpUserData, onSuccessCallback: payload.onSuccessCallback })
			}).catch(error => {
				const msg = `updateMyProductSubscriptions: User ${state.userData.user} cannot save its updated profile. ${error}`
				dispatch('doLog', { event: msg, level: SEV.ERROR })
			})
		}
	},

	mutations: {
		addToEventList(state, payload) {
			state.eventKey++
			const newEvent = createEvent({ txt: payload.txt, severity: payload.severity, eventKey: state.eventKey, eventList: state.eventList })
			state.eventList.unshift(newEvent)
			state.eventList = state.eventList.slice(0, MAX_EVENTLIST_SIZE)
		},

		/* Store my user data in memory */
		setMyUserData(state, payload) {
			state.userData.myTeam = payload.myDatabases[payload.currentDb].myTeam
			state.userData.currentDb = payload.currentDb
			state.userData.email = payload.email
			state.userData.roles = payload.roles
			state.userData.myDatabases = payload.myDatabases
			state.userData.myProductViewFilterSettings = payload.myProductViewFilterSettings
			state.userData.myFilterSettings = payload.myDatabases[payload.currentDb].filterSettings
			state.userData.doNotAskForImport = payload.doNotAskForImport
		},

		/* Create or re-create the color mapper from the defined req areas (only available in Products overview) */
		createColorMapper(state) {
			const currReqAreaNodes = window.slVueTree.getReqAreaNodes()
			if (currReqAreaNodes) {
				state.colorMapper = {}
				for (const nm of currReqAreaNodes) {
					state.colorMapper[nm._id] = { reqAreaItemColor: nm.data.reqAreaItemColor }
				}
			}
		},

		/* Change one color; must create a new object for reactivity */
		updateColorMapper(state, payload) {
			const newColorMapper = {}
			for (const id of Object.keys(state.colorMapper)) {
				if (id === payload.id) {
					newColorMapper[id] = { reqAreaItemColor: payload.newColor }
				} else newColorMapper[id] = state.colorMapper[id]
			}
			state.colorMapper = newColorMapper
		},

		mustCreateDefaultCalendar(state) {
			state.createDefaultCalendar = true
		},

		addSelectedNode(state, newNode) {
			if (newNode.isSelectable) {
				state.previousSelectedNodes = state.selectedNodes || [newNode]
				newNode.isSelected = true
				if (!state.selectedNodes.includes(newNode)) state.selectedNodes.push(newNode)
			}
		},

		renewSelectedNodes(state, newNode) {
			renewSelection(state, newNode)
		},

		/* Traverse the tree to reset to the state before filtering or search */
		restoreTreeView(state, payload) {
			// traverse the tree to reset to the state before filtering
			window.slVueTree.traverseModels((nm) => {
				// skip requirement areas dummy product items
				if (nm._id === MISC.AREA_PRODUCTID) return
				if (state.currentView === 'detailProduct') {
					// skip product level and above (smaller level number)
					if (nm.level <= LEVEL.PRODUCT) return
				} else {
					// skip database level and above (smaller level number)
					if (nm.level <= LEVEL.DATABASE) return
				}
				delete nm.tmp[payload.undoHighLight]
				// reset the view state
				nm.isExpanded = nm.tmp.savedIsExpandedInFilter
				delete nm.tmp.savedIsExpandedInFilter
				nm.doShow = nm.tmp.savedDoShowInFilter
				delete nm.tmp.savedDoShowInFilter
				state.filterTreeIsSet = false
			}, payload.productModels)
		},

		updateNodesAndCurrentDoc(state, payload) {
			if (payload.newNode) {
				renewSelection(state, payload.newNode)
			}

			if (payload.newDoc) {
				// decode from base64 + replace the encoded data
				payload.newDoc.description = window.atob(payload.newDoc.description)
				payload.newDoc.acceptanceCriteria = window.atob(payload.newDoc.acceptanceCriteria)
				// replace the currently loaded document
				state.currentDoc = cleanHistory(payload.newDoc)
			}

			if (!payload.newNode && !payload.newDoc) {
				const node = payload.node || payload.selectNode || payload.unselectNode
				const keys = Object.keys(payload)
				if (node) {
					// apply changes on the nodes in the tree view
					for (const k of keys) {
						switch (k) {
							case '_attachments':
								// not stored in the node
								break
							case '_rev':
								// not stored in the node
								break
							case 'acceptanceCriteria':
								// not stored in the node
								break
							case 'addConditionalFor':
								if (node.conditionalFor) {
									if (!node.conditionalFor.includes(payload.addConditionalFor)) node.conditionalFor.push(payload.addConditionalFor)
								} else node.conditionalFor = [payload.addConditionalFor]
								break
							case 'addDependencyOn':
								if (node.dependencies) {
									if (!node.dependencies.includes(payload.addDependencyOn)) node.dependencies.push(payload.addDependencyOn)
								} else node.dependencies = [payload.addDependencyOn]
								break
							case 'conditionsremoved':
								node.conditionalFor = payload.conditionsremoved
								break
							case 'dependenciesRemoved':
								node.dependencies = payload.dependenciesRemoved
								break
							case 'delmark':
								// not stored in the node
								break
							case 'description':
								// not stored in the node
								break
							case 'followers':
								// not stored in the node
								break
							case 'inconsistentState':
								node.tmp.inconsistentState = payload.inconsistentState
								break
							case 'isExpanded':
								if (payload.isExpanded) {
									expandNode(node)
								} else collapseNode(node)
								break
							case 'isSelected':
								node.isSelected = payload.isSelected
								break
							case 'lastAttachmentAddition':
								node.data.lastAttachmentAddition = payload.lastAttachmentAddition
								node.data.lastChange = payload.lastAttachmentAddition
								break
							case 'lastAttachmentRemoval':
								// not stored in the node
								break
							case 'lastChange':
								node.data.lastChange = payload.lastChange
								break
							case 'lastCommentAddition':
								node.data.lastCommentAddition = payload.lastCommentAddition
								node.data.lastChange = payload.lastCommentAddition
								break
							case 'lastCommentToHistory':
								node.data.lastCommentToHistory = payload.lastCommentToHistory
								node.data.lastChange = payload.lastCommentToHistory
								break
							case 'lastContentChange':
								node.data.lastContentChange = payload.lastContentChange
								node.data.lastChange = payload.lastContentChange
								break
							case 'lastPositionChange':
								node.data.lastPositionChange = payload.lastPositionChange
								node.data.lastChange = payload.lastPositionChange
								break
							case 'lastStateChange':
								node.data.lastStateChange = payload.lastStateChange
								node.data.lastChange = payload.lastStateChange
								break
							case 'leavingFollower':
								// not stored in the node
								break
							case 'level':
								node.level = payload.level
								break
							case 'newComment':
								// not stored in the node
								break
							case 'newFollower':
								// not stored in the node
								break
							case 'newHist':
								// not stored in the node
								break
							case 'node':
								// used to pass the node
								break
							case 'parentId':
								node.parentId = payload.parentId
								break
							case 'priority':
								node.data.priority = payload.priority
								break
							case 'productId':
								node.productId = payload.productId
								break
							case 'removeLastConditionalFor':
								{	// remove last element; create new array for reactivity
									const newconditionalFor = []
									for (let i = 0; i < node.conditionalFor.length - 1; i++) newconditionalFor.push(node.conditionalFor[i])
									node.conditionalFor = newconditionalFor
								}
								break
							case 'removeLastDependencyOn':
								{	// remove last element; create new array for reactivity
									const newDependencies = []
									for (let i = 0; i < node.dependencies.length - 1; i++) newDependencies.push(node.dependencies[i])
									node.dependencies = newDependencies
								}
								break
							case 'reqarea':
								node.data.reqarea = payload.reqarea
								break
							case 'reqAreaItemColor':
								node.data.reqAreaItemColor = payload.reqAreaItemColor
								break
							case 'selectNode':
								if (node.isSelectable) {
									state.previousSelectedNodes = state.selectedNodes || [node]
									for (const n of state.selectedNodes) n.isSelected = false
									node.isSelected = true
									state.selectedNodes = [node]
								}
								break
							case 'spikepersonhours':
								// not stored in the node
								break
							case 'sprintId':
								node.data.sprintId = payload.sprintId
								break
							case 'spsize':
								// not stored in the node
								break
							case 'state':
								node.data.state = payload.state
								break
							case 'subtype':
								node.data.subtype = payload.subtype
								break
							case 'taskOwner':
								node.data.taskOwner = payload.taskOwner
								break
							case 'team':
								node.data.team = payload.team
								break
							case 'title':
								node.title = payload.title
								break
							case 'tssize':
								// not stored in the node
								break
							case 'unselectNode':
								state.previousSelectedNodes = state.selectedNodes || [node]
								state.selectedNodes = []
								for (const n of state.selectedNodes) {
									if (n !== node) state.selectedNodes.push(n)
								}
								node.isSelected = false
								break
							default:
								// eslint-disable-next-line no-console
								if (state.debug) console.log(`updateNodesAndCurrentDoc.update node: property '${k}' has no matching update, node.title = ${node.title}, keys = ${keys}`)
						}
					}
					if (node._id === state.currentDoc._id) {
						// apply changes on the currently selected document
						for (const k of keys) {
							switch (k) {
								case '_attachments':
									state.currentDoc._attachments = payload._attachments
									break
								case '_rev':
									state.currentDoc._rev = payload._rev
									break
								case 'acceptanceCriteria':
									state.currentDoc.acceptanceCriteria = payload.acceptanceCriteria
									break
								case 'addConditionalFor':
									if (state.currentDoc.conditionalFor) {
										if (!state.currentDoc.conditionalFor.includes(payload.addConditionalFor)) state.currentDoc.conditionalFor.push(payload.addConditionalFor)
									} else state.currentDoc.conditionalFor = [payload.addConditionalFor]
									break
								case 'addDependencyOn':
									if (state.currentDoc.dependencies) {
										if (!state.currentDoc.dependencies.includes(payload.addDependencyOn)) state.currentDoc.dependencies.push(payload.addDependencyOn)
									} else state.currentDoc.dependencies = [payload.addDependencyOn]
									break
								case 'conditionsremoved':
									state.currentDoc.conditionalFor = payload.conditionsremoved
									break
								case 'dependenciesRemoved':
									state.currentDoc.dependencies = payload.dependenciesRemoved
									break
								case 'delmark':
									state.currentDoc.delmark = payload.delmark
									break
								case 'description':
									state.currentDoc.description = payload.description
									break
								case 'followers':
									state.currentDoc.followers = payload.followers
									break
								case 'inconsistentState':
									// not a database field
									break
								case 'isExpanded':
									// not a database field
									break
								case 'isSelected':
									// not a database field
									break
								case 'lastAttachmentAddition':
									state.currentDoc.lastAttachmentAddition = payload.lastAttachmentAddition
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastAttachmentRemoval':
									state.currentDoc.lastAttachmentRemoval = payload.lastAttachmentRemoval
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastChange':
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastCommentAddition':
									state.currentDoc.lastCommentAddition = payload.lastCommentAddition
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastCommentToHistory':
									state.currentDoc.lastCommentToHistory = payload.lastCommentToHistory
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastContentChange':
									state.currentDoc.lastContentChange = payload.lastContentChange
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastPositionChange':
									state.currentDoc.lastPositionChange = payload.lastPositionChange
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'lastStateChange':
									state.currentDoc.lastStateChange = payload.lastStateChange
									state.currentDoc.lastChange = payload.lastChange
									break
								case 'leavingFollower':
									{
										const updatedFollowers = []
										for (const f of state.currentDoc.followers) {
											if (f !== payload.leavingFollower) updatedFollowers.push(f)
										}
										state.currentDoc.followers = updatedFollowers
									}
									break
								case 'level':
									state.currentDoc.level = payload.level
									break
								case 'newComment':
									state.currentDoc.comments.unshift(payload.newComment)
									break
								case 'newFollower':
									state.currentDoc.followers.push(payload.newFollower)
									break
								case 'newHist':
									state.currentDoc.history.unshift(payload.newHist)
									break
								case 'node':
									// not a database field
									break
								case 'parentId':
									state.currentDoc.parentId = payload.parentId
									break
								case 'priority':
									state.currentDoc.priority = payload.priority
									break
								case 'productId':
									state.currentDoc.productId = payload.productId
									break
								case 'removeLastConditionalFor':
									state.currentDoc.conditionalFor.slice(0, -1)
									break
								case 'removeLastDependencyOn':
									state.currentDoc.dependencies.slice(0, -1)
									break
								case 'reqarea':
									state.currentDoc.reqarea = payload.reqarea
									break
								case 'reqAreaItemColor':
									state.currentDoc.color = payload.reqAreaItemColor
									break
								case 'selectNode':
									// not a database field
									break
								case 'spikepersonhours':
									state.currentDoc.spikepersonhours = payload.spikepersonhours
									break
								case 'sprintId':
									state.currentDoc.sprintId = payload.sprintId
									break
								case 'spsize':
									state.currentDoc.spsize = payload.spsize
									break
								case 'state':
									state.currentDoc.state = payload.state
									break
								case 'subtype':
									state.currentDoc.subtype = payload.subtype
									break
								case 'taskOwner':
									state.currentDoc.taskOwner = payload.taskOwner
									break
								case 'team':
									if (payload.team) state.currentDoc.team = payload.team
									break
								case 'title':
									state.currentDoc.title = payload.title
									break
								case 'tssize':
									state.currentDoc.tssize = payload.tssize
									break
								case 'unselectNode':
									// not a database field
									break
								default:
									// eslint-disable-next-line no-console
									if (state.debug) console.log(`updateNodesAndCurrentDoc.update currentDoc: property '${k}' has no matching update, currentDoc.title = ${state.currentDoc.title}, keys = ${keys}`)
							}
						}
					}
				} else {
					// eslint-disable-next-line no-console
					if (state.debug) console.log(`updateNodesAndCurrentDoc failed: cannot apply changes as no valid node is passed, keys are: ${keys}`)
				}
			}
		},

		updateTeam(state, newTeam) {
			state.userData.myTeam = newTeam
		},

		/* A copy of the showLastEvent mixin which can not be used in modules */
		showLastEvent(state, payload) {
			state.eventKey++
			const newEvent = createEvent({ txt: payload.txt, severity: payload.severity, eventKey: state.eventKey, eventList: state.eventList })
			state.eventList.unshift(newEvent)
			state.eventList = state.eventList.slice(0, MAX_EVENTLIST_SIZE)
		},

		switchCurrentProduct(state, newProductId) {
			const currentProductNode = window.slVueTree.getNodeById(state.currentProductId)
			const newCurrentProductNode = window.slVueTree.getNodeById(newProductId)
			if (currentProductNode !== null && newCurrentProductNode !== null) {
				// if the current product is not removed and the newly selected product exists
				if (state.currentView !== 'coarseProduct') {
					// collapse the current and expand the newly selected product branch
					collapseNode(currentProductNode)
					expandNode(newCurrentProductNode)
				}
				// update current product id and title
				state.currentProductId = newProductId
				state.currentProductTitle = newCurrentProductNode.title
			}
		},

		/* Reset this data on sign-in */
		resetData(state) {
			state.availableProductIds = []
			state.authentication.sessionAuthData = {}
			state.changeHistory = []
			state.configData = null
			state.currentDoc = null
			state.createDefaultCalendar = false
			state.currentProductId = null
			state.currentProductTitle = ''
			state.filterTreeIsSet = false,
			state.iAmAPO = false
			state.iAmAdmin = false
			state.iAmAssistAdmin = false
			state.iAmServerAdmin = false
			state.isProductAssigned = false
			state.eventKey = 0
			state.eventList = []
			state.lastTreeView = undefined
			state.listenForChangesRunning = false
			state.loadedSprintId = null
			state.loadedTreeDepth = undefined
			state.myProductOptions = []
			state.mySessionId = null
			state.resetSearch = {}
			state.showHeaderDropDowns = true
			state.stories = []
			state.treeNodes = []
			state.userData = {}
		},

		endSession(state) {
			clearInterval(state.authentication.runningCookieRefreshId)
			state.authentication.cookieAuthenticated = false
			clearInterval(state.logState.runningWatchdogId)
		},

		///////////////////// planning board //////////////////////////

		/* Show the items in the order as they appear in the tree view */
		createSprint(state, payload) {
			const featureIdToNodeMap = {}
			const epicIdToNodeMap = {}
			const productIdToNodeMap = {}
			function getParentNode(id, parentIdToNodeMap) {
				let parent = parentIdToNodeMap[id]
				if (parent) {
					return parent
				} else {
					parent = window.slVueTree.getNodeById(id)
					if (parent) {
						parentIdToNodeMap[id] = parent
						return parent
					}
				}
				return null
			}

			let storyIdx = 0
			for (const f of payload.featureMap) {
				for (const s of payload.pbiResults) {
					const featureId = s.key[3]
					if (f.id === featureId) {
						const storyId = s.id
						const productId = s.key[2]
						const storyTitle = s.value[0]
						const featureNode = getParentNode(featureId, featureIdToNodeMap)
						if (!featureNode) continue

						const featureName = featureNode.title
						const epicNode = getParentNode(featureNode.parentId, epicIdToNodeMap)
						if (!epicNode) continue

						const epicName = epicNode.title
						const productNode = getParentNode(epicNode.parentId, productIdToNodeMap)
						if (!productNode) continue

						const productName = productNode.title
						const subType = s.value[1]
						const storySize = s.value[3]
						const newStory = {
							idx: storyIdx,
							storyId,
							featureId,
							featureName,
							epicName,
							productId,
							productName,
							title: storyTitle,
							size: storySize,
							subType,
							tasks: {
								[STATE.ON_HOLD]: [],
								[STATE.TODO]: [],
								[STATE.INPROGRESS]: [],
								[STATE.TESTREVIEW]: [],
								[STATE.DONE]: []
							}
						}

						for (const t of payload.taskResults) {
							if (t.key[3] === storyId) {
								const taskState = t.value[2]
								switch (taskState) {
									case STATE.ON_HOLD:
										newStory.tasks[STATE.ON_HOLD].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case STATE.TODO:
									case STATE.READY:
										newStory.tasks[STATE.TODO].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case STATE.INPROGRESS:
										newStory.tasks[STATE.INPROGRESS].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case STATE.TESTREVIEW:
										newStory.tasks[STATE.TESTREVIEW].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case STATE.DONE:
										newStory.tasks[STATE.DONE].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
								}
							}
						}
						state.stories.push(newStory)
						storyIdx++
					}
				}
			}
		},

		/* Add the task to the planning board */
		addTaskToBoard(state, doc) {
			for (const s of state.stories) {
				if (s.storyId === doc.parentId) {
					const targetColumn = s.tasks[doc.state]
					targetColumn.unshift({
						id: doc._id,
						title: doc.title,
						taskOwner: doc.taskOwner,
						priority: doc.priority
					})
					targetColumn.sort((a, b) => b.priority - a.priority)
					break
				}
			}
		},

		/* Remove the task from the planning board */
		removeTaskFromBoard(state, payload) {
			for (const s of state.stories) {
				if (s.storyId === payload.storyId) {
					const targetColumn = s.tasks[payload.taskState]
					const newTargetColumn = []
					for (const c of targetColumn) {
						if (c.id !== payload.taskId) {
							newTargetColumn.push(c)
						}
					}
					s.tasks[payload.taskState] = newTargetColumn
					break
				}
			}
		}
	},

	modules: {
		attachments,
		authentication,
		calendars,
		clone,
		dependencies,
		help,
		initdb,
		loadoverview,
		loadproducts,
		logging,
		move,
		planningboard,
		removebranch,
		restorebranches,
		startup,
		sync,
		teams,
		traverstree,
		undo,
		update,
		useracc,
		utils
	}
})
