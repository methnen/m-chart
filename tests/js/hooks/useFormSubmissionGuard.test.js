/**
 * Tests for useFormSubmissionGuard
 *
 * While state.formEnabled is false the WordPress Save, Preview and Publish buttons carry the disabled class
 * and the post form refuses to submit, once it is true both are released
 */
import { act, render } from '@testing-library/react';
import { useFormSubmissionGuard } from '../../../components/admin-ui-src/hooks/useFormSubmissionGuard';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';

const GUARDED_BUTTONS = [ 'save-post', 'wp-preview', 'post-preview', 'publish' ];

let dispatchRef;

function Guard() {
	dispatchRef = useChartAdmin().dispatch;

	useFormSubmissionGuard();

	return null;
}

function renderGuard() {
	return render(
		<ChartAdminProvider>
			<Guard />
		</ChartAdminProvider>
	);
}

function setFormEnabled( enabled ) {
	act( () => dispatchRef( { type: 'SET_FORM_ENABLED', payload: enabled } ) );
}

// Mirrors the parts of the classic editor screen the hook reaches for
function setupEditorDom() {
	document.body.innerHTML = `
		<form id="post">
			<input type="submit" id="save-post" value="Save Draft" />
			<a id="post-preview" href="#">Preview</a>
			<input type="hidden" id="wp-preview" value="" />
			<input type="submit" id="publish" value="Publish" />
			<a id="delete-action" class="submitdelete" href="#">Move to Trash</a>
		</form>
	`;

	return document.getElementById( 'post' );
}

function submitForm( form ) {
	const event = new Event( 'submit', { bubbles: true, cancelable: true } );

	form.dispatchEvent( event );

	return event;
}

function disabledButtons() {
	return GUARDED_BUTTONS.filter( ( id ) => document.getElementById( id ).classList.contains( 'disabled' ) );
}

describe( 'useFormSubmissionGuard', () => {
	let form;

	beforeEach( () => {
		form = setupEditorDom();
	} );

	afterEach( () => {
		document.body.innerHTML = '';
	} );

	test( 'the save, preview and publish buttons start out disabled', () => {
		renderGuard();

		// The form is not ready until the first chart render lands
		expect( disabledButtons() ).toEqual( GUARDED_BUTTONS );
	} );

	test( 'the form cannot be submitted while it is not ready', () => {
		renderGuard();

		expect( submitForm( form ).defaultPrevented ).toBe( true );
	} );

	test( 'the buttons are released once the form is ready', () => {
		renderGuard();

		setFormEnabled( true );

		expect( disabledButtons() ).toEqual( [] );
	} );

	test( 'the form submits normally once it is ready', () => {
		renderGuard();

		setFormEnabled( true );

		expect( submitForm( form ).defaultPrevented ).toBe( false );
	} );

	test( 'the guard comes back when the form stops being ready again', () => {
		renderGuard();

		setFormEnabled( true );
		setFormEnabled( false );

		expect( disabledButtons() ).toEqual( GUARDED_BUTTONS );
		expect( submitForm( form ).defaultPrevented ).toBe( true );
	} );

	test( 'other controls on the screen are left alone', () => {
		renderGuard();

		expect( document.getElementById( 'delete-action' ).classList.contains( 'disabled' ) ).toBe( false );

		setFormEnabled( true );

		expect( document.getElementById( 'delete-action' ).className ).toBe( 'submitdelete' );
	} );

	test( 'classes the buttons already had survive the toggle', () => {
		document.getElementById( 'publish' ).className = 'button button-primary button-large';

		renderGuard();

		expect( document.getElementById( 'publish' ).className ).toBe( 'button button-primary button-large disabled' );

		setFormEnabled( true );

		expect( document.getElementById( 'publish' ).className ).toBe( 'button button-primary button-large' );
	} );

	test( 'a screen without some of the buttons still guards the ones it has', () => {
		document.getElementById( 'save-post' ).remove();
		document.getElementById( 'post-preview' ).remove();

		expect( () => renderGuard() ).not.toThrow();

		expect( document.getElementById( 'publish' ).classList.contains( 'disabled' ) ).toBe( true );
		expect( document.getElementById( 'wp-preview' ).classList.contains( 'disabled' ) ).toBe( true );
	} );

	test( 'a screen without the post form does not break', () => {
		document.body.innerHTML = '<input type="submit" id="publish" value="Publish" />';

		expect( () => renderGuard() ).not.toThrow();
		expect( document.getElementById( 'publish' ).classList.contains( 'disabled' ) ).toBe( true );

		expect( () => setFormEnabled( true ) ).not.toThrow();
		expect( document.getElementById( 'publish' ).classList.contains( 'disabled' ) ).toBe( false );
	} );

	test( 'the form is no longer blocked after the editor unmounts', () => {
		const { unmount } = renderGuard();

		unmount();

		expect( submitForm( form ).defaultPrevented ).toBe( false );
	} );
} );
