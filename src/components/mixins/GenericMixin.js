import { SEV, LEVEL, STATE, MISC } from '../../constants.js'
import { mapGetters } from 'vuex'
import store from '../../store/store.js'

const constants = {
	/* Make the constants available in the context of 'this' */
	created() {
		this.SEV = SEV
		this.STATE = STATE
		this.LEVEL = LEVEL
		this.MISC = MISC
	},
}

const authorization = {
	computed: {
		...mapGetters([
			'canCreateComments',
			'canSeeAndUploadAttachments',
			'isAssistAdmin',
			'isAdmin',
			'isAPO',
			'isAuthenticated',
			'isDeveloper',
			'isGuest',
			'isPO',
			'isReqAreaItem',
			'isReqAreaTopLevel',
			'isServerAdmin',
			'getMyProductsCount',
			'getMyGenericRoles',
			'getMyProductsRoles',
			'getMyProductSubscriptionIds',
			'getMyAssignedProductIds',
		]),
	},

	methods: {
		/*
		 * Returns true if the user has write access to the product at the given level.
		 * Creates an array for this user where the index is the item level in the tree and the value a boolean designating the write access right for this level.
		 * Note that level 0 is not used and the root of the tree starts with level 1.
		 * Note that guests have no write permissions.
		 * See README.md for the role definitions.
		 */
		haveWritePermission(productId, level) {
			const levels = []
			for (let i = 0; i <= LEVEL.TASK; i++) {
				// initialize with false
				levels.push(false)
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isServerAdmin) {
				levels[LEVEL.DATABASE] = true
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAPO) {
				levels[LEVEL.PRODUCT] = true
				// the APO has access to the requirements areas overview dummy product
				if (productId === MISC.AREA_PRODUCTID) {
					levels[LEVEL.EPIC] = true
				}
			}
			// assign write permissions to any product even if that product is not assigned to this user
			if (this.isAdmin) {
				levels[LEVEL.PRODUCT] = true
			}

			if (this.getMyAssignedProductIds.includes(productId)) {
				// assign write permissions for the product only if that product is assigned to this user
				if (this.getMyProductsRoles[productId].includes('PO')) {
					levels[LEVEL.PRODUCT] = true
					levels[LEVEL.EPIC] = true
					levels[LEVEL.FEATURE] = true
					levels[LEVEL.US] = true
				}

				if (this.getMyProductsRoles[productId].includes('developer')) {
					levels[LEVEL.FEATURE] = true
					levels[LEVEL.US] = true
					levels[LEVEL.TASK] = true
				}
			}
			if (this.getMyProductsRoles[productId]) {
				if (store.state.debugAccess)
					console.log(`haveWritePermission: For productId ${productId} my roles are ${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}`)

				if (store.state.debugAccess) console.log(`haveWritePermission: My write levels are [NOT-USED, DATABASE, PRODUCT, EPIC, FEATURE, user story, TASK]: ${levels}`)
			}
			return levels[level]
		},

		haveAccessInTree(productId, level, itemTeam, forAction, allowExtraLevel = false) {
			if (this.isReqAreaItem) {
				// requirement areas settings are only accessable for APO's
				if (this.isAPO) {
					return true
				} else {
					this.showLastEvent(`Sorry, you must be an APO (requirement Areas Product Owner) to make changes here`, SEV.WARNING)
					return false
				}
			}

			// admins and apos need not be member of the owning team to be able to change item state
			const skipTestOnTeam = itemTeam === '*' || this.isAdmin || this.isAPO || level <= LEVEL.EPIC
			const canAccessOnTeam = skipTestOnTeam || (itemTeam && itemTeam === this.myTeam)
			const canAccessOnLevel = this.haveWritePermission(productId, level) || (allowExtraLevel && this.haveWritePermission(productId, level + 1))

			if (canAccessOnTeam && canAccessOnLevel) return true

			if (!canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(
					`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] and team membership disallow you to ${forAction}`,
					SEV.WARNING,
				)
			}
			if (!canAccessOnTeam && canAccessOnLevel) {
				this.showLastEvent(`You must be member of team '${itemTeam}' to ${forAction}`, SEV.WARNING)
			}
			if (canAccessOnTeam && !canAccessOnLevel) {
				this.showLastEvent(`Sorry, your assigned role(s) [${this.getMyProductsRoles[productId].concat(this.getMyGenericRoles)}] disallow you to ${forAction}`, SEV.WARNING)
			}
			return false
		},
	},
}

const utilities = {
	computed: {
		...mapGetters([
			'getCurrentItemLevel',
			'getCurrentItemState',
			'getCurrentItemTsSize',
			'getItemSprintName',
			'getSelectedNode',
			'getLastEventBGColor',
			'getLastEventTextColor',
			'getLastEventTxt',
			'isFollower',
			'isPlanningBoardSelected',
			'myTeam',
		]),

		/*
		 * Return the current and coming next sprint objects depending on the current date and time.
		 * Return undefined if not found.
		 */
		getActiveSprints() {
			const now = Date.now()
			const myCurrentSprintCalendar = store.state.myCurrentSprintCalendar
			let currentSprint
			let nextSprint
			for (let i = 0; i < myCurrentSprintCalendar.length; i++) {
				const s = myCurrentSprintCalendar[i]
				if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
					currentSprint = s
					if (myCurrentSprintCalendar[i + 1]) nextSprint = myCurrentSprintCalendar[i + 1]
					break
				}
			}
			if (currentSprint && nextSprint) {
				return { currentSprint, nextSprint }
			} else {
				alert('Error: Missing current and/or next sprint; you need to sign-in again to have the sprint calendar extended. The application will exit.')
				store.commit('endSession', 'generic: getActiveSprints - Missing current and/or next sprint')
			}
		},
	},

	methods: {
		// Returns the state name for item levels < LEVEL.TASK
		// see itemState in constants.js idx = 0: not in use, ON_HOLD, 1: NEW, 2: TODO, 3: READY, 4: INPROGRESS, 5: TESTREVIEW, 6: DONE
		getItemStateText(idx) {
			if (idx < 0 || idx >= store.state.configData.itemState.length) {
				return 'Error: unknown state'
			}
			return store.state.configData.itemState[idx]
		},

		// Convenient method. Return the description of the given level, or the subtype description if the level equals the user story level
		getLevelText(level, subtype = 0) {
			return store.state.helpersRef.getLevelText(level, subtype)
		},

		// Convenient method. Return the subtype description (on user story level only)
		getSubType(idx) {
			return store.state.helpersRef.getSubType(idx)
		},

		// Returns the T-shirt size text for the given index
		// idx = 0: XS, 1: S, 2: M, 3: L, 4: XL, 5: XXL
		getTsSize(idx) {
			if (idx < 0 || idx >= store.state.configData.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return store.state.configData.tsSize[idx]
		},

		// Adds the txt to the top of the event list
		// severity is one of SEV constants
		showLastEvent(txt, severity) {
			store.commit('addToEventList', { txt, severity })
		},
	},
}

export { constants, authorization, utilities }
