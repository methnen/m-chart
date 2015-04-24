<?php

class Test_M_Chart_Test_Helpers {
	public function array_diff_assoc_recursive( $array1, $array2 )
	{
		foreach( $array1 as $key => $value ) {
			if( is_array( $value ) ) {
				if( ! isset( $array2[ $key ] ) ) {
					$difference[ $key ] = $value;
				} elseif( ! is_array( $array2[ $key ] ) ) {
					$difference[ $key ] = $value;
				} else {
					$new_diff = $this->array_diff_assoc_recursive( $value, $array2[ $key ] );

					if( false != $new_diff ) {
						$difference[ $key ] = $new_diff;
					}
				}
			} elseif( ! isset( $array2[ $key ] ) || $array2[ $key ] != $value ) {
				$difference[ $key ] = $value;
			}
		}

		return ! isset( $difference ) ? 0 : $difference;
	}
}

function m_chart_test_helpers() {
	return new Test_M_Chart_Test_Helpers;
}