var m_chart_admin = {
	refresh_counter: 0,
	allow_form_submission: false,
	request: false
};

(function( $ ) {
	'use strict';

	// Start things up
	m_chart_admin.init = function() {
		this.post_id = $( document.getElementById( 'post_ID' ) ).attr( 'value' );
		this.nonce   = $( 'input[name="m-chart[nonce]"]' ).attr( 'value' );

		this.create_spreadsheet();

		// Store the setting inputs and title input for use later
		this.$setting_inputs = $( document.getElementById( 'm-chart' ) ).find( '.settings input, .settings select' );
		this.$title_input    = $( document.getElementById( 'titlediv' ) ).find( 'input' );

		// Only show fields/inputs that are appropriate for the current chart type
		var $chart_type_select = $( document.getElementById( 'm-chart-type' ) );
		$chart_type_select.on( 'load, change', this.handle_chart_type );
		$chart_type_select.trigger( 'change' );

		// Set the form encoding type to multipart/form-data so that the CSV import will work
		var $form = $( 'form#post' );
		$form.attr( 'enctype', 'multipart/form-data' );

		// Watch form submissions and stop them if necessary or update data value
		$form.on( 'submit', function( event ) {
			if ( false === m_chart_admin.allow_form_submission ) {
				event.preventDefault();
			} else {
				$( document.getElementById( 'm-chart-spreadsheet' ) ).find( '.data' ).val(
					JSON.stringify( m_chart_admin.$spreadsheet.getData() )
				);
			}
		})

		// Store these for later
		this.$form_buttons = $( '#save-post, #wp-preview, #post-preview, #publish' );

		// Watch for a new chart to be built
		$( '.m-chart' ).on( 'render_done', this.generate_image_from_chart );

		// Watch for clicks on the shortcode input
		$( document.getElementById( 'm-chart-shortcode' ) ).on( 'click', function () {
			$( this ).select();
		});

		// Watch for clicks on the image input
		$( document.getElementById( 'm-chart-image' ) ).on( 'click', function () {
			$( this ).select();
		});

		this.handle_csv_import();
		this.handle_csv_export();
		this.watch_for_chart_changes();
	};

	// Instantiate the spreedsheet
	m_chart_admin.create_spreadsheet = function() {
		var $spreadsheet_div = document.getElementById( 'hands-on-table-sheet-' + this.post_id );

		this.$spreadsheet = new Handsontable( $spreadsheet_div, {
			data:         hands_on_table_data,
			colHeaders:   true,
			rowHeaders:   true,
			height:       350,
			minRows:      17,
			minCols:      37,
			minSpareRows: 1,
			minSpareCols: 1,
			contextMenu:  true,
			afterChange:  function() {
				// If a value changes update the chart
				m_chart_admin.refresh_chart();
			}
		});
	}

	// Handle chart type input changes so the settings UI only reflects appropriate options
	m_chart_admin.handle_chart_type = function( event ) {
		var chart_type      = $( this ).attr( 'value' );
		var $chart_meta_box = $( document.getElementById( 'm-chart' ) );

		// Show everything before hiding the options we don't want
		$chart_meta_box.find( '.row' ).removeClass( 'hide' );

		if (
			   'area' === chart_type
			|| 'column' === chart_type
			|| 'bar' === chart_type
		) {
			$chart_meta_box.find( '.row.y-min' ).addClass( 'hide' );
		}

		if ( 'pie' === chart_type ) {
			$chart_meta_box.find( '.row.vertical-axis, .row.horizontal-axis, .row.y-min' ).addClass( 'hide' );
		}
	};

	// Handle CSV import functionality
	m_chart_admin.handle_csv_import = function() {
		var $csv_meta_box = $( document.getElementById( 'm-chart-csv' ) );
		var $select       = $csv_meta_box.find( '.import .select.button' );
		var $import       = $csv_meta_box.find( '.import .import.button' );
		var $import_form  = $( document.getElementById( 'm-chart-csv-import-form' ) );
		var $file_input   = $import_form.find( 'input[type=file]' );
		var $file_info    = $csv_meta_box.find( '.file-info' );
		var $file_error   = $csv_meta_box.find( '.file.error' );
		var $file_import  = $csv_meta_box.find( '.import.in-progress' );
		var $import_error = $csv_meta_box.find( '.import.error' );
		var $cancel       = $csv_meta_box.find( '.dashicons-dismiss' );

		// Watch for clicks on the select button
		$select.on( 'click', function( event ) {
			event.preventDefault();
			$file_error.addClass( 'hide' );
			$import_error.addClass( 'hide' );
			$file_input.trigger( 'click' );
		});

		// Watch for changes to the file input
		$file_input.on( 'change', function( event ) {
			var file_name = $( this ).attr( 'value' ).replace( /C:\\fakepath\\/i, '' );

			if ( -1 === file_name.search( /.+(\.csv)$/ ) ) {
				$file_error.removeClass( 'hide' );
				return;
			}

			$file_info.find( '.file-name' ).text( file_name );

			$select.addClass( 'hide' );
			$import.removeClass( 'hide' );
			$file_info.removeClass( 'hide' );
		});

		// Watch for clicks on the cancel button
		$cancel.on( 'click', function( event ) {
			event.preventDefault();
			$file_info.addClass( 'hide' );
			$file_input.attr( 'value', '' );
			$select.removeClass( 'hide' );
			$import.addClass( 'hide' );
		});

		// Watch for clicks on import button
		$import.on( 'click', function( event ) {
			event.preventDefault();

			$file_info.addClass( 'hide' );
			$import.addClass( 'hide' );
			$import_error.addClass( 'hide' );
			$file_import.removeClass( 'hide' );

			$import_form.trigger( 'submit' );
		});

		// Watch for CSV import form submission
		$import_form.on( 'submit', function( event ) {
			event.preventDefault();

			var $form_data = new FormData( this );

			$form_data.append( 'post_id', m_chart_admin.post_id );
			$form_data.append( 'nonce', m_chart_admin.nonce );

			var request = $.ajax({
				url: 'admin-ajax.php?action=m_chart_import_csv',
				type: 'POST',
				data: $form_data,
				cache: false,
				dataType: 'json',
				// Don't process the files
				processData: false,
				// Set content type to false as jQuery will tell the server its a query string request
				contentType: false
			});

			request.done( function( response ) {
				if ( false == response.success ) {
					console.log(response)
					$import_error.text( response.data );
					$import_error.removeClass( 'hide' );

					$file_input.attr( 'value', '' );
					$select.removeClass( 'hide' );
					$file_import.addClass( 'hide' );

					return false;
				}

				// Update the spreadsheet with the new data
				m_chart_admin.$spreadsheet.loadData( response.data );

				$file_input.attr( 'value', '' );
				$select.removeClass( 'hide' );
				$file_import.addClass( 'hide' );
			});
		});
	};

	// Handle CSV export functionality
	m_chart_admin.handle_csv_export = function() {
		$( document.getElementById( 'm-chart-csv' ) ).find( '.export a' ).on( 'click', function( event ) {
			event.preventDefault();

			var $form = $( document.getElementById( 'm-chart-csv-export-form' ) );

			$( document.getElementById( 'm-chart-csv-post-id' ) ).val( m_chart_admin.post_id );
			$( document.getElementById( 'm-chart-csv-data' ) ).val( JSON.stringify( m_chart_admin.$spreadsheet.getData() ) );
			$( document.getElementById( 'm-chart-csv-title' ) ).val( m_chart_admin.$title_input.attr( 'value' ) );

			$form.trigger( 'submit' );
		});
	};

	// Generate a PNG image out of a rendered chart
	m_chart_admin.generate_image_from_chart = function( event ) {
		var svg    = event.chart.getSVG();
		var width  = svg.match(/^<svg[^>]*width\s*=\s*\"?(\d+)\"?[^>]*>/)[1];
		var height = svg.match(/^<svg[^>]*height\s*=\s*\"?(\d+)\"?[^>]*>/)[1];

		// Double the width/height values in SVG
	    svg = svg.replace( 'width="' + width + '"', 'width="' + ( width * 2 ) + '"' );
	    svg = svg.replace( 'height="' + height + '"', 'height="' + ( height * 2 ) + '"' );

		// Scale the SVG object
		svg = svg.replace( '<svg ', '<svg transform="scale(2, 2)" ' );

		// Create a Canvas object out of the SVG
		var $canvas = $( '#m-chart-canvas-render-' + event.post_id );
		m_chart_admin.canvas = $canvas.get( 0 );

		canvg( m_chart_admin.canvas, svg );

		// Create Canvas context so we can play with it before saving
		m_chart_admin.canvas_context = m_chart_admin.canvas.getContext( '2d' );

		$( '.m-chart' ).trigger({
			type: 'canvas_done'
		});

		var img = m_chart_admin.canvas.toDataURL( 'image/png' );

		// Save the image string to the text area so we can save it on update/publish
		$( document.getElementById( 'm-chart-img' ) ).attr( 'value', img );

		// Allow form submission now that we've got a valid img value set
		m_chart_admin.form_submission( true );
	};

	// Watch for changes to the chart settings or title
	m_chart_admin.watch_for_chart_changes = function() {
		this.$setting_inputs.on( 'change', function() {
			m_chart_admin.refresh_chart();
		});

		this.$title_input.on( 'change', function() {
			m_chart_admin.refresh_chart();
		});
	};

	// Refresh chart
	m_chart_admin.refresh_chart = function() {
		m_chart_admin.refresh_counter++;

		// Handsontable calls afterChange on the first render for some silly reason
		if ( 1 === m_chart_admin.refresh_counter ) {
			return false;
		}

		// Stop any existing requests so we don't just pile them up
		if ( this.request ) {
			this.request.abort();
		}

		// Stop form submission while we wait for the chart to refresh and a new image to generate
		m_chart_admin.form_submission( false );

		// Build an object with all fo the post_meta values
		var $post_meta = {};

		this.$setting_inputs.each( function() {
			// Don't record unselected/unchecked radio/checkboxes
			if (
				   'radio' !== $( this ).attr( 'type' )
				&& 'checkbox' !== $( this ).attr( 'type' )
				|| true === $( this ).is( ':checked' )
			 ) {
				$post_meta[ $( this ).attr( 'name' ).replace( /^m-chart\[|\]$/g , '' ) ] = $( this ).attr( 'value' );
			}
		});

		$post_meta.data = JSON.stringify( m_chart_admin.$spreadsheet.getData() );

		// Request a new chart_args object so we can rerender the chart with the changes
		this.request = $.ajax({
			url: 'admin-ajax.php?action=m_chart_get_chart_args',
			type: 'POST',
			data: {
				post_id:   m_chart_admin.post_id,
				nonce:     m_chart_admin.nonce,
				library:   'highcharts',
				title:     this.$title_input.attr( 'value' ),
				post_meta: $post_meta
			},
			cache: false,
			dataType: 'json'
		});

		this.request.done( function( response ) {
			if ( true !== response.success ) {
				return false;
			}

			// Update active chart args and then rerender the chart
			window[ 'm_chart_highcharts_' + m_chart_admin.post_id ].chart_args = response.data;
			window[ 'm_chart_highcharts_' + m_chart_admin.post_id ].render_chart();
		});
	};

	m_chart_admin.form_submission = function( enable ) {
		m_chart_admin.allow_form_submission = enable;

		if ( false === enable ) {
			m_chart_admin.$form_buttons.addClass( 'disabled' );
		} else {
			m_chart_admin.$form_buttons.removeClass( 'disabled' );
		}
	};

	$( function() {
		m_chart_admin.init();
	} );
})( jQuery );