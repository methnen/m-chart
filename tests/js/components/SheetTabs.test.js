/**
 * Tests for the spreadsheet tab bar (SheetTabs) and its tabs (SheetTab)
 *
 * Covers adding, renaming, deleting and switching sheets, by mouse, keyboard and long press,
 * and the read only mode an external data source puts the tabs into
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { speak } from '@wordpress/a11y';
import SheetTabs from '../../../components/admin-ui-src/components/SheetTabs';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';

expect.extend( toHaveNoViolations );

// The rename field sizes itself by drawing on a canvas, which jsdom doesn't implement
jest.mock( '../../../components/admin-ui-src/utils/measureTextWidth', () => ( {
	measureTextWidth: () => 80,
} ) );

// Screen reader announcements are part of what a user gets, so they are asserted on rather than spoken
jest.mock( '@wordpress/a11y', () => ( { speak: jest.fn() } ) );

let latestState;
let dispatchRef;

// Stands in for SpreadsheetMetaBox: the tab bar plus the panel each tab says it controls
function Harness() {
	const { state, dispatch } = useChartAdmin();

	latestState = state;
	dispatchRef = dispatch;

	return (
		<>
			<SheetTabs />
			{ state.sheetIds.map( ( id, index ) => (
				<div
					key={ id }
					role="tabpanel"
					id={ `spreadsheet-panel-${ id }` }
					aria-labelledby={ `spreadsheet-tab-${ id }` }
					hidden={ index !== state.activeSheet }
				/>
			) ) }
		</>
	);
}

/**
 * Render the tab bar with one sheet per name, each holding a single cell with its own name in lower case
 *
 * @param {Object}   setup
 * @param {string[]} setup.names  Sheet names, '' for an unnamed sheet
 * @param {string}   setup.type   Chart type, scatter shows the tab bar
 * @param {number}   setup.active Index of the sheet to start on
 * @return {Object} The testing library render result
 */
function renderTabs( { names = [ 'Alpha', 'Beta', 'Gamma' ], type = 'scatter', active = 0 } = {} ) {
	const utils = render(
		<ChartAdminProvider>
			<Harness />
		</ChartAdminProvider>
	);

	act( () => {
		dispatchRef( { type: 'SET_POST_META', payload: { type } } );
		dispatchRef( {
			type:    'REPLACE_SHEETS',
			payload: {
				sets:        names.map( ( name ) => [ [ name.toLowerCase() ] ] ),
				setNames:    names,
				activeSheet: active,
			},
		} );
	} );

	return utils;
}

// A tab is the sheet's name and nothing else, its delete button and rename field are its siblings in the box that looks like a tab
// The tab is hidden while its name is being edited, hidden: true keeps it findable then
function allTabs() {
	return screen.getAllByRole( 'tab', { hidden: true } );
}

function tabNames() {
	return allTabs().map( ( el ) => el.textContent );
}

function tab( name ) {
	return allTabs().find( ( el ) => el.textContent === name );
}

// The box a sighted user sees as the tab: the tab, its delete button and its rename field
function tabBox( name ) {
	return tab( name ).closest( '.m-chart-sheet-tab' );
}

function selectedTabName() {
	return screen.getByRole( 'tab', { selected: true, hidden: true } ).textContent;
}

function sheetCells() {
	return latestState.spreadsheetData.map( ( sheet ) => sheet[ 0 ][ 0 ] );
}

// The field is in the DOM for every tab so its value posts with the form, only the one being renamed is shown
function renameField() {
	return screen.queryByRole( 'textbox', { name: 'Rename sheet' } );
}

// Each delete button is named for its sheet, there is one per tab
function deleteButton( name ) {
	return within( tabBox( name ) ).getByRole( 'button', { name: `Delete ${ name }` } );
}

function confirmDialog() {
	return screen.queryByRole( 'dialog', { name: 'Delete Sheet' } );
}

// The components hand focus over on zero delay timers and the long press runs on a 500ms one
// Fake timers keep both under the test's control, and dropping the fake clock afterwards discards anything
// still pending so a late focus call cannot land in the next test
beforeEach( () => {
	jest.useFakeTimers();
	speak.mockClear();
} );

