<template>
  <div class="b-card story-column-item" @contextmenu.prevent="showContextMenu = !showContextMenu">
    <div class="b-card-block">
      <i class="colorYellow" v-if="story.subType === 0">
        <font-awesome-icon icon="folder" />
      </i>
      <i v-if="story.subType === 1">
        <font-awesome-icon icon="hourglass-start" />
      </i>
      <i class="colorRed" v-if="story.subType === 2">
        <font-awesome-icon icon="bug" />
      </i>
      {{ story.title }}
      <p v-if="story.subType !== 1">size = {{ story.size }}</p>
			<p v-else>hours = {{ story.spikePersonHours }}</p>
      <p class="small-text">
        F: {{ story.featureName }}
        <br />
        E: {{ story.epicName }}
        <br />
        P: {{ story.productName }}
      </p>
    </div>
    <b-modal v-model="showContextMenu" :ok-disabled="disableOkButton" @ok="procSelected" @cancel="doCancel" title="User story menu">
      <template>
        <b-list-group>
          <b-list-group-item button :active="contextOptionSelected === ID_TO_CLIPBOARD" variant="dark" @click="prepSelected(ID_TO_CLIPBOARD)">Copy short id to clipboard</b-list-group-item>
          <b-list-group-item button :active="contextOptionSelected === REMOVE_STORY" variant="danger" @click="prepSelected(REMOVE_STORY)">Remove this {{ storyType }} from the sprint</b-list-group-item>
        </b-list-group>
      </template>
    </b-modal>
  </div>
</template>

<script>
import { LEVEL } from '../../../constants.js'
import { authorization, utilities } from '../../mixins/generic.js'

export default {
  mixins: [authorization, utilities],
  name: 'StoryItem',
  props: ['productId', 'story'],

  created() {
    this.ID_TO_CLIPBOARD = 0
    this.REMOVE_STORY = 1
  },

  computed: {
    storyType () {
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
      debugMode: this.$store.state.debug,
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
              // eslint-disable-next-line no-console
              if (this.debugMode) console.log('TaskItem.procSelected: clipboard successfully set')
            }, () => {
              // eslint-disable-next-line no-console
              if (this.debugMode) console.log('TaskItem.procSelected: clipboard write failed')
            })
            break
          case this.REMOVE_STORY:
            this.$store.dispatch('boardRemoveStoryFromSprint', this.story.storyId)
            break
        }
      } else {
        this.$store.state.warningText = `Sorry, your assigned role(s) [${this.getMyProductsRoles[this.productId].concat(this.getMyGenericRoles)}] for this product disallow you to execute this action`
      }
    },

    doCancel() {
      this.contextOptionSelected = undefined
      this.disableOkButton = true
    }
  }
}
</script>

<style scoped>
.small-text {
  font-size: small;
}

.b-card-block {
  padding: 15px;
  font-size: 12pt;
}

.b-card.story-column-item {
  background: #8b8cc7;
}
</style>
