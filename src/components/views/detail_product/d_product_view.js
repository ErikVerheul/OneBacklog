import { MISC, SEV, LEVEL } from '../../../constants.js'
import { getSprintById } from '../../../common_functions.js'
import AppHeader from '../../header/AppHeader.vue'
import Multipane from '../../multipane/Multipane-comp.vue'
import MultipaneResizer from '../../multipane/Multipane-Resizer.vue'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import commonView from '../common_view.js'
import DcontextMenu from './d_context.vue'
import Filters from './d_filters.vue'
import Listings from '../../listings/common_listings.vue'
import ToSprint from './d_tosprint.vue'
import store from '../../../store/store.js'

const thisView = 'detailProduct'

function created() {
	store.state.currentView = thisView
	if (thisView !== store.state.lastTreeView) {
		if (store.state.lastTreeView === 'coarseProduct') {
			store.commit('resetSearchesAndFilters')
		}
		// intial load or returning from other tree view (for now 'coarseView'); recreate the expansion state
		store.commit('restoreTreeExpansionState')
		this.hasViewChanged = true
	} else this.hasViewChanged = false
	// must reset the event listener to prevent duplication
	this.eventBus.off('context-menu')
}

function mounted() {
	store.state.lastTreeView = thisView
	if (this.hasViewChanged) this.showLastEvent('Returning to the Product details', SEV.INFO)
}

function data() {
	return {
		colorOptions: [
			{ color: 'red', hexCode: '#FF0000' },
			{ color: 'yellow', hexCode: '#FFFF00' },
			{ color: 'green', hexCode: '#008000' },
			{ color: 'blue', hexCode: '#0000ff' },
			{ color: 'other color', hexCode: 'user choice' },
		],
		colorSelectShow: false,
		userReqAreaItemcolor: '#567cd6',
		setReqAreaShow: false,
		selReqAreaId: undefined,
		selReqAreaColor: undefined,
		hasViewChanged: false,
		sprints: [],
	}
}

const watch = {
	selectedUsType: function (valStr) {
		// prevent looping
		if (Number(valStr) !== store.state.currentDoc.subtype) {
			const node = this.getSelectedNode
			if (this.haveAccessInTree(node.productId, this.getCurrentItemLevel, store.state.currentDoc.team, 'change the LEVEL.US type')) {
				store.dispatch('setSubType', {
					node,
					newSubType: Number(valStr),
					timestamp: Date.now(),
				})
			}
		}
	},
}

const computed = {
	/*
	 * Check for a valid color hex code:
	 * #          -> a hash
	 * [0-9A-F]   -> any integer from 0 to 9 and any letter from A to F
	 * {6}        -> the previous group appears exactly 6 times
	 * $          -> match end
	 * i          -> ignore case
	 */
	colorState() {
		return /^#[0-9A-F]{6}$/i.test(this.userReqAreaItemcolor)
	},

	// return true if a requirements area item is selected or false if another or no node is selected
	isReqAreaItemSelected() {
		if (this.getSelectedNode === null) return false
		return this.getSelectedNode._id === MISC.AREA_PRODUCTID || this.getSelectedNode.parentId === MISC.AREA_PRODUCTID
	},
}

