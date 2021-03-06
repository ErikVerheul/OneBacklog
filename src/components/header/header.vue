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
        <!-- app-header additions go in this slot -->
        <slot></slot>
        <b-navbar-nav v-if="$store.state.showHeaderDropDowns" class="ml-auto">
          <b-nav-item-dropdown text="Select your view" right>
            <b-dropdown-item to="../../detailProduct">Product details</b-dropdown-item>
            <b-dropdown-item to="../../coarseProduct">Products overview</b-dropdown-item>
            <b-dropdown-item to="../../board">Planning board</b-dropdown-item>
            <b-dropdown-divider v-if="isAssistAdmin || isAdmin || isServerAdmin"></b-dropdown-divider>
            <b-dropdown-item v-if="isAssistAdmin" to="../../assistadmin">AssistAdmin</b-dropdown-item>
						<b-dropdown-item v-if="isAdmin" to="../../admin">Admin</b-dropdown-item>
            <b-dropdown-item v-if="isServerAdmin" to="../../serveradmin">Server admin</b-dropdown-item>
          </b-nav-item-dropdown>

          <b-nav-item-dropdown right>
            <!-- Using button-content slot -->
            <template slot="button-content">
              <em>User</em>
            </template>

            <template v-if="isAuthenticated">
              <b-dropdown-item v-if="!isPlanningBoardSelected && $store.state.myAssignedDatabases.length > 1" @click="changeDatabase">Change database
              </b-dropdown-item>
              <b-dropdown-item @click="changeTeam">Change team</b-dropdown-item>
              <b-dropdown-item v-if="getMyAssignedProductIds.length > 1" @click="selectProducts">Select products</b-dropdown-item>
              <b-dropdown-item @click="changeMyPassword">Change password</b-dropdown-item>
              <b-dropdown-item @click="showMyRoles">My authorizations</b-dropdown-item>
            </template>
            <b-dropdown-item v-else>No options here when not authenticated</b-dropdown-item>

            <b-dropdown-item v-b-modal.licence-modal>Licence information</b-dropdown-item>
            <b-dropdown-item @click="onSignout">Sign Out</b-dropdown-item>
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
          <b-form-radio-group v-model="headerMyDatabase" :options="headerDatabaseOptions" name="headerDatabaseOptions"></b-form-radio-group>
        </b-form-group>
        <p>After you have changed the database you will be signed-out. Sign-in again to connect to the selected database</p>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="changeTeamRef" @ok="doChangeTeam" title="Change your team">
      <b-container align-v="true">
        <h5>Select your new team. Your current team is '{{ myTeam }}'</h5>
        <b-form-group>
          <b-form-radio-group v-model="selectedTeam" :options="teamOptions" name="teamOptions"></b-form-radio-group>
        </b-form-group>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="selectProductsRef" @ok="doSelectProducts" title="Select one or more (hold shift or Ctrl) products to be loaded">
      <b-container align-v="true">
        <b-form-select size="sm" v-model="selectedProducts" :options="$store.state.myProductOptions" multiple :select-size="$store.state.myProductOptions.length"></b-form-select>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="selectDefaultProductRef" @ok="updateProductsSubscriptions" title="Select the default product you are working on">
      <b-container align-v="true">
        <b-form-select v-model="newDefaultProductId" :options="defaultProductOptions" :select-size="defaultProductOptions.length"></b-form-select>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="changePwRef" @ok="doChangeMyPassWord" title="Change your password">
      <b-container align-v="true">
        <template v-if="isAuthenticated && $store.state.demo && $store.state.userData.user === 'demoUser'">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && isServerAdmin">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && $store.state.demo && $store.state.userData.user !== 'demoUser'">
          <b-row class="my-1">
            <b-card bg-variant="light">
              <b-form-group label-cols-lg="5" label="The new password must have 8 or more characters" label-size="lg" label-class="font-weight-bold pt-0" class="mb-0">
                <b-form-group label-cols-sm="5" label="Current password:" label-align-sm="right" label-for="currentPW">
                  <b-form-input v-model="oldPassword" id="currentPW" type="password"></b-form-input>
                </b-form-group>
                <b-form-group label-cols-sm="5" label="New password:" label-align-sm="right" label-for="newPW1">
                  <b-form-input v-model="newPassword1" id="newPW1" type="password"></b-form-input>
                </b-form-group>
                <b-form-group label-cols-sm="5" label="Retype new password:" label-align-sm="right" label-for="newPW2">
                  <b-form-input v-model="newPassword2" id="newPW2" type="password"></b-form-input>
                </b-form-group>
              </b-form-group>
            </b-card>
            You will be forced to sign-in again
          </b-row>
        </template>
      </b-container>
    </b-modal>

    <b-modal size="lg" ref="showMyRolesRef" title="My authorizations">
      <b-container align-v="true">
        <h3>Generic roles :</h3>
        <p>By default the application uses two databases. The _users database owned by the admin role and a database holding the products. More databases can be created but the _users database is
          shared.<br/>
          What a user can see or do is determined by the roles assigned to that user.</p>
        <ul>
          <li>'_admin': Is the CouchDb administrator. Can setup and delete databases. See the CouchDB documentation. The scope is per CouchDb instance including all databases.</li>
        </ul>
				<h5 v-if="isServerAdmin" class="have-role">You are CouchDb administrator</h5>
				<h5 v-else class="not-have-role">No, you are not a CouchDb administrator</h5>
        Two roles are set per database and include all products defined in that database:
        <ul>
          <li>'admin': Can create products, teams and users. Can (un)assign databases and roles to users and user access to products. Is not member of a team.</li>
          <li>'areaPO': The APOs create and maintain their requirement areas. Can change priorities at the epic and feature level. Is not member of a team.</li>
        </ul>
				<h5 v-if="isAdmin" class="have-role">You are Admin</h5>
				<h5 v-else class="not-have-role">No, you are not Admin</h5>
				<h5 v-if="isAPO" class="have-role">You are Area Product Owner</h5>
				<h5 v-else class="not-have-role">No, you are not Area Product Owner</h5>
				<h3>Product specific roles :</h3>
       Three roles are set per product in a database:
        <ul>
          <li>'PO': Maintains product definitions, creates and maintains epics, features and pbi's for the assigned products. Can change priorities at these levels. Must be member of a team.</li>
          <li>'developer': Can create and maintain pbi's and features for the assigned products when team member. Must be member of a team.</li>
          <li>'guest': Can only view the items of the assigned products. Has no access to attachments. Cannot join a team.</li>
        </ul>
				<h5>Click on a product level item in the tree view to see in the message bar what your assigned roles are for that product.</h5>
        <p>Users can have multiple roles. Users can only see/access the products that are assigned to them by the admin.</p>
      </b-container>
    </b-modal>
  </div>
</template>

<script src="./header.js"></script>

<style scoped>

.logo {
  width: 62px;
  margin-right: 10px;
}

li {
  margin: 0 16px;
}

.have-role {
	color: green;
	margin-bottom: 1em;
}

.not-have-role {
	color: red;
	margin-bottom: 1em;
}
</style>
