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
***********************************************************************************

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
- <b>pbi's</b> of kind user-story/defect/spike which are realized by executing
- <b>tasks</b>

<p>All items sit in a tree structure. Epics, features and pbi's cannot exist without their parent. It is impossible to create orphans. No need to fix these relationships as a afterthought.</p>

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

By default the application uses two databases. The _users database owned by the admin/assistAdmin roles and a database holding the products. More databases can be created but the _users database is shared. What a user can see or do is determined by the roles assigned to that user.<br />
The roles are:
- '_admin': Users with this role are CouchDb server administrators. The credentials are stored in the local.ini file. Use the the Fauxton tool te add/delete these users. Can setup and delete databases. See the CouchDB documentation. The scope is per CouchDb instance including all databases.

The next two roles are set for all databases in a CouchDb instance and include all products defined in these databases:
- 'admin': The overall admin can create products, teams and maintain users and calendars. Can (un)assign databases and products to users. Can (un)assign global 'admin' and 'APO' roles to users. Can (un)assign user roles per product. Need not be a member of a team.
- 'APO': The Area Product Owners create and maintain the requirement areas. Can change priorities at the epic and feature level. Need not be a member of a team.

The next role is a light version of the admin role:
- 'assistAdmin': Can create teams and users. Can (un)assign databases and products to users. Can (un)assign user roles per product. Cannot (un)assign global roles or create products or remove users. Can only create users for databases/products he/she is assigned to by an admin. Need not be a member of a team.

These three roles are set per product in a database:
- 'PO': Maintains product definitions, creates and maintains epics, features and pbi's for the assigned products. Can change priorities at these levels. Must be member of a team.
- 'developer': Can create and maintain pbi's and features for the assigned products when team member. Must be member of a team.
- 'guest': Can only view the items of the assigned products. Has no access to attachments. Cannot join a team.
<p>Users can have multiple roles. Users can only see/access the products that are assigned to them by the admin/assistAdmin.<br />
When a PO or developer creates an item, that item is assigned to the team of that user. Subsequent changes to these items can ony be applied by members of that team.</p>

