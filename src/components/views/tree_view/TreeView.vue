// note about the QuillyEditor: the @blur event does not work as expected. See https://github.com/quilljs/quill/issues/1680
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
          <BButton class="filter-button" v-show="!isRootSelected" @click="onSetMyFilters()">{{ getFilterButtonText() }}</BButton>
          <div class="divider" />
          <BInputGroup class="id-sizing">
            <BFormInput id="findItemOnId" v-model="store.state.filterSelectSearch.itemId" @keydown.enter="doFindItemOnId(store.state.filterSelectSearch.itemId)"
              placeholder="Select on (short) Id">
            </BFormInput>
            <template #append>
              <BButton @click="resetFindId" variant="primary" type="reset">x</BButton>
            </template>
          </BInputGroup>
          <div class="divider" />
          <BInputGroup class="group-height">
            <BFormInput id="searchInput" v-model="store.state.filterSelectSearch.keyword" @keydown.enter="doSeachOnTitle" placeholder="Search in titles">
            </BFormInput>
            <template #append>
              <BButton @click="resetSearchTitles" variant="primary" type="reset">x</BButton>
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
              <BFormInput id="tShirtSizeId" :modelValue="getCurrentItemTsSize" @update:model-value="prepUpdate(store.state.currentDoc)"
                @blur="updateTsSize()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <template v-else-if="getCurrentItemLevel === LEVEL.FEATURE || (getCurrentItemLevel === LEVEL.US && store.state.currentDoc.subtype !== spikeSubtype)">
            <BCol cols="1">
              <label for="storyPointsId">Story points</label>
            </BCol>
            <BCol cols="1">
              <BFormInput id="storyPointsId" :modelValue="store.state.currentDoc.spsize" @update:model-value="prepUpdate(store.state.currentDoc)"
                @blur="updateStoryPoints()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <template v-else-if="getCurrentItemLevel === LEVEL.US && store.state.currentDoc.subtype === spikeSubtype">
            <BCol cols="1">
              <label for="personHoursId">Person hrs</label>
            </BCol>
            <BCol cols="1">
              <BFormInput id="personHoursId" :modelValue="store.state.currentDoc.spikepersonhours" @update:model-value="prepUpdate(store.state.currentDoc)"
                @blur="updatePersonHours()" />
            </BCol>
            <BCol cols="2"></BCol>
          </template>
          <BCol v-if="getCurrentItemLevel === LEVEL.TASK" cols="4"></BCol>
          <BCol cols="4" class="text-center">
            <h3>{{ store.state.currentProductTitle }}</h3>
          </BCol>
          <template
            v-if="store.state.currentDoc._id !== 'root' && store.state.currentDoc._id !== MISC.AREA_PRODUCTID && store.state.currentDoc.parentId !== MISC.AREA_PRODUCTID">
            <BCol cols="2"></BCol>
            <BCol cols="1">
              <h3 align="right">State:</h3>
            </BCol>
            <BCol cols="1">
              <h3 align="right">
                <BDropdown v-if="store.state.currentDoc.level < LEVEL.TASK" right :text=getItemStateText(store.state.currentDoc.state)>
                  <BDropdownItem @click="onStateChange(STATE.NEW)">{{ getItemStateText(STATE.NEW) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.READY)">{{ getItemStateText(STATE.READY) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.INPROGRESS)">{{ getItemStateText(STATE.INPROGRESS) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.DONE)">{{ getItemStateText(STATE.DONE) }}</BDropdownItem>
                  <BDropdownDivider></BDropdownDivider>
                  <BDropdownItem @click="onStateChange(STATE.ON_HOLD)">{{ getItemStateText(STATE.ON_HOLD) }}</BDropdownItem>
                </BDropdown>
                <BDropdown v-else right :text=getTaskStateText(store.state.currentDoc.state)>
                  <BDropdownItem @click="onStateChange(STATE.TODO)">{{ getTaskStateText(STATE.TODO) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.INPROGRESS)">{{ getTaskStateText(STATE.INPROGRESS) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.TESTREVIEW)">{{ getTaskStateText(STATE.TESTREVIEW) }}</BDropdownItem>
                  <BDropdownItem @click="onStateChange(STATE.DONE)">{{ getTaskStateText(STATE.DONE) }}</BDropdownItem>
                  <BDropdownDivider></BDropdownDivider>
                  <BDropdownItem @click="onStateChange(STATE.ON_HOLD)">{{ getTaskStateText(STATE.ON_HOLD) }}</BDropdownItem>
                </BDropdown>
              </h3>
            </BCol>
          </template>
        </BRow>
      </BContainer>
    </div>
    <!-- vertical panes -->
    <multipane class="custom-resizer" layout="vertical">
      <div class="pane" :style="{ minWidth: '30%', width: '50%', minHeight: '100%' }">
        <h6>{{ welcomeMessage }}</h6>
        <BButton block class="last-event" v-b-popover.hover.bottom="'Click to see the event history'" @click="showMoreMessages"
          :style="{ 'background-color': getLastEventBGColor, 'color': getLastEventTextColor }">
          {{ getLastEventTxt }} </BButton>
        <span class="messSquare" v-b-popover.hover.bottom="'Click to do messaging'" :style="{ 'background-color': store.state.messSquareColor }"
          @click="goMessaging">mess</span>
        <span class="syncOLSquare" :style="{ 'background-color': getSquareColor }">{{ getSquareText }}</span>

        <div class="tree-container">
          <sl-vue-tree tabindex="0" :modelValue="store.state.treeNodes" @nodes-are-selected="onNodesSelected" @beforedrop="beforeNodeDropped"
            @drop="nodeDropped">
            <template v-slot:title="{ node }">
              <span class="item-icon">
                <i class="colorSeaBlue" v-if="node.level === LEVEL.DATABASE">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorBlue" v-if="node.level === LEVEL.PRODUCT">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorGreen" v-if="node.level === LEVEL.EPIC">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorOrange" v-if="node.level === LEVEL.FEATURE">
                  <font-awesome-icon icon="folder" />
                </i>
                <i class="colorYellow" v-if="node.level === LEVEL.US && node.data.subtype === userStorySubtype">
                  <font-awesome-icon icon="folder" />
                </i>
                <i v-if="node.level === LEVEL.US && node.data.subtype === spikeSubtype">
                  <font-awesome-icon icon="hourglass-start" />
                </i>
                <i class="colorRed" v-if="node.level === LEVEL.US && node.data.subtype === defectSubtype">
                  <font-awesome-icon icon="bug" />
                </i>
                <i class="colorWhite" v-if="node.level === LEVEL.TASK">
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
              <BBadge v-if="hasContentChanged(node) || hasOtherUpdate(node)" variant="info">See history</BBadge>
              <BBadge v-if="hasNewComment(node)" variant="info">See comments</BBadge>
              <BBadge v-if="isAttachmentAdded(node) || isAttachmentRemoved(node)" variant="info">See attachments</BBadge>
              <BBadge v-if="inActiveSprint(node)" variant="info">In {{ getActiveSprintText(node) }} sprint</BBadge>
            </template>

            <template v-slot:toggle="{ node }">
              <span v-if="node.level !== LEVEL.TASK && node.parentId !== MISC.AREA_PRODUCTID">
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
                <template v-for="col in rowLength(node.tmp.markedViolations) + 1" :key="col">
                  <!-- note that col starts with the initial value of 1 instead of 0 -->
                  <span class="violation-column">{{ createRow(node.tmp.markedViolations)[col - 2] }}</span>
                </template>
              </template>
            </template>

            <template v-slot:sidebar="{ node }">
              <template v-if="node.productId === MISC.AREA_PRODUCTID">
                <p v-if="node._id !== MISC.AREA_PRODUCTID" class="rectangle" :style="{ 'background-color': node.data.reqAreaItemColor }"></p>
              </template>
              <p v-else-if="isAPO && store.state.colorMapper && node.level > LEVEL.PRODUCT">
                <BButton v-if="node.data.reqarea && store.state.colorMapper[node.data.reqarea]" class="btn-seablue-dynamic"
                  :style="{ 'background-color': store.state.colorMapper[node.data.reqarea].reqAreaItemColor }" @click="setReqArea(node)" size="sm">Change
                </BButton>
                <BButton v-else @click="setReqArea(node)" variant="seablueLight" size="sm">Set</BButton>
              </p>
              <template
                v-if="store.state.userData.myOptions.proUser === 'true' && !isAPO && store.state.colorMapper && store.state.colorMapper[node.data.reqarea] && node.level > LEVEL.PRODUCT && node.data.reqarea">
                <p class="rectangle" :style="{ 'background-color': store.state.colorMapper[node.data.reqarea].reqAreaItemColor }"></p>
              </template>
            </template>
          </sl-vue-tree>
        </div>
      </div>

      <MultipaneResizer />
      <div class="pane" :style="{ flexGrow: 1, minWidth: '30%', width: '50%', minHeight: '100%' }">
        <!-- inner horizontal panes -->
        <multipane class="horizontal-panes" layout="horizontal">
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <BFormInput class="d-table-cell bold" id="titleField" :modelValue="store.state.currentDoc.title"
                @update:model-value="prepUpdate(store.state.currentDoc)" @blur="updateTitle()"></BFormInput>
              <div class="d-table-cell tac">Short Id = {{ store.state.currentDoc._id.slice(-5) }}</div>
              <div class="d-table-cell tar">
                <BButton variant="primary" @click="subscribeClicked">{{ getSubscribeButtonTxt }}</BButton>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ height: '60px' }">
            <div class="d-table w-100">
              <template v-if="isReqAreaItem">
                <p v-if="isAPO && isReqAreaTopLevel">As Areas Product Owner (APO) you can create and remove requirement areas here</p>
                <p v-if="!isAPO && isReqAreaTopLevel">Note: The requirement areas are managed by the Areas Product Owner (APO). Not you.</p>
                <span v-if="isAPO && !isReqAreaTopLevel">
                  <BFormGroup>
                    Select a display color for this requirement area:
                    <BFormRadioGroup v-model="selReqAreaColor" @change="updateColor(selReqAreaColor)" value-field="hexCode" text-field="color"
                      :options="getRemainingColorOptions()" />
                  </BFormGroup>
                </span>
              </template>
              <template v-else>
                <div> {{ getItemInfo() }}</div>
                <div v-if="getCurrentItemLevel === LEVEL.US" class="d-table-cell tar">
                  <BFormGroup>
                    <BFormRadioGroup v-model="selectedUsType" :options="getUsOptions()" name="usOptions" />
                  </BFormGroup>
                </div>
              </template>
            </div>
          </div>
          <div class="pane" :style="{ height: '40px' }">
            <div class="d-table w-100">
              <h5>Description</h5>
              <div v-if="store.state.currentDoc.history[0]" class="d-table-cell tar">
                <p> Last update by {{ store.state.currentDoc.history[0].by }} @ {{ new
                  Date(store.state.currentDoc.history[0].timestamp).toString().substring(0, 33) }}</p>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
            <!-- store.state.currentDoc.description is not encoded but the blanks are escaped after changes -->
            <QEditor v-model="store.state.currentDoc.description" @blur="updateDescriptionAtBlur(getSelectedNode)" />
          </div>
          <MultipaneResizer />
          <div class="pane" :style="{ height: '45px', top: '5px' }">
            <div>
              <h5>Acceptance criteria</h5>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
            <!-- store.state.currentDoc.acceptanceCriteria is not encoded but the blanks are escaped after changes -->
            <QEditor v-model="store.state.currentDoc.acceptanceCriteria" @blur="updateAcceptanceAtBlur(getSelectedNode)" />
          </div>
          <MultipaneResizer />
          <div class="pane" :style="{ height: '75px', top: '5px' }">
            <div class="d-table w-100">
              <div class="d-table-cell tal">
                <BButton v-if="store.state.selectedForView === 'comments' || store.state.selectedForView === 'attachments'" variant="primary"
                  @click="doAddition = true">Add {{ store.state.selectedForView }}</BButton>
                <BButton v-else-if="!isHistoryFilterActive" variant="primary" @click="startFiltering = true">Filter {{ store.state.selectedForView }}</BButton>
                <BButton v-else variant="primary" @click="stopFiltering">Clear {{ store.state.selectedForView }} filter</BButton>
              </div>
              <div class="d-table-cell tac">
                <label>Select to see</label>
                <BFormRadioGroup v-model="store.state.selectedForView" :options="getViewOptions()" name="viewOptions" />
              </div>
              <div class="d-table-cell tar">
                <BButton
                  v-if="store.state.selectedForView === 'comments' && !isCommentsFilterActive || store.state.selectedForView === 'history' && !isHistoryFilterActive"
                  variant="primary" @click="startFiltering = true">Filter {{ store.state.selectedForView }}</BButton>
                <BButton v-else-if="store.state.selectedForView !== 'attachments'" variant="primary" @click="stopFiltering">Clear {{ store.state.selectedForView
                }}
                  filter</BButton>
                <BButton v-else @click="doAddition = true" variant="primary">Add attachments</BButton>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ flexGrow: 1 }">
            <!-- comments, attachments, history listings -->
            <listings :selectedForView="store.state.selectedForView"></listings>
          </div>
        </multipane>
      </div>
    </multipane>

    <filters></filters>
    <!-- ToSprint modal -->
    <toSprint></toSprint>
    <!-- Context modal -->
    <ContextMenu></ContextMenu>

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

    <!-- color select -->
    <BModal size="lg" v-model="colorSelectShow" @ok="setUserColor(userReqAreaItemcolor)" title="Select a color">
      <h4>Enter a color in hex format eg. #567cd6</h4>
      <BFormInput v-model="userReqAreaItemcolor" :state="colorState"></BFormInput>
    </BModal>
    <!-- set req area -->
    <BModal size="lg" v-model="setReqAreaShow" @ok="doSetReqArea">
      <template v-slot:modal-title>
        {{ getSelectedNode.title }}
      </template>
      <BFormGroup label="Select the requirement area this item belongs to:">
        <BFormRadioGroup v-model="selReqAreaId" :options="this.store.state.reqAreaOptions" value-field="id" text-field="title" stacked />
      </BFormGroup>
    </BModal>

    <BModal size="lg" ref="commentsEditorRef" @ok="insertComment" title="Compose a comment">
      <QEditor v-model=newComment />
    </BModal>

    <BModal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <BFormInput v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></BFormInput>
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
          <p class="event-list" :style="{ 'background-color': item.backgroundColor, 'color': item.textColor }">{{ item.time }} {{ item.severity }}: {{ item.txt
          }}
          </p>
        </div>
      </div>
    </BModal>

  </div>
</template>

<script src="./TreeView.js"></script>

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

  .custom-resizer>.MultipaneResizer {
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
    font-size: 1.4em;
  }

  label {
    font-size: 1.4em;
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

  .d-table-cell.bold {
    font-weight: bold;
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
    padding: 9px;
    padding-right: 100px;
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

  .messSquare {
    position: absolute;
    right: 50px;
    padding: 5px;
    margin: 5px;
  }

  .syncOLSquare {
    position: absolute;
    width: 42px;
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
