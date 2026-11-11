<?php
/**
 * Integration tests for M_Chart_Admin::attach_image()
 *
 * The image the admin app captures is stored as a media attachment when a chart is saved
 * Pins that only a real PNG is stored, that it goes on the chart being saved, that a failed upload
 * doesn't cost the chart the image it had, and that the image goes away with the chart or its public status
 */

declare( strict_types=1 );

final class ChartImageAttachTest extends WP_UnitTestCase {

	private int $author;

	public function set_up(): void {
		parent::set_up();

		m_chart()->library( 'chartjs' )->register_hooks();

		// The before_delete_post hook is registered in the constructor and restored between tests like any other
		if ( ! has_action( 'before_delete_post', [ m_chart(), 'before_delete_post' ] ) ) {
			add_action( 'before_delete_post', [ m_chart(), 'before_delete_post' ] );
		}

		$this->author = self::factory()->user->create( [ 'role' => 'contributor' ] );

		wp_set_current_user( $this->author );
	}

	public function tear_down(): void {
		unset( $_POST['m-chart'], $_POST['post_ID'] );
		$this->remove_added_uploads();
		parent::tear_down();
	}

	private function create_chart( array $args = [] ): WP_Post {
		$post_id = self::factory()->post->create( array_merge( [
			'post_type'   => m_chart()->slug,
			'post_status' => 'draft',
			'post_author' => $this->author,
			'post_title'  => 'Image chart',
		], $args ) );

		update_post_meta( $post_id, m_chart()->slug, m_chart()->validate_post_meta( [ 'library' => 'chartjs' ] ) );

		return get_post( $post_id );
	}

	/**
	 * A real PNG, built by hand so the test doesn't depend on GD being in the container
	 */
	private function png(): string {
		$chunk = static fn( string $type, string $data ): string => pack( 'N', strlen( $data ) ) . $type . $data . pack( 'N', crc32( $type . $data ) );

		return "\x89PNG\r\n\x1a\n"
			. $chunk( 'IHDR', pack( 'NNCCCCC', 4, 3, 8, 0, 0, 0, 0 ) )
			. $chunk( 'IDAT', gzcompress( str_repeat( "\x00\xff\xff\xff\xff", 3 ) ) )
			. $chunk( 'IEND', '' );
	}

	private function post_image( string $bytes ): void {
		$_POST['m-chart'] = [ 'img' => 'data:image/png;base64,' . base64_encode( $bytes ) ];
	}

	public function test_a_real_png_is_attached_to_the_chart(): void {
		$chart = $this->create_chart();

		$this->post_image( $this->png() );

		$image_id = m_chart()->admin()->attach_image( $chart );

		$this->assertIsInt( $image_id );
		$this->assertSame( [ $image_id ], m_chart()->get_chart_image_attachments( $chart->ID ) );
		$this->assertSame( $chart->ID, (int) get_post( $image_id )->post_parent );
		$this->assertSame( $image_id, (int) get_post_meta( $chart->ID, '_thumbnail_id', true ) );
		$this->assertSame( $this->png(), file_get_contents( get_attached_file( $image_id ) ) );
	}

	public function test_data_that_only_starts_like_a_png_is_not_stored(): void {
		$chart = $this->create_chart();

		$this->post_image( "\x89PNG\r\n\x1a\n" . str_repeat( 'JUNK-NOT-A-PNG ', 2000 ) );

		$this->assertFalse( m_chart()->admin()->attach_image( $chart ) );
		$this->assertSame( [], m_chart()->get_chart_image_attachments( $chart->ID ) );
	}

	public function test_the_image_goes_on_the_chart_being_saved_not_the_post_the_request_names(): void {
		$chart = $this->create_chart();
		$other = self::factory()->post->create( [ 'post_author' => $this->author ] );

		$this->post_image( $this->png() );

		$_POST['post_ID'] = (string) $other;

		$image_id = m_chart()->admin()->attach_image( $chart );

		$this->assertSame( $chart->ID, (int) get_post( $image_id )->post_parent );
		$this->assertSame( '', get_post_meta( $other, '_thumbnail_id', true ) );
	}

	public function test_a_post_that_is_not_a_chart_gets_no_image(): void {
		$post = get_post( self::factory()->post->create( [ 'post_author' => $this->author ] ) );

		$this->post_image( $this->png() );

		$this->assertFalse( m_chart()->admin()->attach_image( $post ) );
		$this->assertSame( [], get_children( [ 'post_parent' => $post->ID, 'post_type' => 'attachment' ] ) );
	}

	public function test_a_chart_the_user_cannot_edit_gets_no_image(): void {
		$chart = $this->create_chart( [ 'post_author' => self::factory()->user->create( [ 'role' => 'editor' ] ) ] );

		$this->post_image( $this->png() );

		$this->assertFalse( m_chart()->admin()->attach_image( $chart ) );
		$this->assertSame( [], m_chart()->get_chart_image_attachments( $chart->ID ) );
	}

	public function test_saving_again_replaces_the_image_rather_than_adding_one(): void {
		$chart = $this->create_chart();

		$this->post_image( $this->png() );

		$first  = m_chart()->admin()->attach_image( $chart );
		$second = m_chart()->admin()->attach_image( $chart );

		$this->assertNotSame( $first, $second );
		$this->assertNull( get_post( $first ) );
		$this->assertSame( [ $second ], m_chart()->get_chart_image_attachments( $chart->ID ) );
	}

	public function test_a_failed_upload_keeps_the_image_the_chart_already_had(): void {
		$chart = $this->create_chart();

		$this->post_image( $this->png() );

		$first = m_chart()->admin()->attach_image( $chart );

		// How a multisite upload limit (or any plugin) refuses a file
		$refuse = static fn() => 'This file is too big';

		add_filter( 'wp_upload_bits', $refuse );

		$this->assertFalse( m_chart()->admin()->attach_image( $chart ) );

		remove_filter( 'wp_upload_bits', $refuse );

		$this->assertSame( [ $first ], m_chart()->get_chart_image_attachments( $chart->ID ) );
		$this->assertFileExists( get_attached_file( $first ) );
	}

	public function test_a_password_protected_chart_gets_no_image_and_loses_the_one_it_had(): void {
		$chart = $this->create_chart();

		$this->post_image( $this->png() );

		$first = m_chart()->admin()->attach_image( $chart );
		$file  = get_attached_file( $first );

		wp_update_post( [ 'ID' => $chart->ID, 'post_password' => 'hunter2' ] );

		$this->assertFalse( m_chart()->admin()->attach_image( get_post( $chart->ID ) ) );
		$this->assertSame( [], m_chart()->get_chart_image_attachments( $chart->ID ) );
		$this->assertFileDoesNotExist( $file );
		$this->assertSame( '', get_post_meta( $chart->ID, '_thumbnail_id', true ) );
	}

	public function test_deleting_a_chart_deletes_its_image(): void {
		$chart = $this->create_chart();

		$this->post_image( $this->png() );

		$image_id = m_chart()->admin()->attach_image( $chart );
		$file     = get_attached_file( $image_id );

		wp_delete_post( $chart->ID, true );

		$this->assertNull( get_post( $image_id ) );
		$this->assertFileDoesNotExist( $file );
	}

	public function test_deleting_another_post_type_leaves_its_attachments_alone(): void {
		$post  = self::factory()->post->create();
		$image = self::factory()->attachment->create_object( 'kept.png', $post, [ 'post_mime_type' => 'image/png' ] );

		add_post_meta( $image, 'm-chart-image', $post );

		wp_delete_post( $post, true );

		$this->assertNotNull( get_post( $image ) );
	}
}
