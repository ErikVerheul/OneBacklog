# OneBacklog

A Vue.js web application. Licenced under GPL-3.0-or-later See LICENCE.txt

![img](https://github.com/ErikVerheul/OneBacklog/blob/master/src/assets/logo.png)

With version 1.0.0 the app is feature complete with the basics:

- security and authorization
- tree view of the backlog
- drag & drop backlog prioritization
- build in editor for the item description and the acceptance criteria
- assignment of requirement areas
- dependencies between items
- a state consistency check
- team assignment to items
- a generic and team calendars for the sprints
- a sprint planning board
- comments, history and attachments
- two way sycnchronization between backlog and planning board
- synchronization between user sessions, both for the tree view and the planning board
- a set of admin functions for backup/restore, user maintenance etc.
- automatic initiation of the first and possibly more databases

### Demo

A demo of the current stable version is online. Try https://onebacklog.net, signin as demo user and give me your feedback by registering your most wanted features and found defects. See the <b>release nodes</b> by clicking on the version number in the header of the app.

PLEASE RAISE AN ISSUE WHEN YOU FIND A DEFECT OR WANT TO ADD A GREAT FEATURE!

---

<b>The product vision:</b>

<p>In my practise I have noticed a disconnect between my client's development portfolio, often a collection of projects, and the backlogs of the scrum teams. The discussion about priorities is largely political with little involvement of the product owners until the project starts. This tool aims to be an aid to the product owner(s) and allows all participants in product development to have a complete, well structured, view of the purpose and progress of the product development. The tool is inspired by Large-Scale Scrum (LeSS) and favors the concept of product development rather than project execution.</p>

As Product Owner (PO) I need one integrated tool to manage the product backlog of all my products so that:

- I can map my portfolio in one tool
- My area product owner (APO) manages the cross product requirement area backlog so that multiple teams get aligned to deliver the highest value first
- Dependencies within products are made visible so that the team and myself can act upon it
- Scrum teams can use the tool to do their refinements and run their sprints
- Only PO's are authorized to change priorities
- The tool runs in a browser and is accessible only by authorized users
- Full security is in place
- The tool must be intuitive and self explaining, advanced features should not decrease usability for basic usage

And, now that most teams have to work from home due to the Corona virus:

- The tool offers immediate replication of changes made to the tree product backlog item structure and the planning board.

<p>Larger organizations have multiple PO's and several requirement Areas PO's (APOs). The APOs and the PO together form a team, the Product Owner Team. This team makes product-wide prioritization decisions, but the PO always has the final decision. Also, scope and schedule decisions stay with the PO, he decides when to release what. See https://less.works/less/less-huge/area-product-owner</p>

<b>Design basics:</b><br />

<p>The application runs in a browser that connects to a CouchDb nosql instance with one user database and one or more document databases. Each document database holds one or more products, a default sprint calendar and a members document for each team. A team can have its own team sprint calendar.</p>

A product consists of:

- <b>epics</b> which consists of
- <b>features</b> which consists of
- <b>user stories</b> of kind user-story/defect/spike which are realized by executing
- <b>tasks</b>

<p>All items sit in a tree structure. Epics, features and user stories cannot exist without their parent. It is impossible to create orphans. No need to fix these relationships as a afterthought.</p>

<b>Security:</b><br />
The database and the web server have secure https access.

<b>Authentication:</b><br />
The CouchDB build-in cookie authentication (RFC 2109) is used

<b>Authorization :</b><br />
Team membership plays a role in the authorization.<br />
Teams

- Teams are created by the admin or assistAdmin
- Initially a user is member of the team 'not assigned yet'
- A user can join or leave a team at will
- A user can be a member of one team only

By default the application uses two databases. The \_users database owned by the admin/assistAdmin roles and a database holding the products. More databases can be created but the \_users database is shared. What a user can see or do is determined by the roles assigned to that user.<br />
The roles are:

- '\_admin': Users with this role are CouchDb server administrators. The credentials are stored in the local.ini file. Use the the Fauxton tool te add/delete these users. Can setup and delete databases. See the CouchDB documentation. The scope is per CouchDb instance including all databases.

The next two roles are set for all databases in a CouchDb instance and include all products defined in these databases:

- 'admin': The overall admin can create products, teams and maintain users and calendars. Can (un)assign databases and products to users. Can (un)assign global 'admin' and 'APO' roles to users. Can (un)assign user roles per product. Need not be a member of a team.
- 'APO': The Area Product Owners create and maintain the requirement areas. Can change priorities at the epic and feature level. Need not be a member of a team.

The next role is a light version of the admin role:

- 'assistAdmin': Can create teams and users. Can (un)assign databases and products to users. Can (un)assign user roles per product. Cannot (un)assign global roles or create products or remove users. Can only create users for databases/products he/she is assigned to by an admin. Need not be a member of a team.

These three roles are set per product in a database:

- 'PO': Maintains product definitions, creates and maintains epics, features and user stories for the assigned products. Can change priorities at these levels. Must be member of a team.
- 'developer': Can create and maintain user stories and features for the assigned products when team member. Must be member of a team.
- 'guest': Can only view the items of the assigned products. Has no access to attachments. Cannot join a team.
<p>Users can have multiple roles. Users can only see/access the products that are assigned to them by the admin/assistAdmin.<br />
When a PO or developer creates an item, that item is assigned to the team of that user. Subsequent changes to these items can ony be applied by members of that team.</p>

<b>Other design choices:</b><br />
The scope is the selected product. The requirement area (see https://less.works/less/less-huge/requirement-areas.html) is an attribute of an item and used for prioritization.<br />
Epics and their underlying features have (business) value. Delivering the high priority items first is the aim of all participants.<br />
Priorities are set on every level. Eg. when feature A has a higher priority than feature B all its user stories have a higher priority than any user story in feature B. It is the PO who selects the most important epics and the features within.<br />
The owning team is an attribute of the feature and user story and used for filtering. A user can be member of one team only, but can switch to another team at will. The users with the \_admin or admin role and the guests are not member of a team.<br />
When multiple databases are created, products defined in different databases are considered completely independent. However the user database with the authorizations is shared over all products.<br />

<b>Product and epic size estimate:</b><br />
Products and epics are estimated in T-shirt sizes.

<b>Feature effort estimate:</b><br />
Both features and user stories are estimated in story points. A common practice is to use the Fibonacci scale. However this is not enforced. When all user stories belonging to a feature are refined the feature effort should be the sum of the user story efforts. The difference between the two shows how well the initial estimate was done.

<b>Spike effort estimate:</b><br />
A spike is a study, investigation or try out with a set maximum effort. The result is what is available when the time set is spent.
Spikes are estimated in person hours eliminating the need to translate story points to hours which can be a long discussion.

<b>User stories of kind Defects:</b><br />
Note: When a defect is found before a user story is set to done a task is created for its resolution.<br />
When a defect is found after a user story is set to done a defect user story is created with an estimated effort. Note that this effort was not accounted for when the user story was estimated. This effort is considered as a measure of lack of quality in the refinement or the realization.

<b>Backlog refinement:</b>

- the preferred order for refinement is by feature. The tool supports a feature view of the backlog
- the team that refines a user story becomes the owner of that user story
- user stories are estimated by that team

<b>Sprint backlog and planning board:</b><br />
The use of the electronic planning board is optional and only advised for use when team members are (need to be) remote

- a sprint is dedicated to the increment of one product only; The tool should enforce this
- the team selects the user stories to work on
- the team adds tasks to the user stories
- a task is/will be assigned to a member of the owning team; he/she is resposible for having the task done but can involve other to do the work
- the workflow for the tasks usually has 4 stages: to-do, in-development, ready for test/review and done

<b>User story/defect status values:</b>

- <b>new</b>
- <b>ready</b> (refinement done, effort estimated)
- <b>in progress</b> (now in a sprint)
- <b>done</b> (delivered wrt the DoD)
- <b>on hold</b> (not in a sprint anymore, waiting on the backlog)
- <b>removed</b> (when created by mistake, eg. a duplicate)

<b>Task status values:</b>

- <b>to-do</b>
- <b>in development</b>
- <b>ready for test/review</b> (by others than the developer)
- <b>done</b>
- <b>on hold</b> (still in the sprint, waiting for some event)
- <b>removed</b> (when created by mistake, eg. a duplicate)

<b>Dependencies:</b><br />
Dependencies can be set and maintained. When item B is dependent on A item A is conditional for item B. Item A and must have a higher priority than item B; The tool warns the user when violated. Circular dependencies are not allowed; The tool should enforce this.

<b>Automatic sync with other user's updates</b><br />
When more users work on the backlog of the same product the client presentation is updated automatically (no screen refresh needed) of changes made by other users. The same is true when team members share the planning board to discuss progress or plan for the next sprint.
<b>Role based authorization:</b><br />
The server admin has the privileges as set by CouchDB. The product admins have all privileges for their product(s) like user assignment. Product owners have the rights to change priorities for their products. A superPO has admin rights for all products and can create new products.
Developers can create new user stories for their product(s) but not change priorities in the backlog.
Viewers can only read the information of the products assigned to them.

<b>Non functional requirements:</b>
The number of simultaneous users viewing changes, made by a reasonable (not tested yet) number of users, is limited by the maximum nummer of sessions to the database. The browser limits a smooth tree view response to approximately 200 visible nodes (year 2020, today more than a user can display on his screen). The database can handle an unlimited number of items. Updates by other users are available within 1 second with a ADSL Internet connection. Notification of network connection loss and automatic recovery is in place.

## Implementation

### For technical documentation [click here](https://github.com/ErikVerheul/OneBacklog/blob/master/documentation.md)

![Example products overview](https://github.com/ErikVerheul/OneBacklog/blob/master/public/img/example-screen.png)

- A short key of 5 characters alphamumeric are available for the users for direct lookup and reference in communications.
- The history of priority and attribute changes of products, epics, features, user stories are stored and easily accessible.
- The type of product, epic, feature, user story and task can be changed by drag & drop among each other over one level. Any descendants are also up/downgraded. In theory a user story can be upgraded to a feature, that feature to an epic. The reverse can also be done.
- A user can subscribe to change notices of any item of any product assigned to that user. The change notices are sent to his email address. (not available in the public demo)
- Users can add comments to an item.
- Attachments can be added to each backlog item type.

<b>Sprint Backlog</b><br /><br />
![Example products overview](https://github.com/ErikVerheul/OneBacklog/blob/master/public/img/planning-board.png)

<p>By drag&#38;drop the user changes the state of the tasks in the sprint. Changes are synced with the boards of other users and the tree view. Touch devices are supported.</p>
<p>From the 'Backlog tree' view context menu features and user story's can be selected to be assigned to the current or next sprint:</p>
<ul>
    <li>When a feature is selected all its descendants (user story's and tasks) are assigned</li>
    <li>When a user story is selected, that user story and it descendant tasks are assigned</li>
    <li>individual tasks cannot be assigned to a sprint (but can on the planning board)</li>
 </ul>

<p>Tasks added to a user story later will automatically inherit the sprintId from their parent or sibling.</p>

<p>SprintIds are made available by the 'admin' when he generates the default sprint calendar. Sprint periods cannot overlap and need to be contiguous.
For now the calendar is stored in de database CONFIG file. Eventually products and even teams can have their own sprint calendar.
Then, the calendar items (iterations) are stored as type 'calendar' in the database, and not in the CONFIG file.</p>

<b>And avoid the traps of so-called 'agile' tools (see Product Backlog in LeSS, Bas Vodde cs.):</b><br />

- "The focus is on tools rather than the deep systemic problems, and then this diverts or avoids focusing on what’s important: Changing behavior and the system; these tools don't solve the real problems"
- These tools contain and promote reporting features, reinforcing traditional management-reporting and control behaviors
- It conveys a façade of improvement or agile adoption, when nothing meaningful has changed; ‘agile’ tools have nothing to do with being agile
- They often impose inflexible terminology and workflows to the teams, taking away process ownership and restricting improvement
- The backlog is often hidden for most people as access requires an expensive account
- These tools enable complexifying rather than simplifying</br>
  Finally see this https://www.youtube.com/watch?v=LAvM4_JY0Ic video about the real role the product owner has.
