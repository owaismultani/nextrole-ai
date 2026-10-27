import type { WorkspaceTabProps } from "../shell";
// Interviews (web workspace/interviews.tsx): every round of this application, and for the selected round its overview,
// preparation and briefing, practice and debrief. With no round yet, preparation and practice still work at the
// application level.
import type { InterviewTimelineEntry } from "@reactive-resume/schema/applications/data";
import type { InterviewSection } from "@reactive-resume/schema/career";
import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { latest, useSavedItems, useSchedules } from "../hooks";
import { Actions, Block } from "../parts";
import { WorkspaceScreen } from "../shell";
import { DebriefBody } from "./debrief";
import { Practise } from "./practise";
import { Prepare } from "./prepare";
import { useUserTime } from "@/features/application-detail/hooks";
import { routes } from "@/routes";
import { Button, Chip, Segmented, Text, useTheme } from "@/ui";

export function InterviewsTab() {
	return <WorkspaceScreen tab="interviews">{(props) => <Interviews {...props} />}</WorkspaceScreen>;
}

function Interviews(props: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const { application, now, round, section: requested, go, addInterview, editInterview } = props;
	const rounds = application.activity
		.filter((entry): entry is InterviewTimelineEntry => entry.type === "interview")
		.sort((a, b) => +new Date(a.at) - +new Date(b.at));
	const ended = round ? +new Date(round.at) + round.durationMinutes * 60_000 < +now : false;
	const section: InterviewSection = requested ?? (ended ? "debrief" : "prepare");
	// The existing tools work on one interview at a time: give them the selected round.
	const tabProps: WorkspaceTabProps = { ...props, interview: round };
	return (
		<View style={{ gap: space.s4 }}>
			<Rounds rounds={rounds} selected={round?.id} application={application.id} now={now} onAdd={addInterview} />
			<Segmented
				label={t`Interview section`}
				value={section}
				onChange={(next) => go("interviews", { section: next as InterviewSection, round: round?.id })}
				options={[
					{ value: "overview", label: t`Overview` },
					{ value: "prepare", label: t`Preparation` },
					{ value: "practise", label: t`Practice` },
					{ value: "debrief", label: t`Debrief` },
				]}
			/>
			{section === "overview" ? (
				<RoundOverview {...tabProps} onEdit={() => editInterview(round?.id ?? null)} />
			) : section === "prepare" ? (
				<Prepare {...tabProps} />
			) : section === "practise" ? (
				<Practise {...tabProps} />
			) : (
				<DebriefBody {...tabProps} />
			)}
		</View>
	);
}

type RoundsProps = {
	rounds: InterviewTimelineEntry[];
	selected: string | undefined;
	application: string;
	now: Date;
	onAdd: () => void;
};

function Rounds({ rounds, selected, application, now, onAdd }: RoundsProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useUserTime();
	const saved = useSavedItems(application);
	return (
		<Block title={t`Rounds`}>
			{rounds.length === 0 ? (
				<Text color="ink3">{t`Add a round to plan for it. Until then, preparation and practice work for the application as a whole.`}</Text>
			) : null}
			{rounds.map((round) => {
				const label = {
					screening: t`Screening`,
					technical: t`Technical`,
					behavioral: t`Behavioral`,
					onsite: t`On-site`,
					other: t`Other`,
				}[round.kind];
				const done = +new Date(round.at) + round.durationMinutes * 60_000 < now.getTime();
				const extras = [
					done ? t`Done` : t`Upcoming`,
					latest(saved.data, "briefing", round.id) ? t`Briefing` : "",
					latest(saved.data, "debrief", round.id) ? t`Debrief` : "",
				]
					.filter(Boolean)
					.join(" · ");
				return (
					<View key={round.id} style={{ gap: space.s1 }}>
						<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s2 }}>
							<Chip
								label={t`${label} interview`}
								selected={selected === round.id}
								onPress={() => router.setParams({ round: round.id })}
							/>
						</View>
						<Text variant="callout" color="ink2">
							{time.when(round.at, round.timezone)} · {extras}
						</Text>
					</View>
				);
			})}
			<Button variant="secondary" label={t`Add interview`} onPress={onAdd} />
		</Block>
	);
}

function RoundOverview({ application, interview, onEdit }: WorkspaceTabProps & { onEdit: () => void }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useUserTime();
	const schedules = useSchedules();
	if (!interview)
		return (
			<Text color="ink2">{t`No round selected. Add an interview to see its details, people and reminders here.`}</Text>
		);
	const reminders = (schedules.data ?? []).filter((row) => row.kind === "prepare" && row.interviewId === interview.id);
	const lead = (value: string | null) =>
		value === "2h" ? t`2 hours before` : value === "morning" ? t`The morning of` : t`24 hours before`;
	return (
		<View style={{ gap: space.s4 }}>
			<Block title={t`This round`}>
				<Text weight={600}>{time.when(interview.at, interview.timezone)}</Text>
				<Text color="ink2">
					{[interview.location, t`${interview.durationMinutes} min`, interview.timezone].filter(Boolean).join(" · ")}
				</Text>
				<Actions>
					<Button variant="secondary" label={t`Edit or reschedule`} onPress={onEdit} />
				</Actions>
			</Block>
			{interview.participants.length > 0 ? (
				<Block title={t`Who you'll meet`}>
					{interview.participants.map((person) => (
						<Text key={`${person.name}-${person.role}`}>{[person.name, person.role].filter(Boolean).join(" · ")}</Text>
					))}
				</Block>
			) : null}
			{interview.notes ? (
				<Block title={t`Interview notes`}>
					<Text color="ink2">{interview.notes}</Text>
				</Block>
			) : null}
			<Block title={t`Reminders`}>
				{reminders.length === 0 ? (
					<Text color="ink3">{t`No briefing reminder is set for this round. Set one in Preparation.`}</Text>
				) : (
					reminders.map((row) => (
						<Text key={row.id}>
							{row.enabled ? t`Briefing ${lead(row.lead)} · ${time.when(row.nextRunAt)}` : t`Briefing reminder paused`}
						</Text>
					))
				)}
				<Button
					variant="ghost"
					label={t`Manage schedules in Automation`}
					onPress={() => router.push(routes.automation())}
				/>
			</Block>
			<Text variant="callout" color="ink3">
				{t`${application.company} · ${application.role}`}
			</Text>
		</View>
	);
}
