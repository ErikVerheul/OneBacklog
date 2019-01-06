<template>
  <b-navbar toggleable="md" type="dark" variant="dark">
    <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
    <b-navbar-brand href="https://verheulconsultants.nl">OneBacklog version 0.1.1</b-navbar-brand>
    <b-collapse is-nav id="nav_collapse">
      <b-navbar-nav>
        <b-nav-item href="#">User guide</b-nav-item>
      </b-navbar-nav>

      <b-nav-form>
        <b-form-input size="sm" class="mr-sm-2" type="text" placeholder="Search on key word"/>
        <b-button size="sm" class="my-2 my-sm-0" type="submit">Search</b-button>
      </b-nav-form>

      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto">
        <b-navbar-nav>
          <!-- ToDo: REVERSE THIS WHEN DONE WITH TESTING: <b-nav-item v-if="superAdmin"> -->
          <b-nav-item>
            <router-link to="/setup">Setup</router-link>
          </b-nav-item>
        </b-navbar-nav>

        <b-nav-item-dropdown text="Select your view" right>
          <b-dropdown-item to ="../../product">Products</b-dropdown-item>
          <b-dropdown-item to ="../../reqsarea">Requirement areas</b-dropdown-item>
          <b-dropdown-item to ="../../epic">Epics</b-dropdown-item>
          <b-dropdown-item to ="../../feature">Features</b-dropdown-item>
          <b-dropdown-item to ="../../pbi">Backlog items</b-dropdown-item>
        </b-nav-item-dropdown>

        <b-nav-item-dropdown right>
          <!-- Using button-content slot -->
          <template slot="button-content">
            <em>User</em>
          </template>
          <b-dropdown-item v-if="!auth">No options here when not signed in</b-dropdown-item>
          <b-dropdown-item v-if="auth" href="#">Change password</b-dropdown-item>
          <b-dropdown-item v-if="auth" @click="onLogout">Sign Out</b-dropdown-item>
        </b-nav-item-dropdown>
      </b-navbar-nav>
    </b-collapse>
  </b-navbar>
</template>

<script>
export default {
  computed: {
    auth () {
      return this.$store.getters.isAuthenticated
    },
    superAdmin () {
      return this.$store.getters.isAuthenticated && this.$store.getters.isSuperAdmin
    }
  },
  methods: {
    onLogout() {
      this.$store.dispatch('logout')
    }
  }
}
</script>

<style scoped>
#header {
  height: 56px;
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: center;
  background-color: #521751;
  padding: 0 20px;
}

.logo {
  font-weight: bold;
  color: white;
}

.logo a {
  text-decoration: none;
  color: white;
}

nav {
  height: 100%;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
  display: flex;
  flex-flow: row;
  align-items: center;
}

li {
  margin: 0 16px;
}

li a {
  text-decoration: none;
  color: lightblue;
}

li a:hover,
li a:active,
li a.router-link-active {
  color: #fa923f;
}

.logout {
  background-color: transparent;
  border: none;
  font: inherit;
  color: white;
  cursor: pointer;
}
</style>
