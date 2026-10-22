import { useLocalSearchParams } from "expo-router";
import { JobsScreen } from "@/features/discover/jobs";

/** `?job=` opens one role, linked from a run's results. */
export default function DiscoverJobs() {
	const { job } = useLocalSearchParams<{ job?: string }>();
	return <JobsScreen mode="open" job={job} />;
}
