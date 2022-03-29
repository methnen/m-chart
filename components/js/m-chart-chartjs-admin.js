var m_chart_chartjs_admin = {};

(function( $ ) {
	'use strict';

	// Start things up
	m_chart_chartjs_admin.init = function() {
		// Only show fields/inputs that are appropriate for the current chart type
		var $chart_type_select = $( document.getElementById( 'm-chart-type' ) );
		$chart_type_select.on( 'load, change', this.handle_chart_type );
		$chart_type_select.trigger( 'change' );

		// Watch for a new chart to be built
		if ( 'default' === m_chart_admin.performance && 'yes' === m_chart_admin.image_support ) {
			$( '.m-chart' ).on( 'render_done', this.generate_image_from_chart );
		}

		$( '.m-chart' ).on( 'chart_args_success', this.refresh_chart );
	};

	// Handle chart type input changes so the settings UI only reflects appropriate options
	m_chart_chartjs_admin.handle_chart_type = function( event ) {
		var chart_type        = $( this ).val();
		var $chart_meta_box   = $( document.getElementById( 'm-chart' ) );
		var $spreadsheet_tabs = $( document.getElementById( 'hands-on-table-sheet-tabs' ) );

		// Show everything before hiding the options we don't want
		$chart_meta_box.find( '.row, .shared' ).removeClass( 'hide' );
		$chart_meta_box.find( '.row.two' ).addClass( 'show-shared' );

		if (
			   'area' === chart_type
			|| 'column' === chart_type
			|| 'stacked-column' === chart_type
			|| 'bar' === chart_type
			|| 'stacked-bar' === chart_type
		) {
			$spreadsheet_tabs.addClass( 'hide' );
		}

		if (
			   'column' === chart_type
			|| 'stacked-column' === chart_type
			|| 'bar' === chart_type
			|| 'stacked-bar' === chart_type
		) {
			$chart_meta_box.find( '.row.y-min' ).addClass( 'hide' );
			// In Chart.js this behavior appears to be a default and I can't seem to override it
			$chart_meta_box.find( '.row.two' ).removeClass( 'show-shared' );
		}

		if (
			   'pie' === chart_type
			|| 'doughnut' === chart_type
			|| 'polar' === chart_type
		) {
			$chart_meta_box.find( '.row.vertical-axis, .row.horizontal-axis, .row.y-min' ).addClass( 'hide' );
			$chart_meta_box.find( '.row.two' ).removeClass( 'show-shared' );
		}

		if (
			   'scatter' === chart_type
			|| 'bubble' === chart_type
		) {
			$chart_meta_box.find( '.row.y-min' ).addClass( 'hide' );
			$chart_meta_box.find( '.row.two' ).removeClass( 'show-shared' );
			$spreadsheet_tabs.removeClass( 'hide' );
		}

		if ( 'polar' === chart_type ) {
			$spreadsheet_tabs.addClass( 'hide' );
		}

		if (
			   'radar' === chart_type
			|| 'radar-area' === chart_type
		) {
			$chart_meta_box.find( '.row.vertical-axis, .row.horizontal-axis, .row.y-min' ).addClass( 'hide' );
			$spreadsheet_tabs.removeClass( 'hide' );
		}
	};

	// Generate a PNG image out of a rendered chart
	m_chart_chartjs_admin.generate_image_from_chart = function( event ) {
		m_chart_admin.form_submission(false);

		var $canvas_source = document.getElementById( 'm-chart-' + event.post_id + '-' + event.instance );
		var $target_canvas = $( '#m-chart-canvas-render-' + event.post_id );
		var target_context = document.getElementById( 'm-chart-canvas-render-' + event.post_id ).getContext('2d');

		var chart_width  = m_chart_admin.image_width;
		var chart_height = $( document.getElementById( 'm-chart-height' ) ).val();

		var image_width  = chart_width * m_chart_admin.image_multiplier;
		var image_height = chart_height * m_chart_admin.image_multiplier;

		// Set some constraints on the chart to get it into the right size for image generation
		$( '.m-chart-container' ).attr( 'width', chart_width ).css( 'width', chart_width + 'px' ).css( 'height', chart_height + 'px' );

		// Resize the chart
		window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.resize();

		// Set the background to a solid white color (we don't need to reset this explicitly as it's undone by the later chart.resize() call)
		var $chart_context = window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.canvas.getContext( '2d' );

		$chart_context.save();
		$chart_context.globalCompositeOperation = 'destination-over';
		$chart_context.fillStyle = 'white';
		$chart_context.fillRect(0, 0, window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.width, window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.height );
		$chart_context.restore();

		// Get a PNG of the chart
		var img = window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.toBase64Image( 'image/png', 1 );

		// Remove the restraints
		$( '.m-chart-container' ).removeAttr( 'width' ).css( 'width', '' ).css( 'height', '' );

		// Put the chart back into it's normal state
		window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.resize();

		// Save the image string to the text area so we can save it on update/publish
		$( document.getElementById( 'm-chart-img' ) ).val( img );

		// Allow form submission now that we've got a valid img value set
		m_chart_admin.form_submission( true );
	};


	// Refresh the chart arguments
	m_chart_chartjs_admin.refresh_chart = function( event ) {
		// Chart.js falls down if you don't pass it at least an empty array for a dataset
		if ( 'undefined' === typeof event.response.data.data.datasets ) {
			event.response.data.data.datasets = [];
		}

		// Similarly Chart.js doesn't deal well with an empty value for the labels
		if ( null === event.response.data.data.labels ) {
			event.response.data.data.labels = [];
		}

		// Update active chart options and then rerender the chart
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.data = event.response.data.data;
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.config.type = event.response.data.type;
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.options = event.response.data.options;

		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart_args.value_prefix = event.response.data.value_prefix;
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart_args.value_suffix = event.response.data.value_suffix;

		// Height is set via the container
		var height = $( document.getElementById( 'm-chart-height' ) ).val();
		$( '.m-chart-container' ).attr( 'height', height ).css( 'height', height );

		// This deals with an issue in Chart.js 3.1.0 where onComplete can run too many times
		// We only want to trigger on the first render anyway so we'll just check every time
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].render_1 = true;

		$( '.m-chart' ).trigger({
			type:     'render_start',
			post_id:  m_chart_admin.post_id,
			instance: 1
		});

		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.update();

		// Need to make sure the onComplete callback gets reattached on chart refreshes
		// This is intentionally done after the chart.update() line above
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.options.animation = {
			onComplete: function() {
				if ( false === window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].render_1 ) {
					return;
				}

				window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].render_1 = false;

				$( '.m-chart' ).trigger({
					type:     'render_done',
					post_id:  m_chart_admin.post_id,
					instance: 1
				});
			}
		};

		if ( 'no-images' === m_chart_admin.performance ) {
			m_chart_admin.form_submission( true );
		}
	};

	$( function() {
		m_chart_chartjs_admin.init();
	} );
})( jQuery );