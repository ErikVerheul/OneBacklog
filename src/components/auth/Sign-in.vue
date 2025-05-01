<template>
	<BContainer>
		<BRow>
			<BCol cols="12">
				<BImg hight="250" width="250" :src="logo" placement="center" alt="OneBacklog logo" />
			</BCol>
			<BCol cols="12" id="signin">
				<div class="signin-form">
					<div class="input">
						<label for="name">Name</label>
						<BFormInput type="text" id="name" autocomplete="username" v-model="state.name" />
					</div>
					<div class="input">
						<label for="password">Password</label>
						<BFormInput type="password" autocomplete="current-password" id="password" v-model="state.password" />
					</div>
					<div class="submit">
						<template v-if="credentialsEntered">
							<BButton @click.ctrl="state.resetLastSessionData = true" @click="onSubmit">Submit</BButton>
						</template>
						<template v-else>
							<BButton disabled>Submit</BButton>
						</template>
					</div>
				</div>
				<div class="text-center">
					<p class="mb-1">No account yet?<br>Ask your SM or PO to create one</p>
					<p v-if="state.isDemo">or Signin with <b>demoUser</b> and password <b>demoUser</b></p>
					<p class="mb-4">Tip: right-click in the Name field to change the browser spelling check settings for this session</p>
					<p class="smallerFont"> This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
						MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE</p>

					<div class="demo-user" v-if="state.name === 'demoUser'">
						<h4>You're welcome to give this app</h4>
						<p>Demo users share a database with some predefined products. Your changes can be overridden by others or by a database restore. Please leave your
							findings in <a href="https://github.com/ErikVerheul/OneBacklog/issues">Github.</a> When signed-in click on the <em>User</em>&#11206; dropdown menu
							and select 'My authorizations' to see the roles that are assigned to this account.</p>
					</div>
				</div>
			</BCol>
		</BRow>
	</BContainer>
</template>

<script setup>
	import { computed, reactive } from 'vue'
	import { useStore } from 'vuex'
	import logo from '../../assets/logo.png'
	const store = useStore()
	const state = reactive({
		isDemo: import.meta.env.VITE_IS_DEMO === 'true',
		logo: logo,
		name: '',
		password: '',
		resetLastSessionData: false
	})

	const credentialsEntered = computed(() => {
		return state.name.length > 0 && state.password.length >= 4
	})

	function onSubmit() {
		const credentials = {
			name: state.name,
			password: state.password
		}
		store.dispatch('signin', { credentials, resetLastSessionData: state.resetLastSessionData })
	}

</script>

<style scoped>
	.signin-form {
		width: 250px;
		margin: 30px auto;
		border: 1px solid #eee;
		padding: 20px;
		box-shadow: 0 2px 3px #ccc;
	}

	.demo-user {
		margin: 30px auto;
		border: 1px solid green;
		padding: 10px;
		box-shadow: 0 2px 3px #ccc;
	}

	.input {
		margin: 10px auto;
	}

	.input label {
		display: block;
		color: #4e4e4e;
		margin-bottom: 6px;
	}

	.input input {
		font: inherit;
		width: 100%;
		padding: 6px 12px;
		box-sizing: border-box;
		border: 1px solid #ccc;
	}

	.submit button {
		border: 1px solid #521751;
		color: #521751;
		background-color: #408fae;
		padding: 10px 20px;
		font: inherit;
		cursor: pointer;
	}

	.submit button[disabled],
	.submit button[disabled]:active {
		border: 1px solid #ccc;
		background-color: transparent;
		color: #ccc;
		cursor: not-allowed;
	}

	.smallerFont {
		font-size: small;
	}
</style>
