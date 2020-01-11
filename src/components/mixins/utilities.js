const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3
const PBILEVEL = 5
const DEFAULTCOLOR = '#408FAE'
export const utilities = {
	methods: {
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
		getLevelText(level) {
			if (level < 0 || level > PBILEVEL) {
				return 'Level not supported'
			}
			return this.$store.state.configData.itemType[level]
		},

		getItemStateText(idx) {
			if (idx < 0 || idx > PBILEVEL) {
				return 'Error: unknown state'
			}
			return this.$store.state.configData.itemState[idx]
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
		},

		/* Reorder the state values to create a order for comparison */
		convertState(state) {
			switch (state) {
				case 0:
					return 2
				case 1:
					return 3
				case 2:
					return 4
				case 3:
					return 1
				case 4:
					return 5
				case 5:
					return 0
			}
		}
	}
}
