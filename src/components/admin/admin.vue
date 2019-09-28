<template lang="html">
  <div>
    <app-header>
        <b-navbar-nav class="ml-auto">
            <b-dropdown text="Select your action" class="m-md-2">
                <b-dropdown-item @click="createUser">Create a user</b-dropdown-item>
                <b-dropdown-item @click="maintainUser">Maintain users</b-dropdown-item>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item @click="createTeam">Create a team</b-dropdown-item>
                <b-dropdown-item @click="maintainTeam">Maintain teams</b-dropdown-item>
            </b-dropdown>
        </b-navbar-nav>
    </app-header>
    <div v-if="actionNr === 3">
      <h4>Create a team for any product within the current database '{{ $store.state.currentDb }}' by entering its name:</h4>
      <b-form-input v-model="teamName" placeholder="Enter the team name"></b-form-input>
      <b-button class="m-1" @click="doCreateTeam">Create this team</b-button>
      <b-button class="m-1" @click="cancel" variant="outline-primary">Cancel</b-button>
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
      teamName: "",

    }
  },

  methods: {
    createUser() {
      this.actionNr = 1
    },
    maintainUser() {
      this.actionNr = 2
    },
    createTeam() {
      this.actionNr = 3
    },
    doCreateTeam() {

    },
    maintainTeam() {
      this.actionNr = 4
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
