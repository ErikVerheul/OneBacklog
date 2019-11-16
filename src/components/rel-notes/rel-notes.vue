<template>
	<div>
	<app-header />
	<b-container>
		<b-row>
			<b-col cols="12" class="left-column">
				<h1>RELEASE NOTES</h1>
				<p v-if=this.$store.state.demo>Note: This is a demo version of the application.</p>
				<hr>
				<h3>v.0.7.1 - 16 November 2019 Feature update</h3>
				<p>New features:</p>
				<ul>
					<li>The product view now has a combined filter on teams, tree depth, state and over time which can be saved for use in the next session</li>
					<li>Product backlog items are now owned by a team</li>
					<li>An authenticated user can assign a backlog item and its descendants to the users team</li>
					<li>Feature teams are encouraged. A warning is shown when a user tries to assing a user story, spike or defect to a different team than the team of the parent feature</li>
				</ul>
				<hr>
        <h3>v.0.7.0 - 23 October 2019 Major update</h3>
				<h5>Note that this release is not backwards compatible with previous releases. The format of the user profile in the _users database now includes database information. An upgrade can be fixed using Fauxton.</h5>
				<p>New features:</p>
				<ul>
					<li>The 'superPO' role now applies to all products in all databases</li>
					<li>The 'admin' role now applies to all users in all databases</li>
					<li>Users can switch between databases with assigned products to them</li>
					<li>Users can change team between teams registered in the current database</li>
					<li>Expanded 'SuperPO', 'admin' and 'server Admin' views.</li>
				</ul>
				<p>Design changes:</p>
				<ul>
					<li>Application wide support of multiple databases</li>
					<li>Support for easy backup creation</li>
					<li>Support for easy restore</li>
				</ul>
				<hr>
				<h3>v.0.6.2.1 - 21 September 2019 Bug fix</h3>
				<p>Bug fixes:</p>
				<ul>
					<li>Wrong order when moving multiple nodes</li>
				</ul>
				<hr>
				<h3>v.0.6.2 - 17 September 2019 Minor update</h3>
				<p>New features:</p>
				<ul>
					<li>Undo for item removals</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>REGRESSION: Shift select not working</li>
				</ul>
				<hr>
				<h3>v.0.6.1.1 - 10 September 2019 Minor fix</h3>
				<p>Missed updates:</p>
				<ul>
					<li>These release notes</li>
					<li>Text update on the welcome page. This application is now in beta.</li>
				</ul>
				<hr>
				<h3>v.0.6.1 - 10 September 2019 Major update</h3>
				<p>New features:</p>
				<ul>
					<li>Help added for context menu items</li>
					<li>Show warning when offline</li>
					<li>Clear the filters automatically when the input field is made empty (no press enter required)</li>
					<li>Give the cursor traveling the tree view another color than the selected nodes</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Do not sync changes made by any user at sign-in as the database just loaded is already up-to-date</li>
				</ul>
				<p>Design changes:</p>
				<ul>
					<li>Change to 5 characters alphanumeric short id for more resolution</li>
					<li>Integrate the ISlTreeNodeModel with the ISlTreeNode to one model</li>
					<li>Use mixin for displaying an event in components; create a mutation for this functionality for use in the VUEX store</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Tree view can handle 5000+ nodes due to design changes</li>
				</ul>
				<hr>
				<h3>v.0.6.0 - 27 August 2019 Major update</h3>
				<p>New features:</p>
				<ul>
					<li>Load only the products I am interested in now; Let me choose</li>
					<li>Have a short reference Id for items for communication and lookup</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Product title not updated when switching</li>
					<li>Product nodes do not show that they are selected</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Enhance drag &amp; drop performance</li>
				</ul>
				<hr>
				<h3>v.0.5.5 - 19 August 2019 Urgent fix</h3>
				<p>Bug fixes:</p>
				<ul>
					<li>Drag &amp; drop cannot select individual nodes</li>
					<li>Allow drag inside top product node</li>
				</ul>
				<hr>
				<h3>v.0.5.4 - 17 August 2019 Bug fixes and performance improvements</h3>
				<p>New features:</p>
				<ul>
					<li>Password change</li>
					<li>Remove products</li>
					<li>User can select his products to open at sign-in</li>
				</ul>
				<p>Bug fixes:</p>
				<ul>
					<li>Product top node selected for dragging</li>
				</ul>
				<p>Design changes:</p>
				<ul>
					<li>Load products as one batch</li>
					<li>Change _users setup for products</li>
				</ul>
				<hr>
				<h3>v.0.5.3 - 14 August 2019 Bug fixes and performance improvements</h3>
				<p>New features:</p>
				<p>Bug fixes:</p>
				<ul>
					<li>Open product view after signin</li>
					<li>Improve target selection</li>
					<li>Moving item hard to read when dragging</li>
					<li>Scroll bar disappears in product view</li>
				</ul>
				<p>Performance improvements:</p>
				<ul>
					<li>Show extra level on as needed basis</li>
					<li>Improve rendering performance</li>
					<li>Optimize heavy routines</li>
				</ul>
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
				<h3>v.0.4.5 - 11 May 2019 - First public release on onebacklog.net</h3>
			</b-col>
		</b-row>
	</b-container>
	</div>
</template>

<script>
import Header from '../header/header.vue'
export default {
  components: {
    'app-header': Header
  }
}
</script>

<style lang="css" scoped>
	.left-column {
		text-align: left;
		background-color: #408FAE;
		color: white;
		border: 1px solid black;
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
