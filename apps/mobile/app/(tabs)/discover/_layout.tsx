import type { Schedule } from "@/features/career/hooks";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { View } from "react-native";
import { client, useUndoRows } from "@/features/career/hooks";
import { ScheduleSheet } from "@/features/career/schedule-sheet";
import { DiscoverProvider } from "@/features/discover/context";
import { SearchHeader } from "@/features/discover/search-header";
import { PreferencesPanel } from "@/features/knowledge/screens";
import { routes } from "@/routes";
import { SectionLayout } from "@/shell/section-layout";
import { Button, Sheet } from "@/ui";

type Sheet = { schedule: Schedule | null; kind: "discovery" | "prepare" | "follow-up" } | null;

/** Discover: the roles discovery found, and a record of every search, under the saved search and its controls. */
export default function DiscoverLayout() {
	const { t } = useLingui();
	const undo = useUndoRows();
	const [sheet, setSheet] = useState<Sheet>(null);
	const [preferences, setPreferences] = useState(false);
	return (
		<DiscoverProvider value={{ edit: (schedule) => setSheet({ schedule, kind: "discovery" }), hidden: undo.hidden }}>
			<SectionLayout
				title={t`Discover`}
				label={t`Discover`}
				fallback="jobs"
				sections={[
					{ value: "jobs", label: t`Jobs`, file: "index" },
					{ value: "activity", label: t`Search activity` },
					{ value: "dismissed", label: t`Dismissed` },
				]}
				hrefFor={(section) => routes.discover(section)}
			>
				<View style={{ gap: 12 }}>
					<SearchHeader />
					<Button variant="secondary" label={t`Job preferences`} onPress={() => setPreferences(true)} />
				</View>
			</SectionLayout>
			<Sheet open={preferences} onClose={() => setPreferences(false)} title={t`Job preferences`} detents={[0.9]}>
				<PreferencesPanel />
			</Sheet>
			{sheet ? (
				<ScheduleSheet
					key={sheet.schedule?.id ?? "new"}
					{...sheet}
					onClose={() => setSheet(null)}
					onDelete={(id) => undo.remove(id, t`Schedule deleted`, () => client.career.deleteSchedule({ id }))}
				/>
			) : null}
		</DiscoverProvider>
	);
}
