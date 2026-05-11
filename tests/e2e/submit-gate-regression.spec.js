/**
 * Submit-gate regression — cell-edit + save-click race
 *
 * Locks in the fix shipped in commit b81cc44. Historic bugs being prevented:
 *   (a) Data loss — typed cell value dropped from saved post_meta when the
 *       user clicked Update before committing the edit
 *   (b) Stale image — post saved with new value BUT the auto-generated chart
 *       PNG didn't reflect it, so subsequent shortcode renders showed the
 *       wrong image until the next manual re-save
 *
 * The fix is a submit gate in components/admin-ui-src/components/SpreadsheetMetaBox.js
 * that defers form submission until chart-refresh + image capture complete.
 *
 * The real-world scenario:
 *   1. User opens chart edit screen
 *   2. Clicks into a cell, types a new value (editor still active, not committed)
 *   3. Clicks Update/Publish — mousedown steals focus, blurs the editor, which
 *      commits the value via onafterchanges → SET_SHEET_DATA → formEnabled=false
 *   4. The click handler then runs while formEnabled=false → gate engages →
 *      pendingSubmit=true, form.submit deferred
 *   5. Chart refresh AJAX completes → chart re-renders with new value →
 *      Chart.js onComplete → generateImage captures fresh PNG → SET_FORM_ENABLED=true
 *   6. useEffect at SpreadsheetMetaBox.js:79 sees both flags true and calls
 *      form.submit() with both fresh data AND fresh image
 *
 * Silent-regression risk points (this test catches all of them in one run):
 *   - SpreadsheetMetaBox.js ref-sync useEffect — stale-closure capture
 *   - ChartAdminContext.js SET_SHEET_DATA — must keep setting formEnabled: false
 *   - useImageGeneration.js — SET_FORM_ENABLED must dispatch AFTER textarea write
 *   - ChartPreview.js — Chart.js onComplete must trigger image capture
 *   - JspreadsheetWrapper.js — onafterchanges must keep dispatching SET_SHEET_DATA
 */
import { test, expect, getChartImageTextarea, getSavedPostMeta } from './fixtures';

const SHEET_FOR_EDIT = [
	[ '',     'Series' ],
	[ 'Apr',  10 ],
	[ 'May',  20 ],
	[ 'Jun',  30 ],
];

// The test needs a deterministic non-default value to write into the cell
const NEW_VALUE = '999';
// Coordinates: row 2 col 1 = the cell currently holding `20` for May
const EDIT_ROW = 2;
const EDIT_COL = 1;

test.describe( '@regression submit gate — cell-edit + save-click race', () => {
	test( 'typed cell value persists and chart image reflects it after click-Publish-mid-edit', async ( { page, chartEditPage, cellEditor } ) => {
		await chartEditPage.open( {
			meta: {
				data: { sets: [ SHEET_FOR_EDIT ] },
			},
		} );

		// Snapshot the chart image as it stands before any edit
		const pre = await getChartImageTextarea( page );
		expect( pre.value.length, 'expected an initial chart image after mount' ).toBeGreaterThan( 0 );

		// Open the editor and stage a new value WITHOUT committing
		// editCell uses jspreadsheet.openEditor + .fill — no Enter, Tab, or blur fires
		// from the test side; the only thing that can commit is the upcoming Publish click
		await cellEditor.editCell( EDIT_ROW, EDIT_COL, NEW_VALUE );

		// Intercept the form-submit POST so we can assert what actually got sent
		const submitPromise = page.waitForRequest(
			req => req.url().includes( '/wp-admin/post.php' ) && req.method() === 'POST',
			{ timeout: 15000 }
		);

		// Real click — browsers fire mousedown → blur(editor) → click in that order
		// The blur on the editor input causes Jspreadsheet to commit the value,
		// which dispatches SET_SHEET_DATA → formEnabled=false. THEN the click handler
		// runs and finds formEnabled=false, engaging the submit gate
		await page.locator( '#publish' ).click();

		// Wait for the auto-submit once the gate releases
		const req = await submitPromise;
		const body = req.postData() || '';
		const params = new URLSearchParams( body );

		// (a) Data loss check — the typed value must appear in the submitted form body
		const submittedData = params.get( 'm-chart[data]' ) || '';
		expect(
			submittedData,
			`submitted post body must contain the typed cell value '${ NEW_VALUE }' — submit gate likely fired before the cell commit`
		).toContain( NEW_VALUE );

		// (b) Stale image check — the submitted PNG must be valid AND must differ
		// from the pre-edit snapshot, proving capture happened AFTER the new value
		// was rendered into the chart
		const submittedImg = params.get( 'm-chart[img]' ) || '';
		expect( submittedImg, 'm-chart[img] must be present in submitted form' ).not.toBe( '' );
		expect(
			submittedImg.startsWith( 'data:image/png;base64,iVBORw0KGgo' ),
			'm-chart[img] must be a valid PNG data URL'
		).toBe( true );
		expect(
			submittedImg,
			'm-chart[img] must differ from the pre-edit snapshot — image capture must run AFTER cell-edit dispatch'
		).not.toBe( pre.value );

		// Persistence cross-check via WP-CLI — the saved post_meta must contain the typed value
		await page.waitForURL( /post\.php\?post=\d+/, { timeout: 15000 } );
		const meta = await getSavedPostMeta( chartEditPage.postId );
		const savedData = JSON.stringify( meta?.data?.sets || meta?.data || [] );
		expect(
			savedData,
			`post_meta.data must contain '${ NEW_VALUE }' after round-trip — confirms the in-progress edit reached storage`
		).toContain( NEW_VALUE );
	} );
} );
