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
					build_dir: 'deploy', //relative path to your build directory
					assets_dir: 'assets'
				},
			}
		},
		clean: [ 'deploy' ]
	});

	// Default task.
	grunt.loadNpmTasks( 'grunt-contrib-compass' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-wp-readme-to-markdown' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-wp-deploy' );
	grunt.loadNpmTasks( 'grunt-contrib-clean' );

	grunt.registerTask( 'default', [ 'compass:prod', 'wp_readme_to_markdown' ] );
	grunt.registerTask( 'deploy', [ 'copy:deploy', 'wp_deploy:deploy', 'clean' ] );
};
