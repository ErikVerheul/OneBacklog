# OneBacklog

> A Vue.js project

![img](https://github.com/ErikVerheul/OneBacklog/blob/master/src/assets/logo.png)

<b>The product vision:</b><br />
As super PO I need one integrated tool to manage the product backlog of all my products so that:
- I can map my portfolio in one tool
- My PO's can manage their products
- NOT IN MVP: Dependencies within products are made visible so that the team, their PO or myself can act upon it
- NOT IN MVP: Scrum teams can use the tool to do their refinements and run their sprints
- Only PO's are authorized to change priorities
- The tool runs in a browser and is accessible only by authorized users
- Basic security is in place
- The tool must be intuitive and self explaining, advanced features should not decrease usability for basic usage

<b>Security:</b><br />
The database has secure https access

<b>Authentication:</b><br />
The authentication is based on the following roles:
- '_admin': Is the database administrator. Can setup and delete databases. See the CouchDB documentation. Is also a guest to all products.
- 'admin': Can create and assign users to products. Is also a guest to all products.
- 'superPO': Can create and maintain products and epics for all products. Can change priorities at these levels.
- 'PO': Can create and maintain features and pbi's for the assigned products. Can change priorities at these levels.
- 'developer': Can create and maintain pbi's and features for the assigned products.
- 'guest': Can only view the items of the assigned products. Has no access to the requirements area view.<br />
Users can have multiple roles.

<b>Design basics:</b><br />
a product consists of:
- <b>epics</b> which consists of
- <b>features</b> which consists of
- <b>pbi's</b> of kind user-story/defect/spike which are realized by executing
- <b>tasks</b> (NOT IN MVP) and
- <b>multiple requirement areas</b> (NOT IN MVP) can be maintained on the feature level across products.

<b>Other design choices:</b><br />
The scope is the selected product. The tool assumes that products are independent of each other except for the requirement area. The requirement area (see https://less.works/less/less-huge/requirement-areas.html) is an attribute of the feature and used for filtering.<br />
Features have (business) value. Delivering the high priority features first is the aim of all participants.<br />
Priorities are set on pbi level. It is the responsibility of the PO to select the pbi's of the most important feature first.<br />
The owning team is an attribute of the pbi and used for filtering. A user can be member of one or more teams. A guest is not a member of a team.<br />
When multiple databases are created projects defined in different databases are considered completely independent.<br />

<b>Product and epic size estimate:</b><br />
Products and epics are estimated in T-shirt sizes.
Features and pbi's are estimated in story points using the. A common practise is to use the Fibonacci scale. However this is not enforced.

<b>Feature effort estimate:</b><br />
Both features and pbi's are estimated in story points. When all pbi's belonging to a feature are refined the feature effort should be the sum of the pbi efforts. The difference between the two shows how well the initial estimate was done.

<b>Spike effort estimate:</b><br />
A spike is a study, investigation or try out with a set maximum effort. The result is what is available when the time set is spent.
Spikes are estimated in person hours eliminating the need to translate story points to hours which can be a long discussion.

<b>Pbi's of kind Defects:</b><br />
Note: When a defect is found before a Pbi is set to done a task is created for its resolution.<br />
When a defect is found after a Pbi is set to done a defect Pbi is created with an estimated effort. Note that this effort was not accounted for when the pbi was estimated. This effort is considered as a measure of lack of quality in the refinement or the realization.

<b>Backlog refinement:</b>
- the preferred order for refinement is by feature. The tool supports a feature view of the backlog
- the team that refines a pbi becomes the owner of that pbi
- pbi's are estimated by the that team

NOT IN MVP: <b>Sprint backlog and planning board:</b><br />
The use of the electronic planning board is optional and only advised for use when team members are remote
- a sprint is dedicated to the increment of one product only; The tool should enforce this
- the team selects the pbi's to work on
- the team adds tasks to the pbi's
- a task is/will be assigned to a member of the owning team
- the workflow for the tasks usually has 4 stages: to-do, in-development, ready for test/review and done

<b>Pbi/defect status values:</b>
- <b>new</b>
- <b>ready</b> (refinement done, effort estimated)
- <b>in progress</b> (now in a sprint)
- <b>on hold</b> (not in a sprint anymore, waiting on the backlog)
- <b>done</b> (delivered wrt the DoD)
- <b>removed</b>

NOT IN MVP: <b>Dependencies:</b><br />
Is-dependent-on is the only type. When B is dependent on A then B must have a lower priority than A; The tool should enforce this.
Circular dependencies are not allowed; The tool should enforce this also.

NOT IN MVP: <b>Automatic update of multi user updates</b><br />
When more users work on the backlog of the same product the client presentation is updated automatically (no screen refresh needed) of changes made by other users.

<b>Role based authorization:</b><br />
The server admin has the privileges as set by CouchDB. The product admins have all privileges for their product(s) like user assignment. Product owners have the rights to change priorities for their products. A superPO has admin rights for all products and can create new products.
Developers can create new pbi's for their product(s) but not change priorities in the backlog.
Viewers can only read the information of the products assigned to them.

<b>Non functional requirements:</b>
100 simultaneous users, 1 update per second, updates by other users should be available within 1 second (either by page refresh or automatically)

<b>Implementation:</b>

![img](https://github.com/ErikVerheul/OneBacklog/blob/master/example-screen.png)

- Product, epic, feature, pbi, task and requirement area names are mapped to a key. That key is used for reference purposes so that the name can be updated independently.
- The history of products, epics, features, pbi's are stored and easily accessible. 
- The type of product, epic, feature and pbi can be changed among each other over one level. In theory a pbi can be upgraded to a feature. That feature to an epic and the epic to a product. The reverse can also be done. 
- A user can choose to follow any change by auto-email of a product, requirement area, epic, feature and pbi if he is allowed to.
- Users can add comments to an item.
- NOT IN MVP: Attachments can be added to each backlog item type.

<b>And avoid the traps of so-called 'agile' tools (see Product Backlog in LeSS, Bas Vodde cs.):</b><br />

- "The focus is on tools rather than the deep systemic problems, and then this diverts or avoids focusing on what’s important: Changing behavior and the system; these tools don't solve the real problems"
- These tools contain and promote reporting features, reinforcing traditional management-reporting and control behaviors
- It conveys a façade of improvement or agile adoption, when nothing meaningful has changed; ‘agile’ tools have nothing to do with being agile
- They often impose inflexible terminology and workflows to the teams, taking away process ownership and restricting improvement
- The backlog is often hidden for most people as access requires an expensive account
- These tools enable complexifying rather than simplifying
Finally see this https://www.youtube.com/watch?v=LAvM4_JY0Ic video about the real role the product owner has.

## Build Setup

``` bash
# install CouchDB
Install the database locally and create a server admin account. Use these credentials to start this app
and create other users with less privileges.
See http://docs.couchdb.org/en/stable/config/http.html#secure-socket-level-options to install SSL
Caveat: the current Chrome version has problems with self signed certificates,
type "chrome://flags/#allow-insecure-localhost" in the address field or use Firefox instead.

# install dependencies
cd to the directory of this app
npm install

# serve with hot reload for development at localhost:8080
npm run serve

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run all tests
npm run test
```
# Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
