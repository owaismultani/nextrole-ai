import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useCareerTime } from "./hooks";
import { decisionLabel, describeEvent } from "./pipeline-words";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Button, Text, useTheme } from "@/ui";

const TONE = {
	new: "accentText",
	known: "ink3",
	rejected: "ink3",
	unreadable: "warnText",
	invalid: "ink3",
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
			<Text weight={600}>{t`Every result of this search`}</Text>
			{query.data.items.map((item) => (
				<View key={`${item.decision}-${item.url}`}>
					<Text color={TONE[item.decision]}>{decisionLabel(item.decision)}</Text>
					<Text color="ink2">{`${item.title || item.url}${item.host ? ` · ${item.host}` : ""}`}</Text>
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
							? t`${time.when(query.data.foundAt)} · Found by the search "${query.data.run.query}"`
							: t`${time.when(query.data.foundAt)} · Found by discovery`}
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
