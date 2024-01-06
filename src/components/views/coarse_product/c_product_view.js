import { SEV, LEVEL, MISC } from '../../../constants.js'
import AppHeader from '../../header/header.vue'
import Multipane from '../../multipane/Multipane-comp.vue'
import MultipaneResizer from '../../multipane/Multipane-Resizer.vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import slVueTree from '../sl-vue-tree/sl-vue-tree.vue'
import commonView from '../common_view.js'
import CcontextMenu from './c_context.vue'
import Filters from './c_filters.vue'
import Listings from './c_listings.vue'
import store from '../../../store/store.js'

const thisView = 'coarseProduct'
var returning = false

function beforeCreate() {
	store.state.currentView = thisView
	if (thisView !== store.state.lastTreeView) {
		store.state.treeNodes = []
		store.state.changeHistory = []
		// reset filters and searches
		store.state.resetFilter = null
		store.state.resetSearch = {}
		returning = false
	} else returning = true
}

function created() {
	// must reset the event listener to prevent duplicated
	this.eventBus.off('context-menu')
}

/* Prevent accidental reloading of this page */
function beforeMount() {
	window.addEventListener("beforeunload", this.preventNav)
}

function beforeDestroy() {
	window.removeEventListener("beforeunload", this.preventNav)
}

function mounted() {
	if (returning) {
		this.showLastEvent('Returning to the Products overview', SEV.INFO)
	} else {
		store.dispatch('loadOverview')
	}
}

function data() {
	return {
		colorOptions: [
			{ color: 'red', hexCode: '#FF0000' },
			{ color: 'yellow', hexCode: '#FFFF00' },
			{ color: 'green', hexCode: '#008000' },
			{ color: 'blue', hexCode: '#0000ff' },
			{ color: 'other color', hexCode: 'user choice' }
		],
		colorSelectShow: false,
		userReqAreaItemcolor: '#567cd6',
		setReqAreaShow: false,
		selReqAreaId: undefined,
		selReqAreaColor: undefined
	}
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
		return !!this.getLastSelectedNode && this.getLastSelectedNode._id === MISC.AREA_PRODUCTID || this.getLastSelectedNode.parentId === MISC.AREA_PRODUCTID
	}
}

