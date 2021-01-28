/*
* Common functions for use in Vuex
* Note: Use import * as <any name> from '../common_functions.js' to get all named exports in one object
*/

/* Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value */
export function createId() {
	const ext = Math.random().toString(36).replace('0.', '').substr(0, 5)
	return Date.now().toString().concat(ext)
}

/* Remove duplicates; return an empty array if arr is not defined or null */
export function dedup(arr) {
	function containsObject(obj, list) {
		return list.some(el => el === obj)
	}
	if (arr) {
		const dedupped = []
		for (const el of arr) {
			if (!containsObject(el, dedupped)) dedupped.push(el)
		}
		return dedupped
	} else return []
}

export default { createId, dedup }
