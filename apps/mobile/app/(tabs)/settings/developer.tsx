import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { orpc } from "@/api/client";
import { ApiKeys } from "@/features/settings/api-keys";
import { SettingsGroup, SettingsPage } from "@/features/settings/layout";
import { useProfile } from "@/features/settings/queries";
import { ListRow, Skeleton, useTheme } from "@/ui";

/** Developer: programmatic access: API keys and the MCP server. */
export default function DeveloperScreen() {
	const { t } = useLingui();
	const router = useRouter();
	const profile = useProfile();
	const queryClient = useQueryClient();
	const { size } = useTheme();
	return (
		<SettingsPage
			title={t`Developer`}
			onRefresh={() =>
				Promise.allSettled([
					profile.refetch(),
					queryClient.invalidateQueries({ queryKey: orpc.auth.apiKeys.list.key() }),
				])
			}
		>
			{profile.isPending ? <Skeleton height={size.input} /> : null}
			{profile.data ? <ApiKeys userId={profile.data.id} /> : null}
			<SettingsGroup>
				<ListRow
					title={t`MCP server`}
					leading="terminal-window"
					chevron
					onPress={() => router.push("/settings/ai-mcp")}
				/>
			</SettingsGroup>
		</SettingsPage>
	);
}
