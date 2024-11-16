import { SEV, LEVEL } from '../../../constants.js'
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
		hasViewChanged: false,
		sprints: [],
	}
}

const watch = {
	selectedPbiType: function (valStr) {
		// prevent looping
		if (Number(valStr) !== store.state.currentDoc.subtype) {
			const node = this.getSelectedNode
			if (this.haveAccessInTree(node.productId, this.getCurrentItemLevel, store.state.currentDoc.team, 'change the LEVEL.PBI type')) {
				store.dispatch('setSubType', {
					node,
					newSubType: Number(valStr),
					timestamp: Date.now(),
				})
			}
		}
	},
}

const methods = {
	doShowState(node) {
		return node._id !== 'root'
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
			this.showSelectionEvent(store.state.selectedNodes)
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
		if (parentNode && this.haveAccessInTree(position.nodeModel.productId, position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
			const checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
				const failedCheck2 = Math.abs(targetLevel - sourceLevel) > 1
				const failedCheck3 = targetLevel + store.state.helpersRef.getDescendantsInfo(node).depth > LEVEL.TASK
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', SEV.WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', SEV.WARNING)
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

	getPbiOptions() {
		this.selectedPbiType = store.state.currentDoc.subtype.toString()
		const options = [
			{ text: 'User story', value: '0' },
			{ text: 'Spike', value: '1' },
			{ text: 'Defect', value: '2' },
		]
		return options
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
	watch,
	methods,
	components,
}
