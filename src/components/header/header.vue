<template>
	<div>
		<b-navbar toggleable="md" type="dark" variant="dark">
			<b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
			<b-img class="logo" :src="require('../../assets/logo.png')" alt="OneBacklog logo" />
			<b-navbar-brand href="https://verheulconsultants.nl">OneBacklog version 0.4.0 MVP</b-navbar-brand>
			<b-collapse is-nav id="nav_collapse">
				<b-navbar-nav>
					<b-nav-item href="#">User guide</b-nav-item>
				</b-navbar-nav>

				<b-nav-form>
					<b-form-input size="sm" class="mr-sm-2" type="text" placeholder="Search on key word" />
					<b-button size="sm" class="my-2 my-sm-0">Search</b-button>
				</b-nav-form>

				<!-- Right aligned nav items -->
				<b-navbar-nav class="ml-auto">
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
						<b-dropdown-item v-if="auth && this.$store.getters.getMyTeams.length > 1" href="#">Change team</b-dropdown-item>
						<b-dropdown-item v-if="auth" @click="changePassword">Change password</b-dropdown-item>
						<b-dropdown-item v-b-modal.licence-modal>Licence information</b-dropdown-item>
						<b-dropdown-item v-if="auth" @click="onLogout">Sign Out</b-dropdown-item>
					</b-nav-item-dropdown>
				</b-navbar-nav>
			</b-collapse>
		</b-navbar>
		<appLicence>
			<slot name='licence'></slot>
		</appLicence>
		<template>
			<b-modal size="lg" ref='changePwRef' @ok="doChangePw" title='Change your password'>
				<b-container align-v="true">
					<b-row><input class="input-field" v-model.lazy="oldPassword" type="password" placeholder="Your current password"></b-row>
					<p>oldPassword is: {{ oldPassword }}</p>
					<b-row><input class="input-field" v-model.lazy="newPassword1" type="password" placeholder="Your new password"></b-row>
					<p>newPassword1 is: {{ newPassword1 }}</p>
					<b-row><input class="input-field" v-model.lazy="newPassword2" type="password" placeholder="Repeat new password"></b-row>
					<p>newPassword2 is: {{ newPassword2 }}</p>
				</b-container>
			</b-modal>
		</template>
	</div>
</template>


<script>
	import licence from './licence.vue'

	export default {
		data() {
			return {
				oldPassword: '',
				newPassword1: '',
				newPassword2: ''
			}
		},
		computed: {
			auth() {
				return this.$store.getters.isAuthenticated
			},
			serverAdmin() {
				return this.$store.getters.isAuthenticated && this.$store.getters.isServerAdmin
			}
		},
		methods: {
			changePassword() {
				if (this.$store.getters.isDemoVersion) alert("Sorry, is this demo version you cannot change passwords")
				else {
					if (this.$store.getters.isServerAdmin) alert("As a 'server admin' you cannot change your password here. Use Fauxton instead")
					else {
						this.$refs.changePwRef.show()
					}
				}
			},
			doChangePw() {

			},
			onLogout() {
				this.$store.dispatch('logout')
			}
		},
		components: {
			appLicence: licence
		}
	}

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
		color: #408FAE;
	}

	li a:hover,
	li a:active,
	li a.router-link-active {
		color: #004466;
	}

</style>
