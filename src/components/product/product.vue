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
						<h1>Database {{ databaseName }}</h1>
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
						<sl-vue-tree v-model="nodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelected" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">

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
						</div>
					</multipane>
				</div>
			</multipane>
		</multipane>
		<template>
			<div>
				<b-modal ref='removeModalRef' hide-footer :title=this.removeTitle>
					<div class="d-block text-center">
						<h3>This operation cannot be undone!</h3>
					</div>
					<b-button class="mt-3" variant="outline-danger" block @click="hideRemoveModal">Remove now!</b-button>
				</b-modal>
			</div>
		</template>
		<template>
			<div>
				<b-modal ref='insertModalRef' @ok="hideInsertModal">
					<b-form-group label="Select what node type to insert:">
						<b-form-radio-group v-model="nodeTypeSelected" :options="getNodeTypeOptions()" stacked name="Select new node type"></b-form-radio-group>
					</b-form-group>
					<div class="mt-3">Selected: <strong>{{ getNodeTypeSelectedText() }}</strong></div>
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
				databaseName: '-name-',
				productTitle: 'The product title',
				nodeIsSelected: false,
				allNodesSelected: null,
				firstNodeSelected: null,
				removeTitle: '',
				newNodeLocation: {},
				nodeTypeSelected: 1, //default to sibling node (not descendant)
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
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-A1-2",
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": false
											},
											{
												"title": "PBI-A1-3",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-A1-4",
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
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-2",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-3",
												"isLeaf": true,
												"data": {
													"visible": true
												},
												"isSelected": true
											},
											{
												"title": "PBI-B1-4",
												"isLeaf": true,
												"isSelected": false
											},
											{
												"title": "PBI-B1-5",
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

					{
						'Author and issue date:': "Erik Verheul @ Thu Jan 15 2019 17:26:48 GMT+0100",
						'Comment:': "[LAST ELEMENT IN ARRAY] Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
					},

				],
				attachments: [{
					'Author and issue date:': "Erik Verheul @ Wed Jan 30 2019 15:26:48 GMT-0400",
					'link:': "file location"
				}],
			}
		},

		mounted() {
			// expose instance to the global namespace
			window.slVueTree = this.$refs.slVueTree;
		},

		methods: {
			nodeSelected(nodes) {
				this.nodeIsSelected = true;
				this.selectedNodesTitle = nodes.map(node => node.title).join(', ');
				this.lastEvent = `Select nodes: ${this.selectedNodesTitle}`;
				this.allNodesSelected = nodes;
				this.firstNodeSelected = nodes[0];
			},

			nodeToggled(node) {
				this.lastEvent = `Node ${node.title} is ${ node.isExpanded ? 'collapsed' : 'expanded'}`;
			},

			nodeDropped(nodes, position) {
				this.lastEvent = `Nodes: ${nodes.map(node => node.title).join(', ')} are dropped ${position.placement} ${position.node.title}`;
			},

			showRemoveModal(node, event) {
				event.preventDefault();
				if (this.nodeIsSelected) {
					this.removeTitle = this.allNodesSelected.length > 1 ? this.allNodesSelected.length + ' nodes will be removed' : 'One node will be removed';
					this.$refs.removeModalRef.show();
				}
			},

			hideRemoveModal() {
				this.$refs.removeModalRef.hide();
				this.nodeIsSelected = false;
				this.lastEvent = this.allNodesSelected.length > 1 ? 'Nodes are removed' : 'Node is removed'
				const $slVueTree = this.$refs.slVueTree;
				const paths = $slVueTree.getSelected().map(node => node.path);
				$slVueTree.remove(paths);
			},

			showInsertModal(node, event) {
				event.preventDefault();
				var currentLevel = this.firstNodeSelected.level;
				if (currentLevel === 5) {
					this.nodeTypeSelected = 1; //Cannot create child from PBI
				}
				this.$refs.insertModalRef.show();
			},

			hideInsertModal() {
				this.$refs.removeModalRef.hide();
				this.lastEvent = 'Node will be inserted';
				const $slVueTree = this.$refs.slVueTree;
				$slVueTree.insert(this.newNodeLocation, this.newNode);
				this.nodeTypeSelected = 1;
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
				var options = [{
						text: 'Option 1',
						value: 'first'
					},
					{
						text: 'Option 2',
						value: 'second',
						disabled: false
					}
				];
				if (this.firstNodeSelected != null) {
					var currentLevel = this.firstNodeSelected.level;
					options[0].text = this.getLevelText(currentLevel);
					options[0].value = 1;
					options[1].text = this.getLevelText(currentLevel + 1);
					options[1].value = 2;
					if (currentLevel === 5) options[1].disabled = true;
				}
				return options
			},

			getNodeTypeSelectedText() {
				if (this.firstNodeSelected != null) {
					var currentLevel = this.firstNodeSelected.level
					if (this.nodeTypeSelected === 1) {
						this.newNodeLocation = {
							node: this.firstNodeSelected,
							placement: 'after'
						}
						this.newNode = {
							title: 'New ' + this.getLevelText(currentLevel),
							isLeaf: (currentLevel < 4) ? false : true, // for now PBI's have no children,
							children: [],
							isExpanded: false,
							isdraggable: true,
							isSelectable: true
						}
						return "Insert " + this.getLevelText(currentLevel) + " below the selected node"
					}
					if (this.nodeTypeSelected === 2) {
						this.newNodeLocation = {
							node: this.firstNodeSelected,
							placement: 'inside'
						}
						this.newNode = {
							title: 'New ' + this.getLevelText(currentLevel + 1),
							isLeaf: (currentLevel < 4) ? false : true, // for now PBI's have no children,
							children: [],
							isExpanded: false,
							isdraggable: true,
							isSelectable: true
						}
						return "Insert " + this.getLevelText(currentLevel + 1) + " as a child node"
					}
				}
				return ''
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
	body {
		background: #050d12;
		font-family: Arial;
		color: rgba(255, 255, 255, 0.5);
	}

	.contextmenu {
		position: absolute;
		background-color: white;
		color: black;
		border-radius: 2px;
		cursor: pointer;
	}

	.contextmenu>div {
		padding: 10px;
	}

	.contextmenu>div:hover {
		background-color: rgba(100, 100, 255, 0.5);
	}

	.last-event {
		color: white;
		background-color: rgba(100, 100, 255, 0.5);
		padding: 10px;
		border-radius: 2px;
	}

	.tree-container {
		flex-grow: 1;
	}

	.sl-vue-tree.sl-vue-tree-root {
		flex-grow: 1;
		overflow-x: hidden;
		overflow-y: auto;
		height: 100%;
	}

	.item-icon {
		display: inline-block;
		text-align: left;
		width: 20px;
	}

</style>
