<template>
	<BContainer>
		<BRow v-if="isScreenWidthSufficient()">
			<BCol cols="12" class="text-center">
				<BImg :src="logo" placement="center" alt="OneBacklog logo" />
			</BCol>
			<BCol cols="12" class="cta">
				<router-link to="/signin">Sign-in</router-link>
			</BCol>
			<BCol cols="12" class="text-center">
				<h3>Welcome to the OneBacklog single page web application</h3>
				<p>This application is an aid to define, share and execute the realization of multiple products in a organization,
					large or small. Your role determines what you can do. Run this application on a desktop computer or tablet with a pointing device.</p>
			</BCol>
		</BRow>
		<BRow v-else>
			<BCol cols="12" class="text-center">
				<BImg hight="250" width="250" :src="logo" placement="center" alt="OneBacklog logo" />
			</BCol>
			<BCol cols="12" class="ctb">
				<router-link to="/signin">Sign-in</router-link>
			</BCol>
			<BCol cols="12" class="text-center">
				<h3>Welcome to the OneBacklog single page web application</h3>
				<p>This application is an aid to define, share and execute the realization of multiple products in a organization,
					large or small. Your role determines what you can do.</p>
				<p class="smallerFont">The app detected that you are using a device with a screen width of {{ state.screenWidth }} pixels. Please note that
					you can only use the planning board on this device.</p>
			</BCol>
		</BRow>
	</BContainer>
</template>

<script setup>
	import { reactive } from 'vue'
	import logo from '../../assets/logo.png'

	const debug = import.meta.env.VITE_DEBUG === 'true' || false

	const state = reactive({
		// use outerWidth for production to get the actual width of the browser window
		// use innerWidth for debugging to see the width of the viewport
		screenWidth: debug ? window.innerWidth : window.outerWidth
	})

	function isScreenWidthSufficient() {
		return state.screenWidth >= 1400
	}
</script>

<style scoped>
	.cta {
		width: 250px;
		margin: auto;
		text-align: center;
	}

	.ctb {
		width: 250px;
		margin: auto;
		text-align: center;
	}

	.cta a {
		margin: 100px;
		text-decoration: none;
		display: inline-block;
		border: 1px solid #521751;
		border-radius: 3px;
		width: 100px;
		padding: 10px;
		box-sizing: border-box;
		color: #521751;
	}

	.ctb a {
		margin: 50px;
		text-decoration: none;
		display: inline-block;
		border: 1px solid #521751;
		border-radius: 3px;
		width: 100px;
		padding: 10px;
		box-sizing: border-box;
		color: #521751;
	}

	.cta a:hover,
	.cta a:active {
		background-color: #521751;
		color: white;
	}

	.smallerFont {
		font-size: small;
	}
</style>
