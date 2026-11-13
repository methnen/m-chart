<?php

namespace ParseCsv\enums;

// Added by M Chart: this file does nothing useful when requested directly, and its fatal error would show the server path
defined( 'ABSPATH' ) || exit;


/**
 * Class FileProcessingEnum
 *
 * @package ParseCsv\enums
 *
 * todo extends a basic enum class after merging #121
 */
class FileProcessingModeEnum {

    const __default = self::MODE_FILE_OVERWRITE;

    const MODE_FILE_APPEND = true;

    const MODE_FILE_OVERWRITE = false;

    public static function getAppendMode($mode) {
        if ($mode == self::MODE_FILE_APPEND) {
            return 'ab';
        }

        return 'wb';
    }
}
