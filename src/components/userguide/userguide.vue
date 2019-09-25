<template lang="html">
	<div>
	<app-header />
	<b-container>
		<b-row>
			<b-col cols="12" class="left-column">
				<h1>USER GUIDE</h1>
				<p v-if=this.$store.state.demo>Note: This is a demo version of the application.</p>
				<h4>The header</h4>
				<p>Always mention the version number located after the app name when reporting issues. When you click on the release number you will the <b>realease notes </b> will be displayed.</p>
				<h5>User guide</h5>
				<p>This text</p>
				<h5>Filter on time</h5>
				<p>With the split button next to the 'user guide' you can open a drop down list with 3 choices: Show the changes in the last 10 minutes, in the last hour and in the last 24 hours. After selecting an option the items changed in the chosen time frame will be selected. Branches not changed will not show. To return to the normal view press the button which now has the text 'Clear filter'. Note that this function works on the currently selected product. To see changes on another product select it first by clicking on one of its nodes.</p>
				<h5>Select on Id</h5>
				<p>All product items have a short Id for easy lookup and reference. This Id is 5 characters long. It is displayed in the product view right from the item title. When you select on an Id:
				<ul>
					<li>The item is found in the currently selected and opened product. The item will be selected and highlighted in the tree view.</li>
					<li>The item is found in the currently selected product but that product is not opened. The product will be opened and item will be selected and highlighted in the tree view</li>
					<li>The item is found in a product assigned to you which is not selected. You get a message but the item is displayed anyway.</li>
					<li>The item is found in a product NOT assigned to you. You get a message but the item is NOT accessable to you.</li>
					<li>The item is NOT found in the database. You get a message. Check if you made a mistype.</li>
					<li>More than one item with this Id was found. You get a message dat the first occurrence was picked. This unlikely event is logged for the server admin.</li>
				</ul>
				To undo the select clear the 'Select on Id' input field and press Enter.</p>
				<h5>Search on key word</h5>
				<p>Input field for the search button. Searches for the keyword in the title of all items of the current product. To return to the normal view empty the search field and press enter.</p>
				<h5>Filter on time + Search on key word</h5>
				<p>When you start a search when a filter is in effect or visa versa the other selection will be cleared first. You cannot have two selections on top of each other.</p>
				<h5>Select your view</h5>
				<p><a href="#pv">Products view</a></p>
				<p><a href="#rv">Requirements areas view</a></p>
				<p><a href="#sv">Setup view</a></p>
				<h5>User</h5>
				<p>
				<ul>
					<li>Change team: Not yet implemented.</li>
					<li>Select products: If multiple products are assigned to you, you can choose which of the should load on sign-in. You also need to choose which is the default product which loads first and open automatically.</li>
					<li>Change password: You need to know your old password. The password of user demoUser cannot be changed.</li>
					<li>License information: click to see the license regarding the source code.</li>
					<li>Sign out: Preferred way to sign out. Will stop the cookie authentication and reset the URL to sign in again. When you reset your browser with F5 or Ctrl-F5 you need to reset the URL your self.</li>
				</ul>
				</p>

				<div id="pv">
					<h4>Products view</h4>
					<p>The products view is the heart of the application. Here are the product backlog items created, maintained during their life cycle and prioritized by the product owner.</p>
					<b-img :src="require('./example-screen.png')" alt="Example screen" />
					<p>Product T-Shirt size indicates the input field to enter the size of the product. Other item types can have different units:</p>
					<p>Product and epic size estimate:
					<p class="indent20">Products and epics are estimated in T-shirt sizes. Features and pbi's are estimated in story points using the. A common practice is to use the Fibonacci scale. However this is not enforced.</p>
					<p>Feature effort estimate:</p>
					<p class="indent20">Both features and pbi's are estimated in story points. When all pbi's belonging to a feature are refined the feature effort should be the sum of the pbi efforts. The difference between the two shows how well the initial estimate was done.</p>
					<p>Spike effort estimate:</p>
					<p class="indent20">A spike is a study, investigation or try out with a set maximum effort. The result is what is available when the time set is spent.
						Spikes are estimated in person hours eliminating the need to translate story points to hours which can be a long discussion.</p>
					<p>State: All items have a state to track their progress. Pbi/defect status values are:
						<ul>
							<li>new</li>
							<li>ready (refinement done, effort estimated)</li>
							<li>in progress (now in a sprint)</li>
							<li>on hold (not in a sprint anymore, waiting on the backlog)</li>
							<li>done (delivered wrt the DoD)</li>
							<li>removed</li>
						</ul>
					</p>
				</div>
				<div id="rv">
					<h4>Requirements areas view</h4>
					<p>This view is not implemented yet.</p>
				</div>
				<div id="sv">
					<h4>Setup view</h4>
					<p>This view is only accessible by the server administrator.</p>
				</div>
				<h4>The welcome bar</h4>
				<p>This bar displays the user name, the database name and the number of products assigned to this user.</p>
				<h4>The event bar</h4>
				<p>This bar displays the latest event, a selection, a expansion/collaps of a tree branch, a warning or an error.<br>
					On the right side of this bar you see the <b>Sync light</b> which is hard to read when not lighted. It lights when another user changes a title or the position of one or more items in your tree view below. Your tree is updated instantly.</p>
					<p>The <b>Sync light</b> will turn red with the the text 'offline' when your connection is lost. In this condition you can not access the database. Wait for automatic recovery or restore the connection.</p>
				<h4>The backlog item tree</h4>
				<p>This large black field below the event bar shows all the products assigned to the current user with their descendant epics, features and user stories / defects / spikes in a layered tree structure. This is your main tool. What you can do depends on your assigned roles.</p>
				<p>You can have multiple products. Each of them consists of:
					<ul>
						<li>epics which consists of</li>
						<li>features which consists of</li>
						<li>pbi's of kind user-story/defect/spike which are realized by executing</li>
						<li>tasks (TO DO) and</li>
						<li>multiple requirement areas (TO DO) can be maintained on the feature level across products.</li>
					</ul>
				</p>
				<p>The authorization is set per product and based on the following roles:
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
				</p>
				<p>To open the context menu <b>left click</b> on a node to select, then <b>right click</b> to open the context modal. You will see a modal like this:</p>
				<b-img :src="require('./context-menu.png')" alt="Example context menu" />
				<p>Select the action to execute and press OK. But before doing see click the <b>need assistance?</b> button for some valuable tips.</p>
				<p>Be carefull when removing an item with all of its descendants. You will see a modal like this:</p>
				<b-img :src="require('./remove.png')" alt="Example context remove" />
				<p>Click the <b>need assistance?</b> button for some valuable tips. Click on cancel or the small X when uncertain. After removal a <b>Undo remove</b> button appears in the title bar. Click on this button te reverse your removals (last removel will be restored first).</p>
				<h4>Drag &amp; drop in the backlog item tree</h4>
				<p>This a powerful feature of this application. When you have the appropriate permissions you can move complete branches within one product. Use the context menu to move a branche to another product. You can promote a branch where a feature becomes an epic and all descendant pbi's features. Or the reverse. But usually you will prioritize items by moving them up or down on the same level. To do so select the item or branch with a <b>left-click</b> on the item and without releasing the mouse button drag the item to its new position. To select multiple items select one item, then the second while pressing the <b>shift key</b> and without releasing the mouse button move them to the new position. All selected items must be on the same level. Not all moves are allowed. Watch the event bar for warnings.</p>
				<h4>The title input field</h4>
				<p>On the right side of the screen above the Description field is the input field to change the title of the currently selected item. The change takes place when you move away from this field and click on another location. You will see the update in the tree view.</p>
				<h4>The item short Id</h4>
				<p>On the right side of the title field the short id of the displayed item is displayed. Use this Id in communications with other users of the application instead of using the title.</p>
				<h4>Subscribe to change notices</h4>
				<p>When you click on this button all changes to this item will be emailed to you provided you are signed in as a registered user and your provided email adress is correct. This will not work for users of generic accounts like demoUser or guest.</p>
				<h4>The description input field</h4>
				<p>As the title should short and concise, this the place de describe the product/epic/feature or user story|defect|spike. Use, if possible, the format 'I as &lt;my role&gt; want &lt;whatever it is&gt; so that &lt;the why&gt;'. Use the features this WYSIWYG component offers you. Upload attachments (TO DO) to add documentation.</p>
				<h4>The acceptance criteria input field</h4>
				<p>A backlog item can only be reported as 'DONE' when all acceptance criteria are met. To be able to estimate the effort the team must know the acceptance criteria up front. They are as important as the description.</p>
				<h4>Add comments</h4>
				<p>Instead of extending or overwriting the fields above you can start a discussion by using this button. It will open a WYSIWYG editor to write your text. Subscribed users will receive a copy of your comment by email (TO DO).</p>
				<h4>Filter comments</h4>
				<p>Enter a key word and you will only see comments including this key word.</p>
				<h4>The Comments, Attachments, History radio buttons</h4>
				<p>When you select Attachments (TO DO) or History you can do the same as with Comments. So, it is possible to add comments to the history log also.</p>
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
  background-color: #408fae;
  color: white;
  border: 1px solid black;
}

p {
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
  margin-bottom: 10px;
}
</style>
