import { useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useImageGeneration } from '../hooks/useImageGeneration';

/**
 * Shallow-copies chart args to avoid mutating React state when Chart.js or MChartHelper modifies the chart config during initialization
 * Tooltip callbacks and datalabels formatter are applied by MChartHelper via its beforeUpdate hook (runs each render)
 * Bubble preprocessing runs once via beforeInit
 *
 * @param {Object} args Raw chart args from state
 * @return {Object} Sanitized clone safe to hand to Chart.js
 */
function prepareArgs( args ) {
	if ( ! args ) {
		return args;
	}

	return {
		...args,
		data:    { ...args.data },
		options: {
			...args.options,
			plugins: {
				...args.options?.plugins,
				tooltip: {
					...args.options?.plugins?.tooltip,
				},
				datalabels: {
					...args.options?.plugins?.datalabels,
				},
			},
		},
	};
}

/**
 * Default Chart.js renderer — create or update the Chart.js instance
 *
 * Applies chartjs-specific arg preparation before rendering
 * Returned instance is stored in chartRef by the caller
 * Also exposed as window.m_chart.defaultChartjsRender so library plugins can render Chart.js themselves
 *
 * @param {HTMLCanvasElement} canvas           Target canvas element
 * @param {Object}            args             Raw chart args from state
 * @param {Function}          onComplete       Callback to fire after render completes
 * @param {Object|null}       existingInstance Existing Chart.js instance, or null to create a new one
 *
 * @return {Object}             The Chart.js instance
 */
export function defaultChartjsRender( canvas, args, onComplete, existingInstance ) {
	// A brand new chart can hand us null args, Chart.js still needs a config
	const prepared = prepareArgs( args || {} );

	// Guard against null/undefined datasets or labels (Chart.js requires arrays)
	if ( ! prepared.data?.datasets ) {
		prepared.data = { ...prepared.data, datasets: [] };
	}

	if ( null === prepared.data?.labels ) {
		prepared.data = { ...prepared.data, labels: [] };
	}

	const options = {
		...prepared.options,
		animation: { onComplete },
	};

	// Only create the new chart if there isn't an existing one already
	if ( ! existingInstance ) {
		return new window.Chart( canvas, {
			type:    prepared.type,
			data:    prepared.data,
			options,
		} );
	}

	existingInstance.data        = prepared.data;
	existingInstance.config.type = prepared.type;
	existingInstance.options     = options;

	existingInstance.update();

	return existingInstance;
}

/**
 * React-managed chart preview for the admin meta box
 *
 * The chart instance is managed imperatively via refs and is never recreated on re-render — only updated when chartArgs changes
 *
 * Rendering is delegated via the 'm_chart.render_chart' wp.hooks filter so library plugins can replace the default Chart.js renderer
 * The filter receives ( canvas, args, onComplete, existingInstance, context ) as extra arguments, context carrying the image settings and post meta
 * An instance the filter returns may implement captureImage( { width, multiplier } ) to supply the chart image itself (see useImageGeneration)
 * If no filter handles rendering (i.e. returns false), Chart.js is used
 * When a filter handled the previous render but returns false now, the instance it gave us is destroyed first
 * so the Chart.js renderer never calls update() on something it didn't create
 *
 * The onComplete callback must be called by the renderer once the chart has finished which will fire 'm_chart.render_done' to trigger image generation and/or re-enable the form
 */
export default function ChartPreview() {
	const { state, dispatch } = useChartAdmin();
	const { postId, chartArgs, performance, imageSupport, imageWidth, imageMultiplier, postMeta } = state;

	const canvasRef      = useRef( null );
	const chartRef       = useRef( null );
	// True when chartRef holds an instance created by defaultChartjsRender rather than by a filter
	const ownsChartRef   = useRef( false );
	const renderFlagRef  = useRef( false );

	// Keep a ref so onComplete closures always see the latest values
	const needsImagesRef = useRef( false );
	needsImagesRef.current = ( 'default' === performance && 'yes' === imageSupport );

	const generateImage = useImageGeneration( chartRef );

	// Cleanup — destroy chart instance on unmount
	useEffect( () => {
		return () => {
			if ( chartRef.current ) {
				chartRef.current.destroy();
				chartRef.current = null;
			}
		};
	}, [] );

	// Create or update the chart instance whenever chartArgs changes
	useEffect( () => {
		if ( ! chartArgs || ! canvasRef.current ) {
			return;
		}

		function onComplete() {
			// Only fire once per update cycle
			if ( ! renderFlagRef.current ) {
				return;
			}

			renderFlagRef.current = false;

			if ( window.wp?.hooks ) {
				// The literal 1 is the instance counter slot from the pre-React events and is always 1 here
				// New listeners can read the fourth argument instead, the positional arguments stay until v3
				window.wp.hooks.doAction( 'm_chart.render_done', postId, 1, chartRef.current, { postId, instance: chartRef.current } );
			}

			if ( needsImagesRef.current ) {
				if ( window.wp?.hooks ) {
					window.wp.hooks.doAction( 'm_chart.image_capture_start', postId, chartRef.current );
				}

				generateImage();
			} else {
				// No image generation — enable form submission immediately
				// This also covers the initial page load where useChartRefresh skips its first run
				dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
			}
		}

		renderFlagRef.current = true;

		// Allow library plugins to replace the renderer via wp.hooks
		// Plugins hook 'm_chart.render_chart' and return their chart instance
		// Returning false (the default) falls through to the built-in Chart.js renderer
		let instance = false;

		if ( window.wp?.hooks ) {
			// See defaultChartjsRender for the first four filter arguments
			// The fifth hands renderers the settings they'd otherwise have to localise themselves
			instance = window.wp.hooks.applyFilters(
				'm_chart.render_chart',
				false,
				canvasRef.current,
				chartArgs,
				onComplete,
				chartRef.current,
				{ imageWidth, imageMultiplier, performance, imageSupport, postMeta }
			);
		}

		if ( false !== instance ) {
			chartRef.current     = instance;
			ownsChartRef.current = false;

			return;
		}

		// A filter owned the previous instance and has handed rendering back to us
		// Destroy it so the canvas is free and the Chart.js renderer starts fresh
		if ( chartRef.current && ! ownsChartRef.current ) {
			if ( 'function' === typeof chartRef.current.destroy ) {
				chartRef.current.destroy();
			}

			chartRef.current = null;
		}

		chartRef.current     = defaultChartjsRender( canvasRef.current, chartArgs, onComplete, chartRef.current );
		ownsChartRef.current = true;

	}, [ chartArgs ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Deterministic DOM signal for E2E tests — the submit gate releases on 'ready'
	// JS consumers should use the wp.hooks actions m_chart.form_disabled / form_enabled and m_chart.image_capture_start / image_capture_done
	// idle: no chart args yet (initial mount before first refresh resolves)
	// capturing: form is disabled mid-render-cycle and images are needed
	// ready: form is enabled (image is in the textarea, or images not needed)
	const needsImages = needsImagesRef.current;
	let captureState  = 'ready';

	if ( ! chartArgs ) {
		captureState = 'idle';
	} else if ( ! state.formEnabled && needsImages ) {
		captureState = 'capturing';
	}

	return (
		<div
			className="m-chart-container"
			style={ { height: postMeta.height + 'px' } }
			data-image-capture-state={ captureState }
		>
			<canvas ref={ canvasRef } />
		</div>
	);
}
