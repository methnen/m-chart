<?php

/**
 * Value object representing a single parsed data point cell.
 *
 * Numeric cells carry a float value alongside the prefix and suffix strings
 * that surrounded the number in the original cell (e.g. "$", "°F"), so they
 * can be reformatted for any locale while preserving display context.
 *
 * Non-numeric cells carry a plain text string and a null value.
 */
class M_Chart_Parsed_Data_Point {
	public readonly ?float $value;
	public readonly string $prefix;
	public readonly string $suffix;
	public readonly string $text;

	private function __construct( ?float $value, string $prefix, string $suffix, string $text ) {
		$this->value  = $value;
		$this->prefix = $prefix;
		$this->suffix = $suffix;
		$this->text   = $text;
	}

	/**
	 * Creates a numeric data point with optional surrounding context.
	 *
	 * @param float  $value  The extracted numeric value.
	 * @param string $prefix Everything before the number in the original string (e.g. "$").
	 * @param string $suffix Everything after the number in the original string (e.g. "°F").
	 *
	 * @return self
	 */
	public static function numeric( float $value, string $prefix = '', string $suffix = '' ): self {
		return new self( $value, $prefix, $suffix, '' );
	}

	/**
	 * Creates a non-numeric data point (e.g. "N/A", empty cell).
	 *
	 * @param string $text The original cell string.
	 *
	 * @return self
	 */
	public static function text( string $text = '' ): self {
		return new self( null, '', '', $text );
	}

	/**
	 * Returns true if this data point contains a numeric value.
	 *
	 * @return bool
	 */
	public function is_numeric(): bool {
		return null !== $this->value;
	}
}