<b>Other design choices:</b><br />
The scope is the selected product. The requirement area (see https://less.works/less/less-huge/requirement-areas.html) is an attribute of an item and used for prioritization.<br />
Epics and their underlying features have (business) value. Delivering the high priority items first is the aim of all participants.<br />
Priorities are set on every level. Eg. when feature A has a higher priority than feature B all its pbi's have a higher priority than any pbi in feature B. It is the PO who selects the most important epics and the features within.<br />
The owning team is an attribute of the feature and pbi and used for filtering. A user can be member of one team only, but can switch to another team at will. The users with the _admin or admin role and the guests are not member of a team.<br />
When multiple databases are created, products defined in different databases are considered completely independent. However the user database with the authorizations is shared over all products.<br />

<b>Product and epic size estimate:</b><br />
Products and epics are estimated in T-shirt sizes.

<b>Feature effort estimate:</b><br />
Both features and pbi's are estimated in story points. A common practice is to use the Fibonacci scale. However this is not enforced. When all pbi's belonging to a feature are refined the feature effort should be the sum of the pbi efforts. The difference between the two shows how well the initial estimate was done.

<b>Spike effort estimate:</b><br />
A spike is a study, investigation or try out with a set maximum effort. The result is what is available when the time set is spent.
Spikes are estimated in person hours eliminating the need to translate story points to hours which can be a long discussion.

<b>Pbi's of kind Defects:</b><br />
Note: When a defect is found before a Pbi is set to done a task is created for its resolution.<br />
When a defect is found after a Pbi is set to done a defect Pbi is created with an estimated effort. Note that this effort was not accounted for when the pbi was estimated. This effort is considered as a measure of lack of quality in the refinement or the realization.

<b>Backlog refinement:</b>
- the preferred order for refinement is by feature. The tool supports a feature view of the backlog
- the team that refines a pbi becomes the owner of that pbi
- pbi's are estimated by that team

<b>Sprint backlog and planning board:</b><br />
The use of the electronic planning board is optional and only advised for use when team members are (need to be) remote
- a sprint is dedicated to the increment of one product only; The tool should enforce this
- the team selects the pbi's to work on
- the team adds tasks to the pbi's
- a task is/will be assigned to a member of the owning team; he/she is resposible for having the task done but can involve other to do the work
- the workflow for the tasks usually has 4 stages: to-do, in-development, ready for test/review and done

<b>Pbi/defect status values:</b>
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
Developers can create new pbi's for their product(s) but not change priorities in the backlog.
Viewers can only read the information of the products assigned to them.

<b>Non functional requirements:</b>
The number of simultaneous users viewing changes, made by a reasonable (not tested yet) number of users, is unlimited. The browser limits a smooth tree view response to approximately 200 visible nodes. The database can handle an unlimited number of items. Updates by other users are available within 1 second with a ADSL Internet connection. Notification of network connection loss and automatic recovery.

## Implementation

![Example products overview](https://github.com/ErikVerheul/OneBacklog/blob/master/public/img/example-screen.png)

- A short key of 5 characters alphamumeric are available for the users for direct lookup and reference in communications.
- The history of priority and attribute changes of products, epics, features, pbi's are stored and easily accessible. 
- The type of product, epic, feature, pbi and task can be changed by drag & drop among each other over one level. Any descendants are also up/downgraded. In theory a pbi can be upgraded to a feature, that feature to an epic. The reverse can also be done.
- A user can subscribe to change notices of any item of any product assigned to that user. The change notices are sent to his email address.
- Users can add comments to an item and to the automatic history log.
- Attachments can be added to each backlog item type.
<div>
    For performance reasons the size of the browser DOM is kept small. That's why there are two main views:
    <ul>
        <li>The 'Product detail' view of all products assigned to the user up to the task level. Only one product can be expanded. The user can select a subset of products to be shown and a default product to expand on load. The PO can update and move items within that product and set dependencies.</li>
        <li>The 'Products overview' view shows all assigned products up to the feature level. Multiple or all products can be expanded. The APO can asign requirement areas to items. The PO can set dependencies between items in the same product and on items residing in different products. The latter is an undesirable situation, that can be undone by moving items from one product to the other.</li>
    </ul>
</div>

<b>Sprint Backlog</b><br /><br />
![Example products overview](https://github.com/ErikVerheul/OneBacklog/blob/master/public/img/planning-board.png)
<p>By drag&#38;drop the user changes the state of the tasks in the sprint. Changes are synced with the boards of other users and the tree view. Touch devices are supported.</p>
<p>From the 'Product details' view context menu features and PBI's can be selected to be assigned to the current or next sprint:</p>
<ul>
    <li>When a feature is selected all its descendants (PBI's and tasks) are assigned</li>
    <li>When a PBI is selected, that PBI and it descendant tasks are assigned</li>
    <li>individual tasks cannot be assigned to a sprint (but can on the planning board)</li>
 </ul>

<p>Tasks added to a PBI later will automatically inherit the sprintId from their parent or sibling.</p>

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

## Build Setup
The app uses a secure https connection to the hosting site and for the cookie authentication over port 6984 to connect to the database. You can use the same certificate for both.<br/>

## install CouchDB
Install the CouchDb version 3.0.0 or higher on the remote host and create a server admin account.
Edit the 10-admins.ini file in `< couchdb install directory >/couchdb/etc/local.d`:</br>
Note: if this file does not exist than add/change these lines to the local.ini file.
```
[httpd]
enable cors = true

[cors]
origins = *
credentials = true
```
### install CouchDB v.3.3.3 locally
The http connection needs no certificates.
All CouchDb customization config settings are automatically set when initializing the application.
When starting the app the first time use the server admin credentials you created to install CouchDb.

### install CouchDB v.3.3.3 in the cloud
Obtain a www ssl certificate (e.g. from LetsEncrypt)</br>
Use the Config screen in Fauxton or edit the `local.ini` file in `< couchdb install directory >/couchdb/etc/`:</br>
```

[ssl]
enable = true
port = 6984 ; the default
cert_file = /opt/couchdb/letsencript/live/< your domain name >/cert.pem
key_file = /opt/couchdb/letsencript/live/< your domain name >/privkey.pem
cacert_file = /opt/couchdb/letsencript/live/< your domain name >/fullchain.pem
```
As this is a single page application we need to redirect to index.html if the url doesn’t match any assets uploaded to the server that we want to load.
When using Apache2 as your web server add these lines to the `/etc/apache2/sites-available/000-default-le-ssl.conf` file:
```
<IfModule mod_ssl.c>
<VirtualHost *:443>       
    ServerName onebacklog.net
    Include /etc/letsencrypt/options-ssl-apache.conf
    ServerAlias www.onebacklog.net
    SSLCertificateFile /etc/letsencrypt/live/< domain name >/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/< domain name >/privkey.pem
    # added lines
    DirectoryIndex index.html
    FallbackResource /index.html
</VirtualHost>
</IfModule>
```

## install the e-mail server
To sent e-mails when users subscribe to receive change notices on bacloklog items you need to install or use an existing e-mail service.</br>
The application `node.js/app.js` is intended to run in node.js and placed on the home directory of the account named `pm2`. The installOneBacklog.sh script does that by default.</br>
See the [pm2 docs](https://pm2.io/docs/runtime/reference/ecosystem-file/) to enable the service to restart automatically on (re)boor and error conditions.</br>
The application uses an subscription on [mailgun](https://www.mailgun.com/).
The .env file for the application looks like this:
```
COUCH_USER= < server admin user name >
COUCH_PW= < server admin password >
DOMAIN= mg.< your domain name >
API_KEY=< the API key you received from mailgun >
```
IMPORTANT: add this file to your .gitignore file as these credentials should never get exposed to the Internet!

## automatic certificate renewal
Let's encript renews your certificate every 3 months. Couchdb cannot access the renewed certificates directly.</br>
Create your ssl install directory /opt/couchdb/letsencript and 
add a script to copy these certificates automatically on renewal in the folder `/etc/letsencrypt/renewal-hooks/post` that Let's encrypt created for you:
``` bash
# Name this script copyCertsForCouchdb.sh or any other name
# Make this file executable with sudo chmod +x < this file name >
#!/bin/bash
cp -rfL /etc/letsencrypt/live/ /opt/couchdb/letsencrypt
chown -R couchdb:couchdb /opt/couchdb/letsencrypt/
```

### install the Vue-CLI
see https://cli.vuejs.org/

### install dependencies
cd to the directory of this app
``` bash
npm install
```

### adapt two files with environment settings for development and production
Note: both files have lines you MUST change for your instance.</br>
cd to the root directory of this app and use your favorite editor to create a file named `.env.development` and enter:
```
VITE_IS_DEMO=false // set to true only when you have created a demoUser with limited authorization
VITE_DEBUG=false // set to true to see console log messages on most critical events
VITE_DEBUG_CONNECTION=false // set to true to see console log messages regarding the CouchDb cookie authentication renewal
VITE_SITE_URL=http://localhost:8080 # or https://<your remote host> when the CouchDb instance is hosted in the cloud
VITE_API_URL=http://localhost:5984 # or https://<your remote host>:6984 when the CouchDb instance is hosted in the cloud
```

cd to the root directory of this app and use your favorite editor to create a file named `.env.production` and enter:
```
VITE_IS_DEMO=false // set to true only when you have created a demoUser with limited authorization
VITE_SITE_URL=https://< your domain name >  // MUST CHANGE
VITE_API_URL=https://< your domain name >:6984  // MUST CHANGE
```

## Finally
When starting the app the first time use the server admin credentials you created to install CouchDb.

### serve with hot reload for development at localhost:8080
``` bash
npm run dev
```

### lints and fixes files
``` bash
npm run lint
```

### build for production with minification
``` bash
npm run build
```

## Customize configuration
See [Configuration Reference](https://vitejs.dev/config/).
