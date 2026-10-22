import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { diagnose } from "./discovery-run";
import { summaryLabel } from "./preparation";
import { RunResults } from "./run-results";
import { Eyebrow, useCareerTime } from "./shared";
import { orpc } from "@/libs/orpc/client";

type Run = RouterOutput["career"]["runs"]["items"][number];
type Job = Run["jobs"][number];

const PAGE_SIZE = 10;

const outcomeLabel = (outcome: Run["report"]["outcome"]) =>
	({ success: t`Succeeded`, partial: t`Partly succeeded`, failed: t`Failed` })[outcome];

const outcomeTone = (outcome: Run["report"]["outcome"]) =>
	outcome === "failed" ? "text-danger-text" : outcome === "partial" ? "text-warn-text" : "text-accent-text";

type DiscoveryRunsProps = { className?: string };

/**
 * Discover → Search activity: a paged history of discovery runs. Each run lists the jobs it found with links to the
 * application and to the resume and cover letter made for it. Hidden until a discovery schedule exists.
 */
export function DiscoveryRuns({ className }: DiscoveryRunsProps) {
	const [page, setPage] = useState(0);
	const { data: schedules } = useQuery({
		...orpc.career.schedules.queryOptions({ input: {} }),
		refetchInterval: (query) => (query.state.data?.some((row) => row.activeRun) ? 5_000 : false),
	});
	const schedule =
		schedules
			?.filter((row) => row.kind === "discovery")
			.sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.createdAt.getTime() - a.createdAt.getTime())[0] ??
		null;
	const { data: runs, isFetching } = useQuery({
		...orpc.career.runs.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }),
		placeholderData: (previous) => previous,
		// Discovery and document preparation finish independently; keep output links current while work is pending.
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
	const total = runs?.total ?? 0;
	const first = total === 0 ? 0 : page * PAGE_SIZE + 1;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);

	return (
		<section
			aria-labelledby="discovery-runs"
			className={cn("overflow-hidden rounded-xl border border-line bg-surface", className)}
		>
			<div className="flex items-center ps-4 pe-4 pt-3.5 pb-2.5">
				<Eyebrow className="flex-1">
					<span id="discovery-runs">
						<Trans>Runs</Trans>
					</span>
				</Eyebrow>
			</div>
			<div className="grid gap-3 px-4 pb-4">
				{runs && runs.items.length === 0 ? (
					<p className="text-[13px] text-ink-3">
						<Trans>No runs yet. The first one starts as soon as discovery is on.</Trans>
					</p>
				) : (
					<ul className={cn("grid gap-2", isFetching && "opacity-70")}>
						{runs?.items.map((run) => (
							<RunRow key={run.id} run={run} />
						))}
					</ul>
				)}
				{total > PAGE_SIZE && (
					<nav aria-label={t`Runs pages`} className="flex items-center gap-2">
						<span className="me-auto text-xs text-ink-3">{t`${first}–${last} of ${total}`}</span>
						<Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
							<Trans>Newer</Trans>
						</Button>
						<Button variant="secondary" size="sm" disabled={last >= total} onClick={() => setPage(page + 1)}>
							<Trans>Older</Trans>
						</Button>
					</nav>
				)}
			</div>
		</section>
	);
}

function RunRow({ run }: { run: Run }) {
	const { when } = useCareerTime();
	const { report } = run;
	const diagnosis = diagnose(report);
	// The per-result detail is fetched only once the run is opened.
	const [open, setOpen] = useState(false);
	return (
		<li className="rounded-lg border border-line">
			<details className="group" onToggle={(event) => setOpen(event.currentTarget.open)}>
				<summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-[13px]">
					<span className="font-medium">{when(run.createdAt)}</span>
					<span className={cn("font-semibold", outcomeTone(report.outcome))}>{outcomeLabel(report.outcome)}</span>
					<span className="text-ink-3">{report.trigger === "manual" ? t`Started by you` : t`Scheduled`}</span>
					<span className="ms-auto text-ink-2">{t`${report.matches} new · ${report.found} found`}</span>
				</summary>
				<div className="grid gap-2.5 border-t border-line px-3 py-3">
					<dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs sm:grid-cols-6">
						<Count label={t`Found`} value={report.found} />
						<Count label={t`New`} value={report.matches} />
						<Count label={t`Duplicates`} value={report.duplicates} />
						<Count label={t`Rejected`} value={report.rejected} />
						<Count label={t`Read failures`} value={report.readFailures} bad={report.readFailures > 0} />
						<Count label={t`Sources`} value={report.sources.length} />
					</dl>
					{diagnosis && <p className="text-[13px] text-ink-2">{diagnosis}</p>}
					<p className="text-xs break-words text-ink-3">
						{[report.queries.join(" · "), [report.provider, ...report.sources].filter(Boolean).join(" · ")]
							.filter(Boolean)
							.join(" — ")}
					</p>
					{run.jobs.length > 0 && (
						<ul className="grid gap-2">
							{run.jobs.map((job) => (
								<JobRow key={job.opportunityId} job={job} />
							))}
						</ul>
					)}
					{open && <RunResults runId={run.id} />}
				</div>
			</details>
		</li>
	);
}

function JobRow({ job }: { job: Job }) {
	return (
		<li className="grid gap-1 rounded-md bg-sunken px-2.5 py-2 text-[13px]">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="min-w-0 flex-1 truncate font-medium">
					{[job.company, job.role].filter(Boolean).join(" · ")}
				</span>
				{(job.resume || job.letter) && (
					<span
						className={cn(
							"text-xs font-medium",
							job.summary === "attention"
								? "text-danger-text"
								: job.summary === "ready"
									? "text-accent-text"
									: "text-info-text",
						)}
					>
						{summaryLabel(job.summary)}
					</span>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				{job.applicationId && (
					<Link
						to="/dashboard/applications/$applicationId"
						params={{ applicationId: job.applicationId }}
						className="underline"
					>
						<Trans>Application</Trans>
					</Link>
				)}
				<a href={job.url} target="_blank" rel="noopener noreferrer" className="underline">
					<Trans>Posting</Trans>
				</a>
				{job.resume?.outputId && (
					<Link to="/builder/$resumeId" params={{ resumeId: job.resume.outputId }} className="underline">
						<Trans>Tailored resume</Trans>
					</Link>
				)}
				{job.letter?.outputId && (
					<Link
						to="/builder/letter/$coverLetterId"
						params={{ coverLetterId: job.letter.outputId }}
						className="underline"
					>
						<Trans>Cover letter</Trans>
					</Link>
				)}
			</div>
		</li>
	);
}

function Count({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
	return (
		<div className="grid gap-px">
			<dt className="text-ink-3">{label}</dt>
			<dd className={cn("text-sm font-semibold tabular-nums", bad && "text-danger-text")}>{value}</dd>
		</div>
	);
}
