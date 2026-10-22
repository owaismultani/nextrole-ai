import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ActivityFeed } from "../career/activity-feed";
import { diagnose } from "../career/discovery-run";
import { DiscoveryRuns } from "../career/discovery-runs";
import { RunResults } from "../career/run-results";
import { useCareerTime } from "../career/shared";
import { orpc } from "@/libs/orpc/client";

type SearchActivityProps = { run: string | undefined };

/**
 * Discover → Search activity: every discovery run (scheduled or started by you), what each found, rejected or could not
 * read, and the log of what happened behind the scenes. Document preparation is followed from each application and
 * from Automation.
 */
export function SearchActivityPage({ run }: SearchActivityProps) {
	return (
		<div className="flex flex-col gap-4">
			<p className="max-w-prose text-sm text-ink-3">
				<Trans>
					How each search went, which results became roles and which did not, and why. You review and apply yourself;
					nothing is sent to an employer.
				</Trans>
			</p>
			{run && <FocusedRun id={run} />}
			<DiscoveryRuns />
			<ActivityFeed />
		</div>
	);
}

/** A run linked from a role or a notification, opened on its own so it is found however far back it is in the list. */
function FocusedRun({ id }: { id: string }) {
	const { when } = useCareerTime();
	const { data, isError } = useQuery(orpc.career.runDetail.queryOptions({ input: { id } }));
	if (isError)
		return (
			<p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
				<Trans>That run is no longer kept. Runs are kept for 30 days.</Trans>
			</p>
		);
	if (!data) return null;
	const { report } = data;
	const diagnosis = diagnose(report);
	return (
		<section aria-label={t`Selected run`} className="grid gap-3 rounded-xl border border-ink bg-surface p-4">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
				<h2 className="text-[15px] font-semibold">{when(data.createdAt)}</h2>
				<span className="text-ink-3">{report.trigger === "manual" ? t`Started by you` : t`Scheduled`}</span>
				<span className="text-ink-2">{t`${report.matches} new · ${report.found} found`}</span>
				<Link to="/dashboard/discover/activity" className="ms-auto text-xs underline">
					<Trans>Close</Trans>
				</Link>
			</div>
			{diagnosis && <p className="text-[13px] text-ink-2">{diagnosis}</p>}
			<p className="text-xs break-words text-ink-3">
				{[report.queries.join(" · "), [report.provider, ...report.sources].filter(Boolean).join(" · ")]
					.filter(Boolean)
					.join(" — ")}
			</p>
			<RunResults runId={id} />
		</section>
	);
}
