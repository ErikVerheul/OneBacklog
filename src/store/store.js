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
import utils from './modules/utils'
import removebranch from './modules/removebranch'
import restorebranches from './modules/restorebranches'
import loadproducts from './modules/load_detail'
import loadoverview from './modules/load_coarse'
import planningboard from './modules/planningboard'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3

const ON_HOLD = 1
const TODO = 2
const READY = 3
const INPROGRESS = 4
const TESTREVIEW = 5
const DONE = 6

const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6
const AREA_PRODUCTID = 'requirement-areas'

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
		debug: false,
		debugConnectionAndLogging: false,
		isProductAssigned: false,
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
		isLogLoaded: false,
		isProductCreated: false,
		isPurgeReady: false,
		isSprintCalendarFound: false,
		isDefaultSprintCalendarSaved: false,
		isTeamCreated: false,
		isUserCreated: false,
		isUserFound: false,
		isUserUpdated: false,
		logEntries: [],
		selectedDatabaseName: '',
		seqKey: 0,
		teamsToRemoveIds: [],
		teamsToRemoveOptions: [],
		userOptions: [],
		warning: '',
		// app wide globals
		configData: null,
		cookieAuthenticated: false,
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
			return state.currentDoc._id === AREA_PRODUCTID || state.currentDoc.productId === AREA_PRODUCTID
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
		/* Create or re-create the color mapper from the defined req areas (only available in Products overview) */
		createColorMapper(state) {
			const currReqAreaNodes = window.slVueTree.getReqAreaNodes()
			if (currReqAreaNodes) {
				state.colorMapper = {}
				for (let nm of currReqAreaNodes) {
					state.colorMapper[nm._id] = { reqAreaItemColor: nm.data.reqAreaItemColor }
				}
			}
		},

		/* Change one color; must create a new object for reactivity */
		updateColorMapper(state, payload) {
			const newColorMapper = {}
			for (let id of Object.keys(state.colorMapper)) {
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
					for (let k of keys) {
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
							case 'markViolation':
								node.markViolation = payload.markViolation
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
									for (let n of state.selectedNodes) n.isSelected = false
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
								for (let n of state.selectedNodes) {
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
									state.currentDoc.description = window.atob(payload.description)
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
										for (let f of state.currentDoc.followers) {
											if (f !== payload.leavingFollower) updatedFollowers.push(f)
										}
										state.currentDoc.followers = updatedFollowers
									}
									break
								case 'level':
									state.currentDoc.level = payload.level
									break
								case 'markViolation':
									// not a database field
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
			state.changeHistory = []
			state.configData = null
			state.currentDoc = null
			state.createDefaultCalendar = false
			state.currentDefaultProductId = null
			state.currentProductId = null
			state.currentProductTitle = ''
			state.isProductAssigned = false
			state.lastEvent = ''
			state.lastTreeView = undefined
			state.listenForChangesRunning = false
			state.loadedSprintId = null
			state.loadedTreeDepth = undefined
			state.myProductOptions = []
			state.showHeaderDropDowns = true
			state.stopListenForChanges = true
			state.stories = []
			state.treeNodes = []
			state.userData = {}
			state.warning = ''

			clearInterval(state.runningCookieRefreshId)
			state.cookieAuthenticated = false
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
				for (let s of payload.pbiResults) {
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
								[ON_HOLD]: [],
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
									case ON_HOLD:
										newStory.tasks[ON_HOLD].push({
											id: t.id,
											title: t.value[0],
											taskOwner: t.value[4],
											priority: -t.key[5]
										})
										break
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
			rootState,
			dispatch,
			state
		}, payload) {
			if (rootState.online) {
				globalAxios({
					method: 'POST',
					url: '/_session',
					data: { name: state.userData.user, password: state.userData.password }
				}).then(() => {
					state.cookieAuthenticated = true
					// eslint-disable-next-line no-console
					if (state.debugConnectionAndLogging) console.log('refreshCookie: Authentication cookie refresh is running')
					// execute passed function if provided
					if (payload.onSuccessCallback !== undefined) payload.onSuccessCallback()
					// execute passed action if provided
					if (payload.toDispatch) {
						// additional dispatches
						for (let td of payload.toDispatch) {
							const name = Object.keys(td)[0]
							// eslint-disable-next-line no-console
							if (rootState.debugConnectionAndLogging) console.log('refreshCookie: dispatching ' + name)
							dispatch(name, td[name])
						}
					}
				}).catch(error => {
					// execute passed function if provided
					if (payload.onFailureCallback !== undefined) payload.onFailureCallback()
					// stop the interval function and wait for the watchDog to start again
					clearInterval(state.runningCookieRefreshId)
					state.cookieAuthenticated = false
					state.stopListenForChanges = true
					state.online = false
					let msg = 'refreshCookie: Refresh of the authentication cookie failed with ' + error
					// eslint-disable-next-line no-console
					if (state.debugConnectionAndLogging) console.log(msg)
					// do not try to save the log if a network error is detected, just queue the log
					const skipSaving = error.message = 'Network error'
					dispatch('doLog', { event: msg, level: CRITICAL, skipSaving })
				})
			}
		},

		/* Refresh the authentication cookie in a contineous loop starting after the timeout value */
		refreshCookieLoop({
			rootState,
			state,
			dispatch
		}, payload) {
			if (rootState.online) {
				state.runningCookieRefreshId = setInterval(() => {
					dispatch('refreshCookie', {})
				}, payload.timeout * 1000)
			}
		},

		/* A one time password authentication creates a cookie for subsequent database calls. The cookie needs be refrehed within 10 minutes */
		signin({
			dispatch,
			commit,
			state
		}, authData) {
			function create_UUID() {
				let dt = Date.now()
				let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
				// set the session cookie and refresh every 9 minutes (CouchDB defaults at 10 min.); on success also get the databases
				const toDispatch = [{ 'refreshCookieLoop': { timeout: 540 } }, { 'getDatabases': null }]
				dispatch('refreshCookie', { toDispatch })
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
		utils,
		removebranch,
		restorebranches,
		loadproducts,
		loadoverview,
		planningboard
	}

})
