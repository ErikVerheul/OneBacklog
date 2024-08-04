<template>
  <div>
    <app-header />
    <BContainer>
      <BRow>
        <BCol cols="12" class="left-column">
          <h1>RELEASE NOTES</h1>
          <p v-if="store.state.demo">Note: This is a demo version of the application.</p>
          <h3>v.2.2.9 - 3 August 2024 Bug fix, refactoring</h3>
          <p>Bug fix:</p>
          <ul>
            <li>Fix feature to add a selection on id or a search in titles on top of a filtered tree</li>
          </ul>
          <p>Refactoring</p>
          <ul>
            <li>Full integration of team change in local and remote detail view and planning board</li>
            <li>Refactor team change using a new couchDb filter and the messenger document to efficiently trigger updates when syncing with other online users</li>
            <li>Allow user to search on title when a selection on id is open and vice versa. The open selection/search is undone automatically</li>
            <li>Make the log list scrollable</li>
          </ul>
          <h3>v.2.2.8 - 28 July 2024 Bug fixes, refactoring</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Edited comments not emailed, fixed</li>
            <li>Filtering comments and history on time stamp not working, fixed</li>
            <li>Epics have no owning team. Features, user stories and tasks have</li>
            <li>"This backlog item is realized by team 'null'" in setStateEvent, fixed</li>
          </ul>
          <p>Refactoring</p>
          <ul>
            <li>Combine filtering code for detail and overview to one common file</li>
            <li>Change BCard border color to blue</li>
          </ul>
          <h3>v.2.2.7 - 25 July 2024 New features</h3>
          <p>New features</p>
          <ul>
            <li>Undo add comment removed; Edit my last comment(s) added</li>
            <li>Allow editing own comments added to the history</li>
            <li>Use cards instead of lists to show comments and history</li>
          </ul>
          <h3>v.2.2.6 - 13 July 2024 New features, bug fix, refactoring</h3>
          <p>New features</p>
          <ul>
            <li>Copy parent's change notices subcriptions on newly created item</li>
            <li>Block firering bulk update of change notice subscriptions when busy, show 'Busy, please wait ...' on button</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Cannot insert user stories in the products overview, Fixed</li>
          </ul>
          <p>Refactoring:</p>
          <ul>
            <li>Add the subscribed users for change notices to the node data, so that these are easily available</li>
          </ul>
          <h3>v.2.2.5 - 9 July 2024 refactoring</h3>
          <p>Changes</p>
          <ul>
            <li>Store the users name instead of his email for receiving change notices making it easy to change the email address</li>
            <li>Full update of the email server side components including node.js and dependencies</li>
          </ul>
          <h3>v.2.2.4 - 4 July 2024 new features, bug fixes, dependency upgrades</h3>
          <p>New features</p>
          <ul>
            <li>Allow user to change its email address for receiving change notices</li>
            <li>Add option to, by default, subscribe also the descendants for sending change notices. Setting in options menu added.</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: re-enable repeated search with unaltered key</li>
          </ul>
          <p>4 dependency updates</p>
          <h3>v.2.2.3 - 12 June 2024 new features, fix browser support, bug fixes</h3>
          <p>New features</p>
          <ul>
            <li>Show the PBI title in bold</li>
            <li>Show number of done user stories in pick list of past sprints</li>
          </ul>
          <p>Fix browser support:</p>
          <p>Mutation event support will be disabled by default starting in Chrome 127, around July 30, 2024. Code should be migrated before that date to avoid site breakage. See https://chromestatus.com/feature/5083947249172480</p>
          <p>This is done by overriding the quill dependency version to 2.0.2</p>
          <p>Bug fixes:</p>
          <ul>
            <li>Load the correct product on view switch</li>
            <li>Fix type warning; BFormRadioGroup does not accept a number</li>
            <li>Fix missing removeStoryEvent in history List</li>
            <li>Remove vite preview as it cannot run from localhost</li>
          </ul>
          <h3>v.2.2.2 - 2 May 2024 new feature, bug fixes</h3>
          <p>New feature</p>
          <ul>
            <li>Show the number of available attachments up front</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix new comment or history not reset to empty message</li>
            <li>Fix type warning; BFormRadioGroup does not accept a number</li>
          </ul>
          <h3>v.2.2.1 - 30 April 2024 bug fixes, improve docs, dependency upgrade</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix regression in 'Select on (short)Id' and 'Search in titles' not functioning</li>
          </ul>
          <p>Minor docs corrections</p>
          <p>Dependency updates</p>
          <h3>v.2.2.0 - 29 Februari 2024 changed features, bug fixes, improve docs, dependency upgrade</h3>
          <p>Changed features:</p>
          <ul>
            <li>Disallow role assistAdmin to give users equal or more privelages than it self</li>
          </ul>
          <ul>
            <li>More rows on screen in the tree view</li>
          </ul>
          <ul>
            <li>Prevent initiation of CouchDb instance if already done before</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix regression in password change</li>
          </ul>
          <ul>
            <li>User interaction blocked after search on Id or in title, fixed</li>
          </ul>
          <p>Improve docs</p>
          <ul>
            <li>Explain the difference between admin and CouchDb Server admin permissions</li>
          </ul>
          <p>Dependency upgrade</p>
          <ul>
            <li>Fix warning when upgrading to BootstrapVueNext 16.x.x</li>
          </ul>
          <h3>v.2.1.0 - 19 Februari 2024 new features</h3>
          <p>Features:</p>
          <ul>
            <li>When dragging an item to another location the potential items to drag into are bordered</li>
          </ul>
          <ul>
            <li>Temporary freeze of severe, error or warning event messages so that these are not overwritten by new messages</li>
          </ul>
          <ul>
            <li>The Filter button now changes title to 'Reset filter' when active</li>
          </ul>
          <ul>
            <li>The 'Products overview' view is only available for users with the role of APO</li>
          </ul>
          <h3>v.2.0.2 - 15 Februari 2024 bug fix, refactoring and upgrade</h3>
          <p>Bug fix:</p>
          <ul>
            <li>Saving updated node field in newly selected node  instead of updating originally selected node: bug fixed</li>
          </ul>
          <p>Changed feature:</p>
          <ul>
            <li>Searches on id and title refactored: mutual exclude search on id and on title, enforce search reset before tree manipulation</li>
          </ul>
          <p>Upgrade</p>
          <ul>
            <li>Upgrade Vue version</li>
          </ul>
          <h3>v.2.0.1 - 2 Februari 2024 bug fix, refactoring and updates</h3>
          <p>Bug fix:</p>
          <ul>
            <li>Fix missing description and/or acceptance-criteria screen updates when database field is empty</li>
          </ul>
          <p>Changed feature:</p>
          <ul>
            <li>Eliminate need to select node first before start dragging</li>
          </ul>
          <p>Code refactoring and dependencies update</p>
          <h3>v.2.0.0 - 13 Januari 2024 MAJOR release</h3>
          <p>Changes:</p>
          <ul>
            <li>Migration to Vue3</li>
            <li>Use of Vue3 adapted dependencies</li>
          </ul>
          <h3>v.1.25 - 22 September 2023 Bug fixes, move to Vite</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>App still active after sign-out: fixed</li>
            <li>Restarting loop after sign-out and immediate sign-in: fixed</li>
          </ul>
          <p>New, faster, development environment Vite</p>
          <ul>
            <li>Move from Vue-CLI to Vite </li>
            <li>Installation scripts updated </li>
          </ul>
          <h3>v.1.24 - 14 September 2023 Refactoring</h3>
          <p>Minor updates:</p>
          <ul>
            <li>Improve visibility of resize handlers.</li>
            <li>Have the watchdog code in its own file. </li>
          </ul>
          <h3>v.1.23 - 12 September 2023 Minor updates</h3>
          <p>Minor updates:</p>
          <ul>
            <li>Prevent the event text to overlap the signal light.</li>
            <li>The welcome screen now shows the actual screen width when less than 1400, the minimum required. </li>
          </ul>
          <h3>v.1.22 - 11 September 2023 New feature</h3>
          <p>New feature:</p>
          <ul>
            <li>The user can now select a new menu item 'My team' for info about his team and the other teams.</li>
            <li>The welcome screen now shows the actual screen width when less than 1600, the minimum required. </li>
          </ul>
          <h3>v.1.21 - 5 September 2023 New feature, bug fix</h3>
          <p>New feature:</p>
          <ul>
            <li>Two modes are introduced, the standard mode for starters which is the default and a professional mode with
              many more features.</li>
            <li>The user can switch between the modes without the need to sing-in again. </li>
            <li>The professional mode sports the 'Products overview' for use by the Area Product owner, the option to
              change database, to move multiple items at once in the tree view and dependency management and alerts.</li>
            <li>As a result the standard mode is less intimidating. Eg. the context menu has 4 options instead of 8.</li>
          </ul>
          <p>Bug fix:</p>
          <ul>
            <li>In development mode the images are now visible in teh User guide.</li>
          </ul>
          <h3>v.1.20 - 2 September 2023 Development URL change</h3>
          <p>Changes:</p>
          <ul>
            <li>Disallow signing in on devices with a width smaller than 1600 px</li>
            <li>Revert to http://localhost:8080 instead of https://localhost:8080 in development mode. Creating a local CA
              certificate to much a hassle.</li>
          </ul>
          <h3>v.1.19 - 8 August 2023 Bug fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Assigning a dependency failed due to a missing import, fixed</li>
            <li>Fixed error when pasting text with unicode (2 bytes per character).</li>
          </ul>
          <h3>v.1.18 - 18 December 2022 Bug fixes, Security fixes</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Do not update acceptance criteria for requirement areas</li>
            <li>Prevent signing in before the database restore is ready when restoring the current database</li>
          </ul>
          <p>Security:</p>
          <ul>
            <li>Security issues in development dependencies fixed after upgrading to Node v18.12.1 and version updates
            </li>
          </ul>
          <h3>v.1.17 - 28 Febuari 2022 New features, bug fixes, refactoring</h3>
          <p>New features:</p>
          <ul>
            <li>Save and restore node highlighting when using searches (on top of) a filter; show state inconsistency on
              the fly</li>
            <li>When no product is assigned to an admin or server admin show a warning and route to the admin page</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Hidden error when resetting search in titles without previous search, fixed</li>
            <li>When removing an item in the products overview with dependencies or conditions on its descendants, these
              are not recovered on the undo, fixed</li>
            <li>Fix false mesage 'The last undo has not finished. Please try later' when the dependency is manually
              removed</li>
            <li>Fix regression error when adding a dependency</li>
          </ul>
          <p>Refactoring:</p>
          <ul>
            <li>Showpath and undoShowPath refactored; use capital literals for constants</li>
          </ul>
          <h3>v.1.16 - 5 Febuari 2022 New feature, bug fixes, refactoring</h3>
          <p>New feature:</p>
          <ul>
            <li>When creating a new requirement area do not show color options already in use</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Description changes of requirement area items are not synchronized with other users having the same item
              selected, fixed</li>
            <li>When removing an item in the products overview with dependencies or conditions on its descendants, these
              are not recovered on the undo, fixed</li>
          </ul>
          <p>Refactoring:</p>
          <ul>
            <li>Sign out refactored app wide to prevent the listenforchanges longpoll to continue after sign out</li>
            <li>Move global functions to helpers module</li>
            <li>Redundant entries in package.json removed</li>
          </ul>
          <h3>v.1.15 - 25 Januari 2022 Security fixes, refactoring</h3>
          <p>Security:</p>
          <ul>
            <li>Security issues in dependencies fixed</li>
          </ul>
          <p>Refactoring:</p>
          <ul>
            <li>Example localhost certificates made available in the distribution</li>
            <li>Other minor refactoring</li>
          </ul>
          <h3>v.1.14 - 21 October 2021 Bug and security fixes, tools update</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Data loss on concurrent and overlapping branch/product removal and undo, fixed</li>
          </ul>
          <p>Security:</p>
          <ul>
            <li>Security issue in dependencies fixed</li>
          </ul>
          <p>Tools:</p>
          <ul>
            <li>Dev tools updated</li>
          </ul>
          <h3>v.1.13 - 16 October 2021 Feature update and bug and security fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Feature added to clone any branch or product</li>
            <li>Assistance Admins can (un)assign all products of the databases assigned to him/her to all users</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>When selecting a new product the haveWritePermission of the previous selected product is used, fixed</li>
            <li>Prevent overlapping (concurrent) undo's and branch/product cloning by the user to avoid errors</li>
            <li>Show a Return button instead of a Cancel button when the database is successfully created</li>
          </ul>
          <p>Security:</p>
          <ul>
            <li>Vue2-editor dependency update</li>
          </ul>
          <hr />
          <h3>v.1.12 - 19 August 2021 Bug fixes and dependency updates</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>When clicking the reload function of the browser the sign-in page appears. Fixed with a warning.</li>
            <li>When changing the text of an item's description the text of the same item on display of other users is
              shown as base-64 encoded. The sync function is not working as expected. Fixed for both the item's
              description and acceptance criteria.</li>
          </ul>
          <p>Dependency updates:</p>
          <ul>
            <li>Multiple vulnerability issues fixed in updated dependencies</li>
            <li>Vue development dependency updates to v.4.5.13</li>
          </ul>
          <hr />
          <h3>v.1.11 - 29 April 2021 Feature update, bug fixes and performance enhancements</h3>
          <p>New features:</p>
          <ul>
            <li>Spike person hours implemented on the planning board</li>
            <li>Show progress indicator when moving, removing items and when undoing these actions</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix incomplete synchronization between boards when moving items to another level</li>
            <li>Fix a bug when clearing a search on id that did not return a result</li>
            <li>Fix spike person hours saved as string instead of integer value</li>
            <li>Skip showing owner name if not defined; show team name only</li>
          </ul>
          <p>Performance enhancements:</p>
          <ul>
            <li>Lightweigth planning board refresh implemented</li>
          </ul>
          <hr />
          <h3>v.1.10 - 6 April 2021 Feature update and bug and security fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Context menu for story items on planningboard including options to remove the story and its tasks from the
              sprint and to copy the story short id to the clipboard</li>
            <li>Sign-out when no current or next sprint is available. Need to sign-in again to have the sprint calendar
              extended. (Happens when the user session is extended over the end date of the
              current sprint and no next sprint is available)</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix incorrect list of user assigned products</li>
            <li>Fix cloned product not added to available products in current session</li>
            <li>Fix missing history when removal is undone</li>
            <li>Fix regression in planning board</li>
            <li>Fix performance regression when removing a branch</li>
          </ul>
          <p>Security:</p>
          <ul>
            <li>Update dependencies with security update</li>
          </ul>
          <hr />
          <h3>v.1.9 - 26 March 2021 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Optional warning when promoting/demoting an item to another level implemented</li>
            <li>Automatically create a basic default sprint calendar when an admin signs in to a newly created database
            </li>
            <li>Show in List teams if a team has its own team sprint calendar</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>If changing team, select and load the current sprint of the team calendar of the selected team</li>
            <li>Update tree model with timestamp when importing items in current sprint</li>
          </ul>
          <hr />
          <h3>v.1.8 - 18 March 2021 Feature update, refactoring and bug fix</h3>
          <p>New features:</p>
          <ul>
            <li>Enable the move of products within the tree</li>
            <li>Create undo for last added comment</li>
          </ul>
          <p>Refactored</p>
          <ul>
            <li>Prevent dragging when no item is selected</li>
            <li>Sprint assingment on moved items refactored</li>
            <li>Improved performance when moving an item with descendant items to another level or product></li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix tree collapse when filtering on tree depth</li>
          </ul>
          <hr />
          <h3>v.1.7 - 9 March 2021 Feature update, refactoring and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Auto extend the default sprint calendar when ran out</li>
            <li>'Remove this task' added in context menu of tasks in planning board</li>
            <li>Trim the input when searching on item key</li>
            <li>Add a tooltip to show what the next undo will do</li>
            <li>Create undo for assigning a requirement area and have it synced to other users that are online</li>
          </ul>
          <p>Refactored</p>
          <ul>
            <li>Undo removes from the database to cope with changes initiated by other sessions via synchronization</li>
            <li>Watchdog and logging refactored. Avoid error messages when returning from a computer sleep state</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix the state name to "Ready for test/review"</li>
            <li>Use unique key when listing the log</li>
            <li>Unintended context menu choices removed</li>
          </ul>
          <hr />
          <h3>v.1.6.1 - 17 February 2021 Bug fix</h3>
          <p>Bug fix:</p>
          <ul>
            <li>Moving task to other state not working: Regression fixed</li>
          </ul>
          <hr />
          <h3>v.1.6 - 12 February 2021 Feature update, revised documentation and bug fix</h3>
          <p>New features:</p>
          <ul>
            <li>Allow nested searches when a filter is set</li>
            <li>Revised documentation in documentation.txt</li>
          </ul>
          <p>Bug fix:</p>
          <ul>
            <li>Fix document count at load when loading again without resetting the browser</li>
          </ul>
          <hr />
          <h3>v.1.5 - 30 January 2021 Feature update, sucurity and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>New role 'assistant admin' implemented</li>
            <li>Team calendar maintenance implemented</li>
          </ul>
          <p>User stories done:</p>
          <ul>
            <li>Do not show a node selection event when selecting the context menu to prevent overwriting a warning
              message from the context menu</li>
            <li>Show dependencies/conditions in the tree view when context menu item "Show/remove dependencies/conditions
              ..." is selected</li>
            <li>Show dependency violations in a special sidebar (and remove indicator from the item title)</li>
          </ul>
          <p>Security</p>
          <ul>
            <li>Upgrade Axios for fixed vulnerability</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix for setting options of teams without members</li>
          </ul>
          <hr />
          <h3>v.1.4.1- 31 December 2020 bug fix</h3>
          <p>Bug fix:</p>
          <ul>
            <li>Regression: Synchronization not working, fixed</li>
          </ul>
          <h3>v.1.4 - 31 December 2020 Feature update and bug fixes</h3>
          <p>Feature update:</p>
          <ul>
            <li>Show event history when clicking on event message bar</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Copy the assigned roles when cloning a product, fixed</li>
            <li>Must expand the product root to show its descendants, fixed</li>
          </ul>
          <h3>v.1.3 - 19 December 2020 General overhaul of the admin tools</h3>
          <p>General overhaul of the admin tools:</p>
          <ul>
            <li>Product assignment and unassignment combined in maintain users</li>
            <li>Immediate update of assigned databases and products when admin changes his/her own account</li>
            <li>Purge now deletes removed items in batches to circumvent the CouchDb 100 updates limit</li>
          </ul>
          <h3>v.1.2.5 - 29 November 2020 Bug fixes</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>'Missing mixin' regression, fixed</li>
            <li>'Missing import' regression, fixed</li>
            <li>Add all getters to mixins except the getters for the planning board</li>
            <li>Use kebab case for these custom events</li>
          </ul>
          <h3>v.1.2.4 - 26 November 2020 New feature and bug fixes</h3>
          <p>New feature:</p>
          <ul>
            <li>A PO and APO must have full access to all items of his products no matter what team he/she has joined</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>'Duplicate emails' regression, fixed</li>
            <li>'Filter on period of days fails' regression, fixed</li>
            <li>'Undo removal creates an undo' regression, fixed</li>
            <li>'Description duplication' regression, fixed</li>
          </ul>
          <h3>v.1.2.3 - 1 November 2020 Bug fix, native ES2015 code and doc updates</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>'Not returning original view after clearing depth only filter' fixed</li>
          </ul>
          <p>Install and documentation:</p>
          <ul>
            <li>Both native ES2015 and legacy code is shipped to production</li>
            <li>Debug options included in environment settings</li>
            <li>Development and production environment files now under source control</li>
            <li>Updated the installation instructions</li>
          </ul>
          <hr />
          <h3>v.1.2.2 - 13 Oktober 2020 Security fix and doc updates</h3>
          <p>Security fixes:</p>
          <ul>
            <li>Dependency security fix</li>
          </ul>
          <p>Documentation:</p>
          <ul>
            <li>Updated the installation instructions</li>
          </ul>
          <hr />
          <h3>v.1.2.1 - 5 Oktober 2020 Feature update, security fix and doc updates</h3>
          <p>New features:</p>
          <ul>
            <li>Scripts added to update the app version in production</li>
            <li>Introduction of environment variables for the CouchDb location in development and production </li>
            <li>Introduction of environment variables for the certificate files for development using https </li>
          </ul>
          <p>Security fixes:</p>
          <ul>
            <li>Dependency security fix</li>
          </ul>
          <p>Documentation:</p>
          <ul>
            <li>Updated for the changes</li>
          </ul>
          <hr />
          <h3>v.1.2.0 - 9 September 2020 Feature update, security fix and doc updates</h3>
          <p>New features:</p>
          <ul>
            <li>Support for CouchDb version 3.x</li>
            <li>Development now possible using https as in production</li>
            <li>Support for Chrome during developement thanks to the CouchDb 3.x sameSite support</li>
            <li>Maintenance page added</li>
          </ul>
          <p>Security fixes:</p>
          <ul>
            <li>Dependency security fix</li>
          </ul>
          <p>Documentation:</p>
          <ul>
            <li>'How to create a HTTPS certificate for localhost domains' doc added as html page</li>
            <li>README.md file updated with instructions on how to configure CouchDb 3.x</li>
          </ul>
          <hr />
          <h3>v.1.1.0 - 27 July 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Log viewer for the server admin</li>
            <li>When opening context menu select and load item automatically (no need to select first)</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: Cannot change team</li>
            <li>Console log messages showing (switched off now)</li>
          </ul>
          <hr />
          <h3>v.1.0.0 - 18 July 2020 Feature complete release</h3>
          <p>New features:</p>
          <ul>
            <li>On-hold column added to the planning board</li>
            <li>Some missing udo's implemented</li>
            <li>Automatic sprint calendar extension when no more sprints available</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix bug when deleting items from the Products overview (no more orphans left)</li>
            <li>Fix bug when deleting/(undoing this delete) of items with dependencies to items not deleted</li>
            <li>re-render the planning board after a deletion, of items in another user's session, is completed
              successfully</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Generic overhaul of access rights</li>
            <li>'Removed' is not a status anymore. Use On-hold instead, or delete the item</li>
            <li>Always update the database first before re-rendering the tree view or the planning board,<br />
              with the exception of tree view drag &amp; drop where immediate response is paramount</li>
          </ul>
          <hr />
          <h3>v.0.9.9 - 12 June 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Allow tasks to be added individually to the sprint set for the user story</li>
            <li>PO's can create and maintain a team specific calendar for their team</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix bug updating the acceptance criteria</li>
            <li>Fix bug when updating the default calendar</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Introduction of a document with the sole purpose to sync a planning board re-render [NOT downwards
              compatible]</li>
            <li>Descendants of moved nodes are synced individually (not via the parent)</li>
          </ul>
          <hr />
          <h3>v.0.9.8 - 24 May 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Sync support for task removal and on-hold added</li>
            <li>Context menu item 'Copy short id to clipboard' implemented for planning board</li>
            <li>Context menu items 'Add a new task' and 'Remove this task' implemented for planning board</li>
            <li>Context menu items 'Change task title' and 'Change task owner' implemented for planning board</li>
            <li>Remove the sprintId only if equal to sprintId specified, leaving items assigned to other sprints
              unattached</li>
            <li>Allow the PO to open the contextmenu of items of another team to reassign the items to his current team
            </li>
            <li>Include team membership in all authorization checks</li>
            <li>Sign-out automatically when changing database</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Fix bug updating wrong document after changing content and click on other node</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Have the database sort the planning board [NOT downwards compatible]</li>
            <li>Store team membership in the config document [NOT downwards compatible]</li>
          </ul>
          <hr />
          <h3>v.0.9.7 - 10 May 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Full sync from tree view to planning board</li>
            <li>Demotion/promotion of PBI's to and from tasks with undo (causes an upwards compatibility break!)</li>
            <li>Show feature title in story card in planning board</li>
            <li>Planning bord sorted by feature (oldest on top)</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: Assistance text not showing</li>
            <li>User options in planning view now limited to this view</li>
          </ul>
          <hr />
          <h3>v.0.9.6 - 26 April 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Remember tree state when visiting planning board</li>
            <li>Change item state automatically when adding story points to a new item.</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: Move undo not working</li>
            <li>Moving multiple nodes fails sometimes</li>
            <li>History on move is incorrect</li>
          </ul>
          <hr />
          <h3>v.0.9.5 - 9 April 2020 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>A sprint planning board is available</li>
            <li>See the 'Sprint panning board' feature user stories (not all are done yet)</li>
          </ul>
          <hr />
          <h3>v.0.9.4 - 29 March 2020 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>Add the task level to the tree view</li>
            <li>Default sprint calendar</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>The application is extended with the task item level.</li>
          </ul>
          <hr />
          <h3>v.0.9.3.2 - 22 March 2020 Regression bug fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: state constants not updated</li>
          </ul>
          <hr />
          <h3>v.0.9.3.1 - 22 March 2020 Configuration update</h3>
          <p>Configuration change:</p>
          <ul>
            <li>Reorder the item state values</li>
          </ul>
          <hr />
          <h3>v.0.9.3 - 21 March 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Allow item movement over products in products overview</li>
            <li>Create an undo for moving an item to another product in product details view</li>
            <li>Show the requirement area next to the item title in product details view</li>
          </ul>
          <p>User stories done:</p>
          <ul>
            <li>Remove history and comments on age</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>When sizing the screen the clear buttons move away</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Common code of the views now in one set of files</li>
            <li>Rename of all view components</li>
          </ul>
          <hr />
          <h3>v.0.9.2 - 12 March 2020 Product revision</h3>
          <p>Product revision:</p>
          <ul>
            <li>The superPO role is removed</li>
            <li>All users have access to two main views: 'Product details' and 'Products overview'</li>
            <li>Read the README.md file for the revised specification</li>
          </ul>
          <hr />
          <h3>v.0.9.1 - 5 March 2020 Feature update and bug fixes</h3>
          <p>Feature update:</p>
          <ul>
            <li>The filters in the tree view now only highlight the filtered items, not the path to these items. Changed
              to a less agressive highlight color</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>When using the context menu in the requirement areas view the scroll bar disappears</li>
            <li>When filtering on time in the requirement areas view no items are found</li>
          </ul>
          <hr />
          <h3>v.0.9.0 - 1 March 2020 Major update</h3>
          <p>New features:</p>
          <ul>
            <li>The requirement areas epic is implemented.</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>When switching between products and requirement areas view, current tree nodes are disposed and loaded new
              from the database. In the products view only the selected products are loaded
              up to the PBI level. In the requirement area view all products are loaded up to the feature level.</li>
            <li>When loading the tree nodes only the needed document fields are transferred as values in the GET call. Eg.
              the description and acceptance criteria are not transferred. Also only the
              recent history is retrieved.</li>
          </ul>
          <p>By not transferring the full documents at load time loading is faster and memory usage limited. When the user
            selects an item the full ducument is loaded.</p>
          <hr />
          <h3>v.0.8.5.1 - 14 February 2020 Regression fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Regression: product clone fails</li>
          </ul>
          <hr />
          <h3>v.0.8.5 - 12 February 2020 Feature update and bug fixes</h3>
          <p>New features:</p>
          <ul>
            <li>Undo functionality in product view</li>
            <li>Maintenance tools</li>
          </ul>
          <p>User stories done:</p>
          <ul>
            <li>Add source destination when moved</li>
            <li>Change the color of the state tags when updated</li>
            <li>Change selected products without sign-out/in</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>Product disappears when no results in filter</li>
            <li>Regression: Default product does not appear on top</li>
            <li>Current product node undefined</li>
          </ul>
          <hr />
          <h3>v.0.8.4.1 - 2 February 2020 Bug fixes</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>All items seem changed after clearing history</li>
            <li>Product disappears when no results in filter</li>
            <li>Regression: Default product does not appear on top</li>
            <li>Current product node undefined</li>
          </ul>
          <hr />
          <h3>v.0.8.4 - 27 January 2020 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>Users who subscribed to change notices now receive an email if a change event occurred on these items.
            </li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>A Node.js server side application serves the email dispatch.</li>
            <li>The synchronization changes listener is now event driven to allow fine grained responses to the changes.
            </li>
          </ul>
          <hr />
          <h3>v.0.8.3.1 - 29 December 2019 Bug fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Another issue with wrong state values is fixed.</li>
            <li>Processing old changes by the synchronization on signin is fixed.</li>
          </ul>
          <hr />
          <h3>v.0.8.3 - 27 December 2019 Feature update and bug fix</h3>
          <ul>
            <li>The context menu in the products view is extended with 'Make a copy option' for epics, features and PBI
              items.</li>
            <li>The break in upwards compatibility introduced in version 0.8.0 is lifted.</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>A regression is fixed which caused wrong state values.</li>
          </ul>
          <hr />
          <h3>v.0.8.2 - 26 December 2019 Feature update</h3>
          <ul>
            <li>The context menu in the products view is extended with 'make a clone option' for product items.</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Resursive database updates are replaced with Couchdb bulk updates.</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>The changes filter is enhanced and used in the synchronization between online users.</li>
          </ul>
          <hr />
          <h3>v.0.8.1 - 17 December 2019 Feature update</h3>
          <ul>
            <li>Changes to the item size, state, title, description, acceptance criteria, added item, moved items and
              deleted items can be undone in a last change first sequence. A move to another
              product cannot be undone automatically.</li>
            <li>The input fields for 'Find on id' and 'Search in titles' now have a tiny button to clear the field and
              reset the find/search. The buttons for 'Filter comments' and 'Filter History' now
              change to 'Clear filter comments' and 'Clear filter history' when the filter is executed. Use these buttons
              to clear the filter.</li>
          </ul>
          <hr />
          <h3>v.0.8.0 - 5 December 2019 Major update</h3>
          <p>New features:</p>
          <ul>
            <li>When changing the state of an item the new state is checked against its descendants. A warning is issued
              if that state is incompatible. Eg. you can only set a feature to done if all
              descendants are done.</li>
            <li>The dependency epic is implemented.</li>
          </ul>
          <hr />
          <h3>v.0.7.1 - 16 November 2019 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>The product view now has a combined filter on teams, tree depth, state and over time which can be saved
              for use in the next session</li>
            <li>Product backlog items are now owned by a team</li>
            <li>An authenticated user can assign a backlog item and its descendants to the users team</li>
            <li>Feature teams are encouraged. A warning is shown when a user tries to assing a user story, spike or defect
              to a different team than the team of the parent feature</li>
          </ul>
          <hr />
          <h3>v.0.7.2 - 26 November 2019 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>[USER REQUEST Id = 4i0jz] The product view now shows up to 3 extra badges indicating that an item has
              changed. This feature is most valuable when another user updates the backlog
              sumultaneous with you</li>
            <li>[Id = 781cc] Uploading and removal of attachments is implemented</li>
          </ul>
          <hr />
          <h3>v.0.7.1 - 16 November 2019 Feature update</h3>
          <p>New features:</p>
          <ul>
            <li>The product view now has a combined filter on teams, tree depth, state and over time which can be saved
              for use in the next session</li>
            <li>Product backlog items are now owned by a team</li>
            <li>An authenticated user can assign a backlog item and its descendants to the users team</li>
            <li>Feature teams are encouraged. A warning is shown when a user tries to assing a user story, spike or defect
              to a different team than the team of the parent feature</li>
          </ul>
          <hr />
          <h3>v.0.7.0 - 23 October 2019 Major update</h3>
          <h5>Note that this release is not backwards compatible with previous releases. The format of the user profile in
            the _users database now includes database information. An upgrade can be
            fixed using Fauxton.</h5>
          <p>New features:</p>
          <ul>
            <li>The 'superPO' role now applies to all products in all databases</li>
            <li>The 'admin' role now applies to all users in all databases</li>
            <li>Users can switch between databases with assigned products to them</li>
            <li>Users can change team between teams registered in the current database</li>
            <li>Expanded 'SuperPO', 'admin' and 'server Admin' views</li>
          </ul>
          <p>Design changes:</p>
          <ul>
            <li>Application wide support of multiple databases</li>
            <li>Support for easy backup creation</li>
            <li>Support for easy restore</li>
          </ul>
          <hr />
          <h3>v.0.6.2.1 - 21 September 2019 Bug fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Wrong order when moving multiple nodes</li>
          </ul>
          <hr />
          <h3>v.0.6.2 - 17 September 2019 Minor update</h3>
          <p>New features:</p>
          <ul>
            <li>Undo for item removals</li>
          </ul>
          <p>Bug fixes:</p>
          <ul>
            <li>REGRESSION: Shift select not working</li>
          </ul>
          <hr />
          <h3>v.0.6.1.1 - 10 September 2019 Minor fix</h3>
          <p>Missed updates:</p>
          <ul>
            <li>These release notes</li>
            <li>Text update on the welcome page. This application is now in beta.</li>
          </ul>
          <hr />
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
            <li>Use mixin for displaying an event in components; create a mutation for this functionality for use in the
              VUEX store</li>
          </ul>
          <p>Performance improvements:</p>
          <ul>
            <li>Tree view can handle 5000+ nodes due to design changes</li>
          </ul>
          <hr />
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
          <hr />
          <h3>v.0.5.5 - 19 August 2019 Urgent fix</h3>
          <p>Bug fixes:</p>
          <ul>
            <li>Drag &amp; drop cannot select individual nodes</li>
            <li>Allow drag inside top product node</li>
          </ul>
          <hr />
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
          <hr />
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
          <hr />
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
            <li>Optimized getDraggable when moving the mouse for a better user experience on selecting the drop target
            </li>
            <li>Prevent unnecessary update of documents</li>
            <li>Limit tree traversals to current product when possible</li>
          </ul>
          <hr />
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
          <hr />
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
          <hr />
          <h3>v.0.4.6 - 15 May 2019 - Minor update</h3>
          <p>New features:</p>
          <ul>
            <li>The search function in the header now selects all items in a product which have the entered key word in
              the title</li>
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
          <hr />
          <h3>v.0.4.5 - 11 May 2019 - First public release on onebacklog.net</h3>
        </BCol>
      </BRow>
    </BContainer>
  </div>
</template>

<script setup>
import AppHeader from '../header/header.vue'
import { useStore } from 'vuex'

const store = useStore()

</script>

<style scoped>
.left-column {
  text-align: left;
  background-color: #408fae;
  color: white;
  border: 1px solid black;
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
  margin-bottom: 10px;
}
</style>
