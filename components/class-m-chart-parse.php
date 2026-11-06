<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class M_Chart_Parse {
	const LABELS_NONE         = 'none';
	const LABELS_FIRST_ROW    = 'first_row';
	const LABELS_FIRST_COLUMN = 'first_column';
	const LABELS_BOTH         = 'both';
	const PARSE_ROWS          = 'rows';
	const PARSE_COLUMNS       = 'columns';

	// The CSV delimiters the importer and the settings page accept
	const CSV_DELIMITERS = [ ',', "\t", ' ', ';' ];

	public array $data                   = [];
	public array $value_labels           = [];
	public string $value_labels_position = '';
	public array $set_data               = [];
	public array $raw_data               = [];
	public string $parse_in              = '';
	// Original series indexes the last parse_data() call dropped because every value was non numeric
	public array $dropped_sets           = [];

	private ?NumberFormatter $formatter = null;

	/**
	 * Parses a chart's data array for labels, data sets, and raw values
	 *
	 * @param array  $data     the raw two-dimensional data array from the chart post
	 * @param string $parse_in whether to parse by rows or columns (PARSE_ROWS or PARSE_COLUMNS)
	 *
	 * @return static $this
	 */
	public function parse_data( array $data, string $parse_in ): static {
		$this->data                  = $data;
		$this->parse_in              = $parse_in;
		$this->dropped_sets          = [];
		$this->value_labels_position = $this->get_value_labels_position();
		$this->parse_value_labels();
		$this->parse_set_data();
		
		return $this;
	}

	/**
	 * Populates $this->value_labels by reading label values from the data array based on the detected labels position
	 */
	private function parse_value_labels(): void {
		$this->value_labels = [];

		switch ( $this->value_labels_position ) {
			case self::LABELS_NONE:
				return;

			case self::LABELS_FIRST_COLUMN:
				foreach ( (array) $this->data as $columns ) {
					if ( '' != trim( (string) $columns[0] ) ) {
						$this->value_labels[] = $this->clean_labels( $columns[0] );
					}
				}
				break;

			case self::LABELS_FIRST_ROW:
				foreach ( (array) $this->data[0] as $column ) {
					if ( '' != trim( (string) $column ) ) {
						$this->value_labels[] = $this->clean_labels( $column );
					}
				}
				break;

			case self::LABELS_BOTH:
				foreach ( (array) $this->data as $columns ) {
					if ( '' != trim( (string) $columns[0] ) ) {
						$this->value_labels[ self::LABELS_FIRST_COLUMN ][] = $this->clean_labels( $columns[0] );
					}
				}

				foreach ( (array) $this->data[0] as $column ) {
					if ( '' != trim( (string) $column ) ) {
						$this->value_labels[ self::LABELS_FIRST_ROW ][] = $this->clean_labels( $column );
					}
				}
				break;
		}

		$this->value_labels = apply_filters( 'm_chart_value_labels', $this->value_labels, $this->value_labels_position, $this->data );
	}

	/**
	 * Helper function returns a string describing where the value labels are (first_row, first_column, both)
	 *
	 * @return string the position of the labels in the given data set
	 */
	private function get_value_labels_position(): string {
		return self::detect_labels_position( $this->data, $this->parse_in );
	}

	/**
	 * Work out where the value labels sit in a sheet without touching the shared parser state
	 *
	 * Pure function of the sheet and the parse direction, so plugins can ask the same question core asks
	 * Note the corner cell test is a loose '' == comparison, null counts as empty but a lone space does not
	 *
	 * @param array  $data     the raw two-dimensional data array
	 * @param string $parse_in PARSE_ROWS or PARSE_COLUMNS
	 *
	 * @return string one of the LABELS_* constants
	 */
	public static function detect_labels_position( array $data, string $parse_in ): string {
		if ( ! isset( $data[0][0] ) && ! isset( $data[1][0] ) ) {
			return self::LABELS_NONE;
		}

		if ( '' == ( $data[0][0] ?? '' ) ) {
			return self::LABELS_BOTH;
		}

		// Structural pre-check
		// A sheet with 2 effective columns (rows mode) or 2 effective rows (columns mode) is the simple single-series shape and is unambiguous
		// Works regardless of whether the labels look numeric (years, ordinals, etc)
		if ( self::PARSE_ROWS === $parse_in && 2 === self::effective_max_columns( $data ) ) {
			return self::LABELS_FIRST_COLUMN;
		}

		if ( self::PARSE_COLUMNS === $parse_in && 2 === self::effective_row_count( $data ) ) {
			return self::LABELS_FIRST_ROW;
		}

		// Existing content-based heuristic for 3+ effective columns/rows
		if ( ! is_numeric( trim( (string) $data[0][0] ) ) ) {
			// If the first row has multiple non-numeric headers and the data rows start with numeric values the entire first row is column labels (e.g. scatter format)
			if (
				   isset( $data[0][1] ) && ! is_numeric( trim( (string) $data[0][1] ) )
				&& isset( $data[1][0] ) &&   is_numeric( trim( (string) $data[1][0] ) )
			) {
				return self::LABELS_FIRST_ROW;
			}

			return self::LABELS_FIRST_COLUMN;
		}

		return self::LABELS_FIRST_ROW;
	}

	/**
	 * Original indexes of the series the last parse_data() call dropped
	 *
	 * In the LABELS_BOTH shapes a series whose every cell is non numeric is left out of set_data and raw_data
	 * The keys that remain are the original ones, this lists the gaps
	 *
	 * @return int[]
	 */
	public function get_dropped_sets(): array {
		return $this->dropped_sets;
	}

	/**
	 * Max effective column count across rows
	 * Rightmost non-empty cell index + 1, taken as a max over all rows
	 * Trailing empty cells (typical of Jspreadsheet's minDimensions padding) don't count
	 *
	 * @param array $data the raw two-dimensional data array
	 *
	 * @return int
	 */
	private static function effective_max_columns( array $data ): int {
		$max = 0;

		foreach ( $data as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			for ( $i = count( $row ) - 1; $i >= 0; $i-- ) {
				if ( '' !== trim( (string) ( $row[ $i ] ?? '' ) ) ) {
					if ( $i + 1 > $max ) {
						$max = $i + 1;
					}

					break;
				}
			}
		}

		return $max;
	}

	/**
	 * Count of rows that contain at least one non-empty cell
	 * Trailing empty rows (typical of Jspreadsheet's minDimensions padding) don't count
	 *
	 * @param array $data the raw two-dimensional data array
	 *
	 * @return int
	 */
	private static function effective_row_count( array $data ): int {
		$last = -1;

		foreach ( $data as $i => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			foreach ( $row as $cell ) {
				if ( '' !== trim( (string) ( $cell ?? '' ) ) ) {
					$last = $i;

					break;
				}
			}
		}

		return $last + 1;
	}

	/**
	 * Helper function cleans data point values
	 *
	 * @param mixed $data_point a data point that may need to be cleaned or typed as an int
	 *
	 * @return float|string a float of the cleaned data point or string if the cleaned value was not numeric
	 */
	public function clean_data_point( mixed $data_point ): float|string {
		$data_point = trim( (string) $data_point );

		if ( preg_match( '/-?\d[\d,]*(?:\.\d+)?/', $data_point, $matches ) ) {
			return floatval( str_replace( ',', '', $matches[0] ) );
		}

		return $data_point;
	}

	/**
	 * Helper function parses a data point into an M_Chart_Parsed_Data_Point value object for localized display
	 * Splits the cell string into prefix, numeric value, and suffix 
	 * This means the number can be reformatted for any locale while preserving surrounding context
	 *
	 * @param mixed $data_point a raw cell value
	 *
	 * @return M_Chart_Parsed_Data_Point
	 */
	public function parse_data_point( mixed $data_point ): M_Chart_Parsed_Data_Point {
		$data_point = trim( (string) $data_point );

		if ( preg_match( '/(-?\d[\d,]*(?:\.\d+)?)/', $data_point, $matches, PREG_OFFSET_CAPTURE ) ) {
			$number = $matches[1][0];
			$offset = $matches[1][1];

			return M_Chart_Parsed_Data_Point::numeric(
				floatval( str_replace( ',', '', $number ) ),
				substr( $data_point, 0, $offset ),
				substr( $data_point, $offset + strlen( $number ) )
			);
		}

		return M_Chart_Parsed_Data_Point::text( $data_point );
	}

	/**
	 * Helper function cleans out label values
	 *
	 * @param mixed $label a label string
	 *
	 * @return string the label string cleaned of any problem content
	 */
	public function clean_labels( mixed $label ): string {
		$label = trim( html_entity_decode( (string) $label, ENT_QUOTES ) );

		// PHP's strip_tags() is case-insensitive, recursive, handles unclosed/malformed tags, and is XSS-safe
		return strip_tags( $label );
	}

	/**
	 * Populates $this->set_data and $this->raw_data by delegating to the appropriate collector based on the parse direction and labels position, then normalizing both arrays
	 */
	private function parse_set_data(): void {
		if ( self::PARSE_ROWS == $this->parse_in && self::LABELS_FIRST_COLUMN == $this->value_labels_position ) {
			[ $set_data_array, $raw_data_array ] = $this->collect_rows_first_column();
		} elseif ( self::PARSE_ROWS == $this->parse_in && self::LABELS_BOTH == $this->value_labels_position ) {
			[ $set_data_array, $raw_data_array ] = $this->collect_rows_both();
		} elseif ( self::PARSE_COLUMNS == $this->parse_in && self::LABELS_BOTH == $this->value_labels_position ) {
			[ $set_data_array, $raw_data_array ] = $this->collect_columns_both();
		} else {
			[ $set_data_array, $raw_data_array ] = $this->collect_default();
		}

		$set_data_array = $this->normalize_data_array( $set_data_array );
		$raw_data_array = $this->normalize_data_array( $raw_data_array );

		$this->set_data = apply_filters( 'm_chart_set_data', $set_data_array, $this->data, $this->parse_in );
		$this->raw_data = apply_filters( 'm_chart_raw_data', $raw_data_array, $this->data, $this->parse_in );
	}

	/**
	 * Collects data when parsing rows with labels in the first column
	 *
	 * @return array {0: array, 1: array} Two-element array of [set_data, raw_data]
	 */
	private function collect_rows_first_column(): array {
		$set_data_array = [];
		$raw_data_array = [];

		foreach ( $this->data as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			foreach ( $row as $key => $column ) {
				if ( '' == $column || 0 == $key ) {
					continue;
				}

				$set_data_array[] = $this->clean_data_point( $column );
				$raw_data_array[] = $this->parse_data_point( $column );
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Collects data when parsing rows with labels in both the first row and first column
	 *
	 * @return array {0: array, 1: array} Two-element array of [set_data, raw_data]
	 */
	private function collect_rows_both(): array {
		$set_data_array = [];
		$raw_data_array = [];
		$limit          = count( $this->data );
		$this_sets      = [];
		$this_raw       = [];

		for ( $i = 1; $i < $limit; $i++ ) {
			if ( ! is_array( $this->data[ $i ] ) ) {
				continue;
			}

			foreach ( $this->data[ $i ] as $c_key => $column ) {
				if ( 0 != $c_key ) {
					$data_point = $this->clean_data_point( $column );
					$key        = $i - 1;

					if ( ! isset( $this_sets[ $key ]['is_null'] ) ) {
						$this_sets[ $key ]['is_null'] = true;
					}

					if ( is_numeric( $data_point ) ) {
						$this_sets[ $key ]['is_null'] = false;
					}

					$this_sets[ $key ]['data'][] = $data_point;
					$this_raw[ $key ][]          = $this->parse_data_point( $column );
				}
			}
		}

		foreach ( $this_sets as $key => $set ) {
			if ( false == $set['is_null'] ) {
				$set_data_array[ $key ] = $set['data'];
				$raw_data_array[ $key ] = $this_raw[ $key ];
			} else {
				$this->dropped_sets[] = $key;
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Collects data when parsing columns with labels in both the first row and first column
	 *
	 * @return array {0: array, 1: array} Two-element array of [set_data, raw_data]
	 */
	private function collect_columns_both(): array {
		$set_data_array = [];
		$raw_data_array = [];
		$limit          = count( $this->data );
		$this_sets      = [];
		$this_raw       = [];

		for ( $i = 1; $i < $limit; $i++ ) {
			if ( ! is_array( $this->data[ $i ] ) ) {
				continue;
			}

			foreach ( $this->data[ $i ] as $key => $column ) {
				if ( 0 == $key ) {
					continue;
				}

				$data_point = $this->clean_data_point( $column );
				$a_key      = $key - 1;

				if ( ! isset( $this_sets[ $a_key ]['is_null'] ) ) {
					$this_sets[ $a_key ]['is_null'] = true;
				}

				if ( is_numeric( $data_point ) ) {
					$this_sets[ $a_key ]['is_null'] = false;
				}

				$this_sets[ $a_key ]['data'][] = $data_point;
				$this_raw[ $a_key ][]          = $this->parse_data_point( $column );
			}
		}

		foreach ( $this_sets as $key => $set ) {
			if ( false == $set['is_null'] ) {
				$set_data_array[ $key ] = $set['data'];
				$raw_data_array[ $key ] = $this_raw[ $key ];
			} else {
				$this->dropped_sets[] = $key;
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Collects data for the default case (first-row labels only, or no labels)
	 *
	 * @return array {0: array, 1: array} Two-element array of [set_data, raw_data]
	 */
	private function collect_default(): array {
		$set_data_array = [];
		$raw_data_array = [];

		if ( ! isset( $this->data[1] ) ) {
			return [ $set_data_array, $raw_data_array ];
		}

		foreach ( $this->data as $key => $columns ) {
			if ( ! is_array( $columns ) ) {
				continue;
			}

			foreach ( $columns as $column ) {
				if ( '' == $column || 0 == $key ) {
					continue;
				}

				$set_data_array[] = $this->clean_data_point( $column );
				$raw_data_array[] = $this->parse_data_point( $column );
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Helper function normalizes the data array so that the number of data values matches the number of value labels
	 *
	 * @param array $data_array an already parsed array of data
	 *
	 * @return array a normalized array of parsed data
	 */
	private function normalize_data_array( array $data_array ): array {
		if ( self::PARSE_ROWS == $this->parse_in && self::LABELS_BOTH == $this->value_labels_position ) {
			$first_row_labels = $this->value_labels[ self::LABELS_FIRST_ROW ] ?? [];
			$label_count      = is_array( $first_row_labels ) ? count( $first_row_labels ) - 1 : 0;

			foreach ( $data_array as $key => $data ) {
				foreach ( $data as $t_key => $value ) {
					if ( $t_key > $label_count ) {
						unset( $data_array[ $key ][ $t_key ] );
					}
				}
			}
		} elseif ( self::PARSE_COLUMNS == $this->parse_in && self::LABELS_BOTH == $this->value_labels_position ) {
			$first_col_labels = $this->value_labels[ self::LABELS_FIRST_COLUMN ] ?? [];
			$label_count      = is_array( $first_col_labels ) ? count( $first_col_labels ) - 1 : 0;

			foreach ( $data_array as $key => $data ) {
				foreach ( $data as $t_key => $value ) {
					if ( $t_key > $label_count ) {
						unset( $data_array[ $key ][ $t_key ] );
					}
				}
			}
		}

		return $data_array;
	}

	/**
	 * The decimal and thousands separators for a locale
	 *
	 * Front end code formatting numbers outside Chart.js (a data table, for instance) can match what the charts show
	 *
	 * @param string|null $locale a BCP 47 locale, defaults to the plugin's locale setting
	 *
	 * @return array [ 'decimal' => string, 'thousands' => string ]
	 */
	public function get_number_symbols( ?string $locale = null ): array {
		$symbols = [ 'decimal' => '.', 'thousands' => ',' ];

		if ( ! class_exists( 'NumberFormatter' ) ) {
			return $symbols;
		}

		$formatter = null === $locale ? $this->get_formatter() : new NumberFormatter( $locale, NumberFormatter::DECIMAL );

		if ( ! $formatter ) {
			return $symbols;
		}

		$decimal   = $formatter->getSymbol( NumberFormatter::DECIMAL_SEPARATOR_SYMBOL );
		$thousands = $formatter->getSymbol( NumberFormatter::GROUPING_SEPARATOR_SYMBOL );

		return [
			'decimal'   => false === $decimal || '' === $decimal ? '.' : $decimal,
			'thousands' => false === $thousands ? ',' : $thousands,
		];
	}

	/**
	 * Load the bundled parseCSV library
	 *
	 * parsecsv.lib.php declares the global parseCSV class without a class_exists guard, so every caller has to go through here
	 */
	public static function load_parsecsv(): void {
		if ( ! class_exists( 'parseCSV' ) ) {
			require_once __DIR__ . '/external/parsecsv/parsecsv.lib.php';
		}
	}

	/**
	 * Parse CSV text into the row arrays the spreadsheet expects
	 *
	 * Mirrors what the CSV import does: the text is wrapped in newlines so parseCSV treats the first line as data rather than
	 * headings, the delimiter has to be one of CSV_DELIMITERS or the csv_delimiter setting is used, and short rows are padded
	 *
	 * @param string      $csv       the CSV text
	 * @param string|null $delimiter one of CSV_DELIMITERS, anything else falls back to the setting
	 *
	 * @return array rows of cells
	 */
	public static function parse_csv_string( string $csv, ?string $delimiter = null ): array {
		self::load_parsecsv();

		$parse_csv = new parseCSV();

		// The "\n" before and after is to deal with CSV files that don't have line breaks above and below the data
		// Which then seems to confuse parseCSV occasionally
		$csv = "\n" . trim( $csv ) . "\n";

		$parse_csv->delimiter = in_array( $delimiter, self::CSV_DELIMITERS, true ) ? $delimiter : m_chart()->get_settings( 'csv_delimiter' );
		$parse_csv->parse( $csv );

		return self::fix_csv_data( is_array( $parse_csv->data ) ? $parse_csv->data : [] );
	}

	/**
	 * Pad every row to the longest row's length
	 *
	 * Deals with CSV exports (Google Docs among them) that leave off trailing empty cells
	 *
	 * @param array $data_array rows of cells
	 *
	 * @return array rows of cells, all the same length
	 */
	public static function fix_csv_data( array $data_array ): array {
		$count = 0;

		// Get largest row count
		foreach ( $data_array as $data ) {
			$temp_count = is_array( $data ) ? count( $data ) : 0;

			$count = ( $temp_count > $count ) ? $temp_count : $count;
		}

		// Fix arrays so value counts match
		foreach ( $data_array as $key => $data ) {
			$data       = is_array( $data ) ? $data : [];
			$temp_count = count( $data );

			if ( $temp_count < $count ) {
				$data = array_pad( $data, $count, '' );
			}

			$data_array[ $key ] = $data;
		}

		return $data_array;
	}

	/**
	 * Formats an M_Chart_Parsed_Data_Point for table display
	 * Numeric cells are formatted with the locale-aware NumberFormatter
	 * Non-numeric cells are returned as plain text
	 *
	 * @param ?M_Chart_Parsed_Data_Point $raw the parsed data point to format, or null for an empty cell
	 *
	 * @return string the formatted cell value
	 */
	public function format_raw( ?M_Chart_Parsed_Data_Point $raw ): string {
		if ( null === $raw ) {
			return '';
		}

		// If the value is a number return the formatted and prefixed/suffixed version of it
		if ( $raw->is_numeric() ) {
			$formatter = $this->get_formatter();
			$number    = $formatter ? $formatter->format( $raw->value ) : (string) $raw->value;
			
			return $raw->prefix . $number . $raw->suffix;
		}

		return $raw->text;
	}

	/**
	 * Returns a locale-aware NumberFormatter, creating and caching it on first use
	 *
	 * @return ?NumberFormatter a NumberFormatter instance, or null if the intl extension is unavailable
	 */
	private function get_formatter(): ?NumberFormatter {
		if ( null === $this->formatter ) {
			$locale          = m_chart()->get_settings( 'locale' );
			$this->formatter = class_exists( 'NumberFormatter' ) ? new NumberFormatter( $locale, NumberFormatter::DECIMAL ) : null;
		}
		
		return $this->formatter;
	}
}
