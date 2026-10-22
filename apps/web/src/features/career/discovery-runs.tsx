import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { StatTile } from "../discover/stat";
import { summaryLabel } from "./preparation";
import { useCareerTime } from "./shared";
import { orpc } from "@/libs/orpc/client";

export type Run = RouterOutput["career"]["runs"]["items"][number];
type Job = Run["jobs"][number];

const PAGE_SIZE = 10;

export const outcomeLabel = (outcome: Run["report"]["outcome"]) =>
	({ success: t`Succeeded`, partial: t`Partly succeeded`, failed: t`Failed` })[outcome];

export const outcomeBadge = (outcome: Run["report"]["outcome"]) =>
	outcome === "failed" ? "danger" : outcome === "partial" ? "warn" : "ok";

type DiscoveryRunsProps = { className?: string };

/**
 * Discover → Search activity: when discovery last ran and next will, and a paged table of every run. Each run opens on
 * its own page with the jobs it found and every result. Hidden until a discovery schedule exists.
 */
export function DiscoveryRuns({ className }: DiscoveryRunsProps) {
	const [page, setPage] = useState(0);
	const { when } = useCareerTime();
	const { data: schedules } = useQuery({
		...orpc.career.schedules.queryOptions({ input: {} }),
		refetchInterval: (query) => (query.state.data?.some((row) => row.activeRun) ? 5_000 : false),
	});
	const schedule =
		schedules
			?.filter((row) => row.kind === "discovery")
			.sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.createdAt.getTime() - a.createdAt.getTime())[0] ??
		null;
	const refetchInterval = (query: { state: { data: { items: Run[] } | undefined } }) =>
		schedule?.activeRun ||
		query.state.data?.items.some((run) =>
			run.jobs.some((job) =>
				[job.resume, job.letter].some((step) => step?.status === "queued" || step?.status === "running"),
			),
		)
			? 10_000
			: false;
	const { data: runs, isFetching } = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }),
		placeholderData: (previous) => previous,
		// Discovery and document preparation finish independently; keep output links current while work is pending.
		refetchInterval,
	});
	// The summary always reads the newest runs, whichever page of the table is open.
	const { data: latest } = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: 0 } }),
		refetchInterval,
	});
	if (!schedule) return null;
	const total = runs?.total ?? 0;
	const first = total === 0 ? 0 : page * PAGE_SIZE + 1;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);
	const lastRun = latest?.items[0];
	const lastSuccess = latest?.items.find((run) => run.report.outcome === "success");

	return (
		<div className={cn("grid gap-5", className)}>
			<div className="grid gap-4 sm:grid-cols-3">
				<StatTile value={lastRun ? when(lastRun.createdAt) : "—"} label={<Trans>Last attempted search</Trans>} />
				<StatTile
					value={lastSuccess ? when(lastSuccess.createdAt) : "—"}
					label={<Trans>Last fully successful run</Trans>}
				/>
				<StatTile
					value={schedule.enabled ? when(schedule.nextRunAt) : <Trans>Paused</Trans>}
					label={<Trans>Next scheduled run</Trans>}
				/>
			</div>

			<section aria-labelledby="discovery-runs" className="overflow-hidden rounded-2xl border border-line bg-surface">
				<h2
					id="discovery-runs"
					className="px-5 pt-5 pb-4 font-display text-[17px] leading-6 font-[750] tracking-[-0.035em]"
				>
					<Trans>Recent runs</Trans>
				</h2>
				{runs && runs.items.length === 0 ? (
					<p className="px-5 pb-5 text-[13px] text-ink-3">
						<Trans>No runs yet. The first one starts as soon as discovery is on.</Trans>
					</p>
				) : (
					<div className={cn("overflow-x-auto", isFetching && "opacity-70")}>
						<table className="w-full border-collapse text-start text-xs">
							<thead>
								<tr className="border-y border-line bg-bg text-ink-2">
									<Th>
										<Trans>Run</Trans>
									</Th>
									<Th>
										<Trans>Trigger</Trans>
									</Th>
									<Th>
										<Trans>Outcome</Trans>
									</Th>
									<Th>
										<Trans>New</Trans>
									</Th>
									<Th>
										<Trans>Known</Trans>
									</Th>
									<Th>
										<Trans>Rejected</Trans>
									</Th>
									<Th>
										<Trans>Unreadable</Trans>
									</Th>
									<Th>
										<span className="sr-only">
											<Trans>Actions</Trans>
										</span>
									</Th>
								</tr>
							</thead>
							<tbody>
								{runs?.items.map((run) => (
									<RunTableRow key={run.id} run={run} />
								))}
							</tbody>
						</table>
					</div>
				)}
				{total > PAGE_SIZE && (
					<nav aria-label={t`Runs pages`} className="flex items-center gap-2 border-t border-line px-5 py-3">
						<span className="me-auto text-xs text-ink-3">{t`${first}–${last} of ${total}`}</span>
						<Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
							<Trans>Newer</Trans>
						</Button>
						<Button variant="secondary" size="sm" disabled={last >= total} onClick={() => setPage(page + 1)}>
							<Trans>Older</Trans>
						</Button>
					</nav>
				)}
			</section>

			<p className="rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-xs leading-[1.75] text-ink">
				<Trans>
					Success means the run completed. It does not guarantee new jobs. Partial runs keep usable results.
				</Trans>
			</p>
		</div>
	);
}

