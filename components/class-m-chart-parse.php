<?php

class M_Chart_Parse {
	public $data;
	public $data_prefix;
	public $data_suffix;
	public $value_labels;
	public $value_labels_position;
	public $set_data;
	public $parse_in;
	public $prefix_patterns = array(
		'/^\$/',
		'/^£/',
		'/^₤/',
	);
	public $suffix_patterns = array(
		'/%$/',
		'/°$/',
		'/°C$/',
		'/°F$/',
		'/K$/',
		'/M$/',
		'/B$/',
		'/T$/',
	);

	/**
	 * Constructor
	 */
	public function __construct() {

	}

	/**
	 * Parses a chart's data array for labels, data sets, and prefixes
	 *
	 * @return array an array of value labels filtered out of the data set
	 */
	public function parse_data( $data, $parse_in ) {
		$this->data                  = $data;
		$this->parse_in              = $parse_in;
		$this->value_labels_position = $this->get_value_labels_position();
		$this->parse_value_labels();
		$this->parse_set_data();
		return $this;
	}

	/**
	 * Helper function builds an array of the value labels for a data set
	 *
	 * @return array an array of value labels filtered out of the data set
	 */
	public function parse_value_labels() {
		$this->value_labels = array();

		if ( 'none' == $this->value_labels_position ) {
			return $this->value_labels;
		}

		if ( 'first_column' == $this->value_labels_position ) {
			foreach ( (array) $this->data as $columns ) {
				if ( '' != trim( (string) $columns[0] ) ) {
					$this->value_labels[] = $this->clean_labels( $columns[0] );
				}
			}
		} elseif ( 'first_row' == $this->value_labels_position ) {
			foreach ( (array) $this->data[0] as $column ) {
				if ( '' != trim( (string) $column ) ) {
					$this->value_labels[] = $this->clean_labels( $column );
				}
			}
		} elseif ( 'both' == $this->value_labels_position ) {
			foreach ( (array) $this->data as $columns ) {
				if ( '' != trim( (string) $columns[0] ) ) {
					$this->value_labels['first_column'][] = $this->clean_labels( $columns[0] );
				}
			}

			foreach ( (array) $this->data[0] as $column ) {
				if ( '' != trim( (string) $column ) ) {
					$this->value_labels['first_row'][] = $this->clean_labels( $column );
				}
			}
		}

		$this->value_labels = apply_filters( 'm_chart_value_labels', $this->value_labels, $this->value_labels_position, $this->data );
	}

	/**
	 * Helper function returns a string describing where the value labels are (first_row, first_column, both)
	 *
	 * @return string the position of the labels in the given data set
	 */
	public function get_value_labels_position() {
		if ( ! isset( $this->data[0][0] ) && ! isset( $this->data[1][0] ) ) {
			return 'none';
		}

		if ( '' == $this->data[0][0] ) {
			return 'both';
		} elseif (
			   ! is_numeric( $this->clean_data_point( $this->data[0][0], false ) )
			&& ! is_numeric( $this->clean_data_point( $this->data[1][0], false ) )
		) {
			return 'first_column';
		}

		return 'first_row';
	}

	/**
	 * Helper function cleans data point values and by default records suffix/prefixes to a class var
	 *
	 * @param string $data_point a data point that may need to be cleaned or typed as an int
	 *
	 * @return int/string an integer of the cleaned data point or string if the cleaned value was not numeric
	 */
	public function clean_data_point( $data_point ) {
		$data_point = trim( (string) $data_point );

		// Find any prefixes/suffixes in the data
		if ( '' == $this->data_prefix && '' == $this->data_suffix ) {
			$this->parse_suffix_prefix( $data_point );
		}

		// Remove prefixes and suffixes
		$data_point = preg_replace( $this->prefix_patterns, '', $data_point );
		$data_point = preg_replace( $this->suffix_patterns, '', $data_point );

		// Remove commas
		$data_point = str_replace( ',', '', $data_point );

		// Return value without typing it as an integer if it's not numeric
		if ( ! is_numeric( $data_point ) ) {
			return trim( $data_point );
		}

		// By typing it as an integer we prevent json_encode from later treating it as a string
		return floatval( trim( $data_point ) );
	}

