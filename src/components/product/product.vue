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
							<h3>Product T-Shirt size:
								<input type="text" size="3" maxlength="3" id="productTitle" v-model.lazy="tShirtSize" />
							</h3>
						</div>
					</div>
				</div>
			</div>

			<!-- vertical panes -->
			<multipane class="custom-resizer" layout="vertical">
				<div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
					<h2>Sl-vue-tree - tree view</h2>

					<div class='last-event'>
						Last event: {{ lastEvent }}
					</div>

					<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
					<div class="tree-container" @mousedown.stop>
						<sl-vue-tree v-model="nodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">

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
								<b-input class="d-table-cell" type="text" maxlength="10" id="productTitle" v-model.lazy="productTitle">
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
									<h5 class="title is-6">Created by {{ createdBy }} at {{ creationDate }} </h5>
								</div>
							</div>
						</div>
						<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
							<vue-editor v-model.lazy="description" :editorToolbar="customToolbar"></vue-editor>
						</div>
						<multipane-resizer></multipane-resizer>
						<div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
							<div>
								<h5 class="title is-6">Acceptance criteria</h5>
							</div>
						</div>
						<div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
							<vue-editor v-model.lazy="acceptanceCriteria" :editorToolbar="customToolbar"></vue-editor>
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
				productTitle: 'The product title',
				nodeIsSelected: false,
				numberOfNodesSelected: 0,
				firstNodeSelected: null,
				removeTitle: '',
				newNodeLocation: {},
				insertOptionSelected: 1, //default to sibling node (no creation of descendant)
				newNode: {},
				lastEvent: 'No last event',
				selectedNodesTitle: '',

				nodes: [{
					"title": "Database-1",
					"isSelected": false,
					"isExpanded": true,
					"children": [{
							"title": "Product-1",
							"isExpanded": true,
							"children": [{
									"title": "Epic-A",
									"children": [{
										"title": "Feature-A1",
										"children": [{
												"title": "PBI-A1-1",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-A1-2",
												"children": [],
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": false
											},
											{
												"title": "PBI-A1-3",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-A1-4",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											}
										],
										"isSelected": false,
										"isExpanded": true
									}],
									"isSelected": false
								},
								{
									"title": "Epic-B",
									"isExpanded": true,
									"isSelected": false,
									"children": [{
										"title": "Feature-B1",
										"children": [{
												"title": "PBI-B1-1",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-2",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-3",
												"children": [],
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": true
											},
											{
												"title": "PBI-B1-4",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-5",
												"children": [],
												"isLeaf": true,
												"isSelected": false
											}
										],
										"isSelected": false
									}]
								}
							],
							"isSelected": false
						},
						{
							"title": "Product-2",
							"isExpanded": true,
							"children": [{
									"title": "Epic-C",
									"children": [{
										"title": "Feature-C1",
										"children": [{
												"title": "PBI-C1-1",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-C1-2",
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": false
											},
											{
												"title": "PBI-C1-3",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-C1-4",
												"isLeaf": true,
												"isSelected": false
											}
										],
										"isSelected": false,
										"isExpanded": true
									}],
									"isSelected": false
								},
								{
									"title": "Epic-D",
									"isExpanded": true,
									"isSelected": false,
									"children": [{
										"title": "Feature-D1",
										"children": [{
												"title": "PBI-D1-1",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-D1-2",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-D1-3",
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": true
											},
											{
												"title": "PBI-D1-4",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-D1-5",
												"isLeaf": true,
												"isSelected": false
											}
										],
										"isSelected": false
									}]
								}
							],
							"isSelected": false
						},
					]
				}, ],

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
				description: 'Your product business case go\'s here',
				acceptanceCriteria: 'Please include your acceptance criteria here',
				createdBy: 'Erik Verheul',
				creationDate: '8 January 2019',
				tShirtSize: 'XL',
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
				comments: [{
						'Author and issue date:': "Erik Verheul @ Thu Jan 10 2019 17:26:48 GMT+0100",
						'Comment:': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

					{
						'Author and issue date:': "Erik Verheul @ Thu Jan 11 2019 17:26:48 GMT+0100",
						'Comment:': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

					{
						'Author and issue date:': "Erik Verheul @ Thu Jan 12 2019 17:26:48 GMT+0100",
						'Comment:': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

					{
						'Author and issue date:': "Erik Verheul @ Thu Jan 13 2019 17:26:48 GMT+0100",
						'Comment:': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

					{
						'Author and issue date:': "Erik Verheul @ Thu Jan 14 2019 17:26:48 GMT+0100",
						'Comment:': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

				],
				attachments: [{
					'Author and issue date:': "Erik Verheul @ Wed Jan 30 2019 15:26:48 GMT-0400",
					'link:': "file location"
				}],
				history: [{
					'Author and issue date:': "Erik Verheul @ Wed Feb 26 2019 09:53:48 GMT+0100",
					'Change:': "Description of PBI with id PBI-A1-1 changed from 'Setup database.' to 'Setup database and provide test content'"
				}],
			}
		},

		mounted() {
			// expose instance to the global namespace
			window.slVueTree = this.$refs.slVueTree;
		},

		methods: {
			itemTitleTrunc60(title) {
				if (title.length <= 60) return title;
				return title.substring(0, 56) + '...';
			},

			nodeSelected(nodes) {
				this.nodeIsSelected = true;
				this.numberOfNodesSelected = nodes.length;
				this.firstNodeSelected = nodes[0];
				this.selectedNodesTitle = this.itemTitleTrunc60(nodes.map(node => node.title).join(', '));
				this.lastEvent = `Selected node: ${this.selectedNodesTitle}`;
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

			nodeDropped(draggingNodes, position) {
				let clickedLevel = draggingNodes[0].level
				let dropLevel = this.calcDropLevel(position)
				let levelChange = Math.abs(clickedLevel - dropLevel)
				const $slVueTree = this.$refs.slVueTree;
				const paths = $slVueTree.getSelected().map(node => node.path);
				for (let i = 0; i < paths.length; i++) {
					if (levelChange === 0) {
						// for now the PBI level is the highest level and always a leaf
						if (dropLevel === 5) {
							$slVueTree.updateNode(paths[i], {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels are not a leave
							$slVueTree.updateNode(paths[i], {
								isLeaf: false,
								isExpanded: false,
							})
						}
					} else {
						// warn the user when he dropped the node(s) on another level
						if (dropLevel === 5) {
							$slVueTree.updateNode(paths[i], {
								isLeaf: true,
								isExpanded: false,
							})
						} else {
							// lower levels are not a leave
							$slVueTree.updateNode(paths[i], {
								isLeaf: false,
								isExpanded: false,
							})
						}
					}
				}
				if ((draggingNodes.length) === 1) {
					this.lastEvent = `Node: ${this.itemTitleTrunc60(draggingNodes.map(node => node.title).join(', '))} is dropped ${position.placement} ${position.node.title}`
				} else {
					this.lastEvent = `Nodes: ${this.itemTitleTrunc60(draggingNodes.map(node => node.title).join(', '))} are dropped ${position.placement} ${position.node.title}`
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

			getLevelText(level) {
				switch (level) {
					case 1:
						return 'Database'
					case 2:
						return 'Product'
					case 3:
						return 'Epic'
					case 4:
						return 'Feature'
					case 5:
						return 'Product backlog item'
					default:
						return 'The task level is not supported'
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
				$slVueTree.insert(this.newNodeLocation, this.newNode);
				this.insertOptionSelected = 1; //Restore default
				// Unselect the node that was clicked before the insert
				const paths = $slVueTree.getSelected().map(node => node.path);
				$slVueTree.updateNode(paths[0], {
					isSelected: false
				})
			},

			doCancelInsert() {
				this.insertOptionSelected = 1; //Restore default
			}
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
