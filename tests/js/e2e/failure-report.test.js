/**
 * The reporter that explains a failed browser test (tests/e2e/reporters/failure-report.js)
 *
 * It only has work to do when a browser test fails, which is rare, so nothing else would notice it had stopped working
 * These feed it made-up results shaped like Playwright's and read what it writes
 */

const fs   = require( 'fs' );
const os   = require( 'os' );
const path = require( 'path' );

const FailureReport = require( '../../e2e/reporters/failure-report' );
const { collect, renderSummary, renderHtml } = FailureReport;

const ROOT = path.join( path.sep, 'repo' );

// What Playwright puts round the values in an error when it prints to a terminal
const RED   = '\u001b[31m';
const RESET = '\u001b[39m';

/**
 * A step the way Playwright reports one
 *
 * @param {string}  category 'test.step' for a named step, 'expect' or 'pw:api' for what a test did inside one
 * @param {string}  title
 * @param {boolean} failed
 * @param {Array}   steps    the steps inside this one
 * @return {Object} a TestStep
 */
function aStep( category, title, failed = false, steps = [] ) {
	return { category, title, steps, error: failed ? { message: 'failed' } : undefined };
}

/**
 * One try of a test the way Playwright reports it
 *
 * @param {Object} overrides
 * @return {Object} a TestResult
 */
function aTry( overrides = {} ) {
	return { retry: 0, status: 'passed', duration: 1200, errors: [], steps: [], attachments: [], ...overrides };
}

/**
 * A test the way Playwright reports it
 *
 * @param {string}   title
 * @param {string}   outcome 'expected', 'unexpected' or 'flaky'
 * @param {Object[]} results its tries
 * @return {Object} a TestCase
 */
function aTest( title, outcome, results ) {
	return {
		title,
		timeout:   60000,
		results,
		location:  { file: path.join( ROOT, 'tests', 'e2e', 'chart-create.spec.js' ), line: 33 },
		parent:    { project: () => ( { name: 'webkit' } ) },
		outcome:   () => outcome,
		titlePath: () => [ '', 'webkit', 'chart-create.spec.js', 'Creating a chart', title ],
	};
}

const PNG = Buffer.from( 'not really a picture' );

const failedTry = aTry( {
	status:   'failed',
	duration: 41000,
	errors:   [ {
		message: [
			'Error: the page reported 1 error while the test ran',
			'',
			'expect(received).toEqual(expected) // deep equality',
			'',
			`${ RED }- Expected  - 1${ RESET }`,
			`${ RED }+ Received  + 3${ RESET }`,
			'',
			'- Array []',
			'+ Array [',
			'+   "Uncaught error on /wp-admin/post.php during \\"Publish the chart\\": it broke",',
			'+ ]',
		].join( '\n' ),
	} ],
	steps: [
		aStep( 'test.step', 'Open the new chart screen' ),
		aStep( 'test.step', 'Publish the chart', true, [
			aStep( 'pw:api', "Click locator('#publish')" ),
			aStep( 'expect', 'the page reported 1 error while the test ran', true ),
		] ),
	],
	attachments: [
		{ name: 'screenshot', contentType: 'image/png', body: PNG },
		{ name: 'video', contentType: 'video/webm', body: Buffer.from( 'not really a video' ) },
		{ name: 'trace', contentType: 'application/zip', path: path.join( ROOT, 'test-results', 'chart-create-webkit', 'trace.zip' ) },
		{ name: 'What the page reported', contentType: 'text/plain', body: Buffer.from( 'Uncaught error on /wp-admin/post.php\n    at send (jquery.js:2)' ) },
	],
} );

const TESTS = [
	aTest( 'a new chart can be built <b> [show="table"]', 'flaky', [ failedTry, aTry( { retry: 1, duration: 38000 } ) ] ),
	aTest( 'a chart can be exported', 'unexpected', [ 0, 1, 2 ].map( ( retry ) => aTry( {
		retry,
		status: 'timedOut',
		errors: [ { message: 'Test timeout of 60000ms exceeded.' } ],
		steps:  [ aStep( 'test.step', 'Export the sheet', false, [ aStep( 'pw:api', "Click getByRole('button')" ) ] ) ],
	} ) ) ),
	aTest( 'a test that passed', 'expected', [ aTry() ] ),
];

