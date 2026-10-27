import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { cadenceLabel, runState, stateLabel } from "../career/discovery-run";
import { client, useCareerAction, useCareerTime, useTodayQueries } from "../career/hooks";
import { useDiscover } from "./context";
import { routes } from "@/routes";
import { Badge, Banner, Button, Card, Skeleton, Text, useTheme } from "@/ui";

/**
 * Discover's header: a banner when discovery is paused, the saved search's controls, and one line on what it searches
 * for and when it runs. Edit search opens the same editor Automation uses, so there is one place the search is defined.
 */
export function SearchHeader() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
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
	const paused = !schedule.enabled;
	// What the search is doing, said once: a paused search is not also "next run: paused".
	const status = paused
		? null
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: t`Next run ${when(schedule.nextRunAt)}`;
	const lastRun = paused || state === "running" || state === "queued" ? null : stateLabel(state);
	const setEnabled = (enabled: boolean) =>
		void action.run(() => client.career.setScheduleEnabled({ id: schedule.id, enabled }));

	return (
		<Card style={{ gap: space.s3 }}>
			<View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.s2 }}>
				<Text weight={700} style={{ flex: 1 }}>
					{schedule.query}
				</Text>
				<Badge
					tone={paused ? "warn" : state === "failed" ? "danger" : state === "running" ? "info" : "ok"}
					label={
						paused ? t`Paused` : state === "failed" ? t`Last run failed` : state === "running" ? t`Running now` : t`On`
					}
				/>
			</View>
			<Text variant="caption" color="ink3">
				{[cadenceLabel(schedule), status, lastRun, paused ? t`Your existing roles are available.` : null]
					.filter(Boolean)
					.join(" · ")}
			</Text>
			{action.error ? <Banner tone="danger" message={action.error} /> : null}
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				{paused ? (
					<Button label={t`Resume discovery`} disabled={action.pending} onPress={() => setEnabled(true)} />
				) : (
					<Button variant="secondary" label={t`Pause`} disabled={action.pending} onPress={() => setEnabled(false)} />
				)}
				<Button
					variant="secondary"
					label={t`Run now`}
					disabled={action.pending || schedule.activeRun !== null}
					onPress={() => void action.run(() => client.career.runSchedule({ id: schedule.id }))}
				/>
				<Button variant="secondary" label={t`Edit search`} onPress={() => edit(schedule)} />
				<Button variant="ghost" label={t`Discovery settings`} onPress={() => router.push(routes.automation())} />
			</View>
		</Card>
	);
}
