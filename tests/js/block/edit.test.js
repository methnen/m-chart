/**
 * Tests for the M Chart block's editor component
 *
 * With no chart selected the block is a searchable, paged picker fed by the m-chart/v1 REST routes
 * With a chart selected it shows that chart and offers the display setting, Edit chart and Replace
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import Edit from '../../../components/block-src/chart/edit';

expect.extend( toHaveNoViolations );

jest.mock( '@wordpress/api-fetch', () => ( { __esModule: true, default: jest.fn() } ) );

// wp.components logs a deprecation about its pre-6.7 margin styles once per process for each control
// The search field and the display setting first render in different tests here, so rather than tie the
// expected warning to whichever test happens to render each one first the notices are silenced for this file
jest.mock( '@wordpress/deprecated', () => ( { __esModule: true, default: jest.fn() } ) );

// The block editor packages are WordPress externals and are not installed for unit tests
// The toolbar and sidebar slots are stood in for by plain landmarks holding whatever the block puts in them
jest.mock( '@wordpress/block-editor', () => {
	const { createElement } = require( '@wordpress/element' );

	return {
		useBlockProps:     ( props = {} ) => props,
		BlockControls:     ( { children } ) => createElement( 'div', { role: 'toolbar', 'aria-label': 'Block tools' }, children ),
		InspectorControls: ( { children } ) => createElement( 'div', { role: 'region', 'aria-label': 'Block settings' }, children ),
	};
}, { virtual: true } );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: () => ( { icon: { src: 'chart-bar' } } ),
} ), { virtual: true } );

// wp.components' Placeholder measures itself, which jsdom has no observer for
window.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

const SITE_URL  = 'http://example.org';
const PAGE_SIZE = 9;

const OPTIONS = {
	siteurl:         SITE_URL,
	image_support:   true,
	posts_available: true,
};

/**
 * A chart as the REST routes return it
 *
 * @param {number} id        Post ID
 * @param {Object} overrides Fields to change
 * @return {Object} The chart summary
 */
function chart( id, overrides = {} ) {
	return {
		id,
		title:    `Chart ${ id }`,
		subtitle: '',
		url:      `${ SITE_URL }/wp-content/uploads/chart-${ id }.png`,
		type:     'line',
		height:   800,
		width:    1200,
		...overrides,
	};
}

function charts( count, overrides = {} ) {
	return Array.from( { length: count }, ( _, i ) => chart( i + 1, overrides ) );
}

/**
 * Answer the block's REST requests the way the plugin's routes do
 * The list is searched by title and paged nine at a time, a single chart is looked up by ID
 *
 * @param {Object}   site
 * @param {Object}   site.options Response for /options, or an Error to reject with
 * @param {Object[]} site.library Every published chart on the site
 * @param {Object}   site.errors  Errors to reject with, keyed by 'charts' or 'chart'
 *                                A function is called with the request URL and may return an error or nothing
 */
function mockSite( { options = OPTIONS, library = charts( 3 ), errors = {} } = {} ) {
	apiFetch.mockImplementation( ( { path } ) => {
		const url = new URL( path, SITE_URL );

		if ( '/m-chart/v1/options' === url.pathname ) {
			return options instanceof Error ? Promise.reject( options ) : Promise.resolve( options );
		}

		if ( '/m-chart/v1/charts' === url.pathname ) {
			const listError = 'function' === typeof errors.charts ? errors.charts( url ) : errors.charts;

			if ( listError ) {
				return Promise.reject( listError );
			}

			const term    = ( url.searchParams.get( 's' ) || '' ).toLowerCase();
			const page    = Number( url.searchParams.get( 'page' ) || 1 );
			const matches = library.filter( ( item ) => item.title.toLowerCase().includes( term ) );

			return Promise.resolve( {
				found_posts: matches.length,
				posts:       matches.slice( ( page - 1 ) * PAGE_SIZE, page * PAGE_SIZE ),
			} );
		}

		const single = url.pathname.match( /^\/m-chart\/v1\/chart\/(\d+)$/ );

		if ( single ) {
			const found = library.find( ( item ) => item.id === Number( single[ 1 ] ) );

			if ( errors.chart || ! found ) {
				return Promise.reject( errors.chart || { code: 'not_found', message: 'Chart not found' } );
			}

			return Promise.resolve( found );
		}

		return Promise.reject( { code: 'rest_no_route', message: `No route for ${ path }` } );
	} );
}

function requestedPaths() {
	return apiFetch.mock.calls.map( ( [ { path } ] ) => path );
}

function chartListRequests() {
	return requestedPaths().filter( ( path ) => path.startsWith( '/m-chart/v1/charts' ) );
}

// A request that stays in flight until the test settles it
function deferred() {
	let resolve;
	let reject;

	const promise = new Promise( ( res, rej ) => {
		resolve = res;
		reject  = rej;
	} );

	return { promise, resolve, reject };
}

let setAttributes;
let openWindow;

// Holds the attributes the way the block editor does, so choosing a chart re-renders the block with it selected
function Block( { initial } ) {
	const [ attributes, setState ] = useState( initial );

	return (
		<Edit
			attributes={ attributes }
			setAttributes={ ( next ) => {
				setAttributes( next );
				setState( ( prev ) => ( { ...prev, ...next } ) );
			} }
		/>
	);
}

function renderBlock( attributes = {} ) {
	return render( <Block initial={ { chartId: 0, show: 'chart', ...attributes } } /> );
}

// The picker is ready once the first page of charts and the options have both arrived
async function renderPicker( attributes ) {
	const utils = renderBlock( attributes );

	await screen.findByRole( 'searchbox' );

	return utils;
}

async function renderSelected( attributes = { chartId: 2 } ) {
	const utils = renderBlock( attributes );

	await waitFor( () => expect( utils.container.querySelector( '.chart-selected' ) ).toBeInTheDocument() );

	return utils;
}

