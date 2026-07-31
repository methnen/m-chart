<?php
/**
 * Integration tests for build_table() orientation.
 *
 * Row-oriented single-series charts (labels in the first spreadsheet column)
 * used to render transposed on the front end — every label became a column
 * header with a single data row beneath it. These tests lock in the corrected
 * vertical layout and guard the untouched label-position modes against
 * regression.
 */

declare( strict_types=1 );

final class BuildTableTest extends WP_UnitTestCase {

	/**
	 * A rows-parsed two column spreadsheet (labels in the first column) should
	 * render one table row per spreadsheet row, matching the admin arrangement
	 */
	public function test_first_column_labels_render_vertically(): void {
		$post_id = $this->create_chart( [
			[ 'month', 'records' ],
			[ '2022-01', 16 ],
			[ '2022-02', 23 ],
			[ '2022-03', 3 ],
		], 'rows' );

		$output = m_chart()->build_table( $post_id );

		// Each label is a row header followed by its value
		$this->assertMatchesRegularExpression( '#<th scope="row">month</th>\s*<td>records</td>#', $output );
		$this->assertMatchesRegularExpression( '#<th scope="row">2022-01</th>\s*<td>16</td>#', $output );
		$this->assertMatchesRegularExpression( '#<th scope="row">2022-03</th>\s*<td>3</td>#', $output );

		// The old transposed layout put the labels in the header row
		$this->assertStringNotContainsString( '<th scope="col">2022-01</th>', $output );
	}

	/**
	 * Labels in the first spreadsheet row are genuinely column headers and
	 * should keep the existing horizontal layout
	 */
	public function test_first_row_labels_still_render_horizontally(): void {
		$post_id = $this->create_chart( [
			[ 'Jan', 'Feb', 'Mar' ],
			[ 1, 2, 3 ],
		], 'columns' );

		$output = m_chart()->build_table( $post_id );

		$this->assertStringContainsString( '<th scope="col">Jan</th>', $output );
		$this->assertStringNotContainsString( '<th scope="row">Jan</th>', $output );
	}

	/**
	 * An empty corner cell means labels on both axes and the full grid branch
	 * should keep rendering a header row plus per-row headers
	 */
	public function test_labels_both_still_renders_grid(): void {
		$post_id = $this->create_chart( [
			[ '', 'A', 'B' ],
			[ 'X', 1, 2 ],
			[ 'Y', 3, 4 ],
		], 'rows' );

		$output = m_chart()->build_table( $post_id );

		$this->assertStringContainsString( '<th scope="col">A</th>', $output );
		$this->assertMatchesRegularExpression( '#<th scope="row">X</th>\s*<td>1</td>\s*<td>2</td>#', $output );
		$this->assertMatchesRegularExpression( '#<th scope="row">Y</th>\s*<td>3</td>\s*<td>4</td>#', $output );
	}

	/**
	 * Multi-set charts render one table per set and each should get the
	 * corrected vertical layout
	 */
	public function test_multiple_sets_each_render_vertically(): void {
		$post_id = $this->create_chart( [
			[
				[ 'month', 'records' ],
				[ '2022-01', 16 ],
			],
			[
				[ 'month', 'records' ],
				[ '2023-01', 7 ],
			],
		], 'rows', [ 'Set one', 'Set two' ] );

		$output = m_chart()->build_table( $post_id );

		$this->assertSame( 2, substr_count( $output, '<table' ) );
		$this->assertMatchesRegularExpression( '#<th scope="row">2022-01</th>\s*<td>16</td>#', $output );
		$this->assertMatchesRegularExpression( '#<th scope="row">2023-01</th>\s*<td>7</td>#', $output );
	}

	/**
	 * Helper: create a chart post through the plugin's own validation pipeline
	 *
	 * $data is a single set's rows unless $set_names is passed, in which case
	 * it's an array of sets
	 */
	private function create_chart( array $data, string $parse_in, ?array $set_names = null ): int {
		$post_id = self::factory()->post->create( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'publish',
			'post_title'  => 'Table test chart ' . wp_generate_password( 8, false ),
		] );

		$meta = [
			'library'   => 'chartjs',
			'type'      => 'line',
			'parse_in'  => $parse_in,
			'theme'     => '_default',
			'data'      => [
				'sets' => null === $set_names ? [ $data ] : $data,
			],
			'set_names' => $set_names ?? [ 'Set one' ],
			'height'    => 400,
		];

		$validated = m_chart()->validate_post_meta( $meta );
		update_post_meta( $post_id, m_chart()->slug, $validated );

		return $post_id;
	}
}