afterEach( () => {
	jest.useRealTimers();
} );

function runPendingTimers() {
	act( () => jest.runOnlyPendingTimers() );
}

function setupUser() {
	return userEvent.setup( { advanceTimers: jest.advanceTimersByTime } );
}

// jsdom's pointer events carry no button, a mouse event of the same type does and React reads it the same way
function pointerDown( target, button = 0 ) {
	fireEvent( target, new MouseEvent( 'pointerdown', { bubbles: true, cancelable: true, button } ) );
}

function confirmDeletion() {
	fireEvent.click( within( confirmDialog() ).getByRole( 'button', { name: 'Delete' } ) );
}

describe( 'SheetTabs tab bar', () => {
	test( 'shows one tab per sheet under its name with the first one selected', () => {
		renderTabs();

		expect( screen.getByRole( 'tablist', { name: 'Spreadsheet sheets' } ) ).toBeInTheDocument();
		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
		expect( selectedTabName() ).toBe( 'Alpha' );

		// wp.components warns about its pre-6.7 margin styles the first time these controls render in this file
		// @wordpress/deprecated logs each message once per process, so only this first test sees it
		expect( console ).toHaveWarned();
	} );

	test( 'a sheet without a name is shown by its position', () => {
		renderTabs( { names: [ 'Alpha', '', '' ] } );

		expect( tabNames() ).toEqual( [ 'Alpha', 'Sheet 2', 'Sheet 3' ] );
	} );

	test( 'only the selected tab is in the keyboard tab order', () => {
		renderTabs( { active: 1 } );

		expect( screen.getAllByRole( 'tab' ).map( ( el ) => el.tabIndex ) ).toEqual( [ -1, 0, -1 ] );
	} );

	test( 'the bar is shown for a chart type that takes several sheets', () => {
		renderTabs( { type: 'scatter' } );

		expect( document.getElementById( 'spreadsheet-tabs' ) ).not.toHaveClass( 'm-chart-hide' );
	} );

	test( 'the bar is hidden for a chart type that takes one sheet and comes back when the type changes', () => {
		renderTabs( { type: 'line' } );

		// The bar, not the tab list inside it: the list is only there for assistive technology
		expect( document.getElementById( 'spreadsheet-tabs' ) ).toHaveClass( 'm-chart-hide' );

		act( () => dispatchRef( { type: 'SET_POST_META', payload: { type: 'bubble' } } ) );

		expect( document.getElementById( 'spreadsheet-tabs' ) ).not.toHaveClass( 'm-chart-hide' );
	} );

	test( 'every sheet name is posted with the form, in order', () => {
		const { container } = renderTabs();

		const posted = Array.from( container.querySelectorAll( 'input[name^="m-chart[set_names]"]' ) )
			.map( ( input ) => [ input.name, input.value ] );

		expect( posted ).toEqual( [
			[ 'm-chart[set_names][0]', 'Alpha' ],
			[ 'm-chart[set_names][1]', 'Beta' ],
			[ 'm-chart[set_names][2]', 'Gamma' ],
		] );
	} );

	// A tab list may hold nothing but tabs and a tab may hold no other control
	// The bar used to break both rules: the Add Sheet button was inside the list and each tab held its delete button
	// The e2e scan never saw either, it ran on a single sheet line chart where the bar is hidden
	test( 'has no accessibility violations', async () => {
		// axe schedules its own work on real timers
		jest.useRealTimers();

		const { container } = renderTabs();

		expect( await axe( container ) ).toHaveNoViolations();
	} );

	test( 'has no accessibility violations while a sheet is being renamed', async () => {
		jest.useRealTimers();

		const { container } = renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		expect( renameField() ).toBeVisible();
		expect( await axe( container ) ).toHaveNoViolations();
	} );

	test( 'the tab list owns every tab and nothing else', () => {
		renderTabs();

		const list  = screen.getByRole( 'tablist', { name: 'Spreadsheet sheets' } );
		const owned = list.getAttribute( 'aria-owns' ).split( ' ' );

		// Claimed by id, the tabs are not inside the list element
		expect( owned ).toEqual( allTabs().map( ( el ) => el.id ) );
		expect( list ).toBeEmptyDOMElement();

		// So the buttons in the bar are not in the list either
		expect( list ).not.toContainElement( screen.getByRole( 'button', { name: 'Add Sheet' } ) );
		expect( list ).not.toContainElement( deleteButton( 'Alpha' ) );
	} );

	test( 'the tab list keeps up as sheets are added and deleted', () => {
		renderTabs();

		const owned = () => screen.getByRole( 'tablist' ).getAttribute( 'aria-owns' ).split( ' ' );

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );

		expect( owned() ).toHaveLength( 4 );
		expect( owned() ).toEqual( allTabs().map( ( el ) => el.id ) );

		fireEvent.click( deleteButton( 'Alpha' ) );
		confirmDeletion();

		expect( owned() ).toHaveLength( 3 );
		expect( owned() ).toEqual( allTabs().map( ( el ) => el.id ) );
	} );

	test( 'a tab holds only its name, the delete button and rename field sit beside it', () => {
		renderTabs();

		const alpha = tab( 'Alpha' );

		expect( alpha.children ).toHaveLength( 0 );
		expect( alpha ).toHaveTextContent( 'Alpha' );

		expect( tabBox( 'Alpha' ) ).toContainElement( deleteButton( 'Alpha' ) );
		expect( alpha ).not.toContainElement( deleteButton( 'Alpha' ) );
	} );

	test( 'every delete button says which sheet it deletes', () => {
		renderTabs();

		expect( screen.getAllByRole( 'button', { name: /^Delete / } ).map( ( button ) => button.getAttribute( 'aria-label' ) ) ).toEqual( [ 'Delete', 'Delete', 'Delete' ] );

		for ( const name of [ 'Alpha', 'Beta', 'Gamma' ] ) {
			expect( screen.getByRole( 'button', { name: `Delete ${ name }` } ) ).toBe( deleteButton( name ) );
		}
	} );

	test( 'the Tab key reaches a tab before its delete button', async () => {
		const user = setupUser();

		renderTabs();

		act( () => tab( 'Alpha' ).focus() );

		await user.tab();

		expect( deleteButton( 'Alpha' ) ).toHaveFocus();
	} );

	test( 'has no accessibility violations at all when the tabs are read only', async () => {
		jest.useRealTimers();

		const { container } = renderTabs();

		act( () => dispatchRef( { type: 'SET_SHEET_EDITING_DISABLED', payload: true } ) );

		expect( await axe( container ) ).toHaveNoViolations();
	} );
} );

