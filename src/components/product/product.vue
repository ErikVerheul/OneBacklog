<template>
	<div>
		<div class="d-table w-100">
			<span class="d-table-cell tal">
				<h3 v-if="getCurrentItemType <= epicLevel">{{ getLevelText(getCurrentItemType) }} T-Shirt size:
					<input type="text" size="3" maxlength="3" id="tShirtSizeId" :value="getCurrentItemTsSize" @blur="updateTsSize()" />
				</h3>
				<h3 v-if="getCurrentItemType == featureLevel || (getCurrentItemType == pbiLevel && getCurrentItemSubType != 1)">Story points:
					<input type="text" size="3" maxlength="3" id="storyPointsId" :value="getCurrentItemSpSize" @blur="updateStoryPoints()" />
				</h3>
				<h3 v-if="getCurrentItemType == pbiLevel && getCurrentItemSubType == 1">Person hours:
					<input type="text" size="3" maxlength="3" id="personHoursId" :value="getCurrentPersonHours" @blur="updatePersonHours()" />
				</h3>
			</span>
			<span class="d-table-cell tac">
				<h3>{{ getCurrentProductTitle }}</h3>
			</span>
			<span class="d-table-cell tar">
				<h3>State:
					<b-dropdown id="ddown-right" right variant="primary" class="m-2">
						<template slot="button-content">
							{{ getItemStateText(getCurrentItemState) }}
						</template>
						<b-dropdown-item @click="onStateChange(0)">{{ getItemStateText(0) }}</b-dropdown-item>
						<b-dropdown-item @click="onStateChange(1)">{{ getItemStateText(1) }}</b-dropdown-item>
						<b-dropdown-item @click="onStateChange(2)">{{ getItemStateText(2) }}</b-dropdown-item>
						<b-dropdown-item @click="onStateChange(3)">{{ getItemStateText(3) }}</b-dropdown-item>
						<b-dropdown-item @click="onStateChange(4)">{{ getItemStateText(4) }}</b-dropdown-item>
						<b-dropdown-item @click="onStateChange(5)">{{ getItemStateText(5) }}</b-dropdown-item>
					</b-dropdown>
				</h3>
			</span>
		</div>

		<!-- vertical panes -->
		<multipane class="custom-resizer" layout="vertical">
			<div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
				<h4>Your current database is set to {{ getCurrentDb }}. You have {{ getProductIds.length }} product(s)</h4>

				<div class='last-event'>
					Last event: {{ this.$store.state.load.lastEvent }}
				</div>

				<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
				<div class="tree-container" @mousedown.stop>
					<sl-vue-tree :value="getTreeNodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelectedEvent" @beforedrop="beforeNodeDropped" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">

						<template slot="title" slot-scope="{ node }">
							<span class="item-icon">
								<i v-if="node.isLeaf">
									<font-awesome-icon icon="file" />
								</i>
								<i v-if="!node.isLeaf">
									<font-awesome-icon icon="folder" />
								</i>
							</span>
							{{ node.title }}
						</template>

						<template slot="toggle" slot-scope="{ node }">
							<span v-if="!node.isLeaf">
								<i v-if="node.isExpanded">
									<font-awesome-icon icon="chevron-down" />
								</i>
								<i v-if="!node.isExpanded">
									<font-awesome-icon icon="chevron-right" />
								</i>
							</span>
						</template>

						<template slot="draginfo">
							{{ selectedNodesTitle }}
						</template>

					</sl-vue-tree>
				</div>
			</div>

			<multipane-resizer></multipane-resizer>
			<div class="pane" :style="{ flexGrow: 1, minWidth: '30%', width: '50%', minHeight: '100%' }">
				<!-- inner horizontal panes -->
				<multipane class="horizontal-panes" layout="horizontal">
					<div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
						<div class="d-table w-100">
							<b-input class="d-table-cell" type="text" maxlength="60" id="titleField" :value="getCurrentItemTitle" @blur="updateTitle()">
							</b-input>
							<div class="d-table-cell tar">
								<b-button href="#">(Un)Subscribe to change notices</b-button>
							</div>
						</div>
					</div>
					<div v-if="getCurrentItemType==this.pbiLevel" class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
						<div class="d-table w-100">
							<p class="title is-6">This item is of type '{{ this.getSubType(getCurrentItemSubType) }}'. Change it here -> </p>
							<div class="d-table-cell tar">
								<b-form-group>
									<b-form-radio-group v-model="selectedPbiType" :options="getPbiOptions()" plain name="pbiOptions" />
								</b-form-group>
							</div>
						</div>
					</div>
					<div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
						<div class="d-table w-100">
							<h5 class="title is-6">Description</h5>
							<div class="d-table-cell tar">
								<p class="title is-6">Created by {{ getCurrentItemHistory[0].by }} @ {{ new Date(getCurrentItemHistory[0].timestamp).toString().substring(0, 33) }} </p>
							</div>
						</div>
					</div>
					<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
					<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }" @mousedown.stop>
						<vue-editor v-model="description" :editorToolbar="editorToolbar" id="descriptionField" @blur="updateDescription()"></vue-editor>
					</div>
					<multipane-resizer></multipane-resizer>
					<div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
						<div>
							<h5 class="title is-6">Acceptance criteria</h5>
						</div>
					</div>
					<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
					<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }" @mousedown.stop>
						<vue-editor v-model="acceptanceCriteria" :editorToolbar="editorToolbar" id="acceptanceCriteriaField" @blur=updateAcceptance></vue-editor>
					</div>
					<multipane-resizer></multipane-resizer>
					<div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
						<div class="d-table w-100">
							<div class="d-table-cell tal">
								<b-button href="#">Add {{ selectedForView }}</b-button>
							</div>
							<div class="d-table-cell tac">
								<b-form-group label="Select to see">
									<b-form-radio-group v-model="selectedForView" :options="getViewOptions()" plain name="viewOptions" />
								</b-form-group>
							</div>
							<div class="d-table-cell tar">
								<b-button href="#">Find {{ selectedForView }}</b-button>
							</div>
						</div>
					</div>
					<div class="pane" :style="{ flexGrow: 1 }">
						<ul v-if="selectedForView==='comments'">
							<li v-for="comment in getCurrentItemComments" :key=comment.timestamp>
								<div v-for="(value, key) in comment" :key=key>
									{{ key }} {{ value }}
								</div>
							</li>
						</ul>
						<ul v-if="selectedForView==='attachments'">
							<li v-for="attach in getCurrentItemAttachments" :key=attach.timestamp>
								<div v-for="(value, key) in attach" :key=key>
									{{ key }} {{ value }}
								</div>
							</li>
						</ul>
						<ul v-if="selectedForView==='history'">
							<li v-for="hist in getCurrentItemHistory" :key="hist.timestamp">
								<div v-for="(value, key) in hist" :key=key>
									<div v-html="prepHistoryOut(key, value)"></div>
								</div>
							</li>
						</ul>
					</div>
				</multipane>
			</div>
		</multipane>

		<template v-if="this.nodeIsSelected">
			<div>
				<b-modal ref='removeModalRef' hide-footer :title=this.removeTitle>
					<div class="d-block text-center">
						<h3>This operation cannot be undone!</h3>
					</div>
					<b-button class="mt-3" variant="outline-danger" block @click="doRemove">Remove now!</b-button>
				</b-modal>
			</div>
		</template>
		<template v-if="this.nodeIsSelected">
			<div>
				<b-modal ref='insertModalRef' @ok="doInsert" @cancel="doCancelInsert" title='Insert a new item to your backlog'>
					<b-form-group label="Select what node type to insert:">
						<b-form-radio-group v-model="insertOptionSelected" :options="getNodeTypeOptions()" stacked name="Select new node type" />
					</b-form-group>
					<div class="mt-3">Selected: <strong>{{ prepareInsert() }}</strong></div>
				</b-modal>
			</div>
		</template>
	</div>
