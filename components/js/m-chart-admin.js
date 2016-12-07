(function( $ ) {
	'use strict';

	// Start things up
	m_chart_admin.init = function() {
		this.post_id = $( document.getElementById( 'post_ID' ) ).attr( 'value' );
		this.nonce   = $( 'input[name="m-chart[nonce]"]' ).attr( 'value' );

		this.build_spreadsheets();

		// Store the setting inputs and title input for use later
		this.$setting_inputs   = $( document.getElementById( 'm-chart' ) ).find( '.settings input, .settings select' );
		this.$title_input      = $( document.getElementById( 'titlewrap' ) ).find( 'input' );
		this.$subtitle_input   = $( document.getElementById( 'titlediv' ) ).find( '#m-chart-subtitle' );
		this.$y_min_value      = $( document.getElementById( 'm-chart-y-min-value' ) );

		// Only show fields/inputs that are appropriate for the current chart type
		var $chart_type_select = $( document.getElementById( 'm-chart-type' ) );
		$chart_type_select.on( 'load, change', this.handle_chart_type );
		$chart_type_select.trigger( 'change' );

		// Handle the spreadsheet controls
		this.handle_sheet_controls();

		// Set the form encoding type to multipart/form-data so that the CSV import will work
		var $form = $( 'form#post' );
		$form.attr( 'enctype', 'multipart/form-data' );

		// Watch form submissions and stop them if necessary or update data value
		$form.on( 'submit', function( event ) {
			event.preventDefault();
			if ( false === m_chart_admin.allow_form_submission ) {
				event.preventDefault();
			} else {
				$( document.getElementById( 'm-chart-spreadsheet' ) ).find( '.data' ).val(
					JSON.stringify( m_chart_admin.get_data() )
				);
			}
		})

		// Store these for later
		this.$form_buttons = $( '#save-post, #wp-preview, #post-preview, #publish' );

		// Watch for a new chart to be built
		if ( 'default' === this.performance ) {
			$( '.m-chart' ).on( 'render_done', this.generate_image_from_chart );
		}

		// Watch for clicks on the y min toggle
		$( document.getElementById( 'm-chart-y-min' ) ).on( 'click', function () {
			if ( $( this ).attr( 'checked' ) ) {
				m_chart_admin.$y_min_value.attr( 'disabled', false ).focus();
			} else {
				m_chart_admin.$y_min_value.attr( 'disabled', true );
			}
		});

		// Watch for clicks on the shortcode input
		$( document.getElementById( 'm-chart-shortcode' ) ).on( 'click', function () {
			$( this ).select();
		});

		// Watch for clicks on the image input
		$( document.getElementById( 'm-chart-image' ) ).on( 'click', function () {
			$( this ).select();
		});

		// Watch for clicks on the CSV tools
		this.handle_csv_import();
		this.handle_csv_export();

		// Do instant preview unless it's been turned off
		if ( 'no-preview' !== this.performance ) {
			this.watch_for_chart_changes();
		}
	};

	// Get data from the spreadsheets
	m_chart_admin.get_data = function() {
		var $data = {};

		this.$spreadsheets.each( function( i ) {
			data[ i ] = $( this ).getData();
		});

		return $data;
	}

	// Instantiate the spreedsheets
	m_chart_admin.build_spreadsheets = function() {
		this.$spreadsheet_divs  = $( document.getElementById( 'hands-on-table-sheets' ) );
		this.$spreadsheet_tabs  = $( document.getElementById( 'hands-on-table-sheet-tabs' ) );
		this.sheet_div_template = Handlebars.compile( $( document.getElementById( 'm-chart-sheet-div' ) ).html() );
		this.sheet_tab_template = Handlebars.compile( $( document.getElementById( 'm-chart-sheet-tab' ) ).html() );

		this.$spreadsheets = {};

		// hands_on_table_data is an array of data sets so we cycle through them and build a spreadsheet object for each one
		$.each( hands_on_table_data, function( i, data ) {
			m_chart_admin.create_spreadsheet( i, data );
		});
	}

	// Instantiate a spreedsheet
	m_chart_admin.create_spreadsheet = function( i, data ) {
		this.$spreadsheet_divs.append( this.sheet_div_template( { post_id: this.post_id, instance: ( i + 1 ) } ) );
		// Note we're purposely not getting a jQuery version of this object because handsontable likes it that way
		var $spreadsheet_div = document.getElementById( 'hands-on-table-sheet-' + this.post_id + '-' + ( i + 1 ) );

		// New charts won't actually have data so we'll pass something handsontable understands
		if ( '' == data ) {
			data = [[]];
		}

		this.$spreadsheets[i] = new Handsontable( $spreadsheet_div, {
			data:         data,
			colHeaders:   true,
			rowHeaders:   true,
			height:       350,
			minRows:      17,
			minCols:      37,
			minSpareRows: 1,
			minSpareCols: 1,
			contextMenu:  true,
			stretchH:     'all',
			afterChange:  function() {
				// If a value changes update the chart
				//m_chart_admin.refresh_chart();
			}
		});

		// Built tab for sheet this sheet (it's only visible if the user selects an appropriate chart type but we build it now anyway)
		var $template_vars = {
			post_id: m_chart_admin.post_id,
			instance: ( i + 1 )
		};

		if ( i > 0 ) {
			$( $spreadsheet_div ).addClass( 'hide' );
			$template_vars.class = 'nav-tab';
		} else {
			this.active_set = i + 1;
			$template_vars.class = 'nav-tab nav-tab-active';
		}

		if ( 'undefined' !== typeof this.set_names[ ( i + 1 ) ] ) {
			$template_vars.value = this.set_names[ ( i + 1 ) ];
		} else {
			$template_vars.value = 'Sheet ' + ( i + 1 );
		}

		this.$spreadsheet_tabs.append( this.sheet_tab_template( $template_vars ) );

		// Set the tab input width
		var $tab_input = $( '#hands-on-table-sheet-tab-' + this.post_id + '-' + ( i + 1 ) + ' input' );
		m_chart_admin.resize_input( $tab_input );

		this.last_set = i + 1;
	}

	// Handle chart type input changes so the settings UI only reflects appropriate options
	m_chart_admin.handle_chart_type = function( event ) {
		var chart_type        = $( this ).attr( 'value' );
		var $chart_meta_box   = $( document.getElementById( 'm-chart' ) );
		var $spreadsheet_tabs = $( document.getElementById( 'hands-on-table-sheet-tabs' ) );

		// Show everything before hiding the options we don't want
		$chart_meta_box.find( '.row' ).removeClass( 'hide' );

		if (
			   'area' === chart_type
			|| 'column' === chart_type
			|| 'bar' === chart_type
		) {
			$chart_meta_box.find( '.row.y-min' ).addClass( 'hide' );
			$spreadsheet_tabs.addClass( 'hide' );
		}

		if ( 'pie' === chart_type ) {
			$chart_meta_box.find( '.row.vertical-axis, .row.horizontal-axis, .row.y-min' ).addClass( 'hide' );
			$spreadsheet_tabs.addClass( 'hide' );
		}

		if (
			   'scatter' === chart_type
			|| 'bubble' === chart_type
		) {
			$spreadsheet_tabs.removeClass( 'hide' );
		}
	};

	// Handle CSV import functionality
	m_chart_admin.handle_sheet_controls = function() {
		// Add a spreedsheet
		this.$spreadsheet_tabs.find( '.add-sheet' ).on( 'click', function( event ) {
			event.preventDefault();
			m_chart_admin.create_spreadsheet( m_chart_admin.last_set, '' );
			$( document.getElementById( 'hands-on-table-sheet-tab-' + m_chart_admin.post_id + '-' + m_chart_admin.last_set ) ).click();
		});

		// Handle regular clicks on the tabs
		this.$spreadsheet_tabs.on( 'click', '.nav-tab', function( event ) {
			event.preventDefault();

			if ( $( this ).hasClass( 'nav-tab-active' ) ) {
				return;
			}

			m_chart_admin.$spreadsheet_divs.find( '.hands-on-table-sheet' ).addClass( 'hide' );
			$( document.getElementById( 'hands-on-table-sheet-' + m_chart_admin.post_id + '-' + $(this).data( 'instance' ) ) ).removeClass( 'hide' );

			m_chart_admin.$spreadsheet_tabs.find( '.nav-tab' ).removeClass( 'nav-tab-active' );
			$( this ).addClass( 'nav-tab-active' );
			m_chart_admin.active_set = $(this).data( 'instance' );
		});

		// Handle double clicks and long presses on the tabs
		this.$spreadsheet_tabs.on( 'dblclick taphold', '.nav-tab', function( event ) {
			event.preventDefault();

			var $input = $( this ).find( 'input' );
			$input.attr( 'disabled', false ).focus();
		});

		// Set input back to disabled on blur
		this.$spreadsheet_tabs.on( 'blur', 'input', function( event ) {
			$( this ).attr( 'disabled', true );
		});

		// Set input back to disabled on return/enter
		this.$spreadsheet_tabs.on( 'keydown', 'input', function( event ) {
			if ( 13 === event.keyCode ) {
				event.preventDefault();
				$( this ).attr( 'disabled', true );
			}
		});

		// Resize the input based on it's value
		this.$spreadsheet_tabs.on( 'keydown keyup input propertychange change', 'input', function( event ) {
			m_chart_admin.resize_input( $( this ) );
		});

		// Remove a tab/spreadsheet
		this.$spreadsheet_tabs.on( 'click', '.dashicons-dismiss', function( event ) {
			event.preventDefault();

			if ( ! confirm( m_chart_admin.delete_comfirm ) ) {
				return;
			}

			var instance = $( this ).closest( '.nav-tab' ).data( 'instance' );

			delete m_chart_admin.$spreadsheets[ ( instance - 1 ) ];
			$( this ).closest( '.nav-tab' ).remove();
			$( document.getElementById( 'hands-on-table-sheet-' + m_chart_admin.post_id + '-' + instance ) ).remove();
			m_chart_admin.$spreadsheet_tabs.find( '.nav-tab' ).first().click();
			// @TODO will need to update the chart after this
		});
	};

	// Resize an input based on it's value
	m_chart_admin.resize_input = function( $input ) {
		// Get what we need to calculate the value width
		var font = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).font;
		var text = $input.val();

		// Get what we need to properly size the input with the value width
		var border_width  = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'border-width' ).replace( 'px', '' );
		var padding_left  = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'padding-left' ).replace( 'px', '' );
		var padding_right = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'padding-right' ).replace( 'px', '' );

		// Calculate width of the input value
		var input_canvas  = document.createElement( 'canvas' );
	    var input_context = input_canvas.getContext( '2d' );

		input_context.font = font;

		var metrics = input_context.measureText( text );
		var width   = Math.ceil( metrics.width );

		$input.css( 'width', ( border_width * 2 ) + parseInt( padding_left ) + width + parseInt( padding_right ) + 'px' );
	};

	// Handle CSV import functionality
	m_chart_admin.handle_csv_import = function() {
		var $csv_container = $( document.getElementById( 'm-chart-csv' ) );
		var $select        = $csv_container.find( '.import .select.button' );
		var $import        = $csv_container.find( '.import .import.button' );
		var $import_form   = $( document.getElementById( 'm-chart-csv-import-form' ) );
		var $file_input    = $import_form.find( 'input[type=file]' );
		var $file_info     = $csv_container.find( '.file-info' );
		var $file_error    = $csv_container.find( '.file.error' );
		var $file_import   = $csv_container.find( '.import.in-progress' );
		var $import_error  = $csv_container.find( '.import.error' );
		var $cancel        = $csv_container.find( '.dashicons-dismiss' );

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
					$import_error.text( response.data );
					$import_error.removeClass( 'hide' );

					$file_input.attr( 'value', '' );
					$select.removeClass( 'hide' );
					$file_import.addClass( 'hide' );

					return false;
				}

				// Update the spreadsheet with the new data
				m_chart_admin.$spreadsheets[ m_chart_admin.active_set - 1 ].loadData( response.data );

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
			var $data = m_chart_admin.$spreadsheets[ m_chart_admin.active_set - 1 ].getData();

			var set_name = m_chart_admin.$spreadsheet_tabs.find( '.nav-tab-active input' ).val();

			$( document.getElementById( 'm-chart-csv-post-id' ) ).val( m_chart_admin.post_id );
			$( document.getElementById( 'm-chart-csv-data' ) ).val( JSON.stringify( $data ) );
			$( document.getElementById( 'm-chart-csv-title' ) ).val( m_chart_admin.$title_input.attr( 'value' ) );
			$( document.getElementById( 'm-chart-csv-set-name' ) ).val( set_name );

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

		// Create a Canvas object out of the SVG
		var $canvas = $( '#m-chart-canvas-render-' + event.post_id );
		m_chart_admin.canvas = $canvas.get( 0 );

		canvg( m_chart_admin.canvas, svg, { scaleWidth: ( width * 2 ), scaleHeight: ( height * 2 ) } );

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

		this.$subtitle_input.on( 'change', function() {
			m_chart_admin.refresh_chart();
		});
	};

	// Refresh chart
	m_chart_admin.refresh_chart = function() {
		if ( 'no-preview' === m_chart_admin.performance ) {
			return false;
		}

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

		$post_meta[ 'subtitle' ] = this.$subtitle_input.attr( 'value' );

		$post_meta.data = JSON.stringify( m_chart_admin.get_data() );

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
			window[ 'm_chart_highcharts_' + m_chart_admin.post_id + '_1' ].chart_args = response.data;
			window[ 'm_chart_highcharts_' + m_chart_admin.post_id + '_1' ].render_chart();

			if ( 'no-images' === m_chart_admin.performance ) {
				m_chart_admin.form_submission( true );
			}
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