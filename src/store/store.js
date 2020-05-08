import Vue from 'vue'
import Vuex from 'vuex'
import globalAxios from 'axios'
import router from '../router'
import logging from './modules/logging'
import startup from './modules/startup'
import initdb from './modules/initdb'
import help from './modules/help'
import load from './modules/reload'
import clone from './modules/clone'
import sync from './modules/sync'
import useracc from './modules/useracc'
import update from './modules/update'
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
const INPROGRESS = 3
const TESTREVIEW = 4
const DONE = 5
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		// console log settings
		debug: true,
		isProductAssigned: false,
		showWatchdogInfo: false,
		// loading options
		autoCorrectUserProfile: true,
		// logging
		logState: {
			logSavePending: false,
			runningWatchdogId: null,
			savedLogs: [],
			unsavedLogs: []
		},
		//startup
		currentDefaultProductId: null,
		currentProductId: null,
		currentProductTitle: "",
		stopListenForChanges: false,
		// tree loading
		loadedTreeDepth: undefined,
		treeNodes: [],
		// detail tree view
		reqAreaMapper: {},
		// coarse tree view
		currentView: undefined,
		colorMapper: {},
		reqAreaOptions: [],
		// detail & coarse tree views
		busyRemoving: false,
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
		selectedNodes: [],
		selectNodeOngoing: false,
		uploadDone: true,
		// utilities for server Admin and admin
		areDatabasesFound: false,
		areProductsFound: false,
		areTeamsFound: false,
		backendMessages: [],
		databaseOptions: undefined,
		defaultSprintCalendar: [],
		fetchedTeams: [],
		isCurrentDbChanged: false,
		isDatabaseCreated: false,
		isHistAndCommReset: false,
		isProductCreated: false,
		isPurgeReady: false,
		isSprintCalendarFound: false,
		isTeamCreated: false,
		isUserCreated: false,
		isUserFound: false,
		isUserUpdated: false,
		selectedDatabaseName: '',
		seqKey: 0,
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
		loadedSprintId: null,
		stories: []
	},

	getters: {
		getNodeSelected(state) {
			// return the last selected node or undefined when no node is selected
			return state.selectedNodes.slice(-1)[0]
		},

		leafLevel(state) {
			if (state.currentView === 'detailProduct') return TASKLEVEL
			if (state.currentView === 'coarseProduct') return FEATURELEVEL
			return PBILEVEL
		},
		isAuthenticated(state) {
			return state.userData.user !== undefined
		},
		isFollower(state) {
			if (!state.currentDoc.followers) return false

			const emails = state.currentDoc.followers.map(e => e.email)
			if (state.currentDoc) return emails.includes(state.userData.email)
		},
		// note that the roles of _admin and admin are generic (not product specific)
		isServerAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("_admin")
		},
		isAdmin(state, getters) {
			return getters.isAuthenticated && state.userData.sessionRoles.includes("admin")
		},
		isPO(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("PO")
		},
		isAPO(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("APO")
		},
		isDeveloper(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		isGuest(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isAuthenticated && myCurrentProductRoles.includes.includes("guest")
		},
		canCreateComments(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isServerAdmin || getters.isAdmin ||
				getters.isAuthenticated && myCurrentProductRoles.includes("PO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("APO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("developer")
		},
		canUploadAttachments(state, getters) {
			const myCurrentProductRoles = state.userData.myProductsRoles[state.currentProductId]
			return getters.isServerAdmin || getters.isAdmin ||
				getters.isAuthenticated && myCurrentProductRoles.includes("PO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("APO") ||
				getters.isAuthenticated && myCurrentProductRoles.includes("developer")
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
			if (state.currentDoc.sprintId && state.configData.defaultSprintCalendar) {
				for (let s of state.configData.defaultSprintCalendar) {
					if (s.id === state.currentDoc.sprintId) return s.name
				}
			}
		},

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
		}
	},

	mutations: {
		addSelectedNode(state, newNode) {
			if (newNode.isSelectable) {
				newNode.isSelected = true
				if (!state.selectedNodes.includes(newNode)) state.selectedNodes.push(newNode)
			}
		},

		renewSelectedNodes(state, newNode) {
			if (newNode.isSelectable) {
				for (let n of state.selectedNodes) n.isSelected = false
				newNode.isSelected = true
				state.selectedNodes = [newNode]
			}
		},

		/* Update the currently selected node. Note that not all props are covered */
		updateNodeSelected(state, payload) {
			if (payload.newNode && payload.newNode.isSelectable) {
				for (let n of state.selectedNodes) n.isSelected = false
				payload.newNode.isSelected = true
				state.selectedNodes = [payload.newNode]
			}
			const keys = Object.keys(payload)
			const nodeSelected = state.selectedNodes.slice(-1)[0]
			for (let k of keys) {
				switch (k) {
					case 'productId':
						nodeSelected.productId = payload.productId
						break
					case 'title':
						nodeSelected.title = payload.title
						break
					case 'isSelected':
						nodeSelected.isSelected = payload.isSelected
						break
					case 'isExpanded':
						nodeSelected.isExpanded = payload.isExpanded
						break
					case 'markViolation':
						nodeSelected.markViolation = payload.markViolation
						break
					case 'state':
						nodeSelected.data.state = payload.state
						break
					case 'reqarea':
						nodeSelected.data.reqarea = payload.reqarea
						break
					case 'sprintId':
						nodeSelected.data.sprintId = payload.sprintId
						break
					case 'inconsistentState':
						nodeSelected.data.inconsistentState = payload.inconsistentState
						break
					case 'team':
						nodeSelected.data.team = payload.team
						break
					case 'taskOwner':
						nodeSelected.data.taskOwner = payload.taskOwner
						break
					case 'subtype':
						nodeSelected.data.subtype = payload.subtype
						break
					case 'reqAreaItemcolor':
						nodeSelected.data.reqAreaItemcolor = payload.reqAreaItemcolor
						break
					case 'lastPositionChange':
						nodeSelected.data.lastPositionChange = payload.lastPositionChange
						break
					case 'lastStateChange':
						nodeSelected.data.lastStateChange = payload.lastStateChange
						break
					case 'lastContentChange':
						nodeSelected.data.lastContentChange = payload.lastContentChange
						break
					case 'lastCommentAddition':
						nodeSelected.data.lastCommentAddition = payload.lastCommentAddition
						break
					case 'lastAttachmentAddition':
						nodeSelected.data.lastAttachmentAddition = payload.lastAttachmentAddition
						break
					case 'lastCommentToHistory':
						nodeSelected.data.lastCommentToHistory = payload.lastCommentToHistory
						break
					case 'lastChange':
						nodeSelected.data.lastChange = payload.lastChange
						break
					default:
						// eslint-disable-next-line no-console
						if (k !== 'newNode') console.log('nodeSelected: cannot update nodeSelected, unknown key = ' + k)
				}
			}
		},

		/*
		* Update the currently loaded document.
		* Decode the description and acceptence criteria.
		* Note that not all fields are covered
		*/
		updateCurrentDoc(state, payload) {
			if (payload.newDoc) {
				state.currentDoc = payload.newDoc
				// decode from base64 + replace the encoded data
				state.currentDoc.description = window.atob(payload.newDoc.description)
				state.currentDoc.acceptanceCriteria = window.atob(payload.newDoc.acceptanceCriteria)
			}
			const keys = Object.keys(payload)
			for (let k of keys) {
				switch (k) {
					case '_rev':
						state.currentDoc._rev = payload._rev
						break
					case '_attachments':
						state.currentDoc._attachments = payload._attachments
						break
					case 'shortId':
						state.currentDoc.shortId = payload.shortId
						break
					case 'productId':
						state.currentDoc.productId = payload.productId
						break
					case 'parentId':
						state.currentDoc.parentId = payload.parentId
						break
					case 'reqarea':
						state.currentDoc.reqarea = payload.reqarea
						break
					case 'sprintId':
						state.currentDoc.sprintId = payload.sprintId
						break
					case 'team':
						state.currentDoc.team = payload.team
						break
					case 'level':
						state.currentDoc.level = payload.level
						break
					case 'subtype':
						state.currentDoc.subtype = payload.subtype
						break
					case 'state':
						state.currentDoc.state = payload.state
						break
					case 'tssize':
						state.currentDoc.tssize = payload.tssize
						break
					case 'spsize':
						state.currentDoc.spsize = payload.spsize
						break
					case 'spikepersonhours':
						state.currentDoc.spikepersonhours = payload.spikepersonhours
						break
					case 'title':
						state.currentDoc.title = payload.title
						break
					case 'followers':
						state.currentDoc.followers = payload.followers
						break
					case 'newFollower':
						state.currentDoc.followers.push(payload.newFollower)
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
					case 'description':
						state.currentDoc.description = window.atob(payload.description)
						break
					case 'acceptanceCriteria':
						state.currentDoc.acceptanceCriteria = window.atob(payload.acceptanceCriteria)
						break
					case 'priority':
						state.currentDoc.priority = payload.priority
						break
					case 'newComment':
						state.currentDoc.comments.unshift(payload.newComment)
						break
					case 'newHist':
						state.currentDoc.history.unshift(payload.newHist)
						break
					case 'delmark':
						state.currentDoc.delmark = payload.delmark
						break
					case 'color':
						state.currentDoc.color = payload.color
						break
					default:
						// eslint-disable-next-line no-console
						if (k !== 'newDoc') console.log('currentDoc: cannot update currentDoc, unknown key = ' + k)
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

		createSprint(state, payload) {
			const parentIdToNameMap = {}
			function getParentName(id) {
				let name = parentIdToNameMap[id]
				if (name) {
					return name
				} else {
					const parent = window.slVueTree.getNodeById(id)
					if (parent) {
						name = parent.title
						parentIdToNameMap[id] = name
						return name
					}
				}
				return 'unknown'
			}

			for (let i = 0; i < payload.storieResults.length; i++) {
				const storyId = payload.storieResults[i].id
				const featureId = payload.storieResults[i].value[1]
				const featureName = getParentName(featureId)
				const storyTitle = payload.storieResults[i].value[2]
				const subType = payload.storieResults[i].value[4]
				const storySize = payload.storieResults[i].value[6]
				const newStory = {
					idx: i,
					storyId,
					featureId,
					featureName,
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
					if (t.value[1] === storyId) {
						const taskState = t.value[5]
						switch (taskState) {
							case TODO:
								newStory.tasks[TODO].push({
									id: t.id,
									title: t.value[2],
									taskOwner: t.value[7]
								})
								break
							case INPROGRESS:
								newStory.tasks[INPROGRESS].push({
									id: t.id,
									title: t.value[2],
									taskOwner: t.value[7]
								})
								break
							case TESTREVIEW:
								newStory.tasks[TESTREVIEW].push({
									id: t.id,
									title: t.value[2],
									taskOwner: t.value[7]
								})
								break
							case DONE:
								newStory.tasks[DONE].push({
									id: t.id,
									title: t.value[2],
									taskOwner: t.value[7]
								})
								break
						}
					}
				}
				state.stories.push(newStory)
			}
		},

		resetData(state) {
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
		}
	},

	actions: {
		/* Refresh the autentication cookie */
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
		startup,
		initdb,
		logging,
		help,
		load,
		clone,
		sync,
		useracc,
		update,
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
