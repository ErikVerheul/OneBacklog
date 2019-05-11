<template lang="html">
	<div>
		<h1>USER GUIDE</h1>
		<p v-if=this.$store.state.demo>Note: This is a demo version of the application. Do not use it for production.</p>
		<b-container fluid class="bv-example-row">
			<b-row>
				<b-col cols="12" class="left-column">
					<h4>The header</h4>
					<p class="indent10">Always mention the version number located after the app name when reporting issues.</p>
					<h5>User guide</h5>
					<p class="indent10">This text</p>
					<h5>Search on key word [planned for version 0.4.5]</h5>
					<p class="indent10">Input field for the search button. Searches for the keyword in the title of all items of the current product. That is the product for which an item is selected.</p>
					<h5>Search button</h5>
					<p class="indent10">When clicked all items in the current product with the keyword in the title will expand and highlighted.</p>
					<h5>Select your view</h5>
					<p class="indent10"><a href="#pv">Products view</a></p>
					<p class="indent10"><a href="#rv">Requirements areas view</a></p>
					<p class="indent10"><a href="#sv">Setup view</a></p>
					<h5>User</h5>
					<p class="indent10">Change team: not yet implemented.</p>
					<p class="indent10">Change password: not yet implemented.</p>
					<p class="indent10">License information: click to see the license regarding the source code.</p>
					<p class="indent10">Sign out: Preferred way to sign out. Will stop the cookie authentication and reset the URL to sign in again. When you reset your browser with F5 or Ctrl-F5 you need to reset the URL your self.</p>
					<div id="pv">
						<h4>Products view</h4>
						<p class="indent10">The products view is the heart of the application. Here are the product backlog items created, maintained during their life cycle and prioritized by the product owner.</p>
						<b-img class="indent10" :src="require('./example-screen.png')" alt="Example screen"/>
						<p class="indent10">Product T-Shirt size indicates the input field to enter the size of the product. Other item types can have different units:</p>
						<p class="indent20">Product and epic size estimate:<br>
							Products and epics are estimated in T-shirt sizes. Features and pbi's are estimated in story points using the. A common practice is to use the Fibonacci scale. However this is not enforced.</p>
						<p class="indent20">Feature effort estimate:<br>
							Both features and pbi's are estimated in story points. When all pbi's belonging to a feature are refined the feature effort should be the sum of the pbi efforts. The difference between the two shows how well the initial estimate was done.</p>
						<p class="indent20">Spike effort estimate:<br>
							A spike is a study, investigation or try out with a set maximum effort. The result is what is available when the time set is spent.
							Spikes are estimated in person hours eliminating the need to translate story points to hours which can be a long discussion.</p>
						<div class="indent10">
							State: All items have a state to track their progress. Pbi/defect status values are:
							<ul>
								<li>new</li>
								<li>ready (refinement done, effort estimated)</li>
								<li>in progress (now in a sprint)</li>
								<li>on hold (not in a sprint anymore, waiting on the backlog)</li>
								<li>done (delivered wrt the DoD)</li>
								<li>removed</li>
							</ul>
						</div>
					</div>
					<div id="rv">
						<h4>Requirements areas view</h4>
						<p class="indent10">This view is not implemented yet.</p>
					</div>
					<div id="sv">
						<h4>Setup view</h4>
						<p class="indent10">This view is only accessible by the server administrator.</p>
					</div>
					<h4>The welcome bar</h4>
					<p class="indent10">This bar displays the user name, the database name and the number of products assigned to this user.</p>
					<h4>The event bar</h4>
					<p class="indent10">This bar displays the latest event, a selection, a expansion/collaps of a tree branch or a warning.<br>
						On the right side of this bar you see the <b>Sync light</b> which is hard to read when not lighted. It lights when another user changes a title or the position of one or more items in your tree view below. Your tree is updated instantly.</p>
					<h4>The backlog item tree</h4>
					<p class="indent10">This large black field below the event bar shows all the products assigned to the current user with their descendant epics, features and user stories / defects / spikes in a layered tree structure. This is your main tool. What you can do depends on your assigned roles.</p>
					<div class="indent10">
						You can have multiple products. Each of them consists of:
						<ul>
							<li>epics which consists of</li>
							<li>features which consists of</li>
							<li>pbi's of kind user-story/defect/spike which are realized by executing</li>
							<li>tasks (NOT IN MVP) and</li>
							<li>multiple requirement areas (NOT IN MVP) can be maintained on the feature level across products.</li>
						</ul>
					</div>
					<div class="indent10">The authorization is set per product and based on the following roles:
						<ul>
							<li>'_admin': Is the database administrator. Can setup and delete databases. See the CouchDB documentation. Is also a guest to all products.</li>
							<li>'areaPO': The requirement area PO maintains the requirements area backlog and can prioritize features in the teams backlog.</li>
							<li>'admin': Can create and assign users to products. Is also a guest to all products.</li>
							<li>'superPO': Can create and maintain products and epics for all products. Can change priorities at these levels.</li>
							<li>'PO': Can create and maintain features and pbi's for the assigned products. Can change priorities at these levels.</li>
							<li>'developer': Can create and maintain pbi's and features for the assigned products.</li>
							<li>'guest': Can only view the items of the assigned products. Has no access to the requirements area view.</li>
						</ul>
						Users can have multiple roles. Users can only access the products that are assigned to them.
					</div>
					<p class="indent10">To add an item <b>double click</b> on a node. You will see a modal like this:</p>
					<b-img class="indent10" :src="require('./new-item.png')" alt="Example item addition"/>
					<p class="indent10">Select the item type to create and press OK.</p>
					<p class="indent10">To remove an item with all of its descendants first selcet it with a <b>left-click</b> then do a <b>right-click</b>. You will see a modal like this:</p>
					<b-img class="indent10" :src="require('./remove-item.png')" alt="Example item removal"/>
					<p class="indent10">Click on the small X when uncertain. After removal the items are still in the database. Only the server admin can recover them.</p>
					<h4>Drag &amp; drop in the backlog item tree</h4>
					<p class="indent10">This a powerful feature of this application. When you have the appropriate permissions you can move complete branches within one product and even between products. You can promote a branch where a feature becomes an epic and all descendant pbi's features. Or the reverse. But usually you will prioritize items by moving them up or down on the same level. To do so select the item or branch with a <b>left-click</b> on the item and without releasing the mouse button drag the item to its new position. To select multiple items select one item, then the second while pressing the <b>shift key</b> and without releasing the mouse button move them to the new position. All selected items must be on the same level. Not all moves are allowed. Watch the event bar for warnings.</p>
					<h4>The title input field</h4>
					<p class="indent10">On the right side of the screen above the Description field is the input field to change the title of the currently selected item. Th change takes place when you move away from this field and click on another location. You will see the update in the tree view.</p>
					<h4>Subscribe to change notices</h4>
					<p class="indent10">When you click on this button all changes to this item will be emailed to you provided you are signed in as a registered user and your provided email adress is correct. This will not work for users of generic accounts like demoUser or guest.</p>
					<h4>The description input field</h4>
					<p class="indent10">As the title should short and concise, this the place de describe the product/epic/feature or user story|defect|spike. Use, if possible, the format 'I as &lt;my role&gt; want &lt;whatever it is&gt; so that &lt;the why&gt;'. Use the features this WYSIWYG component offers you. Upload attachments (NOT IN MVP) to add documentation.</p>
					<h4>The acceptance criteria input field</h4>
					<p class="indent10">A backlog item can only be reported as 'DONE' when all acceptance criteria are met. To be able to estimate the effort the team must know the acceptance criteria up front. They are as important as the description.</p>
					<h4>Add comments</h4>
					<p class="indent10">Instead of extending or overwriting the fields above you can start a discussion by using this button. It will open a WYSIWYG editor to write your text. Subscribed users will receive a copy of your comment by email (NOT IN MVP).</p>
					<h4>Filter comments</h4>
					<p class="indent10">Enter a key word and you will only see comments including this key word.</p>
					<h4>The Comments, Attachments, History radio buttons</h4>
					<p class="indent10">When you select Attachments (NOT IN MVP) or History you can do the same as with Comments. So, it is possible to add comments to the history log also.</p>
				</b-col>
			</b-row>
		</b-container>
	</div>
</template>

<script>
	export default {}

</script>

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

	a {
		color: black;
		text-decoration: underline;
	}

	img {
		margin-bottom: 10px
	}

</style>