describe( 'SheetTabs switching sheets', () => {
	test( 'clicking a tab makes its sheet the active one', () => {
		renderTabs();

		fireEvent.click( tab( 'Gamma' ) );

		expect( selectedTabName() ).toBe( 'Gamma' );
		expect( latestState.activeSheet ).toBe( 2 );
		expect( screen.getAllByRole( 'tab', { selected: true } ) ).toHaveLength( 1 );
	} );

	test( 'clicking the tab that is already active changes nothing', () => {
		renderTabs( { active: 1 } );

		const before = latestState;

		fireEvent.click( tab( 'Beta' ) );

		expect( latestState ).toBe( before );
	} );

	test.each( [ 'Enter', ' ' ] )( 'pressing %p on a focused tab activates it', ( key ) => {
		renderTabs();

		fireEvent.keyDown( tab( 'Beta' ), { key } );

		expect( selectedTabName() ).toBe( 'Beta' );
	} );

	test.each( [
		[ 'ArrowRight', 'Alpha', 'Beta' ],
		[ 'ArrowRight', 'Gamma', 'Alpha' ],
		[ 'ArrowLeft', 'Beta', 'Alpha' ],
		[ 'ArrowLeft', 'Alpha', 'Gamma' ],
		[ 'Home', 'Gamma', 'Alpha' ],
		[ 'End', 'Alpha', 'Gamma' ],
	] )( '%s on %s selects and focuses %s', ( key, from, to ) => {
		renderTabs( { active: [ 'Alpha', 'Beta', 'Gamma' ].indexOf( from ) } );

		fireEvent.keyDown( tab( from ), { key } );

		expect( selectedTabName() ).toBe( to );

		// Focus follows once React has committed the new selection
		runPendingTimers();

		expect( tab( to ) ).toHaveFocus();
	} );

	test( 'the arrow keys do not scroll the page while they move between tabs', () => {
		renderTabs();

		// fireEvent returns false when the handler called preventDefault
		expect( fireEvent.keyDown( tab( 'Alpha' ), { key: 'ArrowRight' } ) ).toBe( false );
	} );
} );