function Th({ children }: { children: React.ReactNode }) {
	return (
		<th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[0.045em] whitespace-nowrap uppercase">
			{children}
		</th>
	);
}

function RunTableRow({ run }: { run: Run }) {
	const { when } = useCareerTime();
	const { report } = run;
	const failed = report.outcome === "failed";
	const cell = (value: number) => (failed ? "—" : value);
	return (
		<tr className="border-b border-line last:border-b-0">
			<td className="px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap">{when(run.createdAt)}</td>
			<td className="px-5 py-3.5">{report.trigger === "manual" ? t`Manual` : t`Scheduled`}</td>
			<td className="px-5 py-3.5">
				<Badge variant={outcomeBadge(report.outcome)}>{outcomeLabel(report.outcome)}</Badge>
			</td>
			<td className="px-5 py-3.5 tabular-nums">{cell(report.matches)}</td>
			<td className="px-5 py-3.5 tabular-nums">{cell(report.duplicates)}</td>
			<td className="px-5 py-3.5 tabular-nums">{cell(report.rejected)}</td>
			<td className="px-5 py-3.5 tabular-nums">{cell(report.readFailures)}</td>
			<td className="px-5 py-3.5 text-end whitespace-nowrap">
				<Link
					to="/dashboard/discover/activity"
					search={{ run: run.id }}
					className="font-semibold text-accent-text hover:underline"
				>
					{failed ? <Trans>View details</Trans> : <Trans>Open run</Trans>}
				</Link>
			</td>
		</tr>
	);
}

/** The jobs one run led to, with links to each application, posting and the documents made for it. */
export function RunJobs({ jobs }: { jobs: Job[] }) {
	return (
		<ul className="grid gap-2">
			{jobs.map((job) => (
				<JobItem key={job.opportunityId} job={job} />
			))}
		</ul>
	);
}

function JobItem({ job }: { job: Job }) {
	return (
		<li className="grid gap-1 rounded-lg bg-bg px-3 py-2.5 text-[13px]">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="min-w-0 flex-1 truncate font-semibold">
					{[job.company, job.role].filter(Boolean).join(" · ")}
				</span>
				{(job.resume || job.letter) && (
					<Badge variant={job.summary === "attention" ? "danger" : job.summary === "ready" ? "ok" : "info"}>
						{summaryLabel(job.summary)}
					</Badge>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				{job.applicationId && (
					<Link
						to="/dashboard/applications/$applicationId"
						params={{ applicationId: job.applicationId }}
						className="text-accent-text hover:underline"
					>
						<Trans>Application</Trans>
					</Link>
				)}
				<a href={job.url} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
					<Trans>Posting</Trans>
				</a>
				{job.resume?.outputId && (
					<Link
						to="/builder/$resumeId"
						params={{ resumeId: job.resume.outputId }}
						className="text-accent-text hover:underline"
					>
						<Trans>Tailored resume</Trans>
					</Link>
				)}
				{job.letter?.outputId && (
					<Link
						to="/builder/letter/$coverLetterId"
						params={{ coverLetterId: job.letter.outputId }}
						className="text-accent-text hover:underline"
					>
						<Trans>Cover letter</Trans>
					</Link>
				)}
			</div>
		</li>
	);
}
