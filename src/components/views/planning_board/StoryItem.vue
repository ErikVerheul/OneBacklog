<template>
	<div class="story-column-item" @contextmenu.prevent="showContextMenu = !showContextMenu">
		<div>
			<i class="colorYellow" v-if="story.subType === 0">
				<font-awesome-icon icon="folder" />
			</i>
			<i class="lightBlue" v-if="story.subType === 1">
				<font-awesome-icon icon="hourglass-start" />
			</i>
			<i class="colorRed" v-if="story.subType === 2">
				<font-awesome-icon icon="bug" />
			</i>
			{{ story.title }}
			<p v-if="story.subType !== 1">size = {{ story.size }}</p>
			<p v-else>hours = {{ story.spikePersonHours }}</p>
			<p class="small-text">
				Feature: {{ story.featureName }}
			</p>
		</div>
	</div>
	<BModal v-model="showContextMenu" size="sm" :ok-disabled="disableOkButton" @ok="procSelected" @cancel="doCancel" title="User story menu">
		<BListGroup>
			<BListGroupItem button :active="contextOptionSelected === ID_TO_CLIPBOARD" variant="dark" @click="prepSelected(ID_TO_CLIPBOARD)">Copy short id to
				clipboard</BListGroupItem>
			<template v-if="onLargeScreen">
				<BListGroupItem button :active="contextOptionSelected === VIEW_STORY_IN_TREE" variant="dark" @click="prepSelected(VIEW_STORY_IN_TREE)">View this {{
					storyType }} in the tree backlog view</BListGroupItem>
			</template>
			<BListGroupItem button :active="contextOptionSelected === REMOVE_STORY" variant="danger" @click="prepSelected(REMOVE_STORY)">Remove this {{ storyType }}
				from the sprint</BListGroupItem>
		</BListGroup>
	</BModal>
</template>

<script>
	import router from '../../../router'
	import { LEVEL } from '../../../constants.js'
	import { authorization, utilities } from '../../mixins/GenericMixin.js'
	import store from '../../../store/store.js'

	export default {
		mixins: [authorization, utilities],
		name: 'StoryItem',
		props: ['productId', 'story'],

		created() {
			this.ID_TO_CLIPBOARD = 0
			this.VIEW_STORY_IN_TREE = 1
			this.REMOVE_STORY = 2
		},

		computed: {
			storyType() {
				switch (this.story.subType) {
					case 0:
						return 'User story'
					case 1:
						return 'Spike'
					case 2:
						return 'Defect'
					default:
						return 'Unknown subtype'
				}
			}
		},

		data() {
			return {
				onLargeScreen: store.state.onLargeScreen,
				debugMode: store.state.debug,
				showContextMenu: false,
				contextOptionSelected: undefined,
				disableOkButton: true
			}
		},

		methods: {
			prepSelected(idx) {
				this.contextOptionSelected = idx
				this.disableOkButton = false
				switch (this.contextOptionSelected) {
					case this.ID_TO_CLIPBOARD:
					case this.REMOVE_STORY:
					case this.VIEW_STORY_IN_TREE:
						break
					default:
						this.assistanceText = 'No assistance available'
						this.listItemText = 'nothing selected as yet'
				}
			},

			procSelected() {
				if (this.haveWritePermission(this.productId, LEVEL.TASK)) {
					this.showAssistance = false
					switch (this.contextOptionSelected) {
						case this.ID_TO_CLIPBOARD:
							navigator.clipboard.writeText(this.story.storyId.slice(-5)).then(() => {
								if (this.debugMode) console.log('TaskItem.procSelected: clipboard successfully set')
							}, () => {
								if (this.debugMode) console.log('TaskItem.procSelected: clipboard write failed')
							})
							break
						case this.REMOVE_STORY:
							store.dispatch('boardRemoveStoryFromSprint', this.story.storyId)
							break
						case this.VIEW_STORY_IN_TREE:
							router.push('/treeView')
							store.dispatch('findItemOnId', this.story.storyId)
							break
					}
				} else {
					store.state.warningText = `Sorry, your assigned role(s) [${this.getMyProductsRoles[this.productId].concat(this.getMyGenericRoles)}] for this product disallow you to execute this action`
				}
			},

			doCancel() {
				this.contextOptionSelected = undefined
				this.disableOkButton = true
			}
		}
	}
</script>

<style lang="scss" scoped>
	.small-text {
		font-size: small;
	}

	.lightBlue {
		color: lightblue
	}

	.story-column-item {
		padding: 15px;
		background-color: #8b8cc7;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-shadow: 0 2px 3px #ccc;
	}
</style>
