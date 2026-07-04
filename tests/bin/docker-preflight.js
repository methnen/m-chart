/**
 * Preflight check for the E2E suite: fail fast with a friendly message when
 * Docker isn't available, instead of letting wp-env die on a cryptic socket
 * error several layers deep.
 *
 * Wired up as the `pretest:e2e` / `pretest:a11y` npm hook.
 */

const { execFileSync } = require( 'child_process' );

try {
	execFileSync( 'docker', [ 'info' ], { stdio: 'ignore' } );
} catch ( error ) {
	const missing = 'ENOENT' === error.code;

	console.error( '' );
	console.error(
		missing
			? '✖ Docker CLI not found — the E2E suite runs WordPress in Docker via wp-env.'
			: '✖ Docker daemon is not running — the E2E suite runs WordPress in Docker via wp-env.'
	);
	console.error( '' );
	console.error( '  Start it first:' );
	console.error( '    colima start          # if you use Colima' );
	console.error( '    open -a Docker        # if you use Docker Desktop' );
	console.error( '' );

	process.exit( 1 );
}
