<template>
  <div>
    <BNavbar class="navbar-dark bg-dark">
      <BNavbar-toggle target="nav_collapse"></BNavbar-toggle>
      <BImg class="logo" :src="logo" alt="OneBacklog logo" />
      <BNavbar-brand to="../../rel-notes">{{ appVersion }}</BNavbar-brand>
      <BCollapse is-nav id="nav_collapse">
        <BNavbarNav>
          <BNavItem to="../../userguide">User guide</BNavItem>
        </BNavbarNav>
        <!-- app-header additions go in this slot -->
        <slot></slot>
        <BNavbarNav v-if="store.state.showHeaderDropDowns" class="ms-auto">
          <BNavItemDropdown text="Select your view" right>
            <BDropdownItem to="../../detailProduct">Product details</BDropdownItem>
            <BDropdownItem v-if="store.state.userData.myOptions.proUser === 'true'" to="../../coarseProduct">Products
              overview</BDropdownItem>
            <BDropdownItem to="../../board">Planning board</BDropdownItem>
            <BDropdownDivider v-if="isAssistAdmin || isAdmin || isServerAdmin"></BDropdownDivider>
            <BDropdownItem v-if="isAssistAdmin" to="../../assistadmin">AssistAdmin</BDropdownItem>
            <BDropdownItem v-if="isAdmin" to="../../admin">Admin</BDropdownItem>
            <BDropdownItem v-if="isServerAdmin" to="../../serveradmin">Server admin</BDropdownItem>
          </BNavItemDropdown>

          <BNavItemDropdown text="User" right>
            <!-- Using button-content slot -->
            <template slot="button-content"></template>

            <template v-if="isAuthenticated">
              <BDropdownItem
                v-if="store.state.userData.myOptions.proUser === 'true' && store.state.myAssignedDatabases.length > 1"
                @click="changeDatabase">Change database
              </BDropdownItem>
              <BDropdownItem @click="showMyTeam">My team</BDropdownItem>
              <BDropdownItem @click="changeTeam">Change team</BDropdownItem>             
              <BDropdownItem v-if="getMyAssignedProductIds.length > 1" @click="selectProducts">Select
                products</BDropdownItem>
              <BDropdownItem @click="changeMyPassword">Change password</BDropdownItem>
              <BDropdownItem @click="showMyRoles">My authorizations</BDropdownItem>
            </template>
            <BDropdownItem v-else>No options here when not authenticated</BDropdownItem>

            <BDropdownItem v-b-modal.licence-modal>Licence information</BDropdownItem>
            <BDropdownItem @click="onSignout">Sign Out</BDropdownItem>
          </BNavItemDropdown>

          <BNavItem @click="showOptions">
            <span class="cog-item">
              <i>
                <font-awesome-icon icon="cog" />
              </i>
            </span>
          </BNavItem>

        </BNavbarNav>
      </BCollapse>
    </BNavbar>
    <appLicence>
      <slot name="licence"></slot>
    </appLicence>

    <BModal size="lg" ref="changeDatabaseRef" @ok="doChangeDatabase" title="Change your database">
      <BContainer align-v="true">
        <h5>Select another database. Your current database is '{{ store.state.userData.currentDb }}'</h5>
        <BFormGroup>
          <BFormRadioGroup v-model="headerMyDatabase" :options="headerDatabaseOptions"
            name="headerDatabaseOptions" />
        </BFormGroup>
        <p>After you have changed the database you will be signed-out. Sign-in again to connect to the selected database
        </p>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="changeTeamRef" @ok="doChangeTeam" title="Change your team">
      <BContainer align-v="true">
        <h5>Select your new team. Your current team is '{{ myTeam }}'</h5>
        <BFormGroup>
          <BFormRadioGroup v-model="selectedTeam" :options="teamOptions" name="teamOptions" />
        </BFormGroup>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="showTeamRef" title="My team members (and an overview of all teams)">
      <BContainer align-v="true">
        <p v-if="!store.state.areTeamsFound"> No teams found</p>
        <div v-else>
          <h5>The members of my team '{{ myTeam }}'</h5>
          <div v-for="m of getMyTeamRecord(myTeam).members" :key="m">
            <i v-if="m === store.state.userData.user">I ({{ m }}) am member of this team</i>
            <i v-else>'{{ m }}' is member of this team</i>
          </div>
          <hr>
          <h5>All teams working on products managed in database '{{ store.state.selectedDatabaseName }}'</h5>
          <div v-for="team in store.state.fetchedTeams" :key="team.teamName">          
            <template v-if="team.hasTeamCalendar">
              <b>Team '{{ team.teamName }}'</b> (has its own team sprint calendar)
            </template>
            <template v-else>
              <b>Team '{{ team.teamName }}'</b> (uses the default sprint calendar)
            </template>
            <div v-for="m of team.members" :key="m">
              <i>'{{ m }}' is member of this team</i>
            </div>
          </div>
        </div>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="selectProductsRef" @ok="doSelectProducts"
      title="Select one or more (hold shift or Ctrl) products to be loaded">
      <BContainer align-v="true">
        <BFormSelect size="sm" v-model="selectedProducts" :options="store.state.myProductOptions" multiple
          :select-size="store.state.myProductOptions.length"></BFormSelect>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="selectDefaultProductRef" @ok="updateProductsSubscriptions"
      title="Select the default product you are working on">
      <BContainer align-v="true">
        <BFormSelect v-model="newDefaultProductId" :options="defaultProductOptions"
          :select-size="defaultProductOptions.length"></BFormSelect>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="changePwRef" @ok="doChangeMyPassWord" title="Change your password">
      <BContainer align-v="true">
        <template v-if="isAuthenticated && store.state.demo && store.state.userData.user === 'demoUser'">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && isServerAdmin">
          <h2>Demo users cannot change the password</h2>
        </template>
        <template v-if="isAuthenticated && store.state.demo && store.state.userData.user !== 'demoUser'">
          <BRow class="my-1">
            <BCard bg-variant="light">
              <BFormGroup label-cols-lg="5" label="The new password must have 8 or more characters" label-size="lg"
                label-class="font-weight-bold pt-0" class="mb-0">
                <BFormGroup label-cols-sm="5" label="Current password:" label-align-sm="right" label-for="currentPW">
                  <BFormInput v-model="oldPassword" id="currentPW" type="password"></BFormInput>
                </BFormGroup>
                <BFormGroup label-cols-sm="5" label="New password:" label-align-sm="right" label-for="newPW1">
                  <BFormInput v-model="newPassword1" id="newPW1" type="password"></BFormInput>
                </BFormGroup>
                <BFormGroup label-cols-sm="5" label="Retype new password:" label-align-sm="right" label-for="newPW2">
                  <BFormInput v-model="newPassword2" id="newPW2" type="password"></BFormInput>
                </BFormGroup>
              </BFormGroup>
            </BCard>
            You will be forced to sign-in again
          </BRow>
        </template>
      </BContainer>
    </BModal>

    <BModal size="lg" ref="showMyRolesRef" title="My authorizations">
      <BContainer align-v="true">
        <h3>Generic roles :</h3>
        <p>By default the application uses two databases. The _users database owned by the admin role and a database
          holding the products. More databases can be created but the _users database is
          shared.<br />
          What a user can see or do is determined by the roles assigned to that user.</p>
        <ul>
          <li>'_admin': Is the CouchDb administrator. Can setup and delete databases. See the CouchDB documentation. The
            scope is per CouchDb instance including all databases.</li>
        </ul>
        <h5 v-if="isServerAdmin" class="have-role">You are CouchDb administrator</h5>
        <h5 v-else class="not-have-role">No, you are not a CouchDb administrator</h5>
        Two roles are set per database and include all products defined in that database:
        <ul>
          <li>'admin': Can create products, teams and users. Can (un)assign databases and roles to users and user access
            to products. Is not member of a team.</li>
          <li>'assistAdmin': An admin can delegate tasks to assistant admins as an extension to their product specific
            roles (see below) and only for the databases and products assigned to them. Can create teams and users. Can
            (un)assign databases and products to users. Can (un)assign user roles per product. Cannot (un)assign global
            roles or create products or remove users. Need not be a member of a team.</li>
          <li>'areaPO': The Area Product Owners create and maintain their requirement areas. Can change priorities at the
            epic and feature level. Is not member of a team.</li>
        </ul>
        <h5 v-if="isAdmin" class="have-role">You are Admin</h5>
        <h5 v-else class="not-have-role">No, you are not Admin</h5>
        <h5 v-if="isAssistAdmin" class="have-role">You are Assistant Administrator</h5>
        <h5 v-else class="not-have-role">No, you are not Assistant Administrator</h5>
        <h5 v-if="isAPO" class="have-role">You are Area Product Owner</h5>
        <h5 v-else class="not-have-role">No, you are not Area Product Owner</h5>
        <h3>Product specific roles :</h3>
        Three roles are set per product in a database:
        <ul>
          <li>'PO': Maintains product definitions, creates and maintains epics, features and pbi's for the assigned
            products. Can change priorities at these levels. Must be member of a team.</li>
          <li>'developer': Can create and maintain pbi's and features for the assigned products when team member. Must be
            member of a team.</li>
          <li>'guest': Can only view the items of the assigned products. Has no access to attachments. Cannot join a team.
          </li>
        </ul>
        <h5>Click on a product level item in the tree view to see in the message bar what your assigned roles are for that
          product.</h5>
        <p>Users can have multiple roles. Users can only see/access the products that are assigned to them by the admin.
        </p>
      </BContainer>
    </BModal>
    <!-- when userData not initialized do not show the options -->
    <BModal size="lg" v-if="store.state.userData.myOptions" v-model="showOptionsModal" hide-footer title="Options menu">
      <h5>If you manage large complex products</h5>
      <BFormCheckbox v-model="store.state.userData.myOptions.proUser" value='true' unchecked-value='false'>
        Use the professional mode of this app
      </BFormCheckbox>

      <h5 class="spacer">When changing the priority of backlog item(s)</h5>
      <BFormCheckbox v-model="store.state.userData.myOptions.levelShiftWarning" value="do_warn"
        unchecked-value="do_not_warn">
        Warn me when I move items to another level (eg. from task to user story)
      </BFormCheckbox>

      <h5 class="spacer">For the Planning board</h5>
      <BFormCheckbox v-model="store.state.userData.myOptions.showOnHold" value="do_show_on_hold"
        unchecked-value="do_not_show_on_hold">
        Show the [On hold] status column on the planning board
      </BFormCheckbox>

      <BButton class="m-4" @click="showOptionsModal = false" variant="dark">Cancel</BButton>
      <BButton class="m-4" @click="saveMyOptions()" variant="primary">Save my settings</BButton>
    </BModal>
  </div>
</template>

<script src="./header.js"></script>

<style scoped>
.cog-item {
  color: #408fae;
}

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

.spacer {
  margin-top: 1em;
}
</style>
