<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="maintainUsers()">Maintain users</b-dropdown-item>
                <b-dropdown-item @click="maintainDataBases()">Maintain databases</b-dropdown-item>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item @click="fauxton()">All other FAUXTON tasks</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 1">
        <h4>As server admin you can maintain the globally (for all databases) defined users in FAUXTON</h4>
        <b-button class="m-1" @click="doMaintainUsers()">Start FAUXTON</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
    </div>
    <div v-if="actionNr === 2">
        <h4>As server admin you can create and delete databases in FAUXTON</h4>
        <b-button class="m-1" @click="doMaintainDataBases()">Start FAUXTON</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
    </div>
    <div v-if="actionNr === 3">
        <h4>As server admin you have all other feautures available in FAUXTON, read the documentation</h4>
        <b-button class="m-1" @click="doFauxton()">Start FAUXTON</b-button>
        <b-button class="m-1" @click="cancel()" variant="outline-primary">Cancel</b-button>
        <h4 v-if="fauxtonStarted">FAUXTON has started in a new browser tab</h4>
    </div>
    <div v-else ></div>
  </div>
</template>

<script>
import Header from '../header/header.vue'

export default {
  data() {
    return {
      actionNr: 0,
      fauxtonStarted: false
    }
  },

  methods: {
    maintainUsers() {
      this.fauxtonStarted = false
      this.actionNr = 1
    },
    doMaintainUsers() {
      window.open('https://onebacklog.net:6984/_utils/#database/_users/_all_docs', '_blank')
      this.fauxtonStarted = true
    },

    maintainDataBases() {
      this.fauxtonStarted = false
      this.actionNr = 2
    },
    doMaintainDataBases() {
      window.open('https://onebacklog.net:6984/_utils/#/_all_dbs', '_blank')
      this.fauxtonStarted = true
    },

    fauxton() {
      this.fauxtonStarted = false
      this.actionNr = 3
    },
    doFauxton() {
      window.open('https://onebacklog.net:6984/_utils/#/documentation', '_blank')
      this.fauxtonStarted = true
    },

    cancel() {
      this.actionNr = 0
    }
  },

  components: {
    'app-header': Header
  }
}
</script>

<style lang="css" scoped>
h4 {
  margin-top: 20px;
}
</style>
