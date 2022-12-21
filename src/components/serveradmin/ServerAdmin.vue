<template>
  <div>
    <app-header></app-header>
    <b-container>
      <h2>Server admin view: {{ optionSelected }}</h2>
      <b-button block @click="viewLog">View the log</b-button>
      <b-button block @click="createBackup">Create a database backup</b-button>
      <b-button block @click="restoreBackup">Restore a database from backup</b-button>
      <b-button block @click="createNewDb">Create a new database</b-button>
      <b-button block @click="changeMyDb">Change my default database to any available database</b-button>
      <b-button block @click="purgeDb">Purge removed documents and compact the database</b-button>
      <b-button block variant="warning" @click="remHistAndComm">Remove history and comments</b-button>
      <b-button block variant="warning" @click="deleteDb">Delete a database</b-button>
      <b-button block @click="fauxton">All FAUXTON tasks</b-button>

      <div v-if="optionSelected === 'View the log'">
        <h2>View the log</h2>
        <b-form-group>
          <h5>Select the database to view the log</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <hr>
        <b-button v-if="!showLogModal" class="m-1" @click="doViewLog" variant="primary">Show</b-button>
        <b-button v-if="!showLogModal" class="m-1" @click="cancel">Return</b-button>
        <b-button v-else class="m-1" @click="cancel" variant="primary">Cancel</b-button>
        <b-modal v-model="showLogModal" size="lg" :title="logModalTitle()">
          <div v-for="item in $store.state.logEntries" :key="createLogKey(item.timestamp, item.sessionId, item.sessionSeq)">
            Event: {{ item.event }} <br />
            Severity: {{ severity(item.level) }} <br />
            By: {{ item.by }} <br />
            SessionId: {{ item.sessionId}} <br />
            Timestamp: {{ new Date(item.timestamp) }}
            <hr>
          </div>
        </b-modal>
      </div>

      <div v-if="optionSelected === 'Create a database backup'">
        <h2>Create a database backup</h2>
        <p>For real disaster protection consider to use a backup strategy as provided by your hosting partner.</p>
        <b-form-group>
          <h5>Select the database to backup</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <hr>
        <template v-if="!$store.state.utils.copyBusy">
          <b-button class="m-1" @click="doCreateBackup" variant="primary">Start backup</b-button>
          <b-button class="m-1" @click="cancel">Return</b-button>
        </template>
        <h5 v-else>Busy copying. Please wait...</h5>
      </div>

      <div v-if="optionSelected === 'Restore a database from backup'">
        <h2>Restore a database from backup</h2>
        <b-form-group>
          <h5>Select the database to restore</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <template v-if="$store.state.selectedDatabaseName !== 'not selected yet'">
          <p class="colorRed">Database '{{ dbToReplace }}' will be replaced by '{{ $store.state.selectedDatabaseName }}'. Make sure no users of this database are on-line right now.</p>
          <p class="colorRed" v-if="isCurrentDbSelected()">You are replacing your current database. When the restore is ready, you will be signed-out automatically.
          </p>
        </template>
        <hr>
        <b-button v-if="$store.state.selectedDatabaseName !== 'not selected yet' && !$store.state.utils.copyBusy" class="m-1" @click="doRestoreBackup" variant="primary">Start restore</b-button>
        <b-button v-if="!$store.state.utils.copyBusy" class="m-1" @click="cancel">Cancel</b-button>
        <h5 v-else>Busy copying. Please wait...</h5>

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
        <hr>
        <b-button v-if="newDbName === ''" class="m-1" @click="cancel">Cancel</b-button>
        <div v-else>
          <p>Database {{ newDbName }} will be created</p>
          <b-button v-if="!$store.state.isDatabaseCreated" class="m-1" @click="doCreateDatabase" variant="primary">Start creation</b-button>
          <b-button v-if="!$store.state.isDatabaseCreated" class="m-1" @click="cancel">Cancel</b-button>
          <b-button v-else class="m-1" @click="cancel" variant="primary">Return</b-button>
        </div>
      </div>

      <div v-if="optionSelected === 'Purge removed documents and compact the database'">
        <h2>Select a database</h2>
        <b-form-group>
          <h5>Select the database you want removed documents to be purged</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <hr>
        <b-button v-if="!$store.state.isPurgeReady" class="m-1" @click="doPurgeDb" variant="primary">Purge removed documents and compact the database</b-button>
        <b-button v-if="!$store.state.isPurgeReady" class="m-1" @click="cancel">Cancel</b-button>
        <b-button v-else class="m-1" @click="cancel" variant="primary">Return</b-button>
        <div v-if="$store.state.isPurgeReady">
          <h4>Success! The purge is ready</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Change my default database to any available database'">
        <h2>Change my default database to any available database</h2>
        <p>Use this option if you need to connect to a database that is not assigned to your profile</p>
        <b-form-group>
          <h5>Select the database you want to connect to</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <hr>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="doChangeMyDb" variant="primary">Change my database</b-button>
        <b-button v-if="!$store.state.isCurrentDbChanged" class="m-1" @click="cancel">Cancel</b-button>
        <b-button v-else class="m-1" @click="cancel" variant="primary">Return</b-button>
        <div v-if="$store.state.isCurrentDbChanged">
          <h4>Success! Click 'Exit' to sign-out. Sign-in to see the product details view of the '{{ $store.state.selectedDatabaseName }} 'database</h4>
          <div>
            <b-button class="m-1" @click="signOut()">Exit</b-button>
          </div>
        </div>
      </div>

      <div v-if="optionSelected === 'Remove history and comments'">
        <h2>Remove history and comments</h2>
        <b-form-group>
          <h5>Select the database you want to reset the history and comments</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <b-row class="my-1">
          <b-col sm="2">
            Remove when created
          </b-col>
          <b-col sm="2">
            <b-form-input v-model="removeAge" type="number"></b-form-input>
          </b-col>
          <b-col sm="8">
            days ago or more (enter 0 to remove all)
          </b-col>
        </b-row>
        <hr>
        <b-button v-if="!$store.state.isHistAndCommReset" class="m-1" @click="doRemHistAndComm" variant="primary">Remove history and comments</b-button>
        <b-button v-if="!$store.state.isHistAndCommReset" class="m-1" @click="cancel">Cancel</b-button>
        <b-button v-else class="m-1" @click="cancel" variant="primary">Return</b-button>
        <div v-if="$store.state.isHistAndCommReset">
          <h4>Success! History and comments are removed</h4>
        </div>
        <div v-else>
          <h4 v-if="asyncFired">Please wait ... Failure? See the log</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Delete a database'">
        <h2>Delete a database</h2>
        <b-form-group>
          <h5>Select the database you want to delete</h5>
          <b-form-radio-group v-model="$store.state.selectedDatabaseName" :options="$store.state.databaseOptions" stacked></b-form-radio-group>
        </b-form-group>
        <hr>
        <b-button v-if="$store.state.selectedDatabaseName" variant="danger" class="m-1" @click="doDeleteDb">Delete selected database</b-button>
        <b-button class="m-1" @click="cancel" variant="primary">Return</b-button>
      </div>

      <div v-if="optionSelected === 'All FAUXTON tasks'">
        <h2>All FAUXTON tasks</h2>
        <h4>As server admin you have all other feautures available in FAUXTON, read the documentation</h4>
        <hr>
        <b-button class="m-1" @click="doFauxton" variant="primary">Start FAUXTON</b-button>
        <b-button class="m-1" @click="cancel">Cancel</b-button>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
      </div>

      <hr>
      <p>{{ localMessage }}</p>
      <div v-if="$store.state.backendMessages.length > 0">
        <div v-for="item in $store.state.backendMessages" :key="item.seqKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
    </b-container>
  </div>
