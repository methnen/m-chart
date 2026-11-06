<?php
/**
 * Integration tests for the chart units taxonomy seeding and grouping
 *
 * The defaults are seeded lazily, so anything that creates flat unit terms first
 * (a WXR import, a direct save) used to block seeding for good
 */

declare( strict_types=1 );

final class UnitTermsTest extends WP_UnitTestCase {

	private function taxonomy(): string {
		return m_chart()->slug . '-units';
	}

	private function insert_flat( string $name ): int {
		$term = wp_insert_term( $name, $this->taxonomy() );
		$this->assertNotWPError( $term );

		return (int) $term['term_id'];
	}

	private function names( array $units ): array {
		return array_values( wp_list_pluck( $units, 'name' ) );
	}

	private function count_named( string $name ): int {
		return count( get_terms( [
			'taxonomy'   => $this->taxonomy(),
			'name'       => $name,
			'hide_empty' => false,
		] ) );
	}

	public function test_an_empty_taxonomy_gets_the_default_groups(): void {
		$this->assertSame( [], get_terms( [ 'taxonomy' => $this->taxonomy(), 'hide_empty' => false ] ) );

		$units = m_chart()->get_unit_terms();

		$this->assertSame( [ 'Length', 'Money', 'Other', 'Sales', 'Time', 'Website/Traffic', 'Weight' ], array_keys( $units ) );
		$this->assertContains( 'Tonnes', $this->names( $units['Weight'] ) );
		$this->assertSame( [ 'Percent' ], $this->names( $units['Other'] ) );
	}

	public function test_flat_terms_from_an_import_do_not_block_seeding(): void {
		$tonnes = $this->insert_flat( 'Tonnes' );
		$usd    = $this->insert_flat( 'USD' );

		$units = m_chart()->get_unit_terms();

		$this->assertArrayHasKey( 'Weight', $units );
		$this->assertArrayHasKey( 'Money', $units );

		// The imported terms are moved into their groups rather than duplicated
		$this->assertContains( $tonnes, wp_list_pluck( $units['Weight'], 'term_id' ) );
		$this->assertContains( $usd, wp_list_pluck( $units['Money'], 'term_id' ) );
		$this->assertSame( 1, $this->count_named( 'Tonnes' ) );
		$this->assertSame( 1, $this->count_named( 'USD' ) );
	}

	public function test_a_custom_flat_unit_is_listed_under_other(): void {
		$chf = $this->insert_flat( 'CHF' );

		$units = m_chart()->get_unit_terms();

		$this->assertSame( [ 'CHF', 'Percent' ], $this->names( $units['Other'] ) );
		$this->assertSame( 0, get_term( $chf, $this->taxonomy() )->parent );
	}

	public function test_an_empty_group_is_listed_under_other_until_it_has_units(): void {
		m_chart()->generate_unit_terms();
		$energy = $this->insert_flat( 'Energy' );

		$units = m_chart()->get_unit_terms();

		$this->assertArrayNotHasKey( 'Energy', $units );
		$this->assertContains( 'Energy', $this->names( $units['Other'] ) );

		wp_insert_term( 'Joules', $this->taxonomy(), [ 'parent' => $energy ] );

		$units = m_chart()->get_unit_terms();

		$this->assertSame( [ 'Joules' ], $this->names( $units['Energy'] ) );
		$this->assertNotContains( 'Energy', $this->names( $units['Other'] ) );
	}

	public function test_generating_twice_adds_nothing(): void {
		$first  = count( m_chart()->generate_unit_terms() );
		$second = count( m_chart()->generate_unit_terms() );

		$this->assertSame( 46, $first );
		$this->assertSame( $first, $second );
	}

	public function test_grouped_units_are_left_alone(): void {
		m_chart()->generate_unit_terms();

		$seconds = get_term_by( 'name', 'Seconds', $this->taxonomy() );
		wp_delete_term( $seconds->term_id, $this->taxonomy() );

		$units = m_chart()->get_unit_terms();

		$this->assertNotContains( 'Seconds', $this->names( $units['Time'] ) );
		$this->assertSame( 0, $this->count_named( 'Seconds' ) );
	}

	public function test_activation_seeds_the_defaults(): void {
		m_chart()->activate();

		$this->assertSame( 46, count( get_terms( [ 'taxonomy' => $this->taxonomy(), 'hide_empty' => false ] ) ) );
		$this->assertSame( 'Weight', get_term( get_term_by( 'name', 'Tonnes', $this->taxonomy() )->parent, $this->taxonomy() )->name );
	}
}
