import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { JobJourney } from "./job-journey";
import { stepMessage, summaryLabel } from "./preparation";
import { Eyebrow, useCareerTime } from "./shared";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type PreparationJob = RouterOutput["career"]["preparations"][number];
type Filter = "all" | "attention" | "ready";

const PAGE_SIZE = 5;

type PreparationListProps = { className?: string };

/**
 * Automation: each job's tailored resume and cover letter, with what to open, retry or regenerate. Hidden until
 * automation or an explicit request has prepared something. Ready for review is about the documents only.
 */
export function PreparationList({ className }: PreparationListProps) {
	const { data: jobs } = useQuery({
		...orpc.career.preparations.queryOptions({ input: {} }),
		refetchInterval: (query) =>
			query.state.data?.some((job) => job.steps.some((step) => step.status === "queued" || step.status === "running"))
				? 10_000
				: false,
	});
	const [filter, setFilter] = useState<Filter>("all");
	const [page, setPage] = useState(0);
	if (!jobs?.length) return null;
	const ready = jobs.filter((job) => job.summary === "ready").length;
	const attention = jobs.filter((job) => job.summary === "attention").length;
	const matching = filter === "all" ? jobs : jobs.filter((job) => job.summary === filter);
	const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
	const current = Math.min(page, pages - 1);
	const shown = matching.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
	const choose = (next: Filter) => {
		setFilter(next);
		setPage(0);
	};
	return (
		<section
			aria-labelledby="document-preparation"
			className={cn("overflow-hidden rounded-xl border border-line bg-surface", className)}
		>
			<div className="flex items-center gap-3 ps-4 pe-4 pt-3.5 pb-1">
				<Eyebrow className="flex-1">
					<span id="document-preparation">
						<Trans>Document preparation</Trans>
					</span>
				</Eyebrow>
				{ready > 0 && <span className="text-xs font-medium text-accent-text">{t`${ready} ready for review`}</span>}
			</div>
			<p className="px-4 pb-3 text-xs leading-[17px] text-ink-3">
				<Trans>
					Ready for review means the documents were made, not that you approved them or applied. Your application status
					is separate.
				</Trans>{" "}
				<Link to="/dashboard/automation" className="underline">
					<Trans>Automation settings</Trans>
				</Link>
			</p>
			<div className="flex flex-wrap gap-1.5 px-4 pb-3" role="group" aria-label={t`Show`}>
				<Button
					variant={filter === "all" ? "secondary" : "ghost"}
					size="sm"
					aria-pressed={filter === "all"}
					onClick={() => choose("all")}
				>
					{t`All ${jobs.length}`}
				</Button>
				<Button
					variant={filter === "attention" ? "secondary" : "ghost"}
					size="sm"
					aria-pressed={filter === "attention"}
					onClick={() => choose("attention")}
				>
					{t`Needs attention ${attention}`}
				</Button>
				<Button
					variant={filter === "ready" ? "secondary" : "ghost"}
					size="sm"
					aria-pressed={filter === "ready"}
					onClick={() => choose("ready")}
				>
					{t`Ready for review ${ready}`}
				</Button>
			</div>
			{shown.length === 0 ? (
				<p className="px-4 pb-4 text-[13px] text-ink-3">
					<Trans>Nothing here.</Trans>
				</p>
			) : (
				<ul className="grid gap-2 px-4 pb-4">
					{shown.map((job) => (
						<PreparationRow key={job.opportunityId} job={job} />
					))}
				</ul>
			)}
			{matching.length > PAGE_SIZE && (
				<nav aria-label={t`Document preparation pages`} className="flex items-center gap-2 px-4 pb-4">
					<span className="me-auto text-xs text-ink-3">
						{t`${current * PAGE_SIZE + 1}–${Math.min(matching.length, (current + 1) * PAGE_SIZE)} of ${matching.length}`}
					</span>
					<Button variant="secondary" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
						<Trans>Newer</Trans>
					</Button>
					<Button variant="secondary" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
						<Trans>Older</Trans>
					</Button>
				</nav>
			)}
		</section>
	);
}

type PreparationRowProps = {
	job: PreparationJob;
	/** On an application's own page the job's name, its link and its history are already there. */
	scope?: "all" | "application";
};

