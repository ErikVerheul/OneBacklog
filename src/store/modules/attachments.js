import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2

const actions = {
    /*
	 * When updating the database, first load the document with the actual revision number and changes by other users.
	 * Then apply the update to the field and write the updated document back to the database.
	 */
    uploadAttachmentAsync({
        rootState,
        dispatch
    }, payload) {
        rootState.uploadDone = false
        function arrayBufferToBase64(buffer) {
            let binary = '';
            let bytes = new Uint8Array(buffer);
            let len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
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
        let read = new FileReader()
        read.readAsArrayBuffer(payload.fileInfo)
        read.onloadend = function () {
            let attachment = read.result
            let title = payload.fileInfo.name
            const newEncodedAttachment = arrayBufferToBase64(attachment)
            globalAxios({
                method: 'GET',
                url: rootState.userData.currentDb + '/' + _id,
            }).then(res => {
                let tmpDoc = res.data
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
                    "uploadAttachmentEvent": [title, payload.fileInfo.size, payload.fileInfo.type],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": payload.timestamp,
                    "sessionId": rootState.userData.sessionId,
                    "distributeEvent": true
                }
                tmpDoc.history.unshift(newHist)
                rootState.currentDoc.history.unshift(newHist)
                dispatch('updateDoc', {
                    dbName: rootState.userData.currentDb, updatedDoc: tmpDoc,
                    onSuccessCallback: function (id, updatedDoc) {
                        rootState.uploadDone = true
                        if (id === rootState.currentDoc._id) {
                            // the user did not select another document while the attachment was uploaded
                            rootState.currentDoc._attachments = updatedDoc._attachments
                        }
                    },
                    caller: 'uploadAttachmentAsync'
                })
            }).catch(error => {
                rootState.uploadDone = true
                let msg = 'uploadAttachmentAsync: Could not read document with _id ' + _id + ', ' + error
                // eslint-disable-next-line no-console
                if (rootState.debug) console.log(msg)
                dispatch('doLog', { event: msg, level: ERROR })
            })
        }
    },

    removeAttachmentAsync({
        rootState,
        dispatch
    }, title) {
        const _id = rootState.currentDoc._id
        globalAxios({
            method: 'GET',
            url: rootState.userData.currentDb + '/' + _id,
        }).then(res => {
            let tmpDoc = res.data
            if (tmpDoc._attachments) {
                const newHist = {
                    "removeAttachmentEvent": [title],
                    "by": rootState.userData.user,
                    "email": rootState.userData.email,
                    "timestamp": Date.now(),
                    "sessionId": rootState.userData.sessionId,
                    "distributeEvent": true
                }
                tmpDoc.history.unshift(newHist)
                tmpDoc._attachments = rootState.currentDoc._attachments

                rootState.currentDoc.history.unshift(newHist)
                dispatch('updateDoc', { dbName: rootState.userData.currentDb, updatedDoc: tmpDoc })
            }
        }).catch(error => {
            let msg = 'removeAttachmentAsync: Could not read document with _id ' + _id + ', ' + error
            // eslint-disable-next-line no-console
            if (rootState.debug) console.log(msg)
            dispatch('doLog', { event: msg, level: ERROR })
        })
    },

}

export default {
    actions
}
