'use strict'
import Dotenv from 'dotenv'
new Dotenv.config()
import Nano from 'nano'
const nano = new Nano('http://' + process.env.COUCH_USER + ':' + process.env.COUCH_PW + '@localhost:5984')
import Mailgun from 'mailgun-js'
const mailgun = new Mailgun({ apiKey: process.env.API_KEY, domain: process.env.DOMAIN, host: 'api.eu.mailgun.net' })
const PBILEVEL = 5
const TASKLEVEL = 6
var db
var configData = {}
var runData = {}

/* The "Unicode Problem" See https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
Since btoa interprets the code points of its input string as byte values, 
calling btoa on a string will cause a "Character Out Of Range" exception if a character's code point exceeds 0xff. 
For use cases where you need to encode arbitrary Unicode text, 
it is necessary to first convert the string to its constituent bytes in UTF-8, and then encode the bytes.*/

function base64ToBytes(base64) {
  const binString = atob(base64)
  return Uint8Array.from(binString, (m) => m.codePointAt(0))
}

// convert base64 encoded ascii to unicode string
function b64ToUni(bytes) {
  return new TextDecoder().decode(base64ToBytes(bytes))
}

function replaceEmpty(text) {
  if (text === '' || text === '<p></p>' || text === '<p><br></p>') return 'EMPTY TEXT'
  return text
}

function getSubTypeText(dbName, idx) {
  if (idx < 0 || idx >= configData[dbName].subtype.length) {
    return 'Error: unknown subtype'
  }
  return configData[dbName].subtype[idx]
}

function getLevelText(dbName, level, subtype) {
  if (level < 0 || level > TASKLEVEL) return `Level not supported`

  if (subtype && level === PBILEVEL) {
    return getSubTypeText(dbName, subtype)
  } else return configData[dbName].itemType[level]
}

