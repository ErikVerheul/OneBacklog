'use strict';
require('dotenv').config();
const interestingHistoryEvents = ["acceptanceEvent", "addCommentEvent", "addSprintIdsEvent", "cloneEvent", "commentToHistoryEvent", "conditionRemovedEvent",
    "dependencyRemovedEvent", "descriptionEvent", "docRestoredEvent", "newChildEvent", "nodeMovedEvent", "removeAttachmentEvent", "removedFromParentEvent",
    "setConditionEvent", "setDependencyEvent", "setHrsEvent", "setPointsEvent", "setSizeEvent", "setStateEvent", "setSubTypeEvent", "setTeamOwnerEvent",
    "removeSprintIdsEvent", "setTitleEvent", "uploadAttachmentEvent"];
const nano = require('nano')('http://' + process.env.COUCH_USER + ':' + process.env.COUCH_PW + '@localhost:5984');
const atob = require('atob');
const mailgun = require('mailgun-js')({ apiKey: process.env.API_KEY, domain: process.env.DOMAIN, host: 'api.eu.mailgun.net' });
const PBILEVEL = 5;
var db;
var configData = {};
var runData = {};

function getSubTypeText(dbName, idx) {
    if (idx < 0 || idx >= configData[dbName].subtype.length) {
        return 'Error: unknown subtype'
    }
    return configData[dbName].subtype[idx]
}

function getLevelText(dbName, level, subtype) {
    if (level < 0 || level > PBILEVEL) return 'Level not supported'

    if (subtype !== undefined && level === PBILEVEL) {
        return getSubTypeText(dbName, subtype)
    } else return configData[dbName].itemType[level]
}

function getItemStateText(dbName, idx) {
    if (idx < 0 || idx > PBILEVEL) {
        return 'Error: unknown state'
    }
    return configData[dbName].itemState[idx]
}

function getTsSize(dbName, idx) {
    if (idx < 0 || idx >= configData[dbName].tsSize.length) {
        return 'Error: unknown T-shirt size'
    }
    return configData[dbName].tsSize[idx]
}

