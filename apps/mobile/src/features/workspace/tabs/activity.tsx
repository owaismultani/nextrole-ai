// Activity (web workspace/activity.tsx): the application's history in one timeline: stage changes, notes, interviews, the
// versions kept when you applied, how the job was found and what was prepared for it. The step-by-step log of document
// work is kept behind "Technical details".
import type { WorkspaceTabProps } from "../shell";
import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useApplicationJourney } from "../hooks";
import { Block } from "../parts";
import { WorkspaceScreen } from "../shell";
import { useUserTime } from "@/features/application-detail/hooks";
import { getStageLabel } from "@/features/applications/stages";
import { describeEvent } from "@/features/career/pipeline-words";
import { routes } from "@/routes";
import { Banner, Button, Chip, Skeleton, Text, useTheme } from "@/ui";

export function ActivityTab() {
	return <WorkspaceScreen tab="activity">{(props) => <Activity {...props} />}</WorkspaceScreen>;
}

type Kind = "stage" | "note" | "interview" | "documents" | "discovery" | "sent";
type Entry = {
	id: string;
	at: Date;
	kind: Kind;
	text: string;
	level?: "warn" | "error";
	run?: string;
};
type Filter = "all" | "history" | "documents" | "discovery";

const DOCUMENT_EVENTS = new Set(["prep.queued", "prep.done", "prep.failed", "prep.canceled", "prep.deferred"]);

function Activity({ application }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useUserTime();
	const journey = useApplicationJourney(application.id);
	const [filter, setFilter] = useState<Filter>("all");
	const [technical, setTechnical] = useState(false);

	if (journey.isError)
		return (
			<Banner
				tone="danger"
				message={t`Couldn't load this application's history.`}
				action={{ label: t`Try again`, onPress: () => void journey.refetch() }}
			/>
		);
	if (journey.isPending) return <Skeleton height={space.s12 * 4} />;

	const entries: Entry[] = [];
	for (const entry of application.activity) {
		if (entry.type === "stage")
			entries.push({ id: entry.id, at: new Date(entry.at), kind: "stage", text: getStageLabel(entry.stage) });
		else if (entry.type === "note")
			entries.push({ id: entry.id, at: new Date(entry.at), kind: "note", text: entry.text });
		else {
			const kind = {
				screening: t`Screening`,
				technical: t`Technical`,
				behavioral: t`Behavioral`,
				onsite: t`On-site`,
				other: t`Other`,
			}[entry.kind];
			entries.push({ id: entry.id, at: new Date(entry.at), kind: "interview", text: t`${kind} interview` });
		}
	}
	if (application.sentResumeVersionId || application.sentCoverLetterVersionId)
		entries.push({
			id: "sent",
			at: new Date(application.appliedAt),
			kind: "sent",
			text: t`Versions kept when you applied`,
		});
	const found = journey.data;
	if (found) {
		entries.push({
			id: "found",
			at: new Date(found.foundAt),
			kind: "discovery",
			text: found.run ? t`Found by the search “${found.run.query}”` : t`Found by discovery`,
			...(found.run ? { run: found.run.id } : {}),
		});
		for (const event of found.events) {
			if (event.kind === "job.saved") continue;
			if (!DOCUMENT_EVENTS.has(event.kind) && !technical) continue;
			entries.push({
				id: event.id,
				at: new Date(event.at),
				kind: "documents",
				text: describeEvent(event, time.when),
				...(event.level === "error" || event.level === "warn" ? { level: event.level } : {}),
			});
		}
	}
	const shown = entries
		.filter(
			(entry) =>
				filter === "all" ||
				(filter === "history" && ["stage", "note", "interview", "sent"].includes(entry.kind)) ||
				(filter === "documents" && entry.kind === "documents") ||
				(filter === "discovery" && entry.kind === "discovery"),
		)
		.sort((a, b) => +b.at - +a.at);

	return (
		<View style={{ gap: space.s3 }}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				{(
					[
						["all", t`Everything`],
						["history", t`Stages and notes`],
						["documents", t`Documents`],
						["discovery", t`How it was found`],
					] as const
				).map(([value, label]) => (
					<Chip key={value} label={label} selected={filter === value} onPress={() => setFilter(value)} />
				))}
			</View>
			{found ? (
				<Button
					variant="ghost"
					label={technical ? t`Hide technical details` : t`Technical details`}
					onPress={() => setTechnical(!technical)}
				/>
			) : null}
			{shown.length === 0 ? (
				<Text color="ink2">{t`Nothing has happened here yet. Stage changes, notes and prepared documents appear as they do.`}</Text>
			) : (
				<Block>
					{shown.map((entry) => (
						<View key={entry.id} style={{ gap: space.s0 }}>
							<Text color={entry.level === "error" ? "dangerText" : entry.level === "warn" ? "warnText" : "ink"}>
								{entry.text}
							</Text>
							<Text variant="callout" color="ink3">
								{time.when(entry.at)}
							</Text>
							{entry.run ? (
								<Button
									variant="ghost"
									label={t`See the run`}
									onPress={() =>
										router.push({ pathname: routes.discover("activity"), params: { run: entry.run ?? "" } })
									}
								/>
							) : null}
						</View>
					))}
				</Block>
			)}
		</View>
	);
}
