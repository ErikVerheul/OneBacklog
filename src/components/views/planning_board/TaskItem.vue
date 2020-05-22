<template>
  <div :class="getClass(columnName)" @contextmenu.prevent="showContextMenu = !showContextMenu">
    <div class="b-card-block">
      <span class="text-muted">#{{ getShortId(item.id) }}</span>
      {{ item.title }}
      <br />
      {{ item.taskOwner }}
    </div>
    <template>
      <b-modal
        v-model="showContextMenu"
        :ok-disabled="disableOkButton"
        @ok="procSelected"
        @cancel="doCancel"
        title="Task menu"
      >
        <template>
          <b-list-group>
            <b-list-group-item
              button
              :active="contextOptionSelected === ADD_TASK"
              variant="dark"
              @click="prepSelected(ADD_TASK)"
            >Add a new task</b-list-group-item>
            <b-list-group-item
              button
              :active="contextOptionSelected === CHANGE_TITLE"
              variant="dark"
              @click="prepSelected(CHANGE_TITLE)"
            >Change task title</b-list-group-item>
            <b-list-group-item
              button
              :active="contextOptionSelected === CHANGE_OWNER"
              variant="dark"
              @click="prepSelected(CHANGE_OWNER)"
            >Change task owner</b-list-group-item>
            <b-list-group-item
              button
              :active="contextOptionSelected === REMOVE_TASK"
              variant="dark"
              @click="prepSelected(REMOVE_TASK)"
            >Remove this task</b-list-group-item>
          </b-list-group>

          <div v-if="contextOptionSelected === ADD_TASK" class="title_block">
            <b-form-input v-model="newTaskTitle" placeholder="Enter the title of the new task"></b-form-input>
          </div>

          <div v-if="contextOptionSelected === CHANGE_TITLE" class="title_block">
            <b-form-input v-model="changedTaskTitle" placeholder="Change the title of this task"></b-form-input>
          </div>

          <div v-if="contextOptionSelected === CHANGE_OWNER" class="title_block">
            <h5>Select a team member to own this task</h5>
            <b-row class="my-1">
              <b-col sm="12">Start typing an username or select from the list:</b-col>
              <b-col sm="6">
                <b-form-group>
                  <b-form-select v-model="selectedUser" :options="userOptions"></b-form-select>
                </b-form-group>
              </b-col>
            </b-row>
          </div>

          <div v-if="contextOptionSelected === REMOVE_TASK" class="title_block">
            <b-col sm="12">Click OK to confirm</b-col>
          </div>
        </template>
      </b-modal>
    </template>
  </div>
</template>

<script>
import { utilities } from '../../mixins/utilities.js'
export default {
  mixins: [utilities],
  name: 'TaskItem',
  props: ['storyId', 'storyTitle', 'state', 'columnName', 'item'],

  created() {
    this.ADD_TASK = 0
    this.CHANGE_TITLE = 1
    this.CHANGE_OWNER = 2
    this.REMOVE_TASK = 3

    this.$store.state.backendMessages = []
    this.$store.state.useracc.allUsers = []
    this.$store.dispatch('getAllUsers')
  },

  data() {
    return {
      showContextMenu: false,
      contextOptionSelected: undefined,
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
      this.contextOptionSelected = idx
      this.newTaskTitle = ''
      this.contextWarning = undefined
      this.disableOkButton = false
      switch (this.contextOptionSelected) {
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
          for (let userName of this.$store.state.configData.teams[this.$store.state.userData.myTeam]) {
            this.userOptions.push(userName)
          }
          this.assistanceText = undefined
          this.listItemText = 'Change the owner of this task'
          this.selectedUser = this.$store.state.userData.user
          break
        case this.REMOVE_TASK:
          this.assistanceText = undefined
          this.listItemText = 'Remove this task'
          break
        default:
          this.assistanceText = 'No assistance available'
          this.listItemText = 'nothing selected as yet'
      }
    },

    procSelected() {
      this.showAssistance = false
      switch (this.contextOptionSelected) {
        case this.ADD_TASK:
          this.$store.dispatch('boardAddTask', { storyId: this.storyId, state: this.state, taskId: this.createId(), taskTitle: this.newTaskTitle, priority: this.item.priority })
          break
        case this.CHANGE_TITLE:
          this.$store.dispatch('boardUpdateTaskTitle', { taskId: this.item.id, newTaskTitle: this.changedTaskTitle })
          break
        case this.CHANGE_OWNER:
          this.$store.dispatch('boardUpdateTaskOwner', { taskId: this.item.id, newTaskOwner: this.selectedUser })
          break
        case this.REMOVE_TASK:
          this.$store.dispatch('boardRemoveTask', { taskId: this.item.id, storyTitle: this.storyTitle, currentState: this.state })
          break
      }
    },

    /* Creates fetchedUserData and have the prod.roles set in products */
    fetchUser() {
      this.$store.dispatch('getUser', this.selectedUser)
    },

    doCancel() {
      this.contextOptionSelected = undefined
      this.newTaskTitle = ''
      this.contextWarning = undefined
      this.disableOkButton = true
      this.selectedUser = null
      this.changedTaskTitle = this.item.title
    },

    getShortId(id) {
      return id.slice(-5)
    },

    getClass(name) {
      switch (name) {
        case 'Todo':
        case 'In progress':
        case 'Test / review':
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
}

.b-card.task-column-done {
  background: #9bc777;
}
</style>

