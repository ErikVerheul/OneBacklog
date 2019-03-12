<template>
	<div>
		<!-- horizontal panes -->
		<multipane class="horizontal-panes" layout="horizontal">
			<div class="pane" :style="{ minHeight: '120px', height: '120px', maxHeight: '120px' }">
				<div class="d-table ">
					<div class="d-table-cell tal clearfix">
						<b-img left :src="require('../../assets/logo.png')" height="100%" alt="OneBacklog logo" />
					</div>
					<div class="d-table-cell w-100 tac">
						<div>
							<h3 v-if="itemType <= 2">{{ getLevelText(itemType + 1) }} T-Shirt size:
								<input type="text" size="3" maxlength="3" id="productTitle" :value="tsSize" />
							</h3>
							<h3 v-if="itemType > 2">{{ getLevelText(itemType + 1) }} Story points:
								<input type="text" size="3" maxlength="4" id="productTitle" :value="spSize" />
							</h3>
						</div>
					</div>
				</div>
			</div>

			<!-- vertical panes -->
			<multipane class="custom-resizer" layout="vertical">
				<div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
					<h3>Your current database is set to {{ currentDb }}. You have {{ userProductsIds.length }} product(s)</h3>

					<div class='last-event'>
						Last event: {{ lastEvent }}
					</div>

					<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
					<div class="tree-container" @mousedown.stop>
						<sl-vue-tree v-model="treeNodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">

							<template slot="title" slot-scope="{ node }">
								<span class="item-icon">
									<i v-if="node.isLeaf">
										<font-awesome-icon icon="file" />
									</i>
									<i v-if="!node.isLeaf">
										<font-awesome-icon icon="folder" />
									</i>
								</span>
								{{ node.title }} + {{ node.data.priority}}
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
								<b-input class="d-table-cell" type="text" maxlength="60" id="titleField" :value="itemTitle" @blur="updateTitle()">
								</b-input>
								<div class="d-table-cell tar">
									<b-button href="#">(Un)Subscribe to change notices</b-button>
								</div>
							</div>
						</div>
						<div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
							<div class="d-table w-100">
								<h5 class="title is-6">Description</h5>
								<div class="d-table-cell tar">
									<h6 class="title is-6">Created by {{ history[0].createdBy }} at {{ new Date(history[0].creationDate).toString().substring(0, 33) }} </h6>
								</div>
							</div>
						</div>
						<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
							<vue-editor :value="description" :editorToolbar="customToolbar" id="descriptionField" @blur="updateDescription()"></vue-editor>
						</div>
						<multipane-resizer></multipane-resizer>
						<div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
							<div>
								<h5 class="title is-6">Acceptance criteria</h5>
							</div>
						</div>
						<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
							<vue-editor :value="acceptanceCriteria" :editorToolbar="customToolbar" id="acceptanceCriteriaField" @blur="updateAcceptanceCriteria()"></vue-editor>
						</div>
						<multipane-resizer></multipane-resizer>
						<div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
							<div class="d-table w-100">
								<div class="d-table-cell tal">
									<b-button href="#">Add {{ selected }}</b-button>
								</div>
								<div class="d-table-cell tac">
									<b-form-group label="Select to see">
										<b-form-radio-group v-model="selected" :options="options" plain name="plainInline" />
									</b-form-group>
								</div>
								<div class="d-table-cell tar">
									<b-button href="#">Find {{ selected }}</b-button>
								</div>
							</div>
						</div>
						<div class="pane" :style="{ flexGrow: 1 }">
							<ul v-if="selected==='comments'">
								<li v-for="comment in comments" :key=comment.authorAndIssueDate>
									<div v-for="(value, key) in comment" :key=key>
										{{ key }} {{ value }}
									</div>
								</li>
							</ul>
							<ul v-if="selected==='attachments'">
								<li v-for="attach in attachments" :key=attach.authorAndIssueDate>
									<div v-for="(value, key) in attach" :key=key>
										{{ key }} {{ value }}
									</div>
								</li>
							</ul>
							<ul v-if="selected==='history'">
								<li v-for="hist in history" :key=hist.authorAndIssueDate>
									<div v-for="(value, key) in hist" :key=key>
										{{ key }} {{ value }}
									</div>
								</li>
							</ul>
						</div>
					</multipane>
				</div>
			</multipane>
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
						<b-form-radio-group v-model="insertOptionSelected" :options="getNodeTypeOptions()" stacked name="Select new node type"></b-form-radio-group>
					</b-form-group>
					<div class="mt-3">Selected: <strong>{{ prepareInsert() }}</strong></div>
				</b-modal>
			</div>
		</template>
	</div>
