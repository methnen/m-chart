=== M Chart ===
Contributors: methnen
Tags: highcharts, graphs, charts, data, wordpress
Requires at least: 4.2
Tested up to: 4.5.2
Stable tag: 1.3.1
License: MIT

Manage data sets and display them as charts in WordPress.

== Description ==

Allows you to manage data sets via a spreadsheet interface and present that data in chart form via the Highcharts chart library.  The charts can then be embedded into a regular post via a handy shortcode.

For full documentation please see the [Wiki](https://github.com/methnen/m-chart/wiki).

To contribute, report issues, or make feature requests use [Github](https://github.com/methnen/m-chart).

**Note:** PHP version 5.3.6 or greater is required to run this plugin.

== Installation ==

1. Put the m-chart directory into your plugins directory
2. Click 'Activate' in the Plugins admin panel

== Screenshots ==

1. M Chart UI

== Changelog ==

= 1.3.1 =

* Upped the chart height limit to 1500
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
