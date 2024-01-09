<template>
  <div>
    <app-header>
      <!-- Right aligned nav items -->
      <BNavbarNav class="ml-auto">
        <BNavForm>
          <BButton class="m-1" id="tooltip-undo" v-show="store.state.changeHistory.length > 0" @click="onUndoEvent()">Undo</BButton>
          <!-- TODO: check if BTooltip component exixts -->
          <BTooltip target="tooltip-undo" triggers="hover">
            {{ undoTitle }}
          </BTooltip>
          <BButton class="m-1" v-show="!isRootSelected && !isReqAreaItemSelected" @click="onSetMyFilters()">{{ getFilterButtonText }}</BButton>
          <div class="divider" />
          <BInputGroup v-show="store.state.resetSearch.searchType !== 'searchInTitles'">
            <BFormInput class="form-width" id="findItemOnId" v-model="store.state.itemId" placeholder="Select on (short) Id"></BFormInput>
            <BInputGroup-append>
              <BButton @click="resetFindId" variant="primary" type="reset">x</BButton>
            </BInputGroup-append>
          </BInputGroup>
          <div class="divider" />
          <BInputGroup v-show="!isRootSelected && !isReqAreaItemSelected && store.state.resetSearch.searchType !== 'findItemOnId'">
            <BFormInput id="searchInput" v-model="store.state.keyword" placeholder="Search in titles"></BFormInput>
            <BInputGroup-append>
              <BButton @click="resetSearchTitles" variant="primary" type="reset">x</BButton>
            </BInputGroup-append>
          </BInputGroup>
        </BNavForm>
      </BNavbarNav>
    </app-header>
    <div>
      <BContainer>
        <BRow>
          <BCol cols="4">
            <h3 v-if="getCurrentItemLevel <= LEVEL.EPIC">
              {{ getLevelText(getCurrentItemLevel) }} T-Shirt size:
              <input type="text" size="3" maxlength="3" id="tShirtSizeId" :value="getCurrentItemTsSize" @blur="updateTsSize()" />
            </h3>
            <h3 v-if="getCurrentItemLevel === LEVEL.FEATURE || (getCurrentItemLevel === LEVEL.PBI && store.state.currentDoc.subtype !== spikeSubtype)">
              Story points:
              <input type="text" size="3" maxlength="3" id="storyPointsId" :value="store.state.currentDoc.spsize" @blur="updateStoryPoints()" />
            </h3>
            <h3 v-if="getCurrentItemLevel === LEVEL.PBI && store.state.currentDoc.subtype === spikeSubtype">
              Person hours:
              <input type="text" size="3" maxlength="3" id="personHoursId" :value="store.state.currentDoc.spikepersonhours" @blur="updatePersonHours()" />
            </h3>
          </BCol>
          <BCol cols="5">
            <h3 align="center">{{ store.state.currentProductTitle }} [Overview]</h3>
          </BCol>
          <BCol cols="3">
            <h3 v-if="store.state.currentDoc._id !== 'root' && store.state.currentDoc._id !== 'requirement-areas' && store.state.currentDoc.parentId !== 'requirement-areas'" align="right">
              State:
              <BDropdown right class="m-1 .btn.btn-secondary.dropdown-toggle" :text=getItemStateText(store.state.currentDoc.state)>
                <BDropdownItem @click="onStateChange(STATE.NEW)">{{ getItemStateText(STATE.NEW) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.READY)">{{ getItemStateText(STATE.READY) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.INPROGRESS)">{{ getItemStateText(STATE.INPROGRESS) }}</BDropdownItem>
                <BDropdownItem @click="onStateChange(STATE.DONE)">{{ getItemStateText(STATE.DONE) }}</BDropdownItem>
                <BDropdownDivider></BDropdownDivider>
                <BDropdownItem @click="onStateChange(STATE.ON_HOLD)">{{ getItemStateText(STATE.ON_HOLD) }}</BDropdownItem>
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
        <div class="square" :style="{'background-color': squareColor}">{{ squareText }}</div>
        <BButton block class="last-event" v-b-popover.hover.bottomright="'Click to see the event history'" @click="showMoreMessages()" :style="{'background-color': getLastEventColor}">
          {{ getLastEventTxt }} </BButton>

        <div class="tree-container">
          <sl-vue-tree tabindex="0" :modelValue="store.state.treeNodes" @nodes-are-selected="onNodesSelected" @beforedrop="beforeNodeDropped" @drop="nodeDropped">
            <template v-slot:title={node}>
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
              <BBadge v-if="hasInconsistentState(node)" variant="danger">{{ getNodeStateText(node) + '?' }}</BBadge>
              <BBadge v-else-if="hasNewState(node)" variant="info">{{ getNodeStateText(node) }}</BBadge>
              <BBadge v-else-if="doShowState(node)" variant="light">{{ getNodeStateText(node) }}</BBadge>
              <BBadge v-if="hasNodeMoved(node)" variant="info">Moved</BBadge>
              <BBadge v-if="hasContentChanged(node) || hasCommentToHistory(node) || hasOtherUpdate(node)" variant="info">See history</BBadge>
              <BBadge v-if="hasNewComment(node)" variant="info">See comments</BBadge>
              <BBadge v-if="isAttachmentAdded(node)" variant="info">See attachments</BBadge>
            </template>

            <template v-slot:toggle={node}>
              <span v-if="!node.isLeaf">
                <i v-if="node.isExpanded">
                  <font-awesome-icon icon="chevron-down" />
                </i>
                <i v-if="!node.isExpanded">
                  <font-awesome-icon icon="chevron-right" />
                </i>
              </span>
            </template>

            <template v-slot:dependencyviolation={node}>
              <template v-if="node.tmp.markedViolations">
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

            <template v-slot:sidebar={node}>
              <template v-if="node.productId === MISC.AREA_PRODUCTID">
                <p v-if="node._id !== MISC.AREA_PRODUCTID" class="rectangle" :style="{'background-color': node.data.reqAreaItemColor}"></p>
              </template>
              <p v-else-if="store.state.colorMapper && node.level > LEVEL.PRODUCT">
                <BButton v-if="node.data.reqarea && store.state.colorMapper[node.data.reqarea]" class="btn-seablue-dynamic"
                  :style="{'background-color': store.state.colorMapper[node.data.reqarea].reqAreaItemColor}" @click="setReqArea(node)" squared size="sm">Change
                </BButton>
                <BButton v-else @click="setReqArea(node)" squared variant="seablueLight" size="sm">Set</BButton>
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
              <BFormInput class="d-table-cell" type="text" maxlength="60" id="titleField" :modelValue="store.state.currentDoc.title" @blur="updateTitle()"></BFormInput>
              <div v-if="!isReqAreaItem" class="d-table-cell tac">Short Id = {{ store.state.currentDoc._id.slice(-5) }}</div>
              <div class="d-table-cell tar">
                <BButton variant="primary" @click="subscribeClicked">{{ subsribeTitle }}</BButton>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '40px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <p v-if="!isReqAreaItem" class="title is-6">{{ getItemInfo() }}</p>
              <!-- do not use parenthesis with @change: see https://stackoverflow.com/questions/53106723/bootstrap-vue-select-sending-old-value -->
              <span v-else-if="!isReqAreaTopLevel">
                <BFormGroup>
                  Select a display color for this requirement area:
                  <BFormRadioGroup v-model="selReqAreaColor" @change="updateColor" value-field="hexCode" text-field="color" :options="getRemainingColorOptions()" />
                </BFormGroup>
              </span>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Description</h5>
              <div class="d-table-cell tar">
                <p class="title is-6"> Last update by {{ store.state.currentDoc.history[0].by }} @ {{ new Date(store.state.currentDoc.history[0].timestamp).toString().substring(0, 33) }}</p>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
            <QuillEditor v-model:content="description" contentType="html" :toolbar="editorToolbar" @update:content="initNewDescription" @blur="updateDescription()"></QuillEditor>
          </div>
          <template v-if="!isReqAreaItemSelected">
            <multipane-resizer></multipane-resizer>
            <div class="pane" :style="{ height: '45px', top: '5px' }">
              <div>
                <h5 class="title is-6">Acceptance criteria</h5>
              </div>
            </div>
            <div class="pane" :style="{ height: '30%', maxHeight: '60%', minWidth: '100%', maxWidth: '100%' }">
              <QuillEditor v-model:content="acceptanceCriteria" contentType="html" :toolbar="editorToolbar" @update:content="initNewAcceptance" @blur="updateAcceptance()"></QuillEditor>
            </div>
          </template>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ height: '75px', top:'5px'}">
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
    <!-- Context modal -->
    <CcontextMenu></CcontextMenu>

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
        {{ getLastSelectedNode.title }}
      </template>
      <BFormGroup label="Select the requirement area this item belongs to:">
        <BFormRadioGroup v-model="selReqAreaId" :options="this.store.state.reqAreaOptions" value-field="id" text-field="title" stacked />
      </BFormGroup>
    </BModal>
    <!-- filter modals -->
    <filters></filters>
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

    <BModal size="lg" ref="uploadRef" :ok-disabled="uploadToLarge || invalidFileName" @ok="uploadAttachment" title="Upload an attachment">
      <BFormFile v-model="fileInfo" :state="Boolean(fileInfo)" placeholder="Choose a file..."></BFormFile>
      <div v-if="fileInfo !== null" class="mt-3">File type: {{ fileInfo.type }}, size: {{ fileInfo.size }} bytes</div>
      <div v-if="uploadToLarge" class="mt-3 colorRed">Cannot upload files this size</div>
    </BModal>

    <BModal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <BFormInput v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></BFormInput>
    </BModal>

    <BModal size="lg" ref="historyEventRef" title="Event history" ok-only>
      <div v-if="store.state.eventList.length > 0">
        <div v-for="item in store.state.eventList" :key="item.eventKey">
          <p class="event-list" :style="{'background-color': item.color}">{{ item.time }} {{ item.severity }}: {{ item.txt }}</p>
        </div>
      </div>
    </BModal>

  </div>
</template>

<script src="./c_product_view.js"></script>

<style lang="scss" scoped>
/* horizontal panes */
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

/* vertical panes */
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
.container {
  margin-top: 10px;
  max-width: 100%;
  margin-bottom: 15px;
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
.form-width {
  max-width: 180px
}

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

.divider {
  width: 15px;
  height: auto;
  display: inline-block;
}
</style>