</template>

/*
* Definitions: items are PBI's or Product Backlog Items which are stored in the database as documents and presented on screen as nodes in a tree.
*
* NOTE on itemType and level numbering with the current config definition
*
* type ...............in database level ....... in tree
* -----------------------------------------------------------------------
* RequirementArea ........ 0 ................... n/a
* Database ............... 1 ................... n/a
* Product ................ 2 ................... 2
* Epic .. ................ 3 ................... 3
* Feature ................ 4 ................... 4
* PBI ... ................ 5 ................... 5
*
* The nodes in the tree have these data elements and values:
*
* title: doc.title,
* isLeaf: (type == leafType) ? true : false, // for now PBI's have no children
* children: [],
* isExpanded: true || false, // initially the tree is expanded up to the feature type
* isdraggable: true,
* isSelectable: true,
* isSelected: true || false
* data: {
* ...._id: doc._id,
* ....priority: doc.priority,
* ....productId: doc.productId,
* ....parentId: doc.parentId
* }
*/

<script>
	import {
		mapGetters
	} from 'vuex'

	import {
		Multipane,
		MultipaneResizer
	} from 'vue-multipane'

	import {
		VueEditor
	} from 'vue2-editor'

	// bug? Do not put this import in curly braces
	import SlVueTree from 'sl-vue-tree'

	var numberOfNodesSelected = 0
	var firstNodeSelected = null
	var newNode = {}
	var newNodeLocation = null
	var insertLevel = null

	export default {
		data() {
			return {
				productLevel: 2,
				epicLevel: 3,
				featureLevel: 4,
				pbiLevel: 5,

				nodeIsSelected: false,
				removeTitle: '',
				// default to sibling node (no creation of descendant)
				insertOptionSelected: 1,
				selectedNodesTitle: '',

				editorToolbar: [
					[{
						header: [false, 1, 2, 3, 4, 5, 6]
					}],
					['bold', 'italic', 'underline', 'strike'],
					[{
						'list': 'ordered'
					}, {
						'list': 'bullet'
					}],
					[{
						indent: "-1"
					}, {
						indent: "+1"
					}], // outdent/indent
					['link', 'image', 'code-block']
				],
				// set to an invalid value; must be updated before use
				selectedPbiType: -1,
				selectedForView: 'comments',
			}
		},

		mounted: function() {
			this.setFirstNodeSelected()
		},

		computed: {
			...mapGetters([
				//from store.js
				'getUser',
				'getRoles',
				'isAuthenticated',
				'isServerAdmin',
				// from load.js
				'getCurrentDb',
				'getCurrentItemAcceptanceCriteria',
				'getCurrentItemAttachments',
				'getCurrentItemComments',
				'getCurrentItemDescription',
				'getCurrentItemFollowers',
				'getCurrentItemHistory',
				'getCurrentItemId',
				'getCurrentItemPriority',
				'getCurrentItemProductId',
				'getCurrentItemState',
				'getCurrentItemTitle',
				'getCurrentItemType',
				'getCurrentItemReqArea',
				'getCurrentItemSpSize',
				'getCurrentItemSubType',
				'getCurrentItemTeam',
				'getCurrentItemTsSize',
				'getCurrentPersonHours',
				'getCurrentProductId',
				'getCurrentProductTitle',
				'getEmail',
				'getProductIds',
				'getTreeNodes',
			]),
			description: {
				get() {
					return this.getCurrentItemDescription
				},
				set(newDescription) {
					this.$store.state.load.currentDoc.description = newDescription
				}
			},
			acceptanceCriteria: {
				get() {
					return this.getCurrentItemAcceptanceCriteria
				},
				set(newAcceptanceCriteria) {
					this.$store.state.load.currentDoc.acceptanceCriteria = newAcceptanceCriteria
				}
			}
		},

		watch: {
			'selectedPbiType': function(val) {
				// prevent looping
				if (val != this.getCurrentItemSubType) {
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newSubType': val
					}
					this.$store.dispatch('setSubType', payload)
				}
			}
		},

		methods: {
			setFirstNodeSelected() {
				firstNodeSelected = this.$refs.slVueTree.getSelected()[0]
			},

			/* Presentation methods */
			prepHistoryOut(key, value) {
				if (key == "createEvent") {
					return "<h5>This " + this.getLevelText(value[0]) + " was created</h5>"
				}
				if (key == "setSizeEvent") {
					return "<h5>T-Shirt estimate changed from </h5>" + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
				}
				if (key == "setPointsEvent") {
					return "<h5>Storypoints estimate changed from </h5>" + value[0] + ' to ' + value[1]
				}
				if (key == "setHrsEvent") {
					return "<h5>Spike estimate hours changed from </h5>" + value[0] + ' to ' + value[1]
				}
				if (key == "setStateEvent") {
					return "<h5>The state of the item has changed from '" + this.getItemStateText(value[0]) + "' to '" + this.getItemStateText(value[1]) + "'</h5>"
				}
				if (key == "setTitleEvent") {
					return "<h5>The item  title has changed from: </h5>'" + value[0] + "' to '" + value[1] + "'"
				}
				if (key == "setSubTypeEvent") {
					return "<h5>The pbi subtype has changed from: </h5>'" + this.getSubType(value[0]) + "' to '" + this.getSubType(value[1]) + "'"
				}
				if (key == "descriptionEvent") {
					return "<h5>The description of the item has changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
				}
				if (key == "acceptanceEvent") {
					return "<h5>The acceptance criteria of the item have changed:<hr></h5>" + window.atob(value[0]) + "<hr>" + window.atob(value[1]) + "<hr>"
				}
				if (key == "nodeDroppedEvent") {
					if (value[0] == value[1]) {
						return "<h5>The item changed priority to position " + (value[2] + 1) + " under parent '" + value[3] + "'</h5>"
					} else {
						return "<h5>The item changed type from " + this.getLevelText(value[0]) + " to " + this.getLevelText(value[1]) + ".</h5>" +
							"<p>The new position is " + (value[2] + 1) + " under parent '" + value[3] + "'</p>"
					}
				}
				if (key == "timestamp") {
					return key + ": " + new Date(value).toString() + "<br><br>"
				}
				return key + ": " + value
			},

			/* Database update methods */
			updateDescription() {
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newDescription': this.getCurrentItemDescription,
					'newId': firstNodeSelected.data._id
				}
				this.$store.dispatch('saveDescriptionAndLoadDoc', payload)
			},
			updateAcceptance() {
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newAcceptance': this.getCurrentItemAcceptanceCriteria,
					'newId': firstNodeSelected.data._id
				}
				this.$store.dispatch('saveAcceptanceAndLoadDoc', payload)
			},
			updateTsSize() {
				var size = document.getElementById("tShirtSizeId").value.toUpperCase()
				const sizeArray = this.$store.state.load.config.tsSize
				if (sizeArray.includes(size)) {
					// update current document
					const payload = {
						'userName': this.getUser,
						'email': this.getEmail,
						'newSizeIdx': sizeArray.indexOf(size)
					}
					this.$store.dispatch('setSize', payload)
				} else {
					var sizes = ''
					for (let i = 0; i < sizeArray.length - 1; i++) {
						sizes += sizeArray[i] + ', '
					}
					alert(size + " is not a known T-shirt size. Valid values are: " + sizes + ' and ' + sizeArray[sizeArray.length - 1])
				}
			},
			updateStoryPoints() {
				var el = document.getElementById("storyPointsId")
				if (isNaN(el.value) || el.value < 0) {
					el.value = '?'
					return
				}
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newPoints': el.value
				}
				this.$store.dispatch('setStoryPoints', payload)
			},
			updatePersonHours() {
				var el = document.getElementById("personHoursId")
				if (isNaN(el.value) || el.value < 0) {
					el.value = '?'
					return
				}
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newHrs': el.value
				}
				this.$store.dispatch('setPersonHours', payload)
			},
			onStateChange(idx) {
				// update current document
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newState': idx
				}
				this.$store.dispatch('setState', payload)
			},
			updateTitle() {
				const oldTitle = this.$store.state.load.currentDoc.title
				const newTitle = document.getElementById("titleField").value
				if (oldTitle == newTitle) return

				// update the tree
				const paths = this.$refs.slVueTree.getSelected().map(node => node.path);
				this.$refs.slVueTree.updateNode(paths[0], {
					title: newTitle
				})
				// update current document in database
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newTitle': newTitle
				}
				this.$store.dispatch('setDocTitle', payload)
			},

			/* mappings from config */
			getLevelText(level) {
				if (level < 0 || level > this.pbiLevel) {
					return 'Error: unknown level'
				}
				return this.$store.state.load.config.itemType[level]
			},
			getItemStateText(idx) {
				if (idx < 0 || idx > this.pbiLevel) {
					return 'Error: unknown state'
				}
				return this.$store.state.load.config.itemState[idx]
			},
			getTsSize(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.tsSize.length) {
					return 'Error: unknown T-shirt size'
				}
				return this.$store.state.load.config.tsSize[idx]
			},
			getSubType(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.subtype.length) {
					return 'Error: unknown subtype'
				}
				return this.$store.state.load.config.subtype[idx]
			},
			getKnownRoles() {
				return this.$store.state.load.config.knownRoles
			},

			itemTitleTrunc(length, title) {
				if (title.length <= length) return title;
				return title.substring(0, length - 4) + '...';
			},

			/* event handling */
			nodeSelectedEvent(selNodes) {
				// set the focus on titleField so that the vue2editors loose focus, regain focus when selected and blur when exited
				document.getElementById("titleField").focus()
				this.nodeIsSelected = true
				numberOfNodesSelected = selNodes.length
				firstNodeSelected = selNodes[0]

				// read the document unless it is the root, which has no document
				if (selNodes[0].data._id != 'root') {
					this.$store.dispatch('loadDoc', firstNodeSelected.data._id)
				}

				const title = this.itemTitleTrunc(60, selNodes[0].title)
				if (selNodes.length == 1) {
					this.selectedNodesTitle = title
					this.$store.state.load.lastEvent = `${this.getLevelText(selNodes[0].level)} '${this.selectedNodesTitle}' is selected`
				} else {
					this.selectedNodesTitle = "'" + title + "' + " + (selNodes.length - 1) + ' other item(s)'
					this.$store.state.load.lastEvent = `${this.getLevelText(selNodes[0].level)} ${this.selectedNodesTitle} are selected`
				}
			},

			nodeToggled(node) {
				this.$store.state.load.lastEvent = `Node '${node.title}' is ${ node.isExpanded ? 'collapsed' : 'expanded'}`;
			},

			haveDescendants(nodes) {
				for (let i = 0; i < nodes.length; i++) {
					if (nodes[i].children.length != 0) {
						return true
					}
					return false
				}
			},

			haveSameLevel(nodes) {
				var level = nodes[0].level
				for (let i = 0; i < nodes.length; i++) {
					if (nodes[i].level != level) {
						return false
					}
					return true
				}
			},

			/*
			/ Use this event to:
			/ - Disallow drag of multiple items which are on different levels
			/ - For now: Disallow drag of node(s) with children
			/ - Disallow drop when moving over more than 1 level. Changing type over more levels must be done one level by level
			/ - Have an extra check if we are dropping to a level higher than than the pbi level. Should not happen if pbi's are all leafes
			*/
			beforeNodeDropped(draggingNodes, position, cancel) {
				// disallow drag of multiple items which are on different levels
				if (!this.haveSameLevel(draggingNodes)) {
					cancel(true)
					return
				}
				// for now: Disallow dragging of node(s) with children
				if (this.haveDescendants(draggingNodes)) {
					cancel(true)
					return
				}
				// some variables
				const sourceLevel = draggingNodes[0].level
				let targetLevel = sourceLevel
				// are we dropping 'inside' a node creating children to that node?
				if (position.placement == 'inside') {
					targetLevel = position.node.level + 1
					const levelChange = Math.abs(targetLevel - sourceLevel)
					// Disallow drop when moving over more than 1 level. Changing type over more levels must be done one level by level
					if (levelChange > 1 || targetLevel > this.pbiLevel) {
						cancel(true)
						return
					}
				} else {
					// a drop before of after an existing sibling
					targetLevel = position.node.level
					const levelChange = Math.abs(targetLevel - sourceLevel)
					// Disallow drop when moving over more than 1 level. Changing type over more levels must be done one level by level
					if (levelChange > 1 || targetLevel > this.pbiLevel) {
						cancel(true)
						return
					}
				}
			},

			/*
			 * Recalculate the priorities of the moved or inserted node(s)
			 * Get the productId of the node(s) in case they are dopped on another product. Determine the parentId.
			 * Set isLeaf depending on the level of the node and set isExanded to false as these nodes have no children
			 * Update the values in the tree
			 * precondition: all moved nodes have the same parent (same level) and have no children
			 */
			updateTree(nodes) {
				const level = nodes[0].level
				const firstNodePath = nodes[0].path
				const prevNode = this.$refs.slVueTree.getPrevNode(firstNodePath)
				const lastNodePath = nodes[nodes.length - 1].path
				const nextNode = this.$refs.slVueTree.getNextNode(lastNodePath)
				var localProductId
				var localParentId
				var predecessorPrio
				var successorPrio
				var predecessorTitle
				var successorTitle

				if (nodes[0].isFirstChild) {
					predecessorPrio = Number.MAX_SAFE_INTEGER
					predecessorTitle = 'parent'
					localParentId = prevNode.data._id
					if (localParentId == 'root') {
						// when creating a new product
						localProductId = nodes[0].data._id
					} else {
						localProductId = prevNode.data.productId
					}
				} else {
					// copy the data from a sibling
					predecessorPrio = prevNode.data.priority
					predecessorTitle = prevNode.title
					localProductId = prevNode.data.productId
					localParentId = prevNode.data.parentId
				}

				if (nodes[nodes.length - 1].isLastChild) {
					successorPrio = Number.MIN_SAFE_INTEGER
					successorTitle = 'none existant'
				} else {
					// copy the data from a sibling
					successorPrio = nextNode.data.priority
					successorTitle = nextNode.title
				}

				const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))

				//eslint-disable-next-line no-console
				console.log('updateTree: for "' + nodes[0].title + '" and ' + (nodes.length - 1) + ' siblings' +
					'\n level = ' + level +
					'\n localProductId = ' + localProductId +
					'\n localParentId = ' + localParentId +
					'\n predecessorTitle = ' + predecessorTitle +
					'\n successorTitle = ' + successorTitle +
					'\n predecessorPrio = ' + predecessorPrio +
					'\n successorPrio = ' + successorPrio +
					'\n stepSize = ' + stepSize)

				for (let i = 0; i < nodes.length; i++) {
					// update the tree
					let data = nodes[i].data
					data.priority = Math.floor(predecessorPrio - (i + 1) * stepSize)
					data.productId = localProductId
					data.parentId = localParentId
					this.$refs.slVueTree.updateNode(nodes[i].path, {
						isLeaf: (level < this.pbiLevel) ? false : true,
						isExpanded: false,
						data
					})
				}
			},

			/*
			 * Update the tree when one or more nodes are dropped on another location
			 * note: for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
			 * precondition: all draggingNodes are on the same level and have no children (exluded by beforeNodeDropped())
			 * ToDo: expand the parent if a node is dropped inside that parent
			 */
			nodeDropped(draggingNodes, position) {
				// cannot use draggingnodes, use selectedNodes as the dropped nodes are all selected
				const selectedNodes = this.$refs.slVueTree.getSelected()
				let clickedLevel = draggingNodes[0].level
				let dropLevel = position.node.level
				// drop inside?
				if (position.placement == 'inside') {
					dropLevel++
				}
				let levelChange = clickedLevel - dropLevel
				console.log('nodeDropped: clickedLevel = ' + clickedLevel +
					'nodeDropped: dropLevel = ' + dropLevel +
					'nodeDropped: selectedNodes[0].level = ' + selectedNodes[0].level +
					'nodeDropped: levelChange (positive is up hierarchy) = ' + levelChange +
					'nodeDropped: selectedNodes.length = ' + selectedNodes.length +
					'nodeDropped: has children = ' + this.haveDescendants(selectedNodes))

				// when nodes are dropped to another position the type, the priorities and possibly the owning productId must be updated
				this.updateTree(selectedNodes)
				// update the nodes in the database
				for (let i = 0; i < selectedNodes.length; i++) {
					const payload = {
						'_id': selectedNodes[i].data._id,
						'productId': selectedNodes[i].data.productId,
						'newParentId': selectedNodes[i].data.parentId,
						'newParentTitle': null,
						'oldLevel': clickedLevel,
						'newLevel': selectedNodes[i].level,
						'newInd': selectedNodes[i].ind,
						'userName': this.getUser,
						'email': this.getEmail
					}
					this.$store.dispatch('updateDropped', payload)
				}
				// create the event message
				const title = this.itemTitleTrunc(60, selectedNodes[0].title)
				if (selectedNodes.length == 1) {
					this.$store.state.load.lastEvent = `${this.getLevelText(clickedLevel)} '${title}' is dropped ${position.placement} '${position.node.title}'`
				} else {
					this.$store.state.load.lastEvent = `${this.getLevelText(clickedLevel)} '${title}' and ${selectedNodes.length - 1} other item(s) are dropped ${position.placement} '${position.node.title}'`
				}
				if (levelChange != 0) this.$store.state.load.lastEvent = this.$store.state.load.lastEvent + ' as ' + this.getLevelText(dropLevel)
			},

			getDescendants(path) {
				let descendants = []
				let initLevel = 0

				this.$refs.slVueTree.traverse((node) => {
					if (this.$refs.slVueTree.comparePaths(node.path, path) == 0) {
						initLevel = node.level
					} else {
						if (node.level <= initLevel) return false

						if (this.$refs.slVueTree.comparePaths(node.path, path) == 1) {
							descendants.push(node)
						}
					}
				})
				return descendants;
			},

			countDescendants(path) {
				return this.getDescendants(path).length
			},

			showRemoveModal(node, event) {
				event.preventDefault();
				// node must be selected first && user cannot the database && only one node can be selected
				if (this.nodeIsSelected && node.level > 1 && numberOfNodesSelected === 1) {
					this.removeTitle = `This ${this.getLevelText(node.level)} and ${this.countDescendants(node.path)} descendants will be removed`
					this.$refs.removeModalRef.show();
				}
			},

			/*
			 * Both the clicked node and all its descendants will be tagged with a delmark
			 */
			doRemove() {
				const selectedNodes = this.$refs.slVueTree.getSelected()
				this.$store.state.load.lastEvent = `The ${this.getLevelText(selectedNodes[0].level)} and ${this.countDescendants(selectedNodes[0].path)} descendants are removed`
				const paths = selectedNodes.map(node => node.path)
				const descendants = this.getDescendants(paths[0])
				// now we can remove the nodes
				this.$refs.slVueTree.remove(paths)
				// set remove mark on the clicked item
				this.$store.dispatch('removeDoc', [selectedNodes[0].data._id])
				// and remove the descendants
				for (let i = 0; i < descendants.length; i++) {
					this.$store.dispatch('removeDoc', descendants[i].data._id)
				}
				// After removal no node is selected
				this.nodeIsSelected = false
			},

			showInsertModal(node, event) {
				event.preventDefault();
				if (this.nodeIsSelected) {
					let clickedLevel = firstNodeSelected.level;
					if (clickedLevel === this.pbiLevel) {
						//Cannot create child below PBI
						this.insertOptionSelected = 1;
					}
					if (clickedLevel === 1) {
						// cannot create a database here, ask server admin
						this.insertOptionSelected = 2;
					}
					this.$refs.insertModalRef.show();
				}
			},

			getPbiOptions() {
				this.selectedPbiType = this.getCurrentItemSubType
				let options = [{
						text: 'User story',
						value: 0,
					},
					{
						text: 'Spike',
						value: 1,
					},
					{
						text: 'Defect',
						value: 2,
					}
				]
				return options
			},

			getNodeTypeOptions() {
				let options = [{
						text: 'Option 1',
						value: 1,
						disabled: false
					},
					{
						text: 'Option 2',
						value: 2,
						disabled: false
					}
				];
				var clickedLevel = firstNodeSelected.level
				options[0].text = this.getLevelText(clickedLevel)
				options[1].text = this.getLevelText(clickedLevel + 1)
				// Disable the option to create a node below a PBI
				if (clickedLevel === this.pbiLevel) options[1].disabled = true;
				// Disable the option to create a new database
				if (clickedLevel === 1) options[0].disabled = true;
				return options
			},

			getViewOptions() {
				let options = [{
						text: 'Comments',
						value: 'comments',
					},
					{
						text: 'Attachments',
						value: 'attachments',
					},
					{
						text: 'History',
						value: 'history',
					}
				]
				return options
			},

			/*
			 * Prepare a new node for insertion
			 * note: for now PBI's have no children
			 */
			prepareInsert() {
				var clickedLevel = firstNodeSelected.level
				// prepare the new node for insertion later
				newNode = {
					title: 'is calculated in this method',
					isLeaf: 'is calculated in this method',
					children: [],
					isExpanded: false,
					isdraggable: true,
					isSelectable: true,
					isSelected: true,
					data: {
						_id: null,
						priority: null,
						productId: null,
						parentId: null
					}
				}
				if (this.insertOptionSelected === 1) {
					// New node is a sibling placed below (after) the selected node
					insertLevel = clickedLevel
					newNodeLocation = {
						node: firstNodeSelected,
						placement: 'after'
					}
					newNode.title = 'New ' + this.getLevelText(insertLevel)
					newNode.isLeaf = (insertLevel < this.pbiLevel) ? false : true
					return "Insert " + this.getLevelText(insertLevel) + " below the selected node"
				}

				if (this.insertOptionSelected === 2) {
					// new node is a child placed a level lower (inside) than the selected node
					insertLevel = clickedLevel + 1
					newNodeLocation = {
						node: firstNodeSelected,
						placement: 'inside'
					}
					newNode.title = 'New ' + this.getLevelText(insertLevel)
					newNode.isLeaf = (insertLevel < this.pbiLevel) ? false : true
					return "Insert " + this.getLevelText(insertLevel) + " as a child node"
				}

				return '' // Should never happen
			},

			/*
			 * Insert the prepared node in the tree and create a document for this new item
			 */
			doInsert() {
				this.$store.state.load.lastEvent = 'Item of type ' + this.getLevelText(insertLevel) + ' is inserted'
				this.$refs.slVueTree.insert(newNodeLocation, newNode)
				// restore default
				this.insertOptionSelected = 1

				// unselect the node that was clicked before the insert and expand it to show the inserted node
				const clickedPath = this.$refs.slVueTree.getSelected()[0].path
				this.$refs.slVueTree.updateNode(clickedPath, {
					isSelected: false,
					isExpanded: true
				})

				// now the node is inserted get the full ISlTreeNode data and set data fields and select the inserted node
				const insertedNode = this.$refs.slVueTree.getNextNode(clickedPath)
				this.$refs.slVueTree.updateNode(insertedNode.path, {
					isSelected: true,
					isExpanded: false
				})

				// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
				const newId = Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
				insertedNode.data._id = newId

				// productId and parentId are set in this routine
				this.updateTree([insertedNode])

				const testNode = this.$refs.slVueTree.getSelected()[0]
				console.log('doInsert(): testNode.title = ' + testNode.title +
					'\n testNode.level = ' + testNode.level +
					'\n testNode.data._id = ' + testNode.data._id +
					'\n testNode.data.priority = ' + testNode.data.priority +
					'\n testNode.data.productId = ' + testNode.data.productId +
					'\n testNode.data.parentId = ' + testNode.data.parentId)

				// create a new document and store it
				const initData = {
					"_id": newId,
					"productId": insertedNode.data.productId,
					"parentId": insertedNode.data.parentId,
					"team": "not assigned yet",
					"type": insertedNode.level,
					"subtype": 0,
					"state": 0,
					"tssize": 0,
					"spsize": 0,
					"spikepersonhours": 0,
					"reqarea": null,
					"title": insertedNode.title,
					"followers": [],
					"description": "",
					"acceptanceCriteria": window.btoa("Please don't forget"),
					"priority": insertedNode.data.priority,
					"attachments": [],
					"comments": [],
					"history": [{
						"createEvent": [insertedNode.level],
						"by": this.getUser,
						"email": this.getEmail,
						"timestamp": Date.now()
					}],
					"delmark": false
				}
				// update the database
				const payload = {
					'_id': newId,
					'initData': initData
				}
				this.$store.dispatch('createDoc', payload)
			},

			doCancelInsert() {
				this.insertOptionSelected = 1; //Restore default
			},

		},

		components: {
			Multipane,
			MultipaneResizer,
			VueEditor,
			SlVueTree,
		}
	}