function getItemStateText(dbName, idx) {
  if (idx < 0 || idx > TASKLEVEL) {
    return `Error: unknown state`
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
    return `<p>User '${event.by}' made a change in the ${getLevelText(dbName, doc.level, doc.subtype)} with title:</p>
            <h3>'${doc.title}'</h3>`
  }
  function mkFooter() {
    return `<p>This mutation occurred in database ${dbName} and document with short id ${doc._id.slice(-5)}</p>`
  }
  function createEmail(content) {
    return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Responsive Email Template</title>
				<style>
					@media screen and (max-width: 600px) {
						.content {
								width: 100% !important;
								display: block !important;
								padding: 10px !important;
						}
						.header, .body, .footer {
								padding: 20px !important;
						}
					}
				</style>
		</head>
		<body style="font-family: 'Poppins', Arial, sans-serif">
				<table width="100%" border="0" cellspacing="0" cellpadding="0">
						<tr>
								<td align="center" style="padding: 20px;">
										<table class="content" width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 2px solid #cccccc;">
												<tr>
														<td class="header" style="background-color: #408fae; padding: 20px; text-align: center; color: white; font-size: 24px;">
														${mkHeader()}
														</td>
												</tr>
												<tr>
														<td class="body" style="padding: 20px; text-align: left; font-size: 16px; line-height: 1.6;">
																${content}            
														</td>
												</tr>
												<tr>
														<td class="footer" style="background-color: #333333; padding: 20px; text-align: center; color: white; font-size: 14px;">
														${mkFooter()} 
														</td>
												</tr>
										</table>
								</td>
						</tr>
				</table>
		</body>
		</html>`
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
    case 'acceptanceEvent':
      return createEmail(
        `<h3>The acceptance criteria changed from:</h3><p>${replaceEmpty(b64ToUni(value[0]))}</p> to <p>${replaceEmpty(b64ToUni(value[1]))}</p>`,
      )
    case 'newCommentEvent':
      return createEmail(`<h3>The user created a comment to this ${getLevelText(dbName, doc.level, doc.subtype)}</h3>
			<h3>Select the ${getLevelText(dbName, doc.level, doc.subtype)} with short id ${doc._id.slice(-5)} to see the conversation</h3>`)
    case 'addSprintIdsEvent': {
      let txt = `This ${getLevelText(dbName, value[0], value[1])} is assigned to sprint '${value[2]}'.`
      if (value[3]) txt += ` The item was assigned to a sprint before.`
      return createEmail(`<h3>${txt}</h3>`)
    }
    case 'createItemEvent':
      return createEmail(`<h3>This ${getLevelText(dbName, value[0])} was created under parent '${value[1]}' at position ${value[2]}</h3>`)
    case 'createTaskEvent':
      return createEmail(`<h3>This task was created under parent '${value[0]}'</h3>`)
    case 'copyItemEvent':
      return createEmail(`<h3>This ${getLevelText(dbName, value[0], value[1])} has been copied as item of product '${value[2]}'</h3>`)
    case 'conditionRemovedEvent': {
      let s
      if (value[1]) {
        s = `The condition for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`
      } else if (value[0].length === 1) {
        s = `The condition for item ${convertToShortIds(value[0])} (short Id) is removed from this item.`
      } else s = `The conditions for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
      return createEmail(`<h3>${s}</h3>`)
    }
    case 'dependencyRemovedEvent': {
      let s
      if (value[1]) {
        s = `The dependency for item ${convertToShortIds(value[0])} (short Id) and title '${value[1]}' is removed from this item.`
      } else if (value[0].length === 1) {
        s = `The dependency for item ${convertToShortIds(value[0])} (short Id) is removed from this item.`
      } else s = `The dependencies for items ${convertToShortIds(value[0])} (short Ids) were removed from this item.`
      return createEmail(`<h3>${s}</h3>`)
    }
    case 'descriptionEvent':
      return createEmail(`<h3>The description changed from:</h3><p>${replaceEmpty(b64ToUni(value[0]))}</p> to <p>${replaceEmpty(b64ToUni(value[1]))}</p>`)
    case 'undoBranchRemovalEvent':
      return createEmail(
        `<h3>The ${getLevelText(dbName, value[9], value[10])} with title '${value[11]}' and ${value[1]} descendants are restored from removal</h3>`,
      )
    case 'newChildEvent':
      return createEmail(`<h3>A ${getLevelText(dbName, value[0], 0)} was created as a child of this item at position ${value[1]}</h3>`)
    case 'nodeMovedEvent': {
      const moveType = value[13] === 'undoMove' ? ' back' : ''
      let txt
      if (value[7] !== value[8]) {
        txt = `<h5>The item was moved${moveType} from parent '${value[5]}', position ${value[9] + 1}</h5>`
      } else txt = ''
      if (value[0] === value[1]) {
        txt += `<h5>The item changed priority to position ${value[2] + 1} under parent '${value[3]}'</h5>`
        txt += value[4] > 0 ? `<p>${value[4]} children were also moved</p>` : ''
        return createEmail(txt)
      } else {
        txt += `<h5>The item changed level from ${getLevelText(dbName, value[0])} to ${getLevelText(dbName, value[1])}</h5>`
        txt += `<p>The new position is ${value[2] + 1} under parent '${value[3]}'</p>`
        txt += value[4] > 0 ? `<p>${value[4]} children also changed level</p>` : ''
        return createEmail(txt)
      }
    }
    case 'removeAttachmentEvent':
      return createEmail(`<h3>Attachment with title '${value[0]}' is removed from this item</h3>`)
    case 'removeSprintIdsEvent':
      return createEmail(`<h3>This ${getLevelText(dbName, value[0], value[1])} is removed from sprint '${value[2]}</h3>`)
    case 'removedWithDescendantsEvent':
      return createEmail(`<h3>This item and ${value[1] - 1} descendants are removed</h3>
          <p>From the descendants ${value[2]} external dependencies and ${value[3]} external conditions were removed</p>`)
    case 'removeStoryEvent':
      return createEmail(`<h3>This ${getLevelText(dbName, value[0], value[1])} is removed from sprint '${value[2]}</h3>`)
    case 'commentAmendedEvent':
      return createEmail(`<h3>The user changed his comment to this ${getLevelText(dbName, doc.level, doc.subtype)} he/she created at ${new Date(value[1]).toString()}</h3>
			<h3>Select the ${getLevelText(dbName, doc.level, doc.subtype)} with short id ${doc._id.slice(-5)} to see the conversation</h3>`)
    case 'setConditionEvent':
      if (value[2]) return createEmail(`<h3>The previous condition set for item '${value[1]} is undone'</h3>`)
      return createEmail(`<h3>This item is set to be conditional for item '${value[1]}'</h3>`)
    case 'setDependencyEvent':
      if (value[2]) return createEmail(`<h3>The previous dependency set on item '${value[1]} is undone'</h3>`)
      return createEmail(`<h3>This item is set to be dependent on item '${value[1]}'</h3>`)
    case 'setHrsEvent':
      return createEmail(`<h3>The maximum effort changed from ${value[0]} to ${value[1]} hours</h3>`)
    case 'setPointsEvent':
      return createEmail(`<h3>The item size changed from ${value[0]} to ${value[1]} story points</h3>`)
    case 'setSizeEvent':
      return createEmail(`<h3>The item T-shirt size changed from ${getTsSize(dbName, value[0])} to ${getTsSize(dbName, value[1])}</h3>`)
    case 'setStateEvent':
      return createEmail(
        `<h3>The item state changed from ${getItemStateText(dbName, value[0])} to ${getItemStateText(dbName, value[1])}</h3>` +
          `<p>This backlog item is realized by team '${value[2]}'</p>`,
      )
    case 'setSubTypeEvent':
      return createEmail(`<h3>The item subtype changed from '${getSubTypeText(dbName, value[0])}' to '${getSubTypeText(dbName, value[1])}'</h3>`)
    case 'setTeamOwnerEvent':
      return createEmail(
        `<h3>The owning team changed from '${value[0]}' to '${value[1]}'</h3>` +
          cText(value[2] > 0, `<h3>Also ${value[2]} descendants of this item are assigned to this team</h3>`),
      )
    case 'setTitleEvent':
      return createEmail(`<h3>The item title changed from: </h3><h3>'${value[0]}' to <br>'${value[1]}'</h3>`)
    case 'taskRemovedEvent':
      return createEmail(`<h3>Task '${value[0]}' is removed by team '${value[1]}'</h3>`)
    case 'uploadAttachmentEvent':
      return createEmail(`<h3>Attachment with title '${value[0]}' of type '${value[2]}' and size ${value[1]} bytes is uploaded</h3>`)
    case 'updateTaskOwnerEvent':
      return createEmail(`<h3>Task owner is changed from '${value[0]}' to '${value[1]}`)
    default:
      return 'unknown event type'
  }
}