describe( 'SheetTabs adding a sheet', () => {
	test( 'Add Sheet appends an empty sheet and makes it the active one', () => {
		renderTabs();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );

		expect( allTabs() ).toHaveLength( 4 );
		expect( latestState.spreadsheetData ).toHaveLength( 4 );
		expect( latestState.spreadsheetData[ 3 ] ).toEqual( [ [ '' ] ] );
		expect( latestState.activeSheet ).toBe( 3 );
		expect( screen.getByRole( 'tab', { selected: true, hidden: true } ) ).toBe( allTabs()[ 3 ] );

		// The existing sheets are untouched
		expect( sheetCells().slice( 0, 3 ) ).toEqual( [ 'alpha', 'beta', 'gamma' ] );
	} );

	test( 'the new sheet opens ready to be named, with its default name selected in a focused field', () => {
		renderTabs();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );

		const field = renameField();

		expect( field ).toHaveValue( 'Sheet 4' );
		expect( field ).toHaveFocus();
		expect( [ field.selectionStart, field.selectionEnd ] ).toEqual( [ 0, 'Sheet 4'.length ] );
	} );

	test( 'Add Sheet works from the keyboard', async () => {
		const user = setupUser();

		renderTabs();

		screen.getByRole( 'button', { name: 'Add Sheet' } ).focus();

		await user.keyboard( '{Enter}' );

		expect( allTabs() ).toHaveLength( 4 );
	} );

	test( 'the new sheet is announced', () => {
		renderTabs();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );

		expect( speak ).toHaveBeenCalledWith( 'New sheet added' );
	} );

	test( 'adding a second sheet does not reopen the first new sheet for naming', () => {
		renderTabs();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );
		fireEvent.change( renameField(), { target: { value: 'Delta' } } );
		fireEvent.keyDown( renameField(), { key: 'Enter' } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Sheet' } ) );

		expect( tabNames().slice( 0, 4 ) ).toEqual( [ 'Alpha', 'Beta', 'Gamma', 'Delta' ] );
		expect( screen.getAllByRole( 'textbox', { name: 'Rename sheet' } ) ).toHaveLength( 1 );
		expect( renameField() ).toHaveValue( 'Sheet 5' );
	} );
} );

