<template>
  <div>
    <div class="d-table w-100">
      <span class="d-table-cell tal">
        <h3 v-if="getCurrentItemLevel <= epicLevel">
          {{ getLevelText(getCurrentItemLevel) }} T-Shirt size:
          <input
            type="text"
            size="3"
            maxlength="3"
            id="tShirtSizeId"
            :value="getCurrentItemTsSize"
            @blur="updateTsSize()"
          />
        </h3>
        <h3
          v-if="getCurrentItemLevel === featureLevel || (getCurrentItemLevel === pbiLevel && $store.state.currentDoc.subtype !== 1)"
        >
          Story points:
          <input
            type="text"
            size="3"
            maxlength="3"
            id="storyPointsId"
            :value="$store.state.currentDoc.spsize"
            @blur="updateStoryPoints()"
          />
        </h3>
        <h3 v-if="getCurrentItemLevel === pbiLevel && $store.state.currentDoc.subtype === 1">
          Person hours:
          <input
            type="text"
            size="3"
            maxlength="3"
            id="personHoursId"
            :value="$store.state.currentDoc.spikepersonhours"
            @blur="updatePersonHours()"
          />
        </h3>
      </span>
      <span class="d-table-cell tac">
        <h3>{{ $store.state.load.currentProductTitle }}</h3>
      </span>
      <span class="d-table-cell tar">
        <h3>
          State:
          <b-dropdown id="dropdownMenuButton" right class="m-2 .btn.btn-secondary.dropdown-toggle">
            <template slot="button-content">{{ getItemStateText($store.state.currentDoc.state) }}</template>
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
        <h6
          v-if="$store.state.load.userAssignedProductIds.length==1"
        >Welcome {{ $store.state.user }}. Your current database is set to {{ $store.state.currentDb }}. You have {{ $store.state.load.userAssignedProductIds.length }} product.</h6>
        <h6
          v-if="$store.state.load.userAssignedProductIds.length >1"
        >Welcome {{ $store.state.user }}. Your current database is set to {{ $store.state.currentDb }}. You selected {{ $store.state.load.myProductSubscriptions.length }} from {{ $store.state.load.userAssignedProductIds.length }} products.</h6>
        <span
          class="square"
          v-bind:style="{'background-color': this.$store.state.sync.eventSyncColor}"
        >sync</span>
        <div
          class="last-event"
          v-bind:style="{'background-color': $store.state.eventBgColor}"
        >{{ this.$store.state.lastEvent }}</div>

        <!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
        <div class="tree-container" @mousedown.stop>
          <sl-vue-tree
            :value="$store.state.load.treeNodes"
            ref="slVueTree"
            :allow-multiselect="true"
            @select="nodeSelectedEvent"
            @beforedrop="beforeNodeDropped"
            @drop="nodeDropped"
            @toggle="nodeToggled"
            @nodecontextmenu="showContextMenu"
          >
            <template slot="title" slot-scope="{ node }">
              <span class="item-icon">
                <i class="colorSeaBlue" v-if="node.level == databaseLevel">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorBlue" v-if="node.level == productLevel">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorGreen" v-if="node.level == epicLevel">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorOrange" v-if="node.level == featureLevel">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorYellow" v-if="node.isLeaf && node.data.subtype == 0">
                  <font-awesome-icon icon="file" />
                </i>
                <i v-if="node.isLeaf && node.data.subtype == 1">
                  <font-awesome-icon icon="hourglass-start" />
                </i>
                <i class="colorRed" v-if="node.isLeaf && node.data.subtype == 2">
                  <font-awesome-icon icon="bug" />
                </i>
              </span>
              {{ node.title }} : {{ node.shortId }}
              <b-badge variant="light">{{ getItemStateText(node.data.state) }}</b-badge>
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

          </sl-vue-tree>
        </div>
      </div>

      <multipane-resizer></multipane-resizer>
      <div class="pane" :style="{ flexGrow: 1, minWidth: '30%', width: '50%', minHeight: '100%' }">
        <!-- inner horizontal panes -->
        <multipane class="horizontal-panes" layout="horizontal">
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <b-input
                class="d-table-cell"
                type="text"
                maxlength="60"
                id="titleField"
                :value="$store.state.currentDoc.title"
                @blur="updateTitle()"
              ></b-input>
              <div class="d-table-cell tac">
                Id = {{ $store.state.currentDoc.shortId }}
               </div>
              <div class="d-table-cell tar">
                <b-button variant="seablue" @click="subscribeClicked">{{ subsribeTitle }}</b-button>
              </div>
            </div>
          </div>
          <div
            v-if="getCurrentItemLevel==this.pbiLevel"
            class="pane"
            :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }"
          >
            <div class="d-table w-100">
              <p
                class="title is-6"
              >This item is of type '{{ this.getSubType($store.state.currentDoc.subtype) }}'. Change it here -></p>
              <div class="d-table-cell tar">
                <b-form-group>
                  <b-form-radio-group
                    v-model="selectedPbiType"
                    :options="getPbiOptions()"
                    plain
                    name="pbiOptions"
                  />
                </b-form-group>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Description</h5>
              <div class="d-table-cell tar">
                <p
                  class="title is-6"
                >Last update by {{ $store.state.currentDoc.history[0].by }} @ {{ new Date($store.state.currentDoc.history[0].timestamp).toString().substring(0, 33) }}</p>
              </div>
            </div>
          </div>
          <!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
          <div
            class="pane"
            :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }"
            @mousedown.stop
          >
            <vue-editor
              v-model="description"
              :editorToolbar="editorToolbar"
              id="descriptionField"
              @blur="updateDescription()"
            ></vue-editor>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
            <div>
              <h5 class="title is-6">Acceptance criteria</h5>
            </div>
          </div>
          <!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
          <div
            class="pane"
            :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }"
            @mousedown.stop
          >
            <vue-editor
              v-model="acceptanceCriteria"
              :editorToolbar="editorToolbar"
              id="acceptanceCriteriaField"
              @blur="updateAcceptance"
            ></vue-editor>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <div class="d-table-cell tal">
                <b-button variant="seablue" :pressed.sync="startEditor">Add {{ selectedForView }}</b-button>
              </div>
              <div class="d-table-cell tac">
                <b-form-group label="Select to see">
                  <b-form-radio-group
                    v-model="selectedForView"
                    :options="getViewOptions()"
                    plain
                    name="viewOptions"
                  />
                </b-form-group>
              </div>
              <div class="d-table-cell tar">
                <b-button
                  variant="seablue"
                  :pressed.sync="startFiltering"
                >Filter {{ selectedForView }}</b-button>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ flexGrow: 1 }">
            <ul v-if="selectedForView==='comments'">
              <li v-for="comment in getFilteredComments" :key="comment.timestamp">
                <div v-for="(value, key) in comment" :key="key">
                  <div v-html="prepCommentsText(key, value)"></div>
                </div>
              </li>
            </ul>
            <ul v-if="selectedForView==='attachments'">
              <li v-for="attach in $store.state.currentDoc.attachments" :key="attach.timestamp">
                <div v-for="(value, key) in attach" :key="key">{{ key }} {{ value }}</div>
              </li>
            </ul>
            <ul v-if="selectedForView==='history'">
              <li v-for="hist in getFilteredHistory" :key="hist.timestamp">
                <div v-for="(value, key) in hist" :key="key">
                  <div v-html="prepHistoryText(key, value)"></div>
                </div>
              </li>
            </ul>
          </div>
        </multipane>
      </div>
    </multipane>
    <!-- Modals -->
    <template>
      <b-modal
        ref="contextMenuRef"
        @ok="procSelected()"
        @cancel="doCancel"
        :title="contextNodeTitle"
      >
        <b-list-group>
          <b-list-group-item
            v-if="contextNodeLevel !== productLevel"
            button
            variant="dark"
            v-on:click="contextSelected = 0"
          >Insert a {{ contextNodeType }} below this node</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel < pbiLevel"
            button
            variant="dark"
            v-on:click="contextSelected = 1"
          >Insert a {{ contextChildType }} inside this {{ contextNodeType }}</b-list-group-item>
          <b-list-group-item
            v-if="!$store.state.moveOngoing && contextNodeLevel > productLevel"
            button
            variant="dark"
            v-on:click="contextSelected = 2"
          >Move this {{ contextNodeType }} to another product</b-list-group-item>
          <b-list-group-item
            v-if="$store.state.moveOngoing && moveSourceProductId !== $store.state.load.currentProductId"
            button
            variant="dark"
            v-on:click="contextSelected = 2"
          >Insert the moved item here</b-list-group-item>
          <b-list-group-item
            button
            variant="danger"
            v-on:click="contextSelected = 3"
          >Remove this {{ contextNodeType }} and {{ removeDescendantsCount }} descendants</b-list-group-item>
          <hr />
          <div class="d-block text-center">
            {{ showSelected() }}
            <div v-if="contextWarning" class="colorRed">{{ contextWarning }}</div>
          </div>
        </b-list-group>
      </b-modal>
    </template>
    <template>
      <b-modal size="lg" ref="commentsEditorRef" @ok="insertComment" title="Compose a comment">
        <b-form-group>
          <vue-editor v-model="newComment" :editorToolbar="editorToolbar" id="newComment"></vue-editor>
        </b-form-group>
      </b-modal>
    </template>
    <template>
      <b-modal
        size="lg"
        ref="historyEditorRef"
        @ok="insertHist"
        title="Comment on last history event"
      >
        <b-form-group>
          <vue-editor v-model="newHistory" :editorToolbar="editorToolbar" id="newHistory"></vue-editor>
        </b-form-group>
      </b-modal>
    </template>
    <template>
      <b-modal size="lg" ref="commentsFilterRef" @ok="filterComments" title="Filter comments">
        <b-form-input v-model="filterForCommentPrep" placeholder="Enter a text to filter on"></b-form-input>
      </b-modal>
    </template>
    <template>
      <b-modal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
        <b-form-input v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></b-form-input>
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
* productId: doc.productId,
* parentId: doc.parentId,
* _id: doc._id,
* shortId: doc.shortId,
* title: doc.title,
* isLeaf: (level == leafLevel) ? true : false, // for now PBI's have no children
* children: [],
* isExpanded: true || false, // initially the tree is expanded up to the feature level
* savedIsExpanded: isExpanded, // to restore the original view after applying a filter
* isSelectable: true,
* isSelected: true only if isSelectable || false
* isDraggable: true || false, // depending on the user roles
* doShow: true, // false if filtered out
* savedDoShow: doShow, // to restore the original view after applying a filter
*
* data: {
* ....priority: doc.priority,
* ....state: doc.state,
* ....subtype: doc.subtype,
* ....lastChange: Date.now(), // set on load, updated on change of title, priority, productId, parentId, state, subtype(3x), tsSize, acceptance and description
* ....sessionId: rootState.sessionId,
* ....distributeEvent: true | false
* }
*/

