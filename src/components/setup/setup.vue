<template>
  <div>
    <div class="row">
      <div class="col-lg-2 col-sm-4">
        <b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo"/>
      </div>
      <div class="col-lg-10 col-sm-8">
        <h4>Welcome {{ name }}. This page is intended for the initial database setup:
          <ol>
            <li>Name the database (only lowercase characters and digits and no spaces)</li>
            <li>Name the product (just one for now)</li>
            <li>Name the team (just one for now)</li>
          </ol>
          <p>You will be the only one who can access the database (for now)</p>
        </h4>
      </div>

      <div class="col-lg-12 col-sm-12">
        <table>
          <thead>
            <td><strong>Field-1</strong></td>
            <td><strong>Field-2</strong></td>
            <td><strong>Field-3</strong></td>
            <td></td>
          </thead>
          <tbody>
            <tr>
              <td><input type="text" v-model="row.field1"></td>
              <td><input type="text" v-model="row.field2"></td>
              <td><input type="text" v-model="row.field3"></td>
              <td>
                <a @click="execute1" class="myButton">Execute</a>
              </td>
            </tr>
            <tr>
              <td>
                <a @click="execute2" class="myButton">Undo</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="col-lg-12 col-sm-12">
        <div class="myBox">
          <hr>
          <p>The output from CouchDB:<p>
            <p style="white-space: pre">{{ message }}</p>
            <p v-if="comment">Comment: {{ comment }} </p>
            <p class="p_red" v-if="errorMessage">Error: {{ errorMessage }} </p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <script>
  export default {
    data () {
      return {
        selectionMade: false,
        row: {
          field1: 'database name',
          field2: 'product name',
          field3: 'team name'
        },
        commandNr: null,
      }
    },
    computed: {
      name () {
        return !this.$store.getters.user ? false : this.$store.getters.user
      },
      roles () {
        return !this.$store.getters.roles ? false : this.$store.getters.roles
      },
      message() {
        return this.$store.getters.returnMessage
      },
      comment() {
        return this.$store.getters.returnComment
      },
      errorMessage() {
        return this.$store.getters.returnErrorMsg
      }
    },
    created () {
      //this.$store.dispatch('fetchUser')
    },
    methods: {
      execute1() {
        this.crateDBExe()
      },
      execute2() {
        this.deleteDBExe()
      },
      crateDBExe() {
        this.$store.dispatch('createDB', this.row.field1)
      },
      deleteDBExe() {
        var payload = {
          dbName: this.row.field1
        }
        this.$store.dispatch('delDB', payload)
      }
    }
  }
  </script>

  <style scoped>
  h1, h4 {
    margin: 50px;
    text-align: left;
  }

  .p_red {
    color: red;
  }

  .myButton {
    margin-left: 20px;
    margin-bottom: 10px;
    background-color: inherit;
    border: 1px solid black;
    border-radius: 5px;
    color: blue;
    padding: 5px 5px;
    text-align: center;
    text-decoration: none;
    display: block;
    font-size: 16px;
    cursor: pointer;
  }

  /* Box styles */
  .myBox {
    border: 2px;
    padding: 5px;
    font: 12px/18px sans-serif;
    width: 1000px;
    height: 300px;
    overflow: scroll;
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    border: 1px solid yellowgreen;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: yellowgreen;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #88ba1c;
  }

  </style>
