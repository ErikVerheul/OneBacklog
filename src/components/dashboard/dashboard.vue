<template>
  <div>
    <div class="row">
      <div class="col-lg-12 col-sm-12">
        <h4 v-if="name">You should only get here if you're authenticated!
        Your user name is: {{ name }}, and your roles are: {{ roles }}
        Now see what you can do with the roles you have.</h4>
      </div>
      <div class="col-lg-4 col-sm-4">
        <b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo"/>
      </div>
      <div class="col-lg-8 col-sm-8">
        <button @click="showCredentials" class="myButton">0. Show my credentials</button>
        <button @click="chPassword" class="myButton">1. Change my password</button>
        <button @click="crateUsers" class="myButton">2. Create user</button>
        <button @click="crateDB" class="myButton">3. Create a database</button>
        <button @click="assignUser" class="myButton">4. Assing users to the last created database</button>
        <button @click="showDBsecurity" class="myButton">5. Show the database security info</button>
        <button @click="addDocument" class="myButton">6. Add a document to the last created database</button>
        <button @click="showDocuments" class="myButton">7. Show the documents in a database</button>
        <button @click="showDocById" class="myButton">8. Show a document by id</button>
        <button @click="deleteDB" class="myButton">9. Delete the created database</button>
      </div>

      <div class="col-lg-12 col-sm-12">
        <table>
          <thead>
            <tr v-if="selectionMade">
              <td><strong>Field-1</strong></td>
              <td><strong>Field-2</strong></td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            <tr v-if="selectionMade">
              <td><input type="text" v-model="row.field1"></td>
              <td><input type="text" v-model="row.field2"></td>
              <td>
                <a @click="execute" class="myButton">Execute</a>
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
          field1: '',
          field2: ''
        },
        commandNr: null,
      }
    },
    computed: {
      ...mapGetters({
        name: 'user',
        roles: 'roles',
        message: 'returnMessage',
        comment: 'returnComment',
        errorMessage: 'returnErrorMsg'
      }),
    },
    created () {
      //this.$store.dispatch('fetchUser')
    },
    methods: {
      execute() {
        switch (this.commandNr) {
          case 0:
          this.showCredentialsExe()
          break
          case 1:
          this.chPasswordExe()
          break
          case 2:
          this.crateUsersExe()
          break
          case 3:
          this.crateDBExe()
          break
          case 4:
          this.assignUserExe()
          break
          case 5:
          this.showDBsecurityExe()
          break
          case 6:
          this.addDocumentExe()
          break
          case 7:
          this.showDocumentsExe()
          break
          case 8:
          this.showDocByIdExe()
          break
          case 9:
          this.deleteDBExe()
          break
          default:
        }
      },
      showCredentials() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "field not used",
          field2: "field not used"
        }
        this.commandNr = 0
      },
      showCredentialsExe() {
        this.$store.dispatch('showCreds')
      },
      chPassword() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "new password",
          field2: "field not used"
        }
        this.commandNr = 1
      },
      chPasswordExe() {
        var payload = {
          newPW: this.row.field1,
          userData: {}
        }
        this.$store.dispatch('changePW', payload)
      },
      crateUsers() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "user name",
          field2: "roles"
        }
        this.commandNr = 2
      },
      crateUsersExe() {
        var payload = {
          name: this.row.field1,
          role: this.row.field2
        }
        this.$store.dispatch('createUser', payload)
      },
      crateDB() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "DB name",
          field2: "field not used",
        }
        this.commandNr = 3
      },
      crateDBExe() {
        this.$store.dispatch('createDB', this.row.field1)
      },
      assignUser() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "user name",
          field2: "role"
        }
        this.commandNr = 4
      },
      assignUserExe() {
        var payload = {
          dbName: localStorage.getItem('dbName'),
          name: this.row.field1,
          role: this.row.field2,
          permissions: {}
        }
        this.$store.dispatch('assignUser', payload)
      },
      showDBsecurity() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: localStorage.getItem('dbName'),
          field2: "field not used"
        }
        this.commandNr = 5
      },
      showDBsecurityExe() {
        var payload = {
          dbName: this.row.field1
        }
        this.$store.dispatch('showDBsec', payload)
      },
      addDocument() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: "a name",
          field2: "a value"
        }
        this.commandNr = 6
      },
      addDocumentExe() {
        var payload = {
          dbName: localStorage.getItem('dbName'),
          docName: 'document-' + (((1+Math.random())*0x10000)|0).toString(16).substring(1),
          fieldName: this.row.field1,
          fieldValue: this.row.field2
        }
        this.$store.dispatch('createDoc', payload)
      },
      showDocuments() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: localStorage.getItem('dbName'),
          field2: "field not used"
        }
        this.commandNr = 7
      },
      showDocumentsExe() {
        var payload = {
          dbName: this.row.field1
        }
        this.$store.dispatch('showAllDocs', payload)
      },
      showDocById() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: localStorage.getItem('dbName'),
          field2: "paste the id here"
        }
        this.commandNr = 8
      },
      showDocByIdExe() {
        var payload = {
          dbName: this.row.field1,
          id: this.row.field2
        }
        this.$store.dispatch('showDoc', payload)
      },
      deleteDB() {
        this.$store.commit('clearAll')
        this.selectionMade = true
        this.row = {
          field1: localStorage.getItem('dbName'),
          field2: "field not used"
        }
        this.commandNr = 9
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