describe( 'SheetTabs renaming a sheet', () => {
	test( 'no tab is in rename mode to begin with', () => {
		renderTabs();

		expect( renameField() ).toBeNull();
	} );

	test( 'double clicking a tab opens its name for editing', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		expect( renameField() ).toHaveValue( 'Beta' );
		expect( renameField() ).toHaveFocus();
	} );

	test( 'pressing F2 on a tab opens its name for editing', () => {
		renderTabs();

		fireEvent.keyDown( tab( 'Beta' ), { key: 'F2' } );

		expect( renameField() ).toHaveValue( 'Beta' );
	} );

	test( 'Enter saves the new name', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.change( renameField(), { target: { value: 'Revenue' } } );
		fireEvent.keyDown( renameField(), { key: 'Enter' } );

		expect( tabNames() ).toEqual( [ 'Alpha', 'Revenue', 'Gamma' ] );
		expect( latestState.setNames ).toEqual( [ 'Alpha', 'Revenue', 'Gamma' ] );
		expect( renameField() ).toBeNull();
	} );

	test( 'leaving the field saves the new name', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Gamma' ) );
		fireEvent.change( renameField(), { target: { value: 'Costs' } } );
		fireEvent.blur( renameField() );

		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta', 'Costs' ] );
		expect( renameField() ).toBeNull();
	} );

	test( 'the new name is announced', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.change( renameField(), { target: { value: 'Revenue' } } );
		fireEvent.keyDown( renameField(), { key: 'Enter' } );

		expect( speak ).toHaveBeenCalledWith( 'Sheet renamed to Revenue' );
	} );

	test( 'the tab keeps showing the old name until the rename is committed', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.change( renameField(), { target: { value: 'Rev' } } );

		expect( latestState.setNames ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
	} );

	test( 'clearing the name falls back to the position based name', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.change( renameField(), { target: { value: '' } } );
		fireEvent.keyDown( renameField(), { key: 'Enter' } );

		expect( tabNames() ).toEqual( [ 'Alpha', 'Sheet 2', 'Gamma' ] );
	} );

	test.each( [ 'R&D', 'x < y > z', '"quoted" \'single\'', '<b>bold</b>', 'café €5 ±2°', '日本語' ] )(
		'a name of %s is kept and shown as typed',
		( name ) => {
			const { container } = renderTabs();

			fireEvent.doubleClick( tab( 'Beta' ) );
			fireEvent.change( renameField(), { target: { value: name } } );
			fireEvent.keyDown( renameField(), { key: 'Enter' } );

			expect( tabNames()[ 1 ] ).toBe( name );
			expect( latestState.setNames[ 1 ] ).toBe( name );
			expect( container.querySelector( 'input[name="m-chart[set_names][1]"]' ) ).toHaveValue( name );

			// Nothing typed turned into an element
			expect( container.querySelector( 'b' ) ).toBeNull();
		}
	);

	test( 'clicking inside the rename field does not switch sheets', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.click( renameField() );

		expect( selectedTabName() ).toBe( 'Alpha' );
	} );

	test( 'a name without spaces can be typed key by key', async () => {
		const user = setupUser();

		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		const field = renameField();

		await user.clear( field );
		await user.type( field, 'Revenue-2026' );

		expect( field ).toHaveValue( 'Revenue-2026' );
	} );

	// Keys pressed in the rename field bubble to the tab's own shortcut handler (SheetTab.js handleKeyActivate)
	// It must leave them alone, cancelling Space there would keep the character out of the field
	test( 'a name with a space in it can be typed', async () => {
		const user = setupUser();

		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		const field = renameField();

		await user.clear( field );
		await user.type( field, 'Q1 Sales' );

		expect( field ).toHaveValue( 'Q1 Sales' );
	} );

	// Same handler: cancelling these keys for tab navigation would stop the caret moving
	test( 'the arrow, Home and End keys are left to the rename field', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		const field = renameField();

		// fireEvent returns false when a handler called preventDefault, which stops the caret moving
		expect( [ 'ArrowLeft', 'ArrowRight', 'Home', 'End' ].map( ( key ) => fireEvent.keyDown( field, { key } ) ) )
			.toEqual( [ true, true, true, true ] );
	} );

	// Same handler: the sheet must not change under the user while they are still typing
	test( 'the arrow keys in the rename field do not switch sheets', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.keyDown( renameField(), { key: 'ArrowRight' } );

		expect( selectedTabName() ).toBe( 'Alpha' );
	} );

	// Same handler: forward delete removes a character, it does not open the delete confirmation
	test( 'the Delete key in the rename field does not ask to delete the sheet', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.keyDown( renameField(), { key: 'Delete' } );

		expect( confirmDialog() ).toBeNull();
	} );
} );

