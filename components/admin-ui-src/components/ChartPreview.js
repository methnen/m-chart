import { useEffect, useRef } from '@wordpress/element';
import { useChartAdmin } from '../context/ChartAdminContext';
import { useImageGeneration } from '../hooks/useImageGeneration';

/**
 * Applies m_chart_chartjs_helpers tooltip callbacks and datalabels formatter
 * to a copy of the chart args before passing them to Chart.js.
 *
 * Mirrors the logic previously triggered by the jQuery 'render_start' event.
 */
function prepareArgs( args ) {
	if ( ! args ) {
		return args;
	}

	const h = window.m_chart_chartjs_helpers;

	// Shallow-copy the top level and options so we don't mutate state.
	const prepared = {
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

	if ( ! h ) {
		return prepared;
	}

	const { type, value_prefix = '', value_suffix = '', labels_pos = '' } = prepared;

	if ( prepared.options?.locale ) {
		h.locale = prepared.options.locale;
	}

	// Bubble charts need data preprocessing and a custom tooltip.
	if ( 'bubble' === type ) {
		prepared.data = h.preprocess_bubble_data( { ...prepared.data, datasets: [ ...prepared.data.datasets ] } );
		prepared.options.plugins.tooltip.callbacks = {
			label: ( item ) => h.bubble_chart_tooltip_label( item, type, value_prefix, value_suffix, labels_pos ),
		};
	} else if ( 'scatter' === type ) {
		prepared.options.plugins.tooltip.callbacks = {
			label: ( item ) => h.scatter_chart_tooltip_label( item, type, value_prefix, value_suffix, labels_pos ),
		};
	} else {
		prepared.options.plugins.tooltip.callbacks = {
			label: ( item ) => h.chart_tooltip_label( item, type, value_prefix, value_suffix, labels_pos ),
		};
	}

	// Datalabels formatter — mirrors the helper's formatter closure.
	prepared.options.plugins.datalabels.formatter = function ( label ) {
		if ( null === label ) {
			return label;
		}
		if ( 'undefined' !== typeof label.label ) {
			label = label.label;
		} else if ( 'undefined' !== typeof label.r ) {
			label = label.r;
		} else if ( 'undefined' !== typeof label.y ) {
			label = label.y;
		}
		if ( 'number' === typeof label ) {
			return h.number_format( label );
		}
		return label;
	};

	return prepared;
}

/**
 * React-managed Chart.js preview for the admin meta box.
 *
 * Replaces the PHP-rendered chart from chartjs-chart.php in the admin context.
 * The Chart.js instance is managed imperatively via refs and is never recreated
 * on re-render — only updated when chartArgs changes.
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

	// Cleanup — destroy Chart.js instance on unmount.
	useEffect( () => {
		return () => {
			if ( chartRef.current ) {
				chartRef.current.destroy();
				chartRef.current = null;
			}
		};
	}, [] );

	// Create or update the Chart.js instance whenever chartArgs changes.
	useEffect( () => {
		if ( ! chartArgs || ! canvasRef.current ) {
			return;
		}

		const prepared = prepareArgs( chartArgs );

		// Guard against null/undefined datasets or labels (Chart.js requires arrays).
		if ( ! prepared.data?.datasets ) {
			prepared.data = { ...prepared.data, datasets: [] };
		}
		if ( null === prepared.data?.labels ) {
			prepared.data = { ...prepared.data, labels: [] };
		}

		const onComplete = {
			onComplete() {
				// Only fire once per update cycle (guards against Chart.js double-fire).
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
			},
		};

		const options = {
			...prepared.options,
			animation: onComplete,
		};

		if ( ! chartRef.current ) {
			// Initial chart creation.
			renderFlagRef.current = true;

			chartRef.current = new window.Chart( canvasRef.current, {
				type:    prepared.type,
				data:    prepared.data,
				options,
			} );
		} else {
			// Subsequent updates — patch the existing instance.
			const chart = chartRef.current;

			chart.data        = prepared.data;
			chart.config.type = prepared.type;
			chart.options     = options;

			renderFlagRef.current = true;
			chart.update();
		}
	}, [ chartArgs ] ); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="m-chart-container" style={ { height: postMeta.height + 'px' } }>
			<canvas ref={ canvasRef } />
		</div>
	);
}
