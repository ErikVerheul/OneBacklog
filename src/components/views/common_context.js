import { mapGetters } from 'vuex'
import { authorization, utilities } from '../mixins/utilities.js'

const INFO = 0
const WARNING = 1
const ERROR = 2
const STATE_NEW_OR_TODO = 2
const TASKLEVEL = 6
const AREA_PRODUCTID = '0'

function created() {
    this.removedState = 0
    this.onholdState = 1
    this.doneState = 6
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
}

function data() {
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
        dependentOnNode: undefined,
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
}

const computed = {
    ...mapGetters([
        'isPO',
        'isAPO',
        'myAssignedProductIds',
        'myTeam'
    ]),
    isReqAreaItem() {
        return this.$store.state.currentDoc.productId === AREA_PRODUCTID
    }
}

const methods = {
    doCloneProduct() {
        this.$store.dispatch('cloneProduct')
    },

    doCloneItem(node) {
        const newId = this.createId()
        let newNodeLocation
        const prevNode = window.slVueTree.getPreviousNode(node.path)
        if (node.path.slice(-1)[0] === 0) {
            // the previous node is the parent
            newNodeLocation = {
                nodeModel: prevNode,
                placement: 'inside'
            }
        } else {
            // the previous node is a sibling
            newNodeLocation = {
                nodeModel: prevNode,
                placement: 'after'
            }
        }
        // prepare the new node for insertion
        const newNode = {
            _id: newId,
            shortId: newId.slice(-5),
            title: 'COPY: ' + node.title,
            isLeaf: node.isLeaf,
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
                reqarea: node.data.reqArea,
                reqAreaItemcolor: node.data.reqAreaItemcolor,
                team: node.data.team,
                subtype: node.data.subtype,
                lastChange: 0
            }
        }
        // unselect the node that was clicked before the insert
        this.contextNodeSelected.isSelected = false
        // must insert the new node in the tree first to get the productId, parentId, pririty and set the location parameters
        window.slVueTree.insert(newNodeLocation, [newNode])
        // and select the new node
        this.$store.commit('updateNodesAndCurrentDoc', { newNode })

        this.showLastEvent(`Item of type ${this.getLevelText(newNode.level)} is inserted as a copy of '${node.title}'.`, INFO)
        // create a new document and store it
        const currentDoc = this.$store.state.currentDoc
        const newDoc = {
            "productId": currentDoc.productId,
            "parentId": newNode.parentId,
            "_id": newNode._id,
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
                "timestamp": Date.now(),
                "distributeEvent": false
            }],
            "history": [{
                "createEvent": [newNode.level, window.slVueTree.getParentNode(newNode).title, newNode.ind + 1],
                "by": this.$store.state.userData.user,
                "timestamp": Date.now(),
                "sessionId": this.$store.state.userData.sessionId,
                "distributeEvent": true
            }],
            "delmark": false
        }
        // update the database and replace the current document with this document
        this.$store.dispatch('createDocWithParentHist', { newNode, newDoc })
    },

    /*
     * Create and insert a new node in the tree and create a document for this new item
     * A new node can be inserted 'inside' or 'after' the selected location node (contextNodeSelected)
     * This method also contains 'Product details' view specific code
     */
    doInsertNewItem() {
        let newNodeLocation
        let now = Date.now()
        // prepare the new node for insertion and set isSelected to true
        const _id = this.createId()
        const newNode = {
            _id,
            shortId: _id.slice(-5),
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
                subtype: 0,
                lastChange: now
            }
        }
        let insertLevel = this.contextNodeSelected.level
        if (this.contextOptionSelected === this.INSERTBELOW) {
            // new node is a sibling placed below (after) the selected node
            newNodeLocation = {
                nodeModel: this.contextNodeSelected,
                placement: 'after'
            }
        } else {
            // new node is a child placed a level lower (inside) than the selected node
            insertLevel += 1
            newNodeLocation = {
                nodeModel: this.contextNodeSelected,
                placement: 'inside'
            }
        }

        let team = this.myTeam
        let sprintId = undefined
        let taskOwner = undefined
        if (insertLevel === TASKLEVEL) {
            // when inserting a task, copy the team name from the parent PBI or sibling task
            team = this.contextNodeSelected.data.team
            // and set the task owner
            taskOwner = this.$store.state.userData.user
            newNode.data.taskOwner = taskOwner
            // when inserting a task, copy the sprintId from the parent PBI or sibling task
            sprintId = this.contextNodeSelected.data.sprintId
            newNode.data.sprintId = sprintId
        }
        newNode.data.team = team
        newNode.title = newNode.parentId === AREA_PRODUCTID ? 'New requirement area' : 'New ' + this.getLevelText(insertLevel)

        if (this.haveAccessInTree(insertLevel, team, 'create new items of this type')) {
            if (newNodeLocation.placement === 'inside') {
                // unselect the node that was clicked before the insert and expand it to show the inserted node
                this.contextNodeSelected.isSelected = false
                this.contextNodeSelected.isExpanded = true
            } else {
                // unselect the node that was clicked before the insert
                this.contextNodeSelected.isSelected = false
            }
            // must insert the new node in the tree first to get the productId, parentId, priority and set the location parameters
            window.slVueTree.insert(newNodeLocation, [newNode])
            // and select the new node
            this.$store.commit('updateNodesAndCurrentDoc', { newNode })
            this.showLastEvent('Item of type ' + this.getLevelText(insertLevel) + ' is inserted', INFO)
            // create a new document and store it
            const newDoc = {
                "_id": _id,
                "type": "backlogItem",
                "productId": newNode.productId,
                "parentId": newNode.parentId,
                "sprintId": sprintId,
                "team": team,
                "taskOwner": newNode.data.taskOwner,
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
                "acceptanceCriteria": insertLevel < this.taskLevel ? window.btoa("<p>Please do not neglect</p>") : window.btoa("<p>See the acceptance criteria of the story/spike/defect.</p>"),
                "priority": newNode.data.priority,
                "comments": [{
                    "ignoreEvent": 'comments initiated',
                    "timestamp": Date.now(),
                    "distributeEvent": false
                }],
                "history": [{
                    "createEvent": [insertLevel, window.slVueTree.getParentNode(newNode).title, newNode.ind + 1],
                    "by": this.$store.state.userData.user,
                    "timestamp": Date.now(),
                    "sessionId": this.$store.state.userData.sessionId,
                    "distributeEvent": true
                }],
                "delmark": false
            }
            // update the parent history and than save the new document
            this.$store.dispatch('createDocWithParentHist', { newNode, newDoc })
        }
    },

    doCheckStates() {
        let count = 0
        window.slVueTree.traverseModels((nm) => {
            let descendants = window.slVueTree.getDescendantsInfo(nm).descendants
            if (descendants.length > 0) {
                let highestState = this.newState
                let allDone = true
                for (let desc of descendants) {
                    if (desc.data.state > highestState) highestState = desc.data.state
                    if (desc.data.state < this.doneState &&
                        desc.data.state !== this.removedState &&
                        desc.data.state !== this.onholdState) allDone = false
                }
                if (nm.data.state > highestState || nm.data.state === this.doneState && !allDone) {
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
            this.$store.dispatch('setDepAndCond', { dependentOnNode: this.dependentOnNode, conditionalForNode: this.contextNodeSelected, timestamp: Date.now() })
        } else {
            // save the node the dependency will be added to
            this.dependentOnNode = this.contextNodeSelected
            this.$store.state.selectNodeOngoing = true
        }
    },

    getDependencies() {
        this.dependenciesObjects = []
        for (let depId of this.contextNodeSelected.dependencies) {
            const item = window.slVueTree.getNodeById(depId)
            if (item) {
                this.dependenciesObjects.push({ _id: depId, title: item.title })
            }
        }
    },

    getConditions() {
        this.conditionsObjects = []
        for (let conId of this.contextNodeSelected.conditionalFor) {
            const item = window.slVueTree.getNodeById(conId)
            if (item) {
                this.conditionsObjects.push({ _id: conId, title: item.title })
            }
        }
    },

    /*
    * In the database both the selected node and all its descendants will be tagged with a delmark
    * The parent node and its decendants will be removed. The parent's parent, the grandparent, will get history info as well as the removed nodes.
    */
    doRemove() {
        const selectedNode = this.contextNodeSelected
        if (this.haveAccessInTree(selectedNode.level, selectedNode.data.team, 'remove this item')) {
            const descendantsInfo = window.slVueTree.getDescendantsInfo(selectedNode)
            this.showLastEvent(`The ${this.getLevelText(selectedNode.level)} and ${descendantsInfo.count} descendants are removed`, INFO)
            // when removing a product
            if (selectedNode.level === this.productLevel) {
                // cannot remove the last assigned product or product in the tree
                if (this.myAssignedProductIds.length === 1 || window.slVueTree.getProducts().length <= 1) {
                    this.showLastEvent("You cannot remove your last assigned product, but you can remove the epics", WARNING)
                    return
                }
            }
            // set remove mark in the database on the clicked item and descendants (if any)
            this.$store.dispatch('removeItemAndDescendents', {
                productId: selectedNode.productId,
                node: selectedNode,
                descendantsInfo,
                sprintIds: selectedNode.data.sprintId ? [selectedNode.data.sprintId] : []
            })
        }
    },

    /* Remove the dependency from the modal view only, not yet in the database and tree model. */
    removeDependency(id) {
        const objArray = []
        for (let depObj of this.dependenciesObjects) {
            if (id !== depObj._id) objArray.push(depObj)
        }
        this.dependenciesObjects = objArray
    },

    /* Remove the condition from the modal view only, not yet in the database and tree model. */
    removeCondition(id) {
        const objArray = []
        for (let conObj of this.conditionsObjects) {
            if (id !== conObj._id) objArray.push(conObj)
        }
        this.conditionsObjects = objArray
    },

    /* Update the dependencies and the corresponding conditions in the tree model and the database. */
    doRemoveDependencies() {
        const depIdArray = []
        for (let depObj of this.dependenciesObjects) {
            depIdArray.push(depObj._id)
        }
        let removedIds = []
        for (let id of this.contextNodeSelected.dependencies) {
            if (!depIdArray.includes(id)) removedIds.push(id)
        }
        this.$store.dispatch('removeDependenciesAsync', { node: this.contextNodeSelected, newDeps: depIdArray, removedIds, timestamp: Date.now() })
    },

    /* Update the conditions and the corresponding dependencies in the tree model and the database. */
    doRemoveConditions() {
        const conIdArray = []
        for (let conObj of this.conditionsObjects) {
            conIdArray.push(conObj._id)
        }
        let removedIds = []
        for (let id of this.contextNodeSelected.conditionalFor) {
            if (!conIdArray.includes(id)) removedIds.push(id)
        }
        this.$store.dispatch('removeConditionsAsync', { node: this.contextNodeSelected, newCons: conIdArray, removedIds, timestamp: Date.now() })
    },

    doCancel() {
        this.showAssistance = false
        this.$store.state.moveOngoing = false
        this.$store.state.selectNodeOngoing = false
    }
}

export default {
    mixins: [authorization, utilities],
    created,
    data,
    computed,
    methods
}
