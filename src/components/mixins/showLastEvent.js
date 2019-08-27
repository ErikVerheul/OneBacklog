const INFO = 0
const WARNING = 1
const ERROR = 2
const DEBUG = 3
export const showLastEvent = {
    methods: {
        showLastEvent(txt, severity) {
            let eventBgColor = '#408FAE'
            switch (severity) {
                case INFO:
                    eventBgColor = '#408FAE'
                    break
                case WARNING:
                    eventBgColor = 'orange'
                    break
                case ERROR:
                    eventBgColor = 'red'
                    break
                case DEBUG:
                    eventBgColor = 'yellow'
            }
            this.$store.state.lastEvent = txt
            this.$store.state.eventBgColor = eventBgColor
        },
    }
}
