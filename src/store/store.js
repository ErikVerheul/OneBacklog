// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other (async) database updates are done.
import { SEV, LEVEL, MISC } from '../constants.js'
import { createStore } from 'vuex'
import globalAxios from 'axios'
import { b64ToUni, expandNode, collapseNode, addToArray, localTimeAndMilis, removeFromArray } from '../common_functions.js'
import attachments from './modules/attachments'
import authentication from './modules/authentication'
import calendars from './modules/calendars'
import clone from './modules/clone'
import dependencies from './modules/dependencies'
import help from './modules/help'
import helpers from './modules/helpers'
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
import undo from './modules/undo'
import update_reqarea from './modules/update_reqarea'
import update from './modules/update'
import useracc from './modules/useracc'
import utils from './modules/utils'
import watchdog from './modules/watchdog'

const MAX_EVENTLIST_SIZE = 100

function createEventToDisplay(payload) {
	let backgroundColor = '#408FAE'
	let textColor = 'white'
	let severityStr = 'INFO'
	switch (payload.severity) {
		case SEV.DEBUG:
			severityStr = 'DEBUG'
			backgroundColor = 'yellow'
			textColor = 'black'
			break
		case SEV.INFO:
			severityStr = 'INFO'
			backgroundColor = '#408FAE'
			textColor = 'white'
			break
		case SEV.WARNING:
			severityStr = 'WARNING'
			backgroundColor = 'orange'
			textColor = 'black'
			break
		case SEV.ERROR:
			severityStr = 'ERROR'
			backgroundColor = 'red'
			textColor = 'black'
			break
		case SEV.CRITICAL:
			severityStr = 'CRITICAL'
			backgroundColor = '#ff5c33'
			textColor = 'black'
	}
	let tip = ''
	if (payload.severity > SEV.INFO) tip = ' CLICK to unlock'
	const newEvent = {
		eventKey: payload.eventKey,
		time: localTimeAndMilis(new Date()),
		txt: payload.txt + tip,
		sevKey: payload.severity,
		severity: severityStr,
		backgroundColor,
		textColor,
	}
	return newEvent
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

function getCurrentEvt(eventsArray, key) {
	for (const evt of eventsArray) {
		if (evt.eventKey === key) return evt
	}
	return null
}

const store = createStore({
	state() {
		return {
			appVersion: '2.3.7',
			// generic helper functions
			helpersRef: null,
			// console log settings
			debug: import.meta.env.VITE_DEBUG === 'true' || false,
			debugConnectionAndLogging: import.meta.env.VITE_DEBUG_CONNECTION === 'true' || false,
			// creating a CouchDb instance
			isDatabaseInitiated: false,
			// authentication
			mySessionId: null,
			// startup
			availableProductIds: [],
			currentProductId: null,
			currentProductTitle: '',
			iAmAPO: false,
			iAmAdmin: false,
			iAmAssistAdmin: false,
			iAmServerAdmin: false,
			myLastSessionMessagesCount: 0,
			myAssignedDatabases: [],
			signedOut: true,
			// tree loading
			allTeams: {},
			isDetailHistLoaded: false,
			isCoarseHistLoaded: false,
			lastSessionData: {},
			loadedTreeDepth: undefined,
			myTeamId: null,
			productTitlesMap: {},
			treeNodes: [],
			// detail tree view
			reqAreaMapper: {},
			// coarse tree view
			currentView: undefined,
			colorMapper: {},
			reqAreaOptions: [],
			// detail & coarse tree views
			busyWithLastUndo: false,
			busyChangingSubscriptions: false,
			currentDoc: null,
			changeHistory: [],
			currentEventKey: 0,
			eventList: [],
			filterForCommentSearchString: '',
			filterForHistorySearchString: '',
			freezeEvent: false,
			itemId: '',
			keyword: '',
			lastTreeView: undefined,
			moveOngoing: false,
			newAcceptanceCriteria: MISC.EMPTYQUILL,
			newDescription: MISC.EMPTYQUILL,
			newEventKey: 0,
			progressMessage: '',
			searchOn: false,
			selectedForView: 'comments',
			previousSelectedNodes: undefined,
			resetFilter: null,
			resetSearchOnId: null,
			resetSearchOnTitle: null,
			selectedNodes: [],
			selectNodeOngoing: false,
			showGoMessaging: false,
			showProgress: false,
			uploadDone: true,
			// view and send messages
			messSquareColor: MISC.SQUAREBGNDCOLOR,
			msgBlinkIds: [],
			myB64TeamMessages: [],
			myNewMessage: MISC.EMPTYQUILL,
			newMsgTitle: '',
			replaceMessage: false,
			replaceMessageTimestamp: undefined,
			// utilities for server Admin and admin
			areDatabasesFound: false,
			areProductsFound: false,
			areTeamsFound: false,
			areTeamsRemoved: false,
			backendMessages: [],
			loadedCalendar: [],
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
			isDefaultCalendarLoaded: false,
			isTeamCalendarLoaded: false,
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
			stopListeningForChanges: false,
			teamsToRemoveIds: [],
			userOptions: [],
			warning: '',
			// traverseTree
			descendantIds: [],
			// app wide globals
			configData: null,
			demo: import.meta.env.VITE_IS_DEMO === 'true' || false,
			lastSelectCursorPosition: null,
			listenForChangesRunning: false,
			myProductOptions: [],
			nowSyncing: false,
			online: true,
			showHeaderDropDowns: true,
			syncEventColor: '#004466',
			unsavedLogs: [],
			userData: {},
			// planning board
			loadedSprintId: null,
			myCurrentSprintCalendar: [],
			warningText: '',
			// signing out
			signingOut: false,
		}
	},

	getters: {
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},

		isFollower(state) {
			if (state.currentDoc && state.currentDoc.followers) {
				const users = state.currentDoc.followers.map((e) => e.user)
				return users.includes(state.userData.user)
			} else return false
		},

		isReqAreaTopLevel(state) {
			if (state.currentDoc) return state.currentDoc._id === MISC.AREA_PRODUCTID
		},

		isReqAreaItem(state) {
			if (state.currentDoc) return state.currentDoc._id === MISC.AREA_PRODUCTID || state.currentDoc.productId === MISC.AREA_PRODUCTID
		},

		getCurrentDefaultProductId(state) {
			if (state.userData.myDatabases) {
				const currentDbSettings = state.userData.myDatabases[state.userData.currentDb]
				if (currentDbSettings && Object.keys(currentDbSettings.productsRoles).length > 0) {
					// the first (index 0) product in the current db subscriptions is by definition the default product
					return currentDbSettings.subscriptions[0]
				}
			}

			if (state.currentProductId) {
				// return the opened product of the previous session
				return state.currentProductId
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

		/* Returns the sprint name if found in the user's current teamcalendar or in the default calendar. Returns 'undefined' is in another user's teamcalendar. */
		getItemSprintName(state) {
			if (state.currentDoc.sprintId && state.myCurrentSprintCalendar) {
				for (const s of state.myCurrentSprintCalendar) {
					if (s.id === state.currentDoc.sprintId) return s.name
				}
			}
		},

		getLastEventTxt(state) {
			if (state.showProgress) return state.progressMessage
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.txt
		},

		getLastEventBGColor(state) {
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.backgroundColor
		},

		getLastEventTextColor(state) {
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.textColor
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

		/* Return all my products (the productsRoles object) with my assigned roles in my current database */
		getMyProductsRoles(state) {
			if (state.userData.currentDb && state.userData.myDatabases[state.userData.currentDb]) {
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
			} else return []
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

		getTreeModel(state) {
			return state.treeNodes
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
			return 'Unknown if no database is assigned to you'
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
				return (
					myCurrentProductRoles &&
					(getters.isServerAdmin ||
						getters.isAssistAdmin ||
						getters.isAdmin ||
						getters.isAPO ||
						myCurrentProductRoles.includes('PO') ||
						myCurrentProductRoles.includes('developer'))
				)
			} else return false
		},
		canSeeAndUploadAttachments(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = getters.getMyProductsRoles[state.currentProductId]
				return (
					myCurrentProductRoles &&
					(getters.isAssistAdmin || getters.isAdmin || getters.isAPO || myCurrentProductRoles.includes('PO') || myCurrentProductRoles.includes('developer'))
				)
			} else return false
		},
	},

	actions: {
		/* Launch additional actions in parallel if provided in the payload */
		dispatchAdditionalActions({ state, dispatch }, payload) {
			if (payload.toDispatch) {
				for (const td of payload.toDispatch) {
					const name = Object.keys(td)[0]

					if (state.debug) console.log('dispatchAdditionalActions: dispatching ' + name)
					dispatch(name, td[name])
				}
			}
		},

		findItemOnId({ state, dispatch, commit, getters }, payload) {
			const SHORTKEYLENGTH = 5
			const id = payload.id
			const productNodes = state.helpersRef.getProductNodes()
			// scan all items of the current products
			const isShortId = id.length === SHORTKEYLENGTH
			let nodeFound
			state.helpersRef.traverseModels((nm) => {
				if ((isShortId && nm._id.slice(-5) === id) || (!isShortId && nm._id === id)) {
					// short id or full id did match
					nodeFound = nm
					return false
				}
			}, productNodes)

			if (nodeFound) {
				// save display state of the current products
				commit('saveTreeView', { productNodes, type: 'findId' })
				// load and select the document if not already current
				if (nodeFound._id !== state.currentDoc._id) {
					// select the node after loading the document
					dispatch('loadDoc', {
						id: nodeFound._id,
						onSuccessCallback: () => {
							// create reset object
							state.resetSearchOnId = {
								view: state.currentView,
								savedSelectedNode: getters.getLastSelectedNode,
								nodeFound,
							}
							if (getters.isDetailsViewSelected && nodeFound.productId !== state.currentProductId) {
								// the node is found but not in the current product; collapse the currently selected product and switch to the new product
								commit('switchCurrentProduct', nodeFound.productId)
							}
							// expand the tree view up to the found item
							state.helpersRef.showPathToNode(nodeFound, { noHighLight: true })
							commit('updateNodesAndCurrentDoc', { selectNode: nodeFound })
							commit('addToEventList', {
								txt: `The item with full Id ${nodeFound._id} is found and selected in product '${state.currentProductTitle}'`,
								severity: SEV.INFO,
							})
						},
					})
				}
			} else {
				// the node is not found in the current product selection; try to find it in the database using the short id
				const lookUpId = isShortId ? id : id.slice(-5)
				dispatch('loadItemByShortId', lookUpId)
			}
		},

		/* Find all items with the key as a substring in their title in the current product branch */
		seachOnTitle({ state, dispatch, commit, getters }) {
			const productNodes = state.helpersRef.getProductNodes()
			const nodesFound = []
			// save display state of the branch
			commit('saveTreeView', { productNodes, type: 'titles' })
			state.helpersRef.traverseModels((nm) => {
				if (nm.title.toLowerCase().includes(state.keyword.toLowerCase())) {
					// expand the product up to the found item and highlight it
					state.helpersRef.showPathToNode(nm, { doHighLight_1: true })
					nodesFound.push(nm)
				} else {
					// collapse nodes with no findings in their subtree
					if (nm.level > LEVEL.PRODUCT) {
						if (nm.isExpanded) {
							collapseNode(nm)
						}
					}
				}
			}, productNodes)

			// create reset object
			state.resetSearchOnTitle = {
				view: state.currentView,
				savedSelectedNode: getters.getLastSelectedNode,
				productNodes,
			}

			const productStr = getters.isOverviewSelected ? 'all products' : ` product '${state.currentProductTitle}'`
			if (nodesFound.length > 0) {
				// load and select the first node found
				dispatch('loadDoc', {
					id: nodesFound[0]._id,
					onSuccessCallback: () => {
						commit('updateNodesAndCurrentDoc', { selectNode: nodesFound[0] })
						if (nodesFound.length === 1) {
							commit('addToEventList', { txt: `One item title matches your search in ${productStr}. This item is selected`, severity: SEV.INFO })
						} else
							commit('addToEventList', {
								txt: `${nodesFound.length} item titles match your search in ${productStr}. The first match is selected`,
								severity: SEV.INFO,
							})
					},
				})
			} else commit('addToEventList', { txt: `No item titles match your search in ${productStr}`, severity: SEV.INFO })
		},

		resetFindOnId({ state, dispatch, commit }, payload) {
			if (state.debug) console.log(`resetFindOnId is called by ${payload.caller}`)
			if (!state.resetSearchOnId || !state.resetSearchOnId.nodeFound) {
				// there is no pending search or the search did not find a node
				state.itemId = ''
				return
			}
			const toDispatch = payload.toDispatch
			// load and select the previous selected document
			const prevSelectedNode = state.resetSearchOnId.savedSelectedNode
			dispatch('loadDoc', {
				id: prevSelectedNode._id,
				toDispatch,
				onSuccessCallback: () => {
					if (state.resetSearchOnId.view === 'detailProduct' && state.resetSearchOnId.nodeFound.productId !== prevSelectedNode.productId) {
						// the node was found in another product
						commit('switchCurrentProduct', prevSelectedNode.productId)
					} else {
						if (!store.resetFilter) {
							commit('restoreTreeView', { type: 'findId', nodesToScan: undefined })
						} else commit('restoreTreeView', { type: 'filter', nodesToScan: state.helpersRef.getCurrentProductModel() })
					}
					commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
					commit('addToEventList', { txt: 'The search for an item on Id is cleared', severity: SEV.INFO })
					state.itemId = ''
					state.resetSearchOnId = null
				},
			})
		},

		resetSearchInTitles({ state, dispatch, commit }, payload) {
			if (state.debug) console.log(`resetSearchInTitles is called by ${payload.caller}`)
			if (!state.resetSearchOnTitle || !state.resetSearchOnTitle.savedSelectedNode) {
				// there is no pending search on titles or the search did not find a node
				state.keyword = ''
				return
			}
			const prevSelectedNode = state.resetSearchOnTitle.savedSelectedNode
			const toDispatch = payload.toDispatch
			// load and select the previous selected document
			dispatch('loadDoc', {
				id: prevSelectedNode._id,
				toDispatch,
				onSuccessCallback: () => {
					if (!store.resetFilter) {
						commit('restoreTreeView', { type: 'titles', nodesToScan: state.resetSearchOnTitle.productNodes })
					} else commit('restoreTreeView', { type: 'filter', nodesToScan: state.helpersRef.getCurrentProductModel() })
					commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
					commit('addToEventList', { txt: `The search for item titles is cleared`, severity: SEV.INFO })
					state.keyword = ''
					state.resetSearchOnTitle = null
				},
			})
		},

		/* If a filter is active reset to the tree state as before the filter was set; otherwise reset the set search (can only be one) */
		resetFilterAndSearches({ state, dispatch, commit }, payload) {
			if (state.debug) console.log(`resetFilterAndSearches is called by ${payload.caller}`)
			if (state.resetFilter) {
				const prevSelectedNode = state.resetFilter.savedSelectedNode
				// load and select the previous selected document
				dispatch('loadDoc', {
					id: prevSelectedNode._id,
					onSuccessCallback: () => {
						state.itemId = ''
						state.keyword = ''
						state.resetFilter = null
						state.resetSearchOnId = null
						state.resetSearchOnTitle = null
						commit('restoreTreeView', { type: 'filter', nodesToScan: payload.productModels })
						commit('updateNodesAndCurrentDoc', { selectNode: prevSelectedNode })
						commit('addToEventList', { txt: `Your filter is cleared`, severity: SEV.INFO })
					},
				})
			}
		},

		/* Add the product to my profile and update my available products and my product options	*/
		addToMyProducts({ state, dispatch }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user,
			})
				.then((res) => {
					const updateProducts = () => {
						if (!state.availableProductIds.includes(payload.productId)) {
							// add the id to my available products
							state.availableProductIds = addToArray(state.availableProductIds, payload.productId)
						}
						// add an object to my product options
						state.myProductOptions = addToArray(state.myProductOptions, {
							value: payload.productId,
							text: payload.productTitle,
						})
					}

					// prevent updating the user's profile twice
					if (payload.isSameUserInDifferentSession) {
						state.userData.myDatabases[state.userData.currentDb].productsRoles[payload.productId] = payload.newRoles
						state.userData.myDatabases[state.userData.currentDb].subscriptions = addToArray(
							state.userData.myDatabases[state.userData.currentDb].subscriptions,
							payload.productId,
						)
						updateProducts()
					} else {
						const tmpUserData = res.data
						tmpUserData.myDatabases[tmpUserData.currentDb].productsRoles[payload.productId] = payload.newRoles
						tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = addToArray(
							tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions,
							payload.productId,
						)
						dispatch('updateUserDb', { data: tmpUserData, onSuccessCallback: updateProducts })
					}
				})
				.catch((error) => {
					const msg = `addToMyProducts: User ${state.userData.user} cannot save its updated profile. ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				})
		},

		/* Remove the product from my profile and update my available products and my product options	*/
		removeFromMyProducts({ state, getters, dispatch, commit }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user,
			})
				.then((res) => {
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
						if (payload.doSignOut) {
							commit('endSession', 'removeFromMyProducts, payload.doSignOut = true')
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
							tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = removeFromArray(
								tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions,
								payload.productId,
							)
						}
						dispatch('updateUserDb', { data: tmpUserData, onSuccessCallback: updateProducts })
					}
				})
				.catch((error) => {
					const msg = `removeFromMyProducts: User ${state.userData.user} cannot save its updated profile. ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				})
		},

		updateMyProductSubscriptions({ state, dispatch, commit }, payload) {
			globalAxios({
				method: 'GET',
				url: '/_users/org.couchdb.user:' + state.userData.user,
			})
				.then((res) => {
					const tmpUserData = res.data
					tmpUserData.myDatabases[state.userData.currentDb].subscriptions = payload.productIds
					dispatch('updateUserDb', { data: tmpUserData, onSuccessCallback: () => commit('endSession', 'updateMyProductSubscriptions') })
				})
				.catch((error) => {
					const msg = `updateMyProductSubscriptions: User ${state.userData.user} cannot save its updated profile. ${error}`
					dispatch('doLog', { event: msg, level: SEV.ERROR })
				})
		},
	},

	mutations: {
		/*
		 * Show a message in the message bar in the Product details or Products overview
		 * Stops showing new events if a CRITICAL, ERROR or WARNING event message is displayed.
		 * Resume showing new events after the events list is displayed (click on event bar)
		 */
		addToEventList(state, payload) {
			state.showProgress = false
			const newEvent = createEventToDisplay({ txt: payload.txt, severity: payload.severity, eventKey: state.newEventKey })
			state.eventList.unshift(newEvent)
			state.eventList = state.eventList.slice(0, MAX_EVENTLIST_SIZE)
			state.newEventKey++
			if (payload.severity > SEV.INFO) {
				for (const evt of state.eventList) {
					if (evt.eventKey > state.currentEventKey) {
						// must be a new event
						state.currentEventKey = evt.eventKey
						state.freezeEvent = true
						return
					}
				}
			} else {
				// severity DEBUG or INFO
				if (!state.freezeEvent) state.currentEventKey = state.eventList[0].eventKey
			}
		},

		resetfroozenEventDisplay(state) {
			state.freezeEvent = false
			state.currentEventKey = state.eventList[0].eventKey
		},

		/* Store a subset of my user data in memory */
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
			const currReqAreaNodes = state.helpersRef.getReqAreaNodes()
			if (currReqAreaNodes) {
				state.colorMapper = {}
				for (const nm of currReqAreaNodes) {
					state.colorMapper[nm._id] = { reqAreaItemColor: nm.data.reqAreaItemColor }
				}
			}
		},

		/* Change or add one color; must create a new object for reactivity */
		updateColorMapper(state, payload) {
			const newColorMapper = {}
			const reqAreaIds = Object.keys(state.colorMapper)
			if (reqAreaIds.includes(payload.id)) {
				// change the color of a mapping
				for (const id of reqAreaIds) {
					if (id === payload.id) {
						newColorMapper[id] = { reqAreaItemColor: payload.newColor }
					} else newColorMapper[id] = state.colorMapper[id]
				}
			} else {
				// add a new color to the mapping
				for (const id of reqAreaIds) {
					newColorMapper[id] = state.colorMapper[id]
				}
				newColorMapper[payload.id] = { reqAreaItemColor: payload.newColor }
			}
			state.colorMapper = newColorMapper
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

		/* Traverse the tree to save the view state before change */
		saveTreeView(state, payload) {
			state.helpersRef.traverseModels((nm) => {
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

		/* Traverse the tree to reset to the state before the view change */
		restoreTreeView(state, payload) {
			function resetHighLights(node, highLights) {
				if (highLights && Object.keys(highLights).length > 0) {
					node.tmp.isHighlighted_1 = !!highLights.isHighlighted_1
					node.tmp.isHighlighted_2 = !!highLights.isHighlighted_2
					node.tmp.isWarnLighted = !!highLights.isWarnLighted
				}
			}

			state.helpersRef.traverseModels((nm) => {
				// reset the view state
				if (payload.type === 'condition') {
					nm.isExpanded = nm.tmp.savedIsExpandedInCondition
					delete nm.tmp.savedIsExpandedInCondition
					nm.doShow = nm.tmp.savedDoShowInCondition
					delete nm.tmp.savedDoShowInCondition
					resetHighLights(nm, nm.tmp.savedHighLigthsInCondition)
				}

				if (payload.type === 'dependency') {
					nm.isExpanded = nm.tmp.savedIsExpandedInDependency
					delete nm.tmp.savedIsExpandedInDependency
					nm.doShow = nm.tmp.savedDoShowInDependency
					delete nm.tmp.savedDoShowInDependency
					resetHighLights(nm, nm.tmp.savedHighLigthsInDependency)
				}

				if (payload.type === 'findId') {
					nm.isExpanded = nm.tmp.savedIsExpandedInFindId
					delete nm.tmp.savedIsExpandedInFindId
					nm.doShow = nm.tmp.savedDoShowInFindId
					delete nm.tmp.savedDoShowInFindId
					resetHighLights(nm, nm.tmp.savedHighLigthsInFindId)
				}

				if (payload.type === 'filter') {
					nm.isExpanded = nm.tmp.savedIsExpandedInFilter
					delete nm.tmp.savedIsExpandedInFilter
					nm.doShow = nm.tmp.savedDoShowInFilter
					delete nm.tmp.savedDoShowInFilter
					resetHighLights(nm, nm.tmp.savedHighLigthsInFilter)
				}

				if (payload.type === 'titles') {
					nm.isExpanded = nm.tmp.savedIsExpandedInTitles
					delete nm.tmp.savedIsExpandedInTitles
					nm.doShow = nm.tmp.savedDoShowInTitles
					delete nm.tmp.savedDoShowInTitles
					resetHighLights(nm, nm.tmp.savedHighLigthsInTitles)
				}
			}, payload.nodesToScan)
		},

		/* The keys of the payload object are evaluated by key name and value */
		updateNodesAndCurrentDoc(state, payload) {
			if (payload.newNode) {
				renewSelection(state, payload.newNode)
			}

			if (payload.newDoc) {
				// decode from base64 + replace the encoded data
				payload.newDoc.description = b64ToUni(payload.newDoc.description)
				payload.newDoc.acceptanceCriteria = b64ToUni(payload.newDoc.acceptanceCriteria)
				// replace the currently loaded document
				state.currentDoc = cleanHistory(payload.newDoc)
				// initiate vars for updating
				state.newDescription = payload.newDoc.description
				state.newAcceptanceCriteria = payload.newDoc.acceptanceCriteria
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
							case 'description':
								// not stored in the node
								break
							case 'followers':
								node.data.followers = payload.followers
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
							case 'level':
								node.level = payload.level
								break
							case 'newComment':
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
								{
									// remove last element; create new array for reactivity
									const newconditionalFor = []
									for (let i = 0; i < node.conditionalFor.length - 1; i++) newconditionalFor.push(node.conditionalFor[i])
									node.conditionalFor = newconditionalFor
								}
								break
							case 'removeLastDependencyOn':
								{
									// remove last element; create new array for reactivity
									const newDependencies = []
									for (let i = 0; i < node.dependencies.length - 1; i++) newDependencies.push(node.dependencies[i])
									node.dependencies = newDependencies
								}
								break
							case 'replaceComments':
								// not stored in the node
								break
							case 'replaceHistory':
								// not stored in the node
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
							case 'spikePersonHours':
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
								if (state.debug)
									console.log(`updateNodesAndCurrentDoc.update node: property '${k}' has no matching update, node.title = ${node.title}, keys = ${keys}`)
						}
					}
					if (node._id === state.currentDoc._id) {
						// apply changes on the currently selected document
						for (const k of keys) {
							switch (k) {
								case '_attachments':
									state.currentDoc._attachments = payload._attachments
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
								case 'description':
									state.currentDoc.description = payload.description
									break
								case 'followers':
									state.currentDoc.followers = payload.followers
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
								case 'level':
									state.currentDoc.level = payload.level
									break
								case 'newComment':
									state.currentDoc.comments.unshift(payload.newComment)
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
								case 'replaceComments':
									state.currentDoc.comments = payload.replaceComments
									break
								case 'replaceHistory':
									state.currentDoc.history = payload.replaceHistory
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
								case 'spikePersonHours':
									state.currentDoc.spikepersonhours = payload.spikePersonHours
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
									if (state.debug)
										console.log(
											`updateNodesAndCurrentDoc.update currentDoc: property '${k}' has no matching update, currentDoc.title = ${state.currentDoc.title}, keys = ${keys}`,
										)
							}
						}
					}
				} else {
					if (state.debug) console.log(`updateNodesAndCurrentDoc failed: cannot apply changes as no valid node is passed, keys are: ${keys}`)
				}
			}
		},

		updateTeam(state, newTeam) {
			state.userData.myTeam = newTeam
		},

		startOrContinueShowProgress(state, msg) {
			state.showProgress = true
			state.progressMessage = msg
		},

		switchCurrentProduct(state, newProductId) {
			const currentProductNode = state.helpersRef.getNodeById(state.currentProductId)
			const newCurrentProductNode = state.helpersRef.getNodeById(newProductId)
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

		saveTreeExpansionState(state) {
			if (state.currentView === 'detailProduct') {
				state.lastSessionData.detailView.expandedNodes = []
				state.lastSessionData.detailView.doShowNodes = []
				state.helpersRef.traverseModels((nm) => {
					if (nm.isExpanded) {
						state.lastSessionData.detailView.expandedNodes.push(nm._id)
					}
					if (nm.doShow) {
						state.lastSessionData.detailView.doShowNodes.push(nm._id)
					}
				})
			}
			if (state.currentView === 'coarseProduct') {
				state.lastSessionData.coarseView.expandedNodes = []
				state.lastSessionData.coarseView.doShowNodes = []
				state.helpersRef.traverseModels((nm) => {
					if (nm.isExpanded) {
						state.lastSessionData.coarseView.expandedNodes.push(nm._id)
					}
					if (nm.doShow) {
						state.lastSessionData.coarseView.doShowNodes.push(nm._id)
					}
				})
			}
		},

		endSession(state, caller) {
			// stop the timers
			if (state.authentication) clearInterval(state.authentication.runningCookieRefreshId)
			if (state.watchdog) clearInterval(state.watchdog.runningWatchdogId)
			state.signedOut = true
			state.signingOut = false
			if (state.debug) console.log(`endSession: caller = ${caller}`)
			// reset the app by reloading skipping the cache
			window.location.reload(true)
		},
	},

	modules: {
		attachments,
		authentication,
		calendars,
		clone,
		helpers,
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
		undo,
		update_reqarea,
		update,
		useracc,
		utils,
		watchdog,
	},
})

export default store