describe( 'collect()', () => {
	test( 'keeps the tests that failed or needed a retry and leaves out the ones that passed', () => {
		const report = collect( TESTS, { failOnFlaky: true, cwd: ROOT } );

		expect( report.tests.map( ( { title } ) => title ) ).toEqual( [ 'a new chart can be built <b> [show="table"]', 'a chart can be exported' ] );
		expect( report ).toMatchObject( { failed: 1, retried: 1, failOnFlaky: true } );
		expect( report.tests[ 0 ] ).toMatchObject( { group: 'Creating a chart', browser: 'webkit', file: path.join( 'tests', 'e2e', 'chart-create.spec.js' ) + ':33', retried: true } );
	} );

	test( 'says why a try failed in one line: the message of the assertion and what was found', () => {
		const [ attempt ] = collect( TESTS, { cwd: ROOT } ).tests[ 0 ].tries;

		expect( attempt.reason ).toBe( 'the page reported 1 error while the test ran — found: Uncaught error on /wp-admin/post.php during "Publish the chart": it broke' );

		// The colour codes meant for a terminal are gone from the whole error too
		expect( attempt.error ).toContain( '- Expected  - 1' );
		expect( attempt.error ).not.toContain( RED );
	} );

	test( 'gives what was expected beside what was found when the error has both', () => {
		const tests = [ aTest( 'saved type', 'unexpected', [ aTry( {
			status: 'failed',
			errors: [ { message: 'Error: the saved chart type\n\nexpect(received).toBe(expected) // Object.is equality\n\nExpected: "column"\nReceived: "line"' } ],
		} ) ] ) ];

		expect( collect( tests, { cwd: ROOT } ).tests[ 0 ].tries[ 0 ].reason ).toBe( 'the saved chart type — expected "column", found "line"' );
	} );

	test( 'names the step that failed and the last thing done in it', () => {
		const [ attempt ] = collect( TESTS, { cwd: ROOT } ).tests[ 0 ].tries;

		expect( attempt.steps ).toEqual( [ 'Publish the chart' ] );

		// The assertion that failed carries the same words as the reason, so it is not said twice
		expect( attempt.action ).toBe( '' );
	} );

	test( 'a try that ran out of time says so and names the step it was in when it stopped', () => {
		const [ attempt ] = collect( TESTS, { cwd: ROOT } ).tests[ 1 ].tries;

		expect( attempt.reason ).toBe( 'The test did not finish inside its time limit of 60s' );
		expect( attempt.steps ).toEqual( [ 'Export the sheet' ] );
	} );
} );

describe( 'renderSummary()', () => {
	const summary = renderSummary( collect( TESTS, { failOnFlaky: true, cwd: ROOT } ) );

	test( 'opens with why the run is red', () => {
		expect( summary ).toContain( '1 test failed on every try.' );
		expect( summary ).toContain( '1 test failed at first and passed on a retry.' );
		expect( summary ).toContain( 'This run counts a test that needed a retry as a failure too.' );
	} );

	test( 'explains a run that is red only because of a retry', () => {
		const onlyRetried = renderSummary( collect( [ TESTS[ 0 ] ], { failOnFlaky: true, cwd: ROOT } ) );

		expect( onlyRetried ).toContain( 'which is why the job is red although the test count says every test passed' );
		expect( renderSummary( collect( [ TESTS[ 0 ] ], { failOnFlaky: false, cwd: ROOT } ) ) ).toContain( 'does not fail the job' );
	} );

	test( 'says for each try what happened, where and why', () => {
		expect( summary ).toContain( '- **Try 1 failed** after 41s, during **Publish the chart**' );
		expect( summary ).toContain( '  - Why: the page reported 1 error while the test ran — found: Uncaught error on' );
		expect( summary ).toContain( '  - Recorded: 1 screenshot, 1 video, a trace' );
		expect( summary ).toContain( '- **Try 2 passed** after 38s' );
	} );

	test( 'says tries that went wrong the same way once', () => {
		expect( summary ).toContain( '- **Tries 1, 2 and 3 each ran out of time**, during **Export the sheet**' );
		expect( summary.match( /ran out of time/g ) ).toHaveLength( 1 );
		expect( summary ).toContain( "  - Last thing it did: `Click getByRole('button')`" );
	} );

	test( 'a title cannot break the page it is printed on', () => {
		expect( summary ).toContain( '### a new chart can be built &lt;b&gt; \\[show="table"\\]' );
		expect( summary ).not.toContain( '<b>' );
	} );
} );

