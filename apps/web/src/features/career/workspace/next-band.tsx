import type { WorkspaceTabProps } from "./shell";
import type { Application } from "@/features/applications/types";
import type { InterviewTimelineEntry } from "@reactive-resume/schema/applications/data";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { downloadWithAnchor } from "@reactive-resume/utils/file";
import { cn } from "@reactive-resume/utils/style";
import { CountdownChip, minutesUntil, useCareerTime } from "../shared";
import { actionLabel, preparationLabel, useWorkspaceState } from "./state";
import { buildIcs } from "@/features/applications/ics";
import { formatDuration, interviewKindOf } from "@/features/applications/interviews";
import { describeNextStep, getNextStep } from "@/features/applications/next-step";

type NextBandProps = {
	application: Application;
	/** The next interview still to come, or the most recent one if it just ended. */
	interview: InterviewTimelineEntry | undefined;
	now: Date;
	go: WorkspaceTabProps["go"];
	onAddOffer: () => void;
	onEditInterview: () => void;
};

/**
 * The one thing to do next, on every tab: what the application needs, the button that does it, and the state of the
 * documents, the follow-up and the next interview as small chips. An interview within the hour is highlighted.
 */
export function NextBand({ application, interview, now, go, onAddOffer, onEditInterview }: NextBandProps) {
	const { i18n } = useLingui();
	const { day, date, time } = useCareerTime();
	const state = useWorkspaceState(application, now);
	const step = getNextStep(application, now);
	const text = describeNextStep(step, application, i18n.locale);
	const upcoming = step.kind === "interview" ? step.interview : interview;
	const soon = upcoming ? minutesUntil(new Date(upcoming.at), now) <= 60 : false;
	const label = actionLabel(state.action);
	const documents = preparationLabel(state.preparation);

	const addToCalendar = () => {
		if (!upcoming) return;
		const start = new Date(upcoming.at);
		const people = upcoming.participants.map((person) => [person.name, person.role].filter(Boolean).join(", "));
		const ics = buildIcs({
			uid: upcoming.id,
			title: `${interviewKindOf(upcoming.kind)?.label ?? ""} interview · ${application.role}, ${application.company}`,
			start,
			end: new Date(start.getTime() + upcoming.durationMinutes * 60_000),
			...(upcoming.location ? { location: upcoming.location } : {}),
			description: [people.join("\n"), upcoming.notes].filter(Boolean).join("\n\n"),
		});
		downloadWithAnchor(
			new Blob([ics], { type: "text/calendar" }),
			`${application.company}-interview.ics`.replace(/[^\w.-]+/g, "-"),
		);
	};

	const chip = (tone: "ok" | "warn" | "danger" | "plain") =>
		cn(
			"inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs font-medium",
			tone === "ok" && "border-ok/40 text-ok-text",
			tone === "warn" && "border-warn/50 text-warn-text",
			tone === "danger" && "border-danger/50 text-danger-text",
			tone === "plain" && "border-line-2 text-ink-2",
		);

	return (
		<section
			aria-label={t`Next step`}
			className={cn(
				"mx-4 mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border p-4 transition-colors duration-standard md:mx-8 md:p-5",
				soon ? "border-warn bg-warn-soft/40" : "border-line bg-surface",
			)}
		>
			<span
				aria-hidden="true"
				className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text"
			>
				<Icon name={upcoming ? "calendar-dot" : text.icon} size={22} />
			</span>
			<div className="grid min-w-0 flex-1 basis-72 gap-1">
				<p className="text-[11px] font-semibold tracking-[0.11em] text-ink-3 uppercase">
					<Trans>Next step</Trans>
				</p>
				<p className="font-display text-lg leading-6 font-[750] tracking-[-0.02em]">
					{upcoming ? t`${interviewKindOf(upcoming.kind)?.label ?? ""} interview` : text.title}
				</p>
				<p className="text-[13px] text-ink-2">
					{upcoming
						? `${day(upcoming.at)} · ${time(upcoming.at)} · ${formatDuration(upcoming.durationMinutes, i18n.locale)}${upcoming.location ? ` · ${upcoming.location}` : ""}`
						: text.sub}
				</p>
				<div className="mt-1 flex flex-wrap items-center gap-1.5">
					{upcoming && <CountdownChip at={new Date(upcoming.at)} now={now} />}
					{documents && (
						<button
							type="button"
							onClick={() => go("documents")}
							className={cn(
								chip(state.preparation === "attention" ? "danger" : state.preparation === "ready" ? "ok" : "plain"),
								"transition-colors duration-quick hover:bg-hover",
							)}
						>
							<Icon name="file-text" size={14} />
							{documents}
						</button>
					)}
					{application.followUpAt && (
						<span className={chip("plain")}>
							<Icon name="bell" size={14} />
							{t`Follow-up ${date(application.followUpAt)}`}
						</span>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{upcoming ? (
					<>
						<Button size="sm" variant="ghost" onClick={addToCalendar}>
							<Icon name="calendar-plus" size={16} />
							<Trans>Add to calendar</Trans>
						</Button>
						<Button size="sm" variant="secondary" onClick={onEditInterview}>
							<Trans>Edit</Trans>
						</Button>
					</>
				) : (
					application.status !== "closed" && (
						<Button size="sm" variant="ghost" onClick={onEditInterview}>
							<Trans>Add an interview</Trans>
						</Button>
					)
				)}
				{label && (
					<Button
						onClick={() =>
							state.action.kind === "add-offer"
								? onAddOffer()
								: go(state.action.tab, state.action.section ? { section: state.action.section } : {})
						}
					>
						{label}
					</Button>
				)}
			</div>
		</section>
	);
}
