// Log severities
const sev = Object.freeze({
	DEBUG: -1,
	INFO: 0,
	WARNING: 1,
	ERROR: 2,
	CRITICAL: 3,
})

// Item states
const state = Object.freeze({
	ON_HOLD: 1,
	NEW: 2,
	TODO: 2,
	READY: 3,
	INPROGRESS: 4,
	TESTREVIEW: 5,
	DONE: 6,
})

// Tree view levels
const level = Object.freeze({
	DATABASE: 1,
	PRODUCT: 2,
	EPIC: 3,
	FEATURE: 4,
	PBI: 5,
	TASK: 6,
})

export {
	sev,
	state,
	level
}
