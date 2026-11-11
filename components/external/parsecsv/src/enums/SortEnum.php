<?php

namespace ParseCsv\enums;

// Added by M Chart: this file does nothing useful when requested directly, and its fatal error would show the server path
defined( 'ABSPATH' ) || exit;


class SortEnum extends AbstractEnum {

    const __DEFAULT = self::SORT_TYPE_REGULAR;

    const SORT_TYPE_REGULAR = 'regular';

    const SORT_TYPE_NUMERIC = 'numeric';

    const SORT_TYPE_STRING = 'string';

    private static $sorting = array(
        self::SORT_TYPE_REGULAR => SORT_REGULAR,
        self::SORT_TYPE_STRING => SORT_STRING,
        self::SORT_TYPE_NUMERIC => SORT_NUMERIC,
    );

    public static function getSorting($type) {
        if (array_key_exists($type, self::$sorting)) {
            return self::$sorting[$type];
        }

        return self::$sorting[self::__DEFAULT];
    }
}
