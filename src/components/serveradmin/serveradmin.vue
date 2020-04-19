<template lang="html">
  <div>
    <app-header></app-header>
    <b-container fluid>
      <h2>Server admin view: {{ optionSelected }}</h2>
      <b-button block @click="createBackup"> Create a database backup</b-button>
      <b-button block @click="restoreBackup">Restore a database from backup</b-button>
      <b-button block @click="createNewDb">Create a new database</b-button>
      <b-button block @click="changeMyDb">Change my default database to any available database</b-button>
      <b-button block @click="purgeDb">Purge removed documents and compact the database</b-button>
      <b-button block variant="warning" @click="remHistAndComm">Remove history and comments</b-button>
      <b-button block variant="warning" @click="deleteDb">Delete a database</b-button>
      <b-button block @click="fauxton">All FAUXTON tasks</b-button>

      <div v-if="optionSelected === 'Create a database backup'">
        <h2>Create a database backup</h2>
        <b-form-group>
          <h5>Select the database to backup</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.utils.copyBusy" class="m-1" @click="doCreateBackup">Start backup</b-button>
        <b-button v-if="!$store.state.utils.copyBusy" class="m-1" @click="cancel" variant="outline-primary">Return</b-button>
      </div>

      <div v-if="optionSelected === 'Restore a database from backup'">
        <h2>Restore a database from backup</h2>
        <b-form-group>
          <h5>Select the database to restore</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <p>Database {{ dbToReplace }} will be replaced by the backup</p>
        <b-button v-if="!$store.state.utils.copyBusy" class="m-1" @click="doRestoreBackup">Start restore</b-button>
        <b-button v-if="canCancel" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
      </div>

      <div v-if="optionSelected === 'Create a new database'">
        <h2>Create a new database</h2>
        <h4>Enter a name following these rules:</h4>
        <ul>
          <li>Name must begin with a lowercase letter (a-z)</li>
          <li>Lowercase characters (a-z)</li>
          <li>Digits (0-9)</li>
          <li>Any of the characters _, $, (, ), +, -, and /</li>
          <li>A database with this name must not already exist</li>
        </ul>
        <b-form-input v-model="newDbName" placeholder="Enter the database name"></b-form-input>
        <b-button v-if="newDbName === ''" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <div v-if="newDbName !== ''">
          <p>Database {{ newDbName }} will be created</p>
          <b-button v-if="!$store.state.isDatabaseCreated" class="m-1" @click="doCreateDatabase">Start creation</b-button>
          <b-button class="m-1" @click="cancel" variant="outline-primary">Return</b-button>
        </div>
      </div>

      <div v-if="optionSelected === 'Purge removed documents and compact the database'">
        <h2>Select a database</h2>
        <b-form-group>
          <h5>Select the database you want removed documents to be purged</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.isPurgeReady" class="m-1" @click="doPurgeDb">Purge removed documents and compact the database</b-button>
        <b-button v-if="!$store.state.isPurgeReady" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isPurgeReady">
          <h4>Succes! The purge is ready</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Change my default database to any available database'">
        <h2>Change my default database to any available database</h2>
        <b-form-group>
          <h5>Select the database you want to connect to</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="doChangeMyDb">Change my database</b-button>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isCurrentDbChanged">
          <h4>Succes! Sign-out and -in to see the product view of the {{ $store.state.selectedDatabaseName }} database</h4>
          <div>
            <b-button class="m-1" @click="signIn()">Exit</b-button>
          </div>
        </div>
      </div>

      <div v-if="optionSelected === 'Remove history and comments'">
        <h2>Remove history and comments</h2>
        <b-form-group>
          <h5>Select the database you want to reset the history and comments</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-row class="my-1">
          <b-col sm="1">
            When created
          </b-col>
          <b-col sm="1">
            <b-form-input v-model="removeAge" type="number"></b-form-input>
          </b-col>
          <b-col sm="3">
            days ago or more (enter 0 to remove all)
          </b-col>
        </b-row>
        <b-button v-if="!$store.state.isHistAndCommReset" class="m-1" @click="doRemHistAndComm">Remove history and comments</b-button>
        <b-button v-if="!$store.state.isHistAndCommReset" class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <div v-if="$store.state.isHistAndCommReset">
          <h4>Succes! History and comments are removed</h4>
        </div>
        <div v-else>
          <h4 v-if="asyncFired">Please wait ... Failure? See the log</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Delete a database'">
        <h2>Delete a database</h2>
        <b-form-group>
          <h5>Select the database you want to delete</h5>
          <b-form-radio-group
            v-model="$store.state.selectedDatabaseName"
            :options="$store.state.databaseOptions"
            stacked
          ></b-form-radio-group>
        </b-form-group>
        <b-button variant="danger" class="m-1" @click="doDeleteDb">Delete selected database</b-button>
        <b-button class="m-1" @click="cancel" variant="outline-primary">Return</b-button>
      </div>

      <div v-if="optionSelected === 'All FAUXTON tasks'">
        <h2>All FAUXTON tasks</h2>
        <h4>As server admin you have all other feautures available in FAUXTON, read the documentation</h4>
        <b-button class="m-1" @click="doFauxton">Start FAUXTON</b-button>
        <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
      </div>

      <p>{{ localMessage }}</p>
      <p class="colorRed">{{ $store.state.warning }}
      <div v-if="$store.state.backendMessages.length > 0">
        <hr>
        <div v-for="item in $store.state.backendMessages" :key="item.seqKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
    </b-container>
  </div>
