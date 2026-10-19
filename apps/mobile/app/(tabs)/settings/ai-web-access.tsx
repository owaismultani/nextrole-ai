import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { orpc } from "@/api/client";
import { WebAccessSettings } from "@/features/ai/web-access";
import { Screen, Text } from "@/ui";

export default function WebAccessScreen() {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	return (
		<Screen
			onRefresh={() =>
				Promise.allSettled([
					queryClient.invalidateQueries({ queryKey: orpc.webAccess.key() }),
					queryClient.invalidateQueries({ queryKey: orpc.aiProviders.key() }),
				])
			}
		>
			<Stack.Screen options={{ title: t`Web access` }} />
			<Text color="ink2">{t`Read the job links you save. Saving and preparing jobs works without a connection.`}</Text>
			<WebAccessSettings />
		</Screen>
	);
}
