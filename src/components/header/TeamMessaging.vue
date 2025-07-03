<template>
	<BModal size="xl" v-model="store.state.showGoMessaging" no-footer title="View and send messages">
		<BCard border-variant="primary" :header="getHeaderText()" header-bg-variant="dark" header-text-variant="white" align="center">
			<label for="newMsgId">Message title</label>
			<BFormInput id="newMsgId" v-model="store.state.newMsgTitle" placeholder="Your message must have a title" />
			<p class="mt-3 mb-0">Your message</p>
			<QEditor v-model=store.state.myNewMessage />
			<BButton :disabled="canNotSave" class="mt-3" variant="seablue" @click="saveMessage">{{ getSaveButtonText() }}</BButton>
		</BCard>
		<h2 class="mt-3">Your team messages</h2>
		<Listings :selectedForView="'messages'"></Listings>
	</BModal>
</template>

<script>
	import store from '../../store/store.js'
	import Listings from '../listings/CommonListings.vue'

	const computed = {
		canNotSave: function () {
			return store.state.newMsgTitle.trim() === ''
		},
	}

	const methods = {
		getHeaderText() {
			if (store.state.replaceMessage) return 'Edit your recent message'
			return 'Create a message for your team members'
		},

		getSaveButtonText() {
			if (store.state.replaceMessage) return 'Replace message'
			return 'Send message'
		},

		saveMessage() {
			if (store.state.replaceMessage) {
				store.dispatch('updateMyTeamMessageAction', {
					dbName: store.state.userData.currentDb,
					newTitle: store.state.newMsgTitle,
					newMessage: store.state.myNewMessage,
					timestamp: store.state.replaceMessageTimestamp
				})
			} else {
				store.dispatch('saveMyTeamMessageAction', {
					dbName: store.state.userData.currentDb,
					newTitle: store.state.newMsgTitle,
					newMessage: store.state.myNewMessage,
				})
			}
		},
	}

	const components = {
		Listings,
	}

	export default {
		components,
		computed,
		methods,
	}
</script>
