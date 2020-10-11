<template lang="html">
	<div>
	<app-header />
	<b-container>
		<b-row>
			<b-col cols="12" class="left-column">
				<h1>USER GUIDE</h1>
				<p v-if=this.$store.state.demo>Note: This is a demo version of the application.</p>
				<p>When you, as CouchDB super admin, have installed CouchDB and the web application you have to <a href="#start_using">initialize the first database</a>.</p>
				<h4>The header</h4>
				<p>Always mention the version number located after the app name when reporting issues. When you click on the release number the <b>release notes </b> will be displayed.</p>
				<h5>User guide</h5>
				<p>This text</p>
				<h5>Filters and searches</h5>
				<p>For &apos;Filter in tree &apos;, &apos;Find on Id&apos; and &apos;Search in titles&apos; see <a href="#tv-features">Tree view search and filtering</a></p>
				<h5>Select your view</h5>
				<p>For &apos;Select your view&apos; see <a href="#pv">Product details</a>, <a href="#rv">Products overview</a> and <a href="#pb">Sprint planning board</a></p>
				<p>In the Product details view you van assign a sprint to a PBI or task. <a href="#sp">See Sprint assignment</a></p>
				<p>You can select the maintenance views <a href="#sv">Maintenance views</a> if you have the role of admin or server admin.
				<h5><em>User</em></h5>
				<ul>
					<li>Change database: Only applicable for users with products in more than one database.</li>
					<li>Change team: Its the user and only the user who can switch between teams.</li>
					<li>Select products: If multiple products are assigned to you, you can choose the products to be displayed. You also select which is the default product. On the next sign-in this products loads first and opens on top of the other products.</li>
					<li>Change password: You need to know your old password. The password of user demoUser cannot be changed.</li>
					<li>License information: click to see the license regarding the source code.</li>
					<li>Sign out: Preferred way to sign out. Will stop the cookie authentication and reset the URL to sign in again. When you reset your browser with F5 or Ctrl-F5 you need to reset the URL your self.</li>
				</ul>
				<div id="pv">
					<h4>Product details view</h4>
					<p>The Product details view is the heart of the application. Here are the product backlog items created, maintained during their life cycle and prioritized by the product owner.</p>
					<b-img :src="getImgUrl('img/example-screen.png')" alt="Example screen" />
					<p>The large black area below the event bar shows all the products assigned and selected by the current user with their descendant epics, features and user stories / defects / spikes in a layered tree structure. This is your main tool. What you can do depends on your assigned roles.</p>
					<p>You can have multiple products. Each of them consists of:
						<ul>
							<li>epics which consists of</li>
							<li>features which consists of</li>
							<li>pbi's of kind user-story/defect/spike which are realized by executing</li>
							<li>tasks</li>
						</ul>
					</p>

					<p>The authorization is set per product and based on the following roles:
					<ul>
						<li>'PO': Can create and maintain product, epics, features and pbi's for the assigned products. Can change priorities at all levels.</li>
						<li>'APO': The APO maintains the requirement areas backlog.</li>
						<li>'developer': Can create and maintain pbi's and features for the assigned products.</li>
						<li>'guest': Can only view the items of the assigned products.</li>
					</ul>
					Users can have multiple roles. Users can only access the products that are assigned to them.
					Two roles are setup globally when the OneBacklog instance is setup:
					<ul>
						<li>'_admin': Is the database administrator. Can setup and delete databases. See the CouchDB documentation.</li>
						<li>'admin': Can create and assign users to products.</li>
					</ul>
					<p>To open the context menu <b>left click</b> on a node to select, then <b>right click</b> to open the context modal. You will see a modal like this:</p>
					<b-img :src="getImgUrl('img/context-menu.png')" alt="Example context menu" />
					<p>Select the action to execute and press OK.</p>
					<p>If the item is a product an extra opion is displayed to make a clone this product. This feature is used when you have templates for reuse. Using a clone of a template can speed up the creation of simular products. Note that the history and any attachments are not copied.</p>
					<p>Click the <b>need assistance?</b> button for some valuable tips. Click on cancel or the small X when uncertain. You can make a shallow copy of any backlog item which will appear above the selected item. When you selected a product item you can make a full clone with a copy of all descendants. See the 'Need assistance?' text.</p>
					<h4>Drag &amp; drop in the backlog item tree</h4>
					<p>This a powerful feature of this application. As a PO you can move complete branches within one product and between products (in the Products overview). In the product detail view use the context menu to move a branch to another product. You can promote a branch where a feature becomes an epic and all descendant pbi's features. Or the reverse. But usually you will prioritize items by moving them up or down on the same level. To do so select the item or branch with a <b>left-click</b> on the item and without releasing the mouse button, drag the item to its new position. To select multiple items select one item, then the second while pressing the <b>Ctrl key</b> and without releasing the mouse button move them to the new position. All selected items must have the same parent. Use the Shift key to select a range of items. Not all moves are allowed. Watch the event bar for warnings.</p>
					<h4>The title input field</h4>
					<p>On the right side of the screen above the Description field is the input field to change the title of the currently selected item. The change takes place when you move away from this field and click on another location. You will see the update in the tree view.</p>
					<h4>The item short Id</h4>
					<p>On the right side of the title field the short id of the displayed item is displayed. Use this Id in communications with other users of the application instead of using the title.</p>
					<h4>Subscribe to change notices</h4>
					<p>When you click on this button all changes to this item will be emailed to you provided you are signed in as a registered user and your provided email address is correct. This will not work for users of generic accounts like demoUser or guest.</p>
					<h4>The description input field</h4>
					<p>As the title should be short and concise, this is the place to describe the product/epic/feature or user story|defect|spike. Use, if possible, the format 'I as &lt;my role&gt; want &lt;whatever it is&gt; so that &lt;the why&gt;'. Use the features this WYSIWYG component offers you. Upload attachments to add documentation.</p>
					<h4>The acceptance criteria input field</h4>
					<p>A backlog item can only be reported as 'DONE' when all acceptance criteria are met. To be able to estimate the effort the team must know the acceptance criteria up front. They are as important as the description.</p>
					<h4>Add comments</h4>
					<p>Instead of extending or overwriting the fields above you can start a discussion by using this button. It will open a WYSIWYG editor to write your text. Subscribed users will receive a copy of your comment by email.</p>
					<h4>Filter comments</h4>
					<p>Enter a key word and you will only see comments including this key word.</p>
					<h4>The Comments, Attachments, History radio buttons</h4>
					<b-img :src="getImgUrl('img/attachments.png')" alt="Example attachment menu" />
					<p>When adding multiple versions of an attachment with the same name the file name will be extended with _1, _2 etc. Click on an attachment button to let your browser display the attachment in a new tab.</p>
					<p>When you select Attachments or History you can do the same as with Comments. So, it is possible to add comments to the history log also.</p>
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
							<li>done (delivered wrt the Definition of Done)</li>
							<li>---------------------------------------------------------------</li>
							<li>on hold (not in a sprint anymore, waiting on the backlog)</li>
						</ul>
						Tasks have slightly different states:
						<ul>
							<li>ToDo</li>
							<li>in progress</li>
							<li>ready for test (by another team member)</li>
							<li>done (delivered wrt the Definition of Done)</li>
							<li>---------------------------------------------------------------</li>
							<li>on hold (still in the sprint, waiting to be continued)</li>
						</ul>
					</p>
					<p>Dependencies:</p>
					<p>Items with dependencies on other items are designated with a ▼ symbol in front of the title name. Use the context menu to assign dependencies or to inspect or remove them.
						When dependencies are set the items which become conditional for the dependent items are designated with a ▲ symbol. Use the context menu to inspect or remove them.
						When after dragging items in tree one or more dependencies are violated you receive an error message.
					</p>
					<p>Badges:</p>
					<b-img :src="getImgUrl('img/badges.png')" alt="Example badges" />
					<p>Note the badges as shown in the screen dump of the product view. These badges signal a change within the last hour. These badges are informing you of changes made by you and other users working simultaneously on the product. If the state of an item has changed the color turns sea blue. When the title, description or acceptance criteria have changed the 'See history' badge appears. When new comments or attachments are added these badges are displayed. When a badge is older than one hour it disappears when the tree is re-rendered (just click on another node). The state badge stays but looses its blue color.</p>
				</div>
				<div id="rv">
					<h4>Products overview</h4>
					<p>The 'Products overview' view shows all assigned products up to the feature level. Multiple or all products can be expanded. The APO can create and asign requirement areas to items. The PO can drag&#38;drop items between his products and set dependencies between items in different products (not recommanded).</p>
					<b-img :src="getImgUrl('img/products-overview.png')" alt="Products overview" />
					<p>This view shows all products in the database up to the feature level. The requirement area are color coded choosen by the APO.</p>
				</div>
				<div id="tv-features">
					<h4>Tree view search and filtering</h4>
					<div class="indent20">
						<h5>The Undo button</h5>
						<p>When adding, moving, removing items in the backlog tree or changing any attribute of an item these changes can be undone in reverse order. When you sign out your changes are final.</p>
						<h5>Filter in tree view</h5>
						<b-img :src="getImgUrl('img/filters.png')" alt="Example filters modal" />
						<p>Set a filter in this modal and save it for use in your next session. To return to the normal view, press the button which now has the text 'Clear filter'. Note that this function works on the currently selected product. To see changes on another product select it first by clicking on the product node.</p>
						<h5>Find on short Id</h5>
						<p>All product items have a short Id for easy lookup and reference. This Id is 5 characters long. It is displayed in the product view right from the item title. When you select on an Id:
						<ul>
							<li>The item is found in the currently selected and opened product. The item will be selected and highlighted in the tree view.</li>
							<li>The item is found in the currently selected product but that product is not opened. The product will be opened and item will be selected and highlighted in the tree view</li>
							<li>The item is found in a product assigned to you which is not selected. You get a message but the item is displayed anyway.</li>
							<li>The item is found in a product NOT assigned to you. You get a message but the item is NOT accessible to you.</li>
							<li>The item is NOT found in the database. You get a message. Check if you made a mistype.</li>
							<li>More than one item with this Id was found. You get a message dat the first occurrence was picked. This unlikely event is logged for the server admin.</li>
						</ul>
						<p>To undo the select clear the 'Select on Id' input field and press Enter.</p>
						<h5>Search in titles</h5>
						<p>Input field for the search button. Searches for the keyword in the title of all items of the current product. To return to the normal view empty the search field and press enter.</p>
						<h5>Recent changes + Search in titles</h5>
						<p>When you start a search when a filter is in effect or visa versa the other selection will be cleared first. You cannot have two selections on top of each other.</p>
					</div>
				</div>
				<div id="sp">
					<h4>Sprint assignment</h4>
					<p>A PBI can be assigned to the current or upcoming sprint. All tasks of the PBI are assigned to that sprint too. Each individual task can be unassigned. New tasks are automatically assigned to the PBI's sprint.<br/>
					When a PBI has no assigned sprint but a sprint is assigned to one of its tasks that sprint is also assigned to the PBI.</p>
				</div>
				<div id="pb">
					<h4>Sprint planning board</h4>
					<div class="indent20">
						<b-img :src="getImgUrl('img/planning-board.png')" alt="Example planning board" />
						<p>By drag&#38;drop the user changes the state of the tasks in the sprint. Changes are synced with the boards of other users and the tree view. Touch devices are supported.</p>
						<p>When you right click on a task the context menu is opened:</p>
						<b-img :src="getImgUrl('img/task-context.png')" alt="Example context menu" />
						<p>Note: Removing a task does not delete the task. In the Product details view you can change the state back to &apos;In progress&apos; or any other state.</p>
						<p>Left click on a &apos;Click to create a task here&apos; button to create a task in a column without task.</p>
						<h5>Unfinished tasks</h5>
						<b-img :src="getImgUrl('img/unfinished-tasks.png')" alt="Unfinished tasks" />
						<p>If your team has any tasks not DONE is a previous sprint this modal will pop up when a PO or developer opens the planning board. Select &apos;No, do not ask again&apos; to stop showing this message during this sprint. In the next sprint it will show up again.</p>
						<h5>Sprint ending, start of next sprint</h5>
						<p>When the end date and time of a sprint is due, the next sprint starts automatically. When the current sprint is about to end use the Product details view to:</p>
						<ul>
							<li>Remove unfinished items from the current sprint, to be picked later, or</li>
							<li>Assign the unfinished items to the next sprint, or</li>
							<li>Do nothing with the unfinished items and use the import feature as soon as the new sprint has started.</li>
						</ul>
					</div>
				</div>
				<div id="sv">
				<h4>Admins will see one or more of these view options:</h4>
				<ul>
					<li>
						<h5>Admin</h5>
						<p>The admin creates and maintains user permissions here. Team names can be added and listed.</p>
						<b-img :src="getImgUrl('img/admin-menu.png')" alt="Admin menu" />
					</li>
					<li>
						<h5>Server admin</h5>
						<p>The server admin creates backups and restores databases from a backup here. New databases can be created and deleted. A CouchDB FAUXTON session can be started in a separate tab of the browser.</p>
						<p>During operation a server admin can use the Server admin view which offers a menu of common tasks:</p>
						<b-img :src="getImgUrl('img/server-admin-menu.png')" alt="Server admin menu" />
					</li>
				</ul>
				</div>
				<h4>The welcome bar</h4>
				<p>This bar displays the user name, the database name and the number of products assigned to this user.</p>
				<h4>The event bar</h4>
				<p>This bar displays the latest event, a selection, a expansion/collapse of a tree branch, a warning or an error.<br>On the right side of this bar you see the <b>Sync light</b> which is hard to read when not lighted. It lights when another user changes a title or the position of one or more items in your tree view below. Your tree is updated instantly.</p>
				<p>The <b>Sync light</b> will turn red with the the text 'offline' when your connection is lost. In this condition you can not access the database. Wait for automatic recovery or restore the connection.</p>

				<h2 id="start_using"> START USING THE APPLICATION</h2>
				<p>When you, as server admin, login with your super admin credentials the application will notice that you are unknown in the _users database. That will trigger a conversation where you name the first database and enter your e-mail address.</p>
				<p>Click on 'Create database' to start the creation. If you entered a database name testdb and a valid e-mail address and all goes well you will see:</p>
				<ul>
					<li>createUser: Successfully created user couchdbadmin</li>
					<li>createLog: Success, log for database test is created</li>
					<li>setDatabasePermissions: Success, database permissions for test are set</li>
					<li>createConfig: Success, the configuration document is created</li>
					<li>installDesignViews: Success, the design document is created</li>
					<li>installDesignFilters: Success, the design document is created</li>
					<li>createRootDoc: Success, the root document is created</li>
					<li>createReqAreasParent: Success, the parent document is created</li>
					<li>createDefaultTeam: Success, default team with _id 15939385179343ke4w is created</li>
					<li>createFirstProduct: Success, product with _id 1593938517978ogbd5 is created</li>
					<li>addProductToUser: The product with Id 1593938517978ogbd5 is added to your profile with roles admin</li>
					<li>createMessenger: Success, messenger document is created</li>
					<li>updateUser: The profile of user 'couchdbadmin' is updated successfully</li>
				</ul>
				<p>Click on 'Exit' and sign-in again to see the product view with the root document and the first product,<br>
					then:<br>
					As 'admin' in the Admin view create the default sprint calendar and the first users and their roles. Assign one or more admins to take over that task.<br>
					Note: Keep your 'admin' role as a backup.
				</p>
			</b-col>
		</b-row>
	</b-container>
	</div>
</template>

<script>
import AppHeader from '../header/header.vue'
export default {
  components: {
    'app-header': AppHeader
	},

	methods: {
		getImgUrl(img) {
			return process.env.VUE_APP_SITE_URL + '/' + img
		}
	}
}
</script>

<style scoped>
.left-column {
  text-align: left;
  background-color: #408fae;
  color: white;
  border: 1px solid black;
}

p,
ul {
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
