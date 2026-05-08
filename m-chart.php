<?php
/*
Plugin Name: M Chart
Version: 2.1
Plugin URI: http://github.com/methnen/m-chart
Description: Manage data sets via a spreadsheet interface and display them as charts in WordPress.
Author: Jamie Poitra
Author URI: http://methnen.com
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