// Let resolved requests and the state updates that follow them land, without moving the clock
async function settle() {
	await act( async () => {
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
	} );
}

// Choosing a chart sends the block off to load it, tests that end on the click wait here for it to arrive
function chartShown( title ) {
	return screen.findByRole( 'img', { name: title } );
}

function chartButtons() {
	return screen.queryAllByRole( 'button', { name: /^Select chart: / } );
}

function listedTitles() {
	return chartButtons().map( ( button ) => button.getAttribute( 'aria-label' ).replace( 'Select chart: ', '' ) );
}

function spinner( container ) {
	return container.querySelector( '.components-spinner' );
}

function loadMoreButton() {
	return screen.queryByRole( 'button', { name: 'Load more results' } );
}

beforeEach( () => {
	apiFetch.mockReset();
	setAttributes = jest.fn();
	openWindow    = jest.spyOn( window, 'open' ).mockImplementation( () => null );
	mockSite();
} );

// The spy is restored on its own, jest.restoreAllMocks() would also take away the console spies
// @wordpress/jest-console uses to fail a test that logs an unexpected error or warning
afterEach( () => {
	jest.useRealTimers();
	openWindow.mockRestore();
} );

describe( 'M Chart block loading the picker', () => {
	test( 'asks the REST API for the site options and the first page of charts', async () => {
		await renderPicker();

		expect( requestedPaths() ).toEqual( [ '/m-chart/v1/options', '/m-chart/v1/charts' ] );
	} );

	test( 'does not ask for a single chart when none is selected', async () => {
		await renderPicker();

		expect( requestedPaths().filter( ( path ) => path.startsWith( '/m-chart/v1/chart/' ) ) ).toEqual( [] );
	} );

	test( 'shows a spinner until the charts arrive', async () => {
		const list = deferred();

		apiFetch.mockImplementation( ( { path } ) => (
			'/m-chart/v1/options' === path ? Promise.resolve( OPTIONS ) : list.promise
		) );

		const { container } = renderBlock();

		await settle();

		expect( spinner( container ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'searchbox' ) ).toBeNull();
		expect( chartButtons() ).toHaveLength( 0 );

		await act( async () => {
			list.resolve( { found_posts: 1, posts: [ chart( 1 ) ] } );
		} );

		expect( spinner( container ) ).toBeNull();
		expect( listedTitles() ).toEqual( [ 'Chart 1' ] );
	} );

	test( 'is labelled as the M Chart block', async () => {
		await renderPicker();

		expect( screen.getByText( 'M Chart' ) ).toBeInTheDocument();
	} );

	test( 'lists every chart on the first page as a button named after the chart', async () => {
		await renderPicker();

		expect( listedTitles() ).toEqual( [ 'Chart 1', 'Chart 2', 'Chart 3' ] );
	} );

	test.each( [
		[ 1, '1 chart found' ],
		[ 3, '3 charts found' ],
		[ 25, '25 charts found' ],
	] )( 'reports the total of %d as "%s"', async ( count, text ) => {
		mockSite( { library: charts( count ) } );

		await renderPicker();

		expect( screen.getByRole( 'status' ) ).toHaveTextContent( text );
	} );

	test( 'shows chart titles with their HTML entities decoded', async () => {
		mockSite( { library: [
			chart( 1, { title: 'R&amp;D spend' } ),
			chart( 2, { title: 'Bob&#8217;s &lt;best&gt; chart' } ),
		] } );

		const { container } = await renderPicker();

		expect( listedTitles() ).toEqual( [ 'R&D spend', 'Bob’s <best> chart' ] );
		expect( screen.getByText( 'Bob’s <best> chart' ) ).toBeInTheDocument();

		// Decoded for display only, nothing in a title becomes an element
		expect( container.querySelector( 'best' ) ).toBeNull();
	} );

	test( 'a chart without a title is listed as a dash so it can still be chosen', async () => {
		mockSite( { library: [ chart( 7, { title: '' } ) ] } );

		await renderPicker();

		expect( listedTitles() ).toEqual( [ '-' ] );
	} );

	test( 'shows each chart\'s image when the site generates images', async () => {
		const { container } = await renderPicker();

		const images = Array.from( container.querySelectorAll( 'ul.results img' ) ).map( ( img ) => img.getAttribute( 'src' ) );

		expect( images ).toHaveLength( 3 );
		expect( images[ 0 ] ).toMatch( /^http:\/\/example\.org\/wp-content\/uploads\/chart-1\.png\?cache=[\d.]+$/ );
		expect( images[ 2 ] ).toMatch( /^http:\/\/example\.org\/wp-content\/uploads\/chart-3\.png\?cache=[\d.]+$/ );
	} );

	test( 'shows a chart type icon instead of an image when the site does not generate images', async () => {
		mockSite( {
			options: { ...OPTIONS, image_support: false },
			library: [ chart( 1, { type: 'pie' } ) ],
		} );

		const { container } = await renderPicker();

		expect( container.querySelector( 'ul.results img' ) ).toBeNull();
		expect( container.querySelector( 'ul.results .icon.pie' ) ).toBeInTheDocument();
		expect( listedTitles() ).toEqual( [ 'Chart 1' ] );
	} );

	test( 'falls back to the type icon for a chart that has no image yet', async () => {
		mockSite( { library: [ chart( 1 ), chart( 2, { url: '', type: 'bar' } ) ] } );

		const { container } = await renderPicker();

		expect( container.querySelectorAll( 'ul.results img' ) ).toHaveLength( 1 );
		expect( container.querySelector( 'ul.results .icon.bar' ) ).toBeInTheDocument();
	} );

	test( 'offers New chart in the toolbar, which opens the new chart screen in a new tab', async () => {
		await renderPicker();

		const toolbar = screen.getByRole( 'toolbar', { name: 'Block tools' } );

		fireEvent.click( within( toolbar ).getByRole( 'button', { name: 'New chart' } ) );

		expect( openWindow ).toHaveBeenCalledWith( `${ SITE_URL }/wp-admin/post-new.php?post_type=m-chart`, '_blank' );
		expect( within( toolbar ).queryByRole( 'button', { name: 'Edit chart' } ) ).toBeNull();
		expect( within( toolbar ).queryByRole( 'button', { name: 'Replace' } ) ).toBeNull();
	} );

	test( 'has no display setting until a chart is selected', async () => {
		await renderPicker();

		expect( screen.queryByRole( 'combobox', { name: 'Show' } ) ).toBeNull();
	} );

	test( 'has no accessibility violations', async () => {
		const { container } = await renderPicker();

		expect( await axe( container ) ).toHaveNoViolations();
	} );
} );

