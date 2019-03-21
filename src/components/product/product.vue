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
				<h1 v-if='getCurrentItemTeam'>Team: {{ getCurrentItemTeam }}</h1>
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
				<h3>Your current database is set to {{ getCurrentDb }}. You have {{ getProductIds.length }} product(s)</h3>

				<div class='last-event'>
					Last event: {{ lastEvent }}
				</div>

				<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
				<div class="tree-container" @mousedown.stop>
					<sl-vue-tree :value="getTreeNodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">

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
						<vue-editor v-model="acceptanceCriteria" :editorToolbar="editorToolbar" id="acceptanceCriteriaField" @blur="updateAcceptanceCriteria()"></vue-editor>
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
									{{ prepHistoryOut(key, value) }}
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
* NOTE on itemType and level numbering with the current config definition
*
* type ...............in database level ....... in tree
* -----------------------------------------------------------------------
* Database ............... 0 ................... n/a
* RequirementArea ........ 1 ................... n/a
* Product ................ 2 ................... 2
* Epic .. ................ 3 ................... 3
* Feature ................ 4 ................... 4
* PBI ... ................ 5 ................... 5
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

	//Bug? Do not put this import in curly braces
	import SlVueTree from 'sl-vue-tree'

	var numberOfNodesSelected = 0
	var firstNodeSelected = null
	var newNode = {}

	export default {
		data() {
			return {
				productLevel: 2,
				epicLevel: 3,
				featureLevel: 4,
				pbiLevel: 5,

				nodeIsSelected: false,
				removeTitle: '',
				insertOptionSelected: 1, // default to sibling node (no creation of descendant)
				lastEvent: 'No last event',
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

				selectedPbiType: -1, // set to an invalid value; must be updated before use
				selectedForView: 'comments',
			}
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
			'selectedPbiType': function(val, oldVal) {
				// prevent looping
				if (val != this.getCurrentItemSubType) {
					//eslint-disable-next-line no-console
					console.log('watch: selectedPbiType has changed from ' + oldVal + ' to ' + val + ' subType = ' + this.getCurrentItemSubType)
					const payload = {
						'newSubType': val
					}
					this.$store.dispatch('setSubType', payload)
				}
			}
		},

		methods: {
			/* Presentation methods */
			prepHistoryOut(key, value) {
				if (key == "setSizeEvent") {
					return 'event: T-Shirt estimate changed from ' + this.getTsSize(value[0]) + ' to ' + this.getTsSize(value[1])
				}
				if (key == "setPointsEvent") {
					return 'event: Storypoints estimate changed from ' + value[0] + ' to ' + value[1]
				}
				if (key == "setHrsEvent") {
					return 'event: Spike estimate hours changed from ' + value[0] + ' to ' + value[1]
				}
				if (key == "setStateEvent") {
					return 'event: The state of the item has changed from ' + this.getItemStateText(value[0]) + ' to ' + this.getItemStateText(value[1])
				}
				if (key == "setTitleEvent") {
					return 'event: The item  title has changed from: "' + value[0] + '" to "' + value[1] + '"'
				}
				if (key == "timestamp") {
					return key + ": " + new Date(value).toString()
				}
				return key + ": " + value
			},

			/* Database update methods */
			updateTsSize() {
				var size = document.getElementById("tShirtSizeId").value.toUpperCase()
				const sizeArray = this.$store.state.load.config.tsSize
				if (sizeArray.indexOf(size) != -1) {
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
				const newTitle = document.getElementById("titleField")
				// update the tree
				const paths = this.$refs.slVueTree.getSelected().map(node => node.path);
				this.$refs.slVueTree.updateNode(paths[0], {
					title: newTitle.value,
				})
				// update current document in database
				const payload = {
					'userName': this.getUser,
					'email': this.getEmail,
					'newTitle': newTitle.value
				}
				this.$store.dispatch('setDocTitle', payload)
			},
			updateDescription() {
				const payload = {
					'newDescription': this.description
				}
				this.$store.dispatch('setDescription', payload)
			},
			updateAcceptanceCriteria() {
				const payload = {
					'newAcceptanceCriteria': this.acceptanceCriteria
				}
				this.$store.dispatch('setAcceptanceCriteria', payload)
			},
			updatePriorityInDb(_id, newPriority) {
				const payload = {
					'_id': _id,
					'priority': newPriority,
				}
				this.$store.dispatch('setPriority', payload)
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
			getItemStateDef(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.itemStateDefinitions.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.load.config.itemStateDefinitions[idx]
			},
			getTsSizeDef(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.tsSizeDefinitions.length) {
					return 'Error: unknown T-shirt size'
				}
				return this.$store.state.load.config.tsSizeDefinitions(idx)
			},
			getSubTypeDef(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.subtypeDefinitions.length) {
					return 'Error: unknown subtype'
				}
				return this.$store.state.load.config.subtypeDefinitions[idx]
			},
			getKnownRoleDef(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.knownRolesDefinitions.length) {
					return 'Error: unknown role'
				}
				return this.$store.state.load.config.knownRolesDefinitions[idx]
			},

			itemTitleTrunc(length, title) {
				if (title.length <= length) return title;
				return title.substring(0, length - 4) + '...';
			},

			nodeSelected(selNodes) {
				this.nodeIsSelected = true
				numberOfNodesSelected = selNodes.length
				firstNodeSelected = selNodes[0]

				// read the document
				this.$store.dispatch('loadDoc', firstNodeSelected.data._id)
				const title = this.itemTitleTrunc(60, selNodes[0].title)
				if (selNodes.length == 1) {
					this.selectedNodesTitle = title
				} else {
					this.selectedNodesTitle = title + ' + ' + (selNodes.length - 1) + ' other items'
				}
				this.lastEvent = `Selected node: ${this.selectedNodesTitle}`
			},

			nodeToggled(node) {
				this.lastEvent = `Node ${node.title} is ${ node.isExpanded ? 'collapsed' : 'expanded'}`;
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
			/ Use undocumented event to:
			/ - cancel drag of items on different levels
			/ - cancel drop on other level (change of type) when having children
			/ - cancel drop when moving over more than 1 level
			*/
			beforeNodeDropped(draggingNodes, position, cancel) {
				if (!this.haveSameLevel(draggingNodes)) {
					cancel(true)
					return
				}

				let clickedLevel = draggingNodes[0].level
				let dropLevel = position.node.level

				let levelChange = Math.abs(clickedLevel - dropLevel)
				if (levelChange === 0) {
					// just sorting
					return
				}

				if (levelChange === 1 && this.haveDescendants(draggingNodes)) {
					// change of type only allowed without children
					cancel(true)
					return
				}

				if (levelChange > 1) {
					// cannot change type over more than 1 level
					cancel(true)
					return
				}
			},

			/*
			 * Calculate the priorities of newly inserted nodes
			 */
			calculatePriorities(nodes) {
				const firstNodePath = nodes[0].path
				const lastNodePath = nodes[nodes.length - 1].path
				var predecessorPrio
				var successorPrio
				var predecessorTitle
				var successorTitle
				var newPriorities = []

				if (nodes[0].isFirstChild) {
					predecessorPrio = Number.MAX_SAFE_INTEGER
					predecessorTitle = 'parent'
				} else {
					predecessorPrio = this.$refs.slVueTree.getPrevNode(firstNodePath).data.priority
					predecessorTitle = this.$refs.slVueTree.getPrevNode(firstNodePath).title
				}

				if (nodes[nodes.length - 1].isLastChild) {
					successorPrio = Number.MIN_SAFE_INTEGER
					successorTitle = 'none existant'
				} else {
					successorPrio = this.$refs.slVueTree.getNextNode(lastNodePath).data.priority
					successorTitle = this.$refs.slVueTree.getNextNode(lastNodePath).title
				}

				const stepSize = Math.floor((predecessorPrio - successorPrio) / (nodes.length + 1))
				//eslint-disable-next-line no-console
				console.log('calculatePriorities: for "' + nodes[0].title + '" and ' + (nodes.length - 1) + ' siblings' +
					'\n predecessorTitle = ' + predecessorTitle +
					'\n successorTitle = ' + successorTitle +
					'\n predecessorPrio = ' + predecessorPrio +
					'\n successorPrio = ' + successorPrio +
					'\n stepSize = ' + stepSize)
				for (let i = 0; i < nodes.length; i++) {
					newPriorities.push(Math.floor(predecessorPrio - (i + 1) * stepSize))
				}
				return newPriorities
			},

			/*
			 * Recalculate, change and save the priorities of the inserted nodes
			 * Update the value in the tree and the database
			 * precondition: all moved nodes have the same parent
			 */
			resetPriorities(nodes) {
				let newPriorities = this.calculatePriorities(nodes)
				for (let i = 0; i < nodes.length; i++) {
					this.updatePriorityInTree(nodes[i].data._id, nodes[i], newPriorities[i])
					this.updatePriorityInDb(nodes[i].data._id, newPriorities[i])
				}
			},

			/*
			 * updates the priority value in the tree
			 */
			updatePriorityInTree(id, node, newPriority) {
				this.$refs.slVueTree.updateNode(node.path, {
					data: {
						_id: id,
						priority: newPriority,
					}
				})
			},

			/*
			 * Update the tree when one or more nodes are dropped on another location
			 */
			nodeDropped(draggingNodes, position) {
				let clickedLevel = draggingNodes[0].level
				let dropLevel = position.node.level
				let levelChange = Math.abs(clickedLevel - dropLevel)
				const selectedNodes = this.$refs.slVueTree.getSelected()

				//								console.log('nodeDropped: clickedLevel = ' + clickedLevel)
				//								console.log('nodeDropped: dropLevel = ' + dropLevel)
				//								console.log('nodeDropped: levelChange = ' + levelChange)
				//								console.log('nodeDropped: selectedNodes.length = ' + selectedNodes.length)

				for (let i = 0; i < selectedNodes.length; i++) {
					if (levelChange === 0) {
						// for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
						if (dropLevel + levelChange === this.pbiLevel) {
							this.$refs.slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels are not a leaf
							this.$refs.slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: false,
								isExpanded: false,
							})
						}
					} else {
						// the user dropped the node(s) on another level
						if (dropLevel + levelChange === this.pbiLevel) {
							this.$refs.slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels (= higher in the hiearchy) are not a leave
							this.$refs.slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: false,
								isExpanded: false,
							})
						}
					}
				}
				// When nodes are dropped to another position the priorities must be updated
				// Recalculate the priorities of the dropped nodes and create the event message
				this.resetPriorities(selectedNodes)
				const title = this.itemTitleTrunc(60, draggingNodes[0].title)
				if (draggingNodes.length == 1) {
					this.lastEvent = `Node '${title}' is dropped ${position.placement} '${position.node.title}'`
				} else {
					this.lastEvent = `Nodes '${title}' and ${draggingNodes.length - 1} other item(s) are dropped ${position.placement} '${position.node.title}'`
				}
				if (levelChange > 0) this.lastEvent = this.lastEvent + ' as ' + this.getLevelText(dropLevel)
			},

			countDescendants(path) {
				let count = 0
				let doCount = false
				let initLevel = 0

				this.$refs.slVueTree.traverse((node) => {
					if (this.$refs.slVueTree.comparePaths(node.path, path) == 0) {
						initLevel = node.level
						doCount = true
					} else {
						if (node.level <= initLevel) return false

						if (this.$refs.slVueTree.comparePaths(node.path, path) == 1) {
							if (doCount) {
								count++
							}
						}
					}
				})
				return count;
			},

			showRemoveModal(node, event) {
				event.preventDefault();
				// Node must be selected first && user cannot remove on the database level && only one node can be selected
				if (this.nodeIsSelected && node.level > 1 && numberOfNodesSelected === 1) {
					this.removeTitle = `This ${this.getLevelText(node.level)} and ${this.countDescendants(node.path)} descendants will be removed`
					this.$refs.removeModalRef.show();
				}
			},

			doRemove() {
				const selectedNodes = this.$refs.slVueTree.getSelected()
				this.lastEvent = `The ${this.getLevelText(selectedNodes[0].level)} and ${this.countDescendants(selectedNodes[0].path)} descendants are removed`
				const paths = selectedNodes.map(node => node.path)
				this.$refs.slVueTree.remove(paths)
				// set remove mark in current document in the database
				this.$store.dispatch('removeDoc')
				// After removal no node is selected
				this.nodeIsSelected = false
			},

			showInsertModal(node, event) {
				event.preventDefault();
				if (this.nodeIsSelected) {
					let clickedLevel = firstNodeSelected.level;
					if (clickedLevel === this.pbiLevel) {
						this.insertOptionSelected = 1; //Cannot create child below PBI
					}
					if (clickedLevel === 1) {
						this.insertOptionSelected = 2; //Cannot create a database here
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

			prepareInsert() {
				var clickedLevel = firstNodeSelected.level
				var insertLevel = clickedLevel
				if (this.insertOptionSelected === 1) {
					// New node is a sibling placed below (after) the selected node
					this.newNodeLocation = {
						node: firstNodeSelected,
						placement: 'after'
					}
					newNode = {
						title: 'New ' + this.getLevelText(insertLevel),
						isLeaf: (insertLevel < this.pbiLevel) ? false : true, // for now PBI's have no children
						children: [],
						isExpanded: false,
						isdraggable: true,
						isSelectable: true,
						isSelected: true
					}
					return "Insert " + this.getLevelText(insertLevel) + " below the selected node"
				}

				if (this.insertOptionSelected === 2) {
					// New node is a child placed a level lower (inside) than the selected node
					insertLevel = clickedLevel + 1
					this.newNodeLocation = {
						node: firstNodeSelected,
						placement: 'inside'
					}
					newNode = {
						title: 'New ' + this.getLevelText(insertLevel),
						isLeaf: (insertLevel < this.pbiLevel) ? false : true, // for now PBI's have no children
						children: [],
						isExpanded: false,
						isdraggable: true,
						isSelectable: true,
						isSelected: true
					}
					return "Insert " + this.getLevelText(insertLevel) + " as a child node"
				}

				return '' // Should never happen
			},

			doInsert() {
				this.lastEvent = 'Node is inserted';
				this.$refs.slVueTree.insert(this.newNodeLocation, newNode)
				// restore default
				this.insertOptionSelected = 1
				// unselect the node that was clicked before the insert
				const paths = this.$refs.slVueTree.getSelected().map(node => node.path);
				this.$refs.slVueTree.updateNode(paths[0], {
					isSelected: false
				})
				// now the node is inserted get the full ISlTreeNode data and set priority
				const selectedNodes = this.$refs.slVueTree.getSelected()
				const insertedNode = selectedNodes.slice(0, 1)
				// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 4 digit hexadecimal random value
				const newId = Date.now().toString() + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toString()
				const setPriority = this.calculatePriorities(insertedNode)[0]
				// create a new document, save and reload it
				const initData = {
					"_id": newId,
					"productId": this.getCurrentItemProductId,
					"type": insertedNode[0].level,
					"subtype": 0,
					"state": 0,
					"tssize": 0,
					"spsize": 0,
					"spikepersonhours": 0,
					"reqarea": null,
					"title": insertedNode[0].title,
					"followers": [],
					"description": "",
					"acceptanceCriteria": window.btoa("Please don't forget"),
					"priority": setPriority,
					"attachments": [],
					"comments": [],
					"history": [{
						"event": this.getLevelText(insertedNode[0].level) + " created",
						"by": this.getUser,
						"email": this.getEmail,
						"timestamp": Date.now()
					}],
					"delmark": false
				}
				const payload = {
					'_id': newId,
					'initData': initData
				}
				this.$store.dispatch('createDoc', payload)
				// update the node data
				this.updatePriorityInTree(newId, insertedNode[0], setPriority)
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
		},

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