/** One job's resume and cover letter: status, what to open, retry or regenerate, gaps, freshness and source baseline. */
export function PreparationRow({ job, scope = "all" }: PreparationRowProps) {
	const { when } = useCareerTime();
	const [journeyOpen, setJourneyOpen] = useState(false);
	const queryClient = useQueryClient();
	const retry = useMutation(orpc.career.retryPreparation.mutationOptions());
	const regenerate = useMutation(orpc.career.regeneratePreparation.mutationOptions());
	const refreshed = () => {
		void queryClient.invalidateQueries({ queryKey: orpc.career.preparations.key() });
		void queryClient.invalidateQueries({ queryKey: orpc.career.runs.key() });
	};
	const failed = (error: unknown) =>
		toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback: t`That did not work.` }) });
	const tone =
		job.summary === "attention"
			? "text-danger-text"
			: job.summary === "ready"
				? "text-accent-text"
				: job.summary === "deferred" || job.summary === "queued" || job.summary === "generating"
					? "text-info-text"
					: "text-ink-3";
	return (
		<li className="grid gap-2 rounded-lg border border-line p-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="grid min-w-0 flex-1 gap-0.5">
					{scope === "all" && (
						<span className="truncate text-sm font-semibold">
							{[job.company, job.role].filter(Boolean).join(" · ")}
						</span>
					)}
					<span className={`text-xs font-medium ${tone}`}>{summaryLabel(job.summary)}</span>
				</div>
				{scope === "all" && job.applicationId && (
					<Link
						to="/dashboard/applications/$applicationId"
						params={{ applicationId: job.applicationId }}
						className="text-xs underline"
					>
						<Trans>Application</Trans>
					</Link>
				)}
			</div>
			{job.steps.map((step) => {
				const message = stepMessage(step.error);
				return (
					<div key={step.id} className="grid gap-1 border-t border-line pt-2 text-[13px]">
						<div className="flex flex-wrap items-center gap-2">
							<span className="min-w-0 flex-1 font-medium">
								{step.kind === "resume" ? t`Tailored resume` : t`Cover letter`}
								<span className="ms-2 font-normal text-ink-3">
									{step.status === "done"
										? t`Done`
										: step.status === "running"
											? t`Generating`
											: step.status === "queued"
												? t`Queued`
												: step.status === "failed"
													? t`Needs attention`
													: t`Canceled`}
								</span>
							</span>
							{step.outputId &&
								(step.kind === "resume" ? (
									<Link to="/builder/$resumeId" params={{ resumeId: step.outputId }} className="underline">
										<Trans>Open</Trans>
									</Link>
								) : (
									<Link
										to="/builder/letter/$coverLetterId"
										params={{ coverLetterId: step.outputId }}
										className="underline"
									>
										<Trans>Open</Trans>
									</Link>
								))}
							{(step.status === "failed" || step.status === "canceled") && (
								<Button
									variant="secondary"
									size="sm"
									loading={retry.isPending}
									onClick={() => retry.mutate({ id: step.id }, { onError: failed, onSuccess: refreshed })}
								>
									<Trans>Retry</Trans>
								</Button>
							)}
							{step.status !== "running" && step.status !== "queued" && (
								<Button
									variant="ghost"
									size="sm"
									loading={regenerate.isPending}
									onClick={() => regenerate.mutate({ id: step.id }, { onError: failed, onSuccess: refreshed })}
								>
									<Trans>Regenerate</Trans>
								</Button>
							)}
						</div>
						{message && <p className="text-ink-3">{message}</p>}
						{step.status === "done" && (
							<p className="text-ink-3">
								{step.baseline ? (
									step.baseline.name ? (
										<Trans>Made from your baseline “{step.baseline.name}”.</Trans>
									) : (
										<Trans>Made from a baseline resume that has since been removed.</Trans>
									)
								) : (
									<Trans>The baseline it was made from was not recorded.</Trans>
								)}
							</p>
						)}
						{step.eligibleAt && (
							<p className="text-ink-3">
								<Trans>Eligible again {when(step.eligibleAt)}.</Trans>
							</p>
						)}
						{step.stale && (
							<p className="text-warn-text">
								<Trans>
									Your baseline resume or the posting changed since this was made. Regenerate for a fresh copy.
								</Trans>
							</p>
						)}
						{step.edited && (
							<p className="text-ink-3">
								<Trans>You edited this document. Regenerating makes a new copy and leaves yours untouched.</Trans>
							</p>
						)}
						{step.issues.length > 0 && (
							<details className="text-ink-2">
								<summary className="cursor-pointer text-ink-3">{t`${step.issues.length} gaps to fill`}</summary>
								<ul className="mt-1 list-disc ps-5">
									{step.issues.map((issue) => (
										<li key={issue}>{issue}</li>
									))}
								</ul>
							</details>
						)}
					</div>
				);
			})}
			{scope === "all" && (
				<details
					className="border-t border-line pt-2 text-[13px]"
					onToggle={(event) => setJourneyOpen(event.currentTarget.open)}
				>
					<summary className="cursor-pointer text-ink-3">
						<Trans>What happened for this job</Trans>
					</summary>
					<div className="mt-2">{journeyOpen && <JobJourney opportunityId={job.opportunityId} />}</div>
				</details>
			)}
		</li>
	);
}
