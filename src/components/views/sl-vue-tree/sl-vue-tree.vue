<!-- This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree -->
<template>
  <div class="sl-vue-tree" :class="{ 'sl-vue-tree-root': isRoot }" @mousemove="mouseMoveHandler">
    <!-- traverse the filtered nodes breadth first -->
    <div v-for="(node, nodeInd) in filteredNodes" :class="{
      'sl-vue-tree-selected': node.isSelected,
      'sl-vue-tree-highlighted-1': !node.isSelected && node.tmp.isHighlighted_1,
      'sl-vue-tree-highlighted-2': !node.isSelected && node.tmp.isHighlighted_2,
      'sl-vue-tree-warnlighted': !node.isSelected && node.tmp.isWarnLighted
    }" :key="node.pathStr">
      <div class="sl-vue-tree-cursor" :style="{
        visibility:
          cursorPosition &&
            cursorPosition.nodeModel.pathStr === node.pathStr &&
            cursorPosition.placement === 'before' ? 'visible' : 'hidden'
      }">
      </div>

      <template class="sl-vue-tree-node-item" @mousedown.left="mouseDownLeftHandler($event, node)" @mouseup.left="mouseUpLeftHandler($event, node)"
        @contextmenu="contextMenuHandler($event, node)" :path="node.pathStr">
        <div :class="{
          'sl-vue-tree-cursor-inside':
            cursorPosition &&
            cursorPosition.placement === 'inside' &&
            cursorPosition.nodeModel.pathStr === node.pathStr
        }">
          <template v-for="gapVal in gaps" :key="gapVal">
            <span class="sl-vue-tree-gap" />
          </template>

          <span class="sl-vue-tree-toggle" @click="onToggleHandler($event, node)">
            <slot name="toggle" :node="node"></slot>
          </span>

          <slot name="title" :node="node"></slot>

          <div class="sl-vue-tree-dependencyviolation">
            <slot name="dependencyviolation" :node="node"></slot>
          </div>

          <div class="sl-vue-tree-sidebar">
            <slot name="sidebar" :node="node"></slot>
          </div>
        </div>
      </template>

      <sl-vue-tree v-if="node.children && node.children.length > 0 && node.isExpanded" :nodeLevel="node.level" :parentInd="nodeInd">
        <template v-slot:toggle="{ node }">
          <slot name="toggle" :node="node"></slot>
        </template>

        <template v-slot:title="{ node }">
          <slot name="title" :node="node"></slot>
        </template>

        <template v-slot:dependencyviolation="{ node }">
          <slot name="dependencyviolation" :node="node"></slot>
        </template>

        <template v-slot:sidebar="{ node }">
          <slot name="sidebar" :node="node"></slot>
        </template>
      </sl-vue-tree>
    </div>
  </div>
</template>

<script src="./sl-vue-tree.js"></script>

<style lang="scss" scoped>
  .sl-vue-tree {
    position: relative;
    cursor: default;
  }

  .sl-vue-tree.sl-vue-tree-root {
    background-color: rgb(9, 22, 29);
    color: rgba(255, 255, 255, 0.5);
    flex-grow: 1;
    height: 100%;
  }

  .sl-vue-tree-selected>.sl-vue-tree-node-item {
    background-color: #13242d;
    color: white;
  }

  .sl-vue-tree-highlighted-1>.sl-vue-tree-node-item {
    color: rgb(98, 153, 226);
  }

  .sl-vue-tree-highlighted-2>.sl-vue-tree-node-item {
    color: rgb(99, 233, 122);
  }

  .sl-vue-tree-warnlighted>.sl-vue-tree-node-item {
    color: red;
  }

  .sl-vue-tree-node-item {
    position: relative;
    display: flex;
    flex-direction: row;
    padding-left: 10px;
    padding-right: 10px;
    line-height: 27px;
    user-select: none;
  }

  .sl-vue-tree-gap {
    display: inline-block;
    width: 15px;
    min-height: 1px;
  }

  .sl-vue-tree-toggle {
    display: inline-block;
    text-align: left;
    width: 20px;
  }

  .sl-vue-tree-cursor-inside {
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding-right: 10px;
  }

  .sl-vue-tree-dependencyviolation {
    display: inline-block;
    position: absolute;
    right: 80px;
  }

  .sl-vue-tree-sidebar {
    display: inline-block;
    position: absolute;
    right: 10px;
  }

  .sl-vue-tree-cursor {
    position: absolute;
    border: 1px solid;
    border-color: white;
    height: 1px;
    width: 100%;
  }
</style>
