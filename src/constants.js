// Log severities
const SEV = Object.freeze({
	DEBUG: -1,
	INFO: 0,
	WARNING: 1,
	ERROR: 2,
	CRITICAL: 3,
})

// Item states
const STATE = Object.freeze({
	ON_HOLD: 1,
	NEW: 2,
	TODO: 2,
	NEW_OR_TODO: 2,
	READY: 3,
	INPROGRESS: 4,
	TESTREVIEW: 5,
	DONE: 6,
})

// Tree view levels
const LEVEL = Object.freeze({
	DATABASE: 1,
	PRODUCT: 2,
	EPIC: 3,
	FEATURE: 4,
	PBI: 5,
	TASK: 6,
})

// Miscellaneous constants
const MISC = Object.freeze({
	AREA_PRODUCTID: 'requirement-areas',
	BACKUPSONLY: 1,
	ALLBUTSYSTEM: 2,
	ALLBUTSYSTEMANDBACKUPS: 3,
	ALLBUTSYSTEMANDBACKUPSEXCEPTUSERS: 4
})

export {
	SEV,
	STATE,
	LEVEL,
	MISC
}