function mkHtml(dbName, eventType, value, event, doc) {
    function mkHeader() {
        return `<html><p>User '${event.by}' made a change in the '${getLevelText(dbName, doc.level, doc.subtype)}' with title:</p>
            <h3>'${doc.title}'</h3>`
    }
    function mkFooter() {
        return `<p>The shortId is ${doc.shortId}<br>
            The mutation date is ${new Date(event.timestamp)}</p></html>`
    }
    function cText(condition, text) {
        if (condition) return text
        return ``
    }
    function convertToShortIds(ids) {
        if (!ids || ids.length === 0) return '[none]'

        const shortIds = []
        for (let id of ids) {
            shortIds.push(id.slice(-5))
        }
        return '[' + shortIds + ']'
    }
    switch (eventType) {
        case "acceptanceEvent":
            return mkHeader() + `<h3>The acceptance criteria changed from:</h3><p>${atob(value[0])}</p> to <p>${atob(value[1])}</p>` + mkFooter()
        case "addCommentEvent":
            return mkHeader() + `<h3>The user added a comment:</h3><p>${atob(value)}</p>` + mkFooter()
        case "addSprintIdsEvent":
            {
                let txt = `This ${getLevelText(dbName, value[0], value[1])} is assigned to sprint '${value[2]}'.`
                if (value[3]) txt += ` The item was assigned to a sprint before.`
                return mkHeader() + `<h3>${txt}</h3>` + mkFooter()
            }
        case "cloneEvent":
            return mkHeader() + `<h3>This ${getLevelText(dbName, value[0], value[1])} has been cloned as item of product '${value[2]}'.</h3>` + mkFooter()
        case "commentToHistoryEvent":
            return mkHeader() + `<h3>The user added comment:</h3><p>${atob(value[0])}</p><h3>to the history of this item</h3>` + mkFooter()
        case "conditionRemovedEvent":
            {
                let s
                if (value[1]) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` }
                else if (value[0].length === 1) { s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` }
                else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
                return mkHeader() + `<h3>${s}</h3>` + + mkFooter()
            }
        case "dependencyRemovedEvent":
            {
                let s
                if (value[1]) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.` }
                else if (value[0].length === 1) { s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.` }
                else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
                return mkHeader() + `<h3>${s}</h3>` + + mkFooter()
            }
        case "descriptionEvent":
            return mkHeader() + `<h3>The description changed from:</h3><p>${atob(value[0])}</p> to <p>${atob(value[1])}</p>` + mkFooter()
        case "docRestoredEvent":
            return mkHeader() + `<h3>This item and ${value[0]} descendants are restored from removal.</h3>` + mkFooter()
        case "newChildEvent":
            return mkHeader() + `<h3>A ${getLevelText(dbName, value[0])} was created as a child of this item at position ${value[1]}.</h3>` + mkFooter()
        case "nodeMovedEvent":
            {
                const moveType = value[13] === 'undoMove' ? ' back' : ''
                let txt
                if (value[7] !== value[8]) { txt = `<h5>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}.</h5>` } else txt = ''
                if (value[0] === value[1]) {
                    txt += `<h5>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h5>`
                    txt += (value[4] > 0) ? `<p>${value[4]} children were also moved.</p>` : ""
                    return mkHeader() + txt + mkFooter()
                } else {
                    txt += `<h5>The item changed type from ${getLevelText(dbName, value[0])} to ${getLevelText(dbName, value[1])}.</h5>`
                    txt += `<p>The new position is ${(value[2] + 1)} under parent '${value[3]}'</p>`
                    txt += (value[4] > 0) ? `<p>${value[4]} children also changed type.</p>` : ""
                    return mkHeader() + txt + mkFooter()
                }
            }
        case "removeAttachmentEvent":
            return mkHeader() + `<h3>Attachment with title '${value[0]}' is removed from this item</h3>` + mkFooter()
        case "removedFromParentEvent":
            return mkHeader() + `<h3>${getLevelText(dbName, value[0], value[3])} with title: '${value[1]}' and ${value[2]} descendants are removed from this parent</h3>
            <p>From the descendants ${value[4]} external dependencies and ${value[5]} external conditions were removed.</p>` + mkFooter()
        case "removeSprintIdsEvent":
            return mkHeader() + `<h3>This ${getLevelText(dbName, value[0], value[1])} is removed from sprint '${value[2]}</h3>` + mkFooter()
        case "setConditionEvent":
            if (value[2]) return mkHeader() + `<h3>The previous condition set for item '${value[1]} is undone'.</h3>` + mkFooter()
            return mkHeader() + `<h3>This item is set to be conditional for item '${value[1]}'.</h3>` + mkFooter()
        case "setDependencyEvent":
            if (value[2]) return mkHeader() + `<h3>The previous dependency set on item '${value[1]} is undone'.</h3>` + mkFooter()
            return mkHeader() + `<h3>This item is set to be dependent on item '${value[1]}'.</h3>` + mkFooter()
        case "setHrsEvent":
            return mkHeader() + `<h3>The maximum effort changed from ${value[0]} to ${value[1]} hours</h3>` + mkFooter()
        case "setPointsEvent":
            return mkHeader() + `<h3>The item size changed from ${value[0]} to ${value[1]} story points</h3>` + mkFooter()
        case "setSizeEvent":
            return mkHeader() + `<h3>The item T-shirt size changed from ${getTsSize(dbName, value[0])} to ${getTsSize(dbName, value[1])}</h3>` + mkFooter()
        case "setStateEvent":
            return mkHeader() + `<h3>The item state changed from ${getItemStateText(dbName, value[0])} to ${getItemStateText(dbName, value[1])}</h3>` +
                `<p>This backlog item is realized by team '${value[2]}'</p>` + mkFooter()
        case "setSubTypeEvent":
            return mkHeader() + `<h3>The item subtype changed from '${getSubTypeText(dbName, value[0])}' to '${getSubTypeText(dbName, value[1])}'</h3>` + mkFooter()
        case "setTeamOwnerEvent":
            return mkHeader() + `<h3>The owning team changed from '${value[0]}' to '${value[1]}'</h3>` +
                cText(value[2] > 0, `<h3>Also ${value[2]} descendants of this item are assigned to this team</h3>`) + mkFooter()
        case "setTitleEvent":
            return mkHeader() + `<h3>The item title changed from: </h3><h3>'${value[0]}' to <br>'${value[1]}'</h3>` + mkFooter()
        case "uploadAttachmentEvent":
            return mkHeader() + `<h3>Attachment with title '${value[0]}' of type '${value[2]}' and size ${value[1]} bytes is uploaded</h3>` + mkFooter()
        default:
            return "unknown event type"
    }
}

