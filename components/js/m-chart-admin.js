(function( $ ) {
	'use strict';

	// Start things up
	m_chart_admin.init = function() {
		this.post_id = $( document.getElementById( 'post_ID' ) ).attr( 'value' );
		this.nonce   = $( 'input[name="m-chart[nonce]"]' ).attr( 'value' );

		// Store the setting inputs and title input for use later
		this.$setting_inputs = $( document.getElementById( 'm-chart' ) ).find( '.settings input, .settings select' );
		this.$title_input    = $( document.getElementById( 'titlewrap' ) ).find( 'input' );
		this.$subtitle_input = $( document.getElementById( 'titlediv' ) ).find( '#m-chart-subtitle' );
		this.$y_min_value    = $( document.getElementById( 'm-chart-y-min-value' ) );

		// Store these for later
		this.$form_buttons = $( '#save-post, #wp-preview, #post-preview, #publish' );

		// Build the spreadsheets
		this.build_spreadsheets();

		// Handle the spreadsheet controls
		this.handle_sheet_controls();

		// Set the form encoding type to multipart/form-data so that the CSV import will work
		const $form = $( 'form#post' );
		$form.attr( 'enctype', 'multipart/form-data' );

		// Watch form submissions and stop them if necessary or update data value
		$form.on( 'submit', function( event ) {
			if ( false === m_chart_admin.allow_form_submission ) {
				event.preventDefault();
			} else {
				$( document.getElementById( 'm-chart-spreadsheet' ) ).find( '.data' ).val(
					JSON.stringify( m_chart_admin.get_data() )
				);

				$( '.spreadsheet-tab-input' ).attr( 'disabled', false );
			}
		});

		// Watch for clicks on the y min toggle
		$( document.getElementById( 'm-chart-y-min' ) ).on( 'click', function () {
			if ( $( this ).is( ':checked' ) ) {
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
		const data = [];

		let spreadsheet = 0;

		$.each( this.$spreadsheets, function( i ) {
			data[ spreadsheet ] = m_chart_admin.$spreadsheets[ i ].getData();
			spreadsheet++;
		});

		return data;
	};

	// Instantiate the spreadsheets
	m_chart_admin.build_spreadsheets = function() {
		this.$spreadsheet_divs   = $( document.getElementById( 'spreadsheets' ) );
		this.$spreadsheet_tabs  = $( document.getElementById( 'spreadsheet-tabs' ) );
		this.sheet_div_template = Handlebars.compile( $( document.getElementById( 'm-chart-sheet-div' ) ).html() );
		this.sheet_tab_template = Handlebars.compile( $( document.getElementById( 'm-chart-sheet-tab' ) ).html() );

		this.$spreadsheets = {};

		// spreadsheet_data is an array of data sets so we cycle through them and build a spreadsheet object for each one
		$.each( spreadsheet_data, function( i, data ) {
			const instance = Number( i ) + 1;

			m_chart_admin.create_spreadsheet( instance, data );
		});
	};

	// Instantiate a spreadsheet
	m_chart_admin.create_spreadsheet = function( i, data ) {
		this.$spreadsheet_divs.append( this.sheet_div_template( { post_id: this.post_id, instance: i } ) );
		// Note we're purposely not getting a jQuery version of this object because Jspreadsheet likes it that way
		const spreadsheet_div = document.getElementById( `spreadsheet-${this.post_id}-${i}` );

		// New charts won't actually have data so we'll pass something Jspreadsheet understands
		if ( '' === data ) {
			data = [[]];
		}

		const context_menu_items = [
			'Insert a new row before',
			'Insert a new row after',
			'Delete selected rows',
			'Insert a new column before',
			'Insert a new column after',
			'Delete selected columns',
		];

		const spreadsheet = jspreadsheet( spreadsheet_div, {
			worksheets: [{
				data: data,
				allowComments: false,
				minDimensions: [37, 17]
			}],
			contextMenu: function(obj, x, y, e, items, section) {
				// Iterate through contextual menu items and only include the ones we want
				const filtered_items = items.filter(item => {
					if ( context_menu_items.includes( item.title ) ) {
						return true;
					}
				});

				return filtered_items;
			},
			onload: function(spreadsheet) {
				// Run an auto width function to make the column widths match content
				const worksheet = spreadsheet.worksheets[spreadsheet.getWorksheetActive()];
				m_chart_admin.spreadsheet_auto_width(worksheet);
			},
			onafterchanges: function(worksheet, records) {
				// Run an auto width function to make the column widths match content
				m_chart_admin.spreadsheet_auto_width(worksheet, records);

				// Update chart on spreadsheet changes
				m_chart_admin.refresh_chart();
			}
		});

		this.$spreadsheets[i] = spreadsheet[0];

		// Build a tab for this sheet (it's only visible if the user selects an appropriate chart type but we build it now anyway)
		const template_vars = {
			post_id: m_chart_admin.post_id,
			instance: i
		};

		if ( i > 0 ) {
			$( spreadsheet_div ).addClass( 'hide' );
			template_vars.class = 'nav-tab';
		} else {
			this.active_set = i;
			template_vars.class = 'nav-tab nav-tab-active';
		}

		if ( 'undefined' !== typeof this.set_names[ i - 1 ] ) {
			template_vars.value = this.set_names[ i - 1 ];
		} else {
			template_vars.value = `Sheet ${i}`;
		}

		this.$spreadsheet_tabs.append( this.sheet_tab_template( template_vars ) );

		// Set the tab input width
		const $tab_input = $( `#spreadsheet-tab-${this.post_id}-${i} input` );
		m_chart_admin.resize_input( $tab_input );

		this.last_set = i;
	};

	m_chart_admin.spreadsheet_auto_width = function(worksheet, records = false) {
		// If no records were passed we'll assume we're dealing with a full refresh
		if ( ! records ) {
			// This won't look exactly like the records array that onafterchanges passes
			// However, all we care about is the x values of the columns we need to look at
			records = worksheet.records[0];
		}

		// Get the unique column indexes that have changed.
		const columns = [...new Set(records.map(record => record.x))];

		// Create a canvas for text measurement
		const canvas  = document.createElement('canvas');
		const context = canvas.getContext('2d');

		// Auto-resize the width of the columns that need it
		columns.forEach(column => {
			let max_width = 0;
			const min_width = 100; // This matches the default width for a column
			const padding   = 13; // Some additional padding to keep things attractive

			// Check each cell in the column for the widest content
			for ( let i = 0; i < worksheet.records.length; i++ ) {
				if ( worksheet.records[i] && worksheet.records[i][column] && worksheet.records[i][column].element ) {
					const cell    = worksheet.records[i][column].element;
					context.font  = window.getComputedStyle( cell ).font;
					const metrics = context.measureText( cell.innerText );

					if ( metrics.width > max_width ) {
						max_width = metrics.width;
					}
				}
			}

			// Make sure max_width is larger than min_width
			max_width = min_width > max_width ? min_width - padding : max_width;

			// Set the new width
			worksheet.setWidth(column, max_width + padding);
		});
	};

	// Handle spreadsheet functionality
	m_chart_admin.handle_sheet_controls = function() {
		// Add a spreadsheet
		this.$spreadsheet_tabs.find( '.add-sheet' ).on( 'click', function( event ) {
			event.preventDefault();
			m_chart_admin.create_spreadsheet( m_chart_admin.last_set + 1, '' );
			const new_tab = document.getElementById( `spreadsheet-tab-${m_chart_admin.post_id}-${m_chart_admin.last_set}` );

			// Check tab count
			m_chart_admin.check_tab_count();

			$( new_tab ).click().find( 'input' ).trigger( 'dblclick' );
			m_chart_admin.refresh_chart();
		});

		// Handle regular clicks on the tabs
		this.$spreadsheet_tabs.on( 'click', '.nav-tab', function( event ) {
			event.preventDefault();

			if ( $( this ).hasClass( 'nav-tab-active' ) ) {
				return;
			}

			m_chart_admin.$spreadsheet_divs.find( '.spreadsheet' ).addClass( 'hide' );
			$( document.getElementById( `spreadsheet-${m_chart_admin.post_id}-${$( this ).data( 'instance' )}` ) ).removeClass( 'hide' );

			m_chart_admin.$spreadsheet_tabs.find( '.nav-tab' ).removeClass( 'nav-tab-active' );
			$( this ).addClass( 'nav-tab-active' );
			m_chart_admin.active_set = $( this ).data( 'instance' );
		});

		// Handle double clicks and long presses on the tabs
		this.$spreadsheet_tabs.on( 'dblclick taphold', '.nav-tab', function( event ) {
			event.preventDefault();

			$( this ).find( '.tab-title' ).addClass( 'hide' );
			$( this ).find( 'input' ).removeClass( 'hide' ).focus();
		});

		// Set input back to disabled on blur
		this.$spreadsheet_tabs.on( 'blur', 'input', function( event ) {
			m_chart_admin.handle_tab_blur( this );
			m_chart_admin.refresh_chart();
		});

		// Set input back to disabled on return/enter
		this.$spreadsheet_tabs.on( 'keydown', 'input', function( event ) {
			if ( 'Enter' === event.key ) {
				event.preventDefault();

				m_chart_admin.handle_tab_blur( this );
				m_chart_admin.refresh_chart();
			}
		});

		// Resize the input based on its value
		this.$spreadsheet_tabs.on( 'keydown keyup input propertychange change', 'input', function( event ) {
			m_chart_admin.resize_input( $( this ) );
		});

		// Remove a tab/spreadsheet
		this.$spreadsheet_tabs.on( 'click', '.dashicons-dismiss', function( event ) {
			if ( ! confirm( m_chart_admin.delete_confirm ) ) {
				return;
			}

			const $tab = $( this ).closest( '.nav-tab' );

			// Select the tab we're working with if necessary
			if ( ! $tab.hasClass( 'nav-tab-active' ) ) {
				$tab.click();
			}

			const instance = $( this ).closest( '.nav-tab' ).data( 'instance' );

			// Delete the spreadsheet
			delete m_chart_admin.$spreadsheets[ instance ];

			// Remove the tab
			$tab.remove();

			// Remove the spreadsheet div
			$( document.getElementById( `spreadsheet-${m_chart_admin.post_id}-${instance}` ) ).remove();

			// Check tab count
			m_chart_admin.check_tab_count();

			// Select the first tab and refresh the chart to reflect the changes
			m_chart_admin.$spreadsheet_tabs.find( '.nav-tab' ).first().click();
			m_chart_admin.refresh_chart();
		});

		// On the initial load of the interface we should select the initial tab
		this.$spreadsheet_tabs.find( '.nav-tab' ).first().click();
	};

	// Handle tab blur
	m_chart_admin.handle_tab_blur = function( tab ) {
		$( tab ).addClass( 'hide' );

		const $tab_title = $( tab ).closest( '.nav-tab' ).find( '.tab-title' );
		$tab_title.text( $( tab ).val() );
		$tab_title.removeClass( 'hide' );
	};

	// Set last tab as do-not-delete if tab count is 1
	m_chart_admin.check_tab_count = function() {
		if ( 1 === this.$spreadsheet_tabs.find( '.nav-tab' ).length ) {
			this.$spreadsheet_tabs.find( '.nav-tab' ).addClass( 'do-not-delete' );
		} else {
			this.$spreadsheet_tabs.find( '.nav-tab' ).removeClass( 'do-not-delete' );
		}
	};

	// Resize an input based on its value
	m_chart_admin.resize_input = function( $input ) {
		// Get what we need to calculate the value width
		const font = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).font;
		const text = $input.val();

		// Get what we need to properly size the input with the value width
		const border_width  = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'border-width' ).replace( 'px', '' );
		const padding_left  = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'padding-left' ).replace( 'px', '' );
		const padding_right = window.getComputedStyle( document.getElementById( $input.attr( 'id' ) ) ).getPropertyValue( 'padding-right' ).replace( 'px', '' );

		// Calculate width of the input value
		const input_canvas  = document.createElement( 'canvas' );
		const input_context = input_canvas.getContext( '2d' );

		input_context.font = font;

		const metrics = input_context.measureText( text );
		const width   = Math.ceil( metrics.width ) + 1;

		$input.css( 'width', `${( border_width * 2 ) + parseInt( padding_left, 10 ) + width + parseInt( padding_right, 10 )}px` );
	};

	// Handle CSV import functionality
	m_chart_admin.handle_csv_import = function() {
		const $csv_container = $( document.getElementById( 'm-chart-csv' ) );
		const $select        = $csv_container.find( '.import .select.button' );
		const $confirmation  = $csv_container.find( '.import .confirmation' );
		const $import_form   = $( document.getElementById( 'm-chart-csv-import-form' ) );
		const $file_input    = $import_form.find( 'input[type=file]' );
		const $file_info     = $csv_container.find( '.file-info' );
		const $file_error    = $csv_container.find( '.file.error' );
		const $file_import   = $csv_container.find( '.import.in-progress' );
		const $import_error  = $csv_container.find( '.import.error' );
		const $cancel        = $csv_container.find( '.dashicons-dismiss' );

		// Watch for clicks on the select button
		$select.on( 'click', function( event ) {
			event.preventDefault();
			$file_error.addClass( 'hide' );
			$import_error.addClass( 'hide' );
			$file_input.trigger( 'click' );
		});

		// Watch for changes to the file input
		$file_input.on( 'change', function( event ) {
			const file_name = $( this ).val().replace( /C:\\fakepath\\/i, '' );

			if ( -1 === file_name.search( /.+(\.csv)$/ ) ) {
				$file_error.removeClass( 'hide' );
				return;
			}

			$file_info.find( '.file-name' ).text( file_name );

			$select.addClass( 'hide' );
			$confirmation.removeClass( 'hide' );
			$file_info.removeClass( 'hide' );
		});

		// Watch for clicks on the cancel button
		$cancel.on( 'click', function( event ) {
			event.preventDefault();
			$file_info.addClass( 'hide' );
			$file_input.val( '' );
			$select.removeClass( 'hide' );
			$confirmation.addClass( 'hide' );
		});

		// Watch for clicks on import button
		$confirmation.find( '.button' ).on( 'click', function( event ) {
			event.preventDefault();

			$file_info.addClass( 'hide' );
			$confirmation.addClass( 'hide' );
			$import_error.addClass( 'hide' );
			$file_import.removeClass( 'hide' );

			$import_form.trigger( 'submit' );
		});

		// Watch for CSV import form submission
		$import_form.on( 'submit', function( event ) {
			event.preventDefault();

			const form_data = new FormData( this );

			form_data.append( 'post_id', m_chart_admin.post_id );
			form_data.append( 'csv_delimiter', $confirmation.find( 'select' ).val() );
			form_data.append( 'nonce', m_chart_admin.nonce );

			const request = $.ajax({
				url: 'admin-ajax.php?action=m_chart_import_csv',
				type: 'POST',
				data: form_data,
				cache: false,
				dataType: 'json',
				// Don't process the files
				processData: false,
				// Set content type to false as jQuery will tell the server its a query string request
				contentType: false
			});

			request.done( ( response ) => {
				if ( false === response.success ) {
					$import_error.text( response.data );
					$import_error.removeClass( 'hide' );

					$file_input.val( '' );
					$select.removeClass( 'hide' );
					$file_import.addClass( 'hide' );

					return false;
				}

				// Update the spreadsheet with the new data
				m_chart_admin.$spreadsheets[ m_chart_admin.active_set ].loadData( response.data );

				$file_input.val( '' );
				$select.removeClass( 'hide' );
				$file_import.addClass( 'hide' );
			});
		});
	};

	// Handle CSV export functionality
	m_chart_admin.handle_csv_export = function() {
		$( document.getElementById( 'm-chart-csv' ) ).find( '.export a' ).on( 'click', function( event ) {
			event.preventDefault();

			const $form    = $( document.getElementById( 'm-chart-csv-export-form' ) );
			const data     = m_chart_admin.$spreadsheets[ m_chart_admin.active_set ].getData();
			const set_name = m_chart_admin.$spreadsheet_tabs.find( '.nav-tab-active input' ).val();

			$( document.getElementById( 'm-chart-csv-post-id' ) ).val( m_chart_admin.post_id );
			$( document.getElementById( 'm-chart-csv-data' ) ).val( JSON.stringify( data ) );
			$( document.getElementById( 'm-chart-csv-title' ) ).val( m_chart_admin.$title_input.val() );
			$( document.getElementById( 'm-chart-csv-set-name' ) ).val( set_name );

			$form.trigger( 'submit' );
		});
	};

	// Watch for changes to the chart settings or title
	m_chart_admin.watch_for_chart_changes = function() {
		this.$setting_inputs.on( 'change', () => {
			m_chart_admin.refresh_chart();
		});

		this.$title_input.on( 'change', () => {
			m_chart_admin.refresh_chart();
		});

		this.$subtitle_input.on( 'change', () => {
			m_chart_admin.refresh_chart();
		});
	};

	// Refresh chart
	m_chart_admin.refresh_chart = function() {
		if ( 'no-preview' === this.performance || 'yes' !== this.instant_preview_support ) {
			return false;
		}

		// Stop any existing requests so we don't just pile them up
		if ( this.request ) {
			this.request.abort();
		}

		// Stop form submission while we wait for the chart to refresh and a new image to generate
		m_chart_admin.form_submission( false );

		// Build an object with all of the post_meta values
		const post_meta = {};

		$.each( this.$setting_inputs, function() {
			// Don't record unselected/unchecked radio/checkboxes
			if (
				   'radio' !== $( this ).attr( 'type' )
				&& 'checkbox' !== $( this ).attr( 'type' )
				|| true === $( this ).is( ':checked' )
			 ) {
				post_meta[ $( this ).attr( 'name' ).replace( /^m-chart\[|\]$/g , '' ) ] = $( this ).val();
			}
		});

		post_meta.subtitle = this.$subtitle_input.val();

		post_meta.data = JSON.stringify( m_chart_admin.get_data() );

		post_meta.set_names = [];

		$.each( this.$spreadsheet_tabs.find( '.nav-tab' ), function( i ) {
			post_meta.set_names[ i ] = $( this ).find( 'input' ).val();
		});

		// Request a new chart_args object so we can rerender the chart with the changes
		this.request = $.ajax({
			url: 'admin-ajax.php?action=m_chart_get_chart_args',
			type: 'POST',
			data: {
				post_id:   m_chart_admin.post_id,
				nonce:     m_chart_admin.nonce,
				library:   m_chart_admin.library,
				title:     this.$title_input.val(),
				post_meta: post_meta
			},
			cache: false,
			dataType: 'json'
		});

		this.request.done( ( response ) => {
			if ( true !== response.success ) {
				return false;
			}

			$( '.m-chart' ).trigger({
				type:     'chart_args_success',
				response: response
			});
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

	$( () => {
		m_chart_admin.init();
	} );
})( jQuery );
