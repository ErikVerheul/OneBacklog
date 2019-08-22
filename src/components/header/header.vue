<template>
  <div>
    <b-navbar toggleable="md" type="dark" variant="dark">
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <b-img class="logo" :src="require('../../assets/logo.png')" alt="OneBacklog logo" />
      <b-navbar-brand to="../../rel-notes">{{ appVersion }}</b-navbar-brand>
      <b-collapse is-nav id="nav_collapse">
        <b-navbar-nav>
          <b-nav-item to="../../userguide">User guide</b-nav-item>
        </b-navbar-nav>
        <b-dropdown split class="m-2" @click="clearFilterEvent()">
          <template slot="button-content">{{ $store.state.filterText }}</template>
          <b-dropdown-item @click="filterSinceEvent(10)">Changes &lt; 10 min.</b-dropdown-item>
          <b-dropdown-item @click="filterSinceEvent(60)">Changes last hour</b-dropdown-item>
          <b-dropdown-item @click="filterSinceEvent(1440)">Changes last 24 hrs.</b-dropdown-item>
        </b-dropdown>
        <!-- Right aligned nav items -->
        <b-navbar-nav class="ml-auto">
          <b-nav-form>
            <b-form-input
              id="searchInput"
              v-model="$store.state.keyword"
              class="m-2"
              placeholder="Enter a key word"
            />
            <b-button
              id="searchBtn"
              type="button"
              class="m-2"
              @click="showSelectionOrClearEvent()"
            >{{ $store.state.searchText }}</b-button>
          </b-nav-form>
          <b-nav-item-dropdown text="Select your view" right>
            <b-dropdown-item to="../../product">Products</b-dropdown-item>
            <b-dropdown-item to="../../reqsarea">Requirement areas</b-dropdown-item>
            <b-dropdown-item v-if="serverAdmin" to="../../setup">Setup</b-dropdown-item>
          </b-nav-item-dropdown>

          <b-nav-item-dropdown right>
            <!-- Using button-content slot -->
            <template slot="button-content">
              <em>User</em>
            </template>
            <b-dropdown-item v-if="!auth">No options here when not signed in</b-dropdown-item>
            <b-dropdown-item
              v-if="auth && this.$store.state.load.myTeams.length > 1"
              @click="changeTeam"
            >Change team</b-dropdown-item>
            <b-dropdown-item
              v-if="auth && this.$store.state.load.userAssignedProductIds.length > 1"
              @click="selectProducts"
            >Select products</b-dropdown-item>
            <b-dropdown-item v-if="auth" @click="changePassword">Change password</b-dropdown-item>
            <b-dropdown-item v-b-modal.licence-modal>Licence information</b-dropdown-item>
            <b-dropdown-item v-if="auth" @click="onSignout">Sign Out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <appLicence>
      <slot name="licence"></slot>
    </appLicence>

    <b-modal size="lg" ref="changeTeamRef" @ok="doChangeTeam" title="Change your team">
      <b-container align-v="true">
        <h1>Not in MVP</h1>
      </b-container>
    </b-modal>

    <b-modal
      size="lg"
      ref="selectProductsRef"
      @ok="doSelectProducts"
      title="Select one or more (hold shift or Ctrl) products to be loaded at sign-in"
    >
      <b-container align-v="true">
        <b-form-select
          v-model="selectedProducts"
          :options="$store.state.load.myProductOptions"
          multiple
          :select-size="$store.state.load.myProductOptions.length"
        ></b-form-select>
      </b-container>
    </b-modal>

    <b-modal
      size="lg"
      ref="selectDefaultProductRef"
      @ok="updateProductsSubscription"
      title="Select the default product you are working on"
    >
      <b-container align-v="true">
        <b-form-select
          v-model="defaultProductId"
          :options="defaultProductOptions"
          :select-size="defaultProductOptions.length"
        ></b-form-select>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="changePwRef" @ok="doChangePw" title="Change your password">
      <b-container align-v="true">
        <template v-if="auth && $store.state.demo && $store.state.user === 'demoUser'">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="auth && this.$store.getters.isServerAdmin">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="auth && $store.state.demo && $store.state.user !== 'demoUser'">
          <b-row class="my-1">
            <b-card bg-variant="light">
              <b-form-group
                label-cols-lg="5"
                label="The new password must have 8 or more characters"
                label-size="lg"
                label-class="font-weight-bold pt-0"
                class="mb-0"
              >
                <b-form-group
                  label-cols-sm="5"
                  label="Current password:"
                  label-align-sm="right"
                  label-for="currentPW"
                >
                  <b-form-input v-model="oldPassword" id="currentPW" type="password"></b-form-input>
                </b-form-group>
                <b-form-group
                  label-cols-sm="5"
                  label="New password:"
                  label-align-sm="right"
                  label-for="newPW1"
                >
                  <b-form-input v-model="newPassword1" id="newPW1" type="password"></b-form-input>
                </b-form-group>
                <b-form-group
                  label-cols-sm="5"
                  label="Retype new password:"
                  label-align-sm="right"
                  label-for="newPW2"
                >
                  <b-form-input v-model="newPassword2" id="newPW2" type="password"></b-form-input>
                </b-form-group>
              </b-form-group>
            </b-card>
          </b-row>
        </template>
      </b-container>
    </b-modal>
  </div>
