import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { orpc } from "@/api/client";
import { JobSourcesSettings } from "@/features/ai/job-sources";
import { Screen, Text } from "@/ui";

export default function JobSourcesScreen() {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	return (
		<Screen onRefresh={() => queryClient.invalidateQueries({ queryKey: orpc.jobSources.key() })}>
			<Stack.Screen options={{ title: t`Job sources` }} />
			<Text color="ink2">
				{t`Discovery already searches the free sources and the company boards you follow. These job-search services need a free key of their own to add their listings.`}
			</Text>
			<JobSourcesSettings />
		</Screen>
	);
}
