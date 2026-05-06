'use strict';

/**
 * Formats a number using the Chart.js locale-aware helper
 *
 * @param {number} number
 * @param {string} locale BCP 47 locale string (e.g. 'en-US').
 * @return {string}
 */
function numberFormat( number, locale ) {
	return Chart.helpers.formatNumber( number, locale );
}

/**
 * Preprocesses bubble chart data so bubble size is constrained but still relative to value
 * See https://chartio.com/learn/charts/bubble-chart-complete-guide/#scale-bubble-area-by-value
 *
 * @param {Object} data Chart.js data object.
 * @return {Object}
 */
function preprocessBubbleData( data ) {
	const pixelMax   = 31;
	const pixelMin   = 1;
	const pixelRange = pixelMax - pixelMin;

	// Use the stored original value if available so re-runs always scale from the true value
	const valueRange = data.datasets[0].data.reduce( ( acc, val ) => Math.max( acc, val.original ?? val.r ), 0 );

	for ( const ds of data.datasets ) {
		const rawData      = ds.rawData || [];
		const isStructured = Array.isArray( rawData[0] );

		ds.data.forEach( ( d, i ) => {
			const trueR = d.original ?? d.r;
			d.original  = trueR;

			const rawR = isStructured ? ( rawData[ i ] && rawData[ i ][ 2 ] ) : rawData[ i * 3 + 2 ];
			d.originalPrefix = ( rawR && rawR.prefix ) ? rawR.prefix : '';
			d.originalSuffix = ( rawR && rawR.suffix ) ? rawR.suffix : '';

			const percentageRadius = Math.sqrt( Math.abs( trueR ) / valueRange );
			d.r = percentageRadius * pixelRange + pixelMin;
		} );
	}

	return data;
}

/**
 * Tooltip label for bubble charts
 *
 * @param {Object} item Chart.js tooltip item
 * @return {string[]}
 */
function bubbleChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;
	const lines  = [ item.dataset.label ];

	// If we've got data point labels we include them in the tooltip
	if ( item.raw?.label ) {
		lines.push( item.raw.label );
	}

	lines.push(
		item.chart.data.labels[0] + ': ' + numberFormat( item.parsed.x, locale ),
		item.chart.data.labels[1] + ': ' + numberFormat( item.parsed.y, locale ),
		item.chart.data.labels[2] + ': ' + numberFormat( item.raw.original, locale ),
	);

	return lines;
}

/**
 * Tooltip label for scatter charts
 *
 * @param {Object} item Chart.js tooltip item
 * @return {string[]}
 */
function scatterChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;
	const lines  = [ item.dataset.label ];

	// If we've got data point labels we include them in the tooltip
	if ( item.raw?.label ) {
		lines.push( item.raw.label );
	}

	lines.push(
		item.chart.data.labels[0] + ': ' + numberFormat( item.parsed.x, locale ),
		item.chart.data.labels[1] + ': ' + numberFormat( item.parsed.y, locale ),
	);

	return lines;
}

/**
 * Read the original tree entry for a treemap rectangle
 * The library exposes the original object on ctx.raw._data for elements
 *
 * @param {Object} ctxOrItem Tooltip item or scriptable label/color context
 * @return {Object|null}
 */
function treemapRawEntry( ctxOrItem ) {
	const raw = ctxOrItem.raw;

	if ( ! raw ) {
		return null;
	}

	return raw._data || raw;
}

/**
 * Format a treemap rectangle value with prefix/suffix and locale formatting
 *
 * @param {Object} entry The original tree entry (label, value, prefix, suffix, text)
 * @param {string} locale BCP 47 locale string
 * @return {string}
 */
function treemapFormatValue( entry, locale ) {
	if ( ! entry ) {
		return '';
	}

	if ( null != entry.text && '' !== entry.text ) {
		return entry.text;
	}

	const value = Number.isFinite( entry.value ) ? entry.value : Number( entry.value );

	if ( ! Number.isFinite( value ) ) {
		return '';
	}

	return ( entry.prefix || '' ) + numberFormat( value, locale ) + ( entry.suffix || '' );
}