describe( 'SheetTabs long press', () => {
	test( 'holding a tab down for half a second opens its name for editing', () => {
		renderTabs();

		pointerDown( tab( 'Gamma' ) );

		act( () => jest.advanceTimersByTime( 499 ) );

		expect( renameField() ).toBeNull();

		act( () => jest.advanceTimersByTime( 1 ) );

		expect( renameField() ).toHaveValue( 'Gamma' );
		expect( renameField() ).toHaveFocus();
	} );

	test( 'an ordinary tap does not open the name for editing', () => {
		renderTabs();

		pointerDown( tab( 'Gamma' ) );
		act( () => jest.advanceTimersByTime( 150 ) );
		fireEvent.pointerUp( tab( 'Gamma' ) );
		act( () => jest.advanceTimersByTime( 1000 ) );

		expect( renameField() ).toBeNull();
	} );

	test( 'holding the right mouse button does not open the name for editing', () => {
		renderTabs();

		pointerDown( tab( 'Gamma' ), 2 );
		act( () => jest.advanceTimersByTime( 1000 ) );

		expect( renameField() ).toBeNull();
	} );

	test( 'a long press does nothing while sheet editing is disabled', () => {
		renderTabs();

		act( () => dispatchRef( { type: 'SET_SHEET_EDITING_DISABLED', payload: true } ) );

		pointerDown( tab( 'Gamma' ) );
		act( () => jest.advanceTimersByTime( 1000 ) );

		expect( renameField() ).toBeNull();
	} );
} );

