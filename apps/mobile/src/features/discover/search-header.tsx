import { useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { cadenceLabel, runState, stateLabel } from "../career/discovery-run";
import { client, useCareerAction, useCareerTime, useTodayQueries } from "../career/hooks";
import { useDiscover } from "./context";
import { Banner, Button, Card, Skeleton, Text, useTheme } from "@/ui";

/**
 * Discover's header: the saved search, how often it runs, whether it is running or paused, and the controls. Edit
 * search opens the same editor Automation uses, so there is one place the search is defined.
 */
export function SearchHeader() {
	const { t } = useLingui();
	const { space } = useTheme();
	const { when } = useCareerTime();
	const action = useCareerAction();
	const { edit, hidden } = useDiscover();
	const { schedules } = useTodayQueries();
	const schedule = (schedules.data ?? [])
		.filter((row) => row.kind === "discovery" && !hidden.includes(row.id))
		.sort(
			(a, b) =>
				Number(b.enabled) - Number(a.enabled) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)[0];

	if (schedules.isError) return <Banner tone="danger" message={t`Couldn't load your search.`} />;
	if (schedules.isPending) return <Skeleton height={space.s12} />;
	if (!schedule)
		return (
			<Card style={{ gap: space.s3 }}>
				<Text color="ink2">{t`No saved search yet. Set one up and new roles will appear here.`}</Text>
				<Button variant="secondary" label={t`Set up discovery`} onPress={() => edit(null)} />
			</Card>
		);

	const state = runState(schedule);
	const next = !schedule.enabled
		? t`Paused`
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: t`Next run ${when(schedule.nextRunAt)}`;
	return (
		<Card style={{ gap: space.s2 }}>
			<Text weight={600} numberOfLines={2}>
				{schedule.query}
			</Text>
			<Text variant="callout" color="ink3">
				{[cadenceLabel(schedule), next, stateLabel(state)].join(" · ")}
			</Text>
			{action.error ? <Banner tone="danger" message={action.error} /> : null}
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				<Button
					variant="secondary"
					label={t`Run now`}
					disabled={action.pending || schedule.activeRun !== null}
					onPress={() => void action.run(() => client.career.runSchedule({ id: schedule.id }))}
				/>
				<Button
					variant="secondary"
					label={schedule.enabled ? t`Pause` : t`Resume`}
					disabled={action.pending}
					onPress={() =>
						void action.run(() => client.career.setScheduleEnabled({ id: schedule.id, enabled: !schedule.enabled }))
					}
				/>
				<Button variant="ghost" label={t`Edit search`} onPress={() => edit(schedule)} />
			</View>
		</Card>
	);
}
