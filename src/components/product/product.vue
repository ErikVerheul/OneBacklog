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
        <b-button class="m-1" @click="onSetMyFilters()">{{ $store.state.filterText }}</b-button>
        <b-nav-form>
          <b-form-input id="selectOnId" v-model="shortId" class="m-1" placeholder="Find on Id" />
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
        <h3
          v-if="getCurrentItemLevel === pbiLevel && $store.state.currentDoc.subtype === spikeSubtype"
        >
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
              <!-- use a trick to force rendering when a node had a change -->
              {{ node.title }} {{ String(node.data.lastChange).substring(0, 0) }}
              <b-badge
                v-if="hasNewState(node)"
                variant="danger"
              >{{ getItemStateText(node.data.state) }}</b-badge>
              <b-badge v-else variant="light">{{ getItemStateText(node.data.state) }}</b-badge>
              <b-badge
                v-if="hasContentChanged(node) || hasCommentToHistory(node)"
                variant="info"
              >See history</b-badge>
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
          <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
            <div class="d-table w-100">
              <p class="title is-6">This item is owned by team '{{ $store.state.currentDoc.team }}'</p>
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
                <b-button
                  variant="seablue"
                  :pressed.sync="doAddition"
                >Add {{ $store.state.selectedForView }}</b-button>
              </div>
              <div class="d-table-cell tac">
                <b-form-group label="Select to see">
                  <b-form-radio-group
                    v-model="$store.state.selectedForView"
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
                >Filter {{ $store.state.selectedForView }}</b-button>
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
    <!-- context modals -->
    <context></context>
    <!-- filter modals -->
    <filters></filters>
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

    <b-modal size="lg" ref="uploadRef" :ok-disabled="uploadToLarge || invalidFileName" @ok="uploadAttachment" title="Upload an attachment">
      <b-form-file
        v-model="fileInfo"
        :state="Boolean(fileInfo)"
        placeholder="Choose a file..."
      ></b-form-file>
      <div v-if="fileInfo !== null" class="mt-3">File type: {{ fileInfo.type }}, size: {{ fileInfo.size }} bytes</div>
      <div v-if="uploadToLarge" class="mt-3 colorRed">Cannot upload files this size</div>
    </b-modal>

    <b-modal size="lg" ref="historyFilterRef" @ok="filterHistory" title="Filter history">
      <b-form-input v-model="filterForHistoryPrep" placeholder="Enter a text to filter on"></b-form-input>
    </b-modal>
  </div>
</template>

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
