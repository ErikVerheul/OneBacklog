<template>
  <div>
    <app-header></app-header>
    <BContainer>
      <h2>Server admin view: {{ optionSelected }}</h2>
      <BButton block @click="viewLog">View the log</BButton>
      <BButton block @click="createBackup">Create a database backup</BButton>
      <BButton block @click="restoreBackup">Restore a database from backup</BButton>
      <BButton block @click="createNewDb">Create a new database</BButton>
      <BButton block @click="changeMyDb">Change my default database to any available database</BButton>
      <BButton block @click="purgeDb">Purge removed documents and compact the database</BButton>
      <BButton block variant="warning" @click="remHistAndComm">Remove history and comments</BButton>
      <BButton block variant="warning" @click="deleteDb">Delete a database</BButton>
      <BButton block @click="fauxton">All FAUXTON tasks</BButton>

      <div v-if="optionSelected === 'View the log'">
        <h2>View the log</h2>
        <BRow>
          <BCol>
            <BFormGroup>
              <h5>Select the database to view the log</h5>
              <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
                stacked></BFormRadioGroup>
            </BFormGroup>
          </BCol>
          <BCol>
            <h5>Select severity levels to show</h5>
            <div>
              <BFormCheckboxGroup v-model="selectedLogLevels" :options="options" stacked class="mb-3"
                value-field="item" text-field="name" disabled-field="notEnabled"></BFormCheckboxGroup>
            </div>
          </BCol>
        </BRow>
        <hr>
        <BButton v-if="!showLogModal" class="m-1" @click="doViewLog" variant="primary">Show</BButton>
        <BButton v-if="!showLogModal" class="m-1" @click="cancel">Return</BButton>
        <BButton v-else class="m-1" @click="cancel" variant="primary">Cancel</BButton>
        <BModal v-model="showLogModal" size="lg" :title="logModalTitle()">
          <div v-for="item in filtered(store.state.logEntries)"
            :key="createLogKey(item.timestamp, item.sessionId, item.sessionSeq)">
            Event: {{ item.event }} <br />
            Severity: {{ severity(item.level) }} <br />
            By: {{ item.by }} <br />
            SessionId: {{ item.sessionId }} <br />
            Timestamp: {{ new Date(item.timestamp) }}
            <template v-if="item.saveTime">
              <br />Save Time: {{ new Date(item.saveTime) }}
            </template>
            <hr>
          </div>
        </BModal>
      </div>

      <div v-if="optionSelected === 'Create a database backup'">
        <h2>Create a database backup</h2>
        <p>For real disaster protection consider to use a backup strategy as provided by your hosting partner.</p>
        <BFormGroup>
          <h5>Select the database to backup</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <hr>
        <template v-if="!store.state.utils.copyBusy">
          <BButton class="m-1" @click="doCreateBackup" variant="primary">Start backup</BButton>
          <BButton class="m-1" @click="cancel">Return</BButton>
        </template>
        <h5 v-else>Busy copying. Please wait...</h5>
      </div>

      <div v-if="optionSelected === 'Restore a database from backup'">
        <h2>Restore a database from backup</h2>
        <BFormGroup>
          <h5>Select the database to restore</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <template v-if="store.state.selectedDatabaseName !== 'not selected yet'">
          <p class="colorRed">Database '{{ dbToReplace }}' will be replaced by '{{ store.state.selectedDatabaseName }}'.
            Make sure no users of this database are on-line right now.</p>
          <p class="colorRed" v-if="isCurrentDbSelected()">You are replacing your current database. When the restore is
            ready, you will be signed-out automatically.
          </p>
        </template>
        <hr>
        <BButton v-if="store.state.selectedDatabaseName !== 'not selected yet' && !store.state.utils.copyBusy"
          class="m-1" @click="doRestoreBackup" variant="primary">Start restore</BButton>
        <BButton v-if="!store.state.utils.copyBusy" class="m-1" @click="cancel">Cancel</BButton>
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
        <BFormInput v-model="newDbName" placeholder="Enter the database name"></BFormInput>
        <hr>
        <BButton v-if="newDbName === ''" class="m-1" @click="cancel">Cancel</BButton>
        <div v-else>
          <p>Database {{ newDbName }} will be created</p>
          <BButton v-if="!store.state.isDatabaseCreated" class="m-1" @click="doCreateDatabase" variant="primary">Start
            creation</BButton>
          <BButton v-if="!store.state.isDatabaseCreated" class="m-1" @click="cancel">Cancel</BButton>
          <BButton v-else class="m-1" @click="cancel" variant="primary">Return</BButton>
        </div>
      </div>

      <div v-if="optionSelected === 'Purge removed documents and compact the database'">
        <h2>Select a database</h2>
        <BFormGroup>
          <h5>Select the database you want removed documents to be purged</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <hr>
        <BButton v-if="!store.state.isPurgeReady" class="m-1" @click="doPurgeDb" variant="primary">Purge removed
          documents and compact the database</BButton>
        <BButton v-if="!store.state.isPurgeReady" class="m-1" @click="cancel">Cancel</BButton>
        <BButton v-else class="m-1" @click="cancel" variant="primary">Return</BButton>
        <div v-if="store.state.isPurgeReady">
          <h4>Success! The purge is ready</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Change my default database to any available database'">
        <h2>Change my default database to any available database</h2>
        <p>Use this option if you need to connect to a database that is not assigned to your profile</p>
        <BFormGroup>
          <h5>Select the database you want to connect to</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <hr>
        <BButton v-if="!store.state.isCurrentDbChanged" class="m-1" @click="doChangeMyDb" variant="primary">Change my
          database</BButton>
        <BButton v-if="!store.state.isCurrentDbChanged" class="m-1" @click="cancel">Cancel</BButton>
        <BButton v-else class="m-1" @click="cancel" variant="primary">Return</BButton>
        <div v-if="store.state.isCurrentDbChanged">
          <h4>Success! Click 'Exit' to sign-out. Sign-in to see the product details view of the '{{
            store.state.selectedDatabaseName }} 'database</h4>
          <div>
            <BButton class="m-1" @click="signOut()">Exit</BButton>
          </div>
        </div>
      </div>

      <div v-if="optionSelected === 'Remove history and comments'">
        <h2>Remove history and comments</h2>
        <BFormGroup>
          <h5>Select the database you want to reset the history and comments</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <BRow class="my-1">
          <BCol sm="2">
            Remove when created
          </BCol>
          <BCol sm="2">
            <BFormInput v-model="removeAge" type="number"></BFormInput>
          </BCol>
          <BCol sm="8">
            days ago or more (enter 0 to remove all)
          </BCol>
        </BRow>
        <hr>
        <BButton v-if="!store.state.isHistAndCommReset" class="m-1" @click="doRemHistAndComm" variant="primary">Remove
          history and comments</BButton>
        <BButton v-if="!store.state.isHistAndCommReset" class="m-1" @click="cancel">Cancel</BButton>
        <BButton v-else class="m-1" @click="cancel" variant="primary">Return</BButton>
        <div v-if="store.state.isHistAndCommReset">
          <h4>Success! History and comments are removed</h4>
        </div>
        <div v-else>
          <h4 v-if="asyncFired">Please wait ... Failure? See the log</h4>
        </div>
      </div>

      <div v-if="optionSelected === 'Delete a database'">
        <h2>Delete a database</h2>
        <BFormGroup>
          <h5>Select the database you want to delete</h5>
          <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions"
            stacked></BFormRadioGroup>
        </BFormGroup>
        <hr>
        <BButton v-if="store.state.selectedDatabaseName" variant="danger" class="m-1" @click="doDeleteDb">Delete
          selected database</BButton>
        <BButton class="m-1" @click="cancel" variant="primary">Return</BButton>
      </div>

      <div v-if="optionSelected === 'All FAUXTON tasks'">
        <h2>All FAUXTON tasks</h2>
        <h4>As server admin you have all other feautures available in FAUXTON, read the documentation</h4>
        <hr>
        <BButton class="m-1" @click="doFauxton" variant="primary">Start FAUXTON</BButton>
        <BButton class="m-1" @click="cancel">Cancel</BButton>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
      </div>

      <hr>
      <p>{{ localMessage }}</p>
      <div v-if="store.state.backendMessages.length > 0">
        <div v-for="item in store.state.backendMessages" :key="item.seqKey">
          <p>{{ item.msg }}</p>
        </div>
      </div>
    </BContainer>
  </div>
