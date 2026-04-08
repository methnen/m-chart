/**
 * Creates a distributable zip of the plugin using the same exclusions as the WordPress.org deploy.
 *
 * Reads .distignore to determine what to exclude, then copies the plugin into a
 * temporary m-chart/ subdirectory and zips it. The resulting zip matches the
 * standard WordPress plugin convention — unzipping installs into wp-content/plugins/m-chart/.
 *
 * Output: m-chart-{version}.zip in the plugin root directory.
 *
 * Usage: npm run build:zip
 */

const fs           = require( 'fs' );
const path         = require( 'path' );
const os           = require( 'os' );
const { execSync } = require( 'child_process' );

const ROOT = path.resolve( __dirname, '..' );
const SLUG = 'm-chart';

// Read version from readme.txt (same source as the deploy workflow)
const readme  = fs.readFileSync( path.join( ROOT, 'readme.txt' ), 'utf8' );
const version = readme.match( /^Stable tag:\s*(.+)$/m )?.[ 1 ]?.trim();

if ( ! version ) {
	console.error( 'Could not read version from readme.txt' );
	process.exit( 1 );
}

// Build rsync --exclude flags from .distignore (same exclusions as WP.org deploy)
const distignore  = fs.readFileSync( path.join( ROOT, '.distignore' ), 'utf8' );
const excludeArgs = distignore
	.split( '\n' )
	.map( ( line ) => line.trim() )
	.filter( ( line ) => line && ! line.startsWith( '#' ) )
	.map( ( pattern ) => `--exclude='${ pattern }'` )
	.join( ' ' );

const tmpDir    = fs.mkdtempSync( path.join( os.tmpdir(), 'm-chart-zip-' ) );
const pluginDir = path.join( tmpDir, SLUG );
const outFile   = path.join( ROOT, `${ SLUG }-${ version }.zip` );

fs.mkdirSync( pluginDir );

// Remove any existing zip before rsync so it doesn't end up inside the new one
if ( fs.existsSync( outFile ) ) {
	fs.unlinkSync( outFile );
}

try {
	console.log( `Building ${ SLUG }-${ version }.zip...` );

	// Copy plugin files honouring the same exclusions as the WP.org deploy
	execSync(
		`rsync -a ${ excludeArgs } '${ ROOT }/' '${ pluginDir }/'`,
		{ stdio: 'inherit', shell: '/bin/sh' }
	);

	// Create the zip with m-chart/ at its root
	execSync(
		`zip -r '${ outFile }' '${ SLUG }/'`,
		{ cwd: tmpDir, stdio: 'inherit' }
	);

	console.log( `\nCreated: ${ SLUG }-${ version }.zip` );
} finally {
	fs.rmSync( tmpDir, { recursive: true, force: true } );
}
