import type { WorkspaceTabProps } from "./shell";
import type { InterviewTimelineEntry } from "@reactive-resume/schema/applications/data";
import type { InterviewSection } from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { SegmentedControl, SegmentedControlItem } from "@reactive-resume/ui/components/segmented-control";
import { downloadWithAnchor } from "@reactive-resume/utils/file";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { latest, useSavedItems } from "../hooks";
import { CountdownChip, Eyebrow, minutesUntil, useCareerTime } from "../shared";
import { DebriefTab } from "./debrief";
import { PractiseTab } from "./practise";
import { PrepareTab } from "./prepare";
import { buildIcs } from "@/features/applications/ics";
import { formatDuration, interviewKindOf, isInterview } from "@/features/applications/interviews";
import { orpc } from "@/libs/orpc/client";

type InterviewsProps = WorkspaceTabProps & {
	section: InterviewSection | undefined;
	/** The round being worked on; null when the application has no rounds yet. */
	round: InterviewTimelineEntry | undefined;
	onSection: (section: InterviewSection) => void;
	onRound: (id: string) => void;
	onEditRound: (id: string | null) => void;
};

const SECTIONS = () =>
	[
		{ value: "overview", label: t({ message: "Overview", context: "Interview round: its details" }) },
		{ value: "prepare", label: t({ message: "Preparation", context: "Interview round: the plan and briefing" }) },
		{ value: "practise", label: t({ message: "Practice", context: "Interview round: rehearsing answers" }) },
		{ value: "debrief", label: t({ message: "Debrief", context: "Interview round: writing up how it went" }) },
	] as const;

/**
 * Interviews: every round of this application, and for the selected round its overview, preparation and briefing,
 * practice and debrief. With no round yet, preparation and practice still work at the application level.
 */
export function InterviewsTab(props: InterviewsProps) {
	const { application, now, round, onRound, onEditRound, onSection } = props;
	const rounds = application.activity.filter(isInterview).sort((a, b) => +new Date(a.at) - +new Date(b.at));
	const ended = round ? +new Date(round.at) + round.durationMinutes * 60_000 < +now : false;
	const section: InterviewSection = props.section ?? (ended ? "debrief" : "prepare");
	// The existing tools work on one interview at a time: give them the selected round.
	const tabProps: WorkspaceTabProps = { ...props, interview: round };

	return (
		<div className="grid gap-5">
			<Rounds
				rounds={rounds}
				selected={round?.id}
				now={now}
				application={application.id}
				onSelect={onRound}
				onAdd={() => onEditRound(null)}
			/>
			<SegmentedControl
				aria-label={t`Interview section`}
				value={section}
				onValueChange={(value) => onSection(value as InterviewSection)}
				className="w-fit max-w-full overflow-x-auto"
			>
				{SECTIONS().map((item) => (
					<SegmentedControlItem key={item.value} value={item.value}>
						{item.label}
					</SegmentedControlItem>
				))}
			</SegmentedControl>
			{section === "overview" ? (
				<RoundOverview {...tabProps} onEdit={() => onEditRound(round?.id ?? null)} />
			) : section === "prepare" ? (
				<PrepareTab {...tabProps} />
			) : section === "practise" ? (
				<PractiseTab {...tabProps} />
			) : (
				<DebriefTab {...tabProps} />
			)}
		</div>
	);
}

type RoundsProps = {
	rounds: InterviewTimelineEntry[];
	selected: string | undefined;
	now: Date;
	application: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
};

function Rounds({ rounds, selected, now, application, onSelect, onAdd }: RoundsProps) {
	const { i18n } = useLingui();
	const { day, time } = useCareerTime();
	const saved = useSavedItems(application);
	return (
		<section aria-label={t`Interview rounds`} className="grid gap-2">
			<Eyebrow>
				<Trans>Rounds</Trans>
			</Eyebrow>
			<div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
				{rounds.map((round) => {
					const end = +new Date(round.at) + round.durationMinutes * 60_000;
					const done = end < +now;
					const kind = interviewKindOf(round.kind)?.label ?? round.kind;
					const briefing = Boolean(latest(saved.data, "briefing", round.id));
					const debrief = Boolean(latest(saved.data, "debrief", round.id));
					return (
						<button
							key={round.id}
							type="button"
							aria-pressed={selected === round.id}
							onClick={() => onSelect(round.id)}
							className={cn(
								"grid min-w-44 shrink-0 gap-0.5 rounded-xl border bg-surface p-3 text-start transition-colors duration-quick hover:bg-hover",
								selected === round.id ? "border-ink" : "border-line",
							)}
						>
							<span className="text-sm font-semibold">{t`${kind} interview`}</span>
							<span className="text-xs text-ink-2">
								{day(round.at)} · {time(round.at)} · {formatDuration(round.durationMinutes, i18n.locale)}
							</span>
							<span className="flex flex-wrap gap-x-2 text-xs text-ink-3">
								<span>{done ? t`Done` : t`Upcoming`}</span>
								{briefing && <span>{t`Briefing`}</span>}
								{debrief && <span>{t`Debrief`}</span>}
							</span>
						</button>
					);
				})}
				<Button variant="secondary" className="shrink-0 self-stretch" onClick={onAdd}>
					<Icon name="plus" size={18} />
					<Trans>Add interview</Trans>
				</Button>
			</div>
			{rounds.length === 0 && (
				<p className="text-xs text-ink-3">
					<Trans>
						Add a round to plan for it. Until then, preparation and practice work for the application as a whole.
					</Trans>
				</p>
			)}
		</section>
	);
}

