/**
 * Unit tests for useImageGeneration
 *
 * Covers the three kinds of chart instance the hook accepts: one with its own captureImage() contract,
 * a Chart.js instance captured from its canvas, and anything else which just re-enables the form
 */
import { act, renderHook } from '@testing-library/react';
import { useImageGeneration } from '../../../components/admin-ui-src/hooks/useImageGeneration';
import { ChartAdminProvider, useChartAdmin } from '../../../components/admin-ui-src/context/ChartAdminContext';

let latestFormEnabled = null;

function Probe() {
	latestFormEnabled = useChartAdmin().state.formEnabled;
	return null;
}

const wrapper = ( { children } ) => (
	<ChartAdminProvider>
		<Probe />
		{ children }
	</ChartAdminProvider>
);

function setup( instance ) {
	document.body.innerHTML = '<textarea id="m-chart-img"></textarea>';
	latestFormEnabled = null;

	const chartRef = { current: instance };
	const { result } = renderHook( () => useImageGeneration( chartRef ), { wrapper } );

	return { generateImage: result.current, textarea: document.getElementById( 'm-chart-img' ) };
}

async function flush() {
	await act( async () => {
		await Promise.resolve();
		await Promise.resolve();
	} );
}

describe( 'useImageGeneration', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	test( 'awaits captureImage(), writes the result and fires image_capture_done', async () => {
		const done = jest.fn();
		window.wp.hooks.addAction( 'm_chart.image_capture_done', 'test/done', done );

		const instance = { captureImage: jest.fn().mockResolvedValue( 'data:image/png;base64,abc' ) };
		const { generateImage, textarea } = setup( instance );

		act( () => generateImage() );

		// Still waiting on the promise
		expect( latestFormEnabled ).toBe( false );

		await flush();

		expect( instance.captureImage ).toHaveBeenCalledWith( { width: 640, multiplier: 2 } );
		expect( textarea.value ).toBe( 'data:image/png;base64,abc' );
		expect( done ).toHaveBeenCalledWith( 0, instance, 'data:image/png;base64,abc' );
		expect( latestFormEnabled ).toBe( true );
	} );

	test( 'captureImage() resolving null skips the image but still enables the form', async () => {
		const done = jest.fn();
		window.wp.hooks.addAction( 'm_chart.image_capture_done', 'test/done', done );

		const { generateImage, textarea } = setup( { captureImage: () => Promise.resolve( null ) } );
		textarea.value = 'previous';

		act( () => generateImage() );
		await flush();

		expect( textarea.value ).toBe( 'previous' );
		expect( done ).not.toHaveBeenCalled();
		expect( latestFormEnabled ).toBe( true );
	} );

	test( 'a rejected captureImage() logs and still enables the form', async () => {
		const { generateImage, textarea } = setup( { captureImage: () => Promise.reject( new Error( 'boom' ) ) } );

		act( () => generateImage() );
		await flush();

		expect( textarea.value ).toBe( '' );
		expect( latestFormEnabled ).toBe( true );
		expect( console ).toHaveErrored();
	} );

	test( 'a Chart.js instance is captured from its canvas', () => {
		const canvas = document.createElement( 'canvas' );
		const parent = document.createElement( 'div' );
		parent.appendChild( canvas );
		document.body.appendChild( parent );

		const ctx = { save: jest.fn(), restore: jest.fn(), fillRect: jest.fn() };
		canvas.getContext = () => ctx;

		const instance = {
			canvas,
			width:  640,
			height: 400,
			resize: jest.fn(),
			toBase64Image: jest.fn().mockReturnValue( 'data:image/png;base64,chart' ),
		};

		const { generateImage, textarea } = setup( instance );

		act( () => generateImage() );

		expect( instance.toBase64Image ).toHaveBeenCalledWith( 'image/png', 1 );
		expect( textarea.value ).toBe( 'data:image/png;base64,chart' );
		expect( instance.resize ).toHaveBeenCalledTimes( 2 );
		expect( parent.style.width ).toBe( '' );
		expect( latestFormEnabled ).toBe( true );
	} );

	test( 'an instance with no canvas and no captureImage just enables the form', () => {
		const { generateImage, textarea } = setup( { isSomethingElse: true } );

		act( () => generateImage() );

		expect( textarea.value ).toBe( '' );
		expect( latestFormEnabled ).toBe( true );
	} );

	test( 'a missing instance enables the form instead of leaving it blocked', () => {
		const { generateImage } = setup( null );

		act( () => generateImage() );

		expect( latestFormEnabled ).toBe( true );
	} );
} );
