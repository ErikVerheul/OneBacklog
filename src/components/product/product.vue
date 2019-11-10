<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto">
        <b-button
          class="m-1"
          v-show="$store.state.removeHistory.length > 0 && !$store.state.update.busyRemoving"
          @click="onUndoRemoveEvent()"
        >Undo remove</b-button>
        <b-button
          class="m-1"
          @click="onSetMyFilters()"
        >{{ $store.state.filterText }}</b-button>
        <b-nav-form>
          <b-form-input
            id="selectOnId"
            v-model="shortId"
            class="m-1"
            placeholder="Find on Id"
          />
          <b-form-input
            id="searchInput"
            v-model="$store.state.keyword"
            class="m-1"
            placeholder="Search in titles"
          />
        </b-nav-form>
      </b-navbar-nav>
    </app-header>
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
          v-if="getCurrentItemLevel === featureLevel || (getCurrentItemLevel === pbiLevel && $store.state.currentDoc.subtype !== spikeSubtype)"
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
        <h3 v-if="getCurrentItemLevel === pbiLevel && $store.state.currentDoc.subtype === spikeSubtype">
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
        <h6>{{ welcomeMessage }}</h6>
        <span class="square" v-bind:style="{'background-color': squareColor}">{{ squareText }}</span>
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
                <i class="colorYellow" v-if="node.isLeaf && node.data.subtype == userStorySubtype">
                  <font-awesome-icon icon="file" />
                </i>
                <i v-if="node.isLeaf && node.data.subtype == spikeSubtype">
                  <font-awesome-icon icon="hourglass-start" />
                </i>
                <i class="colorRed" v-if="node.isLeaf && node.data.subtype == defectSubtype">
                  <font-awesome-icon icon="bug" />
                </i>
              </span>
              {{ node.title }}
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
              <div class="d-table-cell tac">Id = {{ $store.state.currentDoc.shortId }}</div>
              <div class="d-table-cell tar">
                <b-button variant="seablue" @click="subscribeClicked">{{ subsribeTitle }}</b-button>
              </div>
            </div>
          </div>
          <div
            class="pane"
            :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }"
          >
            <div class="d-table w-100">
              <p
                class="title is-6"
              >This item is owned by team '{{ $store.state.currentDoc.team }}'</p>
              <div v-if="getCurrentItemLevel==this.pbiLevel" class="d-table-cell tar">
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
    <!-- context modals -->
    <context></context>

    <b-modal size="lg" ref="myFilters" @ok="onApplyMyFilters" title="View, set and/or save your filters on this view">
      <b-container align-v="true">
        <b-container fluid>
          <b-row class="my-1">
            <b-col sm="12">
              <b-form-checkbox v-model="filterOnTeams" value="yes">Filter on team(s)</b-form-checkbox>
              <div v-if="filterOnTeams === 'yes'" class="indent20">
                <b-form-group>
                  <b-form-checkbox-group
                    v-model="selectedTeams" :options="teamOptions">
                  </b-form-checkbox-group>
                </b-form-group>
              </div>
              <hr>
            </b-col>
            <b-col sm="12">
              <b-form-checkbox v-model="filterTreeDepth" value="yes">Filter on tree depth</b-form-checkbox>
              <div v-if="filterTreeDepth === 'yes'" class="indent20">
                <b-form-group>
                  <b-form-radio v-model="selectedTreeDepth" value="3">Up to epic level</b-form-radio>
                  <b-form-radio v-model="selectedTreeDepth" value="4">Up to feature level</b-form-radio>
                  <b-form-radio v-model="selectedTreeDepth" value="5">Up to PBI level</b-form-radio>
                </b-form-group>
              </div>
              <hr>
            </b-col>

            <b-col sm="12">
              <b-form-checkbox v-model="filterOnState" value="yes">Filter on PBI state</b-form-checkbox>
              <div v-if="filterOnState === 'yes'" class="indent20">
                <b-form-group>
                  <b-form-checkbox-group
                    v-model="selectedStates" :options="stateOptions">
                  </b-form-checkbox-group>
                </b-form-group>
              </div>
              <hr>
            </b-col>

            <b-col sm="12">
              <b-form-checkbox v-model="filterOnTime" value="yes">Filter on changes in time</b-form-checkbox>
              <div v-if="filterOnTime === 'yes'" class="indent20">
                <b-form-group>
                  <b-form-radio v-model="selectedTime" value="10">Changes last 10 min. </b-form-radio>
                  <b-form-radio v-model="selectedTime" value="60">Changes last hour</b-form-radio>
                  <b-form-radio v-model="selectedTime" value="1440">Changes last 24 hours </b-form-radio>
                  <b-form-radio v-model="selectedTime" value="0">A period in days</b-form-radio>
                </b-form-group>
                <div v-if="selectedTime === '0'">
                  <b-col sm="3">
                    <label>From (inclusive):</label>
                  </b-col>
                  <b-col sm="9">
                    <b-form-input v-model="fromDate" type="date"></b-form-input>
                  </b-col>
                  <b-col sm="3">
                    <label>To:</label>
                  </b-col>
                  <b-col sm="9">
                    <b-form-input v-model="toDate" type="date"></b-form-input>
                  </b-col>
                </div>
              </div>
              <hr>
            </b-col>
            <!--b-col sm="12">
              <b-button
                class="m-1"
                @click="onSaveFilters()"
              >Save this filter</b-button-->
            </b-col>
          </b-row>
        </b-container>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="otherPeriodRef" @ok="filterSince(0)" title="Enter a period">
      <b-container align-v="true">
        <b-container fluid>
          <b-row class="my-1">
            <b-col sm="3">
              <label>From (inclusive):</label>
            </b-col>
            <b-col sm="9">
              <b-form-input v-model="fromDate" type="date"></b-form-input>
            </b-col>
            <b-col sm="3">
              <label>To:</label>
            </b-col>
            <b-col sm="9">
              <b-form-input v-model="toDate" type="date"></b-form-input>
            </b-col>
          </b-row>
        </b-container>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="commentsEditorRef" @ok="insertComment" title="Compose a comment">
      <b-form-group>
        <vue-editor v-model="newComment" :editorToolbar="editorToolbar" id="newComment"></vue-editor>
      </b-form-group>
    </b-modal>

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

    <b-modal size="lg" ref="commentsFilterRef" @ok="filterComments" title="Filter comments">
      <b-form-input v-model="filterForCommentPrep" placeholder="Enter a text to filter on"></b-form-input>
    </b-modal>

    <b-modal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <b-form-input v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></b-form-input>
    </b-modal>

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
* path, // the access path in the tree model
* pathStr: JSON.stringify(path),
* ind, // the index in the children array
* level: path.length,
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
* ....team: doc.team, // the team membership of the user who updated the state the last time
* ....subtype: doc.subtype,
* ....lastChange: Date.now(), // set on load, updated on change of title, priority, productId, parentId, state, subtype(3x), tsSize, acceptance and description
* ....sessionId: rootState.userData.sessionId,
* ....distributeEvent: true | false
* }
*/

<script src="./product.js"></script>

<!-- see https://stackoverflow.com/questions/50763152/rendering-custom-styles-in-bootstrap-vue -->
<style>
#dropdownMenuButton > button {
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

.indent20 {
  padding-left: 20px;
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
