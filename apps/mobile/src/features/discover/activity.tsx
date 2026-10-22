import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActivityFeed } from "../career/activity-feed";
import { diagnose } from "../career/discovery-run";
import { DiscoveryRuns } from "../career/discovery-runs";
import { useCareerTime } from "../career/hooks";
import { RunResults } from "../career/pipeline-detail";
import { Section } from "../career/shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, Screen, Text, useTheme } from "@/ui";

/**
 * Discover → Search activity: every discovery run (scheduled or started by you), what each found, rejected or could not
 * read, and the log of what happened behind the scenes.
 */
export function SearchActivityScreen({ run }: { run?: string | undefined }) {
	const { t } = useLingui();
	const queryClient = useQueryClient();
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			<Text color="ink3">{t`How each search went, which results became roles and which did not, and why. You review and apply yourself; nothing is sent to an employer.`}</Text>
			{run ? <FocusedRun id={run} /> : null}
			<DiscoveryRuns />
			<ActivityFeed />
		</Screen>
	);
}

/** A run linked from a role, opened on its own so it is found however far back it is in the list. */
function FocusedRun({ id }: { id: string }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const time = useCareerTime();
	const query = useQuery({
		...orpc.career.runDetail.queryOptions({ input: { id } }),
		enabled: session.status === "signed-in",
		retry: false,
		queryKey: [...orpc.career.runDetail.key(), session.server, id, "focus"],
	});
	if (query.isError) return <Banner tone="info" message={t`That run is no longer kept. Runs are kept for 30 days.`} />;
	if (!query.data) return null;
	const { report } = query.data;
	const diagnosis = diagnose(report);
	return (
		<Section title={t`Selected run`}>
			<Card style={{ gap: space.s2 }}>
				<Text weight={600}>{time.when(query.data.createdAt)}</Text>
				<Text color="ink2">{`${report.trigger === "manual" ? t`Started by you` : t`Scheduled`} · ${t`${report.matches} new · ${report.found} found`}`}</Text>
				{diagnosis ? <Text color="ink2">{diagnosis}</Text> : null}
				<View style={{ gap: space.s1 }}>
					<RunResults runId={id} />
				</View>
				<Button variant="ghost" label={t`Close`} onPress={() => router.replace(routes.discover("activity"))} />
			</Card>
		</Section>
	);
}
