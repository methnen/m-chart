/**
 * The settings page, and the iframe embed that one of its settings switches on
 *
 * These change settings for the whole site, and a chart on any other test's page would start arriving in an iframe
 * the moment embeds are enabled, so this file is kept out of the parallel run: playwright.config.js gives it
 * a project of its own that starts only after everything else has finished, and its tests run one at a time
 */

const { test, expect, wpCli, trackChartRender, watchPage } = require( './fixtures' );

const SETTINGS_PAGE = [ 'edit.php', 'post_type=m-chart&page=m-chart-settings' ];

// The settings as they were, put back when this file is done
let settingsBefore = null;

test.describe.configure( { mode: 'serial' } );

test.describe( '@site-settings Settings and embeds', () => {
	test.beforeAll( () => {
		try {
			settingsBefore = wpCli( [ 'option', 'get', 'm-chart', '--format=json' ] );
		} catch {
			// Never saved, the plugin is running on its defaults
			settingsBefore = null;
		}

		// On a fresh install the Freemius opt-in screen stands in for the plugin's menu, Settings included,
		// until the user opts in or skips
		// Skip it the way the Skip button does, which only records the choice on this site
		// The option holds PHP objects, so it is kept aside in PHP and not read out as JSON
		wpCli( [ 'eval', `
			update_option( 'm_chart_e2e_fs_accounts', get_option( 'fs_accounts' ), false );
			m_chart_fs()->skip_connection();
		` ] );
	} );

	test.afterAll( () => {
		if ( null === settingsBefore ) {
			try {
				wpCli( [ 'option', 'delete', 'm-chart' ] );
			} catch {
				// Nothing was saved
			}
		} else {
			wpCli( [ 'option', 'update', 'm-chart', settingsBefore, '--format=json' ] );
		}

		// The embed endpoint is part of the rewrite rules
		wpCli( [ 'rewrite', 'flush' ] );

		// Back to whatever the opt-in state was
		wpCli( [ 'eval', `
			$before = get_option( 'm_chart_e2e_fs_accounts', null );

			if ( null !== $before ) {
				update_option( 'fs_accounts', $before );
				delete_option( 'm_chart_e2e_fs_accounts' );
			}
		` ] );
	} );

	test( 'a saved setting is kept and used', async ( { page, admin } ) => {
		await admin.visitAdminPage( ...SETTINGS_PAGE );

		const height = page.locator( '[name="m-chart[default_height]"]' );

		await height.fill( '555' );
		await page.locator( '#m-chart-settings-page #submit' ).click();
		await page.waitForLoadState( 'load' );

		await admin.visitAdminPage( ...SETTINGS_PAGE );
		await expect( page.locator( '[name="m-chart[default_height]"]' ) ).toHaveValue( '555' );

		// A new chart starts at that height
		await admin.visitAdminPage( 'post-new.php', 'post_type=m-chart' );
		await expect( page.locator( '[name="m-chart[height]"]' ) ).toHaveValue( '555' );
	} );

	test( 'an Editor cannot open the settings page', async ( { editorPage } ) => {
		const response = await editorPage.goto( `/wp-admin/${ SETTINGS_PAGE[ 0 ] }?${ SETTINGS_PAGE[ 1 ] }` );

		expect( response.status() ).toBe( 403 );
		await expect( editorPage.locator( '#m-chart-settings-page' ) ).toHaveCount( 0 );
	} );

	test( 'the embed is refused until embeds are switched on', async ( { page, requestUtils, chartFactory } ) => {
		const chart = await chartFactory( { title: 'Embed refused' } );
		const link  = ( await requestUtils.rest( { path: `/wp/v2/m-chart/${ chart.id }` } ) ).link;

		const response = await page.goto( `${ link }embed/` );

		// Either the endpoint is not there at all or it answers that embeds are off, the chart is never served
		expect( [ 403, 404 ] ).toContain( response.status() );
		await expect( page.locator( 'canvas.m-chart' ) ).toHaveCount( 0 );
	} );

	test( 'with embeds on a chart is served in a locked down iframe document', async ( { page, admin, requestUtils, chartFactory, postFactory } ) => {
		await admin.visitAdminPage( ...SETTINGS_PAGE );
		await page.locator( '[name="m-chart[embeds]"]' ).check();
		await page.locator( '#m-chart-settings-page #submit' ).click();
		await page.waitForLoadState( 'load' );

		const chart = await chartFactory( {
			title: 'Embedded chart',
			meta:  { data: { sets: [ [ [ '', 'Sales' ], [ 'North', 5 ], [ 'South', 6 ] ] ] } },
		} );

		const link = ( await requestUtils.rest( { path: `/wp/v2/m-chart/${ chart.id }` } ) ).link;
		const seen = watchPage( page );

		await trackChartRender( page );

		const response = await page.goto( `${ link }embed/` );

		expect( response.status() ).toBe( 200 );

		// Nothing is allowed by default, scripts need the page's own nonce
		const policy = response.headers()[ 'content-security-policy' ];

		expect( policy ).toContain( "default-src 'none'" );
		expect( policy ).toMatch( /script-src 'self' 'nonce-[A-Za-z0-9+/=_-]+'/ );
		expect( policy ).toContain( 'frame-ancestors' );

		// And the chart still draws under that policy, with nothing refused
		await page.waitForFunction( () => true === window.__mchartRenderDone );

		expect( await page.evaluate( () => window.Chart.getChart( document.querySelector( 'canvas.m-chart' ) ).data.labels.length ) ).toBeGreaterThan( 0 );
		expect( seen.errors ).toEqual( [] );

		// A shortcode now arrives as an iframe pointing at that document
		const post = await postFactory( { content: `[chart id="${ chart.id }"]`, title: 'Embed carrier' } );

		await page.goto( `/?p=${ post.id }` );

		const frame = page.locator( 'iframe.m-chart-iframe' );

		await expect( frame ).toHaveAttribute( 'src', /\/embed\// );
		await expect( page.frameLocator( 'iframe.m-chart-iframe' ).locator( 'canvas.m-chart' ) ).toBeVisible();
	} );

	test( 'switching embeds off again refuses the embed', async ( { page, admin, requestUtils, chartFactory } ) => {
		await admin.visitAdminPage( ...SETTINGS_PAGE );
		await page.locator( '[name="m-chart[embeds]"]' ).uncheck();
		await page.locator( '#m-chart-settings-page #submit' ).click();
		await page.waitForLoadState( 'load' );

		const chart = await chartFactory( { title: 'Embed off again' } );
		const link  = ( await requestUtils.rest( { path: `/wp/v2/m-chart/${ chart.id }` } ) ).link;

		const response = await page.goto( `${ link }embed/` );

		expect( [ 403, 404 ] ).toContain( response.status() );
	} );
} );
