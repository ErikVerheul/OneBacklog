// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other (async) database updates are done.
import { SEV, MISC } from '../constants.js'
import { createStore } from 'vuex'
import globalAxios from 'axios'
import { expandNode, collapseNode, addToArray, localTimeAndMilis, prepareDocForPresentation, removeFromArray } from '../common_functions.js'
import attachments from './modules/attachments'
import authentication from './modules/authentication'
import calendars from './modules/calendars'
import clone from './modules/clone'
import dependencies from './modules/dependencies'
import filterSelectSearch from './modules/filterSelectSearch'
import help from './modules/help'
import helpers from './modules/helpers'
import initdb from './modules/initdb'
import loadproducts from './modules/loadTreeModel.js'
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
	let backgroundColor = '#408fae'
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
			backgroundColor = '#408fae'
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

	return {
		eventKey: payload.eventKey,
		time: localTimeAndMilis(new Date()),
		txt: payload.txt,
		sevKey: payload.severity,
		severity: severityStr,
		backgroundColor,
		textColor,
	}
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
			appVersion: '3.3.0',
			preventExit: true, // prevent the browser from leaving the page without confirmation
			// generic helper functions
			helpersRef: null,
			// console log settings
			debug: import.meta.env.VITE_DEBUG === 'true' || false,
			debugAccess: import.meta.env.VITE_DEBUG_ACCESS === 'true' || false,
			debugConnectionAndLogging: import.meta.env.VITE_DEBUG_CONNECTION === 'true' || false,
			// creating a CouchDb instance
			isDatabaseInitiated: false,
			// authentication
			mySessionId: null,
			// startup
			onLargeScreen: window.innerWidth >= 1400,
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
			lastSessionData: {},
			loadedTreeDepth: undefined,
			myTeamId: null,
			productTitlesMap: {},
			treeNodes: [],
			// tree view
			colorMapper: {},
			reqAreaOptions: [],
			busyWithLastUndo: false,
			busyChangingSubscriptions: false,
			currentDoc: null,
			currentView: undefined,
			changeHistory: [],
			currentEventKey: 0,
			eventList: [],
			filterForCommentSearchString: '',
			filterForHistorySearchString: '',
			freezeEvent: false,
			lastLoadedDocId: undefined,
			moveOngoing: false,
			newEventKey: 0,
			oldAcceptance: MISC.EMPTYQUILL,
			oldDescription: MISC.EMPTYQUILL,
			progressMessage: '',
			reqAreaMapper: {},
			searchOn: false,
			selectedForView: 'comments',
			selectedNodes: [],
			selectNodeOngoing: false,
			showGoMessaging: false,
			showProgress: false,
			uploadDone: true,
			// view and send messages
			messSquareColor: MISC.SQUAREBGNDCOLOR,
			msgBlinkIds: [],
			teamMessages: [],
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
			isCommentsReset: false,
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
			// app wide globals
			configData: null,
			listenForChangesRunning: false,
			myProductOptions: [],
			nowSyncing: false,
			online: true,
			showHeaderDropDowns: true,
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

		getCurrentItemTsSize(state) {
			if (state.configData) return state.configData.tsSize[state.currentDoc.tssize]
		},

		getCurrentItemLevel(state) {
			if (state.currentDoc) return state.currentDoc.level
		},

		getCurrentItemState(state) {
			if (state.currentDoc) return state.currentDoc.state
		},

		/* Returns the sprint name if found in the user's current teamcalendar or in the default calendar */
		getItemSprintName(state) {
			if (state.currentDoc.sprintId && state.myCurrentSprintCalendar) {
				for (const s of state.myCurrentSprintCalendar) {
					if (s.id === state.currentDoc.sprintId) return s.name
				}
			}
		},

		getLastEventTxt(state) {
			function getTip() {
				if (store.state.freezeEvent) return ' - CLICK to unlock'
				return ''
			}

			if (state.showProgress) return state.progressMessage
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.txt + getTip()
		},

		getLastEventBGColor(state) {
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.backgroundColor
		},

		getLastEventTextColor(state) {
			const currentEvt = getCurrentEvt(state.eventList, state.currentEventKey)
			if (currentEvt !== null) return currentEvt.textColor
		},

		/* Return the selected node or undefined when no node is selected */
		getSelectedNode(state) {
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

		/* Return the productIds of the products assigned to me in my current database */
		getMyAssignedProductIds(state) {
			if (state.userData.myDatabases) {
				const productsRoles = state.userData.myDatabases[state.userData.currentDb].productsRoles
				return Object.keys(productsRoles)
			} else return []
		},

		getMyProductSubscriptionIds(state, getters) {
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

		getTreeModel(state) {
			return state.treeNodes
		},

		isPlanningBoardSelected(state) {
			return state.currentView === 'planningBoard'
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
						state.userData.myDatabases[state.userData.currentDb].subscriptions = addToArray(state.userData.myDatabases[state.userData.currentDb].subscriptions, payload.productId)
						updateProducts()
					} else {
						const tmpUserData = res.data
						tmpUserData.myDatabases[tmpUserData.currentDb].productsRoles[payload.productId] = payload.newRoles
						tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = addToArray(tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions, payload.productId)
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
							commit('endSession', `removeFromMyProducts, productId = ${payload.productId}`)
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
						if (getters.getMyProductSubscriptionIds.includes(payload.productId)) {
							// delete the id from my subscriptions
							tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions = removeFromArray(tmpUserData.myDatabases[tmpUserData.currentDb].subscriptions, payload.productId)
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
					// update the lastSessionData
					if (tmpUserData.myDatabases[state.userData.currentDb].lastSessionData) {
						if (tmpUserData.myDatabases[state.userData.currentDb].lastSessionData) {
							const lastSelectedProductId = tmpUserData.myDatabases[state.userData.currentDb].lastSessionData.lastSelectedProductId
							if (!lastSelectedProductId || !payload.productIds.includes(lastSelectedProductId)) {
								// the lastSelectedProductId is not available or not in the newly selected product ids
								delete tmpUserData.myDatabases[state.userData.currentDb].lastSessionData
							} else {
								// add all subscribed product ids (needed in case the user extended the range of subscribed products)
								for (let productId of payload.productIds) {
									tmpUserData.myDatabases[state.userData.currentDb].lastSessionData.expandedNodes.push(productId)
									tmpUserData.myDatabases[state.userData.currentDb].lastSessionData.doShowNodes.push(productId)
								}
							}
						}
					}
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
		 * Show a message in the message bar in the Backlog tree view
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

		unlockOrShowAllMessages(state) {
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
				newNode.isSelected = true
				if (!state.selectedNodes.includes(newNode)) state.selectedNodes.push(newNode)
			}
		},

		/* If the node is selectable, store the currently selected nodes, unselect all previous selected nodes and select the node */
		renewSelectedNodes(state, newNode) {
			if (newNode.isSelectable) {
				for (const n of state.selectedNodes) n.isSelected = false
				newNode.isSelected = true
				state.selectedNodes = [newNode]
			}
		},

		/* The keys of the payload object are evaluated by key name and value */
		updateNodewithDocChange(state, payload) {
			if (payload.newDoc) {
				// set default team and decode text fields
				state.currentDoc = prepareDocForPresentation(payload.newDoc)
				state.lastLoadedDocId = payload.newDoc._id
			} else {
				const node = payload.node
				const keys = Object.keys(payload)
				if (node) {
					// apply changes on the nodes in the tree view
					for (const k of keys) {
						switch (k) {
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
								break
							case 'lastAttachmentRemoval':
								node.data.lastAttachmentRemoval = payload.lastAttachmentRemoval
								break
							case 'lastOtherChange':
								node.data.lastOtherChange = payload.lastOtherChange
								break
							case 'lastCommentAddition':
								node.data.lastCommentAddition = payload.lastCommentAddition
								node.data.lastOtherChange = payload.lastCommentAddition
								break
							case 'lastContentChange':
								node.data.lastContentChange = payload.lastContentChange
								break
							case 'lastPositionChange':
								node.data.lastPositionChange = payload.lastPositionChange
								break
							case 'lastStateChange':
								node.data.lastStateChange = payload.lastStateChange
								break
							case 'level':
								node.level = payload.level
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
							case 'reqarea':
								node.data.reqarea = payload.reqarea
								break
							case 'reqAreaItemColor':
								node.data.reqAreaItemColor = payload.reqAreaItemColor
								break
							case 'sprintId':
								node.data.sprintId = payload.sprintId
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
							default:
								if (state.debug) console.log(`updateNodewithDocChange.update node: property '${k}' has no matching update, node.title = ${node.title}, keys = ${keys}`)
						}
					}
				} else {
					if (state.debug) console.log(`updateNodewithDocChange failed: cannot apply changes as no valid node is passed, keys are: ${keys}`)
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

		createTreeExpansionState(state, lastSelectedNode) {
			if (lastSelectedNode) {
				if (!state.lastSessionData) state.lastSessionData = {}

				state.lastSessionData = { expandedNodes: [], doShowNodes: [] }
				state.helpersRef.traverseModels((nm) => {
					if (nm.isExpanded) {
						state.lastSessionData.expandedNodes.push(nm._id)
						state.lastSessionData.doShowNodes.push(nm._id)
					} else if (nm.doShow) {
						state.lastSessionData.doShowNodes.push(nm._id)
					}
				})
				state.lastSessionData.lastSelectedNodeId = lastSelectedNode._id
				state.lastSessionData.lastSelectedProductId = lastSelectedNode.productId
			} else {
				if (state.debug) console.log(`createTreeExpansionState: Cannot save the expansion state. The last selected node is not avaiable`)
			}
		},

		restoreTreeExpansionState(state) {
			state.helpersRef.traverseModels((nm) => {
				nm.isExpanded = state.lastSessionData.expandedNodes.includes(nm._id) && nm._id !== MISC.AREA_PRODUCTID
				nm.doShow = state.lastSessionData.doShowNodes.includes(nm._id) && nm.parentId !== MISC.AREA_PRODUCTID
				nm.isSelected = nm._id === state.lastSessionData.lastSelectedNodeId
			})
			state.selectedNodes = [state.helpersRef.getNodeById(state.lastSessionData.lastSelectedNodeId)]
		},

		endSession(state, caller) {
			if (state.debug) console.log(`store.endSession called by ${caller}`)
			state.preventExit = false
			// stop the timers
			if (state.authentication) clearInterval(state.authentication.runningCookieRefreshId)
			if (state.watchdog) clearInterval(state.watchdog.runningWatchdogId)
			state.signedOut = true
			// reset the app by reloading and skipping the cache (Firefox only)
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
		filterSelectSearch,
		help,
		initdb,
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
