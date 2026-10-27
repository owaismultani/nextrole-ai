import { useLingui } from "@lingui/react/macro";
import { useRouter, Stack } from "expo-router";
import { Card, ListRow, Screen, Text } from "@/ui";

export default function AiScreen() {
	const router = useRouter();
	const { t } = useLingui();
	return (
		<Screen>
			<Stack.Screen options={{ title: t`Integrations` }} />
			<Text color="ink2">{t`The AI connections, web search and job sources that writing, coaching and discovery run on.`}</Text>
			<Card>
				<ListRow
					title={t`AI providers`}
					leading="sparkle"
					chevron
					onPress={() => router.push("/settings/ai-providers")}
				/>
				<ListRow title={t`Web access`} leading="globe" chevron onPress={() => router.push("/settings/ai-web-access")} />
				<ListRow
					title={t`Job sources`}
					leading="briefcase"
					chevron
					onPress={() => router.push("/settings/ai-job-sources")}
				/>
				<ListRow
					title={t`Report AI content`}
					leading="warning-circle"
					chevron
					onPress={() => router.push("/settings/ai-report")}
				/>
			</Card>
		</Screen>
	);
}
