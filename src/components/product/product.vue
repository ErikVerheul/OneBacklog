<template>
  <!-- horizontal panes -->
<multipane class="horizontal-panes" layout="horizontal">
  <div class="pane" :style="{ minHeight: '160px', height: '160px', maxHeight: '160px' }">
    <div id="container">
      <div id="left">
        <b-img :src="require('../../assets/logo.png')" fluid alt="OneBacklog logo" />
      </div>
      <div id="right">
        <h1>Database .NAME.</h1>
        <div id="innerrow">
          <h3>other text</h3>
          <p>more text</p>
        </div>
      </div>
    </div>
  </div>

  <!-- vertical panes -->
  <multipane class="custom-resizer" layout="vertical">
    <div class="pane">
      <div>
        <h2 class="title is-6">Vertical Pane 1</h2>
      </div>
    </div>

    <multipane-resizer></multipane-resizer>
    <div class="pane" :style="{ flexGrow: 1 }">
      <!-- inner horizontal panes -->
      <multipane class="horizontal-panes" layout="horizontal">
        <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
          <div id="container">
            <div id="left2">
              <h5 class="title is-6">-selected product title-</h5>
            </div>
            <div id="right2">
              <b-button href="#">(Un)Subscribe to change notices</b-button>
            </div>
          </div>
        </div>
        <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
          <div id="container">
            <div id="left2">
              <h5 class="title is-6">Description</h5>
            </div>
            <div id="right2">
              <h5 class="title is-6">Created by -Erik Verheul- at -8 Januari 2019- </h5>
            </div>
          </div>
        </div>
        <div class="pane" :style="{ height: '30%', maxHeight: '60%' }">
          <div>
            <h6 class="title is-6">Pane 3</h6>
          </div>
        </div>
        <multipane-resizer></multipane-resizer>
        <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
          <div>
            <h5 class="title is-6">Description</h5>
          </div>
        </div>
        <div class="pane" :style="{ height: '30%', maxHeight: '60%' }">
          <div>
            <h6 class="title is-6">Pane 5</h6>
            <p class="subtitle is-6">Fluid height.</p>
            <p>
              <small>
                <strong>Configured with:</strong><br/>
                height: 40%<br/>
                maxHeight: 60%<br/>
              </small>
            </p>
          </div>
        </div>
        <multipane-resizer></multipane-resizer>
        <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
          <div id="container">
            <div id="left2">
              <h5 class="title is-6">Comments</h5>
            </div>
            <div id="right2">
              <b-button href="#">Add comment</b-button>
            </div>
          </div>
        </div>
        <multipane-resizer></multipane-resizer>
        <div class="pane" :style="{ flexGrow: 1 }">
          <div>
            <h6 class="title is-6">Pane 7</h6>
            <p class="subtitle is-6">Takes remaining available space.</p>

            <p>
              <small>
                <strong>Configured with:</strong><br/>
                flex-grow: 1<br/>
              </small>
            </p>
          </div>
        </div>
      </multipane>
    </div>
  </multipane>
</multipane>
</template>

<script>
  import {
    Multipane, MultipaneResizer
  }
  from 'vue-multipane'

  export default {
    components: {
      Multipane,
      MultipaneResizer,
    },
  };
</script>

<style lang="scss" scoped>
// horizontal panes
.horizontal-panes {
  width: 100%;
  height: 800px;
  border: 1px solid #ccc;
}

// Use deep selecor here and below. See https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors -->
.horizontal-panes >>> .pane {
  text-align: left;
  padding: 15px;
  overflow: hidden;
  background: #eee;
}

.horizontal-panes >>> .pane ~ .pane {
  border-top: 1px solid #ccc;
}

// horizontal allignment
* {margin: 0; padding: 0;}
#container {height: 100%; width:100%; font-size:0;}
#left, #left2, #right, #right2, #innerrow {display: inline-block; *display: inline; zoom: 1; vertical-align: top; font-size: 12px;}
#left {width: 10%; background: white;}
#right {width: 90%; background: green; text-align: center;}
#left2 {width: 20%; background: white;}
#right2 {width: 80%; background: white; text-align: right;}
#innerrow {width: 100%; background: white; text-align: center;}

// vertical panes
.custom-resizer {
  width: 100%;
  height: 100%;
}

.custom-resizer >>> .pane {
  text-align: left;
  padding: 15px;
  overflow: hidden;
  background: #eee;
  border: 2px solid #ccc;
}

.custom-resizer >>> .pane ~ .pane {}

.custom-resizer >>> .multipane-resizer {
  margin: 0;
  left: 0;
  position: relative;
  &:before {
    display: block;
    content: "";
    width: 3px;
    height: 40px;
    position: absolute;
    top: 50%;
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
</style>
