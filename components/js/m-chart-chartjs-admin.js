var m_chart_chartjs_admin = {
	image_step: 1
};

(function( $ ) {
	'use strict';

	// Start things up
	m_chart_chartjs_admin.init = function() {
		// Hide the subtitle and $y_min_value fields
		m_chart_admin.$y_min_value.hide();
		m_chart_admin.$subtitle_input.hide();

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

		// Chart.js will never need the tabs
		$spreadsheet_tabs.addClass( 'hide' );

		if ( 'pie' === chart_type ) {
			$chart_meta_box.find( '.row.vertical-axis, .row.horizontal-axis, .row.y-min' ).addClass( 'hide' );
		}
	};

	// Generate a PNG image out of a rendered chart
	m_chart_chartjs_admin.generate_image_from_chart = function( event ) {
		var $canvas_source = document.getElementById( 'm-chart-' + event.post_id + '-' + event.instance );
		var $target_canvas = $( '#m-chart-canvas-render-' + event.post_id );
		var target_context = document.getElementById( 'm-chart-canvas-render-' + event.post_id ).getContext('2d');

		// Need to do this in steps because we have to resize the chart which triggers a redraw thus a potential infinite loop

		if ( 1 === m_chart_chartjs_admin.image_step ) {
			// Set some constraints on the chart to get it into the a good size for image generation
			$target_canvas.attr( 'width', $canvas_source.width ).attr( 'height', $canvas_source.height );
			$( '.m-chart-container' ).attr( 'width', 1200 ).css( 'width', 600 );

			// Need to force the chart to resize
			window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.resize();

			// Iterate the step count
			m_chart_chartjs_admin.image_step++;
		}

		if ( 2 === m_chart_chartjs_admin.image_step ) {
			// Give the target canvas a white background
			target_context.fillStyle = 'white';
			target_context.fillRect(0, 0, $canvas_source.width, $canvas_source.height);

			// Copy the chart over to a new canvas object
			target_context.drawImage( $canvas_source, 0, 0, $canvas_source.width, $canvas_source.height );

			// Iterate the step count
			m_chart_chartjs_admin.image_step++;
		}

		if ( 3 === m_chart_chartjs_admin.image_step ) {
			$( '.m-chart-container' ).removeAttr( 'width' ).css( 'width', '' );

			// Put the chart back into it's normal state
			window[ 'm_chart_chartjs_' + event.post_id + '_1' ].chart.resize();

			// Iterate the step count
			m_chart_chartjs_admin.image_step++;
		}

		if ( 4 === m_chart_chartjs_admin.image_step ) {
			// Get the a PNG of the chart
			var img = $target_canvas.get(0).toDataURL( 'image/png' );

			// Save the image string to the text area so we can save it on update/publish
			$( document.getElementById( 'm-chart-img' ) ).val( img );

			// Allow form submission now that we've got a valid img value set
			m_chart_admin.form_submission( true );

			// Set the step count back to 1
			m_chart_chartjs_admin.image_step = 1;
		}
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
		// Need to make sure the onComplete callback gets reattached on chart refreshes
		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.options.animation = {
			onComplete: function() {
				$( '.m-chart' ).trigger({
					type:     'render_done',
					post_id:  m_chart_admin.post_id,
					instance: 1
				});
			}
		};

		// Height is set via the container
		var height = $( document.getElementById( 'm-chart-height' ) ).val();
		$( '.m-chart-container' ).attr( 'height', height* 2 ).css( 'height', height );

		window[ 'm_chart_chartjs_' + m_chart_admin.post_id + '_1' ].chart.update();

		if ( 'no-images' === m_chart_admin.performance ) {
			m_chart_admin.form_submission( true );
		}
	};

	$( function() {
		m_chart_chartjs_admin.init();
	} );
})( jQuery );
