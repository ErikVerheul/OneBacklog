import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
const WARNING = 1
const PRODUCTLEVEL = 2
const FEATURELEVEL = 4
const TASKLEVEL = 6
const HOURINMILIS = 3600000
var fromHistory
var histArray
var newDefaultId

function composeRangeString(id) {
    return 'startkey="' + id + '"&endkey="' + id + '"'
}

function setChangeTimestamps(history, lastComment) {
    // search history for the last changes within the last hour
    let lastPositionChange = 0
    let lastStateChange = 0
    let lastContentChange = 0
    let lastCommentAddition = 0
    let lastAttachmentAddition = 0
    let lastCommentToHistory = 0
    let nodeUndoMoveEventWasIssued = false
    for (let histItem of history) {
        if (Date.now() - histItem.timestamp > HOURINMILIS) {
            // skip events longer than a hour ago
            break
        }
        const event = Object.keys(histItem)[0]
        // get the most recent change of position
        if (lastPositionChange === 0 && event === 'nodeDroppedEvent') {
            if (!nodeUndoMoveEventWasIssued) {
                lastPositionChange = histItem.timestamp
                nodeUndoMoveEventWasIssued = false
            } else {
                lastPositionChange = 0
            }
        }
        // reset the timestamp when undoing the change of position
        if (event === 'nodeUndoMoveEvent') {
            nodeUndoMoveEventWasIssued = true
        }
        // get the most recent change of state
        if (lastStateChange === 0 && (event === 'setStateEvent') || event === 'createEvent') {
            lastStateChange = histItem.timestamp
        }
        // get the most recent change of content
        if (lastContentChange === 0 && (event === 'setTitleEvent') || event === 'descriptionEvent' || event === 'acceptanceEvent') {
            lastContentChange = histItem.timestamp
        }
        // get the most recent addition of comments to the history
        if (lastAttachmentAddition === 0 && event === 'uploadAttachmentEvent') {
            lastAttachmentAddition = histItem.timestamp
        }
        // get the most recent addition of comments to the history
        if (lastCommentToHistory === 0 && event === 'commentToHistoryEvent') {
            lastCommentToHistory = histItem.timestamp
        }
    }
    // get the last time a comment was added; comments have their own array
    lastCommentAddition = lastComment.timestamp
    return {
        lastPositionChange,
        lastStateChange,
        lastContentChange,
        lastCommentAddition,
        lastAttachmentAddition,
        lastCommentToHistory
    }
}

function cleanHistory(history) {
    const hour = 3600000
	const now = Date.now()
	const cleanedHist = []
	for (var i = 0; i < history.length; i++) {
		if ((now - history[i].timestamp < hour) && Object.keys(history[i])[0] !== 'ignoreEvent') cleanedHist.push(history[i])
    }
    if (cleanedHist.length === 0) cleanedHist.push(history[0])
    return cleanedHist
}

function convertToResults(docs) {
    const results = []
    for (let d of docs) {
        const res = {}
        res.id = d._id
        res.key = d.parentId
        res.value = []
        res.value.push(d.reqarea)
        res.value.push(d.productId)
        res.value.push(d.priority)
        res.value.push(d.level)
        res.value.push(d.state)
        res.value.push(d.title)
        res.value.push(d.team)
        res.value.push(d.subtype)
        res.value.push(d.dependencies)
        res.value.push(d.conditionalFor)
        res.value.push(cleanHistory(d.history))
        res.value.push(d.comments[0])

        results.push(res)
    }
    return results
}

