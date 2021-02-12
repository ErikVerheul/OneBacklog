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
            'sl-vue-tree-cursor-hover':
              cursorPosition &&
              cursorPosition.nodeModel.pathStr === node.pathStr,
            'sl-vue-tree-cursor-inside':
              cursorPosition &&
              cursorPosition.placement === 'inside' &&
              cursorPosition.nodeModel.pathStr === node.pathStr
          }">

        <div class="sl-vue-tree-gap" v-for="gapInd in gaps" :key="gapInd"></div>

        <div class="sl-vue-tree-title">
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

      <sl-vue-tree v-if="node.children && node.children.length && node.isExpanded" :value="node.children" :nodeLevel="node.level" :parentInd="nodeInd">
        <template slot="title" slot-scope="{ node }">
          <slot name="title" :node="node"></slot>
        </template>

        <template slot="toggle" slot-scope="{ node }">
          <slot name="toggle" :node="node"></slot>
        </template>

        <div slot="dependency-violation" slot-scope="{ node }">
          <slot name="dependency-violation" :node="node"></slot>
        </div>

        <template slot="sidebar" slot-scope="{ node }">
          <slot name="sidebar" :node="node"></slot>
        </template>
      </sl-vue-tree>
    </div>
  </div>
</template>

<script src="./sl-vue-tree.js"></script>
