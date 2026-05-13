'use strict';

/**
 * Formats a number using the Chart.js locale-aware helper
 *
 * @param {number} number
 * @param {string} locale BCP 47 locale string (e.g. 'en-US').
 * @return {string} The locale-formatted number
 */
function numberFormat( number, locale ) {
	return Chart.helpers.formatNumber( number, locale );
}

/**
 * Preprocesses bubble chart data so bubble size is constrained but still relative to value
 * See https://chartio.com/learn/charts/bubble-chart-complete-guide/#scale-bubble-area-by-value
 *
 * @param {Object} data Chart.js data object.
 * @return {Object} The same data object with bubble radii rescaled
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
 * @return {string[]} Tooltip lines (label, x, y, value)
 */
function bubbleChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;
	const lines  = [];

	// Dataset label lives in the tooltip title (see MChartHelper.beforeUpdate)
	// First body line is the per-point label when present (country name, etc)
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
 * @return {string[]} Tooltip lines (label, x, y)
 */
function scatterChartTooltipLabel( item ) {
	const locale = item.chart.options.locale;
	const lines  = [];

	// Dataset label lives in the tooltip title (see MChartHelper.beforeUpdate)
	// First body line is the per-point label when present
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
 * @return {Object|null} The original tree entry, or null when no raw data is present
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
 * @param {Object} entry  The original tree entry (label, value, prefix, suffix, text)
 * @param {string} locale BCP 47 locale string
 * @return {string} Formatted value with prefix/suffix, or empty string when entry is missing or non-numeric
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
 * Returns just the entity label as a single-line string — the value is surfaced via the tooltip on hover
 * Single-line labels combine with `overflow: 'fit'` so small rectangles scale gracefully instead of clipping
 *
 * @param {Object} ctx chartjs-chart-treemap labels formatter context
 * @return {string} The entity label, or empty string when no label is available
 */
function treemapItemText( ctx ) {
	if ( 'data' !== ctx.type ) {
		return '';
	}

	const entry = treemapRawEntry( ctx );

	return entry && entry.label ? String( entry.label ) : '';
}

/**
 * Tooltip label for treemap charts
 *
 * @param {Object} item Chart.js tooltip item
 * @return {string} "Label: value" string (or whichever side is present)
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
 * @return {string|null} Composed tooltip label, or null when the data point has no value
 */
function chartTooltipLabel( item ) {
	const type      = item.chart.config.type;
	const labelsPos = item.chart.options.plugins?.[ 'm-chart-helper' ]?.labels_pos ?? '';
	const locale    = item.chart.options.locale;

	let label = item.dataset.label;

	// If raw value is null we don't return anything
	if ( null == item.raw ) {
		return null;
	}

	// Depending on the chart type or data format the label is usually in one of two places
	if ( 'undefined' === typeof label ) {
		label = item.label;
	}

	// Bar tooltips already get the label in the tooltip title
	if ( 'bar' === type ) {
		label = '';
	}

	// Polar charts put the label in a strange place
	if ( 'polarArea' === type ) {
		label = item.chart.data.labels[ item.dataIndex ];
	}

	// Make sure we don't double labels
	if ( 'both' !== labelsPos ) {
		label = '';
	}

	// Handle stacked bar/column charts a bit better
	if ( 'undefined' !== typeof item.dataset.label && label !== item.dataset.label ) {
		label += item.dataset.label;
	}

	if ( '' !== label ) {
		label += ': ';
	}

	// Format the value using the raw data struct (prefix + localized number + suffix)
	// Fall back to a plain formatted number if rawData is not available
	const raw = item.dataset.rawData && item.dataset.rawData[ item.dataIndex ];
	let rawValue;

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
 * Compute tight y-axis bounds from the raw observation values in a boxplot/violin chart.data
 *
 * Boxplot/violin data is shaped as datasets[].data[row][] where each row is an array of
 * observations for a single box. Chart.js's default auto-fit plus the boxplot library's
 * whisker expansion leaves enough headroom that narrow IQRs collapse visually — this helper
 * returns a min/max that hugs the actual data with a small grace so the boxes stay legible
 *
 * Returns null when there's no usable data to bound (empty, non-numeric, or zero range)
 * so the caller can leave the library default in place
 *
 * @param {Object} data Chart.js data object
 * @return {Object|null} { min, max } padded bounds, or null when bounds can't be computed
 */
function computeBoxplotViolinYBounds( data ) {
	let dataMin = Infinity;
	let dataMax = -Infinity;

	for ( const dataset of data.datasets ?? [] ) {
		for ( const row of dataset.data ?? [] ) {
			if ( ! Array.isArray( row ) ) {
				continue;
			}

			for ( const value of row ) {
				const num = Number( value );

				if ( Number.isFinite( num ) ) {
					if ( num < dataMin ) {
						dataMin = num;
					}

					if ( num > dataMax ) {
						dataMax = num;
					}
				}
			}
		}
	}

	if ( ! Number.isFinite( dataMin ) || ! Number.isFinite( dataMax ) ) {
		return null;
	}

	const range = dataMax - dataMin;

	if ( 0 === range ) {
		return null;
	}

	const grace = range * 0.05;

	return {
		min: dataMin - grace,
		max: dataMax + grace,
	};
}

/**
 * Wrap a Chart.js title-or-subtitle plugin's text to fit within a maxWidth
 *
 * Reads the configured font, measures the original string in the canvas 2d context,
 * and if it doesn't fit on one line, breaks it at word boundaries into an array of lines
 * Stashes the original string on the chart instance under originalProp so subsequent
 * relayouts always wrap from the source (not from an already-wrapped array)
 *
 * @param {Object} chart        Chart.js chart instance
 * @param {string} key          'title' or 'subtitle'
 * @param {number} maxWidth     Available width in canvas pixels
 * @param {string} originalProp Property name on the chart instance for stashing the original string
 */
function wrapPluginText( chart, key, maxWidth, originalProp ) {
	const opt = chart.options.plugins?.[ key ];

	if ( ! opt || false === opt.display ) {
		return;
	}

	// First-touch: stash the original string so subsequent layouts wrap from the source
	if ( ! chart[ originalProp ] ) {
		chart[ originalProp ] = Array.isArray( opt.text ) ? opt.text.join( ' ' ) : ( opt.text || '' );
	}

	const original = chart[ originalProp ];

	if ( ! original ) {
		return;
	}

	const defaultSize = 'title' === key ? 21 : 18;
	const fontSize    = opt.font?.size || defaultSize;
	const family      = opt.font?.family || ( window.Chart && window.Chart.defaults?.font?.family ) || 'sans-serif';
	const weight      = opt.font?.weight || '';

	chart.ctx.save();
	chart.ctx.font = ( weight ? weight + ' ' : '' ) + fontSize + 'px ' + family;

	// Fast path: text already fits on one line
	if ( chart.ctx.measureText( original ).width <= maxWidth ) {
		chart.options.plugins[ key ].text = original;
		chart.ctx.restore();
		return;
	}

	// Greedy word-break wrap
	const words = original.split( /\s+/ ).filter( Boolean );
	const lines = [];
	let   line  = '';

	for ( const word of words ) {
		const trial = line ? line + ' ' + word : word;

		if ( chart.ctx.measureText( trial ).width <= maxWidth ) {
			line = trial;
		} else {
			if ( line ) {
				lines.push( line );
			}

			// If a single word is itself wider than maxWidth, accept it on its own line
			line = word;
		}
	}

	if ( line ) {
		lines.push( line );
	}

	chart.options.plugins[ key ].text = lines.length > 1 ? lines : original;
	chart.ctx.restore();
}

/**
 * Chart.js plugin that sets up m-chart tooltip callbacks, datalabels formatter, and bubble data preprocessing
 *
 * beforeUpdate: runs before every render cycle (creation and updates)
 * preprocesses bubble radii, sets tooltip callbacks, and sets the datalabels formatter so they survive options replacement
 */
const MChartHelper = {
	id: 'm-chart-helper',

	/**
	 * beforeLayout: runs before Chart.js calculates layout positions
	 *
	 * Wraps title and subtitle text at word boundaries when they don't fit the current
	 * chart width — keeps font size constant and breaks across multiple lines instead of
	 * letting the canvas CSS-scale and visually squish the text horizontally
	 *
	 * @param {Object} chart Chart.js chart instance
	 */
	beforeLayout( chart ) {
		if ( ! chart.ctx || ! chart.width ) {
			return;
		}

		// Match the default options.layout.padding in get_chart_options_defaults()
		const horizontalPadding = 16;
		const maxWidth          = chart.width - ( horizontalPadding * 2 );

		wrapPluginText( chart, 'title',    maxWidth, '$mchartTitleOriginal'    );
		wrapPluginText( chart, 'subtitle', maxWidth, '$mchartSubtitleOriginal' );
	},

	beforeUpdate( chart ) {
		const type = chart.config.type;

		if ( 'bubble' === type ) {
			preprocessBubbleData( chart.config.data );

			chart.options.plugins.tooltip.callbacks = {
				title: ( items ) => items[0]?.dataset?.label ?? '',
				label: ( item ) => bubbleChartTooltipLabel( item ),
			};
		} else if ( 'scatter' === type ) {
			chart.options.plugins.tooltip.callbacks = {
				title: ( items ) => items[0]?.dataset?.label ?? '',
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
				// Single-line label — value is in the tooltip on hover
				// Combined with overflow: 'fit' (set in PHP defaults) small rectangles scale gracefully
				ds.labels.formatter = ( ctx ) => {
					if ( 'data' !== ctx.type || ctx.raw.l < leafLevel ) {
						return '';
					}
					return String( ctx.raw.g );
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
				ds.labels.formatter = ( ctx ) => treemapItemText( ctx );
			}

			chart.options.plugins.tooltip.callbacks = {
				title: () => '',
				label: ( item ) => treemapTooltipLabel( item ),
			};

			// chartjs-plugin-datalabels has nothing useful to do for treemap
			return;
		} else if ( 'boxplot' === type || 'violin' === type ) {
			const locale = chart.options.locale;

			// Note: when constrain_y_axis is on, the scale bounds are applied in
			// afterDataLimits below — that's the canonical Chart.js hook for axis bound
			// manipulation and avoids the visible double-paint that beforeUpdate causes

			// Format a single number with the dataset's prefix/suffix and locale formatting
			const fmtForItem = ( item, value ) => {
				if ( value === null || value === undefined || ! Number.isFinite( value ) ) {
					return '';
				}
				const itemDs = item && item.dataset ? item.dataset : {};
				const prefix = itemDs.mChartDatasetPrefix || '';
				const suffix = itemDs.mChartDatasetSuffix || '';
				return prefix + numberFormat( value, locale ) + suffix;
			};

			chart.options.plugins.tooltip.callbacks = {
				title: ( items ) => ( items && items.length && items[0].label ) ? String( items[0].label ) : '',
				label: ( item ) => {
					// chartjs-chart-boxplot overrides Chart.js's getLabelAndValue so that
					// item.formattedValue is an OBJECT for boxplot/violin, with .raw carrying
					// the parsed numeric stats (min, q1, median, q3, max, mean, whiskerMin,
					// whiskerMax, outliers, items). Chart.js's tooltip filters item.parsed
					// down to {x, y} for cartesian charts so the stats wouldn't be there.
					const fv    = item.formattedValue;
					const stats = ( fv && 'object' === typeof fv && fv.raw ) ? fv.raw : ( item.parsed || {} );
					const lines = [];

					if ( item.dataset && item.dataset.label ) {
						lines.push( String( item.dataset.label ) );
					}

					lines.push( 'Min: '    + fmtForItem( item, stats.min ) );
					lines.push( 'Q1: '     + fmtForItem( item, stats.q1 ) );
					lines.push( 'Median: ' + fmtForItem( item, stats.median ) );
					lines.push( 'Q3: '     + fmtForItem( item, stats.q3 ) );
					lines.push( 'Max: '    + fmtForItem( item, stats.max ) );

					const outliers = Array.isArray( stats.outliers ) ? stats.outliers.length : 0;
					if ( outliers > 0 ) {
						lines.push( '+ ' + outliers + ' outlier' + ( 1 === outliers ? '' : 's' ) );
					}

					return lines;
				},
			};

			// chartjs-plugin-datalabels is disabled in PHP for these types — nothing to wire here
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
				let rawY;

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
			const raw = rawData && rawData[ dataIndex ];

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

	/**
	 * afterDataLimits: per-scale hook that fires after Chart.js computes auto-fit bounds
	 * but before layout calculations
	 *
	 * For boxplot/violin charts with constrain_y_axis on, overwrite the scale's min/max
	 * with bounds tightened to the actual data so the chart paints once with the
	 * constrained bounds — no double-paint flicker
	 *
	 * @param {Object} chart Chart.js chart instance
	 * @param {Object} args  Hook args; args.scale is the scale being processed
	 */
	afterDataLimits( chart, args ) {
		const type = chart.config.type;

		if ( 'boxplot' !== type && 'violin' !== type ) {
			return;
		}

		if ( ! chart.options.plugins?.mchart?.constrain_y_axis ) {
			return;
		}

		if ( 'y' !== args.scale.axis ) {
			return;
		}

		const bounds = computeBoxplotViolinYBounds( chart.config.data );

		if ( ! bounds ) {
			return;
		}

		args.scale.min = bounds.min;
		args.scale.max = bounds.max;
	},

	/**
	 * afterDraw: paint the optional in-chart source attribution in the bottom-left of the canvas
	 *
	 * Renders only when include_source is on AND source has a non-empty value
	 * Caches the rendered text's bounding box on the chart instance for afterEvent hit-testing
	 *
	 * @param {Object} chart Chart.js chart instance
	 */
	afterDraw( chart ) {
		const opts = chart.options.plugins?.mchart;

		if ( ! opts?.include_source || ! opts?.source ) {
			chart.$mchartSourceBounds = null;
			return;
		}

		const ctx     = chart.ctx;
		const padding = 12;
		const text    = String( opts.source );
		const family  = ( window.Chart && window.Chart.defaults?.font?.family ) || 'sans-serif';
		const color   = ( window.Chart && window.Chart.defaults?.color ) || '#666666';

		ctx.save();
		ctx.font         = '12px ' + family;
		ctx.fillStyle    = color;
		ctx.textAlign    = 'left';
		ctx.textBaseline = 'bottom';

		const drawX = padding;
		const drawY = chart.height - padding;

		ctx.fillText( text, drawX, drawY );

		// textBaseline:'bottom' means drawY is the bottom of the rendered text
		// Pad the box slightly on every side so the click target is comfortable to hit
		const metrics = ctx.measureText( text );

		chart.$mchartSourceBounds = {
			left:   drawX - 2,
			right:  drawX + metrics.width + 2,
			top:    drawY - 14,
			bottom: drawY + 2,
		};

		ctx.restore();
	},

	/**
	 * afterEvent: hover cursor + click handling for the rendered source attribution
	 *
	 * Mousemove inside the cached bounds switches to pointer cursor
	 * Click inside the bounds opens source_url in a new tab (only when source_url is set)
	 *
	 * @param {Object} chart Chart.js chart instance
	 * @param {Object} args  Hook args; args.event is the normalized event
	 */
	afterEvent( chart, args ) {
		const opts   = chart.options.plugins?.mchart;
		const bounds = chart.$mchartSourceBounds;

		if ( ! opts?.include_source || ! opts?.source || ! opts?.source_url || ! bounds ) {
			if ( chart.canvas && 'pointer' === chart.canvas.style.cursor ) {
				chart.canvas.style.cursor = '';
			}

			return;
		}

		const e = args.event;

		if ( ! e || 'number' !== typeof e.x || 'number' !== typeof e.y ) {
			return;
		}

		const inside =
			e.x >= bounds.left  &&
			e.x <= bounds.right &&
			e.y >= bounds.top   &&
			e.y <= bounds.bottom;

		if ( 'mousemove' === e.type ) {
			chart.canvas.style.cursor = inside ? 'pointer' : '';
		} else if ( 'click' === e.type && inside ) {
			window.open( opts.source_url, '_blank', 'noopener,noreferrer' );
		}
	},
};

window.MChartHelper = MChartHelper;
