<?php

class M_Chart_Parse {
	const LABELS_NONE         = 'none';
	const LABELS_FIRST_ROW    = 'first_row';
	const LABELS_FIRST_COLUMN = 'first_column';
	const LABELS_BOTH         = 'both';
	const PARSE_ROWS          = 'rows';
	const PARSE_COLUMNS       = 'columns';

	public array $data                  = array();
	public array $value_labels          = array();
	public string $value_labels_position = '';
	public array $set_data              = array();
	public array $raw_data              = array();
	public string $parse_in             = '';

	/**
	 * Constructor
	 */
	public function __construct() {

	}

	/**
	 * Parses a chart's data array for labels, data sets, and raw values
	 *
	 * @return static $this
	 */
	public function parse_data( array $data, string $parse_in ): static {
		$this->data                  = $data;
		$this->parse_in              = $parse_in;
		$this->value_labels_position = $this->get_value_labels_position();
		$this->parse_value_labels();
		$this->parse_set_data();
		return $this;
	}

	/**
	 * Helper function builds an array of the value labels for a data set
	 */
	private function parse_value_labels(): void {
		$this->value_labels = array();

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
		if ( ! isset( $this->data[0][0] ) && ! isset( $this->data[1][0] ) ) {
			return self::LABELS_NONE;
		}

		if ( '' == $this->data[0][0] ) {
			return self::LABELS_BOTH;
		} elseif (
			   ! is_numeric( $this->clean_data_point( $this->data[0][0], false ) )
			&& ! is_numeric( $this->clean_data_point( $this->data[1][0], false ) )
		) {
			return self::LABELS_FIRST_COLUMN;
		}

		return self::LABELS_FIRST_ROW;
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
	 * Helper function parses a data point into an M_Chart_Parsed_Data_Point value object
	 * for localized display. Splits the cell string into prefix, numeric value, and suffix
	 * so the number can be reformatted for any locale while preserving surrounding context.
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

		return preg_replace( '#<([a-z]+)([^>]+)*(?:>(.*)<\/\1>|\s+\/>)#', '$3', $label );
	}

	/**
	 * Builds a cleaned and parsed array of data from the post's data.
	 * Also builds a parallel $raw_data array containing structured cell values
	 * (prefix, numeric value, suffix) for localized display in tooltips and tables.
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
	 * Collects data when parsing rows with labels in the first column.
	 *
	 * @return array{0: array, 1: array} Two-element array of [set_data, raw_data].
	 */
	private function collect_rows_first_column(): array {
		$set_data_array = array();
		$raw_data_array = array();

		foreach ( $this->data as $row ) {
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
	 * Collects data when parsing rows with labels in both the first row and first column.
	 *
	 * @return array{0: array, 1: array} Two-element array of [set_data, raw_data].
	 */
	private function collect_rows_both(): array {
		$set_data_array = array();
		$raw_data_array = array();
		$limit          = count( $this->data );
		$this_sets      = array();
		$this_raw       = array();

		for ( $i = 1; $i < $limit; $i++ ) {
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
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Collects data when parsing columns with labels in both the first row and first column.
	 *
	 * @return array{0: array, 1: array} Two-element array of [set_data, raw_data].
	 */
	private function collect_columns_both(): array {
		$set_data_array = array();
		$raw_data_array = array();
		$limit          = count( $this->data );
		$this_sets      = array();
		$this_raw       = array();

		for ( $i = 1; $i < $limit; $i++ ) {
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
			}
		}

		return [ $set_data_array, $raw_data_array ];
	}

	/**
	 * Collects data for the default case (first-row labels only, or no labels).
	 *
	 * @return array{0: array, 1: array} Two-element array of [set_data, raw_data].
	 */
	private function collect_default(): array {
		$set_data_array = array();
		$raw_data_array = array();

		if ( ! isset( $this->data[1] ) ) {
			return [ $set_data_array, $raw_data_array ];
		}

		foreach ( $this->data as $key => $columns ) {
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
			$label_count = is_array( $this->value_labels[ self::LABELS_FIRST_ROW ] ) ? count( $this->value_labels[ self::LABELS_FIRST_ROW ] ) - 1 : 0;

			foreach ( $data_array as $key => $data ) {
				foreach ( $data as $t_key => $value ) {
					if ( $t_key > $label_count ) {
						unset( $data_array[ $key ][ $t_key ] );
					}
				}
			}
		} elseif ( self::PARSE_COLUMNS == $this->parse_in && self::LABELS_BOTH == $this->value_labels_position ) {
			$label_count = is_array( $this->value_labels[ self::LABELS_FIRST_COLUMN ] ) ? count( $this->value_labels[ self::LABELS_FIRST_COLUMN ] ) - 1 : 0;

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
}
