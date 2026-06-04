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
 * Locale-format a value only when it is a finite number
 *
 * Guards against null/undefined data points that would otherwise render a localized "NaN"
 *
 * @param {*}      value  The value to format
 * @param {string} locale BCP 47 locale string
 * @return {string} The formatted number, or '' when the value is not finite
 */
function safeNumberFormat( value, locale ) {
	const num = Number( value );

	return Number.isFinite( num ) ? numberFormat( num, locale ) : '';
}

/**
 * Returns true for charts produced by M Chart
 *
 * M Chart always writes a `labels_pos` into the `m-chart-helper` plugin options block (see class-m-chart-chartjs.php)
 * Foreign charts on the same page never have it, so this gate keeps the plugin's hooks from touching them
 * Note: the plugin intentionally declares no Chart.js `defaults` block — doing so would auto-create this options block on every chart and defeat the gate
 *
 * @param {Object} chart Chart.js chart instance
 * @return {boolean} Whether this chart belongs to M Chart
 */
function isMChartChart( chart ) {
	const opts = chart.options?.plugins?.[ 'm-chart-helper' ];

	return !! opts && undefined !== opts.labels_pos;
}

/**
 * Parse a CSS color string into an [r, g, b] triple
 *
 * Handles #rgb, #rrggbb, and rgb()/rgba() forms
 * Returns null for anything else (gradients, patterns, named colors) so callers can fall back
 *
 * @param {string} color A CSS color string
 * @return {Array|null} [r, g, b] in 0-255, or null when unparseable
 */
function parseRgb( color ) {
	if ( 'string' !== typeof color ) {
		return null;
	}

	const value = color.trim();

	if ( '#' === value[0] ) {
		if ( 4 === value.length ) {
			return [
				parseInt( value[1] + value[1], 16 ),
				parseInt( value[2] + value[2], 16 ),
				parseInt( value[3] + value[3], 16 ),
			];
		}

		if ( 7 === value.length ) {
			return [
				parseInt( value.slice( 1, 3 ), 16 ),
				parseInt( value.slice( 3, 5 ), 16 ),
				parseInt( value.slice( 5, 7 ), 16 ),
			];
		}

		return null;
	}

	const match = value.match( /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i );

	if ( match ) {
		return [ Number( match[1] ), Number( match[2] ), Number( match[3] ) ];
	}

	return null;
}

/**
 * WCAG relative luminance for an [r, g, b] triple
 *
 * @param {Array} rgb [r, g, b] in 0-255
 * @return {number} Relative luminance 0-1
 */