describe( 'M Chart block with nothing to pick', () => {
	test( 'says so and links to the new chart screen when the site has no published charts', async () => {
		mockSite( { options: { ...OPTIONS, posts_available: false }, library: [] } );

		renderBlock();

		expect( await screen.findByText( 'No charts found' ) ).toBeInTheDocument();
		expect( screen.getByRole( 'link', { name: /Create a new chart/ } ) )
			.toHaveAttribute( 'href', `${ SITE_URL }/wp-admin/post-new.php?post_type=m-chart` );
		expect( screen.queryByRole( 'searchbox' ) ).toBeNull();
	} );

	test( 'says there was a problem when the charts route is missing', async () => {
		mockSite( { errors: { charts: { code: 'rest_no_route', message: 'No route was found' } } } );

		const { container } = renderBlock();

		expect( await screen.findByText( 'There was a problem loading charts' ) ).toBeInTheDocument();
		expect( spinner( container ) ).toBeNull();

		// The search field is there whenever loading fails, see "a search that fails" below
		expect( screen.getByRole( 'searchbox' ) ).toBeInTheDocument();
	} );

	// Any failure of the first page is reported, not only rest_no_route
	// otherwise the block sits on its spinner forever
	test.each( [
		[ 'a server error', { code: 'internal_server_error', message: 'Server error', data: { status: 500 } } ],
		[ 'a permissions error', { code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.', data: { status: 403 } } ],
		[ 'being offline', { code: 'fetch_error', message: 'You are probably offline.' } ],
	] )( 'says there was a problem when the charts request fails with %s', async ( description, error ) => {
		mockSite( { errors: { charts: error } } );

		renderBlock();

		await settle();

		expect( screen.getByText( 'There was a problem loading charts' ) ).toBeInTheDocument();
	} );
} );

describe( 'M Chart block picking a chart', () => {
	test( 'choosing a chart stores its ID on the block', async () => {
		await renderPicker();

		fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Chart 2' } ) );

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 2 } );

		await chartShown( 'Chart 2' );
	} );

	test( 'choosing a chart leaves the display setting alone', async () => {
		await renderPicker( { show: 'table' } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Chart 2' } ) );

		expect( setAttributes.mock.calls.every( ( [ next ] ) => ! ( 'show' in next ) ) ).toBe( true );

		await chartShown( 'Chart 2' );
	} );

	test( 'the block then loads and shows the chosen chart', async () => {
		const { container } = await renderPicker();

		fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Chart 2' } ) );

		expect( await screen.findByRole( 'img', { name: 'Chart 2' } ) ).toBeInTheDocument();
		expect( requestedPaths() ).toContain( '/m-chart/v1/chart/2' );
		expect( container.querySelector( 'ul.results' ) ).toBeNull();
		expect( screen.queryByRole( 'searchbox' ) ).toBeNull();
	} );

	test( 'a chart can be chosen from the list without images', async () => {
		mockSite( { options: { ...OPTIONS, image_support: false } } );

		await renderPicker();

		fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Chart 3' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 3 } );
		expect( await screen.findByRole( 'heading', { name: 'Chart 3' } ) ).toBeInTheDocument();
	} );

	test( 'a chart can be chosen from the keyboard', async () => {
		const user = userEvent.setup();

		await renderPicker();

		screen.getByRole( 'button', { name: 'Select chart: Chart 3' } ).focus();

		await user.keyboard( '{Enter}' );

		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 3 } );

		await chartShown( 'Chart 3' );
	} );
} );

