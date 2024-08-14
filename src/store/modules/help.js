const state = {
	insert: [
		// this array contains 4 help texts for the epic, feature, user story and task creation
		'skip this level',
		'database creation help - not in use',
		'product creation help - not in use',
		`<h4>Epic creation help</h4>
    <p>You are about to insert an epic. You can compare an epic with a project. It is a major endeavor which can take months to accomplish.<br/>
    On creation the state will be 'New'.<br/>
    A epic is always a child of a product. Orphan epics without the context of a product cannot exist.<br/>
    During refinement sessions the team makes sure that:
    <ul>
        <li>The acceptance criteria are set and fully understood</li>
        <li>The teams assigned to the product can realize the epic (dependencies will emerge over time)</li>
        <li>The size and the lead time of the epic is large. Teams will typically work on features of different epics at the same time.</li>
    </ul>
    During refinement the teams create features to the epic.
    </p>
    <hr>
    <p>When an epic has no foreseeable end date, consider to create a new product.
    </p>`,

		`<h4>Feature creation help</h4>
    <p>
    You are about to insert a feature. A feature has value to the customer and the team will be aeger to show it at the sprint review.<br/>
    On creation the state will be 'New'.<br/>
    A feature is always a child of an epic. Orphan features without the context of an epic cannot exist.<br/>
    During refinement sessions the team makes sure that:
    <ul>
        <li>The acceptance criteria are set and fully understood</li>
        <li>The team can realize the feature it self (dependencies with other teams are resolved)</li>
        <li>The size of the feature is small so that the feature can be realized in one sprint. However, when not ready, its fine to deliver the feature the next sprint.</li>
    </ul>
    During refinement the team creates user stories to the feature.
    </p>
    <hr>
    <p>When a feature is so big that it needs multiple sprints to realize or other teams are involved, consider to create an epic.
    </p>`,

		`<h4>User story creation help</h4>
    <p>
    You are about to insert a user strory. A user story can be a 'normal' user story, a spike or a defect to be fixed.<br/>
    On creation the state will be 'New'.<br/>
    A user story is always a child of a feature. Orphan user storier without the context of a feature cannot exist.<br/>
    During refinement sessions the team makes sure that:
    <ul>
        <li>The acceptance criteria are set and fully understood</li>
        <li>The team can realize the user story it self (dependencies with other teams are resolved)</li>
        <li>The size of the user story is small so that this user story and others can be realized in one sprint.</li>
    </ul>
    During sprint planning the team creates tasks to the user story.
    </p>
    <hr>
    <p>When a user story has value in its own right, consider to create a feature.<br/>
    Realizing a user story is a team effort. Avoid creating user stories which should be on the task level.
    </p>`,

		`<h4>Task creation help</h4>
    <p>
    You are about to insert a task.<br/>
    On creation the state will be 'New'. A task is always a child of a user story.<br/>
    A user story can be of type 'normal' user story, a spike or a defect. Orphan tasks without the context of a user story cannot exist.<br/>
    During sprint planning tasks are assigned to the accepted user stories. After the sprint start it is more covenient te add additional tasks at the planning board.
    </p>`,
	],
	move: `<h4>Move help</h4>
    <p>You are about to move an item with its descendants to another product.<br/>
    The item will be removed from its source and inserted in the other product.</p>
    <hr>
    After the transfer the teams of the target product should review all transferred items in one or more refinement meetings and:
    <ul>
        <li>Make sure the acceptance criteria are set and fully understood</li>
        <li>Assign a team to each feature</li>
        <li>Have the teams estimate the items again</li>
    </ul>`,

	remove: `<h4>Remove help</h4>
    <p>
    You are about to remove an item with its descendants from the product.<br/>
    The item will be marked for deletion and will not be available for the users. However with a direct search on id users can still retrieve them.<br/>
    Click on the <b>Undo</b> button that appears on the title bar to undo the removal.</p>
    <hr>
    <p>You can only undo a removal in the same session you did the removal. Later, only the server admin can, with great effort,
    undo a removal by removing the remove mark of all items of the chain up to product level.<br/>
    Over time the server admin will delele the marked removals from the database. Direct access via the item id will not work anymore.
    </p>`,

	team: `<h4>Team change help</h4>
    <p>
    You are about to assign a backlog item to your current team.<br/>
    </p>
    <hr>
    <p>It is best practice that a feature is completely realized by the same team. You get a warning message when you assign a user story, spike or defect to
    another team than the team that owns the feature these items belong to.
    </p>
    <hr>
    <p>Note that when an authorized user changes the state of a backlog item from 'New' to 'Ready', the item is assigned automatically to the team of that user.
    </p>`,

	consistencyCheck: `<h4>Consistency check help</h4>
    <p>
    You are about to start a consistency check on the state of your backlog items.<br/>
    </p>
    <hr>
    <p>A feature is done if and only if all of its user stories, spikes and defects are done. An epic is done when all its user stories are done.
    This check will turn the Done badge to red and add a question mark to the text. 'On hold' items are not taken into account.
    </p>
    <p>The warning badge also appears when the state of an item if higher (progressed further) than any of its decendants.
    </p>
    <hr>
    <p>This check does not change the state of your items. It is up to you to do that manually.
    </p>`,

	productClone: `<h4>Product clone help</h4>
    <p>
    You are about to clone a product.<br/>
    </p>
    <hr>
    <p>This feature copies a product with all its descendants in the current database and will show in your products view. The product title is prepended with CLONE:<br>
    Use this feature to create a copy of a product template. A product template is a skeleton of a product type. Using a clone of a template can speed up the creation of similar products.
    </p>
    <hr>
    <p>Note that you will be the only user with access to the clone. An admin has to assign other users with this product to allow them to see and/or contribute to the new product.
    </p>`,

	branchClone: `<h4>Branch clone help</h4>
    <p>
    You are about to clone a branch.<br/>
    </p>
    <hr>
    <p>This feature copies a branch with all its descendants in the current database and will show it in your view. The branch title is prepended with 'Clone of '<br>
    Use this feature to create a copy of a branch to speed up the creation of a similar branch.
    </p>
    <hr>
    <p>Note that attachments, dependencies, conditions and assigned sprintIds are not copied.
    </p>`,

	itemClone: `<h4>Item copy help</h4>
    <p>
    You are about to copy a product backlog item.<br/>
    </p>
    <hr>
    <p>This feature makes a shallow copy of a product backlog item and places it above the copied item. Not copied are the descendants, history, comments, attachments and dependencies. The state of the copied item is set to 'new'. The title is prepended with 'COPY:'
    </p>`,

	setDependency: `<h4>Item dependency help</h4>
    <p>
    You are about to set a dependency between two backlog items.<br/>
    </p>
    <hr>
    <p>Click OK to select (right-click) another backlog item this item depends on. That item is conditional for the first selected item to be realized</p>
    <hr>
    <p>The condition must have higher priority than the item that depends on it. When moving items in the tree this rule can be breached. If so, you will be warned immediately. Undo your last action or remove the dependency if no longer valid.
    </p>`,
	usToSprint: `<h4>Assign a user story to a sprint help</h4>
    <p>You are about to assign this user story to the current or next sprint</p>
    <ul>
        <li>All tasks of that story will also be assigned to the selected sprint</li>
        <li>Use the planning board to maintain the tasks for this user story</li>
    </ul>`,
	usFromSprint: `<h4>Remove a user story from a sprint help</h4>
    <p>You are about to remove this user story from the asigned sprint</p>
    <ul>
        <li>All tasks of that story will be removed from the sprint</li>
        <li>The user story will be removed if no tasks remain</li>
    </ul>`,
	taskToSprint: `<h4>Assign a task to a sprint help</h4>
    <p>You are about to assign this task to the current or next sprint</p>
    <ul>
        <li>When a task is selected and the user story is not yet assigned to a sprint that task and the user story will be assigned to the selected sprint</li>
        <li>When a task is selected and the user story was already assigned to a sprint the task will automatically be assigned to that sprint</li>
        <li>Use the planning board to maintain the status of the tasks</li>
    </ul>`,
	taskFromSprint: `<h4>Remove a task from a sprint help</h4>
    <p>You are about to remove this task from the assigned sprint</p>
    <ul>
        <li>The task will be removed from the sprint</li>
        <li>Even if the last tast of a user story is removed the removal of the user story needs an extra step</li>
    </ul>`,
}

export default {
	state,
}
