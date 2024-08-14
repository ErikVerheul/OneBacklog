<template>
  <div>
    <app-header></app-header>
    <BContainer>
      <h2 class="text-center">Assistance Admin view: {{ optionSelected }}</h2>
      <template v-if="optionSelected === 'Select a task'">
        <p class="text-center">Note: Products, teams and calendars are defined per database. If you have more than one database, you are asked to select one</p>
        <BButtonGroup vertical class="d-grid gap-2" aria-label="Vertical button group">
          <BButton block @click="createUser">Create a user and assign product(s)</BButton>
          <BButton block @click="maintainUsers">Maintain user permissions to products </BButton>
          <br />
          <BButton block @click="createTeam">Create a team</BButton>
          <BButton block @click="removeTeams">Remove teams without members</BButton>
          <BButton block @click="listTeams">List teams</BButton>
          <br />
          <BButton block @click="maintainDefaultSprintCalendar">Maintain the default sprint calendar</BButton>
          <BButton block @click="createOrUpdateTeamCalendar">Create / Maintain a team sprint calendar</BButton>
        </BButtonGroup>
      </template>
      <template v-else>
        <template v-if="getUserFirst">
          <template v-if="!store.state.isUserFound">
            <h4>Select an existing user to '{{ optionSelected }}'</h4>
            <BRow class="my-1">
              <BCol sm="12">
                <p>Start typing a username or select from the list:</p>
              </BCol>
              <BCol sm="3">
                <BFormGroup>
                  <BFormSelect v-model="selectedUser" :options="store.state.userOptions"></BFormSelect>
                </BFormGroup>
              </BCol>
            </BRow>
            <hr>
            <BButton v-if="selectedUser && !store.state.isUserFound" class="m-1" @click="doFetchUser(selectedUser, false)" variant="primary">Continue</BButton>
            <BButton v-if="!store.state.isUserFound" class="m-1" @click="cancel">Cancel</BButton>
          </template>
          <div v-else-if="optionSelected === 'Maintain user permissions to products'">
            <div v-if="store.state.isUserFound">
              <h4 v-if="userIsMe()">{{ selectedUser }}: You are about to change your own user profile.</h4>
              <BRow class="my-1">
                <BCol sm="2">
                  User's name:
                </BCol>
                <BCol sm="10">
                  {{ store.state.useracc.fetchedUserData.name }}
                </BCol>
                <BCol sm="2">
                  User's e-mail address:
                </BCol>
                <BCol sm="10">
                  {{ store.state.useracc.fetchedUserData.email }}
                </BCol>
                <template v-if="isUserDbSelected">
                  <BCol sm="2">
                    Selected database:
                  </BCol>
                  <BCol sm="10">
                    {{ store.state.selectedDatabaseName }}
                  </BCol>
                </template>
                <div v-if="!isUserDbSelected">
                  <BCol sm="12">
                    <BFormGroup>
                      <h5>Select a datatabase holding the products</h5>
                      <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.databaseOptions" stacked />
                    </BFormGroup>
                    <BButton class="m-1" @click="callGetDbProducts()" variant="primary">Continue</BButton>
                    <BButton class="m-1" @click="cancel()">Cancel</BButton>
                  </BCol>
                </div>
                <div v-else>
                  <BCol sm="12">
                    <div v-if="store.state.areProductsFound">
                      <h5>Change the roles of this user to each product in database '{{ store.state.selectedDatabaseName }}':</h5>
                      <div v-for="prod of store.state.useracc.dbProducts" :key="prod.id">
                        {{ prod.value }}:
                        <BFormGroup>
                          <BFormCheckboxGroup v-model="prod.roles" :options="roleOptions"></BFormCheckboxGroup>
                        </BFormGroup>
                      </div>
                      <hr>
                      <p v-if="!canRemoveLastProduct">You cannot remove the last role of the last assigned product in the only database of this user. Consider
                        the option
                        to remove this user.</p>
                      <p v-if="!canRemoveDatabase">You cannot remove the last database from the profile of this user. Consider the option to remove this user.
                      </p>
                      <BButton v-if="canRemoveLastProduct && canRemoveDatabase && store.state.areProductsFound && !store.state.isUserUpdated" class="m-1"
                        @click="doUpdateUser" variant="primary">
                        Update this user</BButton>
                      <BButton v-if="!store.state.isUserUpdated" class="m-1" @click="cancel()">Cancel</BButton>
                      <BButton v-else class="m-1" @click="cancel()">Return</BButton>
                    </div>
                  </BCol>
                </div>
              </BRow>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="!dbIsSelected">
            <BFormGroup>
              <h5>Select a database to '{{ optionSelected }}'</h5>
              <BFormRadioGroup v-model="store.state.selectedDatabaseName" :options="store.state.myAssignedDatabases" stacked />
            </BFormGroup>
            <hr>
            <BButton class="m-1" @click="doAfterDbIsSelected()" :disabled="!store.state.selectedDatabaseName" variant="primary">Continue</BButton>
            <BButton class="m-1" @click="cancel()">Cancel</BButton>
          </div>
          <div v-else>
            <template v-if="optionSelected === 'Create a user and assign product(s)'">
              <div v-if="!credentialsReady">
                <h4>Create a user with access to the '{{ store.state.selectedDatabaseName }}' database and products</h4>
                <BRow>
                  <BCol sm="2">
                    User name:
                  </BCol>
                  <BCol sm="10">
                    <BFormInput v-model="userName" placeholder="Enter the user name"></BFormInput>
                  </BCol>
                  <BCol sm="2">
                    Initial password:
                  </BCol>
                  <BCol sm="10">
                    <BFormInput v-model="password" type="password" placeholder="Enter the initial password. The user must change it."></BFormInput>
                  </BCol>
                  <BCol sm="2">
                    Users e-mail:
                  </BCol>
                  <BCol sm="10">
                    <BFormInput v-model="userEmail" type="email" placeholder="Enter the user's e-mail"></BFormInput>
                  </BCol>
                  <hr>
                  <BCol sm="12">
                    <BButton v-if="!credentialsReady" class="m-1" @click="checkCredentials" variant="primary">Continue</BButton>
                    <BButton class="m-1" @click="cancel">Cancel</BButton>
                  </BCol>
                </BRow>
              </div>
              <div v-if="credentialsReady">
                <div v-if="store.state.areProductsFound">
                  <h4>Creating user '{{ userName }}' with assigned products in database '{{ store.state.selectedDatabaseName }}'</h4>
                  <h5 v-if="store.state.isUserRemoved">[Note that user '{{ userName }}' existed, but was removed. The old assignments are loaded]</h5>
                  <hr>
                  <h5>Assign (additional) roles to each product in database '{{ store.state.selectedDatabaseName }}'</h5>
                  <div v-for="prod of store.state.useracc.dbProducts" :key="prod.id">
                    {{ prod.value }}:
                    <BFormGroup>
                      <BFormCheckboxGroup v-model="prod.roles" :options="roleOptions"></BFormCheckboxGroup>
                    </BFormGroup>
                  </div>
                  <template v-if="!store.state.isUserCreated">
                    <hr>
                    <p>Please, assign at least one role to this user before creation.</p>
                    <BButton class="m-1" @click="doCreateUser" variant="primary">Create this user</BButton>
                    <BButton class="m-1" @click="cancel">Cancel</BButton>
                  </template>
                </div>
                <div v-else>
                  <p>No products found to assign to this user in database {{ store.state.selectedDatabaseName }}</p>
                </div>
              </div>
              <hr>
              <div v-if="store.state.isUserCreated">
                <BButton class="m-1" @click="cancel()">Return</BButton>
              </div>
            </template>

            <template v-else-if="optionSelected === 'Create a team'">
              <h4>Create a team for users with products in database '{{ store.state.selectedDatabaseName }}'</h4>
              <p>When created any user of that database can choose to become a member of the team</p>
              <BFormInput v-model="teamName" placeholder="Enter the team name"></BFormInput>
              <template v-if="!store.state.isTeamCreated">
                <BButton v-if="teamName !== ''" class="m-3" @click="doCreateTeam" variant="primary">Create this team</BButton>
                <BButton class="m-1" @click="cancel">Cancel</BButton>
              </template>
              <BButton v-else class="m-3" @click="cancel">Return</BButton>
            </template>

            <template v-else-if="optionSelected === 'Remove teams without members'">
              <h4>Remove teams without members in database '{{ store.state.selectedDatabaseName }}'</h4>
              <BFormGroup label="Select one or more teams to remove">
                <BFormCheckboxGroup v-model="teamNamesToRemove" :options="teamsToRemoveOptions"></BFormCheckboxGroup>
              </BFormGroup>

              <template v-if="!store.state.areTeamsRemoved">
                <BButton class="m-1" @click="doRemoveTeams(teamNamesToRemove)" variant="primary">Remove teams</BButton>
                <BButton class="m-1" @click="cancel">Cancel</BButton>
              </template>
              <BButton v-else class="m-1" @click="cancel">Return</BButton>
            </template>

            <template v-if="optionSelected === 'Maintain the default sprint calendar' || optionSelected === 'Create / Maintain a team sprint calendar'">

              <template v-if="optionSelected === 'Maintain the default sprint calendar'">
                <h4>Maintain the default sprint calendar of database '{{ store.state.selectedDatabaseName }}'</h4>
                <div v-if="checkForExistingCalendar">
                  <BButton @click="doLoadDefaultCalendar" variant="primary">Load the default sprint calendar</BButton>
                </div>
              </template>

              <template v-else-if="optionSelected === 'Create / Maintain a team sprint calendar'">
                <h4 v-if="!selectedTeamName">Maintain the team sprint calendar of a team in database '{{ store.state.selectedDatabaseName }}'</h4>
                <h4 v-else>Maintain the team sprint calendar of team '{{ selectedTeamName }}' in database '{{ store.state.selectedDatabaseName }}'</h4>
                <template v-if="!store.state.isTeamCalendarLoaded">
                  <BFormGroup label="Select a team">
                    <BFormRadioGroup v-model="selectedTeamName" :options="teamOptions">
                    </BFormRadioGroup>
                  </BFormGroup>

                  <template>
                    <div v-if="checkForExistingCalendar">
                      <BButton @click="doLoadTeamCalendar" variant="primary">Load the team sprint calendar</BButton>
                    </div>
                    <div v-else>
                      <h5>The calendar is not found, create a team calendar from the default calendar</h5>
                      <p class="colorRed">This is a one way change. When the team calendar is created the team has to maintain it.</p>
                      <BButton v-if="!store.state.isCalendarSaved" class="m-1" @click="doCreateTeamCalendar" variant="primary">Create team sprint calendar
                      </BButton>
                      <BButton v-if="!store.state.isCalendarSaved" class="m-1" @click="cancel">Cancel</BButton>
                      <BButton v-if="store.state.isCalendarSaved" class="m-1" @click="cancel">Return</BButton>
                    </div>
                  </template>
                </template>
              </template>

              <template v-if="store.state.isDefaultCalendarLoaded || store.state.isTeamCalendarLoaded">
                <h5>The calendar is {{ workflowStatusMsg }}, modify calendar</h5>
                <BListGroup>
                  <!-- TODO: check v-BModal.modal-extend and v-BModal.modal-change -->
                  <BListGroupItem button variant="secondary" v-BModal.modal-extend>Extend this calendar with new sprints</BListGroupItem>
                  <BListGroupItem button variant="secondary" v-BModal.modal-change>Change a sprint length and shift all its successors in time</BListGroupItem>
                </BListGroup>
                <BButton class="m-3" @click="cancel()">Return</BButton>
                <BModal @ok="extendCalendar" id="modal-extend" :ok-disabled="extendDisableOkButton" title="Extend the number of sprints">
                  <BFormInput v-model="extendNumberStr" type="number" placeholder="Enter the number of extensions"></BFormInput>
                </BModal>
                <BModal @ok="changeSprintInCalendar" id="modal-change" :ok-disabled="changeDisableOkButton" title="Change a sprint duration" size="lg">
                  <BContainer>
                    <BRow class="mb-1">
                      <BCol cols="3">
                        Sprint number
                      </BCol>
                      <BCol cols="9">
                        <BFormInput v-model="changedNumberStr" type="number" placeholder="Enter the sprint number"></BFormInput>
                      </BCol>
                    </BRow>
                    {{ acceptSprintNrMsg }}
                    <div v-if="acceptSprintnr">
                      <BRow class="mb-1">
                        <BCol cols="3">
                          Selected
                        </BCol>
                        <BCol cols="9">
                          sprint-{{ changedNumberStr }}
                        </BCol>
                        <BCol cols="3">
                          Starting
                        </BCol>
                        <BCol cols="9">
                          {{ getStartDate() }}
                        </BCol>
                        <BCol cols="3">
                          Duration
                        </BCol>
                        <BCol cols="9">
                          {{ getDuration() }} days
                        </BCol>
                        <BCol cols="3">
                          Ending
                        </BCol>
                        <BCol cols="9">
                          {{ getEndDate() }}
                        </BCol>
                        <BCol cols="3">
                          New duration
                        </BCol>
                        <BCol cols="9">
                          <BFormInput v-model="changedDurationStr" type="number" placeholder="Enter a new duration in days (1-28)"></BFormInput>
                        </BCol>
                        <BCol cols="3">
                          Hours shift
                        </BCol>
                        <BCol cols="9">
                          <BFormInput v-model="changedHourStr" type="number" placeholder="Shift the sprint ending time (-12,+12) hours"></BFormInput>
                        </BCol>
                      </BRow>
                    </div>
                    <div v-if="acceptSprintnr && acceptNewSprintLength && acceptHourChange && acceptNewEndDate">
                      <BRow class="mb-1">
                        <BCol cols="12">
                          Your changes:
                        </BCol>
                      </BRow>
                      <BRow class="mb-1">
                        <BCol cols="2">
                          Duration
                        </BCol>
                        <BCol cols="10">
                          {{ changedDurationStr }} days
                        </BCol>
                      </BRow>
                      <BRow class="mb-1">
                        <BCol cols="2">
                          Ending
                        </BCol>
                        <BCol cols="10">
                          {{ calcNewEndDate() }}
                        </BCol>
                      </BRow>
                      <p class="margin-colorRed">All subsequent sprints will change start end ending. Their duration will not change.</p>
                    </div>
                  </BContainer>
                </BModal>
              </template>
            </template>

            <template v-else-if="optionSelected === 'List teams'">
              <p v-if="!store.state.areTeamsFound"> No teams found</p>
              <div v-else>
                <h4>List of teams and members working on products in database '{{ store.state.selectedDatabaseName }}'</h4>
                <div v-for="team in store.state.fetchedTeams" :key="team.teamName">
                  <hr>
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
              <hr>
              <BButton class="m-1" @click="cancel">Return</BButton>
            </template>
          </div>
        </template>
        <p>{{ localMessage }}</p>
        <div v-if="store.state.backendMessages.length > 0">
          <hr>
          <div v-for="item in store.state.backendMessages" :key="item.seqKey">
            <p>{{ item.msg }}</p>
          </div>
        </div>
      </template>
    </BContainer>
  </div>
</template>

<script src="./assistadmin.js"></script>

<style scoped>
h4,
h5 {
  margin-top: 20px;
}

.margin-colorRed {
  margin-top: 20px;
  color: red;
}
</style>