/**
 * In-rectangle label content for treemap
 * Returns [label, formattedValue] for two-line display
 *
 * @param {Object} ctx chartjs-chart-treemap labels formatter context
 * @param {string} locale BCP 47 locale string
 * @return {string|string[]}
 */
function treemapItemText( ctx, locale ) {
	if ( 'data' !== ctx.type ) {
		return '';
	}

	const entry     = treemapRawEntry( ctx );
	const label     = entry && entry.label ? String( entry.label ) : '';
	const formatted = treemapFormatValue( entry, locale );

	if ( label && formatted ) {
		return [ label, formatted ];
	}

	return label || formatted;
}

/**
 * Tooltip label for treemap charts
 *
 * @param {Object} item Chart.js tooltip item
 * @return {string}
 */
function treemapTooltipLabel( item ) {
	const locale    = item.chart.options.locale;
	const entry     = treemapRawEntry( item );
	const label     = entry && entry.label ? String( entry.label ) : '';
	const formatted = treemapFormatValue( entry, locale );

	if ( label && formatted ) {
		return label + ': ' + formatted;
	}

	return formatted || label;
}

/**
 * Tooltip label for standard charts
 * Reads type and labelsPos directly from the chart instance
 *
 * @param {Object} item Chart.js tooltip item
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

	// Format the value using the raw data struct (prefix + localized number + suffix)
	// Fall back to a plain formatted number if rawData is not available
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
 * Chart.js plugin that sets up m-chart tooltip callbacks, datalabels formatter, and bubble data preprocessing
 *
 * beforeUpdate: runs before every render cycle (creation and updates)
 * preprocesses bubble radii, sets tooltip callbacks, and sets the datalabels formatter so they survive options replacement
 */
