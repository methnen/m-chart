import { useMemo } from '@wordpress/element';
import TypeAndThemeRow      from './TypeAndThemeRow';
import ParseAndFlagsRow     from './ParseAndFlagsRow';
import AxisRows             from './AxisRows';
import ShortcodeAndImageRow from './ShortcodeAndImageRow';

function DefaultSettings() {
	return (
		<>
			<TypeAndThemeRow />
			<ParseAndFlagsRow />
			<AxisRows />
			<ShortcodeAndImageRow />
		</>
	);
}

export default function ChartSettings() {
	// Allow library plugins to replace the settings component via wp.hooks
	// useMemo with [] ensures the filter runs once — filters are registered at load time,
	// so calling applyFilters on every render would return a new function reference each
	// time and cause React to unmount/remount the settings UI
	const Settings = useMemo( () => {
		return window.wp?.hooks
			? wp.hooks.applyFilters( 'm_chart.settings_component', DefaultSettings )
			: DefaultSettings;
	}, [] );

	return (
		<div className="settings">
			<Settings />
		</div>
	);
}
