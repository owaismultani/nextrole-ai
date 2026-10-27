import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { foundVia, sourceLabel } from "./discovery-sources";
import { useCareerTime } from "./hooks";
import { decisionLabel, describeEvent } from "./pipeline-words";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Badge, Button, Text, useTheme } from "@/ui";

const TONE = {
	new: "ok",
	known: "neutral",
	rejected: "neutral",
	unreadable: "warn",
	invalid: "neutral",
	filtered: "neutral",
} as const;

/** Every search result of one run and what became of it: the answer to "why wasn't that job found". */
export function RunResults({ runId }: { runId: string }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const query = useQuery({
		...orpc.career.runDetail.queryOptions({ input: { id: runId } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.runDetail.key(), session.server, runId],
	});
	if (query.isPending) return <Text color="ink3">{t`Loading results…`}</Text>;
	if (query.isError)
		return <Text color="dangerText">{t`Couldn't load this run's results. Runs are kept for 30 days.`}</Text>;
	if (query.data.items.length === 0) return <Text color="ink3">{t`No results were kept for this run.`}</Text>;
	return (
		<View style={{ gap: space.s1 }}>
			{query.data.items.map((item) => (
				<View key={`${item.decision}-${item.url}`}>
					<Badge tone={TONE[item.decision]} label={decisionLabel(item.decision)} />
					<Text color="ink2">
						{/* Job sources and boards by name; a web result by its site. */}
						{`${item.title || item.url} · ${item.source && item.source !== "web" ? sourceLabel(item.source) : item.host}`}
					</Text>
					{item.applicationId ? (
						<Button
							variant="ghost"
							label={t`Open application`}
							onPress={() => router.push(routes.application(item.applicationId ?? ""))}
						/>
					) : item.opportunityId ? (
						<Button
							variant="ghost"
							label={t`View role`}
							onPress={() => router.push({ pathname: routes.discover(), params: { job: item.opportunityId } })}
						/>
					) : null}
				</View>
			))}
			<Text variant="callout" color="ink3">{t`The first 50 results of a run are kept.`}</Text>
		</View>
	);
}

/** One job's story, oldest first: the search that found it, then each step taken for it, ending with your turn. */
export function JobJourney({ opportunityId }: { opportunityId: string }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const time = useCareerTime();
	const [open, setOpen] = useState(false);
	const query = useQuery({
		...orpc.career.journey.queryOptions({ input: { id: opportunityId } }),
		enabled: session.status === "signed-in" && open,
		queryKey: [...orpc.career.journey.key(), session.server, opportunityId],
	});
	return (
		<View style={{ gap: space.s1 }}>
			<Button
				variant="ghost"
				label={open ? t`Hide what happened` : t`What happened for this job`}
				onPress={() => setOpen(!open)}
			/>
			{open && query.isPending ? <Text color="ink3">{t`Loading…`}</Text> : null}
			{open && query.isError ? (
				<Text color="dangerText">{t`Couldn't load this job's history. It is kept for 30 days.`}</Text>
			) : null}
			{open && query.data ? (
				<>
					<Text color="ink2">
						{query.data.run
							? t`${time.when(query.data.foundAt)} · Found by the search "${query.data.run.query}" via ${foundVia(query.data)}`
							: t`${time.when(query.data.foundAt)} · Found by discovery via ${foundVia(query.data)}`}
					</Text>
					{query.data.events.map((event) => (
						<Text
							key={event.id}
							color={event.level === "error" ? "dangerText" : event.level === "warn" ? "warnText" : "ink2"}
						>
							{`${time.when(event.at)} · ${describeEvent(event, time.when)}`}
						</Text>
					))}
					<Text weight={600}>{t`Your turn: review the drafts, then apply yourself.`}</Text>
				</>
			) : null}
		</View>
	);
}
