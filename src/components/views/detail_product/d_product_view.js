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
		store.state.treeNodes = []
		store.state.changeHistory = []
		// reset filters and searches
		store.state.resetFilter = null
		store.state.resetSearchOnId = null
		store.state.resetSearchOnTitle = null
		this.returning = false
	} else this.returning = true
	// must reset the event listener to prevent duplication
	this.eventBus.off('context-menu')
}

function mounted() {
	if (this.returning) {
		this.showLastEvent('Returning to the Product details', SEV.INFO)
	} else {
		store.dispatch('loadProductDetails')
	}
}

function data() {
	return {
		returning: false,
		sprints: [],
	}
}

const watch = {
	selectedPbiType: function (valStr) {
		// prevent looping
		if (Number(valStr) !== store.state.currentDoc.subtype) {
			const node = this.getLastSelectedNode
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
	onNodesSelected(fromContextMenu) {
		const onSuccessCallback = () => {
			this.isDescriptionEdited = false
			this.isAcceptanceEdited = false
			// if the user clicked on a node of another product (not root)
			const currentProductId = store.state.currentProductId
			if (this.getLastSelectedNode._id !== 'root' && currentProductId !== this.getLastSelectedNode.productId) {
				// another product is selected; reset the tree filter and Id selection or title search on the current product
				store.dispatch('resetFilterAndSearches', { caller: 'onNodesSelected', productModels: store.state.helpersRef.getCurrentProductModel() })
				// collapse the currently selected product and switch and expand to the newly selected product
				store.commit('switchCurrentProduct', this.getLastSelectedNode.productId)
			}
			if (!fromContextMenu) this.showSelectionEvent(store.state.selectedNodes)
		}

		// update explicitly as the tree is not receiving focus due to the "user-select: none" css setting causing that @blur on the editor is not emitted
		if (this.isDescriptionEdited) {
			this.updateDescription({ node: this.getPreviousNodeSelected, cb: onSuccessCallback })
		} else if (this.isAcceptanceEdited) {
			this.updateAcceptance({ node: this.getPreviousNodeSelected, cb: onSuccessCallback })
		}
		// load the selected document
		else store.dispatch('loadDoc', { id: this.getLastSelectedNode._id, onSuccessCallback })
	},

	/* Use this event to check if the drag is allowed. If not, issue a warning */
	beforeNodeDropped(draggingNodes, position, cancel) {
		/*
		 * 1. Disallow drop on node were the user has no write authority and below a parent owned by another team
		 * 2. Disallow drop when moving over more than 1 level.
		 * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest level (LEVEL.TASK).
		 * 4. Disallow the drop of multiple nodes within the range of the selected nodes.
		 * precondition: the selected nodes have all the same parent (same level)
		 */
		const parentNode = position.placement === 'inside' ? position.nodeModel : store.state.helpersRef.getParentNode(position.nodeModel)
		// cancel quietly if getParentNode(position.nodeModel) returns null (not found)
		if (parentNode && this.haveAccessInTree(position.nodeModel.productId, position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
			const checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
				const levelChange = Math.abs(targetLevel - sourceLevel)
				const failedCheck2 = levelChange > 1
				const failedCheck3 = targetLevel + store.state.helpersRef.getDescendantsInfo(node).depth > LEVEL.TASK
				const dropInd = position.nodeModel.ind
				let sourceMinInd = Number.MAX_SAFE_INTEGER
				let sourceMaxind = 0
				for (const d of draggingNodes) {
					if (d.ind < sourceMinInd) sourceMinInd = d.ind
					if (d.ind > sourceMaxind) sourceMaxind = d.ind
				}
				const failedCheck4 = levelChange === 0 && position.placement !== 'inside' && dropInd > sourceMinInd && dropInd < sourceMaxind
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', SEV.WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', SEV.WARNING)
				if (failedCheck4) this.showLastEvent('Cannot drop multiple nodes within the selected range', SEV.WARNING)
				return failedCheck2 || failedCheck3 || failedCheck4
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