<script src="./product.js"></script>

<!-- see https://stackoverflow.com/questions/50763152/rendering-custom-styles-in-bootstrap-vue -->
<style>
	#dropdownMenuButton>button {
  width: 100%;
}

#dropdownMenuButton__BV_toggle_ {
  width: 100%;
}

.btn.btn-secondary.dropdown-toggle {
  background-color: #408fae;

  color: white;

  border-radius: 0.25rem;
}
</style>

<style lang="scss" scoped>
@import "../../css/sl-vue-tree-dark.css";

// horizontal panes
.horizontal-panes {
  width: 100%;
  border: 1px solid #ccc;
}

.horizontal-panes > .pane {
  text-align: left;
  padding: 5px;
  overflow: hidden;
  background: white;
}

.horizontal-panes > .pane ~ .pane {
  border-top: 1px solid #ccc;
}

// vertical panes
.custom-resizer {
  width: 100%;
  height: 100%;
}

.custom-resizer > .pane {
  text-align: left;
  padding: 2px;
  overflow: hidden;
  background: #eee;
  border: 1px solid #ccc;
}

.custom-resizer > .multipane-resizer {
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
  background-color: #408fae;
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
.square {
  float: right;
  padding: 5px;
  margin: 5px;
}

.colorRed {
  color: red;
}

.colorSeaBlue {
  color: #408fae;
}

.colorBlue {
  color: #0099ff;
}

.colorGreen {
  color: #00ffcc;
}

.colorOrange {
  color: #ff9900;
}

.colorYellow {
  color: #ffff00;
}

.btn-seablue {
  background-color: #408fae;
  color: white;
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
