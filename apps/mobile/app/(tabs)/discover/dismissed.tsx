import { useLocalSearchParams } from "expo-router";
import { JobsScreen } from "@/features/discover/jobs";

/** `?job=` opens one dismissed role, linked from a run's results. */
export default function DiscoverDismissed() {
	const { job } = useLocalSearchParams<{ job?: string }>();
	return <JobsScreen mode="dismissed" job={job} />;
}