function relativeLuminance( rgb ) {
	const channels = rgb.map( function ( raw ) {
		const channel = raw / 255;

		return channel <= 0.03928
			? channel / 12.92
			: Math.pow( ( channel + 0.055 ) / 1.055, 2.4 );
	} );

	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * datalabels scriptable color: pick the darker or lighter ink for the best contrast
 * against the element the label sits on
 *
 * Datalabels default to anchor/align center, so the value can land on top of a dark
 * bar/slice fill where the default dark ink would drop below 4.5:1
 * Falls back to the dark default when the fill can't be parsed (gradients, patterns)
 *
 * @param {Object} context chartjs-plugin-datalabels scriptable context
 * @return {string} A hex color with the higher contrast ratio against the fill
 */
function datalabelContrastColor( context ) {
	const dark  = '#222222';
	const light = '#ffffff';

	let fill = context.dataset && context.dataset.backgroundColor;

	if ( Array.isArray( fill ) ) {
		fill = fill[ context.dataIndex ];
	}

	const rgb = parseRgb( fill );

	if ( ! rgb ) {
		return dark;
	}

	const contrast = function ( a, b ) {
		return ( Math.max( a, b ) + 0.05 ) / ( Math.min( a, b ) + 0.05 );
	};

	const fillLum = relativeLuminance( rgb );

	// Compare the default dark ink against white and keep whichever contrasts better
	return contrast( fillLum, 1 ) > contrast( fillLum, relativeLuminance( [ 34, 34, 34 ] ) )
		? light
		: dark;
}

/**
 * Resolve the name to show for a bubble/scatter axis
 *
 * Prefers the documented scale title, then falls back to data.labels, then to '' so a missing label never prints "undefined"
 *
 * @param {Object} chart Chart.js chart instance
 * @param {number} index 0 = x, 1 = y, 2 = r (radius has no scale and falls through to data.labels)
 * @return {string} The axis name, or '' when none is available
 */
function axisName( chart, index ) {
	const scaleKey  = [ 'x', 'y' ][ index ];
	const titleText = scaleKey && chart.options?.scales?.[ scaleKey ]?.title?.text;

	if ( titleText ) {
		return String( titleText );
	}

	const label = chart.data?.labels?.[ index ];

	return ( null == label ) ? '' : String( label );
}

/**
 * Total horizontal layout padding (left + right) in canvas pixels
 *
 * options.layout.padding is either a number (applied to every side) or an object
 * M Chart uses 16 by default and { top, right, bottom, left } when the source line is shown (see class-m-chart-chartjs.php)
 *
 * @param {Object} chart Chart.js chart instance
 * @return {number} The combined left + right padding
 */
function horizontalLayoutPadding( chart ) {
	const padding = chart.options?.layout?.padding;

	if ( 'number' === typeof padding ) {
		return padding * 2;
	}

	if ( padding && 'object' === typeof padding ) {
		const left  = Number( padding.left  ?? padding.x ?? 0 );
		const right = Number( padding.right ?? padding.x ?? 0 );

		return left + right;
	}

	// Match the default options.layout.padding (16) in get_chart_options_defaults()
	return 32;
}

/**
 * Preprocesses bubble chart data so bubble size is constrained but still relative to value
 * See https://chartio.com/learn/charts/bubble-chart-complete-guide/#scale-bubble-area-by-value
 *
 * The source value is stashed on each point as `.original`, and `.r` is overwritten with the computed pixel radius
 * The `.original` stash makes re-runs idempotent — radii always scale from the true value, never from an already-scaled one
 * The value range is computed across ALL datasets so bubble area stays proportional between series
 *
 * @param {Object} data Chart.js data object
 * @return {Object} The same data object with bubble radii rescaled
 */
function preprocessBubbleData( data ) {
	const pixelMax   = 31;
	const pixelMin   = 1;
	const pixelRange = pixelMax - pixelMin;

	// Use the stored original value if available so re-runs always scale from the true value
	let valueRange = 0;

	for ( const ds of data.datasets ) {
		for ( const val of ds.data ) {
			const v = Math.abs( val.original ?? val.r );

			if ( v > valueRange ) {
				valueRange = v;
			}
		}
	}

	// Avoid divide-by-zero when every value is 0
	if ( 0 === valueRange ) {
		valueRange = 1;
	}

	for ( const ds of data.datasets ) {
		const rawData      = ds.rawData || [];
		const isStructured = Array.isArray( rawData[0] );

		ds.data.forEach( ( d, i ) => {
			const trueR = d.original ?? d.r;
			d.original  = trueR;

			// rawData is a flat x/y/r triple stream when not structured — the radius lives at i * 3 + 2
			// the structured form is one [ x, y, r ] array per point; this layout is defined in class-m-chart-chartjs.php
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
	const chart  = item.chart;
	const locale = chart.options.locale;
	const lines  = [];

	// Dataset label lives in the tooltip title (see MChartHelper.beforeUpdate)
	// First body line is the per-point label when present (country name, etc)
	if ( item.raw?.label ) {
		lines.push( item.raw.label );
	}

	lines.push(
		axisName( chart, 0 ) + ': ' + safeNumberFormat( item.parsed.x, locale ),
		axisName( chart, 1 ) + ': ' + safeNumberFormat( item.parsed.y, locale ),
		axisName( chart, 2 ) + ': ' + safeNumberFormat( item.raw.original, locale ),
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
	const chart  = item.chart;
	const locale = chart.options.locale;
	const lines  = [];

	// Dataset label lives in the tooltip title (see MChartHelper.beforeUpdate)
	// First body line is the per-point label when present
	if ( item.raw?.label ) {
		lines.push( item.raw.label );
	}

	lines.push(
		axisName( chart, 0 ) + ': ' + safeNumberFormat( item.parsed.x, locale ),
		axisName( chart, 1 ) + ': ' + safeNumberFormat( item.parsed.y, locale ),
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
	const chart        = item.chart;
	const type         = chart.config.type;
	const labelsPos    = chart.options.plugins?.[ 'm-chart-helper' ]?.labels_pos ?? '';
	const locale       = chart.options.locale;
	const datasetLabel = item.dataset.label;

	// If raw value is null we don't return anything
	if ( null == item.raw ) {
		return null;
	}

	// Resolve the label shown before the value
	// When labels_pos is not 'both' only the series (dataset) name is ever shown — the category sits in the tooltip title
	let name = '';

	if ( 'both' === labelsPos ) {
		if ( 'bar' === type ) {
			// Bar tooltips already get the category in the tooltip title, so only the series name is added here
			name = datasetLabel || '';
		} else if ( 'polarArea' === type ) {
			// Polar charts carry the category in data.labels — combine it with the series name when they differ
			const category = chart.data.labels[ item.dataIndex ];

			name = ( undefined !== datasetLabel && category !== datasetLabel )
				? String( category ) + datasetLabel
				: String( category );
		} else {
			// Prefer the series name, falling back to the point label
			name = ( undefined !== datasetLabel ) ? datasetLabel : item.label;
		}
	} else if ( undefined !== datasetLabel && '' !== datasetLabel ) {
		name = datasetLabel;
	}

	const prefix = name ? name + ': ' : '';

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

	return prefix + rawValue;
}

/**
 * Compute tight y-axis bounds from the raw observation values in a boxplot/violin chart.data
 *
 * Boxplot/violin data is shaped as datasets[].data[row][] where each row is an array of observations for a single box
 * Chart.js's default auto-fit plus the boxplot library's whisker expansion leaves enough headroom that narrow IQRs collapse visually
 * This helper returns a min/max that hugs the actual data with a small grace area to help the boxes stay legible
 *
 * Returns null when there's no usable data to bound (empty, non-numeric, or zero range) so the caller can leave the library default in place
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
 * Reads the configured font, measures the original string in the canvas 2d context
 * If it doesn't fit on one line, it breaks it at word boundaries into an array of lines
 * Stashes the original string on the chart instance under originalProp so future wraps are based on the original
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

	// ctx.measureText returns widths in CSS pixels because Chart.js applies the devicePixelRatio transform to chart.ctx
	// chart.width is also CSS pixels, so the comparison below is apples-to-apples even when image generation overrides the ratio
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
 * Wire the tooltip callbacks, datalabels formatter, and dataset color/label scriptables for a treemap chart
 *
 * Called from beforeUpdate rather than once at install because the admin preview swaps chart.data and chart.options
 * wholesale on every refresh (see ChartPreview.js), which would discard one-time wiring and can change the chart type in place
 *
 * @param {Object} chart Chart.js chart instance
 */
function wireTreemap( chart ) {
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
		const hoverAlphaBump     = 0.06;
		const leafHoverBump      = 0.18;

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

		// Format with locale + affixes. Leaves prefer their own _data prefix/suffix
		// parent rectangles fall back to the dataset-level affixes since the library aggregates
		const formatWithAffixes = ( raw ) => {
			const isLeaf  = raw.l >= leafLevel;
			const leafRaw = isLeaf ? ( raw._data || {} ) : null;
			const prefix  = isLeaf ? ( leafRaw.prefix || datasetPrefix ) : datasetPrefix;
			const suffix  = isLeaf ? ( leafRaw.suffix || datasetSuffix ) : datasetSuffix;

			// raw.v is the leaf value at leaves and the aggregated (summed) value at parent rectangles
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
}

/**
 * Wire the tooltip callbacks for a boxplot/violin chart
 *
 * Called from beforeUpdate for the same wholesale-swap reason as wireTreemap
 *
 * @param {Object} chart Chart.js chart instance
 */
function wireBoxplotViolin( chart ) {
	const locale = chart.options.locale;

	// Note: when constrain_y_axis is on, the scale bounds are applied in afterDataLimits
	// This avoids the visible double-paint that beforeUpdate causes

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
			// chartjs-chart-boxplot overrides Chart.js's getLabelAndValue so that item.formattedValue is an OBJECT for boxplot/violin
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
}

/**
 * Chart.js plugin that sets up m-chart tooltip callbacks, datalabels formatter, and bubble data preprocessing
 *
 * Every hook early-returns for charts that are not M Chart's (see isMChartChart) so the global registration never touches foreign charts
 *
 * beforeLayout: runs before Chart.js calculates layout positions
 * beforeUpdate: runs before every render cycle (creation and updates)
 * afterDataLimits: per-scale hook that fires after Chart.js computes auto-fit bounds but before layout calculations
 * afterDraw: paint the optional in-chart source attribution in the bottom-left of the canvas
 * afterEvent: hover cursor + click handling for the rendered source attribution
 */
const MChartHelper = {
	id: 'm-chart-helper',

	/**
	 * beforeLayout: runs before Chart.js calculates layout positions
	 *
	 * Wraps title and subtitle text at word boundaries when they don't fit the current chart width
	 * Keeps font size constant and breaks across multiple lines instead of squishing the text horizontally
	 *
	 * @param {Object} chart Chart.js chart instance
	 */
	beforeLayout( chart ) {
		if ( ! isMChartChart( chart ) ) {
			return;
		}

		if ( ! chart.ctx || ! chart.width ) {
			return;
		}

		// Derive the available width from the configured layout padding so it tracks the PHP defaults
		const maxWidth = chart.width - horizontalLayoutPadding( chart );

		wrapPluginText( chart, 'title',    maxWidth, '$mchartTitleOriginal'    );
		wrapPluginText( chart, 'subtitle', maxWidth, '$mchartSubtitleOriginal' );
	},

	beforeUpdate( chart ) {
		if ( ! isMChartChart( chart ) ) {
			return;
		}

		const type = chart.config.type;

		if ( 'bubble' === type ) {
			// Rescale radii only when the data object itself changed
			// The admin preview swaps in a new data object on every refresh, so reference equality is the right gate
			// preprocessBubbleData is idempotent via the stored .original value, so a stray re-run is harmless
			if ( chart.$mchartBubbleData !== chart.config.data ) {
				preprocessBubbleData( chart.config.data );
				chart.$mchartBubbleData = chart.config.data;
			}

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
			wireTreemap( chart );

			return;
		} else if ( 'boxplot' === type || 'violin' === type ) {
			wireBoxplotViolin( chart );

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
				const value  = safeNumberFormat( label.original, locale );

				return value ? prefix + value + suffix : '';
			}

			if ( 'scatter' === type ) {
				// Show the Y value, rawData[dataIndex] is an array for LABELS_BOTH, a struct for flat
				// the flat form is an x/y struct stream where the Y lives at dataIndex * 2 + 1 (layout defined in class-m-chart-chartjs.php)
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

				return safeNumberFormat( label.y, locale );
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

		// Keep datalabel text legible when a value lands over a dark element fill
		// Only enhance the default dark ink so a custom color set elsewhere is respected
		// Once swapped for the function this guard is false on later cycles so it stays idempotent
		if ( '#222222' === chart.options.plugins.datalabels.color ) {
			chart.options.plugins.datalabels.color = datalabelContrastColor;
		}
	},

	/**
	 * afterDataLimits: per-scale hook that fires after Chart.js computes auto-fit bounds but before layout calculations
	 *
	 * For boxplot/violin charts with constrain_y_axis on, overwrite the scale's min/max with bounds tightened to the actual data
	 * This way the chart paints once with the constrained bounds — no double-paint flicker
	 *
	 * @param {Object} chart Chart.js chart instance
	 * @param {Object} args  Hook args; args.scale is the scale being processed
	 */
	afterDataLimits( chart, args ) {
		if ( ! isMChartChart( chart ) ) {
			return;
		}

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
	 * Reads optional `position` / `font` / `overrideFont` config keys from the `mchart` plugin block
	 * Core itself never writes these; they're potentially populated by extensions
	 * When all three are absent the render falls back to the original 12px-from-bottom-left default
	 *
	 * @param {Object} chart Chart.js chart instance
	 */
	afterDraw( chart ) {
		if ( ! isMChartChart( chart ) ) {
			return;
		}

		const opts = chart.options.plugins?.mchart;

		if ( ! opts?.include_source || ! opts?.source ) {
			chart.$mchartSourceBounds = null;
			return;
		}

		const ctx          = chart.ctx;
		const text         = String( opts.source );
		const useOverride  = !! opts.overrideFont;
		const overrideFont = opts.font     || {};
		const position     = opts.position || {};

		const defaultFamily = ( window.Chart && window.Chart.defaults?.font?.family ) || 'sans-serif';
		const defaultColor  = ( window.Chart && window.Chart.defaults?.color )        || '#666666';

		const family = useOverride && overrideFont.family ? overrideFont.family : defaultFamily;
		const size   = useOverride && overrideFont.size   ? Number( overrideFont.size ) : 12;
		const weight = useOverride && overrideFont.weight ? overrideFont.weight : 'normal';
		const style  = useOverride && overrideFont.style  ? overrideFont.style  : 'normal';
		const color  = useOverride && overrideFont.color  ? overrideFont.color  : defaultColor;

		ctx.save();
		ctx.font         = `${ style } ${ weight } ${ size }px ${ family }`;
		ctx.fillStyle    = color;
		ctx.textAlign    = 'left';
		// textBaseline:'top' so drawY is the top edge of the text block — simpler
		// position math (matches m-chart-pro's text-element paintText). Defaults
		// below still place the text 12px from the canvas's bottom-left corner,
		// so the visible position is identical to the pre-override behavior.
		ctx.textBaseline = 'top';

		const metrics = ctx.measureText( text );
		const blockW  = metrics.width;
		const blockH  = size;

		// Position math mirrors m-chart-pro's resolvePosition() in
		// m-chart-pro-theme-helper.js — keep the two in sync so extensions
		// and core stay visually consistent. Per-axis xOffsetUnits /
		// yOffsetUnits (PositionGrid canonical shape) take precedence;
		// fall back to the legacy single `units` field for older configs.
		const xKey    = position.x     || 'left';
		const yKey    = position.y     || 'bottom';
		const xUnits  = position.xOffsetUnits || position.units || 'pixels';
		const yUnits  = position.yOffsetUnits || position.units || 'pixels';
		const xRaw    = ( position.xOffset === undefined || position.xOffset === null || position.xOffset === '' )
			? 12
			: Number( position.xOffset );
		const yRaw    = ( position.yOffset === undefined || position.yOffset === null || position.yOffset === '' )
			? 12
			: Number( position.yOffset );
		const xOffset = 'percent' === xUnits ? chart.width  * ( xRaw / 100 ) : xRaw;
		const yOffset = 'percent' === yUnits ? chart.height * ( yRaw / 100 ) : yRaw;

		let drawX;
		if ( 'right' === xKey ) {
			drawX = chart.width - blockW - xOffset;
		} else if ( 'center' === xKey ) {
			drawX = ( chart.width - blockW ) / 2;
		} else {
			drawX = xOffset;
		}

		let drawY;
		if ( 'top' === yKey ) {
			drawY = yOffset;
		} else if ( 'center' === yKey ) {
			drawY = ( chart.height - blockH ) / 2;
		} else {
			drawY = chart.height - blockH - yOffset;
		}

		ctx.fillText( text, drawX, drawY );

		// Pad the click target slightly on each side so the hover/click affordance is comfortable.
		chart.$mchartSourceBounds = {
			left:   drawX - 2,
			right:  drawX + blockW + 2,
			top:    drawY - 2,
			bottom: drawY + blockH + 2,
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
		if ( ! isMChartChart( chart ) ) {
			return;
		}

		const opts   = chart.options.plugins?.mchart;
		const bounds = chart.$mchartSourceBounds;

		if ( ! opts?.include_source || ! opts?.source || ! opts?.source_url || ! bounds ) {
			if ( chart.canvas && 'pointer' === chart.canvas.style.cursor ) {
				chart.canvas.style.cursor = '';
			}

			return;
		}

		const e = args.event;

		if ( ! e ) {
			return;
		}

		// Reset the cursor when the pointer leaves the canvas so the pointer affordance never sticks
		if ( 'mouseout' === e.type ) {
			if ( chart.canvas && 'pointer' === chart.canvas.style.cursor ) {
				chart.canvas.style.cursor = '';
			}

			return;
		}

		if ( 'number' !== typeof e.x || 'number' !== typeof e.y ) {
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
			// Null the opener defensively even though noopener is requested in the features string
			const opened = window.open( opts.source_url, '_blank', 'noopener,noreferrer' );

			if ( opened ) {
				opened.opener = null;
			}
		}
	},
};

window.MChartHelper = MChartHelper;