	/**
	 * Checks for any suffix/prefix vales in a data_point
	 */
	public function parse_suffix_prefix( $data_point ) {
		$prefix_patterns = apply_filters( 'm_chart_prefix_patterns', $this->prefix_patterns );
		$suffix_patterns = apply_filters( 'm_chart_suffix_patterns', $this->suffix_patterns );

		if ( ! $this->data_prefix ) {
			foreach ( $prefix_patterns as $pattern ) {
				if ( preg_match( $pattern, $data_point, $match ) ) {
					$this->data_prefix = $match[0];
				}
			}
		}

		if ( ! $this->data_suffix ) {
			foreach ( $suffix_patterns as $pattern ) {
				if ( preg_match( $pattern, $data_point, $match ) ) {
					$this->data_suffix = $match[0];
				}
			}
		}
	}

	/**
	 * Helper function cleans out label values
	 *
	 * @param string $label a label string
	 *
	 * @return string the label string cleaned of any problem content
	 */
	public function clean_labels( $label ) {
		$label = trim( html_entity_decode( $label, ENT_QUOTES ) );

		return preg_replace( '#<([a-z]+)([^>]+)*(?:>(.*)<\/\1>|\s+\/>)#', '$3', $label );
	}

	/**
	 * Builds a cleaned and parsed array of data from the post's data
	 */
	public function parse_set_data() {
		// Reset these values in case a previous data set has altered them
		$this->data_prefix = '';
		$this->data_suffix = '';

		$set_data_array = array();

		if ( 'rows' == $this->parse_in && 'first_column' == $this->value_labels_position ) {
			foreach ( $this->data as $row ) {
				foreach ( $row as $key => $column ) {
					if ( '' == $column || 0 == $key ) {
						continue;
					}

					$data_point = $this->clean_data_point( $column );

					$set_data_array[] = $data_point;
				}
			}
		} elseif ( 'rows' == $this->parse_in && 'both' == $this->value_labels_position ) {
			$limit     = count( $this->data );
			$this_sets = array();

			// Collect the sets of data
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
					}
				}
			}

			// Compile the sets of data
			foreach ( $this_sets as $key => $set ) {
				if ( false == $set['is_null'] ) {
					$set_data_array[ $key ] = $set['data'];
				}
			}
		} elseif ( 'columns' == $this->parse_in && 'both' == $this->value_labels_position ) {
			$limit     = count( $this->data );
			$this_sets = array();

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
				}
			}

			foreach ( $this_sets as $key => $set ) {
				if ( false == $set['is_null'] ) {
					$set_data_array[ $key ] = $set['data'];
				}
			}
		} elseif ( isset( $this->data[1] ) ) {
			foreach ( $this->data as $key => $columns ) {
				foreach ( $columns as $column ) {
					if ( '' == $column || 0 == $key ) {
						continue;
					}

					$data_point = $this->clean_data_point( $column );

					$set_data_array[] = $data_point;
				}
			}
		}

		$set_data_array = $this->normalize_data_array( $set_data_array );

		$this->set_data = apply_filters( 'm_chart_set_data', $set_data_array, $this->data, $this->parse_in );
	}

	/**
	 * Helper function normalizes the data array so that the number of data values matches the number of value labels
	 *
	 * @param array $data_array an already parsed array of data
	 *
	 * @return array a normalized array of parsed data
	 */
	public function normalize_data_array( $data_array ) {
		if ( 'rows' == $this->parse_in && 'both' == $this->value_labels_position ) {
			$label_count = is_array( $this->value_labels['first_row'] ) ? count( $this->value_labels['first_row'] ) - 1 : 0;

			foreach ( $data_array as $key => $data ) {
				foreach ( $data as $t_key => $value ) {
					if ( $t_key > $label_count ) {
						unset( $data_array[ $key ][ $t_key ] );
					}
				}
			}
		} elseif ( 'columns' == $this->parse_in && 'both' == $this->value_labels_position ) {
			$label_count = is_array( $this->value_labels['first_column'] ) ? count( $this->value_labels['first_column'] ) - 1 : 0;

			foreach ( $data_array as $key => $data ) {
				foreach ( $data as $t_key => $value ) {
					if ( $t_key > $label_count ) {
						unset( $data_array[ $key ][ $t_key ] );
					}
				}
			}
		}
		//else {
		//	$label_count = count( $this->value_labels ) - 1;
		//
		//	foreach ( $data_array as $key => $data ) {
		//		if ( $key > $label_count ) {
		//			unset( $data_array[ $key ] );
		//		}
		//	}
		//}

		return $data_array;
	}
}
