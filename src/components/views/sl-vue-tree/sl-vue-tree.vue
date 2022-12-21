<!-- This component is an improved and extended version of the Holiber sl-vue-tree. See https://github.com/holiber/sl-vue-tree -->
<template>
  <div class="sl-vue-tree" :class="{'sl-vue-tree-root': isRoot }" @mousemove="onMousemoveHandler">
    <div v-for="(node, nodeInd) in filteredNodes" :class="{'sl-vue-tree-selected': node.isSelected,
			'sl-vue-tree-highlighted-1': !node.isSelected && node.tmp.isHighlighted_1,
			'sl-vue-tree-highlighted-2': !node.isSelected && node.tmp.isHighlighted_2,
			'sl-vue-tree-warnlighted': !node.isSelected && node.tmp.isWarnLighted}" :key="node.pathStr">
      <div class="sl-vue-tree-cursor" :style="{
            visibility:
            cursorPosition &&
            cursorPosition.nodeModel.pathStr === node.pathStr &&
            cursorPosition.placement === 'before' ? 'visible' : 'hidden'
           }">
        <!-- suggested place for node insertion  -->
      </div>

      <div class="sl-vue-tree-node-item" @mousedown="onNodeMousedownHandler($event, node)" @mouseup="onNodeMouseupHandler($event)" @contextmenu="emitNodeContextmenu(node)" :path="node.pathStr" :class="{
            'sl-vue-tree-cursor-inside':
              cursorPosition &&
              cursorPosition.placement === 'inside' &&
              cursorPosition.nodeModel.pathStr === node.pathStr
          }">

        <div class="sl-vue-tree-title">
          <span class="sl-vue-tree-gap" v-for="gapVal in gaps" :key="gapVal"/>

          <span class="sl-vue-tree-toggle" v-if="!node.isLeaf" @click="onToggleHandler($event, node)">
            <slot name="toggle" :node="node"></slot>
          </span>

          <slot name="title" :node="node"></slot>

          <div class="sl-vue-tree-dependency-violation">
            <slot name="dependency-violation" :node="node"></slot>
          </div>

          <div class="sl-vue-tree-sidebar">
            <slot name="sidebar" :node="node"></slot>
          </div>
        </div>
      </div>

      <sl-vue-tree v-if="node.children && node.children.length && node.isExpanded" :nodeLevel="node.level" :parentInd="nodeInd">
        <template v-slot:title="{ node }">
          <slot name="title" :node="node"></slot>
        </template>

        <template v-slot:toggle="{ node }">
          <slot name="toggle" :node="node"></slot>
        </template>

        <template v-slot:dependency-violation="{ node }">
          <slot name="dependency-violation" :node="node"></slot>
        </template>

        <template v-slot:sidebar="{ node }">
          <slot name="sidebar" :node="node"></slot>
        </template>
      </sl-vue-tree>
    </div>
  </div>
</template>

<script src="./sl-vue-tree.js"></script>

<style scoped>
.sl-vue-tree {
  position: relative;
  cursor: default;
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
}

.sl-vue-tree.sl-vue-tree-root {
  background-color: rgb(9, 22, 29);
  color: rgba(255, 255, 255, 0.5);
  flex-grow: 1;
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}

.sl-vue-tree-selected > .sl-vue-tree-node-item {
  background-color: #13242d;
  color: white;
}

.sl-vue-tree-highlighted-1 > .sl-vue-tree-node-item {
  color: rgb(98, 153, 226);
}

.sl-vue-tree-highlighted-2 > .sl-vue-tree-node-item {
  color: rgb(99, 233, 122);
}

.sl-vue-tree-warnlighted > .sl-vue-tree-node-item {
  color: red;
}

.sl-vue-tree-node-item.sl-vue-tree-cursor-inside {
  color: orange;
}

.sl-vue-tree-node-item {
  position: relative;
  display: flex;
  flex-direction: row;
  padding-left: 10px;
  padding-right: 10px;
  line-height: 28px;
  border: 1px solid transparent;
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

.sl-vue-tree-dependency-violation {
  display: inline-block;
  position: absolute;
  right: 50px;
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
