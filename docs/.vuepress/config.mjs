import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'
import { viteBundler } from '@vuepress/bundler-vite'
import { shikiPlugin } from '@vuepress/plugin-shiki'

export default defineUserConfig( {
	lang:        'en-US',
	title:       'M Chart',
	description: 'WordPress chart plugin powered by Chart.js',
	base:        '/m-chart/',
	bundler:     viteBundler(),

	plugins: [
		shikiPlugin( { theme: 'monokai' } ),
	],

	theme: defaultTheme( {
		logo:       '/logo.png',
		repo:       'methnen/m-chart',
		docsDir:    'docs',
		editLink:   false,

		navbar: [
			{ text: 'User Guide',      link: '/guide/' },
			{ text: 'Developer Guide', link: '/developer/' },
			{ text: 'Highcharts',      link: '/highcharts/' },
		],

		sidebar: {
			'/guide/': [
				{
					text:     'User Guide',
					children: [
						'/guide/README.md',
						'/guide/libraries.md',
						'/guide/chart-types.md',
						'/guide/creating-a-chart.md',
						'/guide/sheets.md',
						'/guide/scatter-bubble.md',
						'/guide/radar.md',
						'/guide/shortcode.md',
						'/guide/block.md',
						'/guide/csv.md',
						'/guide/settings.md',
						'/guide/themes.md',
						'/guide/duplicating.md',
						'/guide/examples.md',
					],
				},
			],
			'/developer/': [
				{
					text:     'Developer Guide',
					children: [
						'/developer/README.md',
						'/developer/hooks.md',
						'/developer/javascript-events.md',
						'/developer/admin-ui-hooks.md',
						'/developer/migrating-v2.md',
					],
				},
			],
			'/highcharts/': [
				{
					text:     'Highcharts',
					children: [
						'/highcharts/README.md',
						'/highcharts/themes.md',
						'/highcharts/hooks.md',
						'/highcharts/javascript-events.md',
					],
				},
			],
		},
	} ),
} )