</template>

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

	export default {
		data() {
			return {
				nodeIsSelected: false,
				numberOfNodesSelected: 0,
				firstNodeSelected: null,
				removeTitle: '',
				newNodeLocation: {},
				insertOptionSelected: 1, //default to sibling node (no creation of descendant)
				newNode: {},
				lastEvent: 'No last event',
				selectedNodesTitle: '',

				treeNodes: this.$store.state.load.treeNodes,

				customToolbar: [
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

				tShirtSize: 'XL', // ToDo: make dynamic

				selected: 'comments',
				options: [{
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
				],
			}
		},

		computed: {
			...mapGetters({
				userName: 'getUser',
				currentDb: 'getCurrentDb',
				userRoles: 'getRoles',
				userProductsIds: 'getProductIds',
				currentProductId: 'getCurrentProductId',
				isServerAdmin: 'isServerAdmin',
				isAuthenticated: 'isAuthenticated',

				docId: 'getCurrentDocId',
				acceptanceCriteria: 'getCurrentDocAcceptanceCriteria',
				attachments: 'getCurrentDocAttachments',
				comments: 'getCurrentDocComments',
				description: 'getCurrentDocDescription',
				followers: 'getCurrentDocFollowers',
				history: 'getCurrentDocHistory',
				priority: 'getCurrentDocPriority',
				productId: 'getCurrentDocProductId',
				reqAreaId: 'getCurrentDocReqArea',
				spSize: 'getCurrentDocSpSize',
				itemState: 'getCurrentDocState',
				subType: 'getCurrentDocSubType',
				itemTitle: 'getCurrentDocTitle',
				tsSize: 'getCurrentDocTsSize',
				itemType: 'getCurrentDocType'
			}),
		},

		methods: {
			updateTitle() {
				const newTitle = document.getElementById("titleField")
				// update the tree
				const $slVueTree = this.$refs.slVueTree;
				const paths = $slVueTree.getSelected().map(node => node.path);
				$slVueTree.updateNode(paths[0], {
					title: newTitle.value,
				})
				// update current document
				const payload = {
					'newTitle': newTitle.value
				}
				this.$store.commit('setCurrentDocTitle', payload)
			},
			updateDescription() {
				const newDescription = document.getElementById("descriptionField").innerText
				console.log('newDescription = ' + newDescription)
				// update current document
				const payload = {
					'newDescription': newDescription
				}
				this.$store.commit('setCurrentDescription', payload)
			},
			updateAcceptanceCriteria() {
				const newAcceptanceCriteria = document.getElementById("acceptanceCriteriaField").innerText
				console.log('newAcceptanceCriteria = ' + newAcceptanceCriteria)
				// update current document
				const payload = {
					'newAcceptanceCriteria': newAcceptanceCriteria
				}
				this.$store.commit('setCurrentAcceptanceCriteria', payload)
			},

			/* mappings from config */
			getLevelText(level) {
				// note that in the tree model the first level is 1 (not zero)
				let treeLevel = level - 1
				if (treeLevel < 0 || treeLevel >= this.$store.state.load.config.itemType.length) {
					return 'Error: unknown level'
				}
				return this.$store.state.load.config.itemType[treeLevel]
			},
			getItemState(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.itemType.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.load.config.itemState[idx]
			},
			getTsSize(idx) {
				if (idx < 0 || idx >= this.$store.state.load.config.tsSize.length) {
					return 'Error: unknown T-shirt size'
				}
				return this.$store.state.load.config.tsSize(idx)
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
				this.numberOfNodesSelected = selNodes.length
				this.firstNodeSelected = selNodes[0]
				// read the document
				this.$store.dispatch('loadDoc', this.firstNodeSelected.data._id)
				this.selectedNodesTitle = this.itemTitleTrunc(60, selNodes.map(node => node.title).join(', '))
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

			calcDropLevel(position) {
				if (position.placement == 'before' || position.placement == 'after') {
					return position.node.level
				} else {
					// inside
					return position.node.level + 1
				}
			},

			/**
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
				let dropLevel = this.calcDropLevel(position)

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
			 * Calculate the priority as the average value of the predecessor and the successor.
			 * When the predecessor is the parent the predecessor priority is Maxint.
			 * When no successor exists the successor priority is 0.
			 * returns the calculated priority
			 */
			calcNewPriority(node) {
				const path = node.path
				const $slVueTree = this.$refs.slVueTree
				var predecessorPrio
				var successorPrio

				if (node.isFirstChild) {
					predecessorPrio = Number.MAX_SAFE_INTEGER
				} else {
					predecessorPrio = $slVueTree.getPrevNode(path).data.priority
				}

				if (node.isLastChild) {
					successorPrio = 0
				} else {
					successorPrio = $slVueTree.getNextNode(path).data.priority
				}
				console.log('calcNewPriority: for node.title ' + node.title + ' isFirstChild = ' + node.isFirstChild + ' isLastChild = ' + node.isLastChild +
					'\n prevnode = ' + $slVueTree.getPrevNode(path).title +
					'\n nextnode.title = ' + $slVueTree.getNextNode(path).title +
					'\n predecessorPrio = ' + predecessorPrio +
					'\n successorPrio = ' + successorPrio)
				return (predecessorPrio + successorPrio) / 2
			},

			/*
			 * updates the priority value in the tree and
			 */
			updatePriorityInTree(currentNode, newPriority) {
				const $slVueTree = this.$refs.slVueTree
				$slVueTree.updateNode(currentNode.path, {
					data: {
						priority: newPriority
					}
				})
			},

			/*
			 * updates the priority value in the document in the database
			 */
			updatePriorityInDb(newPriority) {
				// update current document
				const payload = {
					'priority': newPriority
				}
				this.$store.commit('setNewPriority', payload)
			},

			nodeDropped(draggingNodes, position) {
				let clickedLevel = draggingNodes[0].level
				let dropLevel = this.calcDropLevel(position)
				let levelChange = Math.abs(clickedLevel - dropLevel)
				const $slVueTree = this.$refs.slVueTree
				const selectedNodes = $slVueTree.getSelected()
				for (let i = 0; i < selectedNodes.length; i++) {
					if (levelChange === 0) {
						// for now the PBI level is the highest level (= lowest in hierarchy) and always a leaf
						if (dropLevel === 5) {
							$slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels are not a leaf
							$slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: false,
								isExpanded: false,
							})
						}
					} else {
						// the user dropped the node(s) on another level
						if (dropLevel === 5) {
							$slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels (= higher in the hiearchy) are not a leave
							$slVueTree.updateNode(selectedNodes[i].path, {
								isLeaf: false,
								isExpanded: false,
							})
						}
					}
					let newPriority = this.calcNewPriority(selectedNodes[i])
					this.updatePriorityInTree(selectedNodes[i], newPriority)
					this.updatePriorityInDb(newPriority)
				}
				if ((draggingNodes.length) === 1) {
					this.lastEvent = `Node: ${this.itemTitleTrunc(60, draggingNodes.map(node => node.title).join(', '))} is dropped ${position.placement} ${position.node.title}`
				} else {
					this.lastEvent = `Nodes: ${this.itemTitleTrunc(60, draggingNodes.map(node => node.title).join(', '))} are dropped ${position.placement} ${position.node.title}`
				}
				if (levelChange > 0) this.lastEvent = this.lastEvent + ' as ' + this.getLevelText(dropLevel)
			},

			countDescendants(path) {
				const $slVueTree = this.$refs.slVueTree
				let count = 0
				let doCount = false
				let initLevel = 0

				$slVueTree.traverse((node) => {
					if ($slVueTree.comparePaths(node.path, path) == 0) {
						initLevel = node.level
						doCount = true
					} else {
						if (node.level <= initLevel) return false

						if ($slVueTree.comparePaths(node.path, path) == 1) {
							if (doCount) {
								count++
							}
						}
					}
				});
				return count;
			},

			showRemoveModal(node, event) {
				event.preventDefault();
				// Node must be selected first && User cannot remove on the database level && Only one node can be selected
				if (this.nodeIsSelected && node.level > 1 && this.numberOfNodesSelected === 1) {
					this.removeTitle = `This ${this.getLevelText(node.level)} and ${this.countDescendants(node.path)} descendants will be removed`
					this.$refs.removeModalRef.show();
				}
			},

			doRemove() {
				const $slVueTree = this.$refs.slVueTree
				const selectedNodes = $slVueTree.getSelected()
				this.lastEvent = `The ${this.getLevelText(selectedNodes[0].level)} and ${this.countDescendants(selectedNodes[0].path)} descendants are removed`
				const paths = selectedNodes.map(node => node.path)
				$slVueTree.remove(paths)
				// After removal no node is selected
				this.nodeIsSelected = false
			},

			showInsertModal(node, event) {
				event.preventDefault();
				if (this.nodeIsSelected) {
					let clickedLevel = this.firstNodeSelected.level;
					if (clickedLevel === 5) {
						this.insertOptionSelected = 1; //Cannot create child below PBI
					}
					if (clickedLevel === 1) {
						this.insertOptionSelected = 2; //Cannot create a database here
					}
					this.$refs.insertModalRef.show();
				}
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
				var clickedLevel = this.firstNodeSelected.level;
				options[0].text = this.getLevelText(clickedLevel);
				options[1].text = this.getLevelText(clickedLevel + 1);
				// Disable the option to create a node below a PBI
				if (clickedLevel === 5) options[1].disabled = true;
				// Disable the option to create a new database
				if (clickedLevel === 1) options[0].disabled = true;
				return options
			},

			prepareInsert() {
				var clickedLevel = this.firstNodeSelected.level
				var insertLevel = clickedLevel
				if (this.insertOptionSelected === 1) {
					// New node is a sibling placed below (after) the selected node
					this.newNodeLocation = {
						node: this.firstNodeSelected,
						placement: 'after'
					}
					this.newNode = {
						title: 'New ' + this.getLevelText(insertLevel),
						isLeaf: (insertLevel < 5) ? false : true, // for now PBI's (level 5) have no children
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
						node: this.firstNodeSelected,
						placement: 'inside'
					}
					this.newNode = {
						title: 'New ' + this.getLevelText(insertLevel),
						isLeaf: (insertLevel < 5) ? false : true, // for now PBI's (level 5) have no children
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
				const $slVueTree = this.$refs.slVueTree;
				$slVueTree.insert(this.newNodeLocation, this.newNode)
				// restore default
				this.insertOptionSelected = 1
				// unselect the node that was clicked before the insert
				const paths = $slVueTree.getSelected().map(node => node.path);
				$slVueTree.updateNode(paths[0], {
					isSelected: false
				})
				// now the node is inserted get the full ISlTreeNode data and set priority
				const selectedNodes = $slVueTree.getSelected()
				const insertedNode = selectedNodes[0]
				let setPriority = this.calcNewPriority(insertedNode)
				$slVueTree.updateNode(insertedNode.path, {
					data: {
						priority: setPriority
					}
				})
				// TODO: create and save new document
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

	// Use deep selecor here and below. See https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors -->
	.horizontal-panes>>>.pane {
		text-align: left;
		padding: 5px;
		overflow: hidden;
		background: white;
	}

	.horizontal-panes>>>.pane~.pane {
		border-top: 1px solid #ccc;
	}

	// vertical panes
	.custom-resizer {
		width: 100%;
		height: 100%;
	}

	.custom-resizer>>>.pane {
		text-align: left;
		padding: 3px;
		overflow: hidden;
		background: #eee;
		border: 2px solid #ccc;
	}

	.custom-resizer>>>.pane~.pane {}

	.custom-resizer>>>.multipane-resizer {
		margin: 0;
		left: 0;
		position: relative;

		&:before {
			display: block;
			content: "";
			width: 3px;
			height: 40px;
			position: absolute;
			top: 50%;
			left: 50%;
			margin-top: -20px;
			margin-left: -1.5px;
			border-left: 1px solid #ccc;
			border-right: 1px solid #ccc;
		}

		/*
		&:hover {
			&:before {
				border-color: #999;
			}
		}
*/
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

</style>
