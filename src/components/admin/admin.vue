<template lang="html">
  <div>
    <app-header></app-header>
    <b-container fluid>
      <h2>Admin view: {{ optionSelected }}</h2>
      <b-button block @click="createProduct">Create a product</b-button>
      <b-button block @click="removeProduct">Remove a product</b-button>
      <b-button block @click="createUser">Create a user</b-button>
      <b-button block @click="maintainUsers">Maintain users</b-button>
      <b-button block @click="createTeam">Create a team</b-button>
      <b-button block @click="removeTeams">Remove teams without members</b-button>
      <b-button block @click="createOrUpdateCalendar">Create / Maintain default sprint calendar</b-button>
      <b-button block @click="listTeams">List teams</b-button>
      <template v-if="optionSelected != 'Select a task'">
        <div v-if="optionSelected === 'Maintain users'">
          <div v-if="!$store.state.isUserFound">
            <h4>Change the permissions of an existing user to products</h4>
            <b-row class="my-1">
              <b-col sm="12">
                Start typing an username or select from the list:
              </b-col>
              <b-col sm="3">
                <b-form-group>
                  <b-form-select
                    v-model="selectedUser"
                    :options="this.$store.state.userOptions"
                  ></b-form-select>
                </b-form-group>
              </b-col>
            </b-row>
            <b-button v-if="selectedUser && !$store.state.isUserFound" class="m-1" @click="doFetchUser">Update this user's permissions</b-button>
            <b-button v-if="!$store.state.isUserFound" class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
          </div>
          <div v-else>
            <b-row class="my-1">
              <b-col sm="2">
                Users name:
              </b-col>
              <b-col sm="10">
                {{ $store.state.useracc.fetchedUserData.name }}
              </b-col>
              <b-col sm="2">
                Users e-mail address:
              </b-col>
              <b-col sm="10">
                {{ $store.state.useracc.fetchedUserData.email }}
              </b-col>
              <div v-if="!isUserDbSelected">
                <div v-if="$store.state.userDatabaseOptions.length === 1 && $store.state.databaseOptions.includes($store.state.userDatabaseOptions[0])">
                  <b-col sm="12">
                    <p>The user has access to one datatabase: '{{ $store.state.userDatabaseOptions[0] }}'</p>
                    <b-button @click="doSelectUserDb($store.state.userDatabaseOptions[0])">Select this database</b-button>
                    <b-button class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
                  </b-col>
                </div>
                <div v-else>
                  <b-col sm="12">
                    <b-form-group>
                      <h5>The user has access to multiple datatabases: {{ $store.state.userDatabaseOptions }}, select one</h5>
                      <b-form-radio-group
                        v-model="$store.state.selectedDatabaseName"
                        :options="$store.state.userDatabaseOptions"
                        stacked
                      ></b-form-radio-group>
                    </b-form-group>
                    <template v-if="$store.state.databaseOptions.includes($store.state.selectedDatabaseName)">
                      <b-button class="m-1" @click="isUserDbSelected = true">Continue</b-button>
                    </template>
                    <template v-else>
                      <h4 class="colorRed">ERROR: The selected database does not exist (anymore)</h4>
                    </template>
                    <b-button class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
                  </b-col>
                </div>
              </div>
              <div v-else>
                <b-col sm="12">
                  <h5 v-if="$store.state.useracc.userIsAdmin">This user is an 'admin':</h5>
                  <h5 v-else>This user is not an 'admin':</h5>
                  <p>The admin role is a generic role with access to all user profiles and all product definitions in all databases</p>
                  <b-form-group>
                    <b-form-checkbox
                      v-model="$store.state.useracc.userIsAdmin"
                    >Add or remove this role
                    </b-form-checkbox>
                  </b-form-group>
                </b-col>

                <b-col v-if="!$store.state.areProductsFound" sm="12">
                  <b-button class="m-1" @click="callGetDbProducts(false)">Continue</b-button>
                  <b-button class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
                </b-col>
                <b-col sm="12">
                  <div v-if="$store.state.areProductsFound">
                    <h5>Change the roles of this user to each product in database '{{ $store.state.selectedDatabaseName }}':</h5>
                    <div v-for="prod of $store.state.useracc.dbProducts" :key="prod.id">
                      {{ prod.value }}:
                      <b-form-group>
                        <b-form-checkbox-group
                          v-model="prod.roles"
                          :options="roleOptions"
                        ></b-form-checkbox-group>
                      </b-form-group>
                    </div>
                    <p>If you changed your own account, sign-in again to see the effect</p>
                    <b-button v-if="$store.state.areProductsFound && !$store.state.isUserUpdated" class="m-1" @click="doUpdateUser">Update this user</b-button>
                    <b-button v-if="!$store.state.isUserUpdated" class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
                    <b-button v-if="$store.state.isUserUpdated" class="m-1" @click="cancel()" variant="seablue">Return</b-button>
                  </div>
                </b-col>
              </div>
            </b-row>
          </div>
        </div>
        <div v-else-if="!dbIsSelected">
          <b-form-group>
            <h5>Select the database</h5>
            <b-form-radio-group
              v-model="$store.state.selectedDatabaseName"
              :options="$store.state.databaseOptions"
              stacked
            ></b-form-radio-group>
          </b-form-group>
          <b-button class="m-1" @click="doAfterDbIsSelected()">Continue</b-button>
          <b-button class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
        </div>
        <div v-else>
          <div v-if="optionSelected === 'Create a user'">
            <div v-if="!credentialsReady">
              <h4>Create a user with access to the '{{ $store.state.selectedDatabaseName }}' database and products</h4>
              <b-row>
                <b-col sm="2">
                  User name:
                </b-col>
                <b-col sm="10">
                  <b-form-input v-model="userName" placeholder="Enter the user name"></b-form-input>
                </b-col>
                <b-col sm="2">
                  Initial password:
                  </b-col>
                <b-col sm="10">
                <b-form-input v-model="password" type="password" placeholder="Enter the initial password. The user must change it."></b-form-input>
                </b-col>
                <b-col sm="2">
                  Users e-mail:
                </b-col>
                <b-col sm="10">
                  <b-form-input v-model="userEmail" type="email" placeholder="Enter the user's e-mail"></b-form-input>
                </b-col>
                <b-col sm="12">
                  <b-button v-if="!credentialsReady" class="m-1" @click="checkCredentials">Continue</b-button>
                  <b-button class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
                </b-col>
              </b-row>
            </div>
            <div v-if="credentialsReady">
              <div v-if="$store.state.areProductsFound">
                Creating user '{{ userName }}'
                <h5>Make this user an 'admin'?</h5>
                <b-form-checkbox
                  v-model="$store.state.useracc.userIsAdmin"
                >Tick to add this role
                </b-form-checkbox>
                <hr>
                <h5>Assign (additional) roles to each product in database '{{ $store.state.selectedDatabaseName }}'</h5>
                <div v-for="prod of $store.state.useracc.dbProducts" :key="prod.id">
                  {{ prod.value }}:
                  <b-form-group>
                    <b-form-checkbox-group
                      v-model="prod.roles"
                      :options="roleOptions"
                    ></b-form-checkbox-group>
                  </b-form-group>
                </div>
                <b-button v-if="!$store.state.isUserCreated" class="m-1" @click="doCreateUser">Create this user</b-button>
                <hr>
                <b-button v-if="!$store.state.isUserCreated" class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
              </div>
              <div v-else>
                <p>No products found to assign to this user in database {{ $store.state.selectedDatabaseName }}</p>
              </div>
            </div>
          </div>

          <div v-if="optionSelected === 'Create a product'">
            <h2>Create a new product in the current database '{{ $store.state.userData.currentDb }}' by entering its title:</h2>
            <b-form-input v-model="productTitle" placeholder="Enter the product title"></b-form-input>
            <b-button v-if="!$store.state.isProductCreated && productTitle !== ''" class="m-1" @click="doCreateProduct">Create product</b-button>
            <b-button v-if="!$store.state.isProductCreated" class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
            <h4 v-if="$store.state.isProductCreated">Select the products view to see the new product</h4>
          </div>

          <div v-if="optionSelected === 'Remove a product'">
            <h2>Remove a product from the current database '{{ $store.state.userData.currentDb }}'</h2>
            <p>As super Po you can remove products in the products view. To do so right click on a product node and select 'Remove this product and ... descendants'</p>
            <p>When doing so be aware of:</p>
            <ul>
              <li>Online users will see the product and all descendents disappear.</li>
              <li>Users who sign-in after the removal will miss the product.</li>
              <li>When undoing the removal the users who signed-in between the removal and undo, will have no access to the product. An admin must register the product for them.</li>
            </ul>
            <b-button class="m-1" @click="showProductView()">Switch to product view</b-button>
            <b-button class="m-1" @click="cancel()" variant="seablue">Cancel</b-button>
          </div>

          <div v-if="optionSelected === 'Create a team'">
            <h4>Create a team for users with products in database '{{ $store.state.selectedDatabaseName }}'</h4>
            <p>When created any user of that database can choose to become a member of the team</p>
            <b-form-input v-model="teamName" placeholder="Enter the team name"></b-form-input>
            <b-button v-if="!$store.state.isTeamCreated && teamName !== ''" class="m-1" @click="doCreateTeam">Create this team</b-button>
            <b-button v-if="!$store.state.isTeamCreated" class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
          </div>

          <div v-if="optionSelected === 'Remove teams without members'">
            <h4>Remove teams without members in database '{{ $store.state.selectedDatabaseName }}'</h4>
            <b-form-group label="Select one or more teams to remove">
              <b-form-checkbox-group
                v-model="teamNamesToRemove"
                :options="$store.state.teamsToRemoveOptions"
              ></b-form-checkbox-group>
            </b-form-group>

            <b-button v-if="!$store.state.areTeamsRemoved" class="m-1" @click="doRemoveTeams(teamNamesToRemove)">Remove teams</b-button>
            <b-button v-if="!$store.state.areTeamsRemoved" class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
          </div>

          <div v-if="optionSelected === 'Sprint calendar'">
            <h4>Maintain the default sprint calendar of database '{{ $store.state.selectedDatabaseName }}' or create a new one when not existant</h4>
            <div v-if="checkForExistingCalendar">
              <b-button @click="doLoadSprintCalendar" variant="seablue">Load the sprint calendar</b-button>
            </div>
            <div v-else-if="!$store.state.isSprintCalendarFound && !creatingCalendar">
              <h5>The calendar is not found, create a new calendar</h5>
              <b-button class="m-1" @click="creatingCalendar = true">Create calendar</b-button>
              <b-button class="m-1" @click="cancel" variant="seablue">Cancel</b-button>
            </div>
            <div v-if="!$store.state.isSprintCalendarFound && creatingCalendar">
              <b-row>
                <b-col cols="12"><h4>Create the default calendar</h4></b-col>

                <b-col v-if="!startDateStr" sm="12">
                  <center>
                    <p>Choose the start date of the first sprint:</p>
                    <b-calendar v-model="startDateStr"></b-calendar>
                  </center>
                </b-col>
                <b-col v-else sm="12">
                  <center>
                    <h4>Selected start date of the first sprint is {{ startDateStr }}</h4>
                    <b-form @submit="onSubmit" @reset="onReset" v-if="show">
                      <b-form-group
                        id="input-group-1"
                        label="Enter the daytime hour (UTC) the sprint starts and ends:"
                        label-for="input-1"
                        description="Choose a number from 0 to 23 and use the UTC clock."
                      >
                        <b-form-input
                          id="input-1"
                          v-model="sprintStartTimeStr"
                          type="number"
                          min="0"
                          max="23"
                          step="1"
                          required
                        ></b-form-input>
                      </b-form-group>

                      <b-form-group
                        id="input-group-2"
                        label="Enter the sprint length in days:"
                        label-for="input-2"
                      >
                        <b-form-input id="input-2" v-model="sprintLengthStr" type="number" min="1" required></b-form-input>
                      </b-form-group>

                      <b-form-group
                        id="input-group-3"
                        label="Enter the number of sprints to generate:"
                        label-for="input-3"
                      >
                        <b-form-input id="input-3" v-model="numberOfSprintsStr" type="number" min="1" required></b-form-input>
                      </b-form-group>

                      <b-button v-if="!$store.state.isDefaultSprintCalendarSaved" class="m-1" type="submit">Submit</b-button>
                      <b-button v-if="!$store.state.isDefaultSprintCalendarSaved" class="m-1" type="reset" variant="seablue">Reset</b-button>
                      <b-button v-if="$store.state.isDefaultSprintCalendarSaved" @click="signIn()" class="m-1" variant="seablue">Exit</b-button>
                    </b-form>
                  </center>
                </b-col>
              </b-row>
            </div>
            <div v-if="$store.state.isSprintCalendarFound">
              <h5>The calendar is {{ workflowStatusMsg }}, modify calendar</h5>
              <b-list-group>
                <b-list-group-item button v-b-modal.modal-extend>Extend the current calendar</b-list-group-item>
                <b-list-group-item button v-b-modal.modal-change>Change a sprint and all its successors </b-list-group-item>
              </b-list-group>
              <b-button class="m-1" @click="cancel()" variant="seablue">Return</b-button>
            </div>
            <b-modal @ok="extendCalendar" id="modal-extend" :ok-disabled="extendDisableOkButton" title="Extend the number of sprints">
              <b-form-input v-model="extendNumberStr" type="number" placeholder="Enter the number of extensions"></b-form-input>
            </b-modal>
            <b-modal @ok="changeSprintInCalendar" id="modal-change" :ok-disabled="changeDisableOkButton" title="Change a sprint" size="lg">
              <b-container fluid>
                <b-row class="mb-1">
                  <b-col cols="3">
                    Sprint number
                  </b-col>
                  <b-col cols="9">
                    <b-form-input v-model="changedNumberStr" type="number" placeholder="Enter the sprint number"></b-form-input>
                  </b-col>
                </b-row>
                <div v-if="acceptSprintnr">
                  <b-row class="mb-1">
                    <b-col cols="3">
                      Selected
                    </b-col>
                    <b-col cols="9">
                      sprint-{{changedNumberStr}}
                    </b-col>
                    <b-col cols="3">
                      Starting
                    </b-col>
                    <b-col cols="9">
                      {{ getStartDate() }}
                    </b-col>
                    <b-col cols="3">
                      Duration
                    </b-col>
                    <b-col cols="9">
                      {{ getDuration() }} days
                    </b-col>
                    <b-col cols="3">
                      Ending
                    </b-col>
                    <b-col cols="9">
                      {{ getEndDate() }}
                    </b-col>
                    <b-col cols="3">
                        New duration
                    </b-col>
                    <b-col cols="9">
                      <b-form-input v-model="changedDurationStr" type="number" placeholder="Enter a new duration in days (1-28)"></b-form-input>
                    </b-col>
                    <b-col cols="3">
                        Hours shift
                    </b-col>
                    <b-col cols="9">
                      <b-form-input v-model="changedHourStr" type="number" placeholder="Shift the hour of day (-12,+12)"></b-form-input>
                    </b-col>
                  </b-row>
                </div>
                <div v-if="acceptSprintnr && acceptNewSprintLength && acceptHourChange && acceptNewEndDate">
                  <b-row class="mb-1">
                    <b-col cols="12">
                      Your changes:
                    </b-col>
                  </b-row>
                  <b-row class="mb-1">
                    <b-col cols="2">
                      Duration
                    </b-col>
                    <b-col cols="10">
                      {{ changedDurationStr }} days
                    </b-col>
                  </b-row>
                  <b-row class="mb-1">
                    <b-col cols="2">
                      Ending
                    </b-col>
                    <b-col cols="10">
                      {{ calcNewEndDate() }}
                    </b-col>
                  </b-row>
                  <p class="margin-colorRed">All subsequent sprints will change start end ending. Their duration will not change.</p>
                </div>
              </b-container>
            </b-modal>
          </div>

          <div v-if="optionSelected === 'List teams'">
            <p v-if="!$store.state.areTeamsFound"> No teams found</p>
            <div v-else>
              <h4>List of teams and members working on products in database '{{ $store.state.selectedDatabaseName }}'</h4>
              <hr>
              <div v-for="team in $store.state.fetchedTeams" :key="team.teamName">
                <b>Team '{{ team.teamName }}'</b>
                <div v-for="userRec in $store.state.useracc.allUsers" :key="userRec.name">
                  <i v-if="team.teamName === userRec.team"> '{{ userRec.name }}' is member of this team </i>
                </div>
                <hr>
              </div>
              <b-button class="m-1" @click="cancel()" variant="seablue">Return</b-button>
            </div>
          </div>
        </div>
        <p>{{ localMessage }}</p>
        <p class="colorRed">{{ $store.state.warning }}
        <div v-if="$store.state.backendMessages.length > 0">
          <hr>
          <div v-for="item in $store.state.backendMessages" :key="item.seqKey">
            <p>{{ item.msg }}</p>
          </div>
        </div>
      </template>
    </b-container>
  </div>
</template>

<script src="./admin.js"></script>

<style lang="css" scoped>
h4,
h5 {
  margin-top: 20px;
}

.btn-seablue {
  background-color: #408fae;
  color: white;
}

.margin-colorRed {
  margin-top: 20px;
  color: red;
}

.colorRed {
  color: red;
}
</style>
