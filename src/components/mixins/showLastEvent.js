const INFO = 0
const WARNING = 1
const ERROR = 2
const DEBUG = 3
export const showLastEvent = {
    data() {
        return {
            eventBgColor: "#408FAE",
        }
    },
    methods: {
        showLastEvent(txt, level) {
            switch (level) {
                case INFO:
                    this.eventBgColor = '#408FAE'
                    break
                case WARNING:
                    this.eventBgColor = 'orange'
                    break
                case ERROR:
                    this.eventBgColor = 'red'
                    break
                case DEBUG:
                    this.eventBgColor = 'yellow'
            }
            this.$store.state.lastEvent = txt
        },
    }
}
