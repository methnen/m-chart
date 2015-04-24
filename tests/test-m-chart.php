<?php

class Test_M_Chart extends WP_UnitTestCase {
	public $bad_post_meta = array(
		'library'    => 'highcharts',
		'type'       => 'line',
		'parse_in'   => 'rows',
		'subtitle'   => '<a href="http://yahoo.com/">Yahoo Stats</a>',
		'y_title'    => '',
		'y_units'    => 'CPMs',
		'y_min'      => 'zero',
		'x_title'    => '<a href="http://google.com/">Google DFP Revenue</a>',
		'x_units'    => '',
		'height'     => 'tall',
		'legend'     => 'no',
		'source'     => '',
		'source_url' => 'php://bad',
		'data'       => array(
			array(
				'<a href="http://google.com">Google</a>',
				'<a href="http://Yahoo.com">Yahoo</a>',
			),
			array(
				'10',
				'3',
			),
		),
	);

	public $validated_bad_post_meta = array(
		'library'    => 'highcharts',
		'type'       => 'line',
		'parse_in'   => 'rows',
		'labels'     => false,
		'subtitle'   => 'Yahoo Stats',
		'y_title'    => '',
		'y_units'    => 'CPMs',
		'y_min'      => true,
		'x_title'    => 'Google DFP Revenue',
		'x_units'    => '',
		'height'     => 300,
		'legend'     => true,
		'source'     => '',
		'source_url' => '',
		'data'       => array(
			array(
				'Google',
				'Yahoo',
			),
			array(
				'10',
				'3',
			),
		),
	);

	public function test_validate_post_meta() {
		$validated_post_meta = m_chart()->validate_post_meta( $this->bad_post_meta );

		$this->assertEquals(
			0,
			m_chart_test_helpers()->array_diff_assoc_recursive( $validated_post_meta, $this->validated_bad_post_meta )
		);
	}
}

