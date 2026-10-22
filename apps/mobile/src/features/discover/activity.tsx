import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActivityFeed } from "../career/activity-feed";
import { diagnose } from "../career/discovery-run";
import { DiscoveryRuns, outcomeBadge, RunJobs } from "../career/discovery-runs";
import { useCareerTime } from "../career/hooks";
import { RunResults } from "../career/pipeline-detail";
import { Section } from "../career/shared";
import { StatTile } from "./stat";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Badge, Banner, Button, Screen, Text, useTheme } from "@/ui";

/**
 * Discover → Search activity: every discovery run (scheduled or started by you), what each found, rejected or could not
 * read, and the log of what happened behind the scenes. Opening a run shows it on its own.
 */
export function SearchActivityScreen({ run }: { run?: string | undefined }) {
	const queryClient = useQueryClient();
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			{run ? (
				<RunScreen id={run} />
			) : (
				<>
					<DiscoveryRuns />
					<ActivityFeed />
				</>
			)}
		</Screen>
	);
}

/** One run, linked from the runs list, a role or a notification: its counts, the jobs it led to and every result. */
function RunScreen({ id }: { id: string }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const time = useCareerTime();
	const detail = useQuery({
		...orpc.career.runDetail.queryOptions({ input: { id } }),
		enabled: session.status === "signed-in",
		retry: false,
		queryKey: [...orpc.career.runDetail.key(), session.server, id, "focus"],
	});
	const withJobs = useQuery({
		...orpc.career.runs.queryOptions({ input: { id, limit: 1 } }),
		enabled: session.status === "signed-in",
		retry: false,
		queryKey: [...orpc.career.runs.key(), session.server, "run", id],
	});
	const back = (
		<Button variant="ghost" label={t`Search activity`} onPress={() => router.replace(routes.discover("activity"))} />
	);
	if (detail.isError)
		return (
			<>
				{back}
				<Banner tone="info" message={t`That run is no longer kept. Runs are kept for 30 days.`} />
			</>
		);
	if (!detail.data) return back;
	const { report } = detail.data;
	const diagnosis = diagnose(report);
	const outcome = { success: t`Succeeded`, partial: t`Partly succeeded`, failed: t`Failed` }[report.outcome];
	const jobs = withJobs.data?.items[0]?.jobs ?? [];
	return (
		<View style={{ gap: space.s4 }}>
			{back}
			<View style={{ gap: space.s1 }}>
				<Text variant="heading" accessibilityRole="header">
					{time.when(detail.data.createdAt)}
				</Text>
				<Badge tone={outcomeBadge(report.outcome)} label={outcome} />
				<Text variant="caption" color="ink3">
					{[
						report.trigger === "manual" ? t`Started by you` : t`Scheduled`,
						report.queries.join(" · "),
						[report.provider, ...report.sources].filter(Boolean).join(" · "),
					]
						.filter(Boolean)
						.join(" · ")}
				</Text>
			</View>
			{diagnosis ? <Banner tone={report.outcome === "success" ? "accent" : "warn"} message={diagnosis} /> : null}
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s3 }}>
				<StatTile value={report.found} label={t`Results found`} />
				<StatTile value={report.matches} label={t`New jobs`} />
				<StatTile value={report.duplicates} label={t`Already known`} />
				<StatTile value={report.rejected} label={t`Rejected`} />
				<StatTile value={report.readFailures} label={t`Unreadable`} bad={report.readFailures > 0} />
			</View>
			<Section title={t`Results`}>
				<RunResults runId={id} />
			</Section>
			{jobs.length > 0 ? (
				<Section title={t`Jobs from this run`}>
					<RunJobs jobs={jobs} />
				</Section>
			) : null}
		</View>
	);
}
