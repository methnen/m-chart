/*global module:false*/

module.exports = function( grunt ) {
	'use strict';

	// Project configuration.
	grunt.initConfig({
		compass: {
			prod: {
				config: 'config.rb',
				debugInfo: false
			}
		},
		watch: {
			files: [ 'components/sass/*.scss' ],
			tasks: [ 'compass:prod' ]
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
		scsslint: {
			allFiles: [ 'components/sass/*.scss' ]
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
		clean: [ 'deploy' ]
	});

	require( 'matchdep' ).filterDev( 'grunt-*' ).forEach( grunt.loadNpmTasks );

	grunt.registerTask( 'default', [ 'compass:prod', 'wp_readme_to_markdown', 'scsslint' ] );
	grunt.registerTask( 'deploy', [ 'copy:deploy', 'wp_deploy:deploy', 'clean' ] );
};
