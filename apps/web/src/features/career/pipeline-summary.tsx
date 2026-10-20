import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "@reactive-resume/utils/style";
import { Eyebrow, useCareerTime } from "./shared";
import { orpc } from "@/libs/orpc/client";

type PipelineSummaryProps = { className?: string };

/** Career → Today: one card with what the pipeline needs from you, linking to the Pipeline tab. Hidden when idle. */
export function PipelineSummary({ className }: PipelineSummaryProps) {
	const { when } = useCareerTime();
	const { data: jobs } = useQuery(orpc.career.preparations.queryOptions({ input: {} }));
	const { data: runs } = useQuery(orpc.career.runs.queryOptions({ input: { limit: 1 } }));
	const last = runs?.items[0];
	if (!last && !jobs?.length) return null;
	const ready = jobs?.filter((job) => job.summary === "ready").length ?? 0;
	const attention = jobs?.filter((job) => job.summary === "attention").length ?? 0;
	const working = jobs?.filter((job) => ["queued", "generating", "deferred"].includes(job.summary)).length ?? 0;
	return (
		<section
			aria-labelledby="pipeline-summary"
			className={cn("flex flex-col gap-2 rounded-xl border border-line bg-surface p-4", className)}
		>
			<Eyebrow>
				<span id="pipeline-summary">
					<Trans>Pipeline</Trans>
				</span>
			</Eyebrow>
			{jobs && jobs.length > 0 && (
				<p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
					<span className={ready > 0 ? "font-semibold text-accent-text" : "text-ink-3"}>
						{t`${ready} ready for review`}
					</span>
					{attention > 0 && <span className="font-semibold text-danger-text">{t`${attention} need attention`}</span>}
					{working > 0 && <span className="text-info-text">{t`${working} in progress`}</span>}
				</p>
			)}
			{last && (
				<p className="text-[13px] text-ink-3">
					{last.report.outcome === "failed"
						? t`Last discovery run failed · ${when(last.createdAt)}`
						: last.report.outcome === "partial"
							? t`Last run partly succeeded · ${last.report.matches} new · ${when(last.createdAt)}`
							: t`Last run ${last.report.matches} new · ${when(last.createdAt)}`}
				</p>
			)}
			<Link to="/dashboard/career/pipeline" className="w-fit text-[13px] underline">
				<Trans>Open Pipeline</Trans>
			</Link>
		</section>
	);
}
