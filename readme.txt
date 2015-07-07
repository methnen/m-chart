=== M Chart ===
Contributors: methnen
Tags: highcharts, graphs, charts, data, wordpress
Requires at least: 4.2
Tested up to: 4.2
Stable tag: 1.1.4
License: MIT

Manage data sets and display them as charts in WordPress.

== Description ==

Allows you to manage data sets via a spreadsheet interface and present that data in chart form via the Highcharts chart library.  The charts can then be embedded into a regular post via a handy shortcode.

For full documentation please see the [Wiki](https://github.com/methnen/m-chart/wiki).

To contribute, report issues, or make feature requests use [Github](https://github.com/methnen/m-chart).

== Installation ==

1. Put the m-chart directory into your plugins directory
2. Click 'Activate' in the Plugins admin panel

== Screenshots ==

1. M Chart UI

== Changelog ==

= 1.1.4 =

* Updated Handsontable to a the latest stable version (0.15.1) this fixes a copy/paste issue in the spreadsheet for some browsers

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
