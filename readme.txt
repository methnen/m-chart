=== M Chart ===
Contributors: methnen
Tags: chartjs, highcharts, graphs, charts, tables, data
Requires at least: 4.2
Tested up to: 6.5.4
Stable tag: 1.11.1
License: MIT

Manage data sets and display them as charts in WordPress.

== Description ==

Allows you to manage data sets via a spreadsheet interface and present that data in chart form via the Chart.js or [Highcharts](https://github.com/methnen/m-chart-highcharts-library/) chart libraries.  The charts can then be embedded into a regular post via a handy shortcode.

**Note:** Starting with version 1.8 the Chart.js library is no longer on the 2.x.x branch which introduces some [breaking changes](https://www.chartjs.org/docs/latest/getting-started/v3-migration.html). This will probably only affect you if you were modifying the default Chart.js behavior in some way.

**Note:** Starting with version 1.7 Highcharts is no longer included with this plugin by default. If you'd still like to use the features that require Higcharts please install the [M Chart Highcharts Library](https://github.com/methnen/m-chart-highcharts-library/) plugin before installing this update.

For full documentation please see the [Wiki](https://github.com/methnen/m-chart/wiki).

To contribute, report issues, or make feature requests use [Github](https://github.com/methnen/m-chart).

== Installation ==

1. Put the m-chart directory into your plugins directory
2. Click 'Activate' in the Plugins admin panel
3. Adjust the M Chart Settings to your preference
	- WordPress Admin -> Charts -> Settings

== Screenshots ==

1. M Chart UI
2. M Chart Settings
3. M Chart Block UI

== Changelog ==

= 1.11.1 =

* Added alt text to the image version of a chart in the Block editor for better accessibility support
* Added chart title to the image version of a chart in the Block editor
* Added `arial-label` and `role` attributes to the Chart.js canvas object for better accessibility support
* Fixed an issue with translation text not making it into the Block interface
* Fixed an issue where Chart.js tooltips were sometimes missing a label
* Updated Chart.js to the latest stable version (4.4.3)

= 1.11 =

* Added a Chart Block for the WordPress Block Editor
	* Send your thanks to [webconstructor](https://github.com/webconstructor) for the lion's share of the work on this
* Added a [CSV Delimiter](https://github.com/methnen/m-chart/wiki/csv-importing-exporting) control and setting to allow for differences in CSV files from different regions
* Fixed an issue where data points weren't being cleaned well enough and it could confuse Chart.js
* Fixed an issue where Chart.js tooltips sometimes duplicated a label
* Fixed an issue with entities inside of labels

= 1.10.2 =

* Fixed another PHP warning that occured when trim was passed an untyped value (@webconstructor)

= 1.10.1 =

* Fixed a few issues where some PHP warnings could occur when a Chart had no data (@webconstructor)

= 1.10 =

* The default Chart.js theme now uses the [default color pallette](https://www.chartjs.org/docs/latest/general/colors.html#default-color-palette) introduced in version 4.0.0
	* If you preferred the older colors they've been moved to the Chart.js v3 theme
* Number formatting is now always handled by the native locale formating functionality in Chart.js
	* Fixes an issue where large numbers sometimes didn't display properly
* Fixed an issue where some missing output sanitation could allow for some [XSS](https://en.wikipedia.org/wiki/Cross-site_scripting) injection in a chart
	* Thank you to [Ngo Thien](https://twitter.com/thienbg93) for reporting this
* Fixed an issue where the correct library wasn't set when using multiple libraries
* Fixed an issue where the object cache could result in some Chart.js plugins not loading
* Fixed an issue where the port value wasn't being handled by the `plugin_url` method (@turicasturicas)
* Fixed an issue where custom Chart.js animations could be overwritten (@fcFn)
* Updated Chart.js to the latest stable version (4.2.1)
	* If you've customized some Chart.js behaviors note that version 4.x includes [a few breaking changes](https://www.chartjs.org/docs/4.2.0/migration/v4-migration.html)
* Updated chartjs-plugin-datalabels to the latest stable version (2.2.0)

= 1.9.4 =

* Added a setting to control the width of the image generation
* Updated Chart.js to the latest stable version (3.7.1)
* Updated canvg to the latest stable version (3.1.0)

= 1.9.3 =

* Fixed an issue where tick labels were getting mangled in certain situations

= 1.9.2 =

* Fixed an issue where the default theme was overwritten by the first library when multiple libraries are installed
* Fixed some issues with M Chart Settings that were introduced in M Chart 1.9
* Fixed an issue where the number formatting code is not always ready before a Chart.js chart renders

= 1.9.1 =

* Fixed an issue where the number formating code crashed the WordPress Block Editor

= 1.9 =

* Added support for [stacked column](https://github.com/methnen/m-chart/wiki/Types-of-charts#stacked-column), [stacked bar](https://github.com/methnen/m-chart/wiki/Types-of-charts#stacked-bar), and [doughnut](https://github.com/methnen/m-chart/wiki/Types-of-charts#doughnut) charts when using Chart.js
* Added support for data point labels when using Chart.js
	* Uses the [chartjs-plugin-datalabels](https://github.com/chartjs/chartjs-plugin-datalabels) plugin
* Added better number formatting for Chart.js
	* Uses Intl.NumberFormat and a locale set in the M Chart Settings panel to properly format numbers when possible
* Made some tweaks to how tables are rendered so the results are more sensible
* Tweaked plugin behavior when multiple libraries are installed
	* You can now add a new chart in both the default and other installed libraries
	* You can now update the settings for all of the installed libraries instead of just the default
* Fixed an issue where double quotes in a label could cause Javascript errors
* Fixed a few PHP warnings that could occur when editing a chart
* Updated Chart.js to the latest stable version (3.7.0)
* Updated ParseCsv to the latest stable version (1.3.2)

= 1.8.1 =

* Fixed an issue where not all of the arguments were being fed to functions attached to the_title filter hook
* Fixed an issue where handlebars wasn't always enqueued when needed

= 1.8 =

* Added support for [spline](https://github.com/methnen/m-chart/wiki/Types-of-charts#spline), [area](https://github.com/methnen/m-chart/wiki/Types-of-charts#area), [scatter](https://github.com/methnen/m-chart/wiki/Types-of-charts#scatter), [bubble](https://github.com/methnen/m-chart/wiki/Types-of-charts#bubble), [radar](https://github.com/methnen/m-chart/wiki/Types-of-charts#radar), [radar area](https://github.com/methnen/m-chart/wiki/Types-of-charts#radar-area), and [polar](https://github.com/methnen/m-chart/wiki/Types-of-charts#polar) charts when using Chart.js
* Chart.js can now use [themes](https://github.com/methnen/m-chart/wiki/Themes)
	* Default themes:
		* Chart.js (Default)
			* Based on the Chart.js homepage colors
		* Color Blind Safe
		* Highcharts 4.x
* Many additions/tweaks to Chart.js support
	* Charts can now use the [Vertical axis minimum value field](https://github.com/methnen/m-chart/wiki/Creating-a-chart#user-content-vertical-axis-minimum-note)
	* Charts can now use the Shared tooltip setting
	* Charts use different symbols for each data set when possible
		* Circle, Diamond, Square, Triangle, etc...
	* Tooltips have been tweaked to include more information
* Added two columns to the admin panel chart posts page
	* Chart Type
	* Chart Library (optional)
* Added an Image Multiplier setting to allow for higher or lower quality images (1x, 2x, 3x, or 4x)
	* A 2x multiplier has been the existing behavior
* Some minor UI tweaks to support WordPress 5.7 changes
* Fixed an issue where chart didn't update when changes were made to a new spreadsheet
* Fixed an issue where axis units weren't displayed in Chart.js when there was no axis title
* Fixed an issue where the auto generated chart images could end up distorted
* Fixed an issue where the auto generated chart images were blurry when using Chart.js
* Removed Dark Mode plugin support
	* The scope/purpose of this plugin changed drastically
* Removed Shortcake shortcode ui
	* Shortcake hasn't been updated in over 2 years
* Updated canvg to the latest stable version (3.0.7)
	* This fixes an issue with image generation when using the Highcharts library
* Updated Chart.js to the latest stable version (3.2.0)
* Updated Handsontable to the latest stable version with an MIT license (6.2.2)
	* Since I can't get any bug fixes going forward I'll be looking into alternatives for future versions

= 1.7.11 =

* Fixed an issue in WordPress 5.5 where jQuery sometimes wasn't available in time for embedded charts

= 1.7.10 =

* Fixed some minor style issues in WordPress 5.5
* Fixed some issues with the admin Javascript when the plugin is used in WordPress 5.5
* Updated Chart.js to the latest stable version (2.7.3)

= 1.7.9 =

* Changed the priority of the `template_redirect` filter hook call so that `m_chart()->is_iframe` get's set earlier

= 1.7.8 =

* Fixed an issue that caused a few PHP warnings on the Charts page of the admin panel

= 1.7.7 =

* Fixed an issue that caused a PHP warning about a non-numeric value in class-wp-rewrite.php

= 1.7.6 =

* A few PHP notice fixes
* Updated Chart.js to the latest stable version (2.7.3)
* Updated Handsontable to the latest stable version (6.2.1)

= 1.7.5 =

* Added an additional check for the post id value in the edit interface
* Added an additional check for datasets data in the Chart.js code when adding colors
* Fixed an incorrect reference to the plugin version

= 1.7.4 =

* Improved data handling for non pie charts (when using Chart.js)
* Moved chart type tracking from the post_tag taxonomy to a specific m-chart-library taxonomy
* Updated Handsontable to the latest stable version (5.0.2)
* Fixed an issue where the `get_chart` method would still try to load the template file for an invalid or non active chart type
	* Also better handling in general when a chart requires the Highcharts library and it is either not installed or inactive
* Fixed an issue where Chart.js sometimes wasn't enqueued because of an erroneous dependency

= 1.7.3 =

* Fixed an issue where charts couldn't be saved if the data didn't yet include labels that M Chart could find (when using Chart.js)

= 1.7.2 =

* Added styles for the Dark Mode plugin
* Fixed an issue where new charts couldn't be saved after making changes when there was an empty data set (when using Chart.js)

= 1.7.1 =

* Fixed an issue that could prevent new charts from being created when using Highcharts

= 1.7 =

* Updated Handsontable to the latest stable version (5.0.0)
* Major restructuring changes to meet [WordPress Plugins directory requirements](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#the-guidelines)
	* Switched default graphing library to [Chart.js](https://www.chartjs.org) (2.7.2)
		* Chart.js is more limited in functionality than Highcharts and the features of the core plugin are scaled back to reflect this
			* Chart types are reduced and customizability is limited
	* Removed Highcharts completely from the core plugin
		* To continue using Highcharts install the [M Chart Highcharts Library](https://github.com/methnen/m-chart-highcharts-library/) plugin
			* This plugin reinstates ALL of the previous functionality found in M Chart

= 1.6.3 =

* Reworked the iframe embed code so differences in themes shouldn't cause issues anymore

= 1.6.2 =

* Simplified Chinese (zh_CN) translation corrections
* Fixed an issue with PHP 7.1+ installs

= 1.6.1 =

* Fixed an issue where the placeholder image was used when a valid image existed

= 1.6 =

* Added support for [scatter](https://github.com/methnen/m-chart/wiki/Types-of-charts#scatter) and [bubble](https://github.com/methnen/m-chart/wiki/Types-of-charts#bubble) charts
* Charts can now be loaded via iframes (this enables remote embedding among other things)
* Line, spline and area charts can now use shared tool tips
* Added language settings to allow things like setting the thousands seperator and decimal symbols
* Switched to internal array_merge method in the theme code so we can recursively merge settings
* Tweaked the theme code a bit so we can support older versions of PHP
* Filtering `the_content` to now return chart code when appropriate
* Updated Highcharts to the latest stable version (5.0.7)
* Updated Handsontable to the latest stable version (0.31)

= 1.5.2 =

* Fix for image performance options which would disable form submission in some situations

= 1.5.1 =

* Fix for image generation due to changes in Highcharts 5.0

= 1.5 =

* Added support for the [AMP plugin](https://wordpress.org/plugins/amp/)
* Shortcode can now output a [HTML table](https://github.com/methnen/m-chart/wiki/Chart-shortcode#html-table) instead of a chart
* Updated Handsontable to the latest stable version (0.29)
* Updated Highcharts to the latest stable version (5.0.2)
* Tweaked how taxonomies are assigned so we don't unintentionally inherit them from other plugins

= 1.4.1 =

* You can now display the same chart more than once on a single page

= 1.4 =

* Added [Vertical axis minimum value field](https://github.com/methnen/m-chart/wiki/Creating-a-chart#user-content-vertical-axis-minimum-note)
* Fixed an issue where a notice error could occur when chart caches are being refreshed

= 1.3.2 =

* Fixed an issue where a notice error could occur when saving a chart

= 1.3.1 =

* Upped the chart height limit to 1500px
* Fixed an issue where notice errors were causing syntax errors in the Javascript when PHP errors are sent to screen

= 1.3 =

* Added a subtitle field which is used in the Highcharts subtitle attribute
* Noting that PHP >= 5.3.6 is required in the readme
* Also checking manage_options permission when saving settings
* Added a Simplified Chinese (zh_CN) translation
* The Color Blind Safe theme is now based on a palette by [Martin Krzywinski](http://mkweb.bcgsc.ca/biovis2012/color-blindness-palette.png)

= 1.2.1 =

* Now using manage_options permissions for the settings panel

= 1.2 =

* Added [themes](https://github.com/methnen/m-chart/wiki/Themes)
	* Default themes:
		* Highcharts 4.x (Default)
		* Color Blind Safe
		* Highcharts 3.x
		* Highcharts 2.x
* Added a settings panel
	* Turn off/on image generation and/or instant chart previews
	* Set default Highcharts theme
* Added full language support
	* Now we just needs some translations
* Simplified the admin panel CSS a bit
* Fixed a display issue with the spreadsheet interface
* Fixed a bug where the Source URL wasn't making into the charts
* Updated Handsontable to the latest stable version (0.24.1)
* Updated Highcharts to the latest stable version (4.2.1)

= 1.1.5 =

* Updated Highcharts to the latest stable version (4.2.0) this fixes an issue where bar charts could cause an Uncaught TypeError in some WP themes

= 1.1.4 =

* Updated Handsontable to the latest stable version (0.15.1) this fixes a copy/paste issue in the spreadsheet for some browsers

= 1.1.3 =

* Fixed an issue where the Highcharts options where sometimes being set before Highcharts was available

= 1.1.2 =

* Fixed an issue where subsequent charts on the same page inherited the data from the previous chart

= 1.1.1 =

* Fixed a bug where data sets with only one row/column of data that also had only one row/column of labels would fail to display in chart types other than pie

= 1.1 =

* Added a Shortcake shortcode ui
* Added [`canvas_done`](https://github.com/methnen/m-chart/wiki/Javascript-events#canvas_done) Javascript event
* Added [`m_chart_admin_footer_javascript`](https://github.com/methnen/m-chart/wiki/Action-and-filter-hooks#m_chart_admin_footer_javascript) Action hook
* Fixed a PHP warning that occured when adding a new chart that had no data yet

= 1.0 =

* Initial release