function listenForChanges(dbName) {
  nano.db
    .changes(dbName, { feed: 'longpoll', include_docs: true, filter: 'filters/email_filter', since: 'now' })
    .then((body) => {
      // console.log('body = ' + JSON.stringify(body, null, 2))
      const results = body.results
      for (let r of results) {
        let doc = r.doc
        const event = doc.history[0]
        const eventName = Object.keys(event)[0]
        console.log('listenForChanges: process doc with _id: ' + doc._id + ' for event: ' + eventName)
        if (event.email && doc.followers) {
          // process new event in history; comment additions and changes are also registered in history. However, the content is not.
          for (let fObj of doc.followers) {
            if (event.doNotMessageMyself && fObj.user === event.by) continue

            const data = {
              from: 'no-reply@onebacklog.net',
              to: fObj.email,
              subject: 'Event ' + eventName + ' occurred',
              html: mkHtml(dbName, eventName, event[eventName], event, doc),
            }
            mailgun.messages().send(data, (error, body) => {
              console.log(body)
            })
          }
        }
      }
      console.log('listenForChanges: listening to database ' + dbName)
      listenForChanges(dbName)
    })
    .catch((err) => {
      if (err.code === 'ESOCKETTIMEDOUT') {
        listenForChanges(dbName)
      } else if (err.statusCode === 404) {
        console.log('listenForChanges: The database ' + dbName + ' cannot be reached. Stop listening')
        runData[dbName].listening = false
      } else {
        console.log('listenForChanges: An error is detected while processing messages in database ' + dbName + ' :' + JSON.stringify(err, null, 2))
        runData[dbName].listening = false
      }
    })
}

function getConfig(dbName) {
  db.get('config')
    .then((body) => {
      configData[dbName] = body
      listenForChanges(dbName)
    })
    .catch((err) => {
      console.log('An error is detected while loading the configuration of database ' + dbName + ', ' + JSON.stringify(err, null, 2))
    })
}

/* Check every minute */
function checkForNewDataBases() {
  setInterval(() => {
    console.log('checkForNewDataBases: check for new databases coming available')
    nano.db
      .list()
      .then((body) => {
        body.forEach((dbName) => {
          if (!dbName.startsWith('_') && !dbName.includes('backup')) {
            console.log('checkForNewDataBases: dbName = ' + dbName)
            if (Object.keys(runData).includes(dbName)) {
              if (runData[dbName].listening === false) {
                // database returned from being absent
                db = nano.use(dbName)
                runData[dbName].listening = true
                getConfig(dbName)
                console.log(`checkForNewDataBases: restart listening to database ${dbName}`)
              }
            } else {
              // new database
              db = nano.use(dbName)
              runData[dbName] = { listening: true }
              getConfig(dbName)
              console.log(`checkForNewDataBases: start listening to newly detected database ${dbName}`)
            }
          }
        })
      })
      .catch((err) => {
        console.log('checkForNewDataBases: An error is detected while loading the database names, ' + JSON.stringify(err, null, 2))
      })
  }, 60000)
}

function getAllDataBases() {
  nano.db
    .list()
    .then((body) => {
      body.forEach((dbName) => {
        if (!dbName.startsWith('_') && !dbName.includes('backup')) {
          console.log('Load config data from database = ' + dbName)
          db = nano.use(dbName)
          runData[dbName] = { listening: true }
          getConfig(dbName)
        }
      })
      // check for changes in available databases in its own thread
      checkForNewDataBases()
    })
    .catch((err) => {
      console.log('getAllDataBases: An error is detected while loading the database names, ' + JSON.stringify(err, null, 2))
    })
}

getAllDataBases()
