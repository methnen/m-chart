=== M Chart ===
Contributors: methnen
Tags: chartjs, highcharts, graphs, charts, data, wordpress
Requires at least: 4.2
Tested up to: 5.2.2
Stable tag: 1.7.7
License: MIT

Manage data sets and display them as charts in WordPress.

== Description ==

Allows you to manage data sets via a spreadsheet interface and present that data in chart form via the Chart.js or Highcharts chart libraries.  The charts can then be embedded into a regular post via a handy shortcode.

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

== Changelog ==

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
* Added [`m_chart_admin_footer_javascript`](https://github.com/methnen/m-chart/wiki/Action-and-filter-hooks#admin_footer_javascript) Action hook
* Fixed a PHP warning that occured when adding a new chart that had no data yet

= 1.0 =

* Initial release
