var m_chart_chartjs_helpers = {
	number_format_locale: 'en-US',
	number_format_options: {
		maximumFractionDigits: 2,
	}
};

(function( $ ) {
	'use strict';

	// Start things up
	m_chart_chartjs_helpers.init = function() {
		console.log('init');
		$( '.m-chart' ).on( 'render_start', function( event ) {
			console.log('start!');
			var chart_object = 'm_chart_chartjs_' + event.post_id + '_' + event.instance;

			if ( 'undefined' === typeof window[chart_object] ) {
				return;
			}

			var type = window[chart_object].chart_args.type;

			var value_prefix = window[chart_object].chart_args.value_prefix;
			var value_suffix = window[chart_object].chart_args.value_suffix;

			m_chart_chartjs_helpers.number_format_locale = window[chart_object].chart_args.locale;
			console.log(m_chart_chartjs_helpers.number_format_locale);
			if ( 'bubble' == window[chart_object].chart_args.type ) {
				window[chart_object].chart_args.data = m_chart_chartjs_helpers.preprocess_bubble_data( window[chart_object].chart_args.data );
				window[chart_object].chart_args.options.plugins.tooltip.callbacks = {
					label: (item) => {
	                	return m_chart_chartjs_helpers.bubble_chart_tooltip_label( item, type, value_prefix, value_suffix );
	                }
				}
			} else if ( 'scatter' == window[chart_object].chart_args.type ) {
				window[chart_object].chart_args.options.plugins.tooltip.callbacks = {
					label: (item) => {
	                	return m_chart_chartjs_helpers.scatter_chart_tooltip_label( item, type, value_prefix, value_suffix );
	                }
				}
			} else {
				window[chart_object].chart_args.options.plugins.tooltip.callbacks = {
					label: (item) => {
	                	return m_chart_chartjs_helpers.chart_tooltip_label( item, type, value_prefix, value_suffix );
	                }
				}
			}

			window[chart_object].chart_args.options.plugins.datalabels.formatter = function( label ) {
				// If there's no label we stop here
				if ( null === label ) {
					return label;
				}
				
				// Handling for Bubble/Scatter Charts
				if ( 'undefined' !== typeof label.r ) {
					label = label.r;
				} else if ( 'undefined' !== typeof label.y ) {
					label = label.y;
				}

				if ( $.isNumeric( label ) ) {
					return m_chart_chartjs_helpers.number_format( label );
				} else {
					return label;
				}
			};

			if (
				   'pie' != window[chart_object].chart_args.type
				&& 'doughnut' != window[chart_object].chart_args.type
				&& 'polarArea' != window[chart_object].chart_args.type
				&& 'radar' != window[chart_object].chart_args.type
			) {
				m_chart_chartjs_helpers.start_tick_formatting( chart_object );
			}
		});
	};

	// Preprocess bubble chart data so bubble size is controlled but still relative to value
	// See https://chartio.com/learn/charts/bubble-chart-complete-guide/#scale-bubble-area-by-value
	m_chart_chartjs_helpers.preprocess_bubble_data = function( $data ) {
		const value_range = $data.datasets[0].data.reduce((acc, val) => Math.max(acc, val.r), 0);
		const pixel_max   = 31;
		const pixel_min   = 1;
		const pixel_range = pixel_max - pixel_min;

		for ( const ds of $data.datasets ) {
			for ( const d of ds.data ) {
				d.original = d.r;

				const percentage_radius = Math.sqrt( Math.abs(d.r) / value_range );
				d.r = percentage_radius * pixel_range + pixel_min;
			}
		}

		return $data;
	};

	m_chart_chartjs_helpers.bubble_chart_tooltip_label = function( item, type, prefix, suffix ) {
		var tooltip_label = [
			item.raw.label,
			item.chart.data.labels[0] + ': ' + m_chart_chartjs_helpers.number_format( item.parsed.x ),
			item.chart.data.labels[1] + ': ' + m_chart_chartjs_helpers.number_format( item.parsed.y ),
			item.chart.data.labels[2] + ': ' + m_chart_chartjs_helpers.number_format( item.raw.original ),
		];

		return tooltip_label;
	};

	m_chart_chartjs_helpers.scatter_chart_tooltip_label = function( item, type, prefix, suffix ) {
		var tooltip_label = [
			item.dataset.label,
			item.chart.data.labels[0] + ': ' + m_chart_chartjs_helpers.number_format( item.parsed.x ),
			item.chart.data.labels[1] + ': ' + m_chart_chartjs_helpers.number_format( item.parsed.y ),
		];

		return tooltip_label;
	};

	m_chart_chartjs_helpers.chart_tooltip_label = function( item, type, prefix, suffix ) {
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

		if ( '' != label ) {
			label += ': ';
		}

		var tooltip_label = label + prefix + m_chart_chartjs_helpers.number_format( item.raw ) + suffix;

		return tooltip_label;
	};

	// This is super roundabout, someone better at Javascript might know a better way to handle this but this is what I ended up with
	m_chart_chartjs_helpers.start_tick_formatting = function( chart_object ) {
		var $ticks_callback = {
			callback: function( value, index, values ) {
				if ( this.getLabelForValue(value) ) {
					var label = this.getLabelForValue(value);
					
					if ( ! m_chart_chartjs_helpers.is_numeric( label )  ) {
						value = label;
					}
				}

				if ( m_chart_chartjs_helpers.is_numeric( value ) ) {
					return m_chart_chartjs_helpers.number_format( value );
				} else {
					return value;
				}
			}
		}

		// Need to set the necessary ticks objects if one doesn't already exist, scales should already exist as far as I can tell, not sure why ticks doesn't honestly
		if ( 'undefined' === typeof window[chart_object].chart_args.options.scales.x.ticks ) {
			window[chart_object].chart_args.options.scales.x.ticks = {};
		}

		if ( 'undefined' === typeof window[chart_object].chart_args.options.scales.y.ticks ) {
			window[chart_object].chart_args.options.scales.y.ticks = {};
		}

		window[chart_object].chart_args.options.scales.x.ticks =  Object.assign( window[chart_object].chart_args.options.scales.x.ticks, $ticks_callback );
		window[chart_object].chart_args.options.scales.y.ticks =  Object.assign( window[chart_object].chart_args.options.scales.y.ticks, $ticks_callback );
	};
	
	m_chart_chartjs_helpers.number_format = function( number ) {
		return new Intl.NumberFormat( this.number_format_locale, this.number_format_options ).format( number );
	};

	// This is purposely more inclusive than you would normally want
	// It accepts numbers that have commas so the tick formatting can work correctly
	m_chart_chartjs_helpers.is_numeric = function( string ) {
		return /^[0-9,.]*$/.test( string );
	};

	$( function() {
		m_chart_chartjs_helpers.init();
	} );
})( jQuery );