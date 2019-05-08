<template>
	<div>
		<div class="row">
			<div class="col-lg-12 col-sm-12">
				<h4 v-if="name">As a server administrator you're authenticated to setup the database for OneBacklog.
					Your user name is: {{ name }}, and your roles are: {{ myRoles }}. Your default database is {{ db }}</h4>
				<h6>Note that users with their roles must be created in the protected _users database to sign in.<br />
					Create and initialize the database for OneBacklog first. Then can assign known users and/or roles to it.</h6>
			</div>
			<div class="col-lg-4 col-sm-4">
				<b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo" />
			</div>
			<div class="col-lg-8 col-sm-8">
				<button @click="showCredentials" class="myButton">0. Show my credentials</button>
				<button @click="creRdmProduct" class="myButton">1. Create random product</button>
				<button @click="createUser" class="myButton">2. Create user</button>
				<button @click="crateDB" class="myButton">3. Choose or Create a database</button>
				<button @click="initDB" class="myButton">4. Initialize the database</button>
				<button @click="assignUser" class="myButton">5. Add new users and roles to the last selected || created database</button>
				<button @click="showDBsecurity" class="myButton">6. Show the database security info</button>
				<button @click="showDocuments" class="myButton">7. Show the documents in a database</button>
				<button @click="showDocById" class="myButton">8. Show a document by id</button>
				<button @click="deleteDB" class="myButton">9. Delete the selected || created database</button>
				<button @click="exampleDB" class="myButton">10. Create an example database with demo users</button>
				<button @click="copyDB" class="myButton">11. Copy a database including permissions</button>
			</div>

			<div class="col-lg-12 col-sm-12">
				<table>
					<thead>
						<tr v-if="selectionMade">
							<td><strong>Field-1</strong></td>
							<td><strong>Field-2</strong></td>
							<td><strong>Field-3</strong></td>
							<td><strong>Field-4</strong></td>
							<td></td>
						</tr>
					</thead>
					<tbody>
						<tr v-if="selectionMade">
							<td>
								<input type="text" v-model="row.field1">
							</td>
							<td>
								<input type="text" v-model="row.field2">
							</td>
							<td>
								<input type="text" v-model="row.field3">
							</td>
							<td>
								<input type="text" v-model="row.field4">
							</td>
							<td>
								<a @click="execute" class="myButton">Execute</a>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div class="col-lg-12 col-sm-12">
				<div class="myBox">
					<hr>
					<p>The output from CouchDB:</p>
					<p style="white-space: pre">{{ message }}</p>
					<p v-if="comment">Comment: {{ comment }} </p>
					<p class="p_red" v-if="errorMessage">Error: {{ errorMessage }} </p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'

	export default {
		data() {
			return {
				selectionMade: false,
				row: {
					field1: '',
					field2: '',
					field3: '',
					field4: ''
				},
				commandNr: null,
			}
		},
		computed: {
			...mapGetters({
				name: 'getUser',
				db: 'getCurrentDb',
				myRoles: 'getMyDefaultRoles',
				message: 'returnMessage',
				comment: 'returnComment',
				errorMessage: 'returnErrorMsg'
			}),
		},
		methods: {
			execute() {
				switch (this.commandNr) {
					case 0:
						this.showCredentialsExe()
						break
					case 1:
						this.creRdmProductExe()
						break
					case 2:
						this.createUserExe()
						break
					case 3:
						this.crateDBExe()
						break
					case 4:
						this.initDBExe()
						break
					case 5:
						this.assignUserExe()
						break
					case 6:
						this.showDBsecurityExe()
						break
					case 7:
						this.showDocumentsExe()
						break
					case 8:
						this.showDocByIdExe()
						break
					case 9:
						this.deleteDBExe()
						break
					case 10:
						this.exampleDBExe()
						break
					case 11:
						this.copyDBExe()
						break
					default:
				}
			},
			showCredentials() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "field not used",
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 0
			},
			showCredentialsExe() {
				this.$store.dispatch('showCreds')
			},
			creRdmProduct() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "Product name",
					field2: "Nr of epics",
					field3: "Av nr of features",
					field4: "Av nr of US",
				}
				this.commandNr = 1
			},
			creRdmProductExe() {
				var payload = {
					productName: this.row.field1,
					epics: this.row.field2,
					features: this.row.field3,
					userStories: this.row.field4,
				}
				this.$store.dispatch('creRdmProduct', payload)
			},
			createUser() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "user name",
					field2: "role, role, etc.",
					field3: "email",
					field4: "cell phone"
				}
				this.commandNr = 2
			},
			createUserExe() {
				var payload = {
					name: this.row.field1,
					role: this.row.field2
				}
				this.$store.dispatch('createUser', payload)
			},
			crateDB() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "DB name",
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 3
			},
			crateDBExe() {
				const dbName = this.row.field1
				this.$store.dispatch('chooseOrCreateDB', dbName)
			},
			initDB() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "field not used",
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 4
			},
			initDBExe() {
				var payload = {
					dbName: this.$store.state.currentDb,
				}
				this.$store.dispatch('initializeDB', payload)
			},
			assignUser() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "member user name, name...",
					field2: "member role, role, etc.",
					field3: "admin user name, name...",
					field4: "admin role, role, etc.",
				}
				this.commandNr = 5
			},
			assignUserExe() {
				var payload = {
					dbName: this.$store.state.currentDb,
					memberNames: this.row.field1,
					memberRoles: this.row.field2,
					adminNames: this.row.field3,
					adminRoles: this.row.field4,
					permissions: {}
				}
				this.$store.dispatch('assignUser', payload)
			},
			showDBsecurity() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: this.$store.state.currentDb,
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 6
			},
			showDBsecurityExe() {
				var payload = {
					dbName: this.row.field1
				}
				this.$store.dispatch('showDBsec', payload)
			},
			showDocuments() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: this.$store.state.currentDb,
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 7
			},
			showDocumentsExe() {
				var payload = {
					dbName: this.$store.state.currentDb,
				}
				this.$store.dispatch('showAllDocs', payload)
			},
			showDocById() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: this.$store.state.currentDb,
					field2: "paste the id here",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 8
			},
			showDocByIdExe() {
				var payload = {
					dbName: this.row.field1,
					id: this.row.field2
				}
				this.$store.dispatch('showDoc', payload)
			},
			deleteDB() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: this.$store.state.currentDb,
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 9
			},
			deleteDBExe() {
				var payload = {
					dbName: this.row.field1
				}
				this.$store.dispatch('delDB', payload)
			},
			exampleDB() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "field not used",
					field2: "field not used",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 10
			},
			exampleDBExe() {
				var payload = {
					dbName: this.$store.state.currentDb,
				}
				this.$store.dispatch('createUsers')
				this.$store.dispatch('setUsersDbPermissions')
				this.$store.dispatch('setDbPermissions', payload)
				this.$store.dispatch('createExampleDB', payload)
			},
			copyDB() {
				this.$store.commit('clearAll')
				this.selectionMade = true
				this.row = {
					field1: "Source DB name",
					field2: "Target DB name",
					field3: "field not used",
					field4: "field not used",
				}
				this.commandNr = 11
			},
			copyDBExe() {
				var payload = {
					dbSourceName: this.row.field1,
					dbTargetName: this.row.field2,
				}
				this.$store.dispatch('copyDB', payload)
			},
		}
	}

</script>

<style scoped>
	h1,
	h4,
	h5,
	h6 {
		margin: 20px;
		text-align: left;
	}

	.p_red {
		color: red;
	}

	.myButton {
		margin-left: 20px;
		margin-bottom: 10px;
		background-color: inherit;
		border: 1px solid black;
		border-radius: 5px;
		color: blue;
		padding: 5px 5px;
		text-align: center;
		text-decoration: none;
		display: block;
		font-size: 16px;
		cursor: pointer;
	}

	/* Box styles */

	.myBox {
		margin-left: 20px;
		border: 2px;
		padding: 5px;
		font: 12px/18px sans-serif;
		height: 300px;
		overflow: scroll;
	}

	/* Scrollbar styles */

	::-webkit-scrollbar {
		width: 12px;
		height: 12px;
	}

	::-webkit-scrollbar-track {
		border: 1px solid yellowgreen;
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb {
		background: yellowgreen;
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: #88ba1c;
	}

</style>
