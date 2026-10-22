import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { ActivityFeed } from "./activity-feed";
import { DiscoveryRuns } from "./discovery-runs";
import { HealthChecklist, StageMap } from "./pipeline-map";
import { PreparationList } from "./preparation-list";
import { orpc } from "@/libs/orpc/client";

/**
 * Career → Pipeline: discovery and the documents prepared for what it finds. Today keeps what needs you now and links
 * here; the long lists (runs, document steps) live in this tab.
 */
export function PipelinePage() {
	const { data } = useQuery({ ...orpc.career.overview.queryOptions({ input: { days: 7 } }), refetchInterval: 30_000 });
	return (
		<div className="flex flex-col gap-4">
			<p className="max-w-prose text-sm text-ink-3">
				<Trans>
					How discovery is doing, which jobs each run found, and the resumes and cover letters prepared for them. You
					review and apply yourself; nothing is sent to an employer.
				</Trans>
			</p>
			{data && <StageMap stages={data.stages} />}
			{data && <HealthChecklist checks={data.checks} />}
			<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
				<DiscoveryRuns />
				<PreparationList />
			</div>
			<ActivityFeed />
		</div>
	);
}
