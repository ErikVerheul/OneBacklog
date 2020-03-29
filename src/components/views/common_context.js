import { mapGetters } from 'vuex'
import { eventBus } from '../../main'
import { utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const ERROR = 2
const REMOVED = 0
const ONHOLD = 1
const DONE = 5
const STATE_NEW_OR_TODO = 2
const TASKLEVEL = 6
const AREA_PRODUCTID = '0'

export default {
    mixins: [utilities],

    created() {
        this.databaseLevel = 1
        this.productLevel = 2
        this.epicLevel = 3
        this.featureLevel = 4
        this.pbiLevel = 5
        this.taskLevel = 6
        this.INSERTBELOW = 0
        this.INSERTINSIDE = 1
        this.MOVETOPRODUCT = 2
        this.REMOVEITEM = 3
        this.ASIGNTOMYTEAM = 4
        this.CHECKSTATES = 5
        this.SETDEPENDENCY = 6
        this.SHOWDEPENDENCIES = 7
        this.SHOWCONDITIONS = 8
        this.CLONEPRODUCT = 9
        this.CLONEITEM = 10
    },

    data() {
        return {
            disableOkButton: true,
            contextNodeSelected: undefined,
            contextWarning: undefined,
            contextParentTeam: '',
            contextNodeTitle: '',
            contextNodeLevel: 0,
            contextParentType: '',
            contextNodeType: '',
            contextNodeTeam: '',
            contextChildType: '',
            contextOptionSelected: undefined,
            listItemText: '',
            assistanceText: 'No assistance available',
            showAssistance: false,
            contextNodeDescendantsCount: 0,
            moveSourceProductId: '',
            nodeWithDependenciesId: undefined,
            hasDependencies: false,
            hasConditions: false,
            allowRemoval: false,
            dependenciesObjects: [],
            conditionsObjects: []
        }
    },

    mounted() {
        // to fix this.$refs.contextMenuRef undefined when routing away and back, expose instance to the global namespace
        window.showContextMenuRef = this.$refs.contextMenuRef
        eventBus.$on('contextMenu', (node) => {
            this.showContextMenu(node)
        })
    },

    computed: {
        ...mapGetters([
            // from startup.js
            'haveWritePermission'
        ]),
        isReqAreaItem() {
            return this.$store.state.currentDoc.productId === AREA_PRODUCTID
        }
    },

    methods: {
        // returns null when the node does not exist
        getNodeWithDependencies() {
            return window.slVueTree.getNodeById(this.nodeWithDependenciesId)
        },

        doCloneProduct() {
            this.$store.dispatch('cloneProduct')
        },

        doCloneItem(node) {
            const ids = this.createId()
            const newId = ids.id
            const newShortId = ids.shortId
            let insertPosition

            const prevNode = window.slVueTree.getPreviousNode(node.path)
            if (node.path.slice(-1)[0] === 0) {
                // the previous node is the parent
                insertPosition = {
                    nodeModel: prevNode,
                    placement: 'inside'
                }
            } else {
                // the previous node is a sibling
                insertPosition = {
                    nodeModel: prevNode,
                    placement: 'after'
                }
            }

            // prepare the new node for insertion
            const newNode = {
                _id: newId,
                shortId: newShortId,
                title: 'COPY: ' + node.title,
                dependencies: [],
                conditionalFor: [],
                children: [],
                isExpanded: false,
                savedIsExpanded: false,
                isDraggable: true,
                isSelectable: true,
                isSelected: true,
                doShow: true,
                savedDoShow: true,
                data: {
                    state: STATE_NEW_OR_TODO,
                    team: node.data.team,
                    subtype: node.data.subtype,
                    lastChange: 0
                }
            }
            // unselect the node that was clicked before the insert
            this.contextNodeSelected.isSelected = false
            // insert the new node in the tree and assign the priority to this node
            window.slVueTree.insertSingle(insertPosition, newNode)
            // and select the new node
            this.$store.state.nodeSelected = newNode

            this.showLastEvent("Item of type " + this.getLevelText(newNode.level) + " is inserted as a copy of '" + node.title + "'.", INFO)
            // create a new document and store it
            const parentTitle = window.slVueTree.getNodeById(newNode.parentId).title
            const currentDoc = this.$store.state.currentDoc
            const newDoc = {
                "productId": currentDoc.productId,
                "parentId": newNode.parentId,
                "_id": newNode._id,
                "shortId": newNode.shortId,
                "type": "backlogItem",
                "team": currentDoc.team,
                "level": newNode.level,
                "subtype": currentDoc.subtype,
                "state": STATE_NEW_OR_TODO,
                "tssize": currentDoc.tssize,
                "spsize": currentDoc.spsize,
                "spikepersonhours": currentDoc.spikepersonhours,
                "reqarea": null,
                "dependencies": [],
                "conditionalFor": [],
                "title": newNode.title,
                "followers": [],
                "description": window.btoa(currentDoc.description),
                "acceptanceCriteria": window.btoa(currentDoc.acceptanceCriteria),
                "priority": newNode.data.priority,
                "comments": [{
                    "ignoreEvent": 'comments initiated',
                    "timestamp": 0,
                    "distributeEvent": false
                }],
                "history": [{
                    "createEvent": [newNode.level, parentTitle, newNode.ind + 1],
                    "by": this.$store.state.userData.user,
                    "timestamp": Date.now(),
                    "sessionId": this.$store.state.userData.sessionId,
                    "distributeEvent": true
                }],
                "delmark": false
            }
            // create a history event for the parent to trigger an email message to followers
            const parentHist = {
                "newChildEvent": [newNode.level, newNode.ind + 1],
                "by": this.$store.state.userData.user,
                "timestamp": Date.now(),
                "distributeEvent": false
            }
            // update the database
            this.$store.dispatch('createDoc', { newDoc, parentHist })
            // create an entry for undoing the change in a last-in first-out sequence
            const entry = {
                type: 'undoNewNode',
                newNode
            }
            this.$store.state.changeHistory.unshift(entry)
        },

		/*
		 * Create and insert a new node in the tree and create a document for this new item
		 * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
         * This method also contains 'Product details' view specific code
		 */
        doInsertNewItem() {
            const locationPath = this.contextNodeSelected.path
            let newNodeLocation
            let path
            let idx
            let now = Date.now()
            // prepare the new node for insertion and set isSelected to true
            const newNode = {
                productId: this.$store.state.currentProductId,
                dependencies: [],
                conditionalFor: [],
                children: [],
                isExpanded: false,
                savedIsExpanded: false,
                isDraggable: true,
                isSelectable: true,
                isSelected: true,
                doShow: true,
                savedDoShow: true,
                data: {
                    priority: null,
                    state: STATE_NEW_OR_TODO,
                    subtype: 0,
                    lastChange: now
                }
            }
            let insertLevel = this.contextNodeSelected.level
            let parentTitle
            if (this.contextOptionSelected === this.INSERTBELOW) {
                // new node is a sibling placed below (after) the selected node
                newNodeLocation = {
                    nodeModel: this.contextNodeSelected,
                    placement: 'after'
                }
                idx = locationPath.slice(-1)[0] + 1
                path = locationPath.slice(0, -1).concat(idx)
                newNode.parentId = this.contextNodeSelected.parentId
                newNode.title = 'New ' + this.getLevelText(insertLevel)
                newNode.isLeaf = (insertLevel < this.taskLevel) ? false : true
                parentTitle = window.slVueTree.getNodeById(newNode.parentId).title
            } else {
                // new node is a child placed a level lower (inside) than the selected node
                insertLevel += 1

                newNodeLocation = {
                    nodeModel: this.contextNodeSelected,
                    placement: 'inside'
                }
                idx = 0
                path = this.contextNodeSelected.path.concat(0)
                newNode.parentId = this.contextNodeSelected._id
                newNode.title = 'New ' + this.getLevelText(insertLevel)
                newNode.isLeaf = (insertLevel < this.taskLevel) ? false : true
                parentTitle = this.contextNodeSelected.title
            }

            let team = 'not assigned yet'
            let sprintId = undefined
            let taskOwner = undefined
            if (insertLevel === TASKLEVEL) {
                // when inserting a task, copy the team name from the parent PBI or sibling task
                team = this.contextNodeSelected.data.team
                // and set the task owner
                taskOwner = this.$store.state.userData.user
                newNode.data.taskOwner = taskOwner
                // when inserting a task, copy the sprintId from the parent PBI or sibling task
                sprintId = this.contextNodeSelected.sprintId
                newNode.sprintId = sprintId
            }

            newNode.data.team = team
            // overwrite the title when creating a new req area
            if (newNode.parentId === AREA_PRODUCTID) newNode.title = 'New requirement area'
            // add the location values
            newNode.path = path
            newNode.pathStr = JSON.stringify(path)
            newNode.ind = idx
            newNode.level = path.length

            if (this.haveWritePermission[insertLevel]) {
                const ids = this.createId()
                newNode._id = ids.id
                newNode.shortId = ids.id.slice(-5)
                if (newNodeLocation.placement === 'inside') {
                    // unselect the node that was clicked before the insert and expand it to show the inserted node
                    this.contextNodeSelected.isSelected = false
                    this.contextNodeSelected.isExpanded = true
                } else {
                    // unselect the node that was clicked before the insert
                    this.contextNodeSelected.isSelected = false
                }
                // insert the new node in the tree
                window.slVueTree.insertSingle(newNodeLocation, newNode)
                // and select the new node
                this.$store.state.nodeSelected = newNode
                this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
                // create a new document and store it
                const newDoc = {
                    "_id": newNode._id,
                    "shortId": newNode.shortId,
                    "type": "backlogItem",
                    "productId": newNode.productId,
                    "parentId": newNode.parentId,
                    "sprintId": sprintId,
                    "team": team,
                    "taskOwner": taskOwner,
                    "level": insertLevel,
                    "subtype": 0,
                    "state": STATE_NEW_OR_TODO,
                    "tssize": 3,
                    "spsize": 0,
                    "spikepersonhours": 0,
                    "reqarea": null,
                    "dependencies": [],
                    "conditionalFor": [],
                    "title": newNode.title,
                    "followers": [],
                    "description": window.btoa(""),
                    "acceptanceCriteria": window.btoa("<p>Please do not neglect</p>"),
                    "priority": newNode.data.priority,
                    "attachments": [],
                    "comments": [{
                        "ignoreEvent": 'comments initiated',
                        "timestamp": 0,
                        "distributeEvent": false
                    }],
                    "history": [{
                        "createEvent": [insertLevel, parentTitle, newNode.ind + 1],
                        "by": this.$store.state.userData.user,
                        "timestamp": Date.now(),
                        "sessionId": this.$store.state.userData.sessionId,
                        "distributeEvent": true
                    }],
                    "delmark": false
                }
                // create a history event for the parent to trigger an email message to followers
                const parentHist = {
                    "newChildEvent": [insertLevel, newNode.ind + 1],
                    "by": this.$store.state.userData.user,
                    "timestamp": Date.now(),
                    "distributeEvent": false
                }
                // update the database
                this.$store.dispatch('createDoc', { newDoc, parentHist })
                // create an entry for undoing the change in a last-in first-out sequence
                const entry = {
                    type: 'undoNewNode',
                    newNode
                }
                this.$store.state.changeHistory.unshift(entry)
            } else {
                this.showLastEvent("Sorry, your assigned role(s) disallow you to create new items of this type", WARNING)
            }
        },

        doCheckStates() {
            let count = 0
            window.slVueTree.traverseModels((nm) => {
                let descendants = window.slVueTree.getDescendantsInfo(nm).descendants
                if (descendants.length > 0) {
                    let highestState = 0
                    let allDone = true
                    for (let desc of descendants) {
                        if (desc.data.state > highestState) highestState = desc.data.state
                        if (desc.data.state < DONE &&
                            desc.data.state !== REMOVED &&
                            desc.data.state !== ONHOLD) allDone = false
                    }
                    if (nm.data.state > highestState || nm.data.state === DONE && !allDone) {
                        // node has a higher state than any of its descendants or set to done while one of its descendants is not done
                        if (!nm.data.inconsistentState) nm.data.lastChange = Date.now()
                        nm.data.inconsistentState = true
                        window.slVueTree.showPathToNode(nm)
                        count++
                    } else {
                        if (nm.data.inconsistentState) nm.data.lastChange = Date.now()
                        nm.data.inconsistentState = false
                    }
                }
            }, [this.contextNodeSelected])
            this.showLastEvent(`${count} inconsistencies are found.`, INFO)
        },

        doSetDependency() {
            if (this.$store.state.selectNodeOngoing) {
                if (this.contextNodeSelected.conditionalFor) {
                    this.contextNodeSelected.conditionalFor.push(this.nodeWithDependenciesId)
                } else this.contextNodeSelected.conditionalFor = this.nodeWithDependenciesId
                const conditionalForPayload = { _id: this.contextNodeSelected._id, conditionalFor: this.contextNodeSelected.conditionalFor }
                const nodeWithDependencies = this.getNodeWithDependencies()
                nodeWithDependencies.dependencies.push(this.contextNodeSelected._id)
                const dependenciesPayload = { _id: nodeWithDependencies._id, dependencies: nodeWithDependencies.dependencies, conditionalForPayload }
                this.$store.dispatch('setDepAndCond', dependenciesPayload)
                this.$store.state.selectNodeOngoing = false
                // create an entry for undoing the change in a last-in first-out sequence
                const entry = {
                    type: 'undoSetDependency',
                    nodeWithDependencies
                }
                this.$store.state.changeHistory.unshift(entry)
            } else {
                // save the id of the node the dependencies will be attached to
                this.nodeWithDependenciesId = this.contextNodeSelected._id
                this.$store.state.selectNodeOngoing = true
            }
        },

        getDependencies() {
            this.dependenciesObjects = []
            for (let depObj of this.contextNodeSelected.dependencies) {
                const item = window.slVueTree.getNodeById(depObj)
                if (item) {
                    this.dependenciesObjects.push({ _id: depObj, title: item.title })
                }
            }
        },

        getConditions() {
            this.conditionsObjects = []
            for (let conObj of this.contextNodeSelected.conditionalFor) {
                const item = window.slVueTree.getNodeById(conObj)
                if (item) {
                    this.conditionsObjects.push({ _id: conObj, title: item.title })
                }
            }
        },

        /* Remove the dependency from the view only, not yet in the database. */
        removeDependency(id) {
            const objArray = []
            for (let depObj of this.dependenciesObjects) {
                if (id !== depObj._id) objArray.push(depObj)
            }
            this.dependenciesObjects = objArray
        },

        /* Remove the condition from the view only, not yet in the database. */
        removeCondition(id) {
            const objArray = []
            for (let conObj of this.conditionsObjects) {
                if (id !== conObj._id) objArray.push(conObj)
            }
            this.conditionsObjects = objArray
        },

        /* Update the dependencies and the corresponding conditions in the tree model and the database. */
        doUpdateDependencies() {
            const depIdArray = []
            for (let depObj of this.dependenciesObjects) {
                depIdArray.push(depObj._id)
            }
            let removedIds = []
            for (let id of this.contextNodeSelected.dependencies) {
                if (!depIdArray.includes(id)) removedIds.push(id)
            }
            // update the dependencies in the tree
            this.contextNodeSelected.dependencies = depIdArray
            // dispatch the update in the database
            this.$store.dispatch('updateDep', { _id: this.contextNodeSelected._id, newDeps: depIdArray, removedIds })
            // update the conditions in the tree
            for (let id of removedIds) {
                const node = window.slVueTree.getNodeById(id)
                if (node === null) {
                    this.showLastEvent('Unexpected error. Node not found.', ERROR)
                    break
                }

                const conIdArray = []
                for (let condId of node.conditionalFor) {
                    if (condId !== this.contextNodeSelected._id) conIdArray.push(id)
                }
                node.conditionalFor = conIdArray
            }
        },

        /* Update the conditions and the corresponding dependencies in the tree model and the database. */
        doUpdateConditions() {
            const conIdArray = []
            for (let conObj of this.conditionsObjects) {
                conIdArray.push(conObj._id)
            }
            let removedIds = []
            for (let id of this.contextNodeSelected.conditionalFor) {
                if (!conIdArray.includes(id)) removedIds.push(id)
            }
            // update the conditions in the tree
            this.contextNodeSelected.conditionalFor = conIdArray
            // dispatch the update in the database
            this.$store.dispatch('updateCon', { _id: this.contextNodeSelected._id, newCons: conIdArray, removedIds })
            // update the dependencies in the tree
            for (let id of removedIds) {
                const node = window.slVueTree.getNodeById(id)
                if (node === null) {
                    this.showLastEvent('Unexpected error. Node not found.', ERROR)
                    break
                }

                const depIdArray = []
                for (let depId of node.dependencies) {
                    if (depId !== this.contextNodeSelected._id) depIdArray.push(id)
                }
                node.dependencies = depIdArray
            }
        },

        doCancel() {
            this.showAssistance = false
            this.$store.state.moveOngoing = false
            this.$store.state.selectNodeOngoing = false
        }
    }
}
