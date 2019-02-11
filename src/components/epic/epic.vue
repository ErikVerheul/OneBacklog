<template>
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
				<div>
					<h1>The tree view comes here!</h1>
					<TreeView
						:model="model"
						category="children"
						:selection="selection"
						:onSelect="onSelect"
						:display="display"

        />
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
</template>

<script>
	import {
		Multipane,
		MultipaneResizer
	} from 'vue-multipane'

	import {
		VueEditor
	} from 'vue2-editor'

	import {
		TreeView
	} from '@bosket/vue'

	import {
		string
	} from '@bosket/tools'

	import {
		dragndrop
	} from '@bosket/core'

	export default {
//		props: ["selection"],
		model: {
        prop: "selection",
        event: "selectionChange"
    },
		created() {
        this.dragImage = new Image()
        this.dragImage.src = "../assets/drag-image.png"
    },
		data() {
			return {
				databaseName: '-name-',
				productTitle: 'The product title',

				selection: [],

				model: [
						{label: "Database-1: click to see the products", children: [
								{label: "Product-1", children: [
									{label: "Epic-1", children: [
										{label: "Feature-1", children: [
											{label: "PBI-1"},
											{label: "PBI-2"},
											{label: "PBI-3"},
											{label: "PBI-4"},
											{label: "PBI-5"},
										]},
										{label: "Feature-2"},
										{label: "Feature-3"},
									]},
									{label: "Epic-2"},
								]},
							{label: "Product-2" }
						]},

					{label: "Database-2: click to see the products", children: [
								{label: "Product-1", children: [
									{label: "Epic-1", children: [
										{label: "Feature-1", children: [
											{label: "PBI-1"},
											{label: "PBI-2"},
											{label: "PBI-3"},
											{label: "PBI-4"},
											{label: "PBI-5"},
										]},
										{label: "Feature-2"},
										{label: "Feature-3"},
									]},
									{label: "Epic-2"},
								]},
							{label: "Product-2" }
						]},


						{ label: "I am an asynchronous node, click me and wait one second.", children: () =>
								new Promise(resolve =>
										setTimeout(() =>
												resolve([{ label: "It took exactly one second to fetch me the first time, I am cached afterwards." }]), 1000))
						}
				],
				// Property of the model containing children
				category: "items",
				// On selection, update the parent selection array
				onSelect: items => {
				this.selection = items;
				this.$emit("selectionChange", items)
				},
				// Custom display (with an anchor tag)
				display: item => <a>{ item.label }</a>,
				// Alphabetical sort
				sort: (a, b) => a.label.localeCompare(b.label),
				// Search by regex
				search: input => i => string(i.label).contains(input),
				strategies: {
				// Select on click
				click: ["select"],
				// Use keyboard modifiers
				selection: ["modifiers"],
				// Use the opener to control element folding
				fold: ["opener-control"]
				},
				// Custom css root class name
				css: { TreeView: "TreeView" },
				// Transitions
				transition: {
				attrs: { appear: true },
				props: { name: "TreeViewTransition" }
				},
				dragndrop: {
				// Use the "selection" drag and drop preset
				...dragndrop.selection(() => this.model, m => { this.model = m }),
				// Add a custom image on drag
				drag: (_, event) => {
				event.dataTransfer.setDragImage(this.dragImage, 0, 0)
				event.dataTransfer.setData("application/json", JSON.stringify(this.selection))
				},
				// Drop only on categories or root (excluding asynchronous promises)
				droppable: _ => !_ || _.items && _.items instanceof Array
				},

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

//		methods: {
//        onSelect(newSelection) {
//            this.selection = newSelection
//        },
//        display(item) {
//            return item.label
//        }
//    },
		components: {
			Multipane,
			MultipaneResizer,
			VueEditor,
			TreeView,
		},
	}

</script>

<style lang="scss" scoped>
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

	.tar {
		text-align: right;
	}

	.tac {
		text-align: center;
	}

	.tal {
		text-align: left;
	}
</style>


// TreeView stuff
<style lang="css" scoped>
	/* Search bar */

.TreeView>input[type="search"] {
    width: 100%;
    background: rgba(0, 0, 0, 0.05);
    height: 3em;
    border-width: 2px;
    transition: border 0.5s;
}

/* Elements */

.TreeView {
    box-shadow: 0px 0px 10px #DADADA;
    white-space: nowrap;
}

.TreeView ul {
    list-style: none;
}

.TreeView li {
    min-width: 100px;
    transition: all 0.25s ease-in-out;
}

.TreeView ul li a {
    color: #222;
}

.TreeView ul li>.item>a {
    display: inline-block;
    vertical-align: middle;
    width: calc(100% - 55px);
    margin-right: 30px;
    padding: 10px 5px;
    text-decoration: none;
    transition: all 0.25s;
}

.TreeView ul li:not(.disabled) {
    cursor: pointer;
}

.TreeView ul li.selected>.item>a {
    color: crimson;
}

.TreeView ul li.selected>.item>a:hover {
    color: #aaa;
}

.TreeView ul li:not(.disabled)>.item>a:hover {
    color: #e26f6f;
}


/* Root elements */

.TreeView ul.depth-0 {
    padding: 20px;
    margin: 0;
    background-color: rgba(255, 255, 255, 0.4);
    user-select: none;
    transition: all 0.25s;
}


/* Categories : Nodes with children */

.TreeView li.category>.item {
    display: block;
    margin-bottom: 5px;
    transition: all 0.25s ease-in-out;
}

.TreeView li.category:not(.folded)>.item {
    border-bottom: 1px solid crimson;
}


/* Category opener */

.TreeView .opener {
    display: inline-block;
    vertical-align: middle;
    font-size: 20px;
    cursor: pointer;
}

.TreeView .opener::after {
    content: '+';
    display: block;
    transition: all 0.25s;
    font-family: monospace;
}

.TreeView li.category.async>.item>.opener::after {
    content: '!';
}

.TreeView .opener:hover {
    color: #e26f6f;
}

.TreeView li.category:not(.folded)>.item>.opener::after {
    color: crimson;
    transform: rotate(45deg);
}

@keyframes spin {
    from {
        transform: rotate(0deg)
    }
    to {
        transform: rotate(360deg)
    }
}

.TreeView li.category.loading>.item>.opener::after {
    animation: spin 1s infinite;
}


/* Animations on fold / unfold */

.TreeViewTransition-enter, .TreeViewTransition-leave-to {
    opacity: 0;
    transform: translateX(-50px);
}

.TreeViewTransition-enter-active, .TreeViewTransition-leave-active {
    transition: all .3s ease-in-out;
}


/* Drag'n'drop */

.TreeView li.dragover, .TreeView ul.dragover {
    box-shadow: 0px 0px 5px #CCC
}

.TreeView ul.dragover {
    background-color: rgba(200, 200, 200, 0.3);
}

.TreeView li.dragover {
    background-color: rgba(100, 100, 100, 0.05);
    padding: 0px 5px;
}

.TreeView li.dragover>span.item {
    border-color: transparent;
}

.TreeView li.nodrop {
    box-shadow: 0px 0px 5px crimson;
    background-color: rgba(255, 20, 60, 0.1);
    padding: 0px 5px;
}

</style>
