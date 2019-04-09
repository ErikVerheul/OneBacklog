<template lang="html">
	<div>
		<h1>EDITOR</h1>
	</div>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'

	import {
		Multipane,
		MultipaneResizer
	} from 'vue-multipane'

	import {
		VueEditor
	} from 'vue2-editor'

	export default {

		computed: {
			...mapGetters([
				//from store.js
				'getUser',
				'getMyRoles',
				'isAuthenticated',
				'isServerAdmin',
				'canWriteLevels',
				'getCurrentDb',
				'getCurrentItemAcceptanceCriteria',
				'getCurrentItemAttachments',
				'getCurrentItemComments',
				'getCurrentItemDescription',
				'getCurrentItemFollowers',
				'getCurrentItemHistory',
				'getCurrentItemId',
				'getCurrentItemPriority',
				'getCurrentItemProductId',
				'getCurrentItemState',
				'getCurrentItemTitle',
				'getCurrentItemType',
				'getCurrentItemReqArea',
				'getCurrentItemSpSize',
				'getCurrentItemSubType',
				'getCurrentItemTeam',
				'getCurrentItemTsSize',
				'getCurrentPersonHours',
				// from load.js
				'getCurrentProductId',
				'getCurrentProductTitle',
				'getEmail',
				'getUserAssignedProductIds',
				'getTeams'
			]),

		},


		components: {
			Multipane,
			MultipaneResizer,
			VueEditor
		}
	}

</script>

<style lang="css" scoped>
</style>
