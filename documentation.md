# Technical documentation

Direct links to subjects:

[Build the client software](#build-the-client-software)<br>
[Database fields mapping to node props](#database-fields-mapping-to-node-props)<br>
[The tree nodes](#the-tree-nodes)<br>
[Item types](#item-types)<br>
[User roles](#user-roles)<br>
[Access to team owned items](#access-to-team-owned-items)<br>
[Sprint Backlog](#sprint-backlog)<br>
[The events and their usage](#the-events-and-their-usage)<br>
[Team documents](#team-documents)<br>
[Team, sprintId and taskOwner assignment](#team-sprintid-and-taskowner-assignment)<br>
[Install CouchDB](#install-couchdb)<br>
[Finally](#finally)<br>
[Known errors and issues](#known-errors-and-issues)

## Build the client software

Clone the OneBacklog software from Github.

### install dependencies

cd to the directory of this app

    npm install

### Adapt four files with environment settings for development and production (and the mail service)

#### Update the generic .env file

cd to the root directory of this app and change the following parameters in the .env file in the app install root directory:

    DOMAIN_NAME=< the (sub)domain name of your web server > // eg. DOMAIN_NAME=ourBacklog.ourcompanyname.com
    TARGET_DIR=< the target (home) directory on the remote host > // TARGET_DIR=you@<your (sub)domain name>:/home/you if you have SSH access to the web server
    WEB_DIR=< the directory on the remote host containing the public html files > // WEB_DIR=/var/www/html for Apache web server
    PM2_DIR=< the home directory of the account on the remote host running PM2 for the mail service> // PM2_DIR=/home/pm2 when PM2 is installed and used as process management tool
    LOCAL_HOST=localhost
    LOCAL_PORT=8080

#### Update the Vite .env files (optional)

cd to the root directory of this app and use your favorite editor to modify the file named `.env.development` and change the boolean values to true if needed:

    VITE_IS_DEMO=false // set to true only when you have created a demoUser with limited authorization
    VITE_DEBUG=false // set to true to see console log messages on most critical events
    VITE_DEBUG_ACCESS=false // set to true to see console log messages regarding the user access rigths
    VITE_DEBUG_CONNECTION=false // set to true to see console log messages regarding the CouchDb cookie authentication renewal
    // the set values in your .env file are used to set the local host and port
    VITE_LOCAL_PORT=${LOCAL_PORT}
    VITE_SITE_URL=http://${LOCAL_HOST}:${LOCAL_PORT}
    VITE_API_URL=http://${LOCAL_HOST}:5984

cd to the root directory of this app and use your favorite editor to modify the file named `.env.production` and change the boolean value to true if needed:

    VITE_IS_DEMO=false // set to true only when you have created a demoUser with limited authorization
    // the DOMAIN_NAME value set in your .env file is used to set the remote host for the web server
    VITE_SITE_URL=https://${DOMAIN_NAME}
    // the DOMAIN_NAME value set in your .env file is used to set the remote host for the CouchDB API
    VITE_API_URL=https://${DOMAIN_NAME}:6984

#### CREATE the mail service .env file (optional)

When using an email provider like Mailgun add a .env file in the mailservice directory with your CouchDb and Mailgun credentials.<br>
`Prevent the publication of this sensitive information in your .gitignore file` like so:

    # mailservice environment file
    mailservice/.env

and create your .env file like so:

    DOMAIN_NAME=<your (sub)domain name>
    COUCH_USER=name
    COUCH_PW=password
    API_KEY=your key

### serve with hot reload for development at localhost:8080

    npm run dev

### lints and fixes files

    npm run lint

### build for production with minification

    npm run build

### Customize configuration

See the [Vite Configuration Reference](https://vitejs.dev/config/)

## Database fields mapping to node props

Note: Use the CouchDb tool Fauxton to inspect the documents in the database.

When the database field is **loaded on request** the value is not stored in the node object. The value is loaded on demand when displaying the current item.

| Field in Database backlogItem document                                      | Prop in node                                                                                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| "type": "backlogItem"                                                       | used in database filters only                                                                                                       |
| "productId"(string)                                                         | productId                                                                                                                           |
| "parentId"(string)                                                          | parentId                                                                                                                            |
| "\_id"(string)                                                              | \_id                                                                                                                                |
| "taskOwner"(string)                                                         | data.taskOwner                                                                                                                      |
| "team"(string)                                                              | data.team                                                                                                                           |
| "level"(Integer)                                                            | level                                                                                                                               |
| "subtype"(Integer)                                                          | data.subtype                                                                                                                        |
| "state"(Integer)                                                            | data.state                                                                                                                          |
| "tssize"(Integer)                                                           | **loaded on request**                                                                                                               |
| "spsize"(Integer)                                                           | **loaded on request**                                                                                                               |
| "color"(hex)                                                                | data.reqAreaItemColor: doc.color, // only applicable for req area documents (productId = MISC.AREA_PRODUCTID, level = 3 Epic level) |
| "spikepersonhours"(Integer)                                                 | **loaded on request**                                                                                                               |
| "reqarea"(string)                                                           | data.reqarea                                                                                                                        |
| "dependencies": []                                                          | dependencies                                                                                                                        |
| "conditionalFor": []                                                        | conditionalFor                                                                                                                      |
| "title"(string)                                                             | title                                                                                                                               |
| "followers": []                                                             | loaded on request; contains objects with user name and email address                                                                |
| "description"(string, encoded on save, decoded on load)                     | **loaded on request**                                                                                                               |
| "descriptionEncoding"(string), null if base64 encoded, "escaped" if escaped | **loaded on request**                                                                                                               |
| "acceptanceCriteria"(string, encoded on save, decoded on load)              | **loaded on request**                                                                                                               |
| "acceptanceEncoding"(string), null if base64 encoded, "escaped" if escaped  | **loaded on request**                                                                                                               |
| "priority"(Integer)                                                         | data.priority                                                                                                                       |
| "sprintId"(string)                                                          | data.sprintId                                                                                                                       |
| "comments": []                                                              | **loaded on request**                                                                                                               |
| "history": []                                                               | **loaded on request**                                                                                                               |
| "delmark"(string)                                                           | if present the document is marked for deletion with a group removal UID (in versions > 1.8)                                         |
| "unremovedMark"(string)                                                     | mark the unremoval of the document with the remove group id (delmark value) to enable nested removals and undos                     |
| "lastPositionChange"                                                        | data.lastPositionChange                                                                                                             |
| "lastStateChange"                                                           | data.lastStateChange                                                                                                                |
| "lastContentChange"                                                         | data.lastContentChange, // last change of title, description or acceptance criteria                                                 |
| "lastCommentAddition"                                                       | data.lastCommentAddition                                                                                                            |
| "lastAttachmentAddition"                                                    | data.lastAttachmentAddition                                                                                                         |
| "lastAttachmentRemoval"                                                     | data.lastAttachmentRemoval                                                                                                          |
| "lastOtherChange"                                                           | data.lastOtherChange:, // last other changes of team, subtype(3x), spSize, tsSize, dependency, req area, subscription               |
| "\_attachments": {}                                                         | system field when attachments are stored; attachments are **loaded on request**                                                     |

Other document types are logging, team and config. Use Fauxton to see the field definitions. The logging and config documents are one-off-a-kind documents.

## The tree nodes

The node properties and their origin

    path, // the access path in the tree model, is calculated from the doc.productId, doc.level, doc.priority
    pathStr: JSON.stringify(path), // covenience string for rendering
    ind, // the index in the children array, equals path.slice(-1)
    level: path.length, // convenience integer for rendering.

The node level determines the item type. See [Item types](#item-types)

    productId: doc.productId,
    parentId: doc.parentId,
    _id: doc._id,
    children: [], // an array of nodes which also can have children

    title: doc.title, // unencoded string
    isSelectable: true || false // default is true
    isSelected: true only if isSelectable || false
    isDraggable: true || false, // depending on the user roles
    isExpanded: true || false, // initially the tree of the default product is expanded up to the feature level
    doShow: true, // false if filtered out for rendering
    dependencies: doc.dependencies, // array with ids
    conditionalFor: doc.conditionalFor, // array with ids
    data: {
        priority: doc.priority,
        state: doc.state,
        reqarea: doc.reqarea, // or null or not present
        sprintId: doc.sprintId, // the sprint this item is (was) in; or null or not present
        team: doc.team, // the team membership of the user. Is updated automatically if a user changes the state of the task
        taskOwner: doc.taskOwner, // the task owner, member of the team, is responsible for having the task done but he need not to do that work him self
        subtype: doc.subtype,
        reqAreaItemColor: doc.color, // only applicable for req area documents (productId = MISC.AREA_PRODUCTID, level = 3)
        lastPositionChange: doc.lastPositionChange,
        lastStateChange: doc.lastStateChange,
        lastContentChange: doc.lastContentChange,
        lastCommentAddition: doc.lastCommentAddition,
        lastAttachmentAddition: doc.lastAttachmentAddition,
        lastAttachmentRemoval: doc.lastAttachmentRemoval,
        lastOtherChange: doc.lastOtherChange
    }

#### Temporary and private use, not stored, not synced with other on-line users

    node.data.tmp = { targetParentId: targetParentNode._id, team: node.data.team } set if options.createParentUpdateSets === true in applyNodeInsertionRules

    tmp: {
        isHighlighted_1: boolean // light blue
        isHighlighted_2: boolean // light green
        isWarnLighted: boolean // red
        markedViolations: [{ column, isDep, isCond }]
        // column: number to place this dependency violation in, isDep: true if the dependency endpoint; isCond: true if the conditional for endpoint

        savedIsExpandedInCondition: isExpanded // to restore the original view after finding condition violations
        savedDoShowInCondition: doShow // to restore the original view after finding condition violations
        savedHighLigthsInCondition: { isHighlighted_1: boolean, isHighlighted_2: boolean, isWarnLighted: boolean }
        savedIsExpandedInDependency: isExpanded // to restore the original view after finding dependency violations
        savedDoShowInDependency: doShow // to restore the original view after finding dependency violations
        savedHighLigthsInDependency: { isHighlighted_1: boolean, isHighlighted_2: boolean, isWarnLighted: boolean }
        savedIsExpandedInFilter: isExpanded, // to restore the original view after applying a filter
        savedDoShowInFilter: doShow // to restore the original view after applying a filter
        savedHighLigthsInFilter: { isHighlighted_1: boolean, isHighlighted_2: boolean, isWarnLighted: boolean }
        savedIsExpandedInFindId: isExpanded, // to restore the original view after the selection of an item by Id
        savedDoShowInFindId: doShow // to restore the original view after the selection of an item by Id
        savedHighLigthsInFindId: { isHighlighted_1: boolean, isHighlighted_2: boolean, isWarnLighted: boolean }
        savedIsExpandedInTitles: isExpanded, // to restore the original view after applying a search for a string in titles
        savedDoShowInTitles: doShow // to restore the original view after applying a search for a string in titles
        savedHighLigthsInTitles: { isHighlighted_1: boolean, isHighlighted_2: boolean, isWarnLighted: boolean }
    }

## Item types

The item types are defined in the CONFIG file:

    "itemType": [
        "RequirementArea",
        "Database",
        "Product",
        "Epic",
        "Feature",
        "User story", // or spike or defect
        "Task"
    ],

Requirement areas are children of the 'REQUIREMENT AREAS' dummy product with id '0-requirement-areas'. All req areas have productId = parentId = '0-requirement-areas'.

These types map to the level attribute in the database documents and in the tree nodes (now the same values for both)

| level      | in database | in tree node (= path.length) |
| ---------- | ----------- | ---------------------------- |
| Database   | 1           | 1                            |
| Product    | 2           | 2                            |
| Epic       | 3           | 3                            |
| Feature    | 4           | 4                            |
| User story | 5           | 5                            |
| Task       | 6           | 6                            |

## User roles

The '\_admin' role is set on CouchDb creation. This server admin role can create, replicate and delete databases. Initinally the '\_admin' also has the role 'admin'.

All other roles must be assigned to users by an admin. An admin can assign other admins or assistAdmins with limited rights. A user can have different roles in different databases.
Write access is dependent on role and level. Write access includes deletion.
All roles have read access to their assigned databases and the assigned products in that database.
These roles are set during loading by haveWritePermission(...). See GenericMixin.js.

    The known roles are:
    "_admin":
    description: Is the database administrator. Can setup and delete databases. Can update root documents. See the CouchDB documentation.
    products: n/a,
    writeAccessLevel: 1 (Database)

    "admin":
    description: Can create and remove users and teams. Can assign products to teams. The role 'admin' is a permission on the \_users and document databases,
    products: n/a,
    writeAccessLevel: 2 (Product)

    "assistAdmin":
    description: The assistant admin role is a generic role with access to all user profiles and all product definitions. However, the assistant admin can only create users for databases/products he/she is assigned to by an admin.
    products: must be assigned by an admin
    writeAccessLevel: 2 (Product)

    "APO":
    description: Can access the requirement areas with write access and can prioritise products, epics and features (level 2, 3 and 4). The role 'APO' is a permission on the document database.
    products:  must be assigned by an admin
    writeAccessLevel: 2 (Product)

    "PO":
    description: Can create, maintain and remove epics, features and user stories for the assigned products. Can change priorities at these levels. This role is set by the 'admin' at the product level.
    products:  must be assigned by an admin
    writeAccessLevel: 2,3,4,5 (Product up to task level)

    "developer":
    description: Can create and maintain user stories and features for the assigned products. This role is set by the 'admin' at the product level.
    products:  must be assigned by an admin
    writeAccessLevel: 4,5,6 (Feature up to task level)

    "guest":
    description: Can only view the items of the assigned products. Has no access to the requirement areas view. This role is set by the 'admin' at the product level.
    products:  must be assigned by an admin
    writeAccessLevel: null (none)

## Access to team owned items

By default an item is owned by dummy team 'not assigned yet'.
When a level authorized user changes state of an item, the item is assigned to the user's team.
Items with an assigned team can only be moved, removed, or changed by members of that team.

## Sprint Backlog

From the 'Backlog tree' view context menu features, user stories and tasks can be selected to be assigned to the current or next sprint:

- When a feature is selected all its descendants (user stories and tasks) are assigned
- A feature without user stories cannot be assigned to a sprint
- When a user story is selected, that user story and it descendant tasks are assigned
- Individual tasks can also be assigned to a sprint

Tasks added to a user story later will automatically inherit the sprintId from their parent or sibling.

SprintIds are made available by the 'admin' when he generates the default sprint calendar. Sprint periods cannot overlap and need to be contiguous.
The calendar is stored in each database CONFIG file. The admin/assistAdmin can create a team calendar from the default calendar and change that calendar at will.
A team calendar will be removed by an admin if the team is removed.

    defaultSprintCalendar = [
    {
        id: sprintId // string
        name, // string
        startTimestamp, // number
        sprintLength, // number
    },
    {
        id: sprintId // string
        name, // string
        startTimestamp, // number
        sprintLength, // number
    },
    ...
    ]

In the CONFIG document the user story subtypes are defined:

    "subtype": [
        "User story", (the default)
        "Spike",
        "Defect"
    ],

In the CONFIG document the item states are defined:

| state number | all item types except task | task             |
| ------------ | -------------------------- | ---------------- |
| 0            | state not in use           | state not in use |
| 1            | "On hold"                  | "On hold"        |
| 2            | "New"                      | "To-do"          |
| 3            | "Ready"                    | "To-do"          |
| 4            | "In progress"              | "In progress"    |
| 5            | "Done"                     | "Done"           |

Items can move to state task and back

The teams, their members and the optional team calendar are stored in documents of type 'team':

    "teams": {
        "not assigned yet": [userName-1, userName-2],
        "another team": [userName-3, userName-4],
    },
    teamCalendar: []

The default team is "not assigned yet". A user can be member of one team only at the time.<br>

The store holds an object with the data of the current user. This object is initialised with the \_session data.<br>
email, myTeam, currentDb, myDatabases and myProductViewFilterSettings are updated when otherUserData and config are read.

    state.userData = {
        user: res.data.name, // when loading the session
        email: undefined,
        myTeam: undefined,
        password: authData.password,
        currentDb: undefined,
        roles: res.data.roles, // when loading the session
        myDatabases: {},
        myProductViewFilterSettings: {},
        myFilterSettings: undefined,
        doNotAskForImport // if true do not ask for importing unfinished tasks in the current sprint
        doNotMessageMyself: 'false' // if 'true' do not send an email notification on changes I caused myself
    }

The entry for undoing the remove in a last-in first-out sequence<br>
The removed node is the parent of the removed children.
Example:

    const entry = {
        type: 'undoRemove',
        delmark: payload.delmark,
        isProductRemoved: payload.node.level === LEVEL.PRODUCT,
        itemsRemovedFromReqArea,
        removedDescendantsCount,
        removedExtConditions: removed.removedExtConditions,
        removedExtDependencies: removed.removedExtDependencies,
        removedIntConditions: removed.removedIntConditions,
        removedIntDependencies: removed.removedIntDependencies,
        removedNode,
        sprintIds: sprintsAffected
    }
    if (entry.isProductRemoved) {
        entry.removedProductRoles = rootGetters.getMyProductsRoles[payload.node._id]
    }
    ...

## The events and their usage

IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
Save the history, to trigger the distribution to other online users, when all other database updates are done.

Note that changes to all documents are distributed with the changes feed. The changes to backlog item documents are filtered and processed in sync.js.

The first 4 keys of every event object are: 'event name', 'by', 'email' and 'timestamp'

- distibuted events are processed in de synchronization
- mailed events are send to users that have subscribed to be noticed for changes
- listed events appear in the history listing

Rule for creating an event: (Y means the prpperty is required)

| property                                                                       | distibuted | mailed | listed |
| ------------------------------------------------------------------------------ | ---------- | ------ | ------ |
| eventname: [array with data elements]                                          | Y          | Y      | Y      |
| by: rootState.userData.user                                                    | Y          | Y      | Y      |
| email: rootState.userData.email                                                |            | Y      |        |
| doNotMessageMyself: rootState.userData.myOptions.doNotMessageMyself === 'true' |            | Y      |        |
| timestamp: Date.now()                                                          | Y          | Y      | Y      |
| isListed: true                                                                 |            |        | Y      |
| sessionId: rootState.mySessionId                                               | Y          |        |        |
| distributeEvent: true                                                          | Y          |        |        |

Events to be ignored only need a timestamp:

    ignoreEvent: ['removeDescendants'],
    timestamp: Date.now()

### The event list

| distibuted | mailed | listed | event                       | source file name                                      |
| ---------- | ------ | ------ | --------------------------- | ----------------------------------------------------- |
| Y          | Y      | Y      | acceptanceEvent             | update.js                                             |
| n/a        | n/a    | Y      | addCommentEvent             | update.js // stored in the comments array             |
| Y          | N      | N      | addItemsToSprintEvent       | planningboard.js                                      |
| Y          | Y      | Y      | addSprintIdsEvent           | move.js, planningboard.js                             |
| Y          | N      | N      | allItemsAreMoved            | move.js // updates the special Messenger doc          |
| Y          | N      | N      | boardReloadEvent            | planningboard.js                                      |
| Y          | N      | N      | changeReqAreaColorEvent     | update.js                                             |
| N          | N      | Y      | clonedBranchEvent           | clone.js                                              |
| Y          | Y      | Y      | commentAmendedEvent         | update.js                                             |
| Y          | Y      | Y      | conditionRemovedEvent       | update.js                                             |
| N          | Y      | Y      | copyItemEvent               | common.context.js                                     |
| Y          | Y      | Y      | createItemEvent             | common.context.js                                     |
| N          | N      | Y      | createRootEvent             | intdb.js                                              |
| Y          | Y      | Y      | createTaskEvent             | planningboard.js                                      |
| Y          | Y      | Y      | dependencyRemovedEvent      | update.js                                             |
| Y          | Y      | Y      | descriptionEvent            | update.js                                             |
| N          | N      | Y      | importToSprintEvent         | planningboard.js                                      |
| N          | N      | Y      | itemRestoredEvent           | undo.js                                               |
| Y          | N      | N      | itemToNewTeamEvent          | update.js                                             |
| Y          | N      | N      | messageReceivedEvent        | teams.js // updates the special Messenger doc         |
| Y          | N      | N      | messageReplacedEvent        | teams.js // updates the special Messenger doc         |
| Y          | Y      | Y      | newCommentEvent             | update.js                                             |
| N          | Y      | Y      | newChildEvent               | update.js                                             |
| Y          | Y      | Y      | nodeMovedEvent              | move.js                                               |
| Y          | Y      | Y      | removeAttachmentEvent       | attachments.js                                        |
| Y          | Y      | Y      | removedWithDescendantsEvent | removebranch.js                                       |
| Y          | N      | N      | removeItemsFromSprintEvent  | planningboard.js                                      |
| Y          | Y      | Y      | removeSprintIdsEvent        | planningboard.js                                      |
| Y          | Y      | Y      | removeStoryEvent            | planningboard.js                                      |
| n/a        | n/a    | Y      | replaceCommentEvent         | update.js // stored in the comments array             |
| n/a        | n/a    | Y      | resetCommentsEvent          | utils.js // stored in the comments array              |
| N          | N      | Y      | resetHistoryEvent           | utils.js                                              |
| Y          | Y      | Y      | setConditionEvent           | update.js                                             |
| Y          | Y      | Y      | setDependencyEvent          | update.js                                             |
| Y          | Y      | Y      | setHrsEvent                 | update.js                                             |
| Y          | Y      | Y      | setPointsEvent              | update.js                                             |
| Y          | Y      | Y      | setSizeEvent                | update.js                                             |
| Y          | Y      | Y      | setStateEvent               | update.js                                             |
| Y          | Y      | Y      | setSubTypeEvent             | update.js                                             |
| N          | N      | Y      | setTeamEventDescendant      | update.js                                             |
| Y          | Y      | Y      | setTeamOwnerEvent           | update.js                                             |
| Y          | Y      | Y      | setTitleEvent               | update.js, planningboard.js                           |
| N          | N      | Y      | subscribeEvent              | update.js                                             |
| Y          | Y      | Y      | taskRemovedEvent            | planningboard.js                                      |
| Y          | N      | N      | teamChangeEvent             | planningboard.js // when a doc of type 'team' changes |
| Y          | Y      | Y      | undoBranchRemovalEvent      | undo.js                                               |
| Y          | Y      | Y      | uploadAttachmentEvent       | attachments.js                                        |
| Y          | N      | N      | updateMovedItemParentEvent  | move.js                                               |
| Y          | N      | N      | updateReqAreaEvent          | update_reqarea.js                                     |
| Y          | N      | N      | updateTaskOrderEvent        | planningboard.js                                      |
| Y          | Y      | Y      | updateTaskOwnerEvent        | planningboard.js                                      |

## Team documents

Documents of type "team" store information about a team.

The history array stores joiningTeamEvent and leavingTeamEvent events.<br>
The messages array stores inter team messages:

    const newMessage = {
        encodedTeamMsg: encodeHtml(payload.newMessage),
        from: rootState.userData.user,
        timestamp: Date.now(),
    }

## Team\, sprintId and taskOwner assignment

Done items cannot be changed in team, sprintId and taskOwner assignment

### Team:

User stories and tasks have a team assigned. Initially the team name is 'not assigned yet'.
If a user joins a team and opens the context menu of an item not assigned to a team or to another team, the user can assign his team to the item. All descendants of the item will automatically assigned to that team too.<br>
If the user did not join a team and opens the context menu of an item assigned to a team, the user is asked to join the team.

When creating a new feature, user story or task, the team name is set to the team the current user is member of.

### Team and task owner:

If a task without task owner and with an assigned team is moved to another user story without an assigned team that user story will have that team assigned automatically.<br>
If a task without task owner and with an assigned team is moved to another user story with an assigned team that task will get the user stories team assigned automatically.<br>
If a task with task owner and assigned team is moved to another user story the assigned team will not change irrespectly the user story's team assignment.<br>

A task with a task owner always has a team assigned, the task owner's team.

### Task owner:

When creating a task in the planningboard view, the task is in a sprint and the task owner is set to the current user (the creator of the task).<br>
Changing the task owner can also only be done in the planningboard.

### sprintId:

User stories and tasks can have one sprintId assigned.<br>
If a user assigns a sprintId to a user story all tasks of that user story also have that sprintId assigned. If a task is already assigned another sprint id a warning is given.

If a moved task has a sprintId and the parent does not, the parent user story need to be updated with the sprintId of the child task.<br>
When creating a new user story or task, copy the sprintId from the parent user story or sibling task, if available.

### Firefox issue:

When hitting backspace the app returns to the previous page.

Fix: You can set the Integer pref browser.backspace_action to 2 on the about:config page to disable the backspace action. BTW Shift + Backspace does the reverse: going Forward if possible, so that is taken care of as well.

See [http://kb.mozillazine.org/browser.backspace_action](http://kb.mozillazine.org/browser.backspace_action)<br>
and [http://kb.mozillazine.org/about:config](http://kb.mozillazine.org/about:config)

Other browsers must have a simular solution.

## Install CouchDB

Install the CouchDb version 3.3.0 or higher on the remote host and create a server admin account.
Add/change these lines in/to the local.ini file.

    [httpd]
    enable cors = true

    [cors]
    origins = *
    credentials = true

### install CouchDB v.3.x.x locally

Ckeck if the \_users database exists. If not, create it with curl -X PUT http://adm:pass@127.0.0.1:5984/\_users where adm is replaced with your admin name and pass with the password of that admin.
The http connection needs no certificates.
All CouchDb customization config settings are automatically set when initializing the application.
When starting the app the first time use the server admin credentials you created to install CouchDb.

### install CouchDB v.3.x.x in the cloud

Obtain a www ssl certificate (e.g. from LetsEncrypt)</br>
Use the Config screen in Fauxton or edit the `local.ini` file in `< couchdb install directory >/couchdb/etc/`:</br>

    [ssl]
    enable = true
    port = 6984 ; the default
    cert_file = /opt/couchdb/letsencript/live/< your domain name >/cert.pem
    key_file = /opt/couchdb/letsencript/live/< your domain name >/privkey.pem
    cacert_file = /opt/couchdb/letsencript/live/< your domain name >/fullchain.pem

As this is a single page application we need to redirect to index.html if the url doesn’t match any assets uploaded to the server that we want to load.
When using Apache2 as your web server add these lines to the `/etc/apache2/sites-available/000-default-le-ssl.conf` file:

    <IfModule mod_ssl.c>
    <VirtualHost *:443>
        ServerName <your domain name>
        Include /etc/letsencrypt/options-ssl-apache.conf
        ServerAlias www.<your domain name>
        SSLCertificateFile /etc/letsencrypt/live/< domain name >/fullchain.pem
        SSLCertificateKeyFile /etc/letsencrypt/live/< domain name >/privkey.pem
        # added lines
        DirectoryIndex index.html
        FallbackResource /index.html
    </VirtualHost>
    </IfModule>

## install the e-mail server

To sent e-mails when users subscribe to receive change notices on bacloklog items you need to install or use an existing e-mail service.</br>
The application `node.js/app.mjs` is intended to run in node.js and placed on the home directory of the account named `pm2`. The installOneBacklog.sh script does that by default.</br>
See the [pm2 docs](https://pm2.keymetrics.io/docs/usage/quick-start/) to enable the service to restart automatically on (re)boot and error conditions.</br>
The application uses an subscription on [mailgun](https://www.mailgun.com/).
The .env file for the application looks like this:

    COUCH_USER= < server admin user name >
    COUCH_PW= < server admin password >
    DOMAIN= mg.< your domain name >
    API_KEY=< the API key you received from mailgun >

IMPORTANT: add this file to your .gitignore file as these credentials should never get exposed to the Internet!

## automatic certificate renewal

The app uses a secure https connection to the hosting site and for the cookie authentication over port 6984 to connect to the database. You can use the same certificate for both.<br/>

Let's encript renews your certificate every 3 months. Couchdb cannot access the renewed certificates directly.</br>
Create your ssl install directory /opt/couchdb/letsencript and
add a script to copy these certificates automatically on renewal in the folder `/etc/letsencrypt/renewal-hooks/post` that Let's encrypt created for you:

```bash
# Name this script copyCertsForCouchdb.sh or any other name
# Make this file executable with sudo chmod +x < this file name >
#!/bin/bash
cp -rfL /etc/letsencrypt/live/ /opt/couchdb/letsencrypt
chown -R couchdb:couchdb /opt/couchdb/letsencrypt/
```

## Finally

When starting the app the first time use the server admin credentials you created to install CouchDb.

## Known errors and issues

CouchDB issue in version 2.3.<br>
When a document has a danglin attachtent like:

    "_attachments": {
        "Pro Git - Scott Chacon.pdf": {
        "content_type": "application/pdf",
        "revpos": 221,
        "digest": "md5-bA6v24zTZ6r9aLg9+rtycg==",
        "length": 4400898,
        "stub": true
    }

    A bulk put will fail with error 412

See [issue 584](https://github.com/apache/couchdb/issues/584) on Github.<br>
Note: The error did not occur in CouchDb version 3.x.x until now.
