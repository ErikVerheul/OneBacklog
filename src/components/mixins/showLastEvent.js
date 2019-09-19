const DEBUG = -1
const INFO = 0
const WARNING = 1
const ERROR = 2
const CRITICAL = 3
export const showLastEvent = {
    methods: {
        showLastEvent(txt, severity) {
            let eventBgColor = '#408FAE'
            switch (severity) {
                case DEBUG:
                    eventBgColor = 'yellow'
                    break
                case INFO:
                    eventBgColor = '#408FAE'
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
    }
}
