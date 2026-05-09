/**
 * Test framework setup — runs AFTER Jest loads `expect`, `beforeEach`, etc.
 * Put jest-dom matchers and per-test reset hooks here.
 */
import '@testing-library/jest-dom';

// Provide a fresh wp.hooks store and a clean speak mock between tests
// so assertions don't leak across test files
beforeEach( () => {
	const { createHooks } = require( '@wordpress/hooks' );
	global.wp.hooks = createHooks();
	global.wp.a11y.speak = jest.fn();
} );