describe( 'M Chart block search', () => {
	beforeEach( () => {
		jest.useFakeTimers();

		mockSite( { library: [
			chart( 1, { title: 'Sales by region' } ),
			chart( 2, { title: 'Sales by month' } ),
			chart( 3, { title: 'Headcount' } ),
		] } );
	} );

	async function renderPickerOnFakeClock() {
		const utils = renderBlock();

		await settle();

		return utils;
	}

	function typeSearch( value ) {
		fireEvent.change( screen.getByRole( 'searchbox' ), { target: { value } } );
	}

	async function search( value ) {
		typeSearch( value );

		await act( async () => {
			jest.advanceTimersByTime( 500 );
		} );

		await settle();
	}

	test( 'the search field asks for a title', async () => {
		await renderPickerOnFakeClock();

		expect( screen.getByRole( 'searchbox' ) ).toHaveAttribute( 'placeholder', 'Search by title' );
	} );

	test( 'does not query while the user is still typing', async () => {
		await renderPickerOnFakeClock();

		typeSearch( 'sal' );

		await act( async () => {
			jest.advanceTimersByTime( 499 );
		} );

		expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts' ] );
	} );

	test( 'queries for the term half a second after the last keystroke', async () => {
		await renderPickerOnFakeClock();

		typeSearch( 'sales' );

		await act( async () => {
			jest.advanceTimersByTime( 500 );
		} );

		expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts', '/m-chart/v1/charts?s=sales' ] );
	} );

	test( 'a burst of keystrokes becomes one query for the final text', async () => {
		const user = userEvent.setup( { advanceTimers: jest.advanceTimersByTime, delay: 100 } );

		await renderPickerOnFakeClock();

		await user.type( screen.getByRole( 'searchbox' ), 'sales' );

		expect( screen.getByRole( 'searchbox' ) ).toHaveValue( 'sales' );
		expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts' ] );

		await act( async () => {
			jest.advanceTimersByTime( 500 );
		} );

		expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts', '/m-chart/v1/charts?s=sales' ] );
	} );

	test( 'each pause in typing sends its own query', async () => {
		await renderPickerOnFakeClock();

		await search( 'sales' );
		await search( 'sales by m' );

		expect( chartListRequests() ).toEqual( [
			'/m-chart/v1/charts',
			'/m-chart/v1/charts?s=sales',
			'/m-chart/v1/charts?s=sales+by+m',
		] );
	} );

	test( 'the list and the count are replaced by the matches', async () => {
		await renderPickerOnFakeClock();

		expect( listedTitles() ).toEqual( [ 'Sales by region', 'Sales by month', 'Headcount' ] );

		await search( 'sales' );

		expect( listedTitles() ).toEqual( [ 'Sales by region', 'Sales by month' ] );
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( '2 charts found' );
	} );

	test( 'the search field keeps showing what was typed', async () => {
		await renderPickerOnFakeClock();

		await search( 'sales' );

		expect( screen.getByRole( 'searchbox' ) ).toHaveValue( 'sales' );
	} );

	test( 'a term with URL characters in it is encoded into the query', async () => {
		await renderPickerOnFakeClock();

		await search( 'R&D 50% #1?' );

		const [ , request ] = chartListRequests();

		expect( request ).toBe( '/m-chart/v1/charts?s=R%26D+50%25+%231%3F' );
		expect( new URL( request, SITE_URL ).searchParams.get( 's' ) ).toBe( 'R&D 50% #1?' );
	} );

	test( 'a search with no matches says so and keeps the search field', async () => {
		const { container } = await renderPickerOnFakeClock();

		await search( 'zebra' );

		expect( screen.getByText( 'No charts found' ) ).toBeInTheDocument();
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( '0 charts found' );
		expect( screen.getByRole( 'searchbox' ) ).toHaveValue( 'zebra' );
		expect( chartButtons() ).toHaveLength( 0 );
		expect( container.querySelector( 'ul.results' ) ).toBeNull();
	} );

	// The message used to take the place of the whole picker, search field included,
	// which left nothing to do but remove the block and add it again
	describe( 'when loading fails', () => {
		const LIBRARY = [
			chart( 1, { title: 'Sales by region' } ),
			chart( 2, { title: 'Sales by month' } ),
			chart( 3, { title: 'Headcount' } ),
		];

		const SERVER_ERROR = { code: 'internal_server_error', message: 'Server error', data: { status: 500 } };

		test( 'a search that fails says so and keeps the search field', async () => {
			mockSite( { library: LIBRARY, errors: { charts: ( url ) => ( url.searchParams.get( 's' ) ? SERVER_ERROR : undefined ) } } );

			const { container } = await renderPickerOnFakeClock();

			expect( listedTitles() ).toHaveLength( 3 );

			await search( 'sales' );

			expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'There was a problem loading charts' );
			expect( screen.getByRole( 'searchbox' ) ).toHaveValue( 'sales' );

			// The message stands in for the list, and no count is claimed for a search that never came back
			expect( chartButtons() ).toHaveLength( 0 );
			expect( container.querySelector( 'ul.results' ) ).toBeNull();
			expect( screen.queryByRole( 'status' ) ).toBeNull();
			expect( spinner( container ) ).toBeNull();
		} );

		test( 'searching again after a failed search is the way to try again', async () => {
			let failing = true;

			mockSite( { library: LIBRARY, errors: { charts: ( url ) => ( failing && url.searchParams.get( 's' ) ? SERVER_ERROR : undefined ) } } );

			await renderPickerOnFakeClock();
			await search( 'sales' );

			expect( screen.getByRole( 'alert' ) ).toBeInTheDocument();

			failing = false;

			await search( 'headcount' );

			expect( screen.queryByRole( 'alert' ) ).toBeNull();
			expect( listedTitles() ).toEqual( [ 'Headcount' ] );
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '1 chart found' );
		} );

		test( 'clearing the field after a failed search brings the whole list back', async () => {
			mockSite( { library: LIBRARY, errors: { charts: ( url ) => ( url.searchParams.get( 's' ) ? SERVER_ERROR : undefined ) } } );

			await renderPickerOnFakeClock();
			await search( 'sales' );
			await search( '' );

			expect( screen.queryByRole( 'alert' ) ).toBeNull();
			expect( listedTitles() ).toHaveLength( 3 );
		} );

		test( 'a first load that fails still offers the search field, and a search recovers', async () => {
			let failing = true;

			mockSite( { library: LIBRARY, errors: { charts: () => ( failing ? SERVER_ERROR : undefined ) } } );

			const { container } = await renderPickerOnFakeClock();

			expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'There was a problem loading charts' );
			expect( screen.getByRole( 'searchbox' ) ).toBeInTheDocument();
			expect( spinner( container ) ).toBeNull();

			failing = false;

			await search( 'sales' );

			expect( screen.queryByRole( 'alert' ) ).toBeNull();
			expect( listedTitles() ).toEqual( [ 'Sales by region', 'Sales by month' ] );
		} );
	} );

	test( 'clearing the search brings the whole list back', async () => {
		await renderPickerOnFakeClock();

		await search( 'headcount' );

		expect( listedTitles() ).toEqual( [ 'Headcount' ] );

		await search( '' );

		expect( chartListRequests().pop() ).toBe( '/m-chart/v1/charts' );
		expect( listedTitles() ).toEqual( [ 'Sales by region', 'Sales by month', 'Headcount' ] );
	} );

	test( 'a chart found by searching can be chosen', async () => {
		await renderPickerOnFakeClock();

		await search( 'headcount' );

		fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Headcount' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 3 } );

		// Let the block finish loading the chosen chart before the test ends
		await settle();
	} );

	// getCharts() drops a response that belongs to a list a newer search has replaced
	// otherwise an older search that answers late puts its results back under the newer search term
	test( 'an older search that answers late does not replace the results of a newer one', async () => {
		const slowSales = deferred();

		apiFetch.mockImplementation( ( { path } ) => {
			if ( '/m-chart/v1/options' === path ) {
				return Promise.resolve( OPTIONS );
			}

			if ( path.includes( 's=sales' ) ) {
				return slowSales.promise;
			}

			return Promise.resolve( { found_posts: 1, posts: [ chart( 3, { title: 'Headcount' } ) ] } );
		} );

		await renderPickerOnFakeClock();

		// The search for "sales" stays in flight while the search for "head" is sent and answered
		await search( 'sales' );
		await search( 'head' );

		expect( listedTitles() ).toEqual( [ 'Headcount' ] );

		await act( async () => {
			slowSales.resolve( {
				found_posts: 2,
				posts:       [ chart( 1, { title: 'Sales by region' } ), chart( 2, { title: 'Sales by month' } ) ],
			} );
		} );

		expect( screen.getByRole( 'searchbox' ) ).toHaveValue( 'head' );
		expect( listedTitles() ).toEqual( [ 'Headcount' ] );
	} );
} );