type OverviewProps = WorkspaceTabProps & { onEdit: () => void };

function RoundOverview({ application, interview, now, onEdit }: OverviewProps) {
	const { i18n } = useLingui();
	const { day, time, when } = useCareerTime();
	const schedules = useQuery(orpc.career.schedules.queryOptions({ input: {} }));
	if (!interview)
		return (
			<p className="max-w-prose rounded-xl border border-dashed border-line-2 p-5 text-sm text-ink-2">
				<Trans>No round selected. Add an interview to see its details, people and reminders here.</Trans>
			</p>
		);
	const kind = interviewKindOf(interview.kind)?.label ?? interview.kind;
	const reminders = (schedules.data ?? []).filter((row) => row.kind === "prepare" && row.interviewId === interview.id);
	const lead = (value: string | null) =>
		value === "2h" ? t`2 hours before` : value === "morning" ? t`The morning of` : t`24 hours before`;
	const addToCalendar = () => {
		const start = new Date(interview.at);
		const people = interview.participants.map((person) => [person.name, person.role].filter(Boolean).join(", "));
		const ics = buildIcs({
			uid: interview.id,
			title: `${kind} interview · ${application.role}, ${application.company}`,
			start,
			end: new Date(start.getTime() + interview.durationMinutes * 60_000),
			...(interview.location ? { location: interview.location } : {}),
			description: [people.join("\n"), interview.notes].filter(Boolean).join("\n\n"),
		});
		downloadWithAnchor(
			new Blob([ics], { type: "text/calendar" }),
			`${application.company}-interview.ics`.replace(/[^\w.-]+/g, "-"),
		);
	};
	return (
		<div className="grid gap-5">
			<section className="grid gap-3 rounded-xl border border-line bg-surface p-4">
				<div className="flex flex-wrap items-start gap-x-4 gap-y-2">
					<div className="grid min-w-0 flex-1 gap-0.5">
						<h2 className="text-base font-semibold">{t`${kind} interview`}</h2>
						<p className="text-sm text-ink-2">
							{day(interview.at)} · {time(interview.at)} · {formatDuration(interview.durationMinutes, i18n.locale)}
						</p>
						{interview.location && <p className="text-[13px] text-ink-3">{interview.location}</p>}
					</div>
					<CountdownChip at={new Date(interview.at)} now={now} />
				</div>
				<div className="flex flex-wrap gap-1.5">
					<Button size="sm" variant="secondary" onClick={onEdit}>
						<Trans>Edit or reschedule</Trans>
					</Button>
					<Button size="sm" variant="ghost" onClick={addToCalendar}>
						<Icon name="calendar-plus" size={16} />
						<Trans>Add to calendar</Trans>
					</Button>
				</div>
			</section>

			{interview.participants.length > 0 && (
				<section className="grid gap-2">
					<Eyebrow>
						<Trans>Who you'll meet</Trans>
					</Eyebrow>
					<ul className="grid gap-2 @xl:grid-cols-2">
						{interview.participants.map((person) => (
							<li key={`${person.name}-${person.role}`} className="flex items-center gap-2.5">
								<span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink-2">
									{getInitials(person.name)}
								</span>
								<span className="grid min-w-0">
									<span className="truncate text-[13px] font-semibold">{person.name}</span>
									{person.role && <span className="truncate text-xs text-ink-3">{person.role}</span>}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{interview.notes && (
				<section className="grid gap-2">
					<Eyebrow>
						<Trans>Interview notes</Trans>
					</Eyebrow>
					<p className="rounded-lg bg-sunken px-3 py-2.5 text-[13px] leading-[19px] whitespace-pre-wrap text-ink-2">
						{interview.notes}
					</p>
				</section>
			)}

			<section className="grid gap-2">
				<Eyebrow>
					<Trans>Reminders</Trans>
				</Eyebrow>
				{reminders.length === 0 ? (
					<p className="text-sm text-ink-3">
						<Trans>No briefing reminder is set for this round. Set one in Preparation.</Trans>
					</p>
				) : (
					<ul className="grid gap-1.5 text-sm">
						{reminders.map((row) => (
							<li key={row.id}>
								{row.enabled ? t`Briefing ${lead(row.lead)} · ${when(row.nextRunAt)}` : t`Briefing reminder paused`}
							</li>
						))}
					</ul>
				)}
				<Link to="/dashboard/automation" className="w-fit text-xs underline">
					<Trans>Manage schedules in Automation</Trans>
				</Link>
			</section>
			{minutesUntil(new Date(interview.at), now) < 0 && (
				<p className="text-xs text-ink-3">
					<Trans>This round is over. Use Debrief to write down how it went.</Trans>
				</p>
			)}
		</div>
	);
}