const methods = {
	doShowState(node) {
		return node._id !== 'root' && node._id !== MISC.AREA_PRODUCTID && node.parentId !== MISC.AREA_PRODUCTID
	},

	getItemInfo() {
		let txt = ''
		if (this.getCurrentItemLevel > LEVEL.EPIC) {
			if (this.getCurrentItemLevel < LEVEL.TASK) {
				txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${store.state.currentDoc.team}'`
			} else {
				if (store.state.currentDoc.taskOwner) {
					txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by '${store.state.currentDoc.taskOwner}' of team '${store.state.currentDoc.team}'`
				} else txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${store.state.currentDoc.team}'`
			}
			if (this.getItemSprintName) {
				txt += ` (Sprint '${this.getItemSprintName})'`
			}
		}
		return txt
	},

	/* Return true if in the current or next sprint */
	inActiveSprint(node) {
		const sprintId = node.data.sprintId
		if (!sprintId) {
			// item not in any sprint
			return false
		}
		if (this.getActiveSprints === undefined) {
			// no sprint definitions available
			return false
		}
		if (getSprintById(sprintId, store.state.myCurrentSprintCalendar) === null) {
			// sprint not found
			return false
		}
		if (sprintId === this.getActiveSprints.currentSprint.id || sprintId === this.getActiveSprints.nextSprint.id) {
			return true
		}
		return false
	},

	/* Get the requirement area colors not in use already */
	getRemainingColorOptions() {
		const availableOptions = []
		// the requirements areas product must be the first product in the hierarchy
		const reqAreaNodes = store.state.helpersRef.getProducts()[0].children
		for (let co of this.colorOptions) {
			let colorInUse = false
			for (let nm of reqAreaNodes) {
				if (nm.data.reqAreaItemColor === co.hexCode) {
					colorInUse = true
				}
			}
			if (!colorInUse) availableOptions.push(co)
		}
		return availableOptions
	},

	getActiveSprintText(node) {
		const sprintId = node.data.sprintId
		if (sprintId === this.getActiveSprints.currentSprint.id) {
			return 'current'
		}
		if (sprintId === this.getActiveSprints.nextSprint.id) {
			return 'next'
		}
	},

	/* event handling */
	onNodesSelected() {
		const onSuccessCallback = () => {
			this.isDescriptionEdited = false
			this.isAcceptanceEdited = false
			// preset the req area color if available
			this.selReqAreaColor = this.getSelectedNode.data.reqAreaItemColor
			if (this.getSelectedNode._id !== MISC.AREA_PRODUCTID) {
				this.showSelectionEvent(store.state.selectedNodes)
			} else this.showLastEvent('Create / maintain Requirement Areas here', SEV.INFO)
		}

		// update explicitly as the tree is not receiving focus due to the "user-select: none" css setting causing that @blur on the editor is not emitted
		if (this.isDescriptionEdited) {
			this.updateDescription({ node: this.getPreviousNodeSelected, cb: onSuccessCallback })
		} else if (this.isAcceptanceEdited) {
			this.updateAcceptance({ node: this.getPreviousNodeSelected, cb: onSuccessCallback })
		}
		// load the selected document
		else {
			store.dispatch('loadDoc', { id: this.getSelectedNode._id, onSuccessCallback })
		}
	},

	/* Use this event to check if the drag is allowed. If not, issue a warning */
	beforeNodeDropped(draggingNodes, position, cancel) {
		/*
		 * 1. Disallow drop on node or between nodes with a missing parent or if the user has no write authority
		 * 2. Disallow drop when moving over more than 1 level.
		 * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest level (LEVEL.TASK).
		 * precondition: the selected nodes have all the same parent (same level)
		 */
		const parentNode = position.placement === 'inside' ? position.nodeModel : store.state.helpersRef.getParentNode(position.nodeModel)
		// cancel quietly if getParentNode(position.nodeModel) returns null (not found)
		if (parentNode && this.haveAccessInTree(position.nodeModel.productId, position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
			const checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
				const failedCheck2 = Math.abs(targetLevel - sourceLevel) > 1
				const failedCheck3 = targetLevel + store.state.helpersRef.getDescendantsInfo(node).depth > LEVEL.TASK
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', SEV.WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than user story level', SEV.WARNING)
				return failedCheck2 || failedCheck3
			}

			const sourceLevel = draggingNodes[0].level
			let targetLevel = position.nodeModel.level
			// are we dropping 'inside' a node creating children to that node?
			if (position.placement === 'inside') targetLevel++
			if (checkDropNotAllowed(draggingNodes[0], sourceLevel, targetLevel)) {
				cancel(true)
			}
		} else cancel(true)
	},

	getUsOptions() {
		this.selectedUsType = store.state.currentDoc.subtype.toString()
		const options = [
			{ text: 'User story', value: '0' },
			{ text: 'Spike', value: '1' },
			{ text: 'Defect', value: '2' },
		]
		return options
	},

	updateColor(value) {
		if (value === 'user choice') {
			this.selReqAreaColor = '#567cd6'
			this.colorSelectShow = true
		} else {
			this.setUserColor(value)
		}
	},

	setUserColor(newColor) {
		store.dispatch('updateColorDb', { node: this.getSelectedNode, newColor })
	},

	setReqArea(node) {
		if (this.isAPO) {
			this.selReqAreaId = node.data.reqarea || null
			// set the req area options
			const currReqAreaNodes = store.state.helpersRef.getReqAreaNodes()
			if (currReqAreaNodes) {
				store.state.reqAreaOptions = []
				for (const nm of currReqAreaNodes) {
					store.state.reqAreaOptions.push({ id: nm._id, title: nm.title })
				}
				if (this.selReqAreaId !== null) store.state.reqAreaOptions.push({ id: null, title: 'Remove item from requirement areas' })
				this.setReqAreaShow = true
			} else this.showLastEvent('Sorry, your assigned role(s) disallow you to assign requirement areas', SEV.WARNING)
		}
	},

	/* Update the req area of the item (null for no req area set) */
	doSetReqArea() {
		store.dispatch('updateReqArea', { node: this.getSelectedNode, reqareaId: this.selReqAreaId, timestamp: Date.now() })
	},
}

const components = {
	'app-header': AppHeader,
	Multipane,
	MultipaneResizer,
	slVueTree,
	DcontextMenu,
	Filters,
	Listings,
	ToSprint,
}

export default {
	extends: commonView,
	created,
	mounted,
	data,
	computed,
	watch,
	methods,
	components,
}