describe( 'M Chart block paging', () => {
	test( 'offers to load more when there are more charts than the first page holds', async () => {
		mockSite( { library: charts( 12 ) } );

		await renderPicker();

		expect( chartButtons() ).toHaveLength( 9 );
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( '12 charts found' );
		expect( loadMoreButton() ).toBeInTheDocument();
	} );

	test( 'does not offer to load more when everything is already listed', async () => {
		mockSite( { library: charts( 9 ) } );

		await renderPicker();

		expect( chartButtons() ).toHaveLength( 9 );
		expect( loadMoreButton() ).toBeNull();
	} );

	test( 'Load more results asks for the next page and adds it under the first', async () => {
		mockSite( { library: charts( 12 ) } );

		await renderPicker();

		fireEvent.click( loadMoreButton() );

		await waitFor( () => expect( chartButtons() ).toHaveLength( 12 ) );

		expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts', '/m-chart/v1/charts?page=2' ] );
		expect( listedTitles().slice( 0, 2 ) ).toEqual( [ 'Chart 1', 'Chart 2' ] );
		expect( listedTitles().slice( -3 ) ).toEqual( [ 'Chart 10', 'Chart 11', 'Chart 12' ] );
		expect( loadMoreButton() ).toBeNull();
	} );

	test( 'keeps paging until the whole library is listed', async () => {
		mockSite( { library: charts( 20 ) } );

		await renderPicker();

		fireEvent.click( loadMoreButton() );
		await waitFor( () => expect( chartButtons() ).toHaveLength( 18 ) );

		fireEvent.click( loadMoreButton() );
		await waitFor( () => expect( chartButtons() ).toHaveLength( 20 ) );

		expect( chartListRequests() ).toEqual( [
			'/m-chart/v1/charts',
			'/m-chart/v1/charts?page=2',
			'/m-chart/v1/charts?page=3',
		] );
		expect( loadMoreButton() ).toBeNull();
	} );

	test( 'shows a spinner in place of the button while the next page is on its way', async () => {
		const nextPage = deferred();

		apiFetch.mockImplementation( ( { path } ) => {
			if ( '/m-chart/v1/options' === path ) {
				return Promise.resolve( OPTIONS );
			}

			return path.includes( 'page=2' )
				? nextPage.promise
				: Promise.resolve( { found_posts: 10, posts: charts( 9 ) } );
		} );

		const { container } = await renderPicker();

		fireEvent.click( loadMoreButton() );

		expect( loadMoreButton() ).toBeNull();
		expect( container.querySelector( 'li.loading-more .components-spinner' ) ).toBeInTheDocument();

		// The charts already listed stay where they are
		expect( chartButtons() ).toHaveLength( 9 );

		await act( async () => {
			nextPage.resolve( { found_posts: 10, posts: [ chart( 10 ) ] } );
		} );

		expect( container.querySelector( 'li.loading-more' ) ).toBeNull();
		expect( chartButtons() ).toHaveLength( 10 );
	} );

	// Fails the first request for a page past the first, as a dropped connection would
	function failFirstNextPage() {
		let failed = false;

		return ( url ) => {
			if ( failed || ! url.searchParams.has( 'page' ) ) {
				return null;
			}

			failed = true;

			return { code: 'fetch_error', message: 'You are probably offline.' };
		};
	}

	test( 'a failed next page keeps the charts already listed and brings the button back', async () => {
		mockSite( { library: charts( 30 ), errors: { charts: failFirstNextPage() } } );

		const { container } = await renderPicker();

		fireEvent.click( loadMoreButton() );

		await waitFor( () => expect( loadMoreButton() ).toBeInTheDocument() );

		expect( container.querySelector( 'li.loading-more' ) ).toBeNull();
		expect( listedTitles() ).toEqual( charts( 9 ).map( ( item ) => item.title ) );
	} );

	// The page counter only advances once a page has arrived
	// otherwise the retry asks for page 3 and the nine charts of page 2 are never listed
	test( 'trying again after a failed next page asks for the page that failed', async () => {
		mockSite( { library: charts( 30 ), errors: { charts: failFirstNextPage() } } );

		await renderPicker();

		fireEvent.click( loadMoreButton() );

		await waitFor( () => expect( loadMoreButton() ).toBeInTheDocument() );

		fireEvent.click( loadMoreButton() );

		await waitFor( () => expect( chartButtons() ).toHaveLength( 18 ) );

		expect( chartListRequests() ).toEqual( [
			'/m-chart/v1/charts',
			'/m-chart/v1/charts?page=2',
			'/m-chart/v1/charts?page=2',
		] );
		expect( listedTitles().slice( 9 ) ).toEqual( charts( 18 ).slice( 9 ).map( ( item ) => item.title ) );
	} );

	describe( 'by scrolling', () => {
		// jsdom has no layout, so the list is given the geometry of a 300px tall box holding 1000px of charts
		function scrollListTo( list, scrollTop ) {
			Object.defineProperty( list, 'scrollHeight', { configurable: true, value: 1000 } );
			Object.defineProperty( list, 'clientHeight', { configurable: true, value: 300 } );
			Object.defineProperty( list, 'scrollTop', { configurable: true, value: scrollTop } );

			fireEvent.scroll( list );
		}

		test( 'scrolling near the bottom of the list loads the next page', async () => {
			mockSite( { library: charts( 12 ) } );

			const { container } = await renderPicker();

			// 100px or less from the bottom
			scrollListTo( container.querySelector( 'ul.results' ), 600 );

			await waitFor( () => expect( chartButtons() ).toHaveLength( 12 ) );

			expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts', '/m-chart/v1/charts?page=2' ] );
		} );

		test( 'scrolling higher up the list loads nothing', async () => {
			mockSite( { library: charts( 12 ) } );

			const { container } = await renderPicker();

			scrollListTo( container.querySelector( 'ul.results' ), 599 );

			expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts' ] );
		} );

		test( 'scrolling to the bottom loads nothing once every chart is listed', async () => {
			mockSite( { library: charts( 5 ) } );

			const { container } = await renderPicker();

			scrollListTo( container.querySelector( 'ul.results' ), 700 );

			expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts' ] );
		} );

		test( 'more scrolling while a page is already loading does not ask for it twice', async () => {
			const nextPage = deferred();

			apiFetch.mockImplementation( ( { path } ) => {
				if ( '/m-chart/v1/options' === path ) {
					return Promise.resolve( OPTIONS );
				}

				return path.includes( 'page=' )
					? nextPage.promise
					: Promise.resolve( { found_posts: 30, posts: charts( 9 ) } );
			} );

			const { container } = await renderPicker();
			const list          = container.querySelector( 'ul.results' );

			scrollListTo( list, 700 );
			scrollListTo( list, 700 );
			scrollListTo( list, 700 );

			expect( chartListRequests() ).toEqual( [ '/m-chart/v1/charts', '/m-chart/v1/charts?page=2' ] );

			await act( async () => {
				nextPage.resolve( { found_posts: 30, posts: [ chart( 10 ) ] } );
			} );
		} );

		test( 'scrolling again after a failed next page asks for the page that failed', async () => {
			mockSite( { library: charts( 30 ), errors: { charts: failFirstNextPage() } } );

			const { container } = await renderPicker();
			const list          = container.querySelector( 'ul.results' );

			scrollListTo( list, 700 );

			// The button comes back once the failed request has been dealt with
			await waitFor( () => expect( chartListRequests() ).toHaveLength( 2 ) );
			await waitFor( () => expect( loadMoreButton() ).toBeInTheDocument() );

			scrollListTo( list, 700 );

			await waitFor( () => expect( chartButtons() ).toHaveLength( 18 ) );

			expect( chartListRequests() ).toEqual( [
				'/m-chart/v1/charts',
				'/m-chart/v1/charts?page=2',
				'/m-chart/v1/charts?page=2',
			] );
		} );

		test( 'scrolling still pages after a chart was selected and then replaced', async () => {
			mockSite( { library: charts( 12 ) } );

			const { container } = await renderPicker();

			fireEvent.click( screen.getByRole( 'button', { name: 'Select chart: Chart 1' } ) );

			fireEvent.click( await screen.findByRole( 'button', { name: 'Replace' } ) );

			// The list was unmounted while the chart was selected, this is a new element
			scrollListTo( container.querySelector( 'ul.results' ), 700 );

			await waitFor( () => expect( chartButtons() ).toHaveLength( 12 ) );
		} );
	} );

	describe( 'together with search', () => {
		beforeEach( () => {
			jest.useFakeTimers();
		} );

		async function searchFor( value ) {
			fireEvent.change( screen.getByRole( 'searchbox' ), { target: { value } } );

			await act( async () => {
				jest.advanceTimersByTime( 500 );
			} );

			await settle();
		}

		test( 'the next page of a search carries the search term', async () => {
			mockSite( { library: [ ...charts( 12, { title: 'Sales' } ), chart( 99, { title: 'Headcount' } ) ] } );

			renderBlock();

			await settle();
			await searchFor( 'sales' );

			expect( chartButtons() ).toHaveLength( 9 );

			fireEvent.click( loadMoreButton() );

			await settle();

			expect( chartListRequests().pop() ).toBe( '/m-chart/v1/charts?s=sales&page=2' );
			expect( chartButtons() ).toHaveLength( 12 );
		} );

		test( 'a next page that answers after a new search was made is not added to the search results', async () => {
			const slowPage = deferred();

			apiFetch.mockImplementation( ( { path } ) => {
				if ( '/m-chart/v1/options' === path ) {
					return Promise.resolve( OPTIONS );
				}

				if ( path.includes( 's=head' ) ) {
					return Promise.resolve( { found_posts: 1, posts: [ chart( 99, { title: 'Headcount' } ) ] } );
				}

				return path.includes( 'page=2' )
					? slowPage.promise
					: Promise.resolve( { found_posts: 12, posts: charts( 9 ) } );
			} );

			const { container } = renderBlock();

			await settle();

			// The second page stays in flight while a search is sent and answered
			fireEvent.click( loadMoreButton() );

			await searchFor( 'head' );

			expect( listedTitles() ).toEqual( [ 'Headcount' ] );

			await act( async () => {
				slowPage.resolve( { found_posts: 12, posts: [ chart( 10 ), chart( 11 ), chart( 12 ) ] } );
			} );

			expect( listedTitles() ).toEqual( [ 'Headcount' ] );
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '1 chart found' );
			expect( container.querySelector( 'li.loading-more' ) ).toBeNull();
		} );

		test( 'a next page asked for while a search is still in flight does not cancel the search', async () => {
			const slowSearch = deferred();
			const sales      = charts( 12, { title: 'Sales' } );

			apiFetch.mockImplementation( ( { path } ) => {
				if ( '/m-chart/v1/options' === path ) {
					return Promise.resolve( OPTIONS );
				}

				if ( path.includes( 's=sales' ) ) {
					return path.includes( 'page=2' )
						? Promise.resolve( { found_posts: 12, posts: sales.slice( 9 ) } )
						: slowSearch.promise;
				}

				return Promise.resolve( { found_posts: 30, posts: charts( 9 ) } );
			} );

			renderBlock();

			await settle();

			// The search stays in flight, the list on screen is still the unfiltered one with more to load
			await searchFor( 'sales' );

			fireEvent.click( loadMoreButton() );

			await settle();

			await act( async () => {
				slowSearch.resolve( { found_posts: 12, posts: sales.slice( 0, 9 ) } );
			} );

			// The first page of the search is what ends up listed
			expect( listedTitles() ).toEqual( sales.slice( 0, 9 ).map( ( item ) => item.title ) );
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '12 charts found' );

			// and the next page asked for is the second, not the third
			fireEvent.click( loadMoreButton() );

			await settle();

			expect( chartListRequests().pop() ).toBe( '/m-chart/v1/charts?s=sales&page=2' );
			expect( chartButtons() ).toHaveLength( 12 );
		} );

		test( 'a new search starts again from the first page', async () => {
			mockSite( { library: charts( 30 ) } );

			renderBlock();

			await settle();

			fireEvent.click( loadMoreButton() );

			await settle();

			expect( chartButtons() ).toHaveLength( 18 );

			await searchFor( 'chart 1' );

			// Chart 1 and Chart 10 to 19, the first nine of eleven
			expect( chartListRequests().pop() ).toBe( '/m-chart/v1/charts?s=chart+1' );
			expect( chartButtons() ).toHaveLength( 9 );

			fireEvent.click( loadMoreButton() );

			await settle();

			expect( chartListRequests().pop() ).toBe( '/m-chart/v1/charts?s=chart+1&page=2' );
			expect( chartButtons() ).toHaveLength( 11 );
		} );
	} );
} );

