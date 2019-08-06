<template>
	<b-container>
		<b-row>
			<b-col cols="12" class="left-column">
				<h1>RELEASE NOTES</h1>
				<p v-if=this.$store.state.demo>Note: This is a demo version of the application. Do not use it for production.</p>
				<hr>
				<h3>v.0.5.2 - 7 August 2019 Minor update</h3>
				<p>New features:</p>
				<ul>
					<li>Extend context menu (right-click) and move double left-click remove option to this menu</li>
					<li>Make moving items between products a feature within the context menu</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Wrong productId when creating a new item</li>
					<li>Children of items moved to a lower level not leaf</li>
					<li>Drag &amp; drop to other product fails => now in context menu</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Optimized getDraggable when moving the mouse for a better user experience on selecting the drop target</li>
					<li>Prevent unnecessary update of documents</li>
					<li>Limit tree traversals to current product when possible</li>
				</ul>
				<hr>
				<h3>v.0.5.1 - 27 May 2019 Minor update</h3>
				<p>New features:</p>
				<ul>
					<li>Collapse current and expand other product on click</li>
					<li>Return the tree as I left it in the previous session</li>
					<li>On load expand the tree up to the feature level</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Clear filter not working after jump to other product</li>
					<li>Removed items do reappear</li>
					<li>Filter should reset when jump to other product</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Decrease number of nodes rendered</li>
				</ul>
				<hr>
				<h3>v.0.5.0 - 23 May 2019 Feature update</h3>
				<p>New features:</p>
				<ul>
					<li>[USER REQUEST] Filter the tree on changed items since</li>
					<li>[USER REQUEST] Make type of node more recognizable</li>
					<li>Show the release notes when I click on the version number</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Stop jumps of the tree display</li>
					<li>Show the release notes when I click on the version number</li>
					<li>Wrong product selected</li>
					<li>Predecessor expanded on creation of new node</li>
					<li>Watchdog found 1 unsaved log entries and saved them</li>
					<li>A new epic has the size XXL</li>
					<li>At sign-in the default product title is not displayed</li>
					<li>Wrong warning some times</li>
					<li>New comment is populated with content of last comment</li>
					<li>When a PBI is dropped after its parent it becomes a feature</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Make onmousemove handler fast</li>
					<li>Use traverseLight everywhere</li>
				</ul>
				<hr>
				<h3>v.0.4.6 - 15 May 2019 - Minor update</h3>
				<p>New features:</p>
				<ul>
					<li>The search function in the header now selects all items in a product which have the entered key word in the title</li>
					<li>Show the state of each item in the tree</li>
					<li>Scripts for semi-automatic deployment</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Removed nodes reappear in new session</li>
					<li>Sometimes the title does not update in the tree</li>
					<li>Feature erroneously displayed as leaf</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Faster traverse algorithm</li>
					<li>Avoid deep copy</li>
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

	p,
	li {
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
