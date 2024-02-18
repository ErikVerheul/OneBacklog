// note about the QuillEditor: the @blur event does not work as expected. See https://github.com/quilljs/quill/issues/1680
<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <BNavbarNav>
        <BNavForm>
          <BButton class="group-height" id="tooltip-undo" v-show="store.state.changeHistory.length > 0" @click="onUndoEvent()">Undo</BButton>
          <BTooltip target="tooltip-undo" triggers="hover">
            {{ undoTitle }}
          </BTooltip>
          <div class="divider" />
          <BButton class="filter-button" v-show="!isRootSelected" @click="onSetMyFilters()">{{getFilterButtonText()}}</BButton>
          <div class="divider" />
          <BInputGroup class="id-sizing">
            <BFormInput id="findItemOnId" v-model="store.state.itemId" @change="doFindItemOnId" placeholder="Select on (short) Id"></BFormInput>
            <template #append>
              <!--note: type="reset" removes the input of both BFormInputs -->
              <BButton @click="resetFindId" variant="primary" type="reset" :disabled="store.state.resetSearchOnTitle !== null">x</BButton>
            </template>
          </BInputGroup>
          <div class="divider" />
          <BInputGroup class="group-height">
            <BFormInput id="searchInput" v-model="store.state.keyword" @change="doSeachOnTitle" placeholder="Search in titles"></BFormInput>
            <template #append>
              <!--note: type="reset" removes the input of both BFormInputs -->
              <BButton @click="resetSearchTitles" variant="primary" type="reset" :disabled="store.state.resetSearchOnId !== null">x</BButton>
            </template>
          </BInputGroup>
        </BNavForm>
      </BNavbarNav>
    </app-header>
    <div>
      <BContainer class="top-row">
        <BRow>
          <template v-if="getCurrentItemLevel <= LEVEL.EPIC">
            <BCol cols="1">
              <label for="tShirtSizeId">T-Shirt size</label>
            </BCol>
            <BCol cols="1">
              <BFormInput id="tShirtSizeId" :modelValue="getCurrentItemTsSize" @input="prepUpdate(store.state.currentDoc)" @blur="updateTsSize()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <template v-if="getCurrentItemLevel === LEVEL.FEATURE || (getCurrentItemLevel === LEVEL.PBI && store.state.currentDoc.subtype !== spikeSubtype)">
            <BCol cols="1">
              <label for="storyPointsId">Story points</label>
            </BCol>
            <BCol cols="1">
              <BFormInput id="storyPointsId" :modelValue="store.state.currentDoc.spsize" @input="prepUpdate(store.state.currentDoc)" @blur="updateStoryPoints()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <template v-if="getCurrentItemLevel === LEVEL.PBI && store.state.currentDoc.subtype === spikeSubtype">
            <BCol cols="1">
              <label for="personHoursId">Person hrs</label>
            </BCol>
            <BCol cols="1">
              <BFormInput id="personHoursId" :modelValue="store.state.currentDoc.spikepersonhours" @input="prepUpdate(store.state.currentDoc)" @blur="updatePersonHours()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <BCol v-if="getCurrentItemLevel === LEVEL.TASK" cols="4"></BCol>
          <BCol cols="5">
            <h3 v-if="store.state.userData.myOptions.proUser === 'true'">{{ store.state.currentProductTitle }} [Details]</h3>
            <h3 v-else>{{ store.state.currentProductTitle }}</h3>
          </BCol>
          <BCol cols="3">
            <h3 v-if="store.state.currentDoc._id !== 'root'" align="right">
              State:
              <BDropdown v-if="store.state.currentDoc.level < LEVEL.TASK" right :text=getItemStateText(store.state.currentDoc.state)>
                <BDropdownItem @click="onStateChange(STATE.NEW)">{{ getItemStateText(STATE.NEW) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.READY)">{{ getItemStateText(STATE.READY) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.INPROGRESS)">{{ getItemStateText(STATE.INPROGRESS) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.DONE)">{{ getItemStateText(STATE.DONE) }}</BDropdownItem>
                <BDropdownDivider></BDropdownDivider>
                <BDropdownItem @click="onStateChange(STATE.ON_HOLD)">{{ getItemStateText(STATE.ON_HOLD) }}</BDropdownItem>
              </BDropdown>
              <BDropdown v-else right :text=getItemStateText(store.state.currentDoc.state)>
                <BDropdownItem @click="onStateChange(STATE.TODO)">{{ getTaskStateText(STATE.TODO) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.INPROGRESS)">{{ getTaskStateText(STATE.INPROGRESS) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.TESTREVIEW)">{{ getTaskStateText(STATE.TESTREVIEW) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.DONE)">{{ getTaskStateText(STATE.DONE) }}</BDropdownItem>
                <BDropdownDivider></BDropdownDivider>
                <BDropdownItem @click="onStateChange(STATE.ON_HOLD)">{{ getTaskStateText(STATE.ON_HOLD) }}</BDropdownItem>
              </BDropdown>
            </h3>
          </BCol>
        </BRow>
      </BContainer>
    </div>
    <!-- vertical panes -->
    <multipane class="custom-resizer" layout="vertical">
      <div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
        <h6>{{ welcomeMessage }}</h6>
        <div class="square" :style="{ 'background-color': squareColor }">{{ squareText }}</div>
        <BButton block class="last-event" v-b-popover.hover.bottomright="'Click to see the event history'" @click="showMoreMessages" :style="{ 'background-color': getLastEventColor }">
          {{ getLastEventTxt }} </BButton>

        <div class="tree-container">
          <sl-vue-tree tabindex="0" :modelValue="store.state.treeNodes" @nodes-are-selected="onNodesSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped">
            <template v-slot:title="{ node }">
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
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorYellow" v-if="node.level == LEVEL.PBI && node.data.subtype == userStorySubtype">
                  <font-awesome-icon icon="folder" />
                </i>
                <i v-if="node.level == LEVEL.PBI && node.data.subtype == spikeSubtype">
                  <font-awesome-icon icon="hourglass-start" />
                </i>
                <i class="colorRed" v-if="node.level == LEVEL.PBI && node.data.subtype == defectSubtype">
                  <font-awesome-icon icon="bug" />
                </i>
                <i class="colorWhite" v-if="node.isLeaf">
                  <font-awesome-icon icon="file" />
                </i>
              </span>
              {{ patchTitle(node) }}
              <span v-if="!node.isSelectable" class="item-icon">
                <i class="colorRed">
                  <font-awesome-icon icon="ban" />
                </i>
              </span>
              <BBadge v-if="hasInconsistentState(node)" variant="danger">{{ getNodeStateText(node) + '?' }}</BBadge>
              <BBadge v-else-if="hasNewState(node)" variant="info">{{ getNodeStateText(node) }}</BBadge>
              <BBadge v-else-if="doShowState(node)" variant="light">{{ getNodeStateText(node) }}</BBadge>
              <BBadge v-if="hasNodeMoved(node)" variant="info">Moved</BBadge>
              <BBadge v-if="hasContentChanged(node) || hasCommentToHistory(node) || hasOtherUpdate(node)" variant="info">See history</BBadge>
              <BBadge v-if="hasNewComment(node)" variant="info">See comments</BBadge>
              <BBadge v-if="isAttachmentAdded(node)" variant="info">See attachments</BBadge>
              <BBadge v-if="inActiveSprint(node)" variant="info">In {{ getActiveSprintText(node) }} sprint</BBadge>
            </template>

            <template v-slot:toggle="{ node }">
              <span>
                <i v-if="node.isExpanded">
                  <font-awesome-icon icon="chevron-down" />
                </i>
                <i v-else>
                  <font-awesome-icon icon="chevron-right" />
                </i>
              </span>
            </template>

            <template v-slot:dependencyviolation="{ node }">
              <template v-if="store.state.userData.myOptions.proUser === 'true' && node.tmp.markedViolations">
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
            </template>

            <template v-slot:sidebar="{ node }">
              <template v-if="store.state.userData.myOptions.proUser === 'true' && store.state.colorMapper && node.level > LEVEL.PRODUCT && node.data.reqarea">
                <p class="rectangle" :style="{ 'background-color': store.state.colorMapper[node.data.reqarea].reqAreaItemColor }"></p>
              </template>
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
              <BFormInput class="d-table-cell" id="titleField" :modelValue="store.state.currentDoc.title" @input="prepUpdate(store.state.currentDoc)" @blur="updateTitle()"></BFormInput>
              <div class="d-table-cell tac">Short Id = {{ store.state.currentDoc._id.slice(-5) }}</div>
              <div class="d-table-cell tar">
                <BButton variant="primary" @click="subscribeClicked">{{ subsribeTitle }}</BButton>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
            <div class="d-table w-100">
              <p class="title is-6"> {{ getItemInfo() }}</p>
              <div v-if="getCurrentItemLevel == LEVEL.PBI" class="d-table-cell tar">
                <BFormGroup>
                  <BFormRadioGroup v-model="selectedPbiType" :options="getPbiOptions()" name="pbiOptions" />
                </BFormGroup>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Description</h5>
              <div v-if="store.state.currentDoc.history[0]" class="d-table-cell tar">
                <p class="title is-6"> Last update by {{ store.state.currentDoc.history[0].by }} @ {{ new Date(store.state.currentDoc.history[0].timestamp).toString().substring(0, 33) }}</p>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
            <QuillEditor v-model:content="description" contentType="html" :toolbar="editorToolbar" @update:content="initNewDescription" @blur="updateDescription()"></QuillEditor>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ height: '45px', top: '5px' }">
            <div>
              <h5 class="title is-6">Acceptance criteria</h5>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
            <QuillEditor v-model:content="acceptanceCriteria" contentType="html" :toolbar="editorToolbar" @update:content="initNewAcceptance" @blur="updateAcceptance()"></QuillEditor>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ height: '75px', top: '5px' }">
            <div class="d-table w-100">
              <div class="d-table-cell tal">
                <BButton variant="primary" @click="doAddition = true">Add {{ store.state.selectedForView }}</BButton>
              </div>
              <div class="d-table-cell tac">
                <label>Select to see</label>
                <BFormRadioGroup v-model="store.state.selectedForView" :options="getViewOptions()" name="viewOptions" />
              </div>
              <div class="d-table-cell tar">
                <BButton v-if="store.state.selectedForView === 'comments' && !isCommentsFilterActive || store.state.selectedForView === 'history' && !isHistoryFilterActive" variant="primary"
                  @click="startFiltering = true">Filter {{ store.state.selectedForView }}</BButton>
                <BButton v-else variant="primary" @click="stopFiltering">Clear {{ store.state.selectedForView }} filter</BButton>
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

    <filters></filters>
    <!-- ToSprint modal -->
    <toSprint></toSprint>
    <!-- Context modal -->
    <DcontextMenu></DcontextMenu>

    <BModal v-model="warnForMoveToOtherLevel" @ok="continueMove" header-bg-variant="warning" title="Move to another level?">
      <p v-if="movePreflightData.targetLevel < movePreflightData.sourceLevel">
        You are about to promote this {{ getLevelText(movePreflightData.sourceLevel) }} to a {{ getLevelText(movePreflightData.targetLevel) }}
      </p>
      <p v-else>
        You are about to demote this {{ getLevelText(movePreflightData.sourceLevel) }} to a {{ getLevelText(movePreflightData.targetLevel) }}
      </p>
      <p>Press OK to continue</p>
      <p class="note">Note: Change your options settings to prevent this warning</p>
    </BModal>

    <BModal size="lg" ref="commentsEditorRef" @ok="insertComment" title="Compose a comment">
      <BFormGroup>
        <QuillEditor v-model:content=newComment contentType="html" :toolbar="editorToolbar" id="newComment"></QuillEditor>
      </BFormGroup>
    </BModal>

    <BModal size="lg" ref="historyEditorRef" @ok="insertHist" title="Comment on last history event">
      <BFormGroup>
        <QuillEditor v-model:content=newHistory contentType="html" :toolbar="editorToolbar" id="newHistory"></QuillEditor>
      </BFormGroup>
    </BModal>

    <BModal size="lg" ref="commentsFilterRef" @ok="filterComments" title="Filter comments">
      <BFormInput v-model="filterForCommentPrep" placeholder="Enter a text to filter on"></BFormInput>
    </BModal>

    <BModal size="lg" ref="uploadRef" :ok-disabled="uploadTooLarge || invalidFileName" @ok="uploadAttachment" title="Upload an attachment">
      <BFormFile v-model="fileInfo" :state="Boolean(fileInfo)" placeholder="Choose a file..."></BFormFile>
      <div v-if="fileInfo !== null" class="mt-3">File type: {{ fileInfo.type }}, size: {{ fileInfo.size }} bytes</div>
      <div v-if="uploadTooLarge" class="mt-3 colorRed">Cannot upload files this size</div>
    </BModal>

    <BModal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <BFormInput v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></BFormInput>
    </BModal>

    <BModal size="lg" ref="historyEventRef" title="Event history" ok-only>
      <div v-if="store.state.eventList.length > 0">
        <div v-for="item in store.state.eventList" :key="item.eventKey">
          <p class="event-list" :style="{ 'background-color': item.color }">{{ item.time }} {{ item.severity }}: {{ item.txt }}</p>
        </div>
      </div>
    </BModal>

  </div>
</template>

<script src="./d_product_view.js"></script>

<style lang="scss" scoped>
/* horizontal panes */
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

/* vertical panes */
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
    border-left: 1px solid #408fae;
    border-right: 1px solid #408fae;
  }

  &:hover {
    &:before {
      border-color: #999;
    }
  }
}

/* other stuff */
h3 {
  font-size:1.4em;
}

label {
  font-size:1.4em;
  font-weight: bolder;
}

.top-row {
  margin-top: 10px;
  max-width: 100%;
}

.filter-button {
  width: 15em;
  height: 45px;
}

.id-sizing {
  width: 25em;
  height: 45px;
}

.group-height {
  height: 45px;
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

/* tree stuff */
.last-event {
  width: 100%;
  text-align: left;
  color: white;
  padding: 9px;
  padding-right: 55px;
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

/* my stuff */
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
  width: 25px;
  height: 25px;
}

.violation-column {
  display: inline-block;
  width: 40px;
}

.divider {
  width: 15px;
}
</style>
