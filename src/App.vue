<template>
	<div id="app">
		<app-header />
		<router-view />
	</div>
</template>

<script>
	import Header from './components/header/header.vue'
	export default {
		name: 'app',
		components: {
			'app-header': Header
		}
	}

</script>

<style>
	body,
	html {
		padding: 3px;
		font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

</style>
