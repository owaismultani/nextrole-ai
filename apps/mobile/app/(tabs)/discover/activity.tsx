import { useLocalSearchParams } from "expo-router";
import { SearchActivityScreen } from "@/features/discover/activity";

/** `?run=` shows one run first, linked from a role. */
export default function DiscoverActivity() {
	const { run } = useLocalSearchParams<{ run?: string }>();
	return <SearchActivityScreen run={run} />;
}
