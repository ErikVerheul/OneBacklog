<template>
  <!-- horizontal panes -->
  <multipane class="horizontal-panes" layout="horizontal">
    <div class="pane" :style="{ minHeight: '150px', height: '150px', maxHeight: '150px' }">
      <div class="d-table ">
        <div class="d-table-cell tal clearfix">
          <b-img left :src="require('../../assets/logo.png')" height="140px" width="160px" alt="OneBacklog logo" />
        </div>
        <div class="d-table-cell w-100 tac">
          <h1>Database {{ databaseName }}</h1>
          <div>
            <h3>Product T-Shirt size:
              <input type="text" size="3" maxlength="3" id="productTitle" v-model.lazy="tShirtSize" />
            </h3>
          </div>
        </div>
      </div>
    </div>

    <!-- vertical panes -->
    <multipane class="custom-resizer" layout="vertical">
      <div class="pane">
        <div>
          <h1>The tree view comes here!</h1>
        </div>
      </div>

      <multipane-resizer></multipane-resizer>
      <div class="pane" :style="{ flexGrow: 1 }">
        <!-- inner horizontal panes -->
        <multipane class="horizontal-panes" layout="horizontal">
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <b-input class="d-table-cell" type="text" maxlength="10" id="productTitle" v-model.lazy="productTitle">
              </b-input>
              <div class="d-table-cell tar">
                <b-button href="#">(Un)Subscribe to change notices</b-button>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ minHeight: '50px', height: '50px', maxHeight: '50px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Description</h5>
              <div class="d-table-cell tar">
                <h5 class="title is-6">Created by {{ createdBy }} at {{ creationDate }} </h5>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%' }">
            <textarea style="width:100%" id="description" v-model.lazy="description" rows="8">
          </textarea>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '40px', height: '40px', maxHeight: '40px' }">
            <div>
              <h5 class="title is-6">Acceptance criteria</h5>
            </div>
          </div>
          <div class="pane" :style="{ height: '30%', maxHeight: '60%' }">
            <textarea style="width:100%" id="acceptanceCriteria" v-model.lazy="acceptanceCriteria" rows="8">
          </textarea>
          </div>
          <multipane-resizer></multipane-resizer>
          <div class="pane" :style="{ minHeight: '60px', height: '60px', maxHeight: '60px' }">
            <div class="d-table w-100">
              <h5 class="title is-6">Comments</h5>
              <div class="d-table-cell tar">
                <b-button href="#">Add comment</b-button>
              </div>
            </div>
          </div>
          <div class="pane" :style="{ flexGrow: 1 }">
            <!-- Inner vertical split -->
            <multipane class="vertical-panes" layout="vertical">
              <multipane-resizer></multipane-resizer>
              <div class="pane" :style="{ flexGrow: 1 }">
                <div>
                  <!-- <b-table stacked striped small :items="comments"></b-table> -->
                  <ul>
                    <li v-for="comment in comments" :key=comment.authorAndIssueDate>
                      <div v-for="(value, key) in comment" :key=key>
                        {{ key }} {{ value }}
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <multipane-resizer></multipane-resizer>
              <div class="pane" :style="{ minWidth: '100px', width: '100px', maxWidth: '100px' }">
                <div>
                  <b-button href="#" size="sm">Upload attachment</b-button>
                  <b-dropdown variant="link" size="lg" no-caret>
                    <template slot="button-content">
                      &#x1f50d;<span class="sr-only">Search</span>
                    </template>
                    <b-dropdown-item href="#">Attachement-1</b-dropdown-item>
                    <b-dropdown-item href="#">Attachement-2</b-dropdown-item>
                    <b-dropdown-item href="#">Attachement-3</b-dropdown-item>
                  </b-dropdown>
                </div>
              </div>
            </multipane>
          </div>
        </multipane>
      </div>
    </multipane>
  </multipane>
</template>

<script>
  import {
    Multipane,
    MultipaneResizer
  } from 'vue-multipane'

  export default {
    data() {
      return {
        databaseName: '-name-',
        productTitle: 'The product title',
        description: 'Your product business case go\'s here',
        acceptanceCriteria: 'Please include your acceptance criteria here',
        createdBy: 'Erik Verheul',
        creationDate: '8 January 2019',
        tShirtSize: 'XL',
        comments: [{
            'Author and issue date': "Erik Verheul @ Thu Jan 10 2019 17:26:48 GMT+0100",
            'Comment': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

          {
            'Author and issue date': "Erik Verheul @ Thu Jan 11 2019 17:26:48 GMT+0100",
            'Comment': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

          {
            'Author and issue date': "Erik Verheul @ Thu Jan 12 2019 17:26:48 GMT+0100",
            'Comment': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

          {
            'Author and issue date': "Erik Verheul @ Thu Jan 13 2019 17:26:48 GMT+0100",
            'Comment': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

          {
            'Author and issue date': "Erik Verheul @ Thu Jan 14 2019 17:26:48 GMT+0100",
            'Comment': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

          {
            'Author and issue date': "Erik Verheul @ Thu Jan 15 2019 17:26:48 GMT+0100",
            'Comment': "[LAST ELEMENT IN ARRAY] Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
          },

        ],
      }
    },
    components: {
      Multipane,
      MultipaneResizer,
    },
  }

</script>

<style lang="scss" scoped>
  // horizontal panes
  .horizontal-panes {
    width: 100%;

    border: 1px solid #ccc;
  }

  // Use deep selecor here and below. See https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors -->
  .horizontal-panes>>>.pane {
    text-align: left;
    padding: 5px;
    overflow: hidden;
    background: #eee;
  }

  .horizontal-panes>>>.pane~.pane {
    border-top: 1px solid #ccc;
  }

  // vertical panes
  .custom-resizer {
    width: 100%;
    height: 100%;
  }

  .custom-resizer>>>.pane {
    text-align: left;
    padding: 3px;
    overflow: hidden;
    background: #eee;
    border: 5px solid #ccc;
  }

  .custom-resizer>>>.pane~.pane {}

  .custom-resizer>>>.multipane-resizer {
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

  // other stuff

  .border {
    border: 2px indigo dashed;
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

</style>
