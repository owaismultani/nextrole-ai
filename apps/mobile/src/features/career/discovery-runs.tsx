import type { Schedule } from "./hooks";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { diagnose } from "./discovery-run";
import { DiscoveryStatus } from "./discovery-status";
import { useCareerTime, useTodayQueries } from "./hooks";
import { RunResults } from "./pipeline-detail";
import { summaryLabel } from "./preparation";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Card, Text, useTheme } from "@/ui";

const PAGE_SIZE = 10;

/**
 * Career → Today: how discovery is doing and a paged history of its runs. Each run lists the jobs it found with links
 * to the application and to the resume and cover letter made for it. Hidden until a discovery schedule exists.
 */
export function DiscoveryRuns() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const [page, setPage] = useState(0);
	const [open, setOpen] = useState<string | null>(null);
	const schedules = useTodayQueries().schedules.data;
	const schedule: Schedule | undefined = schedules
		?.filter((row) => row.kind === "discovery")
		.sort(
			(a, b) =>
				Number(b.enabled) - Number(a.enabled) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)[0];
	const runs = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }),
		enabled: session.status === "signed-in" && Boolean(schedule),
		queryKey: [...orpc.career.runs.key(), session.server, page],
		placeholderData: (previous) => previous,
		refetchInterval: (query) =>
			schedule?.activeRun ||
			query.state.data?.items.some((run) =>
				run.jobs.some((job) =>
					[job.resume, job.letter].some((step) => step?.status === "queued" || step?.status === "running"),
				),
			)
				? 10_000
				: false,
	});
	if (!schedule) return null;
	const total = runs.data?.total ?? 0;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);
	return (
		<Section title={t`Discovery`}>
			<DiscoveryStatus schedule={schedule} onEnabledChange={() => undefined} />
			{runs.data && runs.data.items.length === 0 ? (
				<Text color="ink3">{t`No runs yet. The first one starts as soon as discovery is on.`}</Text>
			) : null}
			{runs.data?.items.map((run) => (
				<RunCard
					key={run.id}
					run={run}
					open={open === run.id}
					onToggle={() => setOpen(open === run.id ? null : run.id)}
				/>
			))}
			{total > PAGE_SIZE ? (
				<View style={{ gap: space.s2 }}>
					<Text color="ink3">{t`${page * PAGE_SIZE + 1}–${last} of ${total}`}</Text>
					<Button variant="secondary" label={t`Newer`} disabled={page === 0} onPress={() => setPage(page - 1)} />
					<Button variant="secondary" label={t`Older`} disabled={last >= total} onPress={() => setPage(page + 1)} />
				</View>
			) : null}
		</Section>
	);
}

type Runs = NonNullable<
	ReturnType<typeof useQuery<Awaited<ReturnType<typeof import("@/api/client").client.career.runs>>>>["data"]
>;
type Run = Runs["items"][number];

function RunCard({ run, open, onToggle }: { run: Run; open: boolean; onToggle: () => void }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const { report } = run;
	const diagnosis = diagnose(report);
	const outcome = { success: t`Succeeded`, partial: t`Partly succeeded`, failed: t`Failed` }[report.outcome];
	return (
		<Card style={{ gap: space.s2 }}>
			<Text
				variant="title"
				color={report.outcome === "failed" ? "dangerText" : report.outcome === "partial" ? "warnText" : "accentText"}
			>
				{outcome}
			</Text>
			<Text color="ink2">{`${time.when(run.createdAt)} · ${report.trigger === "manual" ? t`Started by you` : t`Scheduled`}`}</Text>
			<Text color="ink2">{t`${report.matches} new · ${report.found} found`}</Text>
			<Button variant="ghost" label={open ? t`Hide details` : t`Details`} onPress={onToggle} />
			{open ? (
				<View style={{ gap: space.s2 }}>
					<Text color="ink3">
						{t`Duplicates ${report.duplicates} · Rejected ${report.rejected} · Read failures ${report.readFailures} · Sources ${report.sources.length}`}
					</Text>
					{diagnosis ? <Text color="ink2">{diagnosis}</Text> : null}
					<Text variant="callout" color="ink3">
						{[report.queries.join(" · "), [report.provider, ...report.sources].filter(Boolean).join(" · ")]
							.filter(Boolean)
							.join("\n")}
					</Text>
					<RunResults runId={run.id} />
					{run.jobs.map((job) => (
						<View key={job.opportunityId} style={{ gap: space.s1 }}>
							<Text>{[job.company, job.role].filter(Boolean).join(" · ")}</Text>
							{job.resume || job.letter ? <Text color="infoText">{summaryLabel(job.summary)}</Text> : null}
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
						</View>
					))}
				</View>
			) : null}
		</Card>
	);
}