describe( 'SheetTabs deleting a sheet', () => {
	test( 'the delete button asks for confirmation before anything is removed', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );

		const dialog = confirmDialog();

		expect( dialog ).toBeInTheDocument();
		expect( within( dialog ).getByText( 'Are you sure you want to delete this sheet?' ) ).toBeInTheDocument();
		expect( latestState.spreadsheetData ).toHaveLength( 3 );
	} );

	test( 'clicking a delete button does not also switch to that sheet', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Gamma' ) );

		expect( latestState.activeSheet ).toBe( 0 );
	} );

	test( 'cancelling keeps the sheet', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );
		fireEvent.click( within( confirmDialog() ).getByRole( 'button', { name: 'Cancel' } ) );

		expect( confirmDialog() ).toBeNull();
		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
		expect( sheetCells() ).toEqual( [ 'alpha', 'beta', 'gamma' ] );
		expect( speak ).not.toHaveBeenCalled();
	} );

	test( 'closing the confirmation with Escape keeps the sheet', async () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );
		fireEvent.keyDown( confirmDialog(), { key: 'Escape', code: 'Escape', keyCode: 27 } );

		// The modal plays its exit animation before it reports the close
		await act( async () => {
			await jest.advanceTimersByTimeAsync( 1000 );
		} );

		expect( confirmDialog() ).toBeNull();
		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
	} );

	// React bubbles events through portals, so a confirmation rendered inside the tab would pass a click on any of its buttons
	// up to the tab's own click handler (SheetTab.js handleClick), which activates that tab
	test( 'cancelling does not switch to the sheet that was going to be deleted', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );
		fireEvent.click( within( confirmDialog() ).getByRole( 'button', { name: 'Cancel' } ) );

		expect( selectedTabName() ).toBe( 'Alpha' );
	} );

	// Same for keys: Enter on a button in the confirmation must not reach the tab's shortcut handler,
	// which would cancel it before the browser can turn it into a click
	test( 'the confirmation can be answered with the Enter key', async () => {
		const user = setupUser();

		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );

		within( confirmDialog() ).getByRole( 'button', { name: 'Delete' } ).focus();

		await user.keyboard( '{Enter}' );

		expect( latestState.setNames ).toEqual( [ 'Alpha', 'Gamma' ] );
	} );

	test( 'cancelling hands focus back to the delete button that opened the confirmation', () => {
		renderTabs();

		deleteButton( 'Beta' ).focus();
		fireEvent.click( deleteButton( 'Beta' ) );
		runPendingTimers();

		expect( confirmDialog() ).toContainElement( document.activeElement );

		fireEvent.click( within( confirmDialog() ).getByRole( 'button', { name: 'Cancel' } ) );
		runPendingTimers();

		expect( deleteButton( 'Beta' ) ).toHaveFocus();
	} );

	test( 'cancelling a confirmation opened with the Delete key hands focus back to the tab', () => {
		renderTabs();

		tab( 'Beta' ).focus();
		fireEvent.keyDown( tab( 'Beta' ), { key: 'Delete' } );
		runPendingTimers();

		fireEvent.click( within( confirmDialog() ).getByRole( 'button', { name: 'Cancel' } ) );
		runPendingTimers();

		expect( tab( 'Beta' ) ).toHaveFocus();
	} );

	// The tab's shortcut handler must not cancel Enter on its own delete button either
	test( 'the delete button can be used from the keyboard', async () => {
		const user = setupUser();

		renderTabs();

		deleteButton( 'Beta' ).focus();

		await user.keyboard( '{Enter}' );

		expect( confirmDialog() ).toBeInTheDocument();
		expect( latestState.activeSheet ).toBe( 0 );
	} );

	// A double click or a long press inside the confirmation is not a double click or a long press on the tab
	test( 'double clicking or holding inside the confirmation does not open the sheet name for editing', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );

		const message = within( confirmDialog() ).getByText( 'Are you sure you want to delete this sheet?' );

		fireEvent.doubleClick( message );
		pointerDown( message );
		act( () => jest.advanceTimersByTime( 1000 ) );

		expect( renameField() ).toBeNull();
	} );

	test( 'confirming removes the sheet, its name and its data', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );
		confirmDeletion();

		expect( confirmDialog() ).toBeNull();
		expect( tabNames() ).toEqual( [ 'Alpha', 'Gamma' ] );
		expect( latestState.setNames ).toEqual( [ 'Alpha', 'Gamma' ] );
		expect( sheetCells() ).toEqual( [ 'alpha', 'gamma' ] );
	} );

	test( 'the deletion is announced', () => {
		renderTabs();

		fireEvent.click( deleteButton( 'Beta' ) );
		confirmDeletion();

		expect( speak ).toHaveBeenCalledWith( 'Sheet deleted' );
	} );

	test( 'the Delete key on a tab asks for the same confirmation', () => {
		renderTabs();

		fireEvent.keyDown( tab( 'Gamma' ), { key: 'Delete' } );

		expect( confirmDialog() ).toBeInTheDocument();

		confirmDeletion();

		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta' ] );
	} );

	test( 'the remaining names are posted with the form under their new positions', () => {
		const { container } = renderTabs();

		fireEvent.click( deleteButton( 'Alpha' ) );
		confirmDeletion();

		const posted = Array.from( container.querySelectorAll( 'input[name^="m-chart[set_names]"]' ) )
			.map( ( input ) => [ input.name, input.value ] );

		expect( posted ).toEqual( [
			[ 'm-chart[set_names][0]', 'Beta' ],
			[ 'm-chart[set_names][1]', 'Gamma' ],
		] );
	} );

	test.each( [
		[ 'the last sheet', 'Gamma', 'Beta' ],
		[ 'a middle sheet', 'Beta', 'Alpha' ],
	] )( 'deleting the active sheet when it is %s moves to the sheet before it', ( description, target, expected ) => {
		renderTabs( { active: [ 'Alpha', 'Beta', 'Gamma' ].indexOf( target ) } );

		fireEvent.click( deleteButton( target ) );
		confirmDeletion();

		expect( selectedTabName() ).toBe( expected );

		// The deleted tab took focus with it, so focus is handed to the tab that is now active
		runPendingTimers();

		expect( tab( expected ) ).toHaveFocus();
	} );

	// The neighbour sits at index 1 before the delete and at index 0 after it
	// With three or more sheets an index worked out before the delete skips it
	test( 'deleting the active first sheet moves to the sheet that was next to it', () => {
		renderTabs( { active: 0 } );

		fireEvent.click( deleteButton( 'Alpha' ) );
		confirmDeletion();

		expect( tabNames() ).toEqual( [ 'Beta', 'Gamma' ] );
		expect( selectedTabName() ).toBe( 'Beta' );
	} );

	test( 'deleting the first of two sheets leaves the other one active', () => {
		renderTabs( { names: [ 'Alpha', 'Beta' ], active: 0 } );

		fireEvent.click( deleteButton( 'Alpha' ) );
		confirmDeletion();

		expect( tabNames() ).toEqual( [ 'Beta' ] );
		expect( selectedTabName() ).toBe( 'Beta' );
	} );

	// The click on the confirmation's Delete button must not reach the deleted tab's click handler,
	// which would set the active index to the position that tab had, whatever sheet now sits there (or none)
	// DELETE_SHEET also has to shift the active index down when a sheet before it goes
	test.each( [
		[ 'after', [ 'Alpha', 'Beta', 'Gamma', 'Delta' ], 'Alpha', 'Gamma' ],
		[ 'before', [ 'Alpha', 'Beta', 'Gamma', 'Delta' ], 'Gamma', 'Alpha' ],
	] )( 'deleting a sheet %s the active one keeps the active sheet', ( position, names, activeName, target ) => {
		renderTabs( { names, active: names.indexOf( activeName ) } );

		fireEvent.click( deleteButton( target ) );
		confirmDeletion();

		expect( selectedTabName() ).toBe( activeName );
	} );

	// Same cause: an active index left pointing past the end after the last tab is deleted
	// The tab bar falls back to the first tab but the spreadsheet panels compare against the raw index, so none would be shown
	test( 'the active sheet index still points at a sheet after deleting the last tab', () => {
		renderTabs( { active: 0 } );

		fireEvent.click( deleteButton( 'Gamma' ) );
		confirmDeletion();

		expect( latestState.activeSheet ).toBeLessThan( latestState.spreadsheetData.length );
	} );

	test( 'deleting a sheet that is not the active one hands focus to the active tab', () => {
		renderTabs( { active: 2 } );

		fireEvent.click( deleteButton( 'Alpha' ) );
		confirmDeletion();
		runPendingTimers();

		expect( selectedTabName() ).toBe( 'Gamma' );
		expect( tab( 'Gamma' ) ).toHaveFocus();
	} );

	test( 'the last remaining sheet has no delete button', () => {
		renderTabs( { names: [ 'Only' ] } );

		expect( within( tab( 'Only' ) ).queryByRole( 'button', { name: 'Delete' } ) ).toBeNull();
	} );

	test( 'the Delete key does nothing on the last remaining sheet', () => {
		renderTabs( { names: [ 'Only' ] } );

		fireEvent.keyDown( tab( 'Only' ), { key: 'Delete' } );

		expect( confirmDialog() ).toBeNull();
		expect( tabNames() ).toEqual( [ 'Only' ] );
	} );

	test( 'deleting down to one sheet takes the delete button away from the survivor', () => {
		renderTabs( { names: [ 'Alpha', 'Beta' ] } );

		fireEvent.click( deleteButton( 'Beta' ) );
		confirmDeletion();

		expect( within( tab( 'Alpha' ) ).queryByRole( 'button', { name: 'Delete' } ) ).toBeNull();
	} );
} );

