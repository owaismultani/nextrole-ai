import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { useCareerTime } from "./hooks";
import { describeEvent } from "./pipeline-words";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { Button, Card, Text, useTheme } from "@/ui";

const PAGE_SIZE = 20;

/** Career → Pipeline: what the pipeline did, newest first, kept for 30 days. Filter to problems to see what needs a look. */
export function ActivityFeed() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const time = useCareerTime();
	const [page, setPage] = useState(0);
	const [problems, setProblems] = useState(false);
	const query = useQuery({
		...orpc.career.activity.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, problems } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.activity.key(), session.server, page, problems],
		placeholderData: (previous) => previous,
		refetchInterval: 30_000,
	});
	const total = query.data?.total ?? 0;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);
	return (
		<Section title={t`Activity`}>
			<Text color="ink3">{t`What happened behind the scenes, kept for 30 days.`}</Text>
			<Button
				variant={problems ? "secondary" : "ghost"}
				label={problems ? t`Showing only problems` : t`Only problems`}
				onPress={() => {
					setProblems(!problems);
					setPage(0);
				}}
			/>
			{query.data && query.data.items.length === 0 ? (
				<Text color="ink3">
					{problems
						? t`No problems. Everything has been running smoothly.`
						: t`Nothing yet. Activity appears here after the first run.`}
				</Text>
			) : null}
			<Card style={{ gap: space.s2 }}>
				{query.data?.items.map((event) => (
					<View key={event.id} style={{ gap: space.s0 }}>
						<Text color={event.level === "error" ? "dangerText" : event.level === "warn" ? "warnText" : "ink"}>
							{describeEvent(event, time.when)}
						</Text>
						<Text variant="callout" color="ink3">
							{time.when(event.at)}
						</Text>
					</View>
				))}
			</Card>
			{total > PAGE_SIZE ? (
				<View style={{ gap: space.s2 }}>
					<Text color="ink3">{t`${page * PAGE_SIZE + 1}–${last} of ${total}`}</Text>
					<Button variant="secondary" label={t`Newer`} disabled={page === 0} onPress={() => setPage(page - 1)} />
					<Button variant="secondary" label={t`Older`} disabled={last >= total} onPress={() => setPage(page + 1)} />
				</View>
			) : null}
		</Section>
	);
}
