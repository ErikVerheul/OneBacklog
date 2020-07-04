import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router'
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
import remove from './modules/remove'
import utils from './modules/utils'
import restorebranches from './modules/restorebranches'
import loadproducts from './modules/load_detail.js'
import loadreqareas from './modules/load_coarse.js'
import planningboard from './modules/planningboard.js'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

const TODO = 2
const READY = 3
const INPROGRESS = 4
const TESTREVIEW = 5
const DONE = 6

const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const AREA_PRODUCTID = '0'

Vue.use(Vuex)

/* If the node is selectable, save the currently selected nodes, unselect all previous selected nodes and select the node */
function renewSelection(state, node) {
	if (node.isSelectable) {
		state.previousSelectedNodes = state.selectedNodes || [node]
		for (let n of state.selectedNodes) n.isSelected = false
		node.isSelected = true
		state.selectedNodes = [node]
	}
}

/* Remove 'ignoreEvent' elements from history */
function cleanHistory(doc) {
	const cleanedHistory = []
	for (let h of doc.history) {
		if (Object.keys(h)[0] !== 'ignoreEvent') cleanedHistory.push(h)
	}
	doc.history = cleanedHistory
	return doc
}

export default new Vuex.Store({
	state: {
		// console log settings
		debug: true,
		isProductAssigned: false,
		showWatchdogInfo: false,
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
		// startup
		currentDefaultProductId: null,
		currentProductId: null,
		currentProductTitle: "",
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
		filterForComment: "",
		filterForHistory: "",
		filterText: 'Filter in tree view',
		filterOn: false,
		findIdOn: false,
		keyword: '',
		moveOngoing: false,
		lastEvent: '',
		lastTreeView: undefined,
		searchOn: false,
		selectedForView: 'comments',
		previousSelectedNodes: undefined,
		selectedNodes: [],
		selectNodeOngoing: false,
		uploadDone: true,
		// utilities for server Admin and admin
		areDatabasesFound: false,
		areProductsFound: false,
		areTeamsFound: false,
		areTeamsRemoved: false,
		backendMessages: [],
		databaseOptions: undefined,
		userDatabaseOptions: undefined,
		defaultSprintCalendar: [],
		fetchedTeams: [],
		isCurrentDbChanged: false,
		isDatabaseCreated: false,
		isHistAndCommReset: false,
		isProductCreated: false,
		isPurgeReady: false,
		isSprintCalendarFound: false,
		isDefaultSprintCalendarSaved: false,
		isTeamCreated: false,
		isUserCreated: false,
		isUserFound: false,
		isUserUpdated: false,
		selectedDatabaseName: '',
		seqKey: 0,
		teamsToRemoveIds: [],
		teamsToRemoveOptions: [],
		userOptions: [],
		warning: '',
		// app wide globals
		configData: null,
		cookieAutenticated: false,
		demo: true,
		eventSyncColor: '#004466',
		eventBgColor: '#408FAE',
		listenForChangesRunning: false,
		myProductOptions: [],
		online: true,
		runningCookieRefreshId: null,
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
		/* Return the previous selected node or the currently selected node if no previous node was selected */
		getpreviousNodeSelected(state) {
			return state.previousSelectedNodes.slice(-1)[0]
		},
		/* Return the last selected node or undefined when no node is selected */
		getNodeSelected(state) {
			return state.selectedNodes.slice(-1)[0]
		},
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},
		isFollower(state) {
			if (!state.currentDoc.followers) return false

			const emails = state.currentDoc.followers.map(e => e.email)
			if (state.currentDoc) return emails.includes(state.userData.email)
		},
		isReqAreaItem(state) {
			return state.currentDoc.productId === AREA_PRODUCTID
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
				for (let s of state.sprintCalendar) {
					if (s.id === state.currentDoc.sprintId) return s.name
				}
			}
		},
		leafLevel(state) {
			if (state.currentView === 'detailProduct') return TASKLEVEL
			if (state.currentView === 'coarseProduct') return FEATURELEVEL
			return PBILEVEL
		},
		myAssignedProductIds(state) {
			return state.userData.userAssignedProductIds
		},
		myProductRoles(state, getters) {
			if (getters.isAuthenticated) {
				return state.userData.myProductsRoles[state.currentProductId]
			} else return []
		},
		myTeam(state) {
			return state.userData.myTeam
		},
		//////////////////////// generic (not product specific) roles ////////////////////////
		isServerAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("_admin")
		},
		isAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("admin")
		},
		isAPO(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("APO")
		},
		/////////////////////////////// product specific roles ///////////////////////////////
		////  available after the the user data are read and the currentProductId is set   ///
		isPO(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes("PO")
			} else return false
		},
		isDeveloper(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes("developer")
			} else return false
		},
		isGuest(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
				return myCurrentProductRoles && myCurrentProductRoles.includes.includes("guest")
			} else return false
		},
		canCreateComments(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
				return myCurrentProductRoles &&
					(getters.isServerAdmin || getters.isAdmin ||
						myCurrentProductRoles.includes("PO") ||
						myCurrentProductRoles.includes("APO") ||
						myCurrentProductRoles.includes("developer"))
			} else return false
		},
		canUploadAttachments(state, getters) {
			if (getters.isAuthenticated && state.currentProductId) {
				const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
				return myCurrentProductRoles &&
					(getters.isServerAdmin || getters.isAdmin ||
						myCurrentProductRoles.includes("PO") ||
						myCurrentProductRoles.includes("APO") ||
						myCurrentProductRoles.includes("developer"))
			} else return false
		},
		/////////////////////////////// planning board getters //////////////////////////////
		getStoryPoints(state) {
			let sum = 0
			for (let s of state.stories) {
				sum += s.size
			}
			return sum
		},
		getStoryPointsDone(state) {
			let sum = 0
			for (let s of state.stories) {
				if (s.tasks[TODO].length === 0 &&
					s.tasks[INPROGRESS].length === 0 &&
					s.tasks[TESTREVIEW].length === 0 &&
					s.tasks[DONE].length > 0) sum += s.size
			}
			return sum
		},

		/////////////////////////////////////// calendar ////////////////////////////////////
		teamCalendarInUse(state) {
			if (state.configData) {
				return state.sprintCalendar !== state.configData.defaultSprintCalendar
			} else return false
		}
	},

	mutations: {
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
				// if no node is specified in the payload the last selected node is updated
				const node = payload.node || payload.selectNode || payload.unselectNode || state.selectedNodes.slice(-1)[0]
				const keys = Object.keys(payload)
				if (node) {
					// apply changes on the nodes in the tree view
					for (let k of keys) {
						switch (k) {
							case 'addConditionalFor':
								if (node.conditionalFor) { node.conditionalFor.push(payload.addConditionalFor) } else node.conditionalFor = payload.addConditionalFor
								break
							case 'addDependencyOn':
								if (node.dependencies) { node.dependencies.push(payload.addDependencyOn) } else node.dependencies = payload.addDependencyOn
								break
							case 'conditionsremoved':
								node.conditionalFor = payload.conditionsremoved
								break
							case 'dependenciesRemoved':
								node.dependencies = payload.dependenciesRemoved
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
							case 'markViolation':
								node.markViolation = payload.markViolation
								break
							case 'newHist':
								// nodes do not contain history
								break
							case 'node':
								break
							case 'productId':
								node.productId = payload.productId
								break
							case 'removeLastConditionalFor':
								node.conditionalFor = node.conditionalFor.slice(0, -1)
								break
							case 'removeLastDependencyOn':
								node.dependencies = node.dependencies.slice(0, -1)
								break
							case 'reqarea':
								node.data.reqarea = payload.reqarea
								break
							case 'reqAreaItemcolor':
								node.data.reqAreaItemcolor = payload.reqAreaItemcolor
								break
							case 'selectNode':
								if (node.isSelectable) {
									state.previousSelectedNodes = state.selectedNodes || [node]
									for (let n of state.selectedNodes) n.isSelected = false
									node.isSelected = true
									state.selectedNodes = [node]
								}
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
							case 'unselectNode':
								state.previousSelectedNodes = state.selectedNodes || [node]
								state.selectedNodes = []
								for (let n of state.selectedNodes) {
									if (n !== node) state.selectedNodes.push(n)
								}
								node.isSelected = false
								break
							default:
								// eslint-disable-next-line no-console
								if (state.debug) console.log(`updateNodesAndCurrentDoc: property '${k}' has no matching update, node.title = ${node.title}, keys = ${keys}`)
						}
					}
				}
				if (node._id === state.currentDoc._id) {
					// apply changes on the currently displayed item
					for (let k of keys) {
						switch (k) {
							case '_attachments':
								state.currentDoc._attachments = payload._attachments
								break
							case '_rev':
								state.currentDoc._rev = payload._rev
								break
							case 'acceptanceCriteria':
								state.currentDoc.acceptanceCriteria = window.atob(payload.acceptanceCriteria)
								break
							case 'conditionalFor':
								state.currentDoc.conditionalFor = payload.conditionalFor
								break
							case 'delmark':
								state.currentDoc.delmark = payload.delmark
								break
							case 'dependencies':
								state.currentDoc.dependencies = payload.dependencies
								break
							case 'description':
								state.currentDoc.description = window.atob(payload.description)
								break
							case 'followers':
								state.currentDoc.followers = payload.followers
								break
							case 'lastAttachmentAddition':
								state.currentDoc.lastAttachmentAddition = payload.lastAttachmentAddition
								break
							case 'lastAttachmentRemoval':
								state.currentDoc.lastAttachmentRemoval = payload.lastAttachmentRemoval
								break
							case 'lastChange':
								state.currentDoc.lastChange = payload.lastChange
								break
							case 'lastCommentAddition':
								state.currentDoc.lastCommentAddition = payload.lastCommentAddition
								break
							case 'lastCommentToHistory':
								state.currentDoc.lastCommentToHistory = payload.lastCommentToHistory
								break
							case 'lastContentChange':
								state.currentDoc.lastContentChange = payload.lastContentChange
								break
							case 'lastPositionChange':
								state.currentDoc.lastPositionChange = payload.lastPositionChange
								break
							case 'lastStateChange':
								state.currentDoc.lastStateChange = payload.lastStateChange
								break
							case 'leavingFollower':
								{
									const updatedFollowers = []
									for (let f of state.currentDoc.followers) {
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
							case 'reqarea':
								state.currentDoc.reqarea = payload.reqarea
								break
							case 'reqAreaItemcolor':
								state.currentDoc.color = payload.reqAreaItemcolor
								break
							case 'selectNode':
								break
							case 'shortId':
								state.currentDoc.shortId = payload.shortId
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
							case 'subtype':
								state.currentDoc.subtype = payload.subtype
								break
							case 'state':
								state.currentDoc.state = payload.state
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
							default:
								// eslint-disable-next-line no-console
								if (state.debug) console.log(`updateNodesAndCurrentDoc: property '${k}' has no matching update, currentDoc.title = ${state.currentDoc.title}, keys = ${keys}`)
						}
					}
				}
			}
		},

		updateTeam(state, newTeam) {
			state.userData.myTeam = newTeam
		},

		/* A copy of the showLastEvent mixin which can not be used in modules */
		showLastEvent(state, payload) {
			switch (payload.severity) {
				case DEBUG:
					state.eventBgColor = 'yellow'
					break
				case INFO:
					state.eventBgColor = '#408FAE'
					break
				case WARNING:
					state.eventBgColor = 'orange'
					break
				case ERROR:
					state.eventBgColor = 'red'
					break
				case CRITICAL:
					state.eventBgColor = '#ff5c33'
			}
			state.lastEvent = payload.txt
		},

		resetData(state) {
			state.createDefaultCalendar = false
			state.treeNodes = []
			state.stories = []
			state.loadedSprintId = null
			state.loadedTreeDepth = undefined
			state.stopListenForChanges = true
			state.listenForChangesRunning = false
			state.lastTreeView = undefined
			state.currentDefaultProductId = null
			state.currentProductId = null
			state.currentProductTitle = ''
			state.isProductAssigned = false
			state.myProductOptions = []
			state.userData = {}
			state.changeHistory = []
			state.showHeaderDropDowns = true
			state.lastEvent = ''
			state.configData = null
			state.currentDoc = null
			state.warning = ''

			clearInterval(state.runningCookieRefreshId)
			clearInterval(state.logState.runningWatchdogId)
		},

		//////////////////// planning board //////////////////////////

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
			for (let f of payload.featureMap) {
				for (let s of payload.storieResults) {
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
								[TODO]: [],
								[INPROGRESS]: [],
								[TESTREVIEW]: [],
								[DONE]: []
							}
						}

						for (let t of payload.taskResults) {
							if (t.key[3] === storyId) {
								const taskState = t.value[2]
								switch (taskState) {
									case TODO:
									case READY:
										newStory.tasks[TODO].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case INPROGRESS:
										newStory.tasks[INPROGRESS].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case TESTREVIEW:
										newStory.tasks[TESTREVIEW].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
									case DONE:
										newStory.tasks[DONE].push({
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
			for (let s of state.stories) {
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
			for (let s of state.stories) {
				if (s.storyId === payload.doc.parentId) {
					let stateTasks = s.tasks[payload.prevState]
					const newTasks = []
					for (let t of stateTasks) {
						if (t.id !== payload.doc._id) newTasks.push(t)
					}
					s.tasks[payload.prevState] = newTasks
					break
				}
			}
		}
	},

	actions: {
		/* Refresh the authentication cookie */
		refreshCookie({
			dispatch,
			state
		}) {
			globalAxios({
				method: 'POST',
				url: '/_session',
				data: { name: state.userData.user, password: state.userData.password }
			}).then(() => {
				state.cookieAutenticated = true
				// eslint-disable-next-line no-console
				if (state.debug) console.log("refreshCookie: Authentication cookie refresh is running.")
			}).catch(error => {
				// stop the interval function and wait for the watchDog to start again
				clearInterval(state.runningCookieRefreshId)
				state.cookieAutenticated = false
				let msg = 'refreshCookie: Refresh of the authentication cookie failed with ' + error
				// eslint-disable-next-line no-console
				if (state.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: CRITICAL })
			})
		},

		/* Refresh the authentication cookie in a contineous loop starting after the timeout value */
		refreshCookieLoop({
			state,
			dispatch
		}, payload) {
			state.runningCookieRefreshId = setInterval(() => {
				dispatch('refreshCookie')
			}, payload.timeout * 1000)
		},

		/* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refrehed within 10 minutes */
		signin({
			dispatch,
			commit,
			state
		}, authData) {
			function create_UUID() {
				var dt = Date.now()
				var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					let r = (dt + Math.random() * 16) % 16 | 0
					dt = Math.floor(dt / 16)
					return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
				})
				return uuid
			}

			globalAxios({
				method: 'POST',
				url: '/_session',
				data: authData
			}).then(res => {
				commit('resetData')
				// email, myTeam, currentDb, myProductSubscriptions, userAssignedProductIds, myProductsRoles and myFilterSettings are updated when otherUserData and config are read
				state.userData = {
					user: res.data.name,
					email: undefined,
					myTeam: undefined,
					password: authData.password,
					myDatabases: [],
					currentDb: undefined,
					sessionRoles: res.data.roles,
					myProductSubscriptions: [],
					userAssignedProductIds: [],
					myProductsRoles: {},
					myFilterSettings: undefined,
					sessionId: create_UUID()
				}
				state.cookieAutenticated = true
				// refresh the session cookie after 9 minutes (CouchDB defaults at 10 min.)
				dispatch('refreshCookieLoop', {
					timeout: 540
				})
				dispatch('getDatabases')
			})
				// cannot log failure here as the database name is unknown yet
				// eslint-disable-next-line no-console
				.catch(error => console.log('Sign in failed with ' + error))
		},

		signout({ commit }) {
			commit('resetData')
			router.replace('/')
		},
	},

	modules: {
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
		remove,
		utils,
		restorebranches,
		loadproducts,
		loadreqareas,
		planningboard
	}

})