describe( 'M Chart block with a chart selected', () => {
	test( 'asks the REST API for that chart', async () => {
		await renderSelected( { chartId: 2 } );

		expect( requestedPaths() ).toContain( '/m-chart/v1/chart/2' );
	} );

	test( 'a chart ID saved as a string by an older version is still looked up', async () => {
		await renderSelected( { chartId: '2' } );

		expect( requestedPaths() ).toContain( '/m-chart/v1/chart/2' );
	} );

	test( 'shows a spinner until the chart arrives', async () => {
		const single = deferred();

		apiFetch.mockImplementation( ( { path } ) => {
			if ( '/m-chart/v1/options' === path ) {
				return Promise.resolve( OPTIONS );
			}

			return path.startsWith( '/m-chart/v1/chart/' )
				? single.promise
				: Promise.resolve( { found_posts: 0, posts: [] } );
		} );

		const { container } = renderBlock( { chartId: 2 } );

		await settle();

		expect( spinner( container ) ).toBeInTheDocument();
		expect( container.querySelector( '.chart-selected' ) ).toBeNull();

		await act( async () => {
			single.resolve( chart( 2 ) );
		} );

		expect( spinner( container ) ).toBeNull();
		expect( screen.getByRole( 'img', { name: 'Chart 2' } ) ).toBeInTheDocument();
	} );

	test( 'shows the chart image, described by the chart title', async () => {
		await renderSelected( { chartId: 2 } );

		const image = screen.getByRole( 'img', { name: 'Chart 2' } );

		expect( image.getAttribute( 'src' ) ).toMatch( /^http:\/\/example\.org\/wp-content\/uploads\/chart-2\.png\?cache=[\d.]+$/ );
	} );

	test( 'shows the title, subtitle and type icon when the site does not generate images', async () => {
		mockSite( {
			options: { ...OPTIONS, image_support: false },
			library: [ chart( 2, { title: 'Sales &amp; returns', subtitle: 'FY &#8217;26', type: 'bar' } ) ],
		} );

		const { container } = await renderSelected( { chartId: 2 } );

		expect( screen.getByRole( 'heading', { name: 'Sales & returns' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'heading', { name: 'FY ’26' } ) ).toBeInTheDocument();
		expect( container.querySelector( '.chart-selected .icon.bar' ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'img' ) ).toBeNull();
	} );

	test( 'leaves the subtitle out when the chart has none', async () => {
		mockSite( {
			options: { ...OPTIONS, image_support: false },
			library: [ chart( 2 ) ],
		} );

		const { container } = await renderSelected( { chartId: 2 } );

		expect( within( container.querySelector( '.chart-selected' ) ).getAllByRole( 'heading' ) ).toHaveLength( 1 );
	} );

	test( 'keeps the chart\'s proportions when it stands in for the image', async () => {
		mockSite( {
			options: { ...OPTIONS, image_support: false },
			library: [ chart( 2, { width: 1200, height: 600 } ) ],
		} );

		const { container } = await renderSelected( { chartId: 2 } );

		expect( container.querySelector( '.chart-selected .no-image' ).style.aspectRatio ).toBe( '2' );
	} );

	test( 'falls back to the title when the chart has no image yet', async () => {
		mockSite( { library: [ chart( 2, { url: '' } ) ] } );

		await renderSelected( { chartId: 2 } );

		expect( screen.getByRole( 'heading', { name: 'Chart 2' } ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'img' ) ).toBeNull();
	} );

	test( 'does not show the picker', async () => {
		const { container } = await renderSelected( { chartId: 2 } );

		expect( screen.queryByRole( 'searchbox' ) ).toBeNull();
		expect( container.querySelector( 'ul.results' ) ).toBeNull();
		expect( chartButtons() ).toHaveLength( 0 );
	} );

	test( 'Edit chart opens that chart\'s edit screen in a new tab', async () => {
		await renderSelected( { chartId: 2 } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Edit chart' } ) );

		expect( openWindow ).toHaveBeenCalledWith( `${ SITE_URL }/wp-admin/post.php?post=2&action=edit`, '_blank' );
	} );

	test( 'the toolbar offers Edit chart and Replace instead of New chart', async () => {
		await renderSelected( { chartId: 2 } );

		const toolbar = screen.getByRole( 'toolbar', { name: 'Block tools' } );

		expect( within( toolbar ).getByRole( 'button', { name: 'Edit chart' } ) ).toBeInTheDocument();
		expect( within( toolbar ).getByRole( 'button', { name: 'Replace' } ) ).toBeInTheDocument();
		expect( within( toolbar ).queryByRole( 'button', { name: 'New chart' } ) ).toBeNull();
	} );

	test( 'Replace clears the chart from the block and goes back to the picker', async () => {
		await renderSelected( { chartId: 2 } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Replace' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 0 } );
		expect( await screen.findByRole( 'searchbox' ) ).toBeInTheDocument();
		expect( listedTitles() ).toEqual( [ 'Chart 1', 'Chart 2', 'Chart 3' ] );
	} );

	test( 'choosing a different chart after Replace loads and shows the new one', async () => {
		await renderSelected( { chartId: 2 } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Replace' } ) );
		fireEvent.click( await screen.findByRole( 'button', { name: 'Select chart: Chart 3' } ) );

		expect( await screen.findByRole( 'img', { name: 'Chart 3' } ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'img', { name: 'Chart 2' } ) ).toBeNull();
		expect( requestedPaths() ).toContain( '/m-chart/v1/chart/3' );
	} );

	test( 'a chart that can no longer be loaded still leaves Replace available', async () => {
		mockSite( { errors: { chart: { code: 'not_found', message: 'Chart not found', data: { status: 404 } } } } );

		renderBlock( { chartId: 404 } );

		fireEvent.click( await screen.findByRole( 'button', { name: 'Replace' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( { chartId: 0 } );
		expect( await screen.findByRole( 'searchbox' ) ).toBeInTheDocument();
	} );

	test( 'has no accessibility violations', async () => {
		const { container } = await renderSelected( { chartId: 2 } );

		expect( await axe( container ) ).toHaveNoViolations();
	} );

	// cacheBuster is set once per block instance
	// recomputed on every render it would give every image a new URL and the browser would download them all again
	test( 'the image is not downloaded again when the block re-renders', async () => {
		await renderSelected( { chartId: 2 } );

		const before = screen.getByRole( 'img', { name: 'Chart 2' } ).getAttribute( 'src' );

		// Changing the display setting re-renders the block with the same chart
		fireEvent.change( screen.getByRole( 'combobox', { name: 'Show' } ), { target: { value: 'table' } } );

		expect( screen.getByRole( 'img', { name: 'Chart 2' } ).getAttribute( 'src' ) ).toBe( before );
	} );
} );

describe( 'M Chart block display setting', () => {
	function showSelect() {
		return within( screen.getByRole( 'region', { name: 'Block settings' } ) ).getByRole( 'combobox', { name: 'Show' } );
	}

	test( 'offers Chart, Image and Table in the block settings', async () => {
		await renderSelected( { chartId: 2 } );

		const options = Array.from( showSelect().options ).map( ( option ) => [ option.value, option.textContent ] );

		expect( options ).toEqual( [ [ 'chart', 'Chart' ], [ 'image', 'Image' ], [ 'table', 'Table' ] ] );
	} );

	test.each( [ 'chart', 'image', 'table' ] )( 'shows the saved choice of %s', async ( show ) => {
		await renderSelected( { chartId: 2, show } );

		expect( showSelect() ).toHaveValue( show );
	} );

	test.each( [ 'image', 'table' ] )( 'choosing %s stores it on the block', async ( show ) => {
		await renderSelected( { chartId: 2, show: 'chart' } );

		fireEvent.change( showSelect(), { target: { value: show } } );

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( { show } );
		expect( showSelect() ).toHaveValue( show );
	} );

	test( 'changing the display setting does not fetch the chart again', async () => {
		await renderSelected( { chartId: 2 } );

		const before = requestedPaths().length;

		fireEvent.change( showSelect(), { target: { value: 'table' } } );

		await settle();

		expect( requestedPaths() ).toHaveLength( before );
	} );

	test( 'the setting is kept when the chart is replaced', async () => {
		await renderSelected( { chartId: 2, show: 'table' } );

		fireEvent.click( screen.getByRole( 'button', { name: 'Replace' } ) );
		fireEvent.click( await screen.findByRole( 'button', { name: 'Select chart: Chart 3' } ) );

		await screen.findByRole( 'img', { name: 'Chart 3' } );

		expect( showSelect() ).toHaveValue( 'table' );
	} );
} );
