<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto">
        <b-nav-form>
          <b-button id="tooltip-undo" class="m-1" v-show="$store.state.changeHistory.length > 0" @click="onUndoEvent()">Undo</b-button>
          <b-tooltip target="tooltip-undo" triggers="hover">
            {{ undoTitle }}
          </b-tooltip>
          <b-button class="m-1" v-show="!isRootSelected && !isReqAreaItemSelected" @click="onSetMyFilters()">{{ getFilterButtonText }}</b-button>
          <div class="divider" />
          <b-input-group>
            <b-form-input id="findItemOnId" v-model="$store.state.itemId" placeholder="Select on (short) Id"></b-form-input>
            <b-input-group-append>
              <b-button @click="resetFindId" variant="primary" type="reset">x</b-button>
            </b-input-group-append>
          </b-input-group>
          <div class="divider" />
          <b-input-group v-show="!isRootSelected && !isReqAreaItemSelected">
            <b-form-input id="searchInput" v-model="$store.state.keyword" placeholder="Search in titles"></b-form-input>
            <b-input-group-append>
              <b-button @click="resetSearchTitles" variant="primary" type="reset">x</b-button>
            </b-input-group-append>
          </b-input-group>
        </b-nav-form>
      </b-navbar-nav>
    </app-header>
    <div>
      <b-container>
        <b-row>
          <b-col cols="4">
            <h3 v-if="getCurrentItemLevel <= LEVEL.EPIC">
              {{ getLevelText(getCurrentItemLevel) }} T-Shirt size:
              <input type="text" size="3" maxlength="3" id="tShirtSizeId" :value="getCurrentItemTsSize" @blur="updateTsSize()" />
            </h3>
            <h3 v-if="getCurrentItemLevel === LEVEL.FEATURE || (getCurrentItemLevel === LEVEL.PBI && $store.state.currentDoc.subtype !== spikeSubtype)">
              Story points:
              <input type="text" size="3" maxlength="3" id="storyPointsId" :value="$store.state.currentDoc.spsize" @blur="updateStoryPoints()" />
            </h3>
            <h3 v-if="getCurrentItemLevel === LEVEL.PBI && $store.state.currentDoc.subtype === spikeSubtype">
              Person hours:
              <input type="text" size="3" maxlength="3" id="personHoursId" :value="$store.state.currentDoc.spikepersonhours" @blur="updatePersonHours()" />
            </h3>
          </b-col>
          <b-col cols="5">
            <h3 align="center">{{ $store.state.currentProductTitle }} [Overview]</h3>
          </b-col>
          <b-col cols="3">
            <h3 align="right">
              State:
              <b-dropdown right class="m-1 .btn.btn-secondary.dropdown-toggle">
                <template slot="button-content">{{ getItemStateText($store.state.currentDoc.state) }}</template>
                <b-dropdown-item @click="onStateChange(STATE.NEW)">{{ getItemStateText(STATE.NEW) }}</b-dropdown-item>
                <b-dropdown-item @click="onStateChange(STATE.READY)">{{ getItemStateText(STATE.READY) }}</b-dropdown-item>
                <b-dropdown-item @click="onStateChange(STATE.INPROGRESS)">{{ getItemStateText(STATE.INPROGRESS) }}</b-dropdown-item>
                <b-dropdown-item @click="onStateChange(STATE.DONE)">{{ getItemStateText(STATE.DONE) }}</b-dropdown-item>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item @click="onStateChange(STATE.ON_HOLD)">{{ getItemStateText(STATE.ON_HOLD) }}</b-dropdown-item>
              </b-dropdown>
            </h3>
          </b-col>
        </b-row>
      </b-container>
    </div>
    <!-- vertical panes -->
    <multipane class="custom-resizer" layout="vertical">
      <div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
        <h6>{{ welcomeMessage }}</h6>
        <div class="square" :style="{'background-color': squareColor}">{{ squareText }}</div>
        <b-button block class="last-event" v-b-popover.hover.bottomright="'Click to see the event history'" @click="showMoreMessages()" :style="{'background-color': getLastEventColor}">
          {{ getLastEventTxt }} </b-button>

        <!-- Suppress bug with @mousedown.stop. See https://github.com/yansern/vue-multipane/issues/19 -->
        <div class="tree-container" @mousedown.stop>
          <sl-vue-tree :value="$store.state.treeNodes" ref="slVueTree" :allow-multiselect="true" @nodes-are-selected="onNodesSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped">
            <template slot="title" slot-scope="{ node }">
              <span class="item-icon">
                <i class="colorSeaBlue" v-if="node.level == LEVEL.DATABASE">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorBlue" v-if="node.level == LEVEL.PRODUCT">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorGreen" v-if="node.level == LEVEL.EPIC">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorOrange" v-if="node.level == LEVEL.FEATURE">
                  <font-awesome-icon icon="file" />
                </i>
              </span>
              {{ patchTitle(node) }}
							<span v-if="!node.isSelectable" class="item-icon">
                <i class="colorRed">
                  <font-awesome-icon icon="ban" />
                </i>
              </span>
              <b-badge v-if="node.tmp.inconsistentState" variant="danger">{{ getNodeStateText(node) + '?' }}</b-badge>
              <b-badge v-else-if="hasNewState(node)" variant="info">{{ getNodeStateText(node) }}</b-badge>
              <b-badge v-else variant="light">{{ getNodeStateText(node) }}</b-badge>
              <b-badge v-if="hasNodeMoved(node)" variant="info">Moved</b-badge>
              <b-badge v-if="hasContentChanged(node) || hasCommentToHistory(node) || hasOtherUpdate(node)" variant="info">See history</b-badge>
              <b-badge v-if="hasNewComment(node)" variant="info">See comments</b-badge>
              <b-badge v-if="isAttachmentAdded(node)" variant="info">See attachments</b-badge>
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

            <template v-if="node.tmp.markedViolations" slot="dependency-violation" slot-scope="{ node }">
              <div v-if="rowLength(node.tmp.markedViolations) === 1">
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[0] }}</span>
              </div>
              <div v-else-if="rowLength(node.tmp.markedViolations) === 2">
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[0] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[1] }}</span>
              </div>
              <div v-else-if="rowLength(node.tmp.markedViolations) === 3">
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[0] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[1] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[2] }}</span>
              </div>
              <div v-else-if="rowLength(node.tmp.markedViolations) === 4">
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[0] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[1] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[2] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[3] }}</span>
              </div>
              <div v-else>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[0] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[1] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[2] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[3] }}</span>
                <span class="violation-column">{{ createRow(node.tmp.markedViolations)[4] }}</span>
              </div>
            </template>

            <template slot="sidebar" slot-scope="{ node }">
              <template v-if="node.productId === MISC.AREA_PRODUCTID">
                <p v-if="node._id !== MISC.AREA_PRODUCTID" class="rectangle" :style="{'background-color': node.data.reqAreaItemColor}"></p>
              </template>
              <p v-else-if="$store.state.colorMapper && node.level > LEVEL.PRODUCT">
                <b-button v-if="node.data.reqarea && $store.state.colorMapper[node.data.reqarea]" class="btn-seablue-dynamic"
                  :style="{'background-color': $store.state.colorMapper[node.data.reqarea].reqAreaItemColor}" @click="setReqArea(node.data.reqarea)" squared size="sm">Change
                </b-button>
                <b-button v-else @click="setReqArea(null)" squared variant="seablueLight" size="sm">Set</b-button>
              </p>
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
              <b-input class="d-table-cell" type="text" maxlength="60" id="titleField" :value="$store.state.currentDoc.title" @blur="updateTitle()"></b-input>
              <div v-if="!isReqAreaItem" class="d-table-cell tac">Short Id = {{ $store.state.currentDoc._id.slice(-5) }}</div>
              <div class="d-table-cell tar">
                <b-button variant="primary" @click="subscribeClicked">{{ subsribeTitle }}</b-button>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '40px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <p v-if="!isReqAreaItem" class="title is-6">{{ getItemInfo() }}</p>
              <!-- do not use parenthesis with @change: see https://stackoverflow.com/questions/53106723/bootstrap-vue-select-sending-old-value -->
              <span v-else-if="!isReqAreaTopLevel">
                <b-form-group>
                  Select a display color for this requirement area:
                  <b-form-radio-group v-model="selReqAreaColor" @change="updateColor" value-field="hexCode" text-field="color" :options="colorOptions" plain />
                </b-form-group>
              </span>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Description</h5>
              <div class="d-table-cell tar">
                <p class="title is-6"> Last update by {{ $store.state.currentDoc.history[0].by }} @ {{ new Date($store.state.currentDoc.history[0].timestamp).toString().substring(0, 33) }}</p>
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
            <vue-editor v-model="acceptanceCriteria" :editorToolbar="editorToolbar" id="acceptanceCriteriaField" @blur="updateAcceptance()"></vue-editor>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <div class="d-table-cell tal">
                <b-button variant="primary" :pressed.sync="doAddition">Add {{ $store.state.selectedForView }}</b-button>
              </div>
              <div class="d-table-cell tac">
                <b-form-group label="Select to see">
                  <b-form-radio-group v-model="$store.state.selectedForView" :options="getViewOptions()" plain name="viewOptions" />
                </b-form-group>
              </div>
              <div class="d-table-cell tar">
                <b-button v-if="$store.state.selectedForView === 'comments' && !isCommentsFilterActive || $store.state.selectedForView === 'history' && !isHistoryFilterActive" variant="primary"
                  :pressed.sync="startFiltering">Filter {{ $store.state.selectedForView }}</b-button>
                <b-button v-else variant="primary" @click="stopFiltering">Clear {{ $store.state.selectedForView }} filter</b-button>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ flexGrow: 1 }">
            <!-- comments, attachments, history listings -->
            <listings></listings>
          </div>
        </multipane>
      </div>
    </multipane>
    <!-- Context modal -->
    <CcontextMenu></CcontextMenu>

    <b-modal v-model="warnForMoveToOtherLevel" @ok="continueMove" header-bg-variant="warning" title="Move to another level?">
      <p v-if="movePreflightData.targetLevel < movePreflightData.sourceLevel">
        You are about to promote this {{ getLevelText(movePreflightData.sourceLevel) }} to a {{ getLevelText(movePreflightData.targetLevel) }}
      </p>
      <p v-else>
        You are about to demote this {{ getLevelText(movePreflightData.sourceLevel) }} to a {{ getLevelText(movePreflightData.targetLevel) }}
      </p>
      <p>Press OK to continue</p>
      <p class="note">Note: Change your options settings to prevent this warning</p>
    </b-modal>

    <!-- color select -->
    <b-modal size="lg" v-model="colorSelectShow" @ok="setUserColor(userReqAreaItemcolor)" title="Select a color">
      <h4>Enter a color in hex format eg. #567cd6</h4>
      <b-form-input v-model="userReqAreaItemcolor" :state="colorState"></b-form-input>
    </b-modal>
    <!-- set req area -->
    <b-modal size="lg" v-model="setReqAreaShow" @ok="doSetReqArea">
      <template v-slot:modal-title>
        {{ getLastSelectedNode.title }}
      </template>
      <b-form-group label="Select the requirement area this item belongs to:">
        <b-form-radio-group v-model="selReqAreaId" :options="this.$store.state.reqAreaOptions" value-field="id" text-field="title" stacked></b-form-radio-group>
      </b-form-group>
    </b-modal>
    <!-- filter modals -->
    <filters></filters>
    <b-modal size="lg" ref="commentsEditorRef" @ok="insertComment" title="Compose a comment">
      <b-form-group>
        <vue-editor v-model="newComment" :editorToolbar="editorToolbar" id="newComment"></vue-editor>
      </b-form-group>
    </b-modal>

    <b-modal size="lg" ref="historyEditorRef" @ok="insertHist" title="Comment on last history event">
      <b-form-group>
        <vue-editor v-model="newHistory" :editorToolbar="editorToolbar" id="newHistory"></vue-editor>
      </b-form-group>
    </b-modal>

    <b-modal size="lg" ref="commentsFilterRef" @ok="filterComments" title="Filter comments">
      <b-form-input v-model="filterForCommentPrep" placeholder="Enter a text to filter on"></b-form-input>
    </b-modal>

    <b-modal size="lg" ref="uploadRef" :ok-disabled="uploadToLarge || invalidFileName" @ok="uploadAttachment" title="Upload an attachment">
      <b-form-file v-model="fileInfo" :state="Boolean(fileInfo)" placeholder="Choose a file..."></b-form-file>
      <div v-if="fileInfo !== null" class="mt-3">File type: {{ fileInfo.type }}, size: {{ fileInfo.size }} bytes</div>
      <div v-if="uploadToLarge" class="mt-3 colorRed">Cannot upload files this size</div>
    </b-modal>

    <b-modal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <b-form-input v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></b-form-input>
    </b-modal>

    <b-modal size="lg" ref="historyEventRef" title="Event history" ok-only>
      <div v-if="$store.state.eventList.length > 0">
        <div v-for="item in $store.state.eventList" :key="item.eventKey">
          <p class="event-list" :style="{'background-color': item.color}">{{ item.time }} {{ item.severity }}: {{ item.txt }}</p>
        </div>
      </div>
    </b-modal>

  </div>
</template>

<script src="./c_product_view.js"></script>

<style lang="scss" scoped>
@import "../../../css/sl-vue-tree-dark.css";

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
.container {
  margin-top: 10px;
  max-width: 100%;
}

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

.event-list {
  color: white;
  padding: 10px;
  border-radius: 2px;
}

//tree stuff
.last-event {
  text-align: left;
  color: white;
  padding: 9px;
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

//my stuff
h3 {
	height: 45px;
}

.note {
	background: #eee;
}

.square {
  position: absolute;
  right: 3px;
  padding: 5px;
  margin: 5px;
}

.rectangle {
  width: 71px;
  height: 25px;
}

.violation-column {
  text-indent: -60%;
  display: inline-block;
  width: 40px;
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

.divider {
  width: 15px;
  height: auto;
  display: inline-block;
}
</style>
