/*
* Common functions for use in Vuex
* Note: Use import * as util from '../common_functions.js' to get all named exports in one object
*/

// A copy of createId() in the component mixins: Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value
export function createId() {
	const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
	return Date.now().toString().concat(ext)
}

export default { createId }