</template>

<script>
import { SEV, MISC } from '../../constants.js'
import AppHeader from '../header/header.vue'
import store from '../../store/store.js'

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
      showLogModal: false,
      selectedLogLevels: [0, 1, 2, 3],
      options: [
        { item: SEV.DEBUG, name: 'DEBUG' },
        { item: SEV.INFO, name: 'INFO' },
        { item: SEV.WARNING, name: 'WARNING' },
        { item: SEV.ERROR, name: 'ERROR' },
        { item: SEV.CRITICAL, name: 'CRITICAL', notEnabled: true },
      ]
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
    store.state.backendMessages = []
  },

  computed: {
    dbToReplace() {
      return store.state.selectedDatabaseName.slice(0, store.state.selectedDatabaseName.indexOf('-backup-'))
    }
  },

  methods: {
    preventNav(event) {
      event.preventDefault()
      event.returnValue = ""
    },

    logModalTitle() {
      return 'Log of database ' + store.state.selectedDatabaseName
    },

    createLogKey(timestamp, sessionId, sessionSeq) {
      return timestamp + sessionId + sessionSeq
    },

    isCurrentDbSelected() {
      if (this.dbToReplace === store.state.userData.currentDb) {
        // will be set to false when automatically signed-out after database change
        store.state.stopListeningForChanges = true
        // also stop the watchdog
        clearInterval(store.state.watchdog.runningWatchdogId)
        return true
      }
      return false
    },

    severity(level) {
      let severity = ''
      switch (level) {
        case SEV.DEBUG:
          severity = 'DEBUG'
          break
        case SEV.INFO:
          severity = 'INFO'
          break
        case SEV.WARNING:
          severity = 'WARNING'
          break
        case SEV.ERROR:
          severity = 'ERROR'
          break
        case SEV.CRITICAL:
          severity = 'CRITICAL'
      }
      return severity
    },

    filtered(logEntries) {
      return logEntries.filter(e => this.selectedLogLevels.includes(e.level))
    },

    viewLog() {
      this.optionSelected = 'View the log'
      this.canCancel = true
      this.localMessage = ''
      this.showLogModal = false
      store.state.isLogLoaded = false
      // get all non sytem & non backup databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doViewLog() {
      store.state.isLogLoaded = false
      store.dispatch('loadLog', { dbName: store.state.selectedDatabaseName, onSuccessCallback: () => this.showLogModal = true })
    },

    createBackup() {
      this.optionSelected = 'Create a database backup'
      store.state.utils.copyBusy = false
      this.canCancel = true
      this.localMessage = ''
      // get all non sytem & non backup databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
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
        dbSourceName: store.state.selectedDatabaseName,
        dbTargetName: createBackupName(store.state.selectedDatabaseName)
      }
      store.dispatch('copyDB', payload)
    },

    restoreBackup() {
      this.optionSelected = 'Restore a database from backup'
      store.state.isRestoreReady = false
      store.state.selectedDatabaseName = 'not selected yet'
      this.newDbName = ''
      this.localMessage = ''
      store.dispatch('getDatabaseOptions', MISC.BACKUPSONLY)
    },

    doRestoreBackup() {
      const payload = {
        dbSourceName: store.state.selectedDatabaseName,
        dbTargetName: this.dbToReplace,
        autoSignOut: this.isCurrentDbSelected(),
        reportRestoreSuccess: true
      }
      store.dispatch('replaceDB', payload)
    },

    createNewDb() {
      this.optionSelected = 'Create a new database'
      this.canCancel = true
      this.localMessage = ''
      this.newDbName = ''
      store.state.isDatabaseCreated = false
    },

    doCreateDatabase() {
      const payload = {
        dbName: this.newDbName,
        email: store.state.userData.email,
        createUser: false
      }
      store.dispatch('createDatabase', payload)
    },

    changeMyDb() {
      this.optionSelected = 'Change my default database to any available database'
      this.localMessage = ''
      store.state.isCurrentDbChanged = false
      // get all non sytem & non backup databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doChangeMyDb() {
      const autoSignOut = false
      store.dispatch('changeCurrentDb', { dbName: store.state.selectedDatabaseName, autoSignOut })
    },

    purgeDb() {
      this.optionSelected = 'Purge removed documents and compact the database'
      this.localMessage = ''
      store.state.isPurgeReady = false
      // get all non sytem but the _users database & non backup databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS)
    },

    doPurgeDb() {
      store.dispatch('collectRemoved', store.state.selectedDatabaseName)
    },

    remHistAndComm() {
      this.asyncFired = false
      this.optionSelected = 'Remove history and comments'
      this.localMessage = ''
      store.state.isHistAndCommReset = false
      // get all non sytem & non backup databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEMANDBACKUPS)
    },

    doRemHistAndComm() {
      this.asyncFired = true
      store.dispatch('remHistAndCommAsync', { dbName: store.state.selectedDatabaseName, age: this.removeAge })
    },

    deleteDb() {
      this.optionSelected = 'Delete a database'
      this.localMessage = ''
      store.state.selectedDatabaseName = ''
      store.state.isDbDeleted = false
      // get all non sytem databases
      store.dispatch('getDatabaseOptions', MISC.ALLBUTSYSTEM)
    },

    doDeleteDb() {
      if (store.state.userData.currentDb !== store.state.selectedDatabaseName) {
        store.dispatch('deleteDb', store.state.selectedDatabaseName)
      } else this.localMessage = 'Cannot delete your current database'
    },

    fauxton() {
      this.fauxtonStarted = false
      this.optionSelected = 'All FAUXTON tasks'
    },

    doFauxton() {
      window.open(import.meta.env.VITE_API_URL + '/_utils/#/documentation', '_blank')
      this.fauxtonStarted = true
    },

    cancel() {
      this.localMessage = ''
      store.state.backendMessages = []
      this.optionSelected = 'Select a task'
    },

    signOut() {
      store.commit('endSession', 'serveradmin')
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