</script>

<style lang="scss" scoped>
	@import "../../css/sl-vue-tree-dark.css";

	// horizontal panes
	.horizontal-panes {
		width: 100%;
		border: 1px solid #ccc;
	}

	.horizontal-panes>.pane {
		text-align: left;
		padding: 5px;
		overflow: hidden;
		background: white;
	}

	.horizontal-panes>.pane~.pane {
		border-top: 1px solid #ccc;
	}

	// vertical panes
	.custom-resizer {
		width: 100%;
		height: 100%;
	}

	.custom-resizer>.pane {
		text-align: left;
		padding: 2px;
		overflow: hidden;
		background: #eee;
		border: 1px solid #ccc;
	}

	.custom-resizer>.pane~.pane {}

	.custom-resizer>.multipane-resizer {
		margin: 0;
		left: 0;
		position: relative;

		&:before {
			display: block;
			content: "";
			width: 3px;
			height: 40px;
			position: absolute;
			top: 400px;
			left: 50%;
			margin-top: -20px;
			margin-left: -1.5px;
			border-left: 1px solid #ccc;
			border-right: 1px solid #ccc;
		}

		&:hover {
			&:before {
				border-color: #999;
			}
		}
	}

	// other stuff
	.d-table {
		display: table;
	}

	.d-table-cell {
		display: table-cell;
		vertical-align: middle;
	}

	.w-100 {
		width: 100%;
	}

	.w-50 {
		width: 50%;
	}

	.tar {
		text-align: right;
	}

	.tac {
		text-align: center;
	}

	.tal {
		text-align: left;
	}

	//tree stuff

	.last-event {
		color: white;
		background-color: #408FAE;
		padding: 10px;
		border-radius: 2px;
	}

	.item-icon {
		display: inline-block;
		text-align: left;
		width: 20px;
		color: skyblue;
	}

	.tree-container {
		flex-grow: 1;
		height: 100%;
	}

	.sl-vue-tree.sl-vue-tree-root {
		flex-grow: 1;
		overflow-x: hidden;
		overflow-y: auto;
		height: 100%;
	}

	//my stuff

	input[type="number"] {
		-moz-appearance: numberfield;
		width: 80px;
	}

	.inline {
		display: inline-block;
	}

	.align-left {
		float: left;
		margin-top: 10px;
	}

	.align-right {
		float: right;
		margin-top: 10px;
	}

</style>
