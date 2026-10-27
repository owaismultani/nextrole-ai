import type { Schedule } from "./hooks";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { cadenceLabel, diagnose, runState, stateLabel } from "./discovery-run";
import { connectionName, runSources, sourceLabel, sourceOutcome } from "./discovery-sources";
import { client, useCareerAction, useCareerTime } from "./hooks";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { Banner, Button, Card, Text, useTheme } from "@/ui";

/** The live row for a schedule, refetched while a run is queued or in progress. */
export function useLiveSchedule(initial: Schedule) {
	const session = useSession();
	const query = useQuery({
		...orpc.career.schedules.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.schedules.key(), session.server],
		refetchInterval: (state) => (state.state.data?.some((row) => row.activeRun) ? 5_000 : false),
	});
	return query.data?.find((row) => row.id === initial.id) ?? initial;
}

type DiscoveryStatusProps = {
	schedule: Schedule;
	/** Called once the schedule is paused or resumed, so an open form can follow. */
	onEnabledChange: (enabled: boolean) => void;
};

/**
 * What a discovery schedule is doing and what its last run found, with Run now and Pause. The numbers tell the three
 * causes of a quiet schedule apart: it didn't run (times), it keeps seeing the same roles (duplicates), or pages
 * couldn't be read (read failures).
 */
export function DiscoveryStatus({ schedule: initial, onEnabledChange }: DiscoveryStatusProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const { when } = useCareerTime();
	const action = useCareerAction();
	const schedule = useLiveSchedule(initial);
	const state = runState(schedule);
	const report = schedule.lastRun;
	const diagnosis = report ? diagnose(report) : null;
	const color =
		state === "failed"
			? "dangerText"
			: state === "partial"
				? "warnText"
				: state === "succeeded"
					? "accentText"
					: state === "running" || state === "queued"
						? "infoText"
						: "ink3";
	const next = !schedule.enabled
		? t`Paused`
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: when(schedule.nextRunAt);
	const counts: { key: string; label: string; value: number; bad?: boolean }[] = report
		? [
				{ key: "queries", label: t`Queries`, value: report.queries.length },
				{ key: "sources", label: t`Sources`, value: report.sources.length },
				{ key: "found", label: t`Found`, value: report.found },
				{ key: "duplicates", label: t`Duplicates`, value: report.duplicates },
				{ key: "rejected", label: t`Rejected`, value: report.rejected },
				...(report.filtered !== undefined ? [{ key: "filtered", label: t`Filtered out`, value: report.filtered }] : []),
				{ key: "matches", label: t`New matches`, value: report.matches },
				{ key: "failures", label: t`Read failures`, value: report.readFailures, bad: report.readFailures > 0 },
			]
		: [];
	return (
		<Card style={{ gap: space.s3 }}>
			<Text variant="title" color={color} accessibilityRole="header">
				{stateLabel(state)}
			</Text>
			<View style={{ gap: space.s1 }}>
				<Text color="ink2">
					{t`Last attempt`}: {schedule.lastAttemptedAt ? when(schedule.lastAttemptedAt) : t`Never`}
				</Text>
				<Text color="ink2">
					{t`Last success`}: {schedule.lastSucceededAt ? when(schedule.lastSucceededAt) : t`Never`}
				</Text>
				<Text color="ink2">
					{t`Next run`} ({cadenceLabel(schedule)}): {next}
				</Text>
			</View>
			{report ? (
				<>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s3 }}>
						{counts.map((item) => (
							<View key={item.key} style={{ minWidth: "28%", gap: space.s0 }}>
								<Text variant="callout" color="ink3">
									{item.label}
								</Text>
								<Text variant="title" color={item.bad ? "dangerText" : "ink"}>
									{item.value}
								</Text>
							</View>
						))}
					</View>
					{diagnosis ? (
						<Banner
							tone={report.outcome === "failed" ? "danger" : report.outcome === "partial" ? "warn" : "info"}
							message={diagnosis}
						/>
					) : null}
					<Text variant="callout" color="ink3">
						{[report.queries.join(" · "), report.bySource?.length ? null : runSources(report)]
							.filter(Boolean)
							.join("\n")}
					</Text>
					{(report.bySource ?? []).map((source) => (
						<Text key={source.source} variant="callout" color={source.status === "failed" ? "warnText" : "ink3"}>
							{`${sourceLabel(source.source)}${source.source === "web" && connectionName(report.provider) ? ` · ${connectionName(report.provider)}` : ""}: ${sourceOutcome(source)}`}
						</Text>
					))}
					<Text variant="callout" color="ink3">
						{report.trigger === "manual" ? t`Started by you` : t`Scheduled run`} · {when(report.at)}
					</Text>
				</>
			) : null}
			{action.error ? <Banner tone="danger" message={action.error} /> : null}
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
					void action.run(
						() => client.career.setScheduleEnabled({ id: schedule.id, enabled: !schedule.enabled }),
						(saved) => onEnabledChange(saved.enabled),
					)
				}
			/>
		</Card>
	);
}
