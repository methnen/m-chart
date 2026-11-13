/**
 * Sheet tabs: adding, renaming and deleting sheets on a chart type that has more than one
 */

const { test, expect, typeIntoCell, trimSheet, getSavedPostMeta } = require( './fixtures' );

const SHEET_ONE = [ [ '', 'X', 'Y' ], [ 'a', 1, 2 ], [ 'b', 3, 4 ] ];
const SHEET_TWO = [ [ '', 'X', 'Y' ], [ 'c', 5, 6 ], [ 'd', 7, 8 ] ];

test.describe( 'Sheet tabs', () => {
	test( 'sheets can be added, renamed and deleted, and the save keeps what is left', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( {
			title: 'Sheets',
			meta:  {
				type:      'scatter',
				data:      { sets: [ SHEET_ONE, SHEET_TWO ] },
				set_names: [ 'One', 'Two' ],
			},
		} );

		// A tab is the sheet's name, the box around it also holds that sheet's delete button and rename field
		const tabs      = page.locator( '#spreadsheet-tabs [role="tab"]' );
		const boxes     = page.locator( '#spreadsheet-tabs .m-chart-sheet-tab' );
		const tabTitles = () => tabs.allTextContents();

		await expect( tabs ).toHaveCount( 2 );
		expect( await tabTitles() ).toEqual( [ 'One', 'Two' ] );

		// Add a third sheet, it becomes the one being edited
		await page.locator( '#spreadsheet-tabs' ).getByRole( 'button', { name: 'Add Sheet' } ).click();

		await expect( tabs ).toHaveCount( 3 );
		await expect( tabs.nth( 2 ) ).toHaveAttribute( 'aria-selected', 'true' );

		// A new sheet opens with its name ready to be typed over
		const rename = boxes.nth( 2 ).getByLabel( 'Rename sheet' );

		await expect( rename ).toBeVisible();

		// Typed key by key: the tab has keyboard shortcuts of its own, and they must not take the keys meant for the name
		await rename.press( 'ControlOrMeta+a' );
		await rename.pressSequentially( 'Three & more' );
		await rename.press( 'Enter' );

		expect( await tabTitles() ).toEqual( [ 'One', 'Two', 'Three & more' ] );

		// An existing sheet is renamed by double clicking its name
		await tabs.nth( 0 ).dblclick();

		const renameFirst = boxes.nth( 0 ).getByLabel( 'Rename sheet' );

		await renameFirst.press( 'ControlOrMeta+a' );
		await renameFirst.pressSequentially( 'First sheet' );
		await renameFirst.press( 'Enter' );

		expect( await tabTitles() ).toEqual( [ 'First sheet', 'Two', 'Three & more' ] );

		// Back to the new sheet
		await tabs.nth( 2 ).click();

		// Give the new sheet something to hold
		await typeIntoCell( page, 0, 1, 'X' );
		await typeIntoCell( page, 0, 2, 'Y' );
		await typeIntoCell( page, 1, 0, 'e' );
		await typeIntoCell( page, 1, 1, '9' );
		await typeIntoCell( page, 1, 2, '10' );

		// Delete the middle sheet, which asks first
		await tabs.nth( 1 ).click();
		await boxes.nth( 1 ).getByRole( 'button', { name: 'Delete Two' } ).click();

		const modal = page.locator( '.m-chart-modal' );

		await expect( modal ).toContainText( 'Are you sure you want to delete this sheet?' );
		await modal.getByRole( 'button', { name: 'Delete', exact: true } ).click();

		await expect( tabs ).toHaveCount( 2 );
		expect( await tabTitles() ).toEqual( [ 'First sheet', 'Three & more' ] );

		// The deleted sheet was the one on screen, so the sheet before it is shown now
		await expect( tabs.nth( 0 ) ).toHaveAttribute( 'aria-selected', 'true' );

		// The page is already on this chart's edit address, so wait for the one WordPress redirects to after a save
		await page.locator( '#publish' ).click();
		await page.waitForURL( /[?&]message=\d+/, { timeout: 30000 } );

		const meta = await getSavedPostMeta( chartEditPage.postId );

		expect( meta.set_names ).toEqual( [ 'First sheet', 'Three & more' ] );
		expect( meta.data.sets ).toHaveLength( 2 );
		expect( trimSheet( meta.data.sets[ 0 ] ) ).toEqual( trimSheet( SHEET_ONE ) );
		expect( trimSheet( meta.data.sets[ 1 ] ) ).toEqual( [ [ '', 'X', 'Y' ], [ 'e', '9', '10' ] ] );
	} );

	test( 'everything the tabs do can be done from the keyboard', async ( { page, chartEditPage } ) => {
		const sheet = ( label ) => [ [ '', 'X', 'Y' ], [ label, 1, 2 ] ];

		await chartEditPage.open( {
			title: 'Sheets by keyboard',
			meta:  { type: 'scatter', data: { sets: [ sheet( 'a' ), sheet( 'b' ), sheet( 'c' ) ] }, set_names: [ 'Alpha', 'Beta', 'Gamma' ] },
		} );

		const tabs     = page.locator( '#spreadsheet-tabs [role="tab"]' );
		const selected = page.locator( '#spreadsheet-tabs [role="tab"][aria-selected="true"]' );

		await tabs.nth( 0 ).focus();

		// The arrow keys, Home and End move between sheets and take focus with them
		await page.keyboard.press( 'ArrowRight' );
		await expect( selected ).toHaveText( 'Beta' );
		await expect( tabs.nth( 1 ) ).toBeFocused();

		await page.keyboard.press( 'End' );
		await expect( selected ).toHaveText( 'Gamma' );

		await page.keyboard.press( 'ArrowRight' );
		await expect( selected ).toHaveText( 'Alpha' );

		await page.keyboard.press( 'ArrowLeft' );
		await expect( selected ).toHaveText( 'Gamma' );

		await page.keyboard.press( 'Home' );
		await expect( selected ).toHaveText( 'Alpha' );
		await expect( tabs.nth( 0 ) ).toBeFocused();

		// The Tab key goes from a tab to that sheet's delete button
		await page.keyboard.press( 'Tab' );
		await expect( page.getByRole( 'button', { name: 'Delete Alpha' } ) ).toBeFocused();

		// F2 opens the name, and the keys typed there are the field's: a space is a space and the arrows move the caret
		await tabs.nth( 0 ).focus();
		await page.keyboard.press( 'F2' );

		const rename = page.locator( '#spreadsheet-tabs' ).getByLabel( 'Rename sheet' ).first();

		await expect( rename ).toBeFocused();
		await page.keyboard.press( 'ControlOrMeta+a' );
		await page.keyboard.type( 'North region' );

		// Home and End do different things to a caret on different systems, what matters is that they stay in the field
		await page.keyboard.press( 'Home' );
		await page.keyboard.press( 'End' );
		await expect( rename ).toBeFocused();
		await expect( selected ).toHaveCount( 1 );

		// The left arrow walks the caret back to the start, one letter at a time, on every system
		for ( let i = 0; i < 'North region'.length; i++ ) {
			await page.keyboard.press( 'ArrowLeft' );
		}

		await page.keyboard.type( 'The ' );
		await page.keyboard.press( 'Enter' );

		await expect( tabs.nth( 0 ) ).toHaveText( 'The North region' );
		await expect( selected ).toHaveText( 'The North region' );

		// Delete on a focused tab asks first, and the dialog answers to the keyboard
		await tabs.nth( 0 ).focus();
		await page.keyboard.press( 'ArrowRight' );
		await page.keyboard.press( 'Delete' );

		const dialog = page.getByRole( 'dialog', { name: 'Delete Sheet' } );

		await expect( dialog ).toBeVisible();
		await dialog.getByRole( 'button', { name: 'Cancel' } ).focus();
		await page.keyboard.press( 'Enter' );

		await expect( dialog ).toBeHidden();
		await expect( tabs ).toHaveCount( 3 );

		await tabs.nth( 1 ).focus();
		await page.keyboard.press( 'Delete' );
		await dialog.getByRole( 'button', { name: 'Delete', exact: true } ).focus();
		await page.keyboard.press( 'Enter' );

		await expect( tabs ).toHaveCount( 2 );
		await expect( tabs ).toHaveText( [ 'The North region', 'Gamma' ] );

		// Focus lands on the sheet that is now shown, not nowhere
		await expect( selected ).toBeFocused();
	} );

	test( 'the last sheet cannot be deleted', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( {
			title: 'One sheet',
			meta:  { type: 'scatter', data: { sets: [ SHEET_ONE ] }, set_names: [ 'Only' ] },
		} );

		const tabs = page.locator( '#spreadsheet-tabs [role="tab"]' );

		await expect( tabs ).toHaveCount( 1 );

		const remove = page.locator( '#spreadsheet-tabs .m-chart-sheet-tab-delete' );

		// Whether the control is hidden or just inert, nothing may be deleted and nothing may ask
		if ( await remove.count() && await remove.isVisible() ) {
			await remove.click();
		}

		await expect( page.locator( '.m-chart-modal' ) ).toHaveCount( 0 );
		await expect( tabs ).toHaveCount( 1 );
	} );

	test( 'a chart type with one sheet shows no tabs', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( { title: 'No tabs', meta: { type: 'line' } } );

		await expect( page.locator( '#spreadsheet-tabs' ) ).toBeHidden();
	} );
} );