const actions = {
    processItems({
        rootState,
        dispatch,
        commit
    }, results) {
        /*
		 * When the parentNode exists this function returns an object with:
		 * - the previous node (can be the parent)
		 * - the path of the location in the tree
		 * - the index in the array of siblings the node should have based on its priority
		 */
        function getLocationInfo(newPrio, parentNode) {
            let newPath = []
            if (parentNode.children && parentNode.children.length > 0) {
                let siblings = parentNode.children
                let i = 0
                while (i < siblings.length && siblings[i].data.priority > newPrio) i++
                let prevNode = null
                if (i === 0) {
                    prevNode = parentNode
                    newPath = parentNode.path.slice()
                    newPath.push(0)
                } else {
                    prevNode = siblings[i - 1]
                    newPath = prevNode.path.slice(0, -1)
                    newPath.push(i)
                }
                return {
                    prevNode: prevNode,
                    newPath: newPath,
                    newInd: i
                }
            } else {
                parentNode.children = []
                newPath = parentNode.path.slice()
                newPath.push(0)
                return {
                    prevNode: parentNode,
                    newPath: newPath,
                    newInd: 0
                }
            }
        }

        for (let item of results) {
            const _id = item.id
            const parentId = item.key
            const reqarea = item.value[0] || null
            const productId = item.value[1]
            const priority = item.value[2]
            const level = item.value[3]
            const itemState = item.value[4]
            const title = item.value[5]
            const team = item.value[6]
            const subtype = item.value[7]
            const dependencies = item.value[8] || []
            const conditionalFor = item.value[9] || []
            const history = item.value[10]
            const lastComment = item.value[11]

            const parentNode = window.slVueTree.getNodeById(parentId)
            if (parentNode) {
                // create the node
                const locationInfo = getLocationInfo(priority, parentNode)
                const isExpanded = productId === rootState.currentDefaultProductId ? level < FEATURELEVEL : level < PRODUCTLEVEL
                const changeTimes = setChangeTimestamps(history, lastComment)
                let lastChange
                if (history[0].resetCommentsEvent && !history[0].resetHistoryEvent) {
                    lastChange = history[0].timestamp
                } else if (history[0].resetHistoryEvent && !history[0].resetCommentsEvent) {
                    lastChange = lastComment.timestamp
                } else lastChange = history[0].timestamp > lastComment.timestamp ? history[0].timestamp : lastComment.timestamp
                let newNode = {
                    path: locationInfo.newPath,
                    pathStr: JSON.stringify(locationInfo.newPath),
                    ind: locationInfo.newInd,
                    level,
                    productId,
                    parentId,
                    _id,
                    shortId: _id.slice(-5),
                    dependencies: dependencies || [],
                    conditionalFor: conditionalFor || [],
                    title,
                    isLeaf: level === TASKLEVEL,
                    children: [],
                    isSelected: false,
                    isExpanded,
                    savedIsExpanded: isExpanded,
                    isSelectable: true,
                    isDraggable: level > PRODUCTLEVEL,
                    doShow: true,
                    savedDoShow: true,
                    data: {
                        priority,
                        state: itemState,
                        reqarea,
                        team,
                        subtype,
                        lastPositionChange: changeTimes.lastPositionChange,
                        lastStateChange: changeTimes.lastStateChange,
                        lastContentChange: changeTimes.lastContentChange,
                        lastCommentAddition: changeTimes.lastCommentAddition,
                        lastAttachmentAddition: changeTimes.lastAttachmentAddition,
                        lastCommentToHistory: changeTimes.lastCommentToHistory,
                        lastChange
                    }
                }
                window.slVueTree.insert({
                    nodeModel: locationInfo.prevNode,
                    placement: locationInfo.newInd === 0 ? 'inside' : 'after'
                }, [newNode], false)

                if (fromHistory) {
                    // restore external dependencies
                    const dependencies = histArray[2] || []
                    for (let d of dependencies) {
                        const node = window.slVueTree.getNodeById(d.id)
                        if (node !== null) node.dependencies.push(d.dependentOn)
                    }
                    const conditionalFor = histArray[4] || []
                    for (let c of conditionalFor) {
                        const node = window.slVueTree.getNodeById(c.id)
                        if (node !== null) node.conditionalFor.push(c.conditionalFor)
                    }
                } else {
                    // select the product node in the tree
                    if (_id === newDefaultId) window.slVueTree.selectNodeById(newDefaultId)
                }
                dispatch('getChildren', _id)
            } else {
                commit('showLastEvent', { txt: 'Cannot restore a removed item. Sign out and -in to see the change.', severity: WARNING })
                let msg = 'Sync.processItems: a remote restore of the tree view failed. Cannot find the parent of ' + parentId
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            }
        }
    },

    getChildren({
        rootState,
        dispatch
    }, _id) {
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/_design/design1/_view/docToParentMapValues?' + composeRangeString(_id)
        }).then(res => {
            const results = res.data.rows
            if (results.length > 0) {
                // process next level
                dispatch('processItems', results)
            }
        }).catch(error => {
            let msg = 'restorebranches.getChildren: Could not read the items from database ' + rootState.userData.currentDb + '. Error = ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

    restoreBranch({
        dispatch
    }, doc) {
        fromHistory = true
        histArray = doc.history[0]["docRestoredEvent"]
        dispatch('processItems', convertToResults([doc]))
    },

    restorebranches({
        dispatch
    }, docs) {
        fromHistory = false
        dispatch('processItems', convertToResults(docs))
    },

    /* addProducts uses restoteBranches to load a product as a branche */
    addProducts({
		rootState,
		dispatch
	}, payload) {
        newDefaultId = payload.newDefaultId
		const docsToGet = []
		for (let id of payload.missingIds) {
			docsToGet.push({ "id": id })
		}
		globalAxios({
			method: 'POST',
			url: rootState.userData.currentDb + '/_bulk_get',
			data: { "docs": docsToGet },
		}).then(res => {
			const results = res.data.results
			const docs = []
			const error = []
			for (let r of results) {
				docs.push(r.docs[0].ok)
				if (r.docs[0].error) error.push(r.docs[0].error)
			}
			if (error.length > 0) {
				let errorStr = ''
				for (let e of error) {
					errorStr.concat(e.id + '( error = ' + e.error + ', reason = ' + e.reason + '), ')
				}
				let msg = 'addProducts: These products cannot be added: ' + errorStr
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			}
			dispatch('restorebranches', docs)
		}).catch(e => {
			let msg = 'addProducts: Could not add products with ids ' + payload.missingIds + ' in database ' + rootState.userData.currentDb + '. Error = ' + e
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log(msg)
			dispatch('doLog', { event: msg, level: ERROR })
		})
	},

}

export default {
    actions
}