</template>

<script>
import AppHeader from '../header/header.vue'
import router from '../../router'

const baseURL = 'https://onebacklog.net:6984/'
const BACKUPSONLY = 1
const ALLBUTSYSTEM = 2
const ALLBUTSYSTEMANDBACKUPS = 3

export default {
  data() {
    return {
      optionSelected: 'select a task',
      canCancel: true,
      asyncFired: false,
      localMessage: '',
      fauxtonStarted: false,
      dbToOverwrite: '',
      newDbName: '',
      productName: '',
      removeAge: 365
    }
  },

  mounted() {
    this.$store.state.backendMessages = []
  },

  computed: {
    dbToReplace() {
      return this.$store.state.selectedDatabaseName.slice(0, this.$store.state.selectedDatabaseName.indexOf('-backup-'))
    }
  },

  methods: {
    createBackup() {
      this.optionSelected = 'Create a database backup'
      this.canCancel = true
      this.localMessage = ''
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doCreateBackup() {
      function createBackupName(dbName) {
        const now = new Date()
        const yyyy = now.getFullYear().toString()
        let mm = (now.getMonth() + 1).toString()
        if (mm.length < 2) mm = '0'.concat(mm)
        let dd = now.getDate().toString()
        if (dd.length < 2) dd = '0'.concat(dd)
        let hh = now.getHours().toString()
        if (hh.length < 2) hh = '0'.concat(hh)
        let min = now.getMinutes().toString()
        if (min.length < 2) min = '0'.concat(min)
        return dbName.concat('-backup-').concat(yyyy).concat(mm).concat(dd).concat('_').concat(hh).concat('_').concat(min)
      }
      this.canCancel = false
      const payload = {
        dbSourceName: this.$store.state.selectedDatabaseName,
        dbTargetName: createBackupName(this.$store.state.selectedDatabaseName)
      }
      this.localMessage = this.$store.state.selectedDatabaseName + ' will be copied to ' + payload.dbTargetName + '. Please wait ...'
      this.$store.dispatch('copyDB', payload)
    },

    restoreBackup() {
      this.optionSelected = 'Restore a database from backup'
      this.newDbName = ''
      this.canCancel = true
      this.localMessage = ''
      this.$store.dispatch('getAllDatabases', BACKUPSONLY)
    },

    doRestoreBackup() {
      const payload = {
        dbSourceName: this.$store.state.selectedDatabaseName,
        dbTargetName: this.dbToReplace
      }
      this.localMessage = payload.dbTargetName + ' will be replaced by ' + payload.dbSourceName + '. Please wait ...'
      this.$store.dispatch('overwriteDB', payload)
    },

    createNewDb() {
      this.optionSelected = 'Create a new database'
      this.canCancel = true
      this.localMessage = ''
      this.newDbName = ''
      this.$store.state.isDatabaseCreated = false
    },

    doCreateDatabase() {
      const payload = {
        dbName: this.newDbName,
        email: this.$store.state.userData.email,
        createUser: false
      }
      this.$store.dispatch('createDatabase', payload)
    },

    changeMyDb() {
      this.optionSelected = 'Change my default database to any available database'
      this.localMessage = ''
      this.$store.state.isCurrentDbChanged = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doChangeMyDb() {
      this.$store.dispatch('changeCurrentDb', this.$store.state.selectedDatabaseName)
    },

    purgeDb() {
      this.optionSelected = 'Purge removed documents and compact the database'
      this.localMessage = ''
      this.$store.state.isPurgeReady = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doPurgeDb() {
      this.$store.dispatch('collectRemoved', this.$store.state.selectedDatabaseName)
    },

    remHistAndComm() {
      this.asyncFired = false
      this.optionSelected = 'Remove history and comments'
      this.localMessage = ''
      this.$store.state.isHistAndCommReset = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEMANDBACKUPS)
    },

    doRemHistAndComm() {
      this.asyncFired = true
      this.$store.dispatch('remHistAndCommAsync', { dbName: this.$store.state.selectedDatabaseName, age: this.removeAge })
    },

    deleteDb() {
      this.optionSelected = 'Delete a database'
      this.localMessage = ''
      this.$store.state.selectedDatabaseName = ''
      // get all non sytem databases
      this.$store.dispatch('getAllDatabases', ALLBUTSYSTEM)
    },

    doDeleteDb() {
      if (this.$store.state.userData.currentDb !== this.$store.state.selectedDatabaseName) {
        this.$store.dispatch('deleteDb', this.$store.state.selectedDatabaseName)
      } else this.localMessage = 'Cannot delete your current database'
    },

    fauxton() {
      this.fauxtonStarted = false
      this.optionSelected = 'All FAUXTON tasks'
    },

    doFauxton() {
      window.open(baseURL + '_utils/#/documentation', '_blank')
      this.fauxtonStarted = true
    },

    cancel() {
      this.localMessage = ''
      this.$store.state.backendMessages = []
      this.optionSelected = 'select a task'
    },

    signIn() {
      this.$store.commit('resetData', null, { root: true })
      router.replace('/')
    }
  },

  components: {
    'app-header': AppHeader
  }
}
</script>

<style lang="css" scoped>
h4 {
  margin-top: 20px;
}
.colorRed {
  color: red;
}
</style>
