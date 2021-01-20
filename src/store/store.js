import { SEV, LEVEL, STATE, MISC } from '../constants.js'
import Vue from 'vue'
import Vuex from 'vuex'
import authentication from './modules/authentication'
import calendars from './modules/calendars'
import dependencies from './modules/dependencies'
import logging from './modules/logging'
import startup from './modules/startup'
import initdb from './modules/initdb'
import help from './modules/help'
import clone from './modules/clone'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
import teams from './modules/teams'
import attachments from './modules/attachments'
import move from './modules/move'
import undo from './modules/undo'
import utils from './modules/utils'
import removebranch from './modules/removebranch'
import restorebranches from './modules/restorebranches'
import loadproducts from './modules/load_detail'
import loadoverview from './modules/load_coarse'
import planningboard from './modules/planningboard'

const FILTERBUTTONTEXT = 'Filter in tree view'
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
			severityStr = 'SEV.WARNING'
			color = 'orange'
			break
		case SEV.ERROR:
			severityStr = 'SEV.ERROR'
			color = 'red'
			break
		case SEV.CRITICAL:
			severityStr = 'SEV.CRITICAL'
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
/* Add item to array if not already present. Returns a new array so that it is reactive */
function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

/* Remove item from array if present. Returns a new array so that it is reactive */
function removeFromArray(arr, item) {
	const newArr = []
	for (const el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

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
		// loading options
		autoCorrectUserProfile: true,
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
		currentDefaultProductId: null,
		currentProductId: null,
		currentProductTitle: '',
		iAmAPO: false,
		iAmAdmin: false,
		iAmAssistAdmin: false,
		iAmServerAdmin: false,
		stopListenForChanges: false,
		// tree loading
		loadedTreeDepth: undefined,
		allTeams: {},
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
		filterText: 'Filter in tree view',
		findIdOn: false,
		keyword: '',
		moveOngoing: false,
		myAssignedDatabases: undefined,
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

		getCurrentItemTsSize(state) {
			if (state.configData) return state.configData.tsSize[state.currentDoc.tssize]
		},

		getCurrentItemLevel(state) {
			if (state.currentDoc) return state.currentDoc.level
		},

		getCurrentItemState(state) {
			if (state.currentDoc) return state.currentDoc.state
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

		/* Return the productIds of all products assigned to me in all my assigned databases */
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
		getPreviousNodeSelected(state) {
			return state.previousSelectedNodes.slice(-1)[0]
		},

		isDetailsViewSelected(state) {
			return state.currentView === 'detailProduct'
		},

		isOverviewSelected(state) {
			return state.currentView === 'coarseProduct'
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
				return myCurrentProductRoles && myCurrentProductRoles.includes.includes('guest')
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
		/* Clear any outstanding filters and searches of the current product (default) or all products */
		resetFilters({ state, commit, dispatch }, payload) {
			if (state.debug) {
				// eslint-disable-next-line no-console
				console.log(`resetFilters is called by ${payload.caller}, allProducts = ${payload.allProducts}, state.resetSearch.searchType = ${state.resetSearch.searchType}`)
			}

			if (state.resetSearch.searchType === 'onSetMyFilters') {
				const nodesToScan = window.slVueTree.getProductModel()
				// traverse the tree to reset to the state before filtering
				window.slVueTree.traverseModels((nm) => {
					// skip requirement areas dummy product items
					if (nm._id === MISC.AREA_PRODUCTID) return

					// filters do only set isHighlighted_1
					nm.isHighlighted_1 = false
					nm.doShow = nm.savedDoShow
					nm.isExpanded = nm.savedIsExpanded
				}, nodesToScan)

				commit('addToEventList', { txt: `Your filter in product '${state.currentProductTitle}' is cleared`, severity: SEV.INFO })
				state.filterText = FILTERBUTTONTEXT
				state.resetSearch = {}
			}

			if (state.resetSearch.searchType === 'findItemOnId') {
				const node = state.resetSearch.nodes[0]
				const prevSelectedNode = state.resetSearch.currentSelectedNode
				if (state.resetSearch.view === 'detailProduct' && node.productId !== prevSelectedNode.productId) {
					// the node was found in another product; collapse the currently selected product and switch to the other product
					commit('switchCurrentProduct', { productId: prevSelectedNode.productId, collapseCurrentProduct: true })
					// expand the product
					window.slVueTree.getNodeById(prevSelectedNode.productId).isExpanded = true
				} else {
					window.slVueTree.undoShowPath(node, { [state.resetSearch.highLight]: true })
				}
				// select the node after loading the document
				dispatch('loadDoc', {
					id: prevSelectedNode._id, onSuccessCallback: () => {
						commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
						commit('addToEventList', { txt: 'The search for an item on Id is closed', severity: SEV.INFO })
					}
				})
				state.resetSearch = {}
			}

			if (state.resetSearch.searchType === 'searchInTitles') {
				for (const node of state.resetSearch.nodes) {
					window.slVueTree.undoShowPath(node, { [state.resetSearch.highLight]: true })
				}
				const prevSelectedNode = state.resetSearch.currentSelectedNode
				dispatch('loadDoc', {
					id: prevSelectedNode._id, onSuccessCallback: () => {
						commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
						window.slVueTree.showPathToNode(prevSelectedNode)
						// expand the product
						window.slVueTree.getNodeById(prevSelectedNode.productId).isExpanded = true
						state.keyword = ''
						commit('addToEventList', { txt: `The search for item titles in '${prevSelectedNode.title}' is closed`, severity: SEV.INFO })
					}
				})
				state.resetSearch = {}
			}
		},
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
			state.userData.myTeam = payload.data.myDatabases[payload.data.currentDb].myTeam
			state.userData.currentDb = payload.data.currentDb
			state.userData.email = payload.data.email
			state.userData.roles = payload.data.roles
			state.userData.myDatabases = payload.data.myDatabases
			state.userData.myProductViewFilterSettings = payload.data.myProductViewFilterSettings
			state.userData.myFilterSettings = payload.data.myDatabases[payload.data.currentDb].filterSettings
			state.userData.doNotAskForImport = payload.data.doNotAskForImport
		},

		/*
		*  Mutation to re-enter all the current users product roles, and update the user's subscriptions and product selection array with the removed product
		*  Steps:
		*  - Replace my product roles for all my products in my current database
		*  - Add the productId to my subscriptions in my current database
		*	 - Add the productId and title to my product options
		*/
		addToMyProducts(state, payload) {
			state.userData.myDatabases[state.userData.currentDb].productsRoles[payload.newRoles]
			state.userData.myDatabases[state.userData.currentDb].subscriptions = addToArray(state.userData.myDatabases[state.userData.currentDb].subscriptions, payload.productId)
			// create a new array so that it is reactive
			const newArr = []
			for (const el of state.myProductOptions) {
				newArr.push(el)
			}
			newArr.push({
				value: payload.productId,
				text: payload.productTitle
			})
			state.myProductOptions = newArr
		},

		/*
		* Remove the product from the users product roles, subscriptions and product selection array
		* The user profile will be updated at the next sign-in
		*/
		removeFromMyProducts(state, payload) {
			// workaround to access getter
			const getters = payload.getters
			delete state.userData.myDatabases[state.userData.currentDb].productsRoles[payload.productId]
			if (getters.getMyProductSubscriptions.includes(payload.productId)) {
				state.userData.myDatabases[state.userData.currentDb].subscriptions = removeFromArray(state.userData.myDatabases[state.userData.currentDb].subscriptions, payload.productId)
				// create a new array so that it is reactive
				const newArr = []
				for (const el of state.myProductOptions) {
					if (el.value !== payload.productId) newArr.push(el)
				}
				state.myProductOptions = newArr
			}
		},

		updateMyProductSubscriptions(state, productIds) {
			state.userData.myDatabases[state.userData.currentDb].subscriptions = productIds
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
								node.data.inconsistentState = payload.inconsistentState
								break
							case 'isExpanded':
								node.isExpanded = payload.isExpanded
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

		switchCurrentProduct(state, payload) {
			if (payload.collapseCurrentProduct) {
				// Collapse the branch below the current product
				window.slVueTree.getProductModel()[0].isExpanded = false
			}
			state.currentProductId = payload.productId
			state.currentProductTitle = window.slVueTree.getProductTitle(payload.productId)
		},

		resetData(state) {
			state.availableProductIds = []
			state.authentication.sessionAuthData = {}
			state.changeHistory = []
			state.configData = null
			state.currentDoc = null
			state.createDefaultCalendar = false
			state.currentDefaultProductId = null
			state.currentProductId = null
			state.currentProductTitle = ''
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
			state.showHeaderDropDowns = true
			state.stopListenForChanges = true
			state.stories = []
			state.treeNodes = []
			state.userData = {}

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

		removeTaskFromBoard(state, payload) {
			for (const s of state.stories) {
				if (s.storyId === payload.doc.parentId) {
					const stateTasks = s.tasks[payload.prevState]
					const newTasks = []
					for (const t of stateTasks) {
						if (t.id !== payload.doc._id) newTasks.push(t)
					}
					s.tasks[payload.prevState] = newTasks
					break
				}
			}
		}
	},

	modules: {
		authentication,
		calendars,
		dependencies,
		startup,
		initdb,
		logging,
		help,
		clone,
		sync,
		useracc,
		update,
		teams,
		attachments,
		move,
		undo,
		utils,
		removebranch,
		restorebranches,
		loadproducts,
		loadoverview,
		planningboard
	}

})
