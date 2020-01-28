'use strict';
require('dotenv').config();
const NodeCouchDb = require('node-couchdb');
const atob = require('atob');
const couch = new NodeCouchDb({ auth: { user: process.env.COUCH_USER, pass: process.env.COUCH_PW } });
const viewUrlLongpol = '/_changes?feed=longpoll&include_docs=true&filter=_view&view=design1/emailFilter&since=now';
const mailgun = require('mailgun-js')({ apiKey: process.env.API_KEY, domain: process.env.DOMAIN, host: 'api.eu.mailgun.net' });
const PBILEVEL = 5;

var configData = {};

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
        case "cloneEvent":
            return mkHeader() + `<h3>This ${this.getLevelText(value[0], value[1])} has been cloned as item of product '${value[2]}'.</h3>` + mkFooter()
        case "commentToHistoryEvent":
            return mkHeader() + `<h3>The user added comment:</h3><p>${atob(value[0])}</p><h3>to the history of this item</h3>` + mkFooter()
        case "conditionRemovedEvent":
            return mkHeader() + `<h3>The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.</h3>` + mkFooter()
        case "dependencyRemovedEvent":
            return mkHeader() + `<h3>The dependencies on items ${convertToShortIds(value[0])} (short Ids) were removed from this item.</h3>` + mkFooter()
        case "descriptionEvent":
            return mkHeader() + `<h3>The description changed from:</h3><p>${atob(value[0])}</p> to <p>${atob(value[1])}</p>` + mkFooter()
        case "docRestoredEvent":
            return mkHeader() + `<h3>This item and ${value[0]} descendants are restored from removal</h3>` + mkFooter()
        case "nodeDroppedEvent":
            return mkHeader() + cText(value[7] === value[8], `<h3>The item changed priority from position ${value[9] + 1} to ${value[2] + 1} ${value[6]} item<br>'${value[3]}'</h3>`) +
                cText(value[7] !== value[8], `<h3>The item is moved to the new parent<br>'${value[3]}' at position ${value[2] + 1}</h3>`) +
                cText(value[4] > 0, `<h3>Also ${value[4]} descendants of this item are moved</h3>`) + mkFooter()
        case "nodeUndoMoveEvent":
            return mkHeader() + `<h3>The previous move by the user is undone</h3>` + mkFooter()
        case "removeAttachmentEvent":
            return mkHeader() + `<h3>Attachment with title '${value[0]}' is removed from this item</h3>` + mkFooter()
        case "removedFromParentEvent":
            return mkHeader() + `<h3>${getLevelText(dbName, value[0], value[3])} with title: '${value[1]}' and ${value[2]} descendants are removed from this parent</h3>
            <p>From the descendants ${value[4]} external dependencies and ${value[5]} external conditions were removed.</p>` + mkFooter()
        case "setConditionsEvent":
            return mkHeader() + `<h3>Conditions on this item set for ${convertToShortIds(value[0])} are now set for ${convertToShortIds(value[1])} (short Ids)</h3>` + mkFooter()
        case "setDependenciesEvent":
            return mkHeader() + `<h3>Dependencies set for this item changed from ${convertToShortIds(value[0])} to ${convertToShortIds(value[1])} (short Ids)</h3>` + mkFooter()
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
    couch.get(dbName, viewUrlLongpol).then(
        function (res, headers, status) {
            const interestingHistoryEvents = ["acceptanceEvent", "addCommentEvent", "cloneEvent", "commentToHistoryEvent", "conditionRemovedEvent", "dependencyRemovedEvent", "descriptionEvent", "docRestoredEvent",
                "nodeDroppedEvent", "nodeUndoMoveEvent", "removeAttachmentEvent", "removedFromParentEvent", "setConditionsEvent", "setDependenciesEvent", "setHrsEvent",
                "setPointsEvent", "setSizeEvent", "setStateEvent", "setSubTypeEvent", "setTeamOwnerEvent", "setTitleEvent", "uploadAttachmentEvent"];

            const results = res.data.results;
            for (let r of results) {
                let doc = r.doc;

                // if (doc.comments[0].timestamp > doc.history[0].timestamp) {
                //     console.log('listenForChanges: comment event received = ' + Object.keys(doc.comments[0])[0])
                // } else console.log('listenForChanges: history event received = ' + Object.keys(doc.history[0])[0])

                if (doc.followers) {
                    if (doc.comments[0].timestamp > doc.history[0].timestamp) {
                        // process new comment
                        for (let f of doc.followers) {
                            const event = doc.comments[0];
                            const eventType = Object.keys(event)[0];
                            const data = { from: 'no-reply@onebacklog.net', to: f, subject: 'Event ' + eventType + ' occurred', html: mkHtml(dbName, eventType, event[eventType], event, doc) }
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
                                const data = { from: 'no-reply@onebacklog.net', to: f, subject: 'Event ' + eventType + ' occurred', html: mkHtml(dbName, eventType, event[eventType], event, doc) }
                                mailgun.messages().send(data, (error, body) => {
                                    // eslint-disable-next-line no-console
                                    console.log(body);
                                });
                            }
                        }
                    }
                }
            }
            listenForChanges(dbName);
        },

        function (err) {
            if (err.code === "ESOCKETTIMEDOUT") { listenForChanges(dbName) } else
                // eslint-disable-next-line no-console
                console.log('An error is detected: ' + JSON.stringify(err, null, 2));
        });
}

function getConfig(dbName) {
    couch.get(dbName, "/config").then(
        function (res) {
            configData[dbName] = res.data
            listenForChanges(dbName)
        },
        function (err) {
            // eslint-disable-next-line no-console
            console.log('An error is detected while loading the configuration of database ' + dbName + ', ' + JSON.stringify(err, null, 2));
        })
}

function getAllDataBases() {
    couch.get('', '/_all_dbs').then(
        function (res) {
            for (let dbName of res.data) {
                if (!dbName.startsWith('_') && !dbName.includes('backup')) {
                    // eslint-disable-next-line no-console
                    console.log('Listening to database = ' + dbName)
                    getConfig(dbName);
                }
            }
        },
        function (err) {
            // eslint-disable-next-line no-console
            console.log('An error is detected while loading the database names, ' + JSON.stringify(err, null, 2));
        })
}

getAllDataBases();
