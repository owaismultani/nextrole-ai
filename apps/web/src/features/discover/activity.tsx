import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Icon } from "@reactive-resume/ui/components/icon";
import { ActivityFeed } from "../career/activity-feed";
import { diagnose } from "../career/discovery-run";
import { DiscoveryRuns, outcomeBadge, outcomeLabel, RunJobs } from "../career/discovery-runs";
import { RunResults } from "../career/run-results";
import { useCareerTime } from "../career/shared";
import { StatTile } from "./stat";
import { orpc } from "@/libs/orpc/client";

type SearchActivityProps = { run: string | undefined };

/**
 * Discover → Search activity: every discovery run (scheduled or started by you), what each found, rejected or could not
 * read, and the log of what happened behind the scenes. Opening a run shows it on its own. Document preparation is
 * followed from each application and from Automation.
 */
export function SearchActivityPage({ run }: SearchActivityProps) {
	if (run) return <RunPage id={run} />;
	return (
		<div className="flex flex-col gap-5">
			<DiscoveryRuns />
			<ActivityFeed />
		</div>
	);
}

/** One run, linked from the runs table, a role or a notification: its counts, the jobs it led to and every result. */
function RunPage({ id }: { id: string }) {
	const { when } = useCareerTime();
	const detail = useQuery(orpc.career.runDetail.queryOptions({ input: { id } }));
	const withJobs = useQuery(orpc.career.runs.queryOptions({ input: { id, limit: 1 } }));
	const back = (
		<Link
			to="/dashboard/discover/activity"
			className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-2 hover:text-ink"
		>
			<Icon name="caret-left" size={16} className="rtl:-scale-x-100" />
			<Trans>Search activity</Trans>
		</Link>
	);
	if (detail.isError)
		return (
			<div className="grid gap-3">
				{back}
				<p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
					<Trans>That run is no longer kept. Runs are kept for 30 days.</Trans>
				</p>
			</div>
		);
	if (!detail.data) return <div className="grid gap-3">{back}</div>;
	const { report } = detail.data;
	const diagnosis = diagnose(report);
	const jobs = withJobs.data?.items[0]?.jobs ?? [];

	return (
		<div className="grid gap-5">
			{back}
			<header className="grid gap-1">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h2 className="font-display text-[22px] leading-7 font-[750] tracking-[-0.035em]">
						{when(detail.data.createdAt)}
					</h2>
					<Badge variant={outcomeBadge(report.outcome)}>{outcomeLabel(report.outcome)}</Badge>
				</div>
				<p className="text-xs wrap-break-word text-ink-3">
					{[
						report.trigger === "manual" ? t`Started by you` : t`Scheduled`,
						report.queries.join(" · "),
						[report.provider, ...report.sources].filter(Boolean).join(" · "),
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</header>
			{diagnosis && (
				<p
					role="status"
					className={
						report.outcome === "success"
							? "rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-[13px] text-ink"
							: "rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink"
					}
				>
					{diagnosis}
				</p>
			)}
			<div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<StatTile value={report.found} label={<Trans>Results found</Trans>} />
				<StatTile value={report.matches} label={<Trans>New jobs</Trans>} />
				<StatTile value={report.duplicates} label={<Trans>Already known</Trans>} />
				<StatTile value={report.rejected} label={<Trans>Rejected</Trans>} />
				<StatTile value={report.readFailures} label={<Trans>Unreadable</Trans>} bad={report.readFailures > 0} />
			</div>
			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
				<section aria-labelledby="run-results" className="overflow-hidden rounded-2xl border border-line bg-surface">
					<h2
						id="run-results"
						className="px-5 pt-5 pb-4 font-display text-[17px] leading-6 font-[750] tracking-[-0.035em]"
					>
						<Trans>Results</Trans>
					</h2>
					<RunResults runId={id} />
				</section>
				{jobs.length > 0 && (
					<section aria-labelledby="run-jobs" className="rounded-2xl border border-line bg-surface p-5">
						<h2 id="run-jobs" className="mb-4 font-display text-[17px] leading-6 font-[750] tracking-[-0.035em]">
							<Trans>Jobs from this run</Trans>
						</h2>
						<RunJobs jobs={jobs} />
					</section>
				)}
			</div>
		</div>
	);
}
