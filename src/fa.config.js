import Vue from 'vue'
import {
  library
} from '@fortawesome/fontawesome-svg-core'

import {
  FontAwesomeIcon
} from '@fortawesome/vue-fontawesome'

import {
	faBan,
  faFolder,
  faFile,
  faChevronDown,
  faChevronRight,
  faBug,
  faHourglassStart,
  faCog
} from '@fortawesome/free-solid-svg-icons'

library.add(
	faBan,
  faFolder,
  faFile,
  faChevronDown,
  faChevronRight,
  faBug,
  faHourglassStart,
  faCog
)

Vue.component('font-awesome-icon', FontAwesomeIcon) // registered globally