describe( 'renderHtml()', () => {
	const html = renderHtml( collect( TESTS, { failOnFlaky: true, cwd: ROOT } ), 'webkit-wp-latest' );

	test( 'is one page that needs nothing else: the pictures and videos are inside it', () => {
		expect( html ).toContain( `src="data:image/png;base64,${ PNG.toString( 'base64' ) }"` );
		expect( html ).toContain( '<video controls preload="metadata" src="data:video/webm;base64,' );
		expect( html ).not.toMatch( /(src|href)="(?!data:)/ );
	} );

	test( 'says why, where, and shows what the page reported', () => {
		expect( html ).toContain( '<strong>Why it failed</strong>the page reported 1 error while the test ran' );
		expect( html ).toContain( '<dt>Part of the test</dt><dd>Publish the chart</dd>' );
		expect( html ).toContain( 'at send (jquery.js:2)' );
		expect( html ).toContain( path.join( 'test-results', 'chart-create-webkit', 'trace.zip' ) );
	} );

	test( 'a title is text, never markup', () => {
		expect( html ).toContain( '<h2>a new chart can be built &lt;b&gt; [show=&quot;table&quot;]</h2>' );
	} );
} );

describe( 'the reporter', () => {
	const folder  = fs.mkdtempSync( path.join( os.tmpdir(), 'm-chart-failure-report-' ) );
	const summary = path.join( folder, 'summary.md' );
	const page    = path.join( folder, 'e2e-failures-webkit-wp-latest.html' );
	const before  = process.env.GITHUB_STEP_SUMMARY;

	/**
	 * Runs the reporter over some tests the way Playwright would
	 *
	 * @param {Object[]} tests
	 */
	function run( tests ) {
		const reporter = new FailureReport( { name: 'webkit-wp-latest', outputFolder: folder } );
		const written  = jest.spyOn( process.stdout, 'write' ).mockImplementation( () => true );

		reporter.onBegin( { failOnFlakyTests: true }, { allTests: () => tests } );
		reporter.onEnd();
		written.mockRestore();
	}

	beforeEach( () => {
		process.env.GITHUB_STEP_SUMMARY = summary;
		fs.writeFileSync( summary, '' );
	} );

	afterAll( () => {
		if ( undefined === before ) {
			delete process.env.GITHUB_STEP_SUMMARY;
		} else {
			process.env.GITHUB_STEP_SUMMARY = before;
		}

		fs.rmSync( folder, { recursive: true, force: true } );
	} );

	test( 'writes the page and adds to the run summary when something went wrong', () => {
		run( TESTS );

		expect( fs.readFileSync( page, 'utf8' ) ).toContain( 'a chart can be exported' );
		expect( fs.readFileSync( summary, 'utf8' ) ).toContain( '## Playwright: what went wrong' );
	} );

	test( 'writes nothing when every test passed, and clears the page an earlier run left', () => {
		fs.writeFileSync( page, 'left over' );

		run( [ TESTS[ 2 ] ] );

		expect( fs.existsSync( page ) ).toBe( false );
		expect( fs.readFileSync( summary, 'utf8' ) ).toBe( '' );
	} );
} );