function listenForChanges(dbName) {
    nano.db.changes(dbName, { feed: 'longpoll', include_docs: true, filter: 'filters/email_filter', since: 'now' }).then((body) => {
        // console.log('body = ' + JSON.stringify(body, null, 2));
        const results = body.results;
        for (let r of results) {
            let doc = r.doc;
            if (doc.followers) {
                if (doc.comments[0].timestamp > doc.history[0].timestamp) {
                    // process new comment
                    for (let f of doc.followers) {
                        const event = doc.comments[0];
                        const eventType = Object.keys(event)[0];
                        const data = { from: 'no-reply@onebacklog.net', to: f.email, subject: 'Event ' + eventType + ' occurred', html: mkHtml(dbName, eventType, event[eventType], event, doc) }
                        mailgun.messages().send(data, (error, body) => {
                            // eslint-disable-next-line no-console
                            console.log(body);
                        });
                    }
                } else {
                    // process new event in history
                    for (let f of doc.followers) {
                        const event = doc.history[0];
                        const eventType = Object.keys(event)[0];
                        if (interestingHistoryEvents.includes(eventType)) {
                            const data = { from: 'no-reply@onebacklog.net', to: f.email, subject: 'Event ' + eventType + ' occurred', html: mkHtml(dbName, eventType, event[eventType], event, doc) }
                            mailgun.messages().send(data, (error, body) => {
                                // eslint-disable-next-line no-console
                                console.log(body);
                            });
                        }
                    }
                }
            }
        }
        checkForNewDataBases()
        // eslint-disable-next-line no-console
        console.log('listenForChanges: listening to database ' + dbName)
        listenForChanges(dbName);
    }).catch((err) => {
        if (err.code === "ESOCKETTIMEDOUT") { listenForChanges(dbName) } else
            if (err.statusCode === 404) {
                // eslint-disable-next-line no-console
                console.log('listenForChanges: The database ' + dbName + ' cannot be reached. Stop listening')
                runData[dbName].listening = false
            } else
                // eslint-disable-next-line no-console
                console.log('listenForChanges: An error is detected while processing messages in database ' + dbName + ' :' + JSON.stringify(err, null, 2));
    });
}

function getConfig(dbName) {
    db.get("config").then((body) => {
        configData[dbName] = body
        listenForChanges(dbName)
    }).catch((err) => {
        // eslint-disable-next-line no-console
        console.log('An error is detected while loading the configuration of database ' + dbName + ', ' + JSON.stringify(err, null, 2));
    })
}

function checkForNewDataBases() {
    nano.db.list().then((body) => {
        body.forEach((dbName) => {
            if (!dbName.startsWith('_') && !dbName.includes('backup')) {
                if (Object.keys(runData).includes(dbName)) {
                    if (runData[dbName].listening === false) {
                        // database returned
                        db = nano.use(dbName);
                        runData[dbName].listening = true;
                        getConfig(dbName);
                    }
                } else {
                    // new database
                    db = nano.use(dbName);
                    runData[dbName] = { listening: true };
                    getConfig(dbName);
                }
            }
        });
    }).catch((err) => {
        // eslint-disable-next-line no-console
        console.log('checkForNewDataBases: An error is detected while loading the database names, ' + JSON.stringify(err, null, 2));
    })
}

function getAllDataBases() {
    nano.db.list().then((body) => {
        body.forEach((dbName) => {
            if (!dbName.startsWith('_') && !dbName.includes('backup')) {
                // eslint-disable-next-line no-console
                console.log('Listening to database = ' + dbName)
                db = nano.use(dbName)
                runData[dbName] = { listening: true }
                getConfig(dbName);
            }
        });
    }).catch((err) => {
        // eslint-disable-next-line no-console
        console.log('getAllDataBases: An error is detected while loading the database names, ' + JSON.stringify(err, null, 2));
    })
}

getAllDataBases();
