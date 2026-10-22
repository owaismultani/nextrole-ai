import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityFeed } from "./activity-feed";
import { DiscoveryRuns } from "./discovery-runs";
import { PipelineHealth } from "./pipeline-map";
import { PreparationList } from "./preparation-list";
import { orpc } from "@/api/client";
import { Screen, Text } from "@/ui";

/**
 * Career → Pipeline: discovery and the documents prepared for what it finds. Today keeps what needs you now and links
 * here; the long lists (runs, document steps) live in this tab.
 */
export function PipelineScreen() {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			<Text color="ink3">{t`How discovery is doing, which jobs each run found, and the resumes and cover letters prepared for them. You review and apply yourself; nothing is sent to an employer.`}</Text>
			<PipelineHealth />
			<DiscoveryRuns />
			<PreparationList />
			<ActivityFeed />
		</Screen>
	);
}
