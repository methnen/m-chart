/**
 * Chart type traits
 *
 * PHP localises M_Chart_Chartjs::get_type_traits() as m_chart_admin.type_traits and the context exposes it as state.typeTraits
 * A library that doesn't provide traits (the deprecated Highcharts plugin reuses these rows) falls back to the lists core used before 2.4
 */

const DEFAULT_TRAITS = {
	shared_tooltip:        new Set( [ 'line', 'spline', 'area', 'radar', 'radar-area' ] ),
	no_legend:             new Set( [ 'treemap', 'venn', 'euler' ] ),
	no_labels:             new Set( [ 'boxplot', 'violin' ] ),
	boxplot_points:        new Set( [ 'boxplot', 'violin' ] ),
	data_point_colors:     new Set( [ 'column', 'bar', 'treemap', 'boxplot', 'violin' ] ),
	simple_2d_required:    new Set( [ 'column', 'bar', 'treemap' ] ),
	single_sheet_required: new Set( [ 'boxplot', 'violin' ] ),
	y_min:                 new Set( [ 'line', 'spline', 'area' ] ),
	constrain_y:           new Set( [ 'boxplot', 'violin' ] ),
	axes:                  new Set( [ 'line', 'spline', 'area', 'column', 'stacked-column', 'bar', 'stacked-bar', 'scatter', 'bubble', 'boxplot', 'violin' ] ),
};

/**
 * Whether a chart type has a trait
 *
 * @param {Object} traits state.typeTraits
 * @param {string} type   The m-chart chart type
 * @param {string} name   Trait key as PHP names it (legend / labels are "has" flags, so `! hasTrait( …, 'legend' )` hides the toggle)
 * @return {boolean} The trait value, or the pre-2.4 default when the type isn't in the traits list
 */
export function hasTrait( traits, type, name ) {
	const row = traits && traits[ type ];

	if ( row && Object.prototype.hasOwnProperty.call( row, name ) ) {
		return !! row[ name ];
	}

	switch ( name ) {
		case 'legend':
			return ! DEFAULT_TRAITS.no_legend.has( type );
		case 'labels':
			return ! DEFAULT_TRAITS.no_labels.has( type );
		default:
			return DEFAULT_TRAITS[ name ] ? DEFAULT_TRAITS[ name ].has( type ) : false;
	}
}
