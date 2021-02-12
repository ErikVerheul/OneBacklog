/*
* Common functions for use in Vuex
* Note: Use import * as <any name> from '../common_functions.js' to get all named exports in one object
*/

//////////////// expand, collapse, show and hide nodes as a side effect of these 4 functions ////////////
export function showNode(node) {
	if (node) {
		node.doShow = true
	}
}

export function hideNode(node) {
	if (node) {
		node.doShow = false
	}
}

export function expandNode(node) {
	function unhideDescendants(node) {
		for (const nm of node.children) {
			showNode(nm)
			unhideDescendants(nm)
		}
	}
	if (node) {
		node.isExpanded = true
		unhideDescendants(node)
	}
}

export function collapseNode(node) {
	function hideDescendants(node) {
		for (const nm of node.children) {
			hideNode(nm)
			hideDescendants(nm)
		}
	}
	if (node) {
		node.isExpanded = false
		hideDescendants(node)
	}
}
///////////////////////////////////////////////////////////////////////////////////////////////////

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

/*
* When the parentNode exists this function returns an object with:
* - the previous node (can be the parent)
* - the path of the location in the tree
* - the index in the array of siblings the node should have based on its priority
*/
export function getLocationInfo(newPrio, parentNode) {
	let newPath = []
	if (parentNode.children && parentNode.children.length > 0) {
		const siblings = parentNode.children
		let i = 0
		while (i < siblings.length && siblings[i].data.priority > newPrio) i++
		let prevNode = null
		if (i === 0) {
			prevNode = parentNode
			newPath = parentNode.path.slice()
			newPath.push(0)
		} else {
			prevNode = siblings[i - 1]
			newPath = prevNode.path.slice(0, -1)
			newPath.push(i)
		}
		return {
			prevNode,
			newPath,
			newInd: i
		}
	} else {
		parentNode.children = []
		newPath = parentNode.path.slice()
		newPath.push(0)
		return {
			prevNode: parentNode,
			newPath,
			newInd: 0
		}
	}
}

export default { expandNode, collapseNode, showNode, hideNode, addToArray, createId, dedup, getLocationInfo, removeFromArray }
