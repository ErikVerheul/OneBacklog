import router from '../../router'
import { mapGetters } from 'vuex'

const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3
const DEFAULTCOLOR = '#408FAE'

const DATABASELEVEL = 1
const PRODUCTLEVEL = 2
const EPICLEVEL = 3
const FEATURELEVEL = 4
const PBILEVEL = 5
const TASKLEVEL = 6

const AREA_PRODUCTID = '0'



const authorization = {
	computed: {
		...mapGetters([
			'myTeam',
			'myProductRoles',
			'isServerAdmin',
			'isAdmin',
			'isAPO',
			'isReqAreaItem'
		]),
	},

	methods: {
		/*
		* Returns true if the user has write access to the product at the given level. If no productId is specified the current productId is used.
		* Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
		* Note that level 0 is not used and the root of the tree starts with level 1.
		* Note that admins and guests have no write permissions.
		* See documentation.txt for the role definitions.
		*/
		haveWritePermission(level, productId = this.$store.state.currentProductId) {
			let levels = []
			for (let i = 0; i <= PBILEVEL; i++) {
				// initialize with false
				levels.push(false)
			}
			if (this.$store.state.userData.userAssignedProductIds.includes(productId)) {
				// assing specific write permissions for the current product only if that product is assigned the this user
				let myCurrentProductRoles = this.$store.state.userData.myProductsRoles[productId]
				// eslint-disable-next-line no-console
				if (this.$store.state.debug) console.log(`haveWritePermission: For productId ${productId} my roles are ${myCurrentProductRoles}`)
				if (!myCurrentProductRoles || myCurrentProductRoles.length === 0) {
					// my roles are not defined -> no write permission on any level
					return levels
				}

				if (myCurrentProductRoles.includes('PO')) {
					levels[PRODUCTLEVEL] = true
					levels[EPICLEVEL] = true
					levels[FEATURELEVEL] = true
					levels[PBILEVEL] = true
				}

				if (myCurrentProductRoles.includes('APO')) {
					levels[PRODUCTLEVEL] = true
				}

				if (myCurrentProductRoles.includes('developer')) {
					levels[FEATURELEVEL] = true
					levels[PBILEVEL] = true
					levels[TASKLEVEL] = true
				}
			}
			// assign specific write permissions to any product even if that product is not assigned to this user
			if (this.isServerAdmin) {
				levels[DATABASELEVEL] = true
			}

			if (this.isAdmin) {
				levels[PRODUCTLEVEL] = true
			}

			// if the user is APO for any product that user has access to the Requirements areas overview dummy product
			if (productId === AREA_PRODUCTID && this.isAPO) {
				levels[PRODUCTLEVEL] = true
				levels[EPICLEVEL] = true
			}
			// eslint-disable-next-line no-console
			if (this.$store.state.debug) console.log(`haveWritePermission: My write levels are [NOT-USED, DATABASELEVEL, PRODUCTLEVEL, EPICLEVEL, FEATURELEVEL, PBILEVEL]: ${levels}`)
			return levels[level]
		},

		haveAccessInTree(level, itemTeam, forAction, skipTestOnTeam = false, allowExtraLevel = false) {
			const noTeamAssigned = itemTeam === 'not yet assigned' || itemTeam === undefined || itemTeam === null
			const whenApoUpdatingReqAreaItem = this.isAPO && this.isReqAreaItem
			const canAccessOnTeam = whenApoUpdatingReqAreaItem || skipTestOnTeam || itemTeam === this.myTeam || noTeamAssigned
			const canAccessOnLevel = whenApoUpdatingReqAreaItem || this.haveWritePermission(level, this.$store.state.currentProductId) ||
				allowExtraLevel && this.haveWritePermission(level + 1, this.$store.state.currentProductId)

			if (canAccessOnTeam && canAccessOnLevel) return true

			if (!canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.myProductRoles}] and team membership disallow you to ${forAction}`, WARNING)
			}
			if (!canAccessOnTeam && canAccessOnLevel) {
				this.showLastEvent(`You must be member of team '${itemTeam}' to ${forAction}`, WARNING)
			}
			if (canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.myProductRoles}] disallow you to ${forAction}`, WARNING)
			}
			return false
		}
	}
}

const utilities = {
	methods: {
		clearLastEvent() {
			this.$store.state.lastEvent = 'Event message is cleared.'
			this.$store.state.eventBgColor = DEFAULTCOLOR
		},

		/* Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value */
		createId() {
			const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
			return Date.now().toString().concat(ext)
		},

		getItemStateText(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
				return 'Error: unknown state'
			}
			return this.$store.state.configData.itemState[idx]
		},

		/* mappings from config document*/
		getLevelText(level, subtype = 0) {
			if (level < 0 || level > TASKLEVEL) {
				return 'Level not supported'
			}
			if (level === PBILEVEL) {
				return this.getSubType(subtype)
			}
			return this.$store.state.configData.itemType[level]
		},

		getNodeStateText(node) {
			const idx = node.data.state
			if (node.level < TASKLEVEL) {
				if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.itemState[idx]
			} else {
				if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.taskState[idx]
			}
		},

		getSubType(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.subtype.length) {
				return 'Error: unknown subtype'
			}
			return this.$store.state.configData.subtype[idx]
		},

		getTaskStateText(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
				return 'Error: unknown state'
			}
			return this.$store.state.configData.taskState[idx]
		},

		getTsSize(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return this.$store.state.configData.tsSize[idx]
		},

		itemTitleTrunc(length, title) {
			if (title.length <= length) return title;
			return title.substring(0, length - 4) + '...'
		},

		isCurrentOrNextPrintId(id) {
			const sprints = this.getCurrentAndNextSprint()
			return id === sprints.currentSprint.id || id === sprints.nextSprint.id
		},

		showLastEvent(txt, severity) {
			let eventBgColor = DEFAULTCOLOR
			switch (severity) {
				case DEBUG:
					eventBgColor = 'yellow'
					break
				case INFO:
					eventBgColor = DEFAULTCOLOR
					break
				case WARNING:
					eventBgColor = 'orange'
					break
				case ERROR:
					eventBgColor = 'red'
					break
				case CRITICAL:
					eventBgColor = '#ff5c33'
			}
			this.$store.state.lastEvent = txt
			this.$store.state.eventBgColor = eventBgColor
		},

		///////////////////////////////////////// sprints ////////////////////////////////////////

		getCurrentAndNextSprint() {
			const now = Date.now()
			let currentSprint = undefined
			let nextSprint = undefined
			for (let i = 0; i < this.$store.state.sprintCalendar.length; i++) {
				const s = this.$store.state.sprintCalendar[i]
				if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
					currentSprint = s
					nextSprint = this.$store.state.sprintCalendar[i + 1]
					break
				}
			}
			if (!currentSprint || !nextSprint) {
				alert("Error: No current and next sprint are defined in the sprint calendar. Consult your administrator. The application will exit.")
				router.replace('/')
			}
			return { currentSprint, nextSprint }
		},

		/* Return the sprint record with the id or null if not found */
		getSprint(id) {
			for (let s of this.$store.state.sprintCalendar) {
				if (s.id === id) return s
			}
			return null
		}
	}
}

export {
	authorization,
	utilities
}
