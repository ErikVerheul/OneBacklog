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
          <h6 class="title is-6">Vertical Pane 1</h6>
        </div>
      </div>

      <multipane-resizer></multipane-resizer>
      <div class="pane" :style="{ flexGrow: 1 }">
        <!-- inner horizontal panes -->
        <multipane class="horizontal-panes" layout="horizontal">
          <div class="pane" :style="{ minHeight: '100px', height: '200px', maxHeight: '300px' }">
            <div>
              <h6 class="title is-6">Pane 1</h6>
              <p class="subtitle is-6">Fixed height.</p>
              <p>
                <small>
                <strong>Configured with:</strong><br/>
                minHeight: 100px<br/>
                height: 200px<br/>
                maxHeight: 300px<br/>
              </small>
              </p>
            </div>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ height: '40%', maxHeight: '60%' }">
            <div>
              <h6 class="title is-6">Pane 2</h6>
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
          <div class="pane" :style="{ flexGrow: 1 }">
            <div>
              <h6 class="title is-6">Pane 3</h6>
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

<style lang="css" scoped>

  <!-- horizontal panes -->
  .horizontal-panes {
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
  }

  <!-- Use deep selecor here and below. See https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors -->
  .horizontal-panes >>> .pane {
    text-align: left;
    padding: 15px;
    overflow: hidden;
    background: #eee;
  }

  .horizontal-panes >>> .pane ~ .pane {
    border-top: 1px solid #ccc;
  }

  <!-- horizontal allignment -->
  * {margin: 0; padding: 0;}
  #container {height: 100%; width:100%; font-size:0;}
  #left, #right, #innerrow {display: inline-block; *display: inline; zoom: 1; vertical-align: top; font-size: 12px;}
  #left {width: 10%; background: white;}
  #right {width: 90%; background: green; text-align: center;}
  #innerrow {width: 100%; background: white; text-align: center;}

  <!-- vertical panes -->
  .custom-resizer {
    width: 100%;
    height: 400px;
  }

  .custom-resizer >>> .pane {
    text-align: left;
    padding: 15px;
    overflow: hidden;
    background: #eee;
    border: 1px solid #ccc;
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
