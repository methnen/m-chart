import TypeAndThemeRow      from './TypeAndThemeRow';
import ParseAndFlagsRow     from './ParseAndFlagsRow';
import AxisRows             from './AxisRows';
import ShortcodeAndImageRow from './ShortcodeAndImageRow';

export default function ChartSettings() {
	return (
		<div className="settings">
			<TypeAndThemeRow />
			<ParseAndFlagsRow />
			<AxisRows />
			<ShortcodeAndImageRow />
		</div>
	);
}
