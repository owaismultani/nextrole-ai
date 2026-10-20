import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { orpc } from "@/api/client";
import { AutomationSettings } from "@/features/settings/automation";
import { Screen } from "@/ui";

export default function AutomationScreen() {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			<Stack.Screen options={{ title: t`Automation` }} />
			<AutomationSettings />
		</Screen>
	);
}
