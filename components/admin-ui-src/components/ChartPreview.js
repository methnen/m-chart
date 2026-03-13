import { useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useImageGeneration } from '../hooks/useImageGeneration';

/**
 * Shallow-copies chart args to avoid mutating React state when Chart.js or
 * MChartHelperPlugin modifies the chart config during initialization.
 * Tooltip callbacks and datalabels formatter are applied by MChartHelperPlugin
 * via its beforeUpdate hook (runs each render). Bubble preprocessing runs once
 * via beforeInit.
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
 * Default Chart.js renderer — create or update the Chart.js instance.
 *
 * Applies chartjs-specific arg preparation before rendering.
 * Returned instance is stored in chartRef by the caller.
 *
 * @param {HTMLCanvasElement}   canvas          Target canvas element.
 * @param {Object}              args            Raw chart args from state.
 * @param {Function}            onComplete      Callback to fire after render completes.
 * @param {Object|null}         existingInstance Existing Chart.js instance, or null on first render.
 * @return {Object} The Chart.js instance.
 */
function defaultChartjsRender( canvas, args, onComplete, existingInstance ) {
	const prepared = prepareArgs( args );

	// Guard against null/undefined datasets or labels (Chart.js requires arrays).
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
 * React-managed chart preview for the admin meta box.
 *
 * The chart instance is managed imperatively via refs and is never recreated
 * on re-render — only updated when chartArgs changes.
 *
 * Rendering is delegated via the 'm_chart.render_chart' wp.hooks filter so
 * library plugins can replace the default Chart.js renderer. The filter
 * receives ( canvas, args, onComplete, existingInstance ) as extra arguments.
 * If no filter handles rendering (i.e. returns false), Chart.js is used.
 *
 * The onComplete callback must be called by the renderer once the chart has
 * finished drawing — it fires 'm_chart.render_done', triggers image
 * generation if needed, and re-enables the form.
 */
export default function ChartPreview() {
	const { state, dispatch } = useChartAdmin();
	const { postId, chartArgs, performance, imageSupport, postMeta } = state;

	const canvasRef      = useRef( null );
	const chartRef       = useRef( null );
	const renderFlagRef  = useRef( false );
	const isFirstRender  = useRef( true );

	// Keep a ref so onComplete closures always see the latest values.
	const needsImagesRef = useRef( false );
	needsImagesRef.current = ( 'default' === performance && 'yes' === imageSupport );

	const generateImage = useImageGeneration( chartRef );

	// Cleanup — destroy chart instance on unmount.
	useEffect( () => {
		return () => {
			if ( chartRef.current ) {
				chartRef.current.destroy();
				chartRef.current = null;
			}
		};
	}, [] );

	// Create or update the chart instance whenever chartArgs changes.
	useEffect( () => {
		if ( ! chartArgs || ! canvasRef.current ) {
			return;
		}

		function onComplete() {
			// Only fire once per update cycle (guards against double-fire).
			if ( ! renderFlagRef.current ) {
				return;
			}
			renderFlagRef.current = false;

			if ( window.wp?.hooks ) {
				window.wp.hooks.doAction( 'm_chart.render_done', postId, 1, chartRef.current );
			}

			if ( needsImagesRef.current ) {
				generateImage();
			} else {
				// No image generation — enable form submission immediately.
				// This also covers the initial page load where useChartRefresh skips its first run.
				dispatch( { type: 'SET_FORM_ENABLED', payload: true } );
				isFirstRender.current = false;
			}
		}

		renderFlagRef.current = true;

		// Allow library plugins to replace the renderer via wp.hooks.
		// Plugins hook 'm_chart.render_chart' and return their chart instance.
		// Returning false (the default) falls through to the built-in Chart.js renderer.
		let instance = false;
		if ( window.wp?.hooks ) {
			instance = window.wp.hooks.applyFilters(
				'm_chart.render_chart',
				false,
				canvasRef.current,
				chartArgs,
				onComplete,
				chartRef.current
			);
		}

		chartRef.current = ( false !== instance )
			? instance
			: defaultChartjsRender( canvasRef.current, chartArgs, onComplete, chartRef.current );

	}, [ chartArgs ] ); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="m-chart-container" style={ { height: postMeta.height + 'px' } }>
			<canvas ref={ canvasRef } />
		</div>
	);
}
