import { SEV } from '../../constants.js'
import globalAxios from 'axios'
// IMPORTANT: all updates on the backlogitem documents must add history in order for the changes feed to work properly (if omitted the previous event will be processed again)
// Save the history, to trigger the distribution to other online users, when all other database updates are done.

const actions = {
  /*
   * When updating the database, first load the document with the actual revision number and changes by other users.
   * Then apply the update to the field and write the updated document back to the database.
   */
  uploadAttachmentAsync({
    rootState,
    commit,
    dispatch
  }, payload) {
    rootState.uploadDone = false
    function arrayBufferToBase64(buffer) {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      const len = bytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return window.btoa(binary)
    }
    function createTitle(attachments) {
      function createNew(name) {
        if (existingTitles.includes(name)) {
          // name exists
          const dotPos = name.lastIndexOf('.')
          if (dotPos !== -1) {
            const body = name.slice(0, dotPos)
            const ext = name.slice(dotPos + 1)
            const bLength = body.length
            const uderscorePos = body.lastIndexOf('_')
            if (uderscorePos > 1) {
              const revisionString = body.slice(uderscorePos + 1, bLength)
              const revisionNumber = parseInt(revisionString)
              if (!isNaN(revisionNumber)) {
                return body.slice(0, uderscorePos + 1) + (revisionNumber + 1) + '.' + ext
              } else return body + '_1' + '.' + ext
            } else return body + '_1' + '.' + ext
          } else return payload.fileInfo.name + '_1'
        } else return payload.fileInfo.name
      }
      const existingTitles = Object.keys(attachments)
      let newTitle = createNew(payload.fileInfo.name)
      while (existingTitles.includes(newTitle)) newTitle = createNew(newTitle)
      return newTitle
    }
    const _id = payload.currentDocId
    const read = new FileReader()
    read.readAsArrayBuffer(payload.fileInfo)
    read.onloadend = function () {
      const attachment = read.result
      let title = payload.fileInfo.name
      const newEncodedAttachment = arrayBufferToBase64(attachment)
      globalAxios({
        method: 'GET',
        url: rootState.userData.currentDb + '/' + _id
      }).then(res => {
        const tmpDoc = res.data
        if (!tmpDoc._attachments) {
          // first attachment
          tmpDoc._attachments = {
            [title]: {
              content_type: payload.fileInfo.type,
              data: newEncodedAttachment
            }
          }
        } else {
          // add more attachments
          title = createTitle(tmpDoc._attachments)
          tmpDoc._attachments[title] = {
            content_type: payload.fileInfo.type,
            data: newEncodedAttachment
          }
        }
        const newHist = {
          uploadAttachmentEvent: [title, payload.fileInfo.size, payload.fileInfo.type],
          by: rootState.userData.user,
          email: rootState.userData.email,
          timestamp: Date.now(),
          sessionId: rootState.mySessionId,
          doNotMessageMyself: rootState.userData.doNotMessageMyself === 'true',
          distributeEvent: true
        }
        tmpDoc.history.unshift(newHist)
        tmpDoc.lastAttachmentAddition = payload.timestamp

        dispatch('updateDoc', {
          dbName: rootState.userData.currentDb,
          updatedDoc: tmpDoc,
          caller: 'uploadAttachmentAsync',
          onSuccessCallback: () => {
            rootState.uploadDone = true
            commit('updateNodesAndCurrentDoc', { node: payload.node, _attachments: tmpDoc._attachments, lastAttachmentAddition: tmpDoc.lastAttachmentAddition, newHist })
          },
          onFailureCallback: () => { rootState.uploadDone = true }
        })
      }).catch(error => {
        rootState.uploadDone = true
        const msg = `uploadAttachmentAsync: Could not read document with _id ${_id}. ${error}`
        dispatch('doLog', { event: msg, level: SEV.ERROR })
      })
    }
  },

  // ToDo: show badge in tree when attachment is recently removed
  removeAttachmentAsync({
    rootState,
    commit,
    dispatch
  }, payload) {
    const node = payload.node
    const id = node._id
    globalAxios({
      method: 'GET',
      url: rootState.userData.currentDb + '/' + id
    }).then(res => {
      const tmpDoc = res.data
      if (tmpDoc._attachments) {
        const newHist = {
          removeAttachmentEvent: [payload.attachmentTitle],
          by: rootState.userData.user,
          email: rootState.userData.email,
          timestamp: Date.now(),
          sessionId: rootState.mySessionId,
          doNotMessageMyself: rootState.userData.doNotMessageMyself === 'true',
          distributeEvent: true
        }
        tmpDoc.history.unshift(newHist)
        tmpDoc.lastAttachmentRemoval = Date.now()

        // curentDoc is already updated
        tmpDoc._attachments = rootState.currentDoc._attachments
        dispatch('updateDoc', {
          dbName: rootState.userData.currentDb,
          updatedDoc: tmpDoc,
          caller: 'removeAttachmentAsync',
          onSuccessCallback: () => {
            commit('updateNodesAndCurrentDoc', { node: payload.node, lastAttachmentAddition: 0, lastAttachmentRemoval: tmpDoc.lastAttachmentRemoval, newHist })
          }
        })
      }
    }).catch(error => {
      const msg = `removeAttachmentAsync: Could not read document with id ${id}. ${error}`
      dispatch('doLog', { event: msg, level: SEV.ERROR })
    })
  }
}

export default {
  actions
}