const MChartHelper = {
	id: 'm-chart-helper',

	beforeUpdate( chart ) {
		const type = chart.config.type;

		if ( 'bubble' === type ) {
			preprocessBubbleData( chart.config.data );

			chart.options.plugins.tooltip.callbacks = {
				label: ( item ) => bubbleChartTooltipLabel( item ),
			};
		} else if ( 'scatter' === type ) {
			chart.options.plugins.tooltip.callbacks = {
				title: () => '',
				label: ( item ) => scatterChartTooltipLabel( item ),
			};
		} else if ( 'treemap' === type ) {
			const ds     = chart.data.datasets[0];
			const locale = chart.options.locale;

			if ( ds && ds.mChartTreemapHierarchical ) {
				const topColors = ds.mChartTopGroupColors || {};
				const topRgb    = ds.mChartTopGroupRgb || {};
				const topField  = ds.mChartTopGroupField;
				const groups    = ds.groups || [];
				// chartjs-chart-treemap renders leaves at level (groups.length - 1)
				// — its draw() passes that number to the labels/captions render gate
				const leafLevel = Math.max( 0, groups.length - 1 );

				// Group rectangles get a progressive faint group-color tint that builds with depth:
				// each nesting level adds a small alpha step over the previous. Hover darkens that
				// level's tint slightly. Leaves remain alpha-shaded by their share of the top group.
				const groupBaseAlpha    = 0.06;
				const groupStepPerLevel = 0.06;
				const hoverAlphaBump    = 0.06;
				const leafHoverBump     = 0.18;

				const colorFor = ( raw, active ) => {
					// At l=0 the group identifier is on raw.g; at deeper levels and leaves we walk
					// back to the top-level identifier via the original tree entry on raw._data
					const topId = ( 0 === raw.l ) ? raw.g : ( raw._data && raw._data[ topField ] );
					const rgb   = topRgb[ topId ];

					if ( ! rgb ) {
						return topColors[ topId ] || 'rgba(160,160,160,0.5)';
					}

					// Group rectangle (any non-leaf level) — light tint that builds with nesting depth
					if ( raw.l < leafLevel ) {
						const restAlpha = groupBaseAlpha + raw.l * groupStepPerLevel;
						const alpha     = active ? Math.min( 1, restAlpha + hoverAlphaBump ) : restAlpha;
						return `rgba(${ rgb.red }, ${ rgb.green }, ${ rgb.blue }, ${ alpha.toFixed( 3 ) })`;
					}

					// Leaf — alpha by share of top-group total; bumped on hover for the same
					// "more saturated = darker = more important" feel that already encodes value visually
					const denom     = raw.gs || raw.s || raw.v || 1;
					const ratio     = raw.v / denom;
					const baseAlpha = Math.max( 0.35, Math.min( 1, ratio + 0.35 ) );
					const finalA    = active ? Math.min( 1, baseAlpha + leafHoverBump ) : baseAlpha;
					return `rgba(${ rgb.red }, ${ rgb.green }, ${ rgb.blue }, ${ finalA.toFixed( 3 ) })`;
				};

				ds.backgroundColor = ( ctx ) => {
					if ( 'data' !== ctx.type ) {
						return 'transparent';
					}
					return colorFor( ctx.raw, false );
				};

				ds.hoverBackgroundColor = ( ctx ) => {
					if ( 'data' !== ctx.type ) {
						return 'transparent';
					}
					return colorFor( ctx.raw, true );
				};

				const datasetPrefix = ds.mChartDatasetPrefix || '';
				const datasetSuffix = ds.mChartDatasetSuffix || '';

				// Format with locale + affixes. Leaves prefer their own _data prefix/suffix; parent
				// rectangles fall back to the dataset-level affixes since the library aggregates
				// them synthetically and they have no source row.
				const formatWithAffixes = ( raw ) => {
					const isLeaf  = raw.l >= leafLevel;
					const leafRaw = isLeaf ? ( raw._data || {} ) : null;
					const prefix  = isLeaf ? ( leafRaw.prefix || datasetPrefix ) : datasetPrefix;
					const suffix  = isLeaf ? ( leafRaw.suffix || datasetSuffix ) : datasetSuffix;
					return prefix + numberFormat( raw.v, locale ) + suffix;
				};

				ds.captions = ds.captions || {};
				ds.captions.formatter = ( ctx ) => {
					if ( 'data' !== ctx.type || ctx.raw.l >= leafLevel ) {
						return '';
					}
					return ctx.raw.g + ': ' + formatWithAffixes( ctx.raw );
				};

				ds.labels = ds.labels || {};
				ds.labels.formatter = ( ctx ) => {
					if ( 'data' !== ctx.type || ctx.raw.l < leafLevel ) {
						return '';
					}
					return [ String( ctx.raw.g ), formatWithAffixes( ctx.raw ) ];
				};

				chart.options.plugins.tooltip.callbacks = {
					title: () => '',
					label: ( item ) => String( item.raw.g ) + ': ' + formatWithAffixes( item.raw ),
				};

				return;
			}

			// Flat treemap (Phase 1 path)
			if ( ds && Array.isArray( ds.mChartColors ) ) {
				const colors = ds.mChartColors;
				ds.backgroundColor = ( ctx ) => {
					if ( 'data' !== ctx.type ) {
						return 'transparent';
					}
					return colors[ ctx.dataIndex ] || colors[0];
				};
			}

			if ( ds ) {
				ds.labels = ds.labels || {};
				ds.labels.formatter = ( ctx ) => treemapItemText( ctx, locale );
			}

			chart.options.plugins.tooltip.callbacks = {
				title: () => '',
				label: ( item ) => treemapTooltipLabel( item ),
			};

			// chartjs-plugin-datalabels has nothing useful to do for treemap
			return;
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
				// Use prefix/suffix stored by preprocessBubbleData; show the original (pre-scaled) r value
				const prefix = label.originalPrefix || '';
				const suffix = label.originalSuffix || '';
				return prefix + numberFormat( label.original, locale ) + suffix;
			}

			if ( 'scatter' === type ) {
				// Show the Y value, rawData[dataIndex] is an array for LABELS_BOTH, a struct for flat
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

			// Standard charts: use the raw data struct (prefix + localized number + suffix)
			var raw = rawData && rawData[ dataIndex ];

			if ( raw && null !== raw.value ) {
				return ( raw.prefix || '' ) + numberFormat( raw.value, locale ) + ( raw.suffix || '' );
			}

			if ( raw && raw.text ) {
				return raw.text;
			}

			// Fallback: format the scalar as a number if possible
			if ( Number.isFinite( Number( label ) ) ) {
				return numberFormat( label, locale );
			}

			return label;
		};
	},
};

window.MChartHelper = MChartHelper;
