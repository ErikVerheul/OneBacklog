<template>
  <div :class="classnames" :style="{ cursor, userSelect }" @mousedown.left="onMouseDown">
    <slot></slot>
  </div>
</template>

<script src="./MultiPane.js"></script>

<style lang="scss">
.multipane {
  display: flex;

  &.layout-h {
    flex-direction: column;
  }

  &.layout-v {
    flex-direction: row;
  }
}

.multipane>div {
  position: relative;
  z-index: 1;
}

.MultipaneResizer {
  display: block;
  position: relative;
  z-index: 2;
}

.layout-h>.MultipaneResizer {
  width: 100%;
  height: 10px;
  margin-top: -10px;
  top: 5px;
  cursor: row-resize;
}

.layout-v>.MultipaneResizer {
  width: 10px;
  height: 100%;
  margin-left: -10px;
  left: 5px;
  cursor: col-resize;
}
</style>