const methods = {
	doShowState(node) {
		return node._id !== 'root' && node._id !== 'requirement-areas' && node.parentId !== 'requirement-areas'
	},

	preventNav(event) {
		event.preventDefault()
		event.returnValue = ""
	},

	getItemInfo() {
		let txt = ''
		if (this.getCurrentItemLevel > LEVEL.PRODUCT) {
			txt = `This ${this.getLevelText(this.getCurrentItemLevel)} is owned by team '${store.state.currentDoc.team}'`
		}
		return txt
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

	/* Event handling */
	onNodesSelected(fromContextMenu) {
		// load the document
		store.dispatch('loadDoc', {
			id: this.getLastSelectedNode._id,
			onSuccessCallback: () => {
				// preset the req area color if available
				this.selReqAreaColor = this.getLastSelectedNode.data.reqAreaItemColor
				// if the user clicked on a node of another product (not root)
				if (this.getLastSelectedNode._id !== 'root' && store.state.currentProductId !== this.getLastSelectedNode.productId) {
					// update current productId and title
					store.commit('switchCurrentProduct', this.getLastSelectedNode.productId)
				}
				if (this.getLastSelectedNode._id !== 'requirement-areas') {
					if (!fromContextMenu) this.showSelectionEvent(store.state.selectedNodes)
				} else this.showLastEvent('Create / maintain Requirement Areas here', SEV.INFO)
			}
		})
	},

	/* Use this event to check if the drag is allowed. If not, issue a warning */
	beforeNodeDropped(draggingNodes, position, cancel) {
		/*
		 * 1. Disallow drop on node were the user has no write authority and below a parent owned by another team
		 * 2. Disallow drop when moving over more than 1 level
		 * 3. Dropping items with descendants is not possible when any descendant would land higher than the highest permitted level
		 * 4. Disallow the drop of multiple nodes within the range of the selected nodes.
		 * 5. The requirement area nodes cannot be moved from their parent or inside each other (silent cancel)
		 * 6. Cannot move regular items into the 'Requirement areas overview' dummy product (silent cancel)
		 * 7. Cannot move nodes as one of them has dependencies on a PBI or task level
		 * 8. Cannot move  nodes as one of them has conditions on a PBI or task level
		 * precondition: the selected nodes have all the same parent (same level)
		 * Area PO's need not to be member of the item's team
		 */
		function areAlldependenciesFound(vm, nodes) {
			for (const node of nodes) {
				for (const depId of node.dependencies) {
					const item = vm.$store.state.helpersRef.getNodeById(depId)
					if (!item) return false
				}
			}
			return true
		}
		function areAllConditionsFound(vm, nodes) {
			for (const node of nodes) {
				for (const conId of node.conditionalFor) {
					const item = vm.$store.state.helpersRef.getNodeById(conId)
					if (!item) return false
				}
			}
			return true
		}
		const parentNode = position.placement === 'inside' ? position.nodeModel : store.state.helpersRef.getParentNode(position.nodeModel)
		// cancel quietly if getParentNode(position.nodeModel) returns null (not found)
		if (parentNode && this.haveAccessInTree(position.nodeModel.productId, position.nodeModel.level, parentNode.data.team, 'drop on this position')) {
			const checkDropNotAllowed = (node) => {
				const sourceProductId = draggingNodes[0].productId
				const targetProductId = position.nodeModel.productId
				const sourceLevel = draggingNodes[0].level
				let targetLevel = position.nodeModel.level
				// are we dropping 'inside' a node creating children to that node?
				if (position.placement === 'inside') targetLevel++
				const levelChange = Math.abs(targetLevel - sourceLevel)
				const failedCheck2 = levelChange > 1
				const failedCheck3 = (targetLevel + store.state.helpersRef.getDescendantsInfo(node).depth) > LEVEL.PBI
				const dropInd = position.nodeModel.ind
				let sourceMinInd = Number.MAX_SAFE_INTEGER
				let sourceMaxind = 0
				for (const d of draggingNodes) {
					if (d.ind < sourceMinInd) sourceMinInd = d.ind
					if (d.ind > sourceMaxind) sourceMaxind = d.ind
				}
				const failedCheck4 = levelChange === 0 && position.placement !== 'inside' && dropInd > sourceMinInd && dropInd < sourceMaxind
				const failedCheck5 = node.parentId === MISC.AREA_PRODUCTID && (position.nodeModel.parentId !== MISC.AREA_PRODUCTID || position.placement === 'inside')
				const failedCheck6 = targetProductId === MISC.AREA_PRODUCTID && sourceProductId !== MISC.AREA_PRODUCTID
				if (failedCheck2) this.showLastEvent('Promoting / demoting an item over more than 1 level is not allowed', SEV.WARNING)
				if (failedCheck3) this.showLastEvent('Descendants of this item can not move to a level lower than PBI level', SEV.WARNING)
				if (failedCheck4) this.showLastEvent('Cannot drop multiple nodes within the selected range', SEV.WARNING)
				return failedCheck2 || failedCheck3 || failedCheck4 || failedCheck5 || failedCheck6
			}

			if (checkDropNotAllowed(draggingNodes[0])) {
				cancel(true)
			}

			if (!areAlldependenciesFound(this, draggingNodes)) {
				if (draggingNodes.length === 1) {
					this.showLastEvent('Cannot move the item as it has dependencies on a PBI or task level. Use the Product details view instead.', SEV.WARNING)
				} else this.showLastEvent('Cannot move these items as one of them has dependencies on a PBI or task level. Use the Product details view instead.', SEV.WARNING)
				cancel(true)
			}

			if (!areAllConditionsFound(this, draggingNodes)) {
				if (draggingNodes.length === 1) {
					this.showLastEvent('Cannot move the item as it has conditions on a PBI or task level. Use the Product details view instead.', SEV.WARNING)
				} else this.showLastEvent('Cannot move these items as one of them has conditions on a PBI or task level. Use the Product details view instead.', SEV.WARNING)
				cancel(true)
			}
		} else cancel(true)
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
		store.dispatch('updateColorDb', { node: this.getLastSelectedNode, newColor })
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
			} else this.showLastEvent('Sorry, your assigned role(s) disallow you to assing requirement areas', SEV.WARNING)
		}
	},

	/* Update the req area of the item (null for no req area set) */
	doSetReqArea() {
		store.dispatch('updateReqArea', { node: this.getLastSelectedNode, reqareaId: this.selReqAreaId, timestamp: Date.now() })
	}
}

const components = {
	'app-header': AppHeader,
	Multipane,
	MultipaneResizer,
	QuillEditor,
	slVueTree,
	CcontextMenu,
	Filters,
	Listings
}

export default {
	extends: commonView,
	beforeCreate,
	created,
	beforeMount,
	beforeDestroy,
	mounted,
	data,
	computed,
	methods,
	components
}
