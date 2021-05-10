/*global module:false*/

module.exports = function( grunt ) {
	'use strict';

	// Project configuration.
	grunt.initConfig({
		sass: {
			options: {
				implementation: require('dart-sass'),
				sourceMap: true,
				indentType: 'tab',
				indentWidth: 1,
				outputStyle: 'expanded',
			},
			dist: {
				files: {
					'components/css/m-chart-admin.css': 'components/sass/m-chart-admin.scss'
				}
			}
		},
		scsslint: {
			allFiles: [ 'components/sass/*.scss' ],
			options: {
				config: '.scss-lint.yml',
				colorizeOutput: true
			}
		},
		wp_readme_to_markdown: {
			your_target: {
				files: {
					'README.md': 'readme.txt'
				},
				options: {
					screenshot_url: 'https://methnen.com/misc/m-chart/{screenshot}.png',
				}
			}
		},
		copy: {
			deploy: {
				files: [{
					expand: true,
					src: [
						'**',
						'!**/assets/**',
						'!**/bin/**',
						'!**/deploy/**',
						'!**/sass/**',
						'!**/node_modules/**',
						'!**/tests/**',
						'!config.rb',
						'!Gruntfile.js',
						'!package.json',
						'!package-lock.json',
						'!phpunit.xml',
						'!README.md'
					],
					dest: 'deploy/'
				}],
			},
		},
		wp_deploy: {
			deploy: {
				options: {
					plugin_slug: 'm-chart',
					build_dir: 'deploy',
					assets_dir: 'assets'
				},
			}
		},
		clean: [ 'deploy' ],
		watch: {
			files: [ 'components/sass/*.scss' ],
			tasks: [ 'sass', 'scsslint' ]
		}
	});

	require( 'matchdep' ).filterDev( 'grunt-*' ).forEach( grunt.loadNpmTasks );

	grunt.registerTask( 'default', [ 'sass', 'wp_readme_to_markdown', 'scsslint' ] );
	grunt.registerTask( 'deploy', [ 'copy:deploy', 'wp_deploy:deploy', 'clean' ] );
};
