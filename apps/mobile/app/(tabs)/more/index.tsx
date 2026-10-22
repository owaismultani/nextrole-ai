import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { SettingsGroup } from "@/features/settings/layout";
import { routes } from "@/routes";
import { ListRow, Screen } from "@/ui";

/** The phone's overflow tab: everything that is not on the bar. Settings and Trash are utilities, below a divider. */
export default function MoreScreen() {
	const { t } = useLingui();
	const router = useRouter();
	return (
		<Screen>
			<SettingsGroup>
				<ListRow title={t`Knowledge`} leading="books" chevron onPress={() => router.push(routes.knowledge())} />
				<ListRow title={t`Coach`} leading="sparkle" chevron onPress={() => router.push(routes.coach())} />
			</SettingsGroup>
			<SettingsGroup>
				<ListRow
					title={t`Automation`}
					leading="clock-counter-clockwise"
					chevron
					onPress={() => router.push(routes.automation())}
				/>
				<ListRow title={t`Settings`} leading="gear-six" chevron onPress={() => router.push(routes.settings())} />
				<ListRow title={t`Trash`} leading="trash" chevron onPress={() => router.push(routes.trash())} />
			</SettingsGroup>
		</Screen>
	);
}
