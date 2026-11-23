/**
 * A Playwright reporter for the person who opens a red run
 *
 * It says nothing when every test passed first time
 * When a test failed, or passed only on a retry, it writes two things from the same facts:
 *   - a few plain lines on the run's summary page (GitHub Actions only): which test, which named step, and why
 *   - one HTML file that needs nothing else to open, with the screenshots and videos of the tries that failed inside it
 *
 * The file is named by E2E_REPORT_NAME so every job in a run has its own, see .github/workflows/test-e2e.yml
 * The HTML report and the traces Playwright makes itself are untouched, this sits beside them
 */

const fs   = require( 'fs' );
const path = require( 'path' );

// A video bigger than this stays out of the page, which has to remain something a browser opens at once
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

// Enough of an error to read what happened, the whole of it is in Playwright's own report
const MAX_ERROR_LINES = 40;

// How much of an expected or found value goes into the one line that says why, and how many found values
const MAX_VALUE_LENGTH = 300;
const MAX_FOUND_LINES  = 3;

// The colour codes Playwright puts in its error text for the terminal
const COLOUR_CODES = /\u001b\[[0-9;]*m/g;

const RESULT_WORDS = {
	passed:      'passed',
	failed:      'failed',
	timedOut:    'ran out of time',
	interrupted: 'was interrupted',
	skipped:     'was skipped',
};

/**
 * @param {number} ms a duration
 * @return {string} the same in seconds, the way a person says it
 */
function seconds( ms ) {
	return ms < 10000 ? `${ ( ms / 1000 ).toFixed( 1 ) }s` : `${ Math.round( ms / 1000 ) }s`;
}

/**
 * @param {number} count
 * @param {string} one   the word for one of them
 * @param {string} many  the word for several
 * @return {string} the count with the right word
 */
function counted( count, one, many ) {
	return `${ count } ${ 1 === count ? one : many }`;
}

/**
 * The steps that failed, from the outermost one to the one where it actually went wrong
 *
 * @param {Array} steps the steps of a try, or of a step
 * @param {Array} trail the failed steps above these
 * @return {Array} the failed steps, outermost first
 */
function failedSteps( steps, trail = [] ) {
	const failed = ( steps || [] ).find( ( step ) => step.error );

	return failed ? failedSteps( failed.steps, [ ...trail, failed ] ) : trail;
}

/**
 * The steps that were still running when a try was cut off, for a try that has no failed step to point at:
 * the last named step, the last named step inside it and so on, and then the last thing done in the innermost one
 *
 * @param {Array} steps the steps of a try, or of a step
 * @param {Array} trail the steps above these
 * @return {Array} steps, outermost first
 */
function lastSteps( steps, trail = [] ) {
	const all   = steps || [];
	const named = all.filter( ( step ) => 'test.step' === step.category );
	const last  = named[ named.length - 1 ];

	if ( last ) {
		return lastSteps( last.steps, [ ...trail, last ] );
	}

	const action = [ ...all ].reverse().find( ( step ) => [ 'expect', 'pw:api' ].includes( step.category ) );

	return action ? [ ...trail, action ] : trail;
}

/**
 * @param {string} text anything
 * @return {string} the text, cut off when it runs long
 */
function clipped( text ) {
	return text.length > MAX_VALUE_LENGTH ? `${ text.slice( 0, MAX_VALUE_LENGTH ) }…` : text;
}

/**
 * What an assertion wanted and what it got, pulled out of Playwright's error text
 *
 * @param {string} text an error with its colour codes removed
 * @return {string} a few words, or nothing when the error is not shaped like that
 */
function expectedAndReceived( text ) {
	const expected = /^Expected[^:\n]*:[ \t]*(.+)$/m.exec( text );
	const received = /^Received[^:\n]*:[ \t]*(.+)$/m.exec( text );

	if ( expected && received ) {
		return `expected ${ clipped( expected[ 1 ].trim() ) }, found ${ clipped( received[ 1 ].trim() ) }`;
	}

	// A comparison of lists or objects is printed as a diff, the lines marked + are what was found and not expected
	const found = text.split( '\n' )
		.filter( ( line ) => /^\+ {2,}\S/.test( line ) )
		.map( ( line ) => line.replace( /^\+\s+/, '' ).replace( /,$/, '' ) )
		.filter( ( line ) => ! /^[\][{}]+$/.test( line ) )
		// A string is printed in quotes with the quotes inside it escaped, which is noise to a reader
		.map( ( line ) => ( /^".*"$/.test( line ) ? line.slice( 1, -1 ).replace( /\\(["\\])/g, '$1' ) : line ) );

	if ( ! found.length ) {
		return '';
	}

	const more = found.length > MAX_FOUND_LINES ? `, and ${ found.length - MAX_FOUND_LINES } more` : '';

	return `found: ${ found.slice( 0, MAX_FOUND_LINES ).map( clipped ).join( '; ' ) }${ more }`;
}

/**
 * What one try of a test did, as plain values
 *
 * @param {Object} result  a Playwright TestResult
 * @param {number} timeout the test's time limit in milliseconds
 * @return {Object} the try
 */
function describeTry( result, timeout ) {
	const error  = ( result.errors && result.errors[ 0 ] ) || result.error || null;
	const text   = error ? String( error.message || error.value || '' ).replace( COLOUR_CODES, '' ).trim() : '';
	const failed = failedSteps( result.steps );
	const trail  = failed.length || 'passed' === result.status ? failed : lastSteps( result.steps );
	const named  = trail.filter( ( step ) => 'test.step' === step.category ).map( ( step ) => step.title );
	const action = [ ...trail ].reverse().find( ( step ) => 'test.step' !== step.category );

	// The first line is the message the test gave its assertion when it has one, and Playwright's own words when not
	const label  = ( text.split( '\n' ).find( ( line ) => '' !== line.trim() ) || '' ).replace( /^Error:\s*/, '' ).trim();
	const detail = expectedAndReceived( text );
	let reason   = [ label, detail ].filter( Boolean ).join( ' — ' );

	if ( 'timedOut' === result.status ) {
		reason = `The test did not finish inside its time limit of ${ seconds( timeout ) }`;
	}

	const attachments = ( result.attachments || [] ).filter( ( attachment ) => attachment.path || attachment.body );
	const ofType      = ( prefix ) => attachments.filter( ( attachment ) => String( attachment.contentType ).startsWith( prefix ) );

	return {
		number:   result.retry + 1,
		status:   result.status,
		duration: result.duration,
		reason,
		error:    text,
		steps:    named,
		// An assertion's step is named after its message, which the reason has already said
		action:   action && ! ( label && action.title.startsWith( label ) ) ? action.title : '',
		images:   ofType( 'image/' ),
		videos:   ofType( 'video/' ),
		notes:    attachments.filter( ( attachment ) => 'text/plain' === attachment.contentType ),
		traces:   attachments.filter( ( attachment ) => 'trace' === attachment.name && attachment.path ).map( ( attachment ) => attachment.path ),
	};
}

/**
 * Gathers the tests that failed or needed a retry
 *
 * @param {Array}   tests               Playwright TestCase objects, all of them
 * @param {Object}  options
 * @param {boolean} options.failOnFlaky whether this run treats a retry as a failure
 * @param {string}  options.cwd         paths are shown relative to this folder
 * @return {{ failOnFlaky: boolean, failed: number, retried: number, tests: Object[] }} the report
 */
function collect( tests, { failOnFlaky = false, cwd = process.cwd() } = {} ) {
	const troubled = tests
		.filter( ( test ) => [ 'unexpected', 'flaky' ].includes( test.outcome() ) )
		.map( ( test ) => {
			const project = test.parent && test.parent.project ? test.parent.project() : null;

			return {
				title:   test.title,
				// Without the leading empty name, the project and the file, and without the test's own title
				group:   test.titlePath().slice( 3, -1 ).join( ' › ' ),
				browser: project ? project.name : '',
				file:    `${ path.relative( cwd, test.location.file ) }:${ test.location.line }`,
				retried: 'flaky' === test.outcome(),
				tries:   test.results.map( ( result ) => describeTry( result, test.timeout ) ),
			};
		} );

	return {
		failOnFlaky,
		failed:  troubled.filter( ( test ) => ! test.retried ).length,
		retried: troubled.filter( ( test ) => test.retried ).length,
		tests:   troubled,
	};
}

/**
 * Why the run looks the way it does, in a sentence or two
 *
 * @param {Object} report what collect() returned
 * @return {string[]} sentences
 */
function headline( report ) {
	const lines = [];

	if ( report.failed ) {
		lines.push( `${ counted( report.failed, 'test', 'tests' ) } failed on every try.` );
	}

	if ( report.retried ) {
		lines.push( `${ counted( report.retried, 'test', 'tests' ) } failed at first and passed on a retry.` );
		if ( ! report.failOnFlaky ) {
			lines.push( 'Retries are allowed on this run, so that on its own does not fail the job.' );
		} else if ( report.failed ) {
			lines.push( 'This run counts a test that needed a retry as a failure too.' );
		} else {
			lines.push( 'This run counts a test that needed a retry as a failure, which is why the job is red although the test count says every test passed.' );
		}
	}

	return lines;
}

/**
 * @param {string[]} steps named steps, outermost first
 * @return {string} the steps as one phrase, or nothing
 */
function during( steps ) {
	return steps.length ? steps.join( ' › ' ) : '';
}

/**
 * @param {Object} attempt one try
 * @return {string} what was recorded for it, as a short list in words
 */
function recorded( attempt ) {
	const kinds = [];

	if ( attempt.images.length ) {
		kinds.push( counted( attempt.images.length, 'screenshot', 'screenshots' ) );
	}

	if ( attempt.videos.length ) {
		kinds.push( counted( attempt.videos.length, 'video', 'videos' ) );
	}

	if ( attempt.traces.length ) {
		kinds.push( 'a trace' );
	}

	return kinds.join( ', ' );
}

/**
 * @param {string} text an error
 * @return {string} its first lines
 */
function shortened( text ) {
	const lines = text.split( '\n' );

	return lines.length > MAX_ERROR_LINES
		? [ ...lines.slice( 0, MAX_ERROR_LINES ), `… ${ lines.length - MAX_ERROR_LINES } more lines in the Playwright report` ].join( '\n' )
		: text;
}

/**
 * @param {string} text anything
 * @return {string} the text made safe to sit in Markdown as words
 */
function markdownText( text ) {
	return String( text )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /([\\`*_[\]|])/g, '\\$1' );
}

/**
 * Puts tries that went wrong in the same place for the same reason together, so the summary says it once
 *
 * @param {Object[]} tries the tries of a test, in order
 * @return {Array<{ attempt: Object, numbers: number[] }>} one entry for each different outcome
 */
function sameWayTogether( tries ) {
	const groups = [];

	for ( const attempt of tries ) {
		const last = groups[ groups.length - 1 ];
		const same = last && [ 'status', 'reason', 'action' ].every( ( key ) => last.attempt[ key ] === attempt[ key ] )
			&& during( last.attempt.steps ) === during( attempt.steps );

		if ( same ) {
			last.numbers.push( attempt.number );
		} else {
			groups.push( { attempt, numbers: [ attempt.number ] } );
		}
	}

	return groups;
}

/**
 * The lines for the run's summary page
 *
 * @param {Object} report what collect() returned
 * @return {string} Markdown
 */
function renderSummary( report ) {
	const out = [ '## Playwright: what went wrong', '', ...headline( report ), '' ];

	for ( const test of report.tests ) {
		out.push( `### ${ markdownText( test.title ) }`, '' );
		out.push( [ test.group, test.browser, `\`${ test.file }\`` ].filter( Boolean ).map( ( part, index ) => ( 2 === index ? part : markdownText( part ) ) ).join( ' · ' ), '' );

		for ( const { attempt, numbers } of sameWayTogether( test.tries ) ) {
			const where = during( attempt.steps );
			const which = 1 === numbers.length ? `Try ${ numbers[ 0 ] }` : `Tries ${ numbers.slice( 0, -1 ).join( ', ' ) } and ${ numbers[ numbers.length - 1 ] } each`;
			const time  = 1 === numbers.length ? ` after ${ seconds( attempt.duration ) }` : '';

			out.push( `- **${ which } ${ RESULT_WORDS[ attempt.status ] || attempt.status }**${ time }${ where && 'passed' !== attempt.status ? `, during **${ markdownText( where ) }**` : '' }` );

			if ( 'passed' === attempt.status || 'skipped' === attempt.status ) {
				continue;
			}

			if ( attempt.reason ) {
				out.push( `  - Why: ${ markdownText( attempt.reason ) }` );
			}

			if ( attempt.action ) {
				out.push( `  - Last thing it did: \`${ attempt.action.replace( /`/g, "'" ) }\`` );
			}

			if ( recorded( attempt ) ) {
				out.push( `  - Recorded: ${ recorded( attempt ) }` );
			}
		}

		const firstFailure = test.tries.find( ( attempt ) => attempt.error );

		if ( firstFailure ) {
			out.push( '', '<details><summary>The error from try ' + firstFailure.number + '</summary>', '', '````text', shortened( firstFailure.error ).replace( /````/g, '` ` ` `' ), '````', '', '</details>' );
		}

		out.push( '' );
	}

	return out.join( '\n' ) + '\n';
}

/**
 * @param {string} text anything
 * @return {string} the text made safe to sit in HTML
 */
function htmlText( text ) {
	return String( text )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' );
}

/**
 * Reads what a test attached, whether it was handed over as a file or as the bytes themselves
 *
 * @param {Object} attachment a Playwright attachment
 * @return {Buffer|null} its bytes, or null when the file is gone
 */
function bytesOf( attachment ) {
	if ( attachment.body ) {
		return Buffer.from( attachment.body );
	}

	try {
		return fs.readFileSync( attachment.path );
	} catch {
		return null;
	}
}

const PAGE_STYLE = `
:root { color-scheme: light dark; --page: #f6f7f7; --card: #fff; --ink: #1d2327; --soft: #50575e; --line: #dcdcde; --bad: #b32d2e; --bad-bg: #fcf0f1; --good: #007017; --code: #f0f0f1; }
@media (prefers-color-scheme: dark) { :root { --page: #101517; --card: #1d2327; --ink: #f0f0f1; --soft: #a7aaad; --line: #3c434a; --bad: #ff8085; --bad-bg: #3a1f21; --good: #68de7c; --code: #2c3338; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 48px; background: var(--page); color: var(--ink); font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1040px; margin: 0 auto; }
h1 { font-size: 24px; margin: 0 0 8px; }
h2 { font-size: 20px; margin: 0 0 4px; overflow-wrap: anywhere; }
h3 { font-size: 16px; margin: 0 0 8px; }
p { margin: 0 0 8px; }
.lead { color: var(--soft); margin-bottom: 24px; }
.test { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.where { color: var(--soft); font-size: 14px; margin-bottom: 16px; overflow-wrap: anywhere; }
.try { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px; }
.failed h3 { color: var(--bad); }
.passed h3 { color: var(--good); }
.why { background: var(--bad-bg); border-left: 4px solid var(--bad); padding: 12px 16px; margin: 0 0 12px; overflow-wrap: anywhere; }
.why strong { display: block; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 12px; font-size: 14px; }
dt { color: var(--soft); }
dd { margin: 0; overflow-wrap: anywhere; }
pre { background: var(--code); border-radius: 4px; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin: 0 0 12px; }
code { font: 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--code); border-radius: 3px; padding: 1px 4px; }
details { margin-bottom: 12px; }
summary { cursor: pointer; color: var(--soft); font-size: 14px; }
figure { margin: 0 0 16px; }
figcaption { color: var(--soft); font-size: 14px; margin-bottom: 4px; }
img, video { display: block; max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
`;

/**
 * One try of a test, as HTML
 *
 * @param {Object} attempt the try
 * @return {string} HTML
 */
function renderTry( attempt ) {
	const word = RESULT_WORDS[ attempt.status ] || attempt.status;
	const good = 'passed' === attempt.status;
	const out  = [ `<section class="try ${ good ? 'passed' : 'failed' }">`, `<h3>Try ${ attempt.number } ${ htmlText( word ) } after ${ seconds( attempt.duration ) }</h3>` ];

	if ( good || 'skipped' === attempt.status ) {
		return out.concat( '</section>' ).join( '\n' );
	}

	const where = during( attempt.steps );

	if ( attempt.reason ) {
		out.push( `<p class="why"><strong>Why it failed</strong>${ htmlText( attempt.reason ) }</p>` );
	}

	out.push( '<dl>' );

	if ( where ) {
		out.push( `<dt>Part of the test</dt><dd>${ htmlText( where ) }</dd>` );
	}

	if ( attempt.action ) {
		out.push( `<dt>Last thing it did</dt><dd><code>${ htmlText( attempt.action ) }</code></dd>` );
	}

	for ( const trace of attempt.traces ) {
		out.push( `<dt>Trace</dt><dd><code>${ htmlText( path.relative( process.cwd(), trace ) ) }</code> in the test results download, opened with <code>npx playwright show-trace</code></dd>` );
	}

	out.push( '</dl>' );

	for ( const note of attempt.notes ) {
		const bytes = bytesOf( note );

		if ( bytes ) {
			out.push( `<details open><summary>${ htmlText( note.name ) }</summary><pre>${ htmlText( bytes.toString( 'utf8' ) ) }</pre></details>` );
		}
	}

	if ( attempt.error ) {
		out.push( `<details><summary>The whole error</summary><pre>${ htmlText( shortened( attempt.error ) ) }</pre></details>` );
	}

	for ( const image of attempt.images ) {
		const bytes = bytesOf( image );

		// Playwright's own picture is taken as the try ends and is only called "screenshot"
		const caption = 'screenshot' === image.name ? 'The page when this try ended' : image.name;

		if ( bytes ) {
			out.push( `<figure><figcaption>${ htmlText( caption ) }</figcaption><img alt="${ htmlText( caption ) }" src="data:${ htmlText( image.contentType ) };base64,${ bytes.toString( 'base64' ) }"></figure>` );
		}
	}

	for ( const video of attempt.videos ) {
		const bytes = bytesOf( video );

		if ( ! bytes ) {
			continue;
		}

		if ( bytes.length > MAX_VIDEO_BYTES ) {
			out.push( `<p>A video of this try was recorded but is too large to put in this page (${ Math.round( bytes.length / 1024 / 1024 ) }MB). It is in the test results download.</p>` );
			continue;
		}

		out.push( `<figure><figcaption>Video of this try</figcaption><video controls preload="metadata" src="data:${ htmlText( video.contentType ) };base64,${ bytes.toString( 'base64' ) }"></video></figure>` );
	}

	return out.concat( '</section>' ).join( '\n' );
}

/**
 * The page a person opens: everything in the summary, and what was recorded
 *
 * @param {Object} report what collect() returned
 * @param {string} name   what this run is called, shown in the heading
 * @return {string} a whole HTML document
 */
function renderHtml( report, name = '' ) {
	const tests = report.tests.map( ( test ) => [
		'<article class="test">',
		`<h2>${ htmlText( test.title ) }</h2>`,
		`<p class="where">${ [ test.group, test.browser, test.file ].filter( Boolean ).map( htmlText ).join( ' · ' ) }</p>`,
		...test.tries.map( renderTry ),
		'</article>',
	].join( '\n' ) );

	return [
		'<!doctype html>',
		'<html lang="en">',
		'<head>',
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<title>E2E failures${ name ? ` – ${ htmlText( name ) }` : '' }</title>`,
		`<style>${ PAGE_STYLE }</style>`,
		'</head>',
		'<body>',
		'<main>',
		`<h1>What went wrong in the browser tests${ name ? ` (${ htmlText( name ) })` : '' }</h1>`,
		`<p class="lead">${ headline( report ).map( htmlText ).join( ' ' ) }</p>`,
		...tests,
		'</main>',
		'</body>',
		'</html>',
		'',
	].join( '\n' );
}

class FailureReport {
	/**
	 * @param {Object} options
	 * @param {string} options.name         the file is e2e-failures-<name>.html, E2E_REPORT_NAME when not given
	 * @param {string} options.outputFolder where the file goes, the working directory when not given
	 */
	constructor( options = {} ) {
		this.name = options.name || process.env.E2E_REPORT_NAME || '';
		this.file = path.join( options.outputFolder || process.cwd(), `e2e-failures${ this.name ? `-${ this.name }` : '' }.html` );
	}

	printsToStdio() {
		return false;
	}

	onBegin( config, suite ) {
		this.config = config;
		this.suite  = suite;

		// A page left by an earlier run would read as this run's
		fs.rmSync( this.file, { force: true } );
	}

	onEnd() {
		const report = collect( this.suite.allTests(), { failOnFlaky: !! this.config.failOnFlakyTests } );

		if ( ! report.tests.length ) {
			return;
		}

		fs.writeFileSync( this.file, renderHtml( report, this.name ) );

		if ( process.env.GITHUB_STEP_SUMMARY ) {
			fs.appendFileSync( process.env.GITHUB_STEP_SUMMARY, renderSummary( report ) );
		}

		process.stdout.write( `\nWhat failed, with screenshots and video: ${ path.relative( process.cwd(), this.file ) }\n` );
	}
}

module.exports = FailureReport;
module.exports.collect       = collect;
module.exports.renderSummary = renderSummary;
module.exports.renderHtml    = renderHtml;
