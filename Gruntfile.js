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
			files: ['components/sass/*.scss'],
			tasks: [
				'compass:prod'
			]
		},
		wp_readme_to_markdown: {
			your_target: {
				files: {
					'README.md': 'readme.txt'
				},
				options: {
					screenshot_url: 'http://s.wordpress.org/extend/plugins/m-chart/{screenshot}.png',
				}
			}
		}
	});

	// Default task.
	grunt.loadNpmTasks( 'grunt-newer' );
	
	grunt.loadNpmTasks( 'grunt-contrib-compass' );
	
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	
	grunt.loadNpmTasks( 'grunt-wp-readme-to-markdown' );

	grunt.registerTask( 'default', [ 'compass:prod', 'wp_readme_to_markdown' ] );

};
