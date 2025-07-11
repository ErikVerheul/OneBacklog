<template>
	<template v-if="onLargeScreen">
		<BNavbar toggleable="lg" class="navbar-dark bg-dark">
			<BNavbar-toggle target="nav_collapse"></BNavbar-toggle>
			<BImg class="logo" :src="logo" alt="OneBacklog logo" />
			<BNavbar-brand to="../../rel-notes">{{ appVersion }}</BNavbar-brand>
			<BCollapse is-nav id="nav_collapse">
				<BNavbarNav>
					<BNavItem to="../../userguide">User guide</BNavItem>
				</BNavbarNav>

				<BNavbarNav v-if="store.state.showHeaderDropDowns" class="ms-auto">
					<!-- app-header additions go in this slot -->
					<slot></slot>
					<BNavItemDropdown text="Select your view" right>
						<BDropdownItem @click="switchToDetailProductView">Backlog tree view</BDropdownItem>
						<BDropdownItem to="../../board">Planning board</BDropdownItem>
						<BDropdownDivider v-if="isAssistAdmin || isAdmin || isServerAdmin"></BDropdownDivider>
						<BDropdownItem v-if="isAssistAdmin" to="../../assistadmin">AssistAdmin</BDropdownItem>
						<BDropdownItem v-if="isAdmin" to="../../admin">Admin</BDropdownItem>
						<BDropdownItem v-if="isServerAdmin" to="../../serveradmin">Server admin</BDropdownItem>
					</BNavItemDropdown>

					<BNavItemDropdown text="User" right>

						<template v-if="isAuthenticated">
							<BDropdownItem @click="goMessage">View/send messages</BDropdownItem>
							<BDropdownItem @click="showMyTeam">My team</BDropdownItem>
							<BDropdownItem @click="changeTeam">Change team</BDropdownItem>
							<BDropdownItem v-if="canChangeDb" @click="changeDatabase">Change database</BDropdownItem>
							<BDropdownItem v-if="getMyAssignedProductIds.length > 1" @click="selectProducts">Select products</BDropdownItem>
							<BDropdownItem v-if="store.state.userData.user !== 'demoUser'" @click="changeMyPassword">Change password</BDropdownItem>
							<BDropdownItem v-if="store.state.userData.user !== 'demoUser'" @click="changeMyEmail">Change my email</BDropdownItem>
							<BDropdownItem @click="showMyRoles">My authorizations</BDropdownItem>
						</template>
						<BDropdownItem v-else>No options here when not authenticated</BDropdownItem>

						<BDropdownItem v-b-modal.licence-modal>Licence information</BDropdownItem>
						<BDropdownItem @click="onSignout">Sign-out</BDropdownItem>
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
	</template>
	<template v-else>
		<!-- for small screen -->
		<BNavbar class="navbar-dark bg-dark">
			<BImg class="logo" :src="logo" alt="OneBacklog logo" />
			<BNavbar-brand to="../../rel-notes">{{ appVersion }}</BNavbar-brand>

			<!-- app-header additions go in this slot -->
			<slot></slot>

			<BNavbarNav v-if="store.state.showHeaderDropDowns" class="ms-auto">

				<BNavItemDropdown text="User" right>

					<template v-if="isAuthenticated">
						<BDropdownItem @click="goMessage">View/send messages</BDropdownItem>
						<BDropdownItem @click="showMyTeam">My team</BDropdownItem>
						<BDropdownItem @click="changeTeam">Change team</BDropdownItem>
						<BDropdownItem @click="showMyRoles">My authorizations</BDropdownItem>
					</template>
					<BDropdownItem v-else>No options here when not authenticated</BDropdownItem>

					<BDropdownItem @click="onSignout">Sign-out</BDropdownItem>
				</BNavItemDropdown>

			</BNavbarNav>
		</BNavbar>
	</template>
	<appLicence>
		<slot name="licence"></slot>
	</appLicence>

	<BModal size="lg" v-model="showChangeDatabase" no-footer title="Change your database">
		<BContainer align-v="true">
			<h5>Select another database. Your current database is '{{ store.state.userData.currentDb }}'</h5>
			<BFormGroup>
				<BFormRadioGroup v-model="headerMyDatabase" :options="headerDatabaseOptions" name="headerDatabaseOptions" />
			</BFormGroup>
			<hr>
			<BButton class="m-1 float-end" @click="doChangeDatabase" variant="seablue">Select and restart</BButton>
			<BButton class="m-1 float-end" @click="showChangeDatabase = false">Cancel</BButton>
		</BContainer>
	</BModal>

	<BModal size="lg" ref="changeTeamRef" @ok="doChangeTeam" title="Change your team">
		<BContainer align-v="true">
			<h5>Select your new team. Your current team is '{{ myTeam }}'</h5>
			<BFormGroup>
				<BFormRadioGroup v-model="selectedTeam" :options="teamOptions" name="teamOptions" />
			</BFormGroup>
			<p class="text-danger mt-3">Note that tasks assigned to you will move with you to the newly selected team</p>
		</BContainer>
	</BModal>

	<BModal v-if="myTeam" size="lg" ref="showTeamRef" title="My team members (and an overview of all teams)">
		<BContainer align-v="true">
			<h5>The members of my team '{{ myTeam }}'</h5>
			<div v-for="m of store.state.allTeams[myTeam].members" :key="m">
				<i v-if="m === store.state.userData.user">I ({{ m }}) am member of this team</i>
				<i v-else>'{{ m }}' is member of my team</i>
			</div>
			<hr>
			<h5>All teams working on products managed in database '{{ store.state.selectedDatabaseName }}'</h5>
			<div v-for="teamName of Object.keys(store.state.allTeams)" :key="teamName">
				<template v-if="store.state.allTeams[teamName].hasTeamCalendar">
					<b>Team '{{ teamName }}'</b> {{ store.state.allTeams[teamName].members.length }} members (has its own team sprint calendar)
				</template>
				<template v-else>
					<b>Team '{{ teamName }}'</b> {{ store.state.allTeams[teamName].members.length }} members (uses the default sprint calendar)
				</template>
			</div>
		</BContainer>
	</BModal>

	<BModal size="lg" v-model="showSelectProducts" no-footer title="Select one or more (hold shift or Ctrl) products to be loaded">
		<BContainer align-v="true">
			<BFormSelect size="sm" v-model="selectedProducts" :options="store.state.myProductOptions" multiple :select-size="store.state.myProductOptions.length">
			</BFormSelect>
			<hr>
			<BButton class="m-1 float-end" @click="doSelectProducts" variant="seablue">{{ getSelectButtonText() }}</BButton>
			<BButton class="m-1 float-end" @click="showSelectProducts = false">Cancel</BButton>
		</BContainer>
	</BModal>

	<BModal size="lg" ref="changePwRef" :ok-disabled=!passwordIsCheckedOk @ok="doChangeMyPassWord" title="Change your password">
		<BContainer align-v="true">
			<BRow class="my-1">
				<BCard bg-variant="light">
					<!-- Add a hidden username field for accessibility -->
					<form @submit.prevent="doChangeMyPassWord">
						<input type="text" autocomplete="username" :aria-label="'Username'" :value="store.state.userData.user"
							style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;border:0;padding:0;margin:0;" tabindex="-1" readonly />
						<BFormGroup label-cols-lg="5" label="The new password must have 8 or more characters" label-size="lg" label-class="font-weight-bold pt-0"
							class="mb-0">
							<BFormGroup label-cols-sm="5" label="Current password:" label-align-sm="right">
								<!-- Prevent browser autocomplete for current password -->
								<BFormInput v-model="oldPassword" type="password" autocomplete="new-password"></BFormInput>
							</BFormGroup>
							<BFormGroup label-cols-sm="5" label="New password:" label-align-sm="right">
								<BFormInput v-model="newPassword1" type="password" autocomplete="new-password"></BFormInput>
							</BFormGroup>
							<BFormGroup label-cols-sm="5" label="Retype new password:" label-align-sm="right">
								<BFormInput v-model="newPassword2" type="password" autocomplete="new-password"></BFormInput>
							</BFormGroup>
						</BFormGroup>
						<!-- Optionally, you can add a submit button here if you want to allow pressing Enter to submit -->
						<button type="submit" style="display:none"></button>
					</form>
				</BCard>
				<p>You will be forced to sign-in again</p>
			</BRow>
		</BContainer>
	</BModal>

	<BModal size="lg" ref="changeEmailRef" :ok-disabled="!emailIsCheckedOk" @ok="doChangeMyEmail" title="Change my email">
		<BContainer align-v="true">
			<BRow class="my-1">
				<BCard bg-variant="light">
					<BFormGroup label-cols-lg="5" label="Change notices are send to this email address" label-size="lg" label-class="font-weight-bold pt-0" class="mb-0">
						<BFormGroup label-cols-sm="5" label="Current email:" label-align-sm="right">
							<BCardText>{{ store.state.userData.email }}</BCardText>
						</BFormGroup>
						<BFormGroup label-cols-sm="5" label="New email:" label-align-sm="right">
							<BFormInput v-model="newEmail1" type="email"></BFormInput>
						</BFormGroup>
						<BFormGroup label-cols-sm="5" label="Retype new email:" label-align-sm="right">
							<BFormInput v-model="newEmail2" type="email"></BFormInput>
						</BFormGroup>
					</BFormGroup>
				</BCard>
			</BRow>
		</BContainer>
	</BModal>

	<BModal size="lg" ref="showMyRolesRef" title="My authorizations">
		<BContainer align-v="true">
			<h3>Generic roles :</h3>
			<p>By default the application uses two databases. The _users database owned by the admin role and a database
				holding the products. More databases can be created but the _users database is shared.<br />
				What a user can see or do is determined by the roles assigned to that user.</p>
			<ul>
				<li>'_admin': One user with this role is the CouchDb Server administrator with 'root' rights. This user can setup, replicate and delete databases.
					See the CouchDB documentation. At application init this user also becomes the role of database admin (see below).</li>
			</ul>
			<h5 v-if="isServerAdmin" class="have-role">You are CouchDb Server administrator</h5>
			<h5 v-else class="not-have-role">No, you are not a CouchDb Server administrator</h5>
			Three roles are set per database and include all products defined in that database:
			<ul>
				<li>'admin' or 'database admin': Can create products, teams and users. Can (un)assign databases and roles to users and user access
					to products. Need not be a member of a team.</li>
				<li>'assistAdmin': An admin can delegate tasks to assistant admins as an extension to their product specific
					roles (see below) and only for the databases and products assigned to them. Can create teams and users. Can
					(un)assign databases and products to users. Can (un)assign user roles per product. Cannot (un)assign global
					roles or create products or remove users. Need not be a member of a team.</li>
				<li>'APO': The Area Product Owners create and maintain their requirement areas. Can change priorities at the
					epic and feature level. Is not member of a team.</li>
			</ul>
			<h5 v-if="isAdmin" class="have-role">You are (database) Admin</h5>
			<h5 v-else class="not-have-role">No, you are not (database) Admin</h5>
			<h5 v-if="isAssistAdmin" class="have-role">You are Assistant Administrator</h5>
			<h5 v-else class="not-have-role">No, you are not Assistant Administrator</h5>
			<h5 v-if="isAPO" class="have-role">You are Area Product Owner</h5>
			<h5 v-else class="not-have-role">No, you are not Area Product Owner</h5>
			<h3>Product specific roles :</h3>
			Three roles are set per product in a database:
			<ul>
				<li>'PO': Maintains product definitions, creates and maintains epics, features and user stories for the assigned
					products. Can change priorities at these levels. Must be member of a team.</li>
				<li>'developer': Can create and maintain user stories and features for the assigned products when team member. Must be
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
	<BModal size="lg" v-if="store.state.userData.myOptions" v-model="showOptionsModal" no-footer title="Options menu">
		<h5>If you manage large complex products</h5>
		<BFormCheckbox v-model="store.state.userData.myOptions.proUser" value="true" unchecked-value="false">
			Use the professional mode of this app
		</BFormCheckbox>

		<h5 class="spacer">When changing the priority of backlog item(s)</h5>
		<BFormCheckbox v-model="store.state.userData.myOptions.levelShiftWarning" value="do_warn" unchecked-value="do_not_warn">
			Warn me when I move items to another level (eg. from task to user story)
		</BFormCheckbox>

		<h5 class="spacer">When changes have been made in the tree view</h5>
		<label for="range1">Set the time recent changes to backlog items are annotated with a badge icon:</label>
		<BFormInput id="range1" v-model="store.state.userData.myOptions.badgeShowTime" type="range" min="0" max="300" />
		<div class="mt-2">Set value: {{ store.state.userData.myOptions.badgeShowTime }} minutes</div>

		<template v-if="store.state.userData.user !== 'demoUser'">
			<h5 class="spacer">When hitting the "Subscribe to change notices" button</h5>
			<BFormCheckbox v-model="store.state.userData.myOptions.subscribeDescendants" value="do_subscribe_descendants"
				unchecked-value="do_not_subscribe_descendants">
				Also subscribe to the change notices of all descendants of the selected item
			</BFormCheckbox>
			<BFormCheckbox v-model="store.state.userData.myOptions.doNotMessageMyself" value="true" unchecked-value="false">
				Do not send change notices to myself
			</BFormCheckbox>
		</template>

		<h5 class="spacer">For the Planning board</h5>
		<BFormCheckbox v-model="store.state.userData.myOptions.showOnHold" value="do_show_on_hold" unchecked-value="do_not_show_on_hold">
			Show the [On hold] status column on the planning board
		</BFormCheckbox>
		<hr>
		<BButton class="m-1 float-end" @click="saveMyOptions()" variant="seablue">Save my settings</BButton>
		<BButton class="m-1 float-end" @click="showOptionsModal = false" variant="dark">Cancel</BButton>
	</BModal>

	<BModal v-model="store.state.signingOut" no-header no-footer @hide.prevent>Signing out, please wait...</BModal>
	<TeamMessaging></TeamMessaging>
</template>

<script src="./AppHeader.js"></script>

<style lang="scss" scoped>
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
