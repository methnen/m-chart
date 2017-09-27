=== M Chart ===
Contributors: methnen
Tags: highcharts, graphs, charts, data, wordpress
Requires at least: 4.2
Tested up to: 4.7.2
Stable tag: 1.6.3
License: MIT

Manage data sets and display them as charts in WordPress.

== Description ==

Allows you to manage data sets via a spreadsheet interface and present that data in chart form via the Highcharts chart library.  The charts can then be embedded into a regular post via a handy shortcode.

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
