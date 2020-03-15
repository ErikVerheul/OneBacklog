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
        <!-- view additions go in this slot -->
        <slot></slot>
        <b-navbar-nav v-if="$store.state.showHeaderDropDowns" class="ml-auto">
          <b-nav-item-dropdown text="Select your view" right>
            <b-dropdown-item to="../../detailProduct">Product details</b-dropdown-item>
            <b-dropdown-item to="../../coarseProduct">Products overview</b-dropdown-item>
            <b-dropdown-divider v-if="isAdmin || isServerAdmin"></b-dropdown-divider>
            <b-dropdown-item v-if="isAdmin" to="../../admin">Admin</b-dropdown-item>
            <b-dropdown-item v-if="isServerAdmin" to="../../serveradmin">Server admin</b-dropdown-item>
          </b-nav-item-dropdown>

          <b-nav-item-dropdown right>
            <!-- Using button-content slot -->
            <template slot="button-content">
              <em>User</em>
            </template>
            <b-dropdown-item v-if="!isAuthenticated">No options here when not signed in</b-dropdown-item>
            <b-dropdown-item
              v-if="isAuthenticated && $store.state.userData.myDatabases.length > 1"
              @click="changeDatabase"
            >Change database</b-dropdown-item>
            <template v-if="isAuthenticated">
              <b-dropdown-item @click="changeTeam">Change team</b-dropdown-item>
              <b-dropdown-item
                v-if="$store.state.currentView !== 'reqarea' && $store.state.userData.userAssignedProductIds.length > 1"
                @click="selectProducts"
              >Select products</b-dropdown-item>
            </template>
            <b-dropdown-item v-if="isAuthenticated" @click="changePassword">Change password</b-dropdown-item>
            <b-dropdown-item v-b-modal.licence-modal>Licence information</b-dropdown-item>
            <b-dropdown-item v-if="isAuthenticated" @click="onSignout">Sign Out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <appLicence>
      <slot name="licence"></slot>
    </appLicence>

    <b-modal size="lg" ref="changeDatabaseRef" @ok="doChangeDatabase" title="Change your database">
      <b-container align-v="true">
        <h5>Select another database. Your current database is '{{ $store.state.userData.currentDb }}'</h5>
        <b-form-group>
          <b-form-radio-group
            v-model="myDatabase"
            :options="databaseOptions"
            name="databaseOptions"
          ></b-form-radio-group>
        </b-form-group>
        <p>After you have changed the database Sign-out and -in again to connect to the selected database</p>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="changeTeamRef" @ok="doChangeTeam" title="Change your team">
      <b-container align-v="true">
        <h5>Select your new team. Your current team is '{{ $store.state.userData.myTeam }}'</h5>
        <b-form-group>
          <b-form-radio-group v-model="myTeam" :options="teamOptions" name="teamOptions"></b-form-radio-group>
        </b-form-group>
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
          size="sm"
          v-model="selectedProducts"
          :options="$store.state.myProductOptions"
          multiple
          :select-size="$store.state.myProductOptions.length"
        ></b-form-select>
      </b-container>
    </b-modal>

    <b-modal
      size="lg"
      ref="selectDefaultProductRef"
      @ok="updateProductsSubscriptions"
      title="Select the default product you are working on"
    >
      <b-container align-v="true">
        <b-form-select
          v-model="newDefaultProductId"
          :options="defaultProductOptions"
          :select-size="defaultProductOptions.length"
        ></b-form-select>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="changePwRef" @ok="doChangePw" title="Change your password">
      <b-container align-v="true">
        <template v-if="isAuthenticated && $store.state.demo && $store.state.userData.user === 'demoUser'">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && $store.getters.isServerAdmin">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && $store.state.demo && $store.state.userData.user !== 'demoUser'">
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

<script src="./header.js"></script>

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
