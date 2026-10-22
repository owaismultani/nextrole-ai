import type { Schedule } from "@/features/career/hooks";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { client, useUndoRows } from "@/features/career/hooks";
import { ScheduleSheet } from "@/features/career/schedule-sheet";
import { DiscoverProvider } from "@/features/discover/context";
import { SearchHeader } from "@/features/discover/search-header";
import { routes } from "@/routes";
import { SectionLayout } from "@/shell/section-layout";

type Sheet = { schedule: Schedule | null; kind: "discovery" | "prepare" | "follow-up" } | null;

/** Discover: the roles discovery found, and a record of every search, under the saved search and its controls. */
export default function DiscoverLayout() {
	const { t } = useLingui();
	const undo = useUndoRows();
	const [sheet, setSheet] = useState<Sheet>(null);
	return (
		<DiscoverProvider value={{ edit: (schedule) => setSheet({ schedule, kind: "discovery" }), hidden: undo.hidden }}>
			<SectionLayout
				title={t`Discover`}
				label={t`Discover`}
				fallback="jobs"
				sections={[
					{ value: "jobs", label: t`Jobs`, file: "index" },
					{ value: "activity", label: t`Search activity` },
				]}
				hrefFor={(section) => routes.discover(section)}
			>
				<SearchHeader />
			</SectionLayout>
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