</template>

<script>
import { MISC } from '../../constants.js'
import AppHeader from '../header/Header-comp.vue'

export default {
  data() {
    return {
      optionSelected: 'Select a task',
      canCancel: true,
      asyncFired: false,
      localMessage: '',
      fauxtonStarted: false,
      dbToOverwrite: '',
      newDbName: '',
      productName: '',
      removeAge: 365,
      showLogModal: false
    }
  },

  /* Prevent accidental reloading of this page */
  beforeMount() {
    window.addEventListener("beforeunload", this.preventNav)
  },

  beforeUnmount() {
    window.removeEventListener("beforeunload", this.preventNav)
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
    preventNav(event) {
      event.preventDefault()
      event.returnValue = ""
    },

    logModalTitle() {
      return 'Log of database ' + this.$store.state.selectedDatabaseName
    },

    createLogKey(timestamp, sessionId, sessionSeq) {
      return timestamp + sessionId + sessionSeq
    },

		isCurrentDbSelected() {
      if (this.dbToReplace === this.$store.state.userData.currentDb) {
				this.$store.state.stopListeningForChanges = true
				// also stop the watchdog
				clearInterval(this.$store.state.logging.runningWatchdogId)
				return true
			}
			return false
    },

    severity(level) {
      let severity = ''
      switch (level) {
        case -1:
          severity = 'DEBUG'
          break
        case 0:
          severity = 'INFO'
          break
        case 1:
          severity = 'WARNING'
          break
        case 2:
          severity = 'ERROR'
          break
        case 3:
          severity = 'CRITICAL'
      }
      return severity
    },

    viewLog() {
      this.optionSelected = 'View the log'
      this.canCancel = true
      this.localMessage = ''
      this.showLogModal = false
      this.$store.state.isLogLoaded = false
      // get all non sytem & non backup databases
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doViewLog() {
      this.$store.state.isLogLoaded = false
      this.$store.dispatch('loadLog', { dbName: this.$store.state.selectedDatabaseName, onSuccessCallback: () => this.showLogModal = true })
    },

    createBackup() {
      this.optionSelected = 'Create a database backup'
      this.$store.state.utils.copyBusy = false
      this.canCancel = true
      this.localMessage = ''
      // get all non sytem & non backup databases
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
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
      this.$store.dispatch('copyDB', payload)
    },

    restoreBackup() {
      this.optionSelected = 'Restore a database from backup'
      this.$store.state.isRestoreReady = false
      this.$store.state.selectedDatabaseName = 'not selected yet'
      this.newDbName = ''
      this.localMessage = ''
      this.$store.dispatch('getDatabaseOptions', MISC.BACKUPSONLY)
    },

    doRestoreBackup() {
      const payload = {
        dbSourceName: this.$store.state.selectedDatabaseName,
        dbTargetName: this.dbToReplace,
        autoSignOut: this.isCurrentDbSelected(),
        reportRestoreSuccess: true
      }
      this.$store.dispatch('replaceDB', payload)
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
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doChangeMyDb() {
      const autoSignOut = false
      this.$store.dispatch('changeCurrentDb', { dbName: this.$store.state.selectedDatabaseName, autoSignOut })
    },

    purgeDb() {
      this.optionSelected = 'Purge removed documents and compact the database'
      this.localMessage = ''
      this.$store.state.isPurgeReady = false
      // get all non sytem but the _users database & non backup databases
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS)
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
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doRemHistAndComm() {
      this.asyncFired = true
      this.$store.dispatch('remHistAndCommAsync', { dbName: this.$store.state.selectedDatabaseName, age: this.removeAge })
    },

    deleteDb() {
      this.optionSelected = 'Delete a database'
      this.localMessage = ''
      this.$store.state.selectedDatabaseName = ''
      this.$store.state.isDbDeleted = false
      // get all non sytem databases
      this.$store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEM)
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
      window.open(process.env.VUE_APP_API_URL + '/_utils/#/documentation', '_blank')
      this.fauxtonStarted = true
    },

    cancel() {
      this.localMessage = ''
      this.$store.state.backendMessages = []
      this.optionSelected = 'Select a task'
    },

    signOut() {
      this.$store.commit('endSession', 'serveradmin')
    }
  },

  components: {
    'app-header': AppHeader
  }
}
</script>

<style scoped>
h4 {
  margin-top: 20px;
}
</style>
