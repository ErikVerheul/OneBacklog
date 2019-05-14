<template>
	<div>
		<b-navbar toggleable="md" type="dark" variant="dark">
			<b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
			<b-img class="logo" :src="require('../../assets/logo.png')" alt="OneBacklog logo" />
			<b-navbar-brand href="https://verheulconsultants.nl">OneBacklog version 0.4.5 MVP</b-navbar-brand>
			<b-collapse is-nav id="nav_collapse">
				<b-navbar-nav>
					<b-nav-item to="../../userguide">User guide</b-nav-item>
				</b-navbar-nav>

				<b-nav-form>
					<b-form-input id="searchInput" v-model="keyword" size="sm" class="mr-sm-2" placeholder="Enter a key word" />
					<b-button id="searchBtn" type="button" @click="showSelection()" size="sm" class="my-2 my-sm-0">Search</b-button>
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
						<b-dropdown-item v-if="auth && this.$store.getters.getMyTeams.length > 1" @click="changeTeam">Change team</b-dropdown-item>
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
	import Vue from 'vue'
	import licence from './licence.vue'

	const INFO = 0

	export default {
		data() {
			return {
				eventBgColor: '#408FAE',
				keyword: '',
				oldPassword: '',
				newPassword1: '',
				newPassword2: ''
			}
		},
		mounted() {
			// fire the search button on pressing enter in the one and only input field (instead of submitting the form)
			document.getElementById('searchInput').addEventListener('keypress', function(event) {
				if (event.keyCode == 13) {
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
			showLastEvent(txt, level) {
				switch (level) {
					case INFO:
						this.eventBgColor = '#408FAE'
				}
				this.$store.state.load.lastEvent = txt
			},

			showSelection() {

				function expandNodes(id) {
					window.slVueTree.traverse((node, nodeModel) => {
						if (node.data._id === id) {
							Vue.set(nodeModel, 'isExpanded', true)
							let parentId = node.data.parentId
							if (parentId !== 'root') {
								// recurse
								expandNodes(parentId)
							}
							return false
						}
					}, undefined, undefined, 'showSelection:expandNodes')
				}

				// unselect all
				window.slVueTree.traverse((node, nodeModel) => {
					Vue.set(nodeModel, 'isSelected', false)
				}, undefined, undefined, 'showSelection:unselect-all')

				let count = 0
				window.slVueTree.traverse((node, nodeModel) => {
					if (nodeModel.data.productId === this.$store.state.load.currentProductId && node.title.toLowerCase().includes(this.keyword.toLowerCase())) {
						expandNodes(nodeModel.data.parentId)
						Vue.set(nodeModel, 'isSelected', true)
						count++
					}
				}, undefined, undefined, 'showSelection:find')

				if (count === 1) {
					this.showLastEvent(`${count} item title matches your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
				} else {
					this.showLastEvent(`${count} item titles match your search in product '${this.$store.state.load.currentProductTitle}'`, INFO)
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
