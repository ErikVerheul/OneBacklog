import globalAxios from 'axios'
// IMPORTANT: all updates on the baclogitem documents must add history in order for the changes feed to work properly

const ERROR = 2
let text2004 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras placerat ut mauris quis porttitor. Nulla scelerisque turpis vel ultrices suscipit. Integer hendrerit neque vitae nisi tempor tincidunt. Aenean sit amet est vel mauris maximus semper ac ut risus. Quisque non molestie leo. Curabitur at aliquet dolor, id imperdiet enim. Fusce vehicula, ipsum a ultricies sollicitudin, metus nisl consectetur risus, non aliquam metus magna et massa. In maximus placerat scelerisque. Etiam interdum ante a imperdiet pulvinar. Suspendisse potenti. Nam bibendum egestas purus, id rhoncus felis ullamcorper a. Donec aliquam ante ut tincidunt pulvinar. Donec tincidunt eros felis, ut consequat nibh suscipit ut. Cras lectus sem, interdum non arcu ut, auctor congue justo. Proin lobortis purus vitae nunc condimentum imperdiet. Cras in dolor mauris. Nulla facilisi. In sollicitudin libero ac dui suscipit, at tincidunt elit accumsan. Suspendisse ac bibendum ligula. Donec varius nulla eu tortor dignissim ultrices sit amet quis enim. In laoreet consequat nibh, in vehicula arcu dictum eget. In ac pretium nulla. Phasellus interdum pulvinar odio, nec porta nulla maximus a. Vestibulum condimentum congue lectus in semper. Proin efficitur scelerisque ante sed iaculis. Suspendisse elementum lorem vitae lorem consectetur, id convallis ligula scelerisque. Nam non mattis risus. Integer dapibus pulvinar laoreet. Sed facilisis dui vitae quam dictum, sit amet semper tortor malesuada. Quisque at risus eu velit luctus vestibulum. Sed id luctus turpis, sed lobortis tellus. Curabitur semper id urna sed congue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Curabitur vitae purus ex. Fusce tellus metus, viverra blandit ipsum in, aliquam facilisis dui. Quisque venenatis tempus eros, quis interdum nisi suscipit malesuada. Aliquam id ipsum commodo, ornare lorem in, sodales leo. Fusce ac pellentesque nisi. Pellentesque condimentum a tortor in sodales. Nulla scelerisque orci nullam."

// create a sequential id starting with the time past since 1/1/1970 in miliseconds + a 5 digit alphanumerical random value
function newId() {
	return Date.now().toString() + Math.random().toString(36).replace('0.', '').substr(0, 5)
}

// Calculate the priority with lower idx highest
function calcPrio(idx, n) {
	let step = Math.floor(Number.MAX_SAFE_INTEGER / (n + 1)) * 2
	return Number.MAX_SAFE_INTEGER - (idx + 1) * step
}

const state = {
	message: '',
	comment: '',
	errorMessage: ''
}

const getters = {
	returnMessage(state) {
		return state.message
	},
	returnComment(state) {
		return state.comment
	},
	returnErrorMsg(state) {
		return state.errorMessage
	}
}

const mutations = {
	clearAll: state => {
		state.message = ''
		state.comment = ''
		state.errorMessage = ''
	},
}

