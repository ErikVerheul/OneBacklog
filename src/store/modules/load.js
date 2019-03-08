import globalAxios from 'axios'
import router from '../../router' //Here ../router/index is imported
//Bug? Do not put this import in curly braces

const testNodes = [{
	"title": "Database-1",
	"isSelected": false,
	"isExpanded": true,
	"children": [{
			"title": "Product-1",
			"isExpanded": true,
			"children": [{
					"title": "Epic-A",
					"children": [{
						"title": "Feature-A1",
						"children": [{
								"title": "PBI-A1-1",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-A1-2",
								"children": [],
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": false
											},
							{
								"title": "PBI-A1-3",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-A1-4",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false,
						"isExpanded": true
									}],
					"isSelected": false
								},
				{
					"title": "Epic-B",
					"isExpanded": true,
					"isSelected": false,
					"children": [{
						"title": "Feature-B1",
						"children": [{
								"title": "PBI-B1-1",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-2",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-3",
								"children": [],
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": true
											},
							{
								"title": "PBI-B1-4",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-B1-5",
								"children": [],
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false
									}]
								}
							],
			"isSelected": false
						},
		{
			"title": "Product-2",
			"isExpanded": true,
			"children": [{
					"title": "Epic-C",
					"children": [{
						"title": "Feature-C1",
						"children": [{
								"title": "PBI-C1-1",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-C1-2",
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": false
											},
							{
								"title": "PBI-C1-3",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-C1-4",
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false,
						"isExpanded": true
									}],
					"isSelected": false
								},
				{
					"title": "Epic-D",
					"isExpanded": true,
					"isSelected": false,
					"children": [{
						"title": "Feature-D1",
						"children": [{
								"title": "PBI-D1-1",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-2",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-3",
								"isLeaf": true,
								"data": {
									"visible": true
								},
								"isSelected": true
											},
							{
								"title": "PBI-D1-4",
								"isLeaf": true,
								"isSelected": false
											},
							{
								"title": "PBI-D1-5",
								"isLeaf": true,
								"isSelected": false
											}
										],
						"isSelected": false
									}]
								}
							],
			"isSelected": false
						},
					]
				}, ]
const initNodes = [{
	"title": "Database-1",
	"isSelected": false,
	"isExpanded": true,
	"children": []
},]

const state = {
	databases: [],
	currentDb: null,
	batchSize: 3,
	offset: 0,
	batch: [],
	nodes: initNodes
}

const getters = {
	getCurrendDb(state) {
		return state.currentDb
	},
}

const mutations = {
	processBatch: (state) => {
		for (let i = 0; i < state.batch.length; i++) {
			// eslint-disable-next-line no-console
			console.log('processBatch # : type:priority = ' + i + ' : ' + state.batch[i].doc.type + ':' + state.batch[i].doc.priority + ' title = ' + state.batch[i].doc.title)
		}
	}
}

const actions = {
	// Load the config file from this database
	getConfig({
		state,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/config',
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.config = res.data
					// eslint-disable-next-line no-console
					console.log('The configuration is loaded')
					dispatch('getFirstDocsBatch')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Config doc missing in database ' + state.currentDb + '. Error = ' + error))
	},

	// Get the current DB name etc. for this user. Note that the user roles are already fetched
	getOtherUserData({
		rootState,
		state,
		dispatch
	}) {
		this.commit('clearAll')
		globalAxios({
				method: 'GET',
				url: '_users/org.couchdb.user:' + rootState.user,
				withCredentials: true
			}).then(res => {
				// eslint-disable-next-line no-console
				console.log(res)
				// eslint-disable-next-line no-console
				console.log('getOtherUserData called for user = ' + rootState.user)
				state.email = res.data.email
				state.databases = res.data.databases
				state.currentDb = res.data.currentDb
				console.log('getOtherUserData Update database title to = ', res.data.currentDb)
				state.nodes[0]["title"] = res.data.currentDb
				// eslint-disable-next-line no-console
				console.log('getOtherUserData: database ' + state.currentDb + ' is set for user ' + rootState.user)
				dispatch('getConfig')
			})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.log('getOtherUserData error= ', error)
			})
	},

	// Load next #batchSize documents from this database skipping #offset
	getNextDocsBatch({
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + state.batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.batch = res.data.rows
					commit('processBatch')
					if (state.batch.length == state.batchSize) {
						state.offset += state.batchSize
						// recurse until all read
						dispatch('getNextDocsBatch')
						// eslint-disable-next-line no-console
						console.log('Another batch of ' + state.batch.length + ' documents is loaded')
					}
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read a batch of documents ' + state.currentDb + '. Error = ' + error))
	},

	// Load #batchSize documents from this database skipping #offset
	getFirstDocsBatch({
		state,
		commit,
		dispatch
	}) {
		globalAxios({
				method: 'GET',
				url: state.currentDb + '/_design/design1/_view/sortedFilter?include_docs=true&limit=' + state.batchSize + '&skip=' + state.offset,
				withCredentials: true,
			}).then(res => {
				if (res.status == 200) {
					// eslint-disable-next-line no-console
					console.log(res)
					state.batch = res.data.rows
					commit('processBatch')
					if (state.batch.length == state.batchSize) {
						state.offset += state.batchSize
						dispatch('getNextDocsBatch')
					}
					// eslint-disable-next-line no-console
					console.log('A first batch of ' + state.batch.length + ' documents is loaded. Move to the product page')
					router.push('/product')
				}
			})
			// eslint-disable-next-line no-console
			.catch(error => console.log('Could not read a batch of documents from database ' + state.currentDb + '. Error = ' + error))
	},

}

export default {
	state,
	getters,
	mutations,
	actions
}
