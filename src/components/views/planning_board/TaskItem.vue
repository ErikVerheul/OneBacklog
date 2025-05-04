<template>
	<div :class="getClass(columnName)" @contextmenu.prevent="showContextMenu = !showContextMenu">
		<div class="b-card-block">
			{{ item.title }}
			<br />
			{{ item.taskOwner }}
		</div>
		<BModal v-model="showContextMenu" size="sm" :ok-disabled="disableOkButton" @ok="procSelected" @cancel="doCancel" title="Task menu">
			<BListGroup>
				<BListGroupItem button :active="ctxOptSelected === ADD_TASK" variant="dark" @click="prepSelected(ADD_TASK)">Add a new task </BListGroupItem>
				<BListGroupItem button :active="ctxOptSelected === CHANGE_TITLE" variant="dark" @click="prepSelected(CHANGE_TITLE)">Change task title
				</BListGroupItem>
				<BListGroupItem button :active="ctxOptSelected === CHANGE_OWNER" variant="dark" @click="prepSelected(CHANGE_OWNER)">Change task owner
				</BListGroupItem>
				<BListGroupItem button :active="ctxOptSelected === ID_TO_CLIPBOARD" variant="dark" @click="prepSelected(ID_TO_CLIPBOARD)">Copy short id to clipboard
				</BListGroupItem>
				<template v-if="onLargeScreen">
					<BListGroupItem button :active="ctxOptSelected === VIEW_TASK_IN_TREE" variant="dark" @click="prepSelected(VIEW_TASK_IN_TREE)">View task in backlog
						tree view
					</BListGroupItem>
				</template>
				<BListGroupItem button :active="ctxOptSelected === REMOVE_TASK" variant="danger" @click="prepSelected(REMOVE_TASK)">Remove this task
				</BListGroupItem>
			</BListGroup>

			<div v-if="ctxOptSelected === ADD_TASK" class="title_block">
				<BFormInput v-model="newTaskTitle" placeholder="Enter the title of the new task"></BFormInput>
			</div>

			<div v-if="ctxOptSelected === CHANGE_TITLE" class="title_block">
				<BFormInput v-model="changedTaskTitle" placeholder="Change the title of this task"></BFormInput>
			</div>

			<div v-if="ctxOptSelected === CHANGE_OWNER" class="title_block">
				<BRow class="my-1">
					<BCol sm="12">Select team member name:</BCol>
					<BCol sm="6">
						<BFormGroup>
							<BFormSelect v-model="selectedUser" :options="userOptions"></BFormSelect>
						</BFormGroup>
					</BCol>
				</BRow>
			</div>
		</BModal>
	</div>
</template>

<script>
	import router from '../../../router'
	import { LEVEL } from '../../../constants.js'
	import { createId } from '../../../common_functions.js'
	import { authorization, utilities } from '../../mixins/GenericMixin.js'
	import store from '../../../store/store.js'

	export default {
		mixins: [authorization, utilities],
		name: 'TaskItem',
		props: ['productId', 'storyId', 'storyTitle', 'taskState', 'columnName', 'item'],

		created() {
			this.ADD_TASK = 0
			this.CHANGE_TITLE = 1
			this.CHANGE_OWNER = 2
			this.ID_TO_CLIPBOARD = 3
			this.VIEW_TASK_IN_TREE = 4
			this.REMOVE_TASK = 5
		},

		data() {
			return {
				onLargeScreen: store.state.onLargeScreen,
				debugMode: store.state.debug,
				showContextMenu: false,
				ctxOptSelected: undefined,
				newTaskTitle: '',
				contextWarning: undefined,
				disableOkButton: true,
				selectedUser: null,
				changedTaskTitle: this.item.title,
				theClass: 'b-card task-column-item'
			}
		},

		methods: {
			prepSelected(idx) {
				this.ctxOptSelected = idx
				this.newTaskTitle = ''
				this.contextWarning = undefined
				this.disableOkButton = false
				switch (this.ctxOptSelected) {
					case this.ADD_TASK:
						this.assistanceText = undefined
						this.listItemText = 'Add a new task to this column'
						break
					case this.CHANGE_TITLE:
						this.assistanceText = undefined
						this.listItemText = 'Change the title of this task'
						break
					case this.CHANGE_OWNER:
						// populate the userOptions array
						this.userOptions = []
						for (const userName of store.state.allTeams[store.state.userData.myTeam].members) {
							this.userOptions.push(userName)
						}
						this.assistanceText = undefined
						this.listItemText = 'Change the owner of this task'
						this.selectedUser = store.state.userData.user
						break
					case this.ID_TO_CLIPBOARD:
					case this.VIEW_TASK_IN_TREE:
					case this.REMOVE_TASK:
						break
					default:
						this.assistanceText = 'No assistance available'
						this.listItemText = 'nothing selected as yet'
				}
			},

			procSelected() {
				if (this.haveWritePermission(this.productId, LEVEL.TASK)) {
					this.showAssistance = false
					switch (this.ctxOptSelected) {
						case this.ADD_TASK:
							store.dispatch('boardAddTask', { storyId: this.storyId, taskState: this.taskState, taskId: createId(), taskTitle: this.newTaskTitle })
							break
						case this.CHANGE_TITLE:
							store.dispatch('boardUpdateTaskTitle', { taskId: this.item.id, newTaskTitle: this.changedTaskTitle })
							break
						case this.CHANGE_OWNER:
							store.dispatch('boardUpdateTaskOwner', { taskId: this.item.id, newTaskOwner: this.selectedUser })
							break
						case this.ID_TO_CLIPBOARD:
							navigator.clipboard.writeText(this.item.id.slice(-5)).then(() => {
								if (this.debugMode) console.log('TaskItem.procSelected: clipboard successfully set')
							}, () => {
								if (this.debugMode) console.log('TaskItem.procSelected: clipboard write failed')
							})
							break
						case this.VIEW_TASK_IN_TREE:
							router.push('/treeView')
							store.dispatch('findItemOnId', this.item.id)
							break
						case this.REMOVE_TASK:
							store.dispatch('boardRemoveTask', this.item.id)
							break
					}
				} else {
					store.state.warningText = `Sorry, your assigned role(s) [${this.getMyProductsRoles[this.productId].concat(this.getMyGenericRoles)}] for this product disallow you to execute this action`
				}
			},

			doCancel() {
				this.ctxOptSelected = undefined
				this.newTaskTitle = ''
				this.contextWarning = undefined
				this.disableOkButton = true
				this.selectedUser = null
				this.changedTaskTitle = this.item.title
			},

			getClass(name) {
				switch (name) {
					case '[On hold]':
					case 'Todo':
					case 'In progress':
					case 'Test/rev.':
						return 'b-card task-column-item'
					case 'Done':
						return 'b-card task-column-done'
				}
			}
		}
	}
</script>

<style scoped>
	.title_block {
		margin-top: 20px;
	}

	.b-card-block {
		padding: 15px;
		font-size: 12pt;
	}

	.b-card.task-column-item {
		background: #ddc01d;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-shadow: 0 2px 3px #ccc;
	}

	.b-card.task-column-done {
		background: #9bc777;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-shadow: 0 2px 3px #ccc;
	}
</style>
