/**
 * The chart block in the block editor: find a chart, pick it, choose how it is shown, publish
 */

const { test, expect, step, trackChartRender, expectChartRendered, watchPage, expectNoPageErrors, expectNoDialogs } = require( './fixtures' );

/**
 * Inserts the chart block into a new post and returns a locator for it
 *
 * The block's markup is inside the editor's iframe when the editor uses one and in the page itself when it doesn't,
 * which depends on the WordPress version and on what else is registered, so this looks instead of assuming
 *
 * A block inserted the instant the editor opens can be thrown away when the editor finishes loading the new post
 * and resets its content, so the insert is repeated until the block is there and stays there
 *
 * @param {Object} page   Playwright page
 * @param {Object} editor Editor helper from @wordpress/e2e-test-utils-playwright
 * @return {Promise<Object>} a locator for the chart block
 */
function insertChartBlock( page, editor ) {
	return step( 'Insert the chart block', async () => {
		const blockCount = () => page.evaluate( () =>
			window.wp.data.select( 'core/block-editor' ).getBlocks().filter( ( block ) => 'm-chart/chart' === block.name ).length
		);

		await expect( async () => {
			if ( 0 === await blockCount() ) {
				await editor.insertBlock( { name: 'm-chart/chart' } );
			}

			// Still there once the editor has had a moment to settle
			await page.waitForTimeout( 500 );
			expect( await blockCount(), 'chart blocks in the post after inserting one' ).toBe( 1 );
		} ).toPass( { timeout: 20000 } );

		const root  = await page.locator( 'iframe[name="editor-canvas"]' ).count() ? editor.canvas : page;
		const block = root.locator( '.m-chart-selector' );

		await expect( block, 'the chart block in the editor' ).toBeVisible();

		return block;
	} );
}

test.describe( 'Chart block', () => {
	test( 'a chart can be found, inserted and shown as a table', async ( { page, admin, editor, requestUtils, chartFactory, cleanup } ) => {
		const seen = watchPage( page );

		// A title no other test's chart shares, so the search has exactly one answer
		const title = `Block pick ${ Date.now() }`;
		const chart = await chartFactory( {
			title,
			meta: { type: 'column', data: { sets: [ [ [ '', 'Sales' ], [ 'North', 11 ], [ 'South', 22 ] ] ] } },
		} );

		await admin.createNewPost( { title: 'Block test' } );
		const block = await insertChartBlock( page, editor );

		await step( 'Search for the chart and pick it', async () => {
			await block.getByPlaceholder( 'Search by title' ).fill( title );
			await block.getByRole( 'button', { name: `Select chart: ${ title }` } ).click();

			// The block now shows the chart it holds
			await expect( block.locator( '.chart-selected' ), 'the block showing the chart it now holds' ).toBeVisible();
			await expect( block.locator( '.chart-selected' ), 'the name of the chart the block holds' ).toContainText( title );
		} );

		await step( 'Choose to show it as a table', async () => {
			await editor.openDocumentSettingsSidebar();
			await page.getByRole( 'combobox', { name: 'Show' } ).selectOption( 'table' );
		} );

		const postId = await step( 'Publish the post', async () => {
			const id = await editor.publishPost();

			cleanup.post( id );

			return id;
		} );

		await step( 'Open the published post', async () => {
			await page.goto( `/?p=${ postId }` );

			const table = page.locator( 'table.m-chart-table' );

			await expect( table, 'the chart as a table on the public page' ).toBeVisible();
			await expect( table, 'the table on the public page' ).toContainText( 'North' );
			await expect( table, 'the table on the public page' ).toContainText( '22' );
			await expect( page.locator( 'canvas.m-chart' ), 'a drawn chart, where only the table should be' ).toHaveCount( 0 );
		} );

		await step( 'Check what the block stored in the post', async () => {
			// The block stores which chart and how, nothing else
			const raw = ( await requestUtils.rest( { path: `/wp/v2/posts/${ postId }`, params: { context: 'edit' } } ) ).content.raw;

			expect( raw, 'the post content as stored' ).toContain( 'wp:m-chart/chart' );
			expect( raw, 'the post content as stored' ).toContain( `"chartId":${ chart.id }` );
		} );

		await expectNoDialogs( seen );
		await expectNoPageErrors( seen );
	} );

	test( 'the block draws the chart by default', async ( { page, admin, editor, chartFactory, cleanup } ) => {
		const title = `Block draw ${ Date.now() }`;

		await chartFactory( { title } );

		await admin.createNewPost( { title: 'Block chart test' } );
		const block = await insertChartBlock( page, editor );

		await step( 'Search for the chart and pick it', async () => {
			await block.getByPlaceholder( 'Search by title' ).fill( title );
			await block.getByRole( 'button', { name: `Select chart: ${ title }` } ).click();
			await expect( block.locator( '.chart-selected' ), 'the block showing the chart it now holds' ).toBeVisible();
		} );

		const postId = await step( 'Publish the post', async () => {
			const id = await editor.publishPost();

			cleanup.post( id );

			return id;
		} );

		await step( 'Open the published post', async () => {
			await trackChartRender( page );
			await page.goto( `/?p=${ postId }` );
			await expectChartRendered( page );

			await expect( page.locator( 'canvas.m-chart' ), 'charts drawn on the public page' ).toHaveCount( 1 );
		} );
	} );

	test( 'a search with no match says so', async ( { page, admin, editor, chartFactory } ) => {
		// With no charts on the site at all the block offers to create one and has no search box,
		// so make sure there is one, whatever the other tests are doing at this moment
		await chartFactory( { title: `Block search ${ Date.now() }` } );

		await admin.createNewPost( { title: 'Block empty search' } );
		const block = await insertChartBlock( page, editor );

		await step( 'Search for a title no chart has', async () => {
			await block.getByPlaceholder( 'Search by title' ).fill( `nothing-is-called-this-${ Date.now() }` );

			await expect( block, 'what the block says when nothing matches' ).toContainText( 'No charts found' );
		} );
	} );

	test( 'a search that fails keeps the search box, and searching again recovers', async ( { page, admin, editor, chartFactory } ) => {
		const title = `Block retry ${ Date.now() }`;

		await chartFactory( { title } );

		await admin.createNewPost( { title: 'Block failed search' } );

		const block  = await insertChartBlock( page, editor );
		const search = block.getByPlaceholder( 'Search by title' );

		// The server falls over for searches, the way a timeout or a bad deploy would look
		const searches = /m-chart(\/|%2F)v1(\/|%2F)charts[^#]*[?&]s=/;

		await step( 'Search while the server answers with an error', async () => {
			await page.route( searches, ( route ) => route.fulfill( {
				status:      500,
				contentType: 'application/json',
				body:        JSON.stringify( { code: 'internal_server_error', message: 'Server error', data: { status: 500 } } ),
			} ) );

			await search.fill( 'anything' );

			await expect( block.getByRole( 'alert' ), 'the message shown when the search fails' ).toHaveText( 'There was a problem loading charts' );

			// The box is still there to type in, which is how the search gets tried again
			await expect( search, 'the search box after a failed search' ).toBeVisible();
			await expect( search, 'the search box after a failed search' ).toHaveValue( 'anything' );
		} );

		await step( 'Search again once the server is back', async () => {
			await page.unroute( searches );
			await search.fill( title );

			await expect( block.getByRole( 'button', { name: `Select chart: ${ title }` } ), 'the chart in the search results' ).toBeVisible();
			await expect( block.getByRole( 'alert' ), 'the error message, which should be gone' ).toHaveCount( 0 );
		} );
	} );
} );
