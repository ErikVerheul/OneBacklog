/*
 * Common functions
 * Usage: import * as <any name> from '../common_functions.js' to get all named exports in one object
 */

/* The "Unicode Problem" See https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
Since btoa interprets the code points of its input string as byte values, 
calling btoa on a string will cause a "Character Out Of Range" exception if a character's code point exceeds 0xff. 
For use cases where you need to encode arbitrary Unicode text, 
it is necessary to first convert the string to its constituent bytes in UTF-8, and then encode the bytes.*/

import { MISC } from './constants.js'

function base64ToBytes(base64) {
	const binString = window.atob(base64)
	return Uint8Array.from(binString, (m) => m.codePointAt(0))
}

function bytesToBase64(bytes) {
	const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('')
	return window.btoa(binString)
}

// convert unicode string to base64 encoded ascii
export function uniTob64(str) {
	return bytesToBase64(new TextEncoder().encode(str))
}

// convert base64 encoded ascii to unicode string
export function b64ToUni(bytes) {
	return new TextDecoder().decode(base64ToBytes(bytes))
}

export function areStringsEqual(str1, str2) {
	const retVal = str1.localeCompare(str2)
	return retVal === 0
}

//////////////// expand, collapse and show or hide the children of the node ////////////
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
	if (node) {
		node.isExpanded = true
		for (const nm of node.children) {
			showNode(nm)
		}
	}
}

export function collapseNode(node) {
	if (node) {
		node.isExpanded = false
		for (const nm of node.children) {
			hideNode(nm)
		}
	}
}
///////////////////////////////////////// other functions ///////////////////////////////////////////////

/* Create an id starting with the time past since 1/1/1970 in miliseconds + a 5 character alphanumeric random value */
export function createId() {
	const ext = Math.random().toString(36).replace('0.', '').substring(0, 5)
	return Date.now().toString().concat(ext)
}

/* Remove duplicates; return an empty array if arr is not defined or null */
export function dedup(arr) {
	function containsObject(obj, list) {
		return list.some((el) => el === obj)
	}
	if (arr) {
		const dedupped = []
		for (const el of arr) {
			if (!containsObject(el, dedupped)) dedupped.push(el)
		}
		return dedupped
	} else return []
}

/* Create a text for the event list immediately after a tree load */
export function createLoadEventText(state) {
	let txt = `${state.docsCount} documents are read. ${state.insertedCount} items are inserted. `
	if (state.orphansCount > 0) txt.concat(`${state.orphansCount} orphans are skipped`)
	return txt
}

/* Add item (not an object) to array if not already present. Returns a new array so that it is reactive */
export function addToArray(arr, item) {
	const newArr = []
	for (const el of arr) newArr.push(el)
	if (!newArr.includes(item)) newArr.push(item)
	return newArr
}

export function localTimeAndMilis(now) {
	function pad(num, size) {
		var s = '000' + num
		return s.substring(s.length - size)
	}
	// remove the AM/PM ending (Chrome)
	function strip(timeString) {
		const len = timeString.length
		if (len <= 8) {
			// Firefox
			return timeString
		}
		// Chrome
		return timeString.substring(0, len - 3)
	}
	return `${strip(now.toLocaleTimeString())}.${pad(now.getMilliseconds(), 3)}`
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
			newInd: i,
		}
	} else {
		parentNode.children = []
		newPath = parentNode.path.slice()
		newPath.push(0)
		return {
			prevNode: parentNode,
			newPath,
			newInd: 0,
		}
	}
}

/* Return the sprint object or null if not found */
export function getSprintById(id, calendar) {
	for (const s of calendar) {
		if (s.id === id) return s
	}
	return null
}

/* Return the name of sprint or 'Unknown sprint' if not found */
export function getSprintNameById(id, calendar) {
	const sprint = getSprintById(id, calendar)
	if (sprint) {
		return sprint.name
	} else return 'Unknown sprint'
}

/* Return true if the email address is valid, false otherwise */
export function isValidEmail(email) {
	const re =
		/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	return re.test(email)
}

export function startMsgSquareBlink(rootState) {
	const color = 'yellow'
	const backGround = MISC.SQUAREBGNDCOLOR
	let col = color
	const blickId = setInterval(() => {
		if (col === color) {
			col = backGround
		} else col = color
		rootState.messSquareColor = col
	}, 500)
	rootState.msgBlinkIds.push(blickId)
}

export default {
	uniTob64,
	b64ToUni,
	areStringsEqual,
	expandNode,
	collapseNode,
	showNode,
	hideNode,
	addToArray,
	createId,
	createLoadEventText,
	dedup,
	getLocationInfo,
	getSprintById,
	getSprintNameById,
	localTimeAndMilis,
	removeFromArray,
	isValidEmail,
	startMsgSquareBlink,
}
