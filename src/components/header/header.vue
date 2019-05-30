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
					<template slot="button-content">
						{{ $store.state.filterText }}
					</template>
					<b-dropdown-item @click="filterSinceEvent(10)">Changes &lt; 10 min.</b-dropdown-item>
					<b-dropdown-item @click="filterSinceEvent(60)">Changes last hour</b-dropdown-item>
					<b-dropdown-item @click="filterSinceEvent(1440)">Changes last 24 hrs.</b-dropdown-item>
				</b-dropdown>
				<!-- Right aligned nav items -->
				<b-navbar-nav class="ml-auto">
					<b-nav-form>
						<b-form-input id="searchInput" v-model="$store.state.keyword" class="m-2" placeholder="Enter a key word" />
						<b-button id="searchBtn" type="button" class="m-2" @click="showSelectionOrClearEvent()">{{ $store.state.searchText }}</b-button>
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
						<b-dropdown-item v-if="auth && this.$store.state.load.myTeams.length > 1" @click="changeTeam">Change team</b-dropdown-item>
						<b-dropdown-item v-if="auth" @click="changePassword">Change password</b-dropdown-item>
						<b-dropdown-item v-b-modal.licence-modal>Licence information</b-dropdown-item>
						<b-dropdown-item v-if="auth" @click="onSignout">Sign Out</b-dropdown-item>
					</b-nav-item-dropdown>
				</b-navbar-nav>
			</b-collapse>
		</b-navbar>
		<appLicence>
			<slot name='licence'></slot>
		</appLicence>
		<template>
			<b-modal size="lg" ref='changeTeamRef' @ok="doChangeTeam" title='Change your team'>
				<b-container align-v="true">
					<h1>Not in MVP</h1>
				</b-container>
			</b-modal>
		</template>
		<template>
			<b-modal size="lg" ref='changePwRef' @ok="doChangePw" title='Change your password'>
				<b-container align-v="true">
					<h1>Not in MVP</h1>
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
				appVersion: 'OneBackLog v.0.5.1',
				eventBgColor: '#408FAE',
				oldPassword: '',
				newPassword1: '',
				newPassword2: ''
			}
		},
		mounted() {
			// Add tag when DEMO version
			if (this.$store.state.demo) this.appVersion = this.appVersion + ' DEMO'
			// fire the search button on pressing enter in the one and only input field (instead of submitting the form)
			document.getElementById('searchInput').addEventListener('keypress', function(event) {
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
				return this.$store.getters.isAuthenticated && this.$store.getters.isServerAdmin
			}
		},
		methods: {
			filterSinceEvent(val) {
				if (this.$store.state.filterOn) {
					window.slVueTree.resetFilters('filterSinceEvent')
				}
				window.slVueTree.filterSince(val)
			},

			showSelectionOrClearEvent() {
				if (this.$store.state.keyword !== '') {
					window.slVueTree.filterOnKeyword()
				} else {
					// reset selection on empty input if selection is on
					if (this.$store.state.searchOn) {
						window.slVueTree.resetFilters('showSelectionOrClearEvent')
					}
				}
			},

			clearFilterEvent() {
				if (this.$store.state.filterOn) {
					window.slVueTree.resetFilters('clearFilterEvent')
				}
			},

			changeTeam() {
				this.$refs.changeTeamRef.show()
			},
			changePassword() {
				if (this.$store.getters.isServerAdmin) alert("As a 'server admin' you cannot change your password here. Use Fauxton instead")
				else {
					this.$refs.changePwRef.show()
				}
			},
			doChangeTeam() {

			},
			doChangePw() {

			},
			onSignout() {
				this.$store.dispatch('signout')
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
