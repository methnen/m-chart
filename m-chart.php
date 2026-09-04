<?php
/*
Plugin Name: M Chart
Version: 2.3.2
Plugin URI: https://github.com/methnen/m-chart
Description: Manage data sets via a spreadsheet interface, display them as charts via the Chart.js chart library, and embed them via a shortcode or block.
Author: Jamie Poitra
Author URI: https://methnen.com
Tags: chartjs, highcharts, graphs, charts, tables, data
Text Domain: m-chart
Domain Path: /components/languages
Requires PHP: 8.1
License: MIT
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/components/class-m-chart.php';
m_chart();