const actions = {
	showCreds({
		state
	}) {
		this.commit('clearAll')
		globalAxios({
			method: 'GET',
			url: '/_session',
		}).then(res => {
			// eslint-disable-next-line no-console
			console.log(res)
			state.message = res.data
		})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			})
	},

	// Create new product
	createNewProduct({
		rootState,
		dispatch
	}, payload) {
		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": _id.slice(-5),
			"type": "backlogItem",
			"productId": _id,
			"parentId": 'root',
			"team": "not assigned yet",
			"level": 2,
			"subtype": 0,
			"state": 2,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": payload.productName,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": 0,
			"attachments": [],
			"comments": [{
				"ignoreEvent": ['comments initiated'],
				"timestamp": 0,
				"distributeEvent": false
			}],
			"history": [{
				"ignoreEvent": [2, rootState.userData.currentDb],
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewProduct: Product document with _id ' + _id + ' is created.')
			// note that a curious fix was needed to get correct priority numbers: Math.floor(payload.epics) instead of payload.epics
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				features: payload.features,
				userStories: payload.userStories,
				counter1: 0,
				epicsNumber: Math.floor(payload.epics)
			}
			dispatch('createNewEpics', newPayload)
		})
			.catch(error => {
				let msg = 'createNewProduct: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			})
	},

	createNewEpics({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter1 >= payload.epicsNumber) return
		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": _id.slice(-5),
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 3,
			"subtype": 0,
			"state": 2,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created epic " + payload.counter1,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter1, payload.epicsNumber),
			"attachments": [],
			"comments": [{
				"ignoreEvent": ['comments initiated'],
				"timestamp": 0,
				"distributeEvent": false
			}],
			"history": [{
				"ignoreEvent": [3, payload.parentName],
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewEpics: Epic document with _id ' + _id + ' is created. Counter1 = ' + payload.counter1)
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				userStories: payload.userStories,
				counter2: 0,
				featuresNumber: Math.floor(Math.random() * payload.features * 2) + 1
			}
			dispatch('createNewFeatures', newPayload)
			// recurse, execute sequentially
			payload.counter1++
			dispatch('createNewEpics', payload)
		})
			.catch(error => {
				let msg = 'createNewEpics: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			})
	},

	createNewFeatures({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter2 >= payload.featuresNumber) return

		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": _id.slice(-5),
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 4,
			"subtype": 0,
			"state": 2,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created feature " + payload.counter2,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter2, payload.featuresNumber),
			"attachments": [],
			"comments": [{
				"ignoreEvent": ['comments initiated'],
				"timestamp": 0,
				"distributeEvent": false
			}],
			"history": [{
				"ignoreEvent": [4, payload.parentName],
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewFeatures: document with _id ' + _id + ' is created. Counter2 = ' + payload.counter2)
			let newPayload = {
				productId: newDoc.productId,
				parentId: newDoc._id,
				parentName: newDoc.title,
				counter3: 0,
				storiesNumber: Math.floor(Math.random() * payload.userStories * 2) + 1
			}
			dispatch('createNewStories', newPayload)
			// recurse, execute sequentially
			payload.counter2++
			dispatch('createNewFeatures', payload)
		})
			.catch(error => {
				let msg = 'createNewFeatures: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			})
	},

	createNewStories({
		rootState,
		dispatch
	}, payload) {
		if (payload.counter3 >= payload.storiesNumber) return

		const _id = newId()
		// create a new document and store it
		const newDoc = {
			"_id": _id,
			"shortId": _id.slice(-5),
			"type": "backlogItem",
			"productId": payload.productId,
			"parentId": payload.parentId,
			"team": "not assigned yet",
			"level": 5,
			"subtype": 0,
			"state": 2,
			"tssize": 0,
			"spsize": 0,
			"spikepersonhours": 0,
			"reqarea": "15521397677068926",
			"title": "Random created user story " + payload.counter3,
			"followers": [],
			"description": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"acceptanceCriteria": window.btoa("<p>" + text2004.substring(0, Math.floor(Math.random() * 1984 + 20)) + "</p>"),
			"priority": calcPrio(payload.counter3, payload.storiesNumber),
			"attachments": [],
			"comments": [{
				"ignoreEvent": ['comments initiated'],
				"timestamp": 0,
				"distributeEvent": false
			}],
			"history": [{
				"ignoreEvent": [5, payload.parentName],
				"timestamp": Date.now(),
				"distributeEvent": false
			}],
			"delmark": false
		}

		globalAxios({
			method: 'PUT',
			url: rootState.userData.currentDb + '/' + _id,
			data: newDoc
		}).then(() => {
			// eslint-disable-next-line no-console
			if (rootState.debug) console.log('createNewStories: document with _id ' + _id + ' is created. Counter3 = ' + payload.counter3)
			// recurse, execute sequentially
			payload.counter3++
			dispatch('createNewStories', payload)
		})
			.catch(error => {
				let msg = 'createNewStories: Could not write document with url ' + rootState.userData.currentDb + '/' + _id + ', ' + error
				// eslint-disable-next-line no-console
				if (rootState.debug) console.log(msg)
				dispatch('doLog', { event: msg, level: ERROR })
			})
	},

	creRdmProduct({
		rootState,
		state,
		dispatch
	}, payload) {
		this.commit('clearAll')
		if (rootState.userData.currentDb) {
			state.message = 'Creating product ' + payload.productName + ' in database ' + rootState.userData.currentDb
		} else {
			state.message = 'Please select or create the database first'
			return
		}
		// create product
		dispatch('createNewProduct', payload)
	},

	showDBsec({
		state
	}, payload) {
		this.commit('clearAll')
		globalAxios({
			method: 'GET',
			url: payload.dbName + '/_security',
		}).then(res => {
			state.message = res.data
			// eslint-disable-next-line no-console
			console.log(res.data)
			//if no permissions are set CouchDB returns an empty object
			if (Object.keys(res.data).length === 0) {
				state.message = "If no permissions are set CouchDB returns an empty object"
			}
		})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log(error)
				state.message = error.response.data
				state.errorMessage = error.message
			})
	},

}

export default {
	state,
	getters,
	mutations,
	actions
}
