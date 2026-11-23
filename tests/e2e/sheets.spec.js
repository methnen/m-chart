/**
 * Sheet tabs: adding, renaming and deleting sheets on a chart type that has more than one
 */

const { test, expect, step, typeIntoCell, trimSheet, getSavedPostMeta } = require( './fixtures' );

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

		await expect( tabs, 'the sheet tabs the chart opens with' ).toHaveCount( 2 );
		expect( await tabTitles(), 'the names on the sheet tabs' ).toEqual( [ 'One', 'Two' ] );

		await step( 'Add a third sheet and name it', async () => {
			// Add a third sheet, it becomes the one being edited
			await page.locator( '#spreadsheet-tabs' ).getByRole( 'button', { name: 'Add Sheet' } ).click();

			await expect( tabs, 'the sheet tabs after adding one' ).toHaveCount( 3 );
			await expect( tabs.nth( 2 ), 'the new sheet\'s tab, which should be the selected one' ).toHaveAttribute( 'aria-selected', 'true' );

			// A new sheet opens with its name ready to be typed over
			const rename = boxes.nth( 2 ).getByLabel( 'Rename sheet' );

			await expect( rename, 'the name field of the new sheet' ).toBeVisible();

			// Typed key by key: the tab has keyboard shortcuts of its own, and they must not take the keys meant for the name
			await rename.press( 'ControlOrMeta+a' );
			await rename.pressSequentially( 'Three & more' );
			await rename.press( 'Enter' );

			expect( await tabTitles(), 'the names on the sheet tabs after naming the new one' ).toEqual( [ 'One', 'Two', 'Three & more' ] );
		} );

		await step( 'Rename the first sheet', async () => {
			// An existing sheet is renamed by double clicking its name
			await tabs.nth( 0 ).dblclick();

			const renameFirst = boxes.nth( 0 ).getByLabel( 'Rename sheet' );

			await renameFirst.press( 'ControlOrMeta+a' );
			await renameFirst.pressSequentially( 'First sheet' );
			await renameFirst.press( 'Enter' );

			expect( await tabTitles(), 'the names on the sheet tabs after renaming the first' ).toEqual( [ 'First sheet', 'Two', 'Three & more' ] );
		} );

		await step( 'Type data into the new sheet', async () => {
			// Back to the new sheet
			await tabs.nth( 2 ).click();

			// Give the new sheet something to hold
			await typeIntoCell( page, 0, 1, 'X' );
			await typeIntoCell( page, 0, 2, 'Y' );
			await typeIntoCell( page, 1, 0, 'e' );
			await typeIntoCell( page, 1, 1, '9' );
			await typeIntoCell( page, 1, 2, '10' );
		} );

		await step( 'Delete the middle sheet', async () => {
			// Delete the middle sheet, which asks first
			await tabs.nth( 1 ).click();
			await boxes.nth( 1 ).getByRole( 'button', { name: 'Delete Two' } ).click();

			const modal = page.locator( '.m-chart-modal' );

			await expect( modal, 'the dialog that asks before deleting' ).toContainText( 'Are you sure you want to delete this sheet?' );
			await modal.getByRole( 'button', { name: 'Delete', exact: true } ).click();

			await expect( tabs, 'the sheet tabs after deleting one' ).toHaveCount( 2 );
			expect( await tabTitles(), 'the names on the sheet tabs after deleting the middle one' ).toEqual( [ 'First sheet', 'Three & more' ] );

			// The deleted sheet was the one on screen, so the sheet before it is shown now
			await expect( tabs.nth( 0 ), 'the first sheet\'s tab, which should be the selected one now' ).toHaveAttribute( 'aria-selected', 'true' );
		} );

		await step( 'Save the chart', async () => {
			// The page is already on this chart's edit address, so wait for the one WordPress redirects to after a save
			await page.locator( '#publish' ).click();
			await page.waitForURL( /[?&]message=\d+/, { timeout: 30000 } );
		} );

		await step( 'Check what was saved', async () => {
			const meta = await getSavedPostMeta( chartEditPage.postId );

			expect( meta.set_names, 'the saved sheet names' ).toEqual( [ 'First sheet', 'Three & more' ] );
			expect( meta.data.sets, 'the saved sheets' ).toHaveLength( 2 );
			expect( trimSheet( meta.data.sets[ 0 ] ), 'the first saved sheet, which nothing was typed into' ).toEqual( trimSheet( SHEET_ONE ) );
			expect( trimSheet( meta.data.sets[ 1 ] ), 'the second saved sheet, the one that was added and typed into' ).toEqual( [ [ '', 'X', 'Y' ], [ 'e', '9', '10' ] ] );
		} );
	} );

	test( 'everything the tabs do can be done from the keyboard', async ( { page, chartEditPage } ) => {
		const sheet = ( label ) => [ [ '', 'X', 'Y' ], [ label, 1, 2 ] ];

		await chartEditPage.open( {
			title: 'Sheets by keyboard',
			meta:  { type: 'scatter', data: { sets: [ sheet( 'a' ), sheet( 'b' ), sheet( 'c' ) ] }, set_names: [ 'Alpha', 'Beta', 'Gamma' ] },
		} );

		const tabs     = page.locator( '#spreadsheet-tabs [role="tab"]' );
		const selected = page.locator( '#spreadsheet-tabs [role="tab"][aria-selected="true"]' );

		await step( 'Move between sheets with the arrow keys, Home and End', async () => {
			await tabs.nth( 0 ).focus();

			// The arrow keys, Home and End move between sheets and take focus with them
			await page.keyboard.press( 'ArrowRight' );
			await expect( selected, 'the selected sheet after Right from Alpha' ).toHaveText( 'Beta' );
			await expect( tabs.nth( 1 ), 'the Beta tab, which focus should have followed to' ).toBeFocused();

			await page.keyboard.press( 'End' );
			await expect( selected, 'the selected sheet after End' ).toHaveText( 'Gamma' );

			await page.keyboard.press( 'ArrowRight' );
			await expect( selected, 'the selected sheet after Right from the last one, which wraps round' ).toHaveText( 'Alpha' );

			await page.keyboard.press( 'ArrowLeft' );
			await expect( selected, 'the selected sheet after Left from the first one, which wraps round' ).toHaveText( 'Gamma' );

			await page.keyboard.press( 'Home' );
			await expect( selected, 'the selected sheet after Home' ).toHaveText( 'Alpha' );
			await expect( tabs.nth( 0 ), 'the Alpha tab, which focus should have followed to' ).toBeFocused();

			// The Tab key goes from a tab to that sheet's delete button
			await page.keyboard.press( 'Tab' );
			await expect( page.getByRole( 'button', { name: 'Delete Alpha' } ), 'the delete button for Alpha, where Tab should land' ).toBeFocused();
		} );

		await step( 'Rename a sheet with F2', async () => {
			// F2 opens the name, and the keys typed there are the field's: a space is a space and the arrows move the caret
			await tabs.nth( 0 ).focus();
			await page.keyboard.press( 'F2' );

			const rename = page.locator( '#spreadsheet-tabs' ).getByLabel( 'Rename sheet' ).first();

			await expect( rename, 'the name field that F2 opens' ).toBeFocused();
			await page.keyboard.press( 'ControlOrMeta+a' );
			await page.keyboard.type( 'North region' );

			// Home and End do different things to a caret on different systems, what matters is that they stay in the field
			await page.keyboard.press( 'Home' );
			await page.keyboard.press( 'End' );
			await expect( rename, 'the name field, which Home and End should not leave' ).toBeFocused();
			await expect( selected, 'selected sheets while a name is being typed' ).toHaveCount( 1 );

			// The left arrow walks the caret back to the start, one letter at a time, on every system
			for ( let i = 0; i < 'North region'.length; i++ ) {
				await page.keyboard.press( 'ArrowLeft' );
			}

			await page.keyboard.type( 'The ' );
			await page.keyboard.press( 'Enter' );

			await expect( tabs.nth( 0 ), 'the first tab after renaming it' ).toHaveText( 'The North region' );
			await expect( selected, 'the selected sheet after renaming it' ).toHaveText( 'The North region' );
		} );

		const dialog = page.getByRole( 'dialog', { name: 'Delete Sheet' } );

		await step( 'Press Delete on a tab, then cancel', async () => {
			// Delete on a focused tab asks first, and the dialog answers to the keyboard
			await tabs.nth( 0 ).focus();
			await page.keyboard.press( 'ArrowRight' );
			await page.keyboard.press( 'Delete' );

			await expect( dialog, 'the dialog that asks before deleting' ).toBeVisible();
			await dialog.getByRole( 'button', { name: 'Cancel' } ).focus();
			await page.keyboard.press( 'Enter' );

			await expect( dialog, 'the dialog after Cancel' ).toBeHidden();
			await expect( tabs, 'the sheet tabs after cancelling the delete' ).toHaveCount( 3 );
		} );

		await step( 'Press Delete on a tab, then confirm', async () => {
			await tabs.nth( 1 ).focus();
			await page.keyboard.press( 'Delete' );
			await dialog.getByRole( 'button', { name: 'Delete', exact: true } ).focus();
			await page.keyboard.press( 'Enter' );

			await expect( tabs, 'the sheet tabs after deleting one' ).toHaveCount( 2 );
			await expect( tabs, 'the names on the sheet tabs after deleting Beta' ).toHaveText( [ 'The North region', 'Gamma' ] );

			// Focus lands on the sheet that is now shown, not nowhere
			await expect( selected, 'the tab of the sheet now shown, where focus should land' ).toBeFocused();
		} );
	} );

	test( 'the last sheet cannot be deleted', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( {
			title: 'One sheet',
			meta:  { type: 'scatter', data: { sets: [ SHEET_ONE ] }, set_names: [ 'Only' ] },
		} );

		const tabs = page.locator( '#spreadsheet-tabs [role="tab"]' );

		await expect( tabs, 'the sheet tabs the chart opens with' ).toHaveCount( 1 );

		const remove = page.locator( '#spreadsheet-tabs .m-chart-sheet-tab-delete' );

		// Whether the control is hidden or just inert, nothing may be deleted and nothing may ask
		if ( await remove.count() && await remove.isVisible() ) {
			await remove.click();
		}

		await expect( page.locator( '.m-chart-modal' ), 'a dialog asking to delete the only sheet' ).toHaveCount( 0 );
		await expect( tabs, 'the sheet tabs after trying to delete the only one' ).toHaveCount( 1 );
	} );

	test( 'a chart type with one sheet shows no tabs', async ( { page, chartEditPage } ) => {
		await chartEditPage.open( { title: 'No tabs', meta: { type: 'line' } } );

		await expect( page.locator( '#spreadsheet-tabs' ), 'the sheet tab bar on a chart type with one sheet' ).toBeHidden();
	} );
} );