describe( 'SheetTabs while sheet editing is disabled', () => {
	function renderLocked( setup ) {
		const utils = renderTabs( setup );

		act( () => dispatchRef( { type: 'SET_SHEET_EDITING_DISABLED', payload: true } ) );

		return utils;
	}

	test( 'there is no Add Sheet button and no delete buttons', () => {
		renderLocked();

		expect( screen.queryByRole( 'button', { name: 'Add Sheet' } ) ).toBeNull();
		expect( screen.queryByRole( 'button', { name: 'Delete' } ) ).toBeNull();
	} );

	test( 'double click and F2 do not open a name for editing', () => {
		renderLocked();

		fireEvent.doubleClick( tab( 'Beta' ) );
		fireEvent.keyDown( tab( 'Beta' ), { key: 'F2' } );

		expect( renameField() ).toBeNull();
	} );

	test( 'the Delete key does not ask to delete', () => {
		renderLocked();

		fireEvent.keyDown( tab( 'Beta' ), { key: 'Delete' } );

		expect( confirmDialog() ).toBeNull();
	} );

	test( 'the sheets can still be switched', () => {
		renderLocked();

		fireEvent.click( tab( 'Gamma' ) );

		expect( selectedTabName() ).toBe( 'Gamma' );
	} );

	test( 'a rename that was open when editing got disabled is closed', () => {
		renderTabs();

		fireEvent.doubleClick( tab( 'Beta' ) );

		expect( renameField() ).not.toBeNull();

		act( () => dispatchRef( { type: 'SET_SHEET_EDITING_DISABLED', payload: true } ) );

		expect( renameField() ).toBeNull();
		expect( tabNames() ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
	} );
} );