</template>


<script>
import licence from "./licence.vue";

export default {
  data() {
    return {
      appVersion: "OneBackLog v.0.5.5",
      eventBgColor: "#408FAE",
      oldPassword: "",
      newPassword1: "",
      newPassword2: "",
      selectedProducts: this.$store.state.load.myProductSubscriptions,
      defaultProductId: undefined,
      defaultProductOptions: []
    };
  },
  mounted() {
    // Add tag when DEMO version
    if (this.$store.state.demo) this.appVersion = this.appVersion + " DEMO";
    // fire the search button on pressing enter in the one and only input field (instead of submitting the form)
    document
      .getElementById("searchInput")
      .addEventListener("keypress", function (event) {
        if (event.keyCode === 13) {
          event.preventDefault()
          document.getElementById("searchBtn").click()
        }
      })
  },
  computed: {
    auth() {
      return this.$store.getters.isAuthenticated
    },
    serverAdmin() {
      return (
        this.$store.getters.isAuthenticated && this.$store.getters.isServerAdmin
      );
    }
  },
  methods: {
    filterSinceEvent(val) {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters("filterSinceEvent")
      }
      window.slVueTree.filterSince(val);
    },

    showSelectionOrClearEvent() {
      if (this.$store.state.keyword !== "") {
        window.slVueTree.filterOnKeyword()
      } else {
        // reset selection on empty input if selection is on
        if (this.$store.state.searchOn) {
          window.slVueTree.resetFilters("showSelectionOrClearEvent")
        }
      }
    },

    clearFilterEvent() {
      if (this.$store.state.filterOn) {
        window.slVueTree.resetFilters("clearFilterEvent")
      }
    },

    changeTeam() {
      this.$refs.changeTeamRef.show()
    },
    selectProducts() {
      this.$refs.selectProductsRef.show()
    },
    changePassword() {
      if (this.$store.getters.isServerAdmin)
        alert(
          "As a 'server admin' you cannot change your password here. Use Fauxton instead"
        );
      else {
        this.$refs.changePwRef.show()
      }
    },

    doChangeTeam() { },

    /* Return if nothing is selected; set default product if 1 is selected; call selectDefaultProductRef if > 1 is selected */
    doSelectProducts() {
      if (this.selectedProducts.length === 0) {
        return
      }

      this.defaultProductOptions = []
      if (this.selectedProducts.length === 1) {
        // if just 1 product is selected that product is the default
        this.defaultProductId = this.selectedProducts[0]
        this.$store.dispatch('updateSubscriptions',  [this.defaultProductId])
      } else {
        for (let i = 0; i < this.$store.state.load.myProductOptions.length; i++) {
          if (this.selectedProducts.includes(this.$store.state.load.myProductOptions[i].value)) {
            this.defaultProductOptions.push(this.$store.state.load.myProductOptions[i])
          }
        }
        this.$refs.selectDefaultProductRef.show()
      }
    },

    /* Update the subscriptions array of this user */
    updateProductsSubscription() {
      let myNewProductSubscriptions = []
      // the first (index 0) product is by definition the default product
      myNewProductSubscriptions.push(this.defaultProductId)
      for (let i = 0; i < this.selectedProducts.length; i++) {
        if (this.selectedProducts[i] !== this.defaultProductId) {
          myNewProductSubscriptions.push(this.selectedProducts[i])
        }
      }
      this.$store.dispatch('updateSubscriptions', myNewProductSubscriptions)
    },

    doChangePw() {
      /* A direct replacement for Java’s String.hashCode() method implemented in Javascript */
      function hashCode(s) {
        var hash = 0, i, chr
        if (s.length === 0) return hash
        for (i = 0; i < s.length; i++) {
          chr = s.charCodeAt(i)
          hash = ((hash << 5) - hash) + chr;
          hash |= 0 // Convert to 32bit integer
        }
        return hash
      }

      if (hashCode(this.oldPassword) !== this.$store.state.passwordHash) {
        alert(
          "Your current password is incorrect. Please try again."
        )
        return
      }
      if (this.newPassword1 !== this.newPassword2) {
        alert(
          "You entered two differen new passwords. Please try again."
        )
        return
      }
      if (this.newPassword1.length < 8) {
        alert(
          "Your new password must be 8 characters or longer. Please try again."
        )
        return
      }
      this.$store.dispatch('changePassword', this.newPassword1)
    },

    onSignout() {
      this.$store.dispatch("signout");
    }
  },
  components: {
    appLicence: licence
  }
};
</script>

<style scoped>
.input-field {
  margin: 10px;
}

.logo {
  width: 62px;
  margin-right: 10px;
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
  color: #408fae;
}

li a:hover,
li a:active,
li a.router-link-active {
  color: #004466;
}
</style>
