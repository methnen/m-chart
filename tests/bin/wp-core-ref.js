/**
 * Prints the WordPress source wp-env should use for a named version, in the form WP_ENV_CORE takes
 *
 *   latest  the current release, looked up from api.wordpress.org so no workflow needs editing when one comes out
 *   trunk   WordPress trunk (the master branch of the GitHub mirror, which has no branch called trunk)
 *   6.6     that release branch
 *
 * Usage: WP_ENV_CORE=$(node tests/bin/wp-core-ref.js latest) npx wp-env start
 */

const VERSION_CHECK = 'https://api.wordpress.org/core/version-check/1.7/';

async function latestRelease() {
	const response = await fetch( VERSION_CHECK );

	if ( ! response.ok ) {
		throw new Error( `api.wordpress.org answered ${ response.status }` );
	}

	const version = ( await response.json() )?.offers?.[ 0 ]?.version;

	if ( 'string' !== typeof version || ! /^\d+\.\d+(\.\d+)?$/.test( version ) ) {
		throw new Error( `api.wordpress.org did not return a release version (got ${ JSON.stringify( version ) })` );
	}

	return version;
}

async function main() {
	const wanted = ( process.argv[ 2 ] || 'latest' ).trim();

	if ( 'trunk' === wanted ) {
		return 'WordPress/WordPress#master';
	}

	if ( 'latest' === wanted ) {
		return `WordPress/WordPress#${ await latestRelease() }`;
	}

	if ( ! /^\d+\.\d+(\.\d+)?$/.test( wanted ) ) {
		throw new Error( `"${ wanted }" is not latest, trunk or a version number` );
	}

	return `WordPress/WordPress#${ wanted }`;
}

main().then(
	( ref ) => console.log( ref ),
	( error ) => {
		console.error( `✖ Could not work out the WordPress version: ${ error.message }` );
		process.exit( 1 );
	}
);
