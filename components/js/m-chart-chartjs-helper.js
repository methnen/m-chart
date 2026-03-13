'use strict';

/**
 * Formats a number using the Chart.js locale-aware helper.
 *
 * @param {number} number
 * @param {string} locale BCP 47 locale string (e.g. 'en-US').
 * @return {string}
 */
function numberFormat( number, locale ) {
	return Chart.helpers.formatNumber( number, locale );
}

/**
 * Preprocesses bubble chart data so bubble size is constrained but still relative to value.
 * See https://chartio.com/learn/charts/bubble-chart-complete-guide/#scale-bubble-area-by-value
 *
 * @param {Object} data Chart.js data object.
 * @return {Object}
 */
function preprocessBubbleData( data ) {
	const valueRange = data.datasets[0].data.reduce( ( acc, val ) => Math.max( acc, val.r ), 0 );
	const pixelMax   = 31;
	const pixelMin   = 1;
	const pixelRange = pixelMax - pixelMin;

	for ( const ds of data.datasets ) {
		const rawData      = ds.rawData || [];
		const isStructured = Array.isArray( rawData[0] );

		ds.data.forEach( ( d, i ) => {
			d.original = d.r;

			const rawR = isStructured ? ( rawData[ i ] && rawData[ i ][ 2 ] ) : rawData[ i * 3 + 2 ];
			d.originalPrefix = ( rawR && rawR.prefix ) ? rawR.prefix : '';
			d.originalSuffix = ( rawR && rawR.suffix ) ? rawR.suffix : '';

			const percentageRadius = Math.sqrt( Math.abs( d.r ) / valueRange );
			d.r = percentageRadius * pixelRange + pixelMin;
		} );
	}

	return data;
}

/**
 * Tooltip label for bubble charts.
 *
 * @param {Object} item Chart.js tooltip item.
 * @return {string[]}
 */
function bubbleChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;

	return [
		item.raw.label,
		item.chart.data.labels[0] + ': ' + numberFormat( item.parsed.x, locale ),
		item.chart.data.labels[1] + ': ' + numberFormat( item.parsed.y, locale ),
		item.chart.data.labels[2] + ': ' + numberFormat( item.raw.original, locale ),
	];
}

/**
 * Tooltip label for scatter charts.
 *
 * @param {Object} item Chart.js tooltip item.
 * @return {string[]}
 */
function scatterChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;

	return [
		item.dataset.label,
		item.chart.data.labels[0] + ': ' + numberFormat( item.parsed.x, locale ),
		item.chart.data.labels[1] + ': ' + numberFormat( item.parsed.y, locale ),
	];
}

/**
 * Tooltip label for standard charts.
 * Reads type and labelsPos directly from the chart instance.
 *
 * @param {Object} item Chart.js tooltip item.
 * @return {string|null}
 */
function chartTooltipLabel( item ) {
	const type      = item.chart.config.type;
	const labelsPos = item.chart.options.plugins?.[ 'm-chart-helper' ]?.labels_pos ?? '';
	const locale    = item.chart.options.locale;

	var label = item.dataset.label;

	// If raw value is null we don't return anything
	if ( null == item.raw ) {
		return null;
	}

	// Depending on the chart type or data format the label is usually in one of two places
	if ( 'undefined' == typeof label ) {
		label = item.label;
	}

	// Bar tooltips already get the label in the tooltip title
	if ( 'bar' == type ) {
		label = '';
	}

	// Polar charts put the label in a strange place
	if ( 'polarArea' == type ) {
		label = item.chart.data.labels[ item.dataIndex ];
	}

	// Make sure we don't double labels
	if ( 'both' != labelsPos ) {
		label = '';
	}

	// Handle stacked bar/column charts a bit better
	if ( 'undefined' != typeof item.dataset.label && label != item.dataset.label ) {
		label += item.dataset.label;
	}

	if ( '' != label ) {
		label += ': ';
	}

	// Format the value using the raw data struct (prefix + localized number + suffix),
	// Fall back to a plain formatted number if rawData is not available.
	var raw = item.dataset.rawData && item.dataset.rawData[ item.dataIndex ];
	var rawValue;

	if ( raw && null !== raw.value ) {
		rawValue = ( raw.prefix || '' ) + numberFormat( raw.value, locale ) + ( raw.suffix || '' );
	} else if ( raw && raw.text ) {
		rawValue = raw.text;
	} else {
		rawValue = numberFormat( item.raw, locale );
	}

	return label + rawValue;
}

/**
 * Chart.js plugin that sets up m-chart tooltip callbacks, datalabels formatter,
 * and bubble data preprocessing.
 *
 * beforeInit  — runs once at chart creation; handles bubble data preprocessing,
 *               which must only run once since it mutates dataset values.
 * beforeUpdate — runs before every render cycle (creation and updates); sets
 *                tooltip callbacks and datalabels formatter so they survive
 *                options replacement on chart updates.
 */
const MChartHelperPlugin = {
	id: 'm-chart-helper',

	beforeInit( chart ) {
		if ( 'bubble' === chart.config.type ) {
			preprocessBubbleData( chart.config.data );
		}
	},

	beforeUpdate( chart ) {
		const type = chart.config.type;

		if ( 'bubble' === type ) {
			chart.options.plugins.tooltip.callbacks = {
				label: ( item ) => bubbleChartTooltipLabel( item ),
			};
		} else if ( 'scatter' === type ) {
			chart.options.plugins.tooltip.callbacks = {
				label: ( item ) => scatterChartTooltipLabel( item ),
			};
		} else {
			chart.options.plugins.tooltip.callbacks = {
				label: ( item ) => chartTooltipLabel( item ),
			};
		}

		chart.options.plugins.datalabels.formatter = function ( label, context ) {
			const locale    = chart.options.locale;
			const rawData   = context.dataset.rawData;
			const dataIndex = context.dataIndex;

			// If there's no label we stop here
			if ( null === label ) {
				return label;
			}

			if ( 'bubble' === type ) {
				// Use prefix/suffix stored by preprocessBubbleData; show the original (pre-scaled) r value.
				const prefix = label.originalPrefix || '';
				const suffix = label.originalSuffix || '';
				return prefix + numberFormat( label.original, locale ) + suffix;
			}

			if ( 'scatter' === type ) {
				// Show the Y value. rawData[dataIndex] is an array for LABELS_BOTH, a struct for flat.
				const rawEntry = rawData && rawData[ dataIndex ];
				var rawY;

				if ( Array.isArray( rawEntry ) ) {
					rawY = rawEntry[ 1 ];
				} else {
					rawY = rawData && rawData[ dataIndex * 2 + 1 ];
				}

				if ( rawY && null !== rawY.value ) {
					return ( rawY.prefix || '' ) + numberFormat( rawY.value, locale ) + ( rawY.suffix || '' );
				}

				if ( rawY && rawY.text ) {
					return rawY.text;
				}

				return numberFormat( label.y, locale );
			}

			// Standard charts: use the raw data struct (prefix + localized number + suffix).
			var raw = rawData && rawData[ dataIndex ];

			if ( raw && null !== raw.value ) {
				return ( raw.prefix || '' ) + numberFormat( raw.value, locale ) + ( raw.suffix || '' );
			}

			if ( raw && raw.text ) {
				return raw.text;
			}

			// Fallback: format the scalar as a number if possible.
			if ( Number.isFinite( Number( label ) ) ) {
				return numberFormat( label, locale );
			}

			return label;
		};
	},
};

window.MChartHelperPlugin = MChartHelperPlugin;
