<template>
	<b-container>
		<b-row>
			<b-col cols="12" class="left-column">
				<h1>RELEASE NOTES</h1>
				<p v-if=this.$store.state.demo>Note: This is a demo version of the application. Do not use it for production.</p>
				<hr>
				<h3>v.0.4.7 - TBD</h3>
				<p>New features:</p>
				<ul>
					<li>nf 1</li>
					<li>nf 2</li>
					<li>nf 3</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>bf 1</li>
					<li>bf 2</li>
					<li>bf 3</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>pi 1</li>
					<li>pi 2</li>
					<li>pi 3</li>
				</ul>
				<hr>
				<h3>v.0.4.6 - 15 May 2019 - Minor update</h3>
				<p>New features:</p>
				<ul>
					<li>The search function in the header now selects all items in a product which have the entered key word in the title</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>bf 1</li>
					<li>bf 2</li>
					<li>bf 3</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>pi 1</li>
					<li>pi 2</li>
					<li>pi 3</li>
				</ul>
				<hr>
				<h3>v.0.4.5 - 11 May 2019 - The first public release on onebacklog.net</h3>
			</b-col>
		</b-row>
	</b-container>
</template>

<style lang="css" scoped>
	.left-column {
		text-align: left;
		background-color: #408FAE;
		color: white;
		border: 1px solid black;
	}

	.indent10 {
		margin-left: 10px;
		color: black;
	}

	.indent20 {
		margin-left: 20px;
		color: black;
	}

	p, li {
		color: black;
	}

	a {
		color: black;
		text-decoration: underline;
	}

	img {
		margin-bottom: 10px
	}

</style>
