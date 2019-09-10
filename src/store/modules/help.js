const state = {
    test: 'test',
    help: {
        insert: [
            `skip this level`,
            `database level help`,
            `product level help`,

            `<h4>Epic level help</h4>
            <p>
            You are about to insert an epic. You can compare an epic with a project. It is a major endeavor which can take months to accomplish.<br/>
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
            <p>
            When an epic has no foreseeable end date, consider to create a new product.
            </p>`,

            `<h4>Feature level help</h4>
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
            During refinement the team creates PBI's to the feature.
            </p>
            <hr>
            <p>
            When a feature is so big that it needs multiple sprints to realize or other teams are involved, consider to create an epic.
            </p>`,

            `<h4>PBI level help</h4>
            <p>
            You are about to insert a Product Backlog Item. A PBI can be a user story, a spike or defect to be fixed.<br/>
            On creation the state will be 'New'.<br/>
            A PBI is always a child of a feature. Orphan PBI's without the context of a feature cannot exist.<br/>
            During refinement sessions the team makes sure that:
            <ul>
                <li>The acceptance criteria are set and fully understood</li>
                <li>The team can realize the PBI it self (dependencies with other teams are resolved)</li>
                <li>The size of the PBI is small so that this PBI and others can be realized in one sprint.</li>
            </ul>
            During sprint planning the team creates tasks to the PBI.
            </p>
            <hr>
            <p>
            When a PBI is a user story, and has value in its own right, consider to create a feature.<br/>
            Realizing a PBI should be a team effort. Avoid creating PBI's which should be on the task level.
            </p>`
        ],
        move: `<h4>Move help</h4>
        <p>
        You are about to move an item with its descendants to another product.<br/>
        The item will be removed from its source and inserted in the other product.<br/>
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
        In this version of the application there is no undo for a removal.
        </p>
        <hr>
        <p>
        Only the server admin can, with great effort, undo a removal by removing the remove mark of all items of the chain up to product level.<br/>
        Over time the server admin will delele the marked removals from the database. Direct access via the item id will not work anymore.
        </p>`
    }
}

export default {
    state
}
