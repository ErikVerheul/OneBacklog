<template>
	<div class="container">
		<div class="row">
			<div class="col-lg-12 col-sm-12">
				<b-img :src="require('../../assets/logo.png')" center fluid alt="OneBacklog logo" />
			</div>
			<div class="col-lg-12 col-sm-12" id="signin">
				<div class="signin-form">
					<form @submit.prevent="onSubmit">
						<div class="input">
							<label for="name">Name</label>
							<input type="text" id="name" v-model="name">
						</div>
						<div class="input">
							<label for="password">Password</label>
							<input type="password" id="password" v-model="password">
						</div>
						<div class="submit">
							<button type="submit">Submit</button>
						</div>
					</form>
				</div>
				<div v-if=!this.$store.state.demo class="text-center big-margin">
					No account yet? Ask your SM or PO to create one.
				</div>
				<div v-if=!this.$store.state.demo class="text-center">
					This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
					MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the Licence information item in the User dropdown menu.
				</div>
				<div v-if=this.$store.state.demo class="text-center">
					<p>This is a demo / test version of the application. DO NOT USE FOR PRODUCTION.<br>
					Please leave your findings in this applications register or e-mail to tech@verheulconsultants.nl.</p>
					<p>Signin with demoUser and password demoUser.</p>
					<p>Note that demoUser has the permissions of "superPO", "PO", "developer" and "guest" for the ' Register...' and Generated product.<br>
						So you can do almost everything. Please do not remove other peoples entries.</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				name: '',
				password: ''
			}
		},
		methods: {
			onSubmit() {
				const formData = {
					name: this.name,
					password: this.password,
				}
				this.$store.dispatch('signin', {
					name: formData.name,
					password: formData.password
				})
			}
		}
	}

</script>

<style lang="css" scoped>
	.signin-form {
		width: 400px;
		margin: 30px auto;
		border: 1px solid #eee;
		padding: 20px;
		box-shadow: 0 2px 3px #ccc;
	}

	.input {
		margin: 10px auto;
	}

	.text-center {
		text-align: center;
	}

	.big-margin {
		margin-bottom: 6em;
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

	.input input:focus {
		outline: none;
		border: 1px solid #521751;
		background-color: #eee;
	}

	.submit button {
		border: 1px solid #521751;
		color: #521751;
		padding: 10px 20px;
		font: inherit;
		cursor: pointer;
	}

	.submit button:hover,
	.submit button:active {
		background-color: #521751;
		color: white;
	}

	.submit button[disabled],
	.submit button[disabled]:hover,
	.submit button[disabled]:active {
		border: 1px solid #ccc;
		background-color: transparent;
		color: #ccc;
		cursor: not-allowed;
	}

</style>
