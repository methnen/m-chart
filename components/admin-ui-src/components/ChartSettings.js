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
	const Settings = window.wp?.hooks
		? wp.hooks.applyFilters( 'm_chart.settings_component', DefaultSettings )
		: DefaultSettings;

	return (
		<div className="settings">
			<Settings />
		</div>
	);
}
