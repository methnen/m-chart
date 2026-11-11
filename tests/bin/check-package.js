/**
 * Checks the contents of the release zip that npm run build:zip makes
 *
 * build:zip uses the same .distignore as the WordPress.org deploy, so what is in the zip is what would be published
 * A stale .distignore line once shipped the unminified helper, and a zip built after a browser test run
 * picked up a login cookie file: this fails on anything that should not be there and on anything missing
 *
 * Usage: node tests/bin/check-package.js [path/to/m-chart-x.y.z.zip]
 */

const fs               = require( 'fs' );
const path             = require( 'path' );
const { execFileSync } = require( 'child_process' );

const ROOT = path.resolve( __dirname, '..', '..' );
const SLUG = 'm-chart';

// WordPress.org refuses a zip over 10MB
const MAX_BYTES = 10 * 1024 * 1024;

// Files the plugin can't run without
const REQUIRED = [
	'm-chart.php',
	'readme.txt',
	'LICENSE.md',
	'components/class-m-chart.php',
	'components/class-m-chart-admin.php',
	'components/class-m-chart-block.php',
	'components/class-m-chart-chartjs.php',
	'components/class-m-chart-parse.php',
	'components/admin-ui/index.js',
	'components/admin-ui/index.asset.php',
	'components/block/index.js',
	'components/block/index.asset.php',
	'components/css/m-chart-admin.css',
	'components/css/m-chart-frontend.css',
	'components/js/m-chart-chartjs-helper.min.js',
	'components/templates/chartjs-chart.php',
	'components/templates/table.php',
	'components/templates/iframe.php',
	'components/external/chartjs/chart.js',
	'components/external/jspreadsheet/jspreadsheet.js',
	'components/external/jsuites/jsuites.js',
	'components/external/freemius/start.php',
	'components/external/parsecsv/parsecsv.lib.php',
];

// The only things allowed beside components/ at the top of the plugin
const TOP_LEVEL = [ 'm-chart.php', 'readme.txt', 'LICENSE.md', 'components' ];

// What must never ship, anywhere in the zip
const FORBIDDEN_ANYWHERE = [
	[ /(^|\/)\.[^/]+/,           'a dotfile or dot directory' ],
	[ /(^|\/)node_modules\//,    'node_modules' ],
	[ /\.map$/,                  'a source map' ],
	[ /\.zip$/,                  'a zip' ],
	[ /\.log$/,                  'a log' ],
	[ /\.scss$/,                 'Sass source' ],
	[ /(^|\/)[^/]*-src\//,       'uncompiled source' ],
	[ /(^|\/)package(-lock)?\.json$/, 'an npm manifest' ],
];

// What must not ship outside the vendored libraries, which carry a few of their own
const FORBIDDEN_OUTSIDE_EXTERNAL = [
	[ /(^|\/)tests?\//,            'tests' ],
	[ /(^|\/)vendor\//,            'Composer packages' ],
	[ /composer\.(json|lock)$/,    'a Composer manifest' ],
	[ /\.(yml|yaml|xml|sh|dist)$/, 'a config or script file' ],
	[ /\.md$/,                     'a Markdown file' ],
];

function fail( problems ) {
	console.error( '' );
	console.error( `✖ The release zip is not right (${ problems.length } problem${ 1 === problems.length ? '' : 's' })` );

	for ( const problem of problems ) {
		console.error( `  - ${ problem }` );
	}

	console.error( '' );
	process.exit( 1 );
}

function stableTag() {
	const readme = fs.readFileSync( path.join( ROOT, 'readme.txt' ), 'utf8' );

	return readme.match( /^Stable tag:\s*(.+)$/m )?.[ 1 ]?.trim();
}

const zip = path.resolve( process.argv[ 2 ] || path.join( ROOT, `${ SLUG }-${ stableTag() }.zip` ) );

if ( ! fs.existsSync( zip ) ) {
	fail( [ `${ zip } does not exist, run npm run build:zip first` ] );
}

const entries = execFileSync( 'unzip', [ '-Z1', zip ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 } )
	.split( '\n' )
	.filter( Boolean );

const problems = [];
const outside  = entries.filter( ( entry ) => ! entry.startsWith( `${ SLUG }/` ) );

if ( outside.length ) {
	problems.push( `Everything has to be inside ${ SLUG }/, found: ${ outside.slice( 0, 5 ).join( ', ' ) }` );
}

// Paths relative to the plugin folder, directories left out
const files = entries
	.filter( ( entry ) => entry.startsWith( `${ SLUG }/` ) && ! entry.endsWith( '/' ) )
	.map( ( entry ) => entry.slice( SLUG.length + 1 ) );

for ( const required of REQUIRED ) {
	if ( ! files.includes( required ) ) {
		problems.push( `Missing ${ required }` );
	}
}

for ( const file of files ) {
	const top = file.split( '/' )[ 0 ];

	if ( ! TOP_LEVEL.includes( top ) ) {
		problems.push( `${ file } should not ship (only ${ TOP_LEVEL.join( ', ' ) } belong at the top level)` );
		continue;
	}

	const rules = file.startsWith( 'components/external/' )
		? FORBIDDEN_ANYWHERE
		: [ ...FORBIDDEN_ANYWHERE, ...FORBIDDEN_OUTSIDE_EXTERNAL ];

	// LICENSE.md is the one Markdown file that belongs
	if ( 'LICENSE.md' === file ) {
		continue;
	}

	for ( const [ pattern, what ] of rules ) {
		if ( pattern.test( file ) ) {
			problems.push( `${ file } should not ship (${ what })` );
			break;
		}
	}
}

// A script that ships minified should not also ship as source
for ( const file of files ) {
	if ( file.endsWith( '.min.js' ) && ! file.startsWith( 'components/external/' ) && files.includes( file.replace( /\.min\.js$/, '.js' ) ) ) {
		problems.push( `${ file.replace( /\.min\.js$/, '.js' ) } should not ship (its minified build does)` );
	}
}

const bytes = fs.statSync( zip ).size;

if ( bytes > MAX_BYTES ) {
	problems.push( `The zip is ${ ( bytes / 1024 / 1024 ).toFixed( 1 ) }MB, WordPress.org allows 10MB` );
}

if ( problems.length ) {
	fail( problems );
}

console.log( `✔ ${ path.basename( zip ) }: ${ files.length } files, ${ ( bytes / 1024 / 1024 ).toFixed( 2 ) }MB, nothing missing and nothing that should not ship` );
