import type { Schedule } from "./hooks";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { StatTile } from "../discover/stat";
import { useCareerTime, useTodayQueries } from "./hooks";
import { summaryLabel } from "./preparation";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Badge, Banner, Button, Card, Text, useTheme } from "@/ui";

const PAGE_SIZE = 10;

type Runs = NonNullable<
	ReturnType<typeof useQuery<Awaited<ReturnType<typeof import("@/api/client").client.career.runs>>>>["data"]
>;
export type Run = Runs["items"][number];

export const outcomeBadge = (outcome: Run["report"]["outcome"]) =>
	outcome === "failed" ? "danger" : outcome === "partial" ? "warn" : "ok";

/**
 * Discover → Search activity: when discovery last ran and next will, and a paged list of every run. Each run opens on
 * its own screen with the jobs it found and every result. Hidden until a discovery schedule exists.
 */
export function DiscoveryRuns() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const time = useCareerTime();
	const [page, setPage] = useState(0);
	const schedules = useTodayQueries().schedules.data;
	const schedule: Schedule | undefined = schedules
		?.filter((row) => row.kind === "discovery")
		.sort(
			(a, b) =>
				Number(b.enabled) - Number(a.enabled) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)[0];
	const refetchInterval = (query: { state: { data: Runs | undefined } }) =>
		schedule?.activeRun ||
		query.state.data?.items.some((run) =>
			run.jobs.some((job) =>
				[job.resume, job.letter].some((step) => step?.status === "queued" || step?.status === "running"),
			),
		)
			? 10_000
			: false;
	const runs = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }),
		enabled: session.status === "signed-in" && Boolean(schedule),
		queryKey: [...orpc.career.runs.key(), session.server, page],
		placeholderData: (previous) => previous,
		refetchInterval,
	});
	// The summary always reads the newest runs, whichever page of the list is open.
	const latest = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: 0 } }),
		enabled: session.status === "signed-in" && Boolean(schedule),
		queryKey: [...orpc.career.runs.key(), session.server, 0],
		refetchInterval,
	});
	if (!schedule) return null;
	const total = runs.data?.total ?? 0;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);
	const lastRun = latest.data?.items[0];
	const lastSuccess = latest.data?.items.find((run) => run.report.outcome === "success");
	return (
		<View style={{ gap: space.s4 }}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s3 }}>
				<StatTile value={lastRun ? time.when(lastRun.createdAt) : "—"} label={t`Last attempted search`} />
				<StatTile value={lastSuccess ? time.when(lastSuccess.createdAt) : "—"} label={t`Last fully successful run`} />
				<StatTile value={schedule.enabled ? time.when(schedule.nextRunAt) : t`Paused`} label={t`Next scheduled run`} />
			</View>
			<Section title={t`Recent runs`}>
				{runs.data && runs.data.items.length === 0 ? (
					<Text color="ink3">{t`No runs yet. The first one starts as soon as discovery is on.`}</Text>
				) : null}
				{runs.data?.items.map((run) => (
					<RunCard key={run.id} run={run} />
				))}
				{total > PAGE_SIZE ? (
					<View style={{ gap: space.s2 }}>
						<Text color="ink3">{t`${page * PAGE_SIZE + 1}–${last} of ${total}`}</Text>
						<Button variant="secondary" label={t`Newer`} disabled={page === 0} onPress={() => setPage(page - 1)} />
						<Button variant="secondary" label={t`Older`} disabled={last >= total} onPress={() => setPage(page + 1)} />
					</View>
				) : null}
			</Section>
			<Banner
				tone="accent"
				message={t`Success means the run completed. It does not guarantee new jobs. Partial runs keep usable results.`}
			/>
		</View>
	);
}

function RunCard({ run }: { run: Run }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const { report } = run;
	const failed = report.outcome === "failed";
	const outcome = { success: t`Succeeded`, partial: t`Partly succeeded`, failed: t`Failed` }[report.outcome];
	return (
		<Card style={{ gap: space.s2 }}>
			<View style={{ flexDirection: "row", alignItems: "center", gap: space.s2 }}>
				<Text weight={600} style={{ flex: 1 }}>
					{time.when(run.createdAt)}
				</Text>
				<Badge tone={outcomeBadge(report.outcome)} label={outcome} />
			</View>
			<Text color="ink2">{report.trigger === "manual" ? t`Manual` : t`Scheduled`}</Text>
			<Text color="ink3">
				{failed
					? "—"
					: t`New ${report.matches} · Known ${report.duplicates} · Rejected ${report.rejected} · Unreadable ${report.readFailures}`}
			</Text>
			<Button
				variant="ghost"
				label={failed ? t`View details` : t`Open run`}
				onPress={() => router.push({ pathname: routes.discover("activity"), params: { run: run.id } })}
			/>
		</Card>
	);
}

/** The jobs one run led to, with links to each application, posting and the documents made for it. */
export function RunJobs({ jobs }: { jobs: Run["jobs"] }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	return (
		<View style={{ gap: space.s3 }}>
			{jobs.map((job) => (
				<Card key={job.opportunityId} style={{ gap: space.s1 }}>
					<Text weight={600}>{[job.company, job.role].filter(Boolean).join(" · ")}</Text>
					{job.resume || job.letter ? (
						<Badge
							tone={job.summary === "attention" ? "danger" : job.summary === "ready" ? "ok" : "info"}
							label={summaryLabel(job.summary)}
						/>
					) : null}
					{job.applicationId ? (
						<Button
							variant="ghost"
							label={t`Application`}
							onPress={() => router.push(routes.application(job.applicationId ?? ""))}
						/>
					) : null}
					<Button
						variant="ghost"
						label={t`Posting`}
						onPress={() => {
							if (/^https?:\/\//i.test(job.url)) void openBrowserAsync(job.url).catch(() => undefined);
						}}
					/>
					{job.resume?.outputId ? (
						<Button
							variant="secondary"
							label={t`Tailored resume`}
							onPress={() => router.push(routes.builder(job.resume?.outputId ?? ""))}
						/>
					) : null}
					{job.letter?.outputId ? (
						<Button
							variant="secondary"
							label={t`Cover letter`}
							onPress={() => router.push(routes.letter(job.letter?.outputId ?? ""))}
						/>
					) : null}
				</Card>
			))}
		</View>
	);
}
