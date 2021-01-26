import { SEV, LEVEL } from '../../../constants.js'
import AppHeader from '../../header/header.vue'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import { VueEditor } from 'vue2-editor'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import commonView from '../common_view.js'
import DcontextMenu from './d_context.vue'
import Filters from './d_filters.vue'
import Listings from './d_listings.vue'
import ToSprint from './d_tosprint.vue'
import { eventBus } from '../../../main'

const FILTERBUTTONTEXT = 'Filter in tree view'
const thisView = 'detailProduct'
var returning = false

function beforeCreate() {
	this.$store.state.currentView = thisView
	this.$store.state.stopListenForChanges = false
	if (thisView !== this.$store.state.lastTreeView) {
		this.$store.state.treeNodes = []
		this.$store.state.changeHistory = []
		// reset filters and searches
		this.$store.state.filterText = FILTERBUTTONTEXT
		this.$store.dispatch('loadProductDetails')
	} else returning = true
}

function created() {
	// must reset the event listener to prevent duplication
	eventBus.$off('context-menu')
	this.sprints = this.getCurrentAndNextSprint()
}

function mounted() {
	// expose instance to the global namespace
	window.slVueTree = this.$refs.slVueTree
	if (returning) {
		this.showLastEvent('Returning to the Product details', SEV.INFO)
	}
}

function data() {
	return {
		sprints: []
	}
}

const watch = {
	selectedPbiType: function (val) {
		// prevent looping
		if (val !== this.$store.state.currentDoc.subtype) {
			if (this.haveAccessInTree(this.getCurrentItemLevel, this.$store.state.currentDoc.team, 'change the LEVEL.PBI type')) {
				const node = this.getLastSelectedNode
				this.$store.dispatch('setSubType', {
					node,
					newSubType: val,
					timestamp: Date.now(),
					createUndo: true
				})
			}
		}
	},

	doAddition: function (val) {
		if (val === true) {
			this.doAddition = false
			if (this.$store.state.selectedForView === 'attachments') {
				this.fileInfo = null
				this.$refs.uploadRef.show()
			}
			if (this.$store.state.selectedForView === 'comments') {
				if (this.canCreateComments) {
					this.newComment = ''
					this.$refs.commentsEditorRef.show()
				} else {
					this.showLastEvent('Sorry, your assigned role(s) disallow you to create comments', SEV.WARNING)
				}
			}
			if (this.$store.state.selectedForView === 'history') {
				this.newHistory = ''
				this.$refs.historyEditorRef.show()
			}
		}
	},

	startFiltering: function (val) {
		if (val === true) {
			this.startFiltering = false
			if (this.$store.state.selectedForView === 'comments') {
				this.$refs.commentsFilterRef.show()
				this.isCommentsFilterActive = true
			}
			if (this.$store.state.selectedForView === 'history') {
				this.$refs.historyFilterRef.show()
				this.isHistoryFilterActive = true
			}
		}
	}
}

const methods = {
	getItemInfo() {
		let txt = ''
		if (this.getCurrentItemLevel !== LEVEL.PRODUCT) {
			if (this.getCurrentItemLevel < LEVEL.TASK) {
				txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${this.$store.state.currentDoc.team}'`
			} else {
				txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by '${this.$store.state.currentDoc.taskOwner}' of team '${this.$store.state.currentDoc.team}'`
			}
			if (this.getItemSprintName) {
				txt += ` (Sprint '${this.getItemSprintName})'`
			}
		}
		return txt
	},

	/* Return true if in the current or next sprint */
	inSprint(node) {
		const sprintId = node.data.sprintId
		if (!sprintId) {
			// item not in any sprint
			return false
		}
		if (this.sprints === undefined) {
			// no sprint definitions available
			return false
		}
		if (this.getSprint(sprintId) === null) {
			// sprint not found
			return false
		}
		if (sprintId === this.sprints.currentSprint.id || sprintId === this.sprints.nextSprint.id) {
			return true
		}
		return false
	},

	getSprintText(node) {
		const sprintId = node.data.sprintId
		if (sprintId === this.sprints.currentSprint.id) {
			return 'current'
		}
		if (sprintId === this.sprints.nextSprint.id) {
			return 'next'
		}
	},

	onTreeIsLoaded() {
		window.slVueTree.setDescendentsReqArea()
		this.dependencyViolationsFound()
	},

	/* event handling */
	onNodesSelected(fromContextMenu) {
		const selNodes = this.$store.state.selectedNodes
		// update explicitly as the tree is not an input field receiving focus so that @blur on the editor is not emitted
		this.updateDescription(this.getPreviousNodeSelected)
		this.updateAcceptance(this.getPreviousNodeSelected)

		// load the selected document
		this.$store.dispatch('loadDoc', {
			id: this.getLastSelectedNode._id,
			onSuccessCallback: () => {
				// if the user clicked on a node of another product (not root)
				if (this.getLastSelectedNode._id !== 'root' && this.$store.state.currentProductId !== this.getLastSelectedNode.productId) {
					// another product is selected; collapse the currently selected product and switch to the new product
					this.$store.commit('switchCurrentProduct', { productId: this.getLastSelectedNode.productId, collapseCurrentProduct: true })
					// expand the newly selected product up to the feature level
					window.slVueTree.expandTreeUptoFeatureLevel()
				}
				if (!fromContextMenu) this.showSelectionEvent(selNodes)
			}
		})
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
		const parentNode = position.placement === 'inside' ? position.nodeModel : window.slVueTree.getParentNode(position.nodeModel)
		if (this.haveAccessInTree(position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
			const checkDropNotAllowed = (node, sourceLevel, targetLevel) => {
				const levelChange = Math.abs(targetLevel - sourceLevel)
				const failedCheck2 = levelChange > 1
				const failedCheck3 = (targetLevel + window.slVueTree.getDescendantsInfo(node).depth) > LEVEL.TASK
				const dropInd = position.nodeModel.ind
				let sourceMinInd = Number.MAX_SAFE_INTEGER
				let sourceMaxind = 0
				for (const d of draggingNodes) {
					if (d.ind < sourceMinInd) sourceMinInd = d.ind
					if (d.ind > sourceMaxind) sourceMaxind = d.ind
				}
				const failedCheck4 = levelChange === 0 && position.placement !== 'inside' && dropInd > sourceMinInd && dropInd < sourceMaxind
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', SEV.WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than LEVEL.PBI level', SEV.WARNING)
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
		this.selectedPbiType = this.$store.state.currentDoc.subtype
		const options = [
			{ text: 'User story', value: 0 },
			{ text: 'Spike', value: 1 },
			{ text: 'Defect', value: 2 }
		]
		return options
	}
}

const components = {
	'app-header': AppHeader,
	Multipane,
	MultipaneResizer,
	VueEditor,
	slVueTree,
	DcontextMenu,
	Filters,
	Listings,
	ToSprint
}

export default {
	extends: commonView,
	beforeCreate,
	created,
	mounted,
	data,
	watch,
	methods,
	components
}
