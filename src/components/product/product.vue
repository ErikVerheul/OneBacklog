<template>
	<div>
		<div class="d-table w-100">
			<span class="d-table-cell tal">
				<h3 v-if="getCurrentItemLevel <= epicLevel">{{ getLevelText(getCurrentItemLevel) }} T-Shirt size:
					<input type="text" size="3" maxlength="3" id="tShirtSizeId" :value="getCurrentItemTsSize" @blur="updateTsSize()" />
				</h3>
				<h3 v-if="getCurrentItemLevel == featureLevel || (getCurrentItemLevel == pbiLevel && getCurrentItemSubType != 1)">Story points:
					<input type="text" size="3" maxlength="3" id="storyPointsId" :value="getCurrentItemSpSize" @blur="updateStoryPoints()" />
				</h3>
				<h3 v-if="getCurrentItemLevel == pbiLevel && getCurrentItemSubType == 1">Person hours:
					<input type="text" size="3" maxlength="3" id="personHoursId" :value="getCurrentPersonHours" @blur="updatePersonHours()" />
				</h3>
			</span>
			<span class="d-table-cell tac">
				<h3>{{ getCurrentProductTitle }}</h3>
			</span>
			<span class="d-table-cell tar">
				<h3>State:
					<b-dropdown id="ddown-right" right class="m-2">
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
				<h4>Your current database is set to {{ getCurrentDb }}. You have {{ getUserAssignedProductIds.length }} product(s)</h4>

				<div class='last-event' v-bind:style="{'background-color': eventBgColor}">
					{{ this.$store.state.load.lastEvent }}
				</div>

				<!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
				<div class="tree-container" @mousedown.stop>
					<sl-vue-tree v-model="$store.state.load.treeNodes" ref="slVueTree" :allow-multiselect="true" @select="nodeSelectedEvent" @beforedrop="beforeNodeDropped" @drop="nodeDropped" @toggle="nodeToggled" @nodedblclick="showInsertModal" @nodecontextmenu="showRemoveModal">
						<template slot="title" slot-scope="{ node }">
							<span class="item-icon">
								<i v-if="node.isLeaf && node.data.subtype == 0">
									<font-awesome-icon icon="file" />
								</i>
								<i v-if="node.isLeaf && node.data.subtype == 1">
									<font-awesome-icon icon="hourglass-start" />
								</i>
								<i class="colorRed" v-if="node.isLeaf && node.data.subtype == 2">
									<font-awesome-icon icon="bug" />
								</i>
								<i v-if="!node.isLeaf">
									<font-awesome-icon icon="folder" />
								</i>
							</span>
							{{ node.title }}; _id={{ node.data._id }}
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
								<b-button @click="subscribeClicked">{{ subsribeTitle }}</b-button>
							</div>
						</div>
					</div>
					<div v-if="getCurrentItemLevel==this.pbiLevel" class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
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
								<p class="title is-6">Last update by {{ getCurrentItemHistory[0].by }} @ {{ new Date(getCurrentItemHistory[0].timestamp).toString().substring(0, 33) }} </p>
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
								<b-button :pressed.sync="startEditor">Add {{ selectedForView }}</b-button>
							</div>
							<div class="d-table-cell tac">
								<b-form-group label="Select to see">
									<b-form-radio-group v-model="selectedForView" :options="getViewOptions()" plain name="viewOptions" />
								</b-form-group>
							</div>
							<div class="d-table-cell tar">
								<b-button :pressed.sync="startFiltering">Filter {{ selectedForView }}</b-button>
							</div>
						</div>
					</div>
					<div class="pane" :style="{ flexGrow: 1 }">
						<ul v-if="selectedForView==='comments'">
							<li v-for="comment in getFilteredComments" :key=comment.timestamp>
								<div v-for="(value, key) in comment" :key=key>
									<div v-html="prepCommentsText(key, value)"></div>
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
							<li v-for="hist in getFilteredHistory" :key="hist.timestamp">
								<div v-for="(value, key) in hist" :key=key>
									<div v-html="prepHistoryText(key, value)"></div>
								</div>
							</li>
						</ul>
					</div>
				</multipane>
			</div>
		</multipane>
		<!-- Modals -->
		<template v-if="this.nodeIsSelected">
			<b-modal ref='removeModalRef' hide-footer :title=this.removeTitle>
				<div class="d-block text-center">
					<h3>This operation cannot be undone!</h3>
				</div>
				<b-button class="mt-3" variant="outline-danger" block @click="doRemove">Remove now!</b-button>
			</b-modal>
		</template>
		<template v-if="this.nodeIsSelected">
			<b-modal ref='insertModalRef' @ok="doInsert" @cancel="doCancelInsert" title='Insert a new item to your backlog'>
				<b-form-group label="Select what node type to insert:">
					<b-form-radio-group v-model="insertOptionSelected" :options="getNodeTypeOptions()" stacked name="Select new node type" />
				</b-form-group>
				<div class="mt-3">Selected: <strong>{{ prepareInsert() }}</strong></div>
			</b-modal>
		</template>
		<template>
			<b-modal size="lg" ref='commentsEditorRef' @ok="insertComment" title='Compose a comment'>
				<b-form-group>
					<vue-editor v-model="newComment" :editorToolbar="editorToolbar" id="newComment"></vue-editor>
				</b-form-group>
			</b-modal>
		</template>
		<template>
			<b-modal size="lg" ref='historyEditorRef' @ok="insertHist" title='Comment on last history event'>
				<b-form-group>
					<vue-editor v-model="newHistory" :editorToolbar="editorToolbar" id="newHistory"></vue-editor>
				</b-form-group>
			</b-modal>
		</template>
		<template>
			<b-modal size="lg" ref='commentsFilterRef' @ok="filterComments" title='Filter comments'>
				<b-form-input v-model=filterForCommentPrep placeholder="Enter a text to filter on"></b-form-input>
			</b-modal>
		</template>
		<template>
			<b-modal size="lg" ref='historyFilterRef' @ok="filterHistory" title='Filter history'>
				<b-form-input v-model=filterForHistoryPrep placeholder="Enter a text to filter on"></b-form-input>
			</b-modal>
		</template>
	</div>
</template>

/*
* Definitions: items are PBI's or Product Backlog Items which are stored in the database as documents and presented on screen as nodes in a tree.
*
* NOTE on itemType and level numbering with the current config definition
*
* level ...............in database level ....... in tree
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
* isLeaf: (level == leafLevel) ? true : false, // for now PBI's have no children
* children: [],
* isExpanded: true || false, // initially the tree is expanded up to the feature level
* isDraggable: true || false, // depending on the user roles
* isSelectable: true,
* isSelected: true || false
* data: {
* ...._id: doc._id,
* ....priority: doc.priority,
* ....productId: doc.productId,
* ....parentId: doc.parentId,
* ....subtype: doc.subtype,
* ....sessionId: rootState.sessionId,
* ....distributeEvent: true | false
* }
*/

<script src="./product.js"></script>

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
	.colorRed {
		color: red;
	}

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
