/**
 * Merges per-source-file i18n JSON files into handle-named JSON files
 *
 * WordPress looks up JS translations using md5( relative-path-of-compiled-file )
 * Since wp-scripts bundles multiple source files into a single compiled file, the per-source-file hashes from `wp i18n make-json` never match 
 * WordPress falls back to {domain}-{locale}-{handle}.json, so we merge per-source-file JSONs into one file per script handle
 *
 * Handle mapping:
 *   components/admin-ui-src/** -> m-chart-admin-ui
 *   components/block-src/**   -> m-chart-editor
 */

const fs   = require( 'fs' );
const path = require( 'path' );

const LANGUAGES_DIR = path.resolve( __dirname, '..', 'components', 'languages' );
const DOMAIN        = 'm-chart';

// Map source path prefixes to script handles.
const HANDLE_MAP = {
	'components/admin-ui-src/': 'm-chart-admin-ui',
	'components/block-src/':    'm-chart-editor',
};

// Collect all hash-based JSON files grouped by locale and handle
const merged = {}; // { locale: { handle: { meta, messages } } }
const consumed = []; // files that were merged

const files = fs.readdirSync( LANGUAGES_DIR ).filter( ( f ) => {
	// Match hash-based JSON files: m-chart-{locale}-{md5}.json
	// Exclude handle-named files (already our output format)
	return /^m-chart-.+-[0-9a-f]{32}\.json$/.test( f );
} );

for ( const file of files ) {
	const filePath = path.join( LANGUAGES_DIR, file );
	let data;

	try {
		data = JSON.parse( fs.readFileSync( filePath, 'utf8' ) );
	} catch {
		console.warn( `Skipping invalid JSON: ${ file }` );
		continue;
	}

	const source = data.source || '';
	let handle = null;

	for ( const [ prefix, h ] of Object.entries( HANDLE_MAP ) ) {
		if ( source.startsWith( prefix ) ) {
			handle = h;
			break;
		}
	}

	if ( ! handle ) {
		// Not a file we need to merge (e.g. from a different source path)
		continue;
	}

	// Extract locale from filename: m-chart-{locale}-{hash}.json
	const match = file.match( /^m-chart-(.+)-[0-9a-f]{32}\.json$/ );
	if ( ! match ) {
		continue;
	}
	const locale = match[ 1 ];

	if ( ! merged[ locale ] ) {
		merged[ locale ] = {};
	}
	if ( ! merged[ locale ][ handle ] ) {
		merged[ locale ][ handle ] = {
			meta: data.locale_data?.messages?.[ '' ] || {},
			revisionDate: data[ 'translation-revision-date' ] || '',
			messages: {},
		};
	}

	const entry = merged[ locale ][ handle ];

	// Use the latest revision date
	if ( data[ 'translation-revision-date' ] > entry.revisionDate ) {
		entry.revisionDate = data[ 'translation-revision-date' ];
	}

	// Merge messages (skip the empty-string metadata key)
	const messages = data.locale_data?.messages || {};
	for ( const [ key, value ] of Object.entries( messages ) ) {
		if ( key === '' ) {
			continue;
		}
		entry.messages[ key ] = value;
	}

	consumed.push( filePath );
}

// Write merged handle-named files and remove consumed hash-based files
let created = 0;
let removed = 0;

for ( const [ locale, handles ] of Object.entries( merged ) ) {
	for ( const [ handle, entry ] of Object.entries( handles ) ) {
		const outFile = path.join(
			LANGUAGES_DIR,
			`${ DOMAIN }-${ locale }-${ handle }.json`
		);

		const output = {
			'translation-revision-date': entry.revisionDate,
			generator: 'merge-i18n-json',
			source: `merged (${ handle })`,
			domain: 'messages',
			locale_data: {
				messages: {
					'': entry.meta,
					...entry.messages,
				},
			},
		};

		fs.writeFileSync( outFile, JSON.stringify( output ) );
		created++;
		console.log( `Created: ${ DOMAIN }-${ locale }-${ handle }.json` );
	}
}

// Remove consumed hash-based files
for ( const filePath of consumed ) {
	fs.unlinkSync( filePath );
	removed++;
}

console.log( `\nDone: ${ created } merged file(s) created, ${ removed } hash-based file(s) removed.` );
