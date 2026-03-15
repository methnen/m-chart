const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

/**
 * Extend the default wp-scripts webpack config to silence the Dart Sass
 * "legacy JS API" deprecation warning emitted by sass-loader.
 */
module.exports = {
	...defaultConfig,
	module: {
		...defaultConfig.module,
		rules: defaultConfig.module.rules.map( ( rule ) => {
			const uses = [].concat( rule.use || [] );

			if ( ! uses.some( ( u ) => u?.loader?.includes?.( 'sass-loader' ) ) ) {
				return rule;
			}

			return {
				...rule,
				use: uses.map( ( u ) =>
					u?.loader?.includes?.( 'sass-loader' )
						? {
								...u,
								options: {
									...u.options,
									sassOptions: {
										...( u.options?.sassOptions ?? {} ),
										silenceDeprecations: [ 'legacy-js-api' ],
									},
								},
						  }
						: u
				),
			};
		} ),
	},
};
