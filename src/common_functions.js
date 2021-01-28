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

/* Add item (not an object) to array if not already present. Returns a new array so that it is reactive */
export function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

/* Remove item (not an object) from array if present. Returns a new array so that it is reactive */
export function removeFromArray(arr, item) {
	const newArr = []
	for (const el of arr) {
		if (el !== item) newArr.push(el)
	}
	return newArr
}

export default { createId, dedup, addToArray, removeFromArray }
