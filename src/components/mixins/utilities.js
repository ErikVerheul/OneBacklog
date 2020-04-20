const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3
const PBILEVEL = 5
const TASKLEVEL = 6
const DEFAULTCOLOR = '#408FAE'

const utilities = {
	methods: {
		/* Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value */
		createId() {
			const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
			return Date.now().toString().concat(ext)
		},

		/* Return the sprint record with the id or null if not found */
		getSprint(id) {
			for (let s of this.$store.state.configData.defaultSprintCalendar) {
				if (s.id === id) return s
			}
			return null
		},

		getCurrentAndNextSprint() {
			const now = Date.now()
			let currentSprint = undefined
			let nextSprint = undefined
			for (let i = 0; i < this.$store.state.configData.defaultSprintCalendar.length; i++) {
				const s = this.$store.state.configData.defaultSprintCalendar[i]
				if (s.startTimestamp < now && now < s.startTimestamp + s.sprintLength) {
					currentSprint = s
					nextSprint = this.$store.state.configData.defaultSprintCalendar[i + 1]
					break
				}
			}
			return { currentSprint, nextSprint }
		},

		isCurrentOrNextPrintId(id) {
			const sprints = this.getCurrentAndNextSprint()
			return id === sprints.currentSprint.id || id === sprints.nextSprint.id
		},

		showLastEvent(txt, severity) {
			let eventBgColor = DEFAULTCOLOR
			switch (severity) {
				case DEBUG:
					eventBgColor = 'yellow'
					break
				case INFO:
					eventBgColor = DEFAULTCOLOR
					break
				case WARNING:
					eventBgColor = 'orange'
					break
				case ERROR:
					eventBgColor = 'red'
					break
				case CRITICAL:
					eventBgColor = '#ff5c33'
			}
			this.$store.state.lastEvent = txt
			this.$store.state.eventBgColor = eventBgColor
		},


		clearLastEvent() {
			this.$store.state.lastEvent = 'Event message is cleared.'
			this.$store.state.eventBgColor = DEFAULTCOLOR
		},

		/* mappings from config document*/
		getLevelText(level, subtype = 0) {
			if (level < 0 || level > TASKLEVEL) {
				return 'Level not supported'
			}
			if (level === PBILEVEL) {
				return this.getSubType(subtype)
			}
			return this.$store.state.configData.itemType[level]
		},

		getItemStateText(idx) {
			if (this.$store.state.currentDoc.level < TASKLEVEL) {
				if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.itemState[idx]
			} else {
				if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.taskState[idx]
			}
		},

		getNodeStateText(node) {
			const idx = node.data.state
			if (node.level < TASKLEVEL) {
				if (idx < 0 || idx >= this.$store.state.configData.itemState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.itemState[idx]
			} else {
				if (idx < 0 || idx >= this.$store.state.configData.taskState.length) {
					return 'Error: unknown state'
				}
				return this.$store.state.configData.taskState[idx]
			}
		},

		getTsSize(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.tsSize.length) {
				return 'Error: unknown T-shirt size'
			}
			return this.$store.state.configData.tsSize[idx]
		},

		getSubType(idx) {
			if (idx < 0 || idx >= this.$store.state.configData.subtype.length) {
				return 'Error: unknown subtype'
			}
			return this.$store.state.configData.subtype[idx]
		},

		itemTitleTrunc(length, title) {
			if (title.length <= length) return title;
			return title.substring(0, length - 4) + '...'
		}
	}
}

export {
	utilities
}
