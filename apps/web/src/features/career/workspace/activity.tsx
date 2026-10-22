import type { WorkspaceTabProps } from "./shell";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { cn } from "@reactive-resume/utils/style";
import { useApplicationJourney } from "../hooks";
import { CareerLoadError } from "../load-state";
import { describeEvent } from "../pipeline-words";
import { FilterChip, useCareerTime } from "../shared";
import { interviewKindOf, isInterview } from "@/features/applications/interviews";
import { getStageLabel } from "@/features/applications/stages";

type Kind = "stage" | "note" | "interview" | "documents" | "discovery" | "sent";
type Entry = {
	id: string;
	at: Date;
	kind: Kind;
	icon: IconName;
	text: string;
	level?: "warn" | "error";
	link?: { label: string; node: React.ReactNode };
};
type Filter = "all" | "history" | "documents" | "discovery";

const DOCUMENT_EVENTS = new Set(["prep.queued", "prep.done", "prep.failed", "prep.canceled", "prep.deferred"]);

/**
 * Activity: the application's history in one timeline: stage changes, notes, interviews, the versions kept when you
 * applied, how the job was found and what was prepared for it. The step-by-step log of document work is kept behind
 * "Technical details".
 */
export function ActivityTab({ application }: WorkspaceTabProps) {
	const { when } = useCareerTime();
	const journey = useApplicationJourney(application.id);
	const [filter, setFilter] = useState<Filter>("all");
	const [technical, setTechnical] = useState(false);

	if (journey.isError) return <CareerLoadError onRetry={() => void journey.refetch()} />;
	if (journey.isPending) return <Skeleton className="h-64 rounded-xl" />;

	const entries: Entry[] = [];
	for (const entry of application.activity) {
		if (entry.type === "stage")
			entries.push({
				id: entry.id,
				at: new Date(entry.at),
				kind: "stage",
				icon: "arrow-right",
				text: getStageLabel(entry.stage),
			});
		else if (entry.type === "note")
			entries.push({ id: entry.id, at: new Date(entry.at), kind: "note", icon: "note", text: entry.text });
		else if (isInterview(entry))
			entries.push({
				id: entry.id,
				at: new Date(entry.at),
				kind: "interview",
				icon: "calendar-dot",
				text: t`${interviewKindOf(entry.kind)?.label ?? entry.kind} interview`,
			});
	}
	if (application.sentResumeVersionId || application.sentCoverLetterVersionId)
		entries.push({
			id: "sent",
			at: new Date(application.appliedAt),
			kind: "sent",
			icon: "paper-plane-tilt",
			text: t`Versions kept when you applied`,
			link: {
				label: t`Documents`,
				node: (
					<Link
						to="/dashboard/applications/$applicationId/{-$tab}"
						params={{ applicationId: application.id, tab: "documents" }}
						className="underline"
					>
						<Trans>See what you sent</Trans>
					</Link>
				),
			},
		});
	const found = journey.data;
	if (found) {
		entries.push({
			id: "found",
			at: new Date(found.foundAt),
			kind: "discovery",
			icon: "globe-simple",
			text: found.run ? t`Found by the search “${found.run.query}”` : t`Found by discovery`,
			...(found.run
				? {
						link: {
							label: t`Search activity`,
							node: (
								<Link to="/dashboard/discover/activity" search={{ run: found.run.id }} className="underline">
									<Trans>See the run</Trans>
								</Link>
							),
						},
					}
				: {}),
		});
		for (const event of found.events) {
			if (event.kind === "job.saved") continue;
			const meaningful = DOCUMENT_EVENTS.has(event.kind);
			if (!meaningful && !technical) continue;
			entries.push({
				id: event.id,
				at: new Date(event.at),
				kind: "documents",
				icon: event.level === "error" ? "warning-circle" : event.level === "warn" ? "warning" : "file-text",
				text: describeEvent(event, when),
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
		<div className="grid gap-4">
			<div role="group" aria-label={t`Show`} className="flex flex-wrap items-center gap-1.5">
				{(
					[
						["all", t`Everything`],
						["history", t`Stages and notes`],
						["documents", t`Documents`],
						["discovery", t`How it was found`],
					] as const
				).map(([value, label]) => (
					<FilterChip key={value} pressed={filter === value} onClick={() => setFilter(value)}>
						{label}
					</FilterChip>
				))}
				{found && (
					<button
						type="button"
						aria-pressed={technical}
						onClick={() => setTechnical(!technical)}
						className="ms-auto text-xs text-ink-3 underline underline-offset-3"
					>
						{technical ? <Trans>Hide technical details</Trans> : <Trans>Technical details</Trans>}
					</button>
				)}
			</div>
			{shown.length === 0 ? (
				<p className="rounded-xl border border-dashed border-line-2 p-5 text-sm text-ink-2">
					<Trans>Nothing has happened here yet. Stage changes, notes and prepared documents appear as they do.</Trans>
				</p>
			) : (
				<ol className="grid gap-0 rounded-xl border border-line bg-surface">
					{shown.map((entry) => (
						<li key={entry.id} className="flex items-start gap-3 border-t border-line px-4 py-3 first:border-t-0">
							<Icon
								name={entry.icon}
								size={20}
								className={cn(
									"mt-0.5 shrink-0",
									entry.level === "error"
										? "text-danger-text"
										: entry.level === "warn"
											? "text-warn-text"
											: "text-ink-2",
								)}
							/>
							<div className="grid min-w-0 flex-1 gap-0.5">
								<p className="text-sm whitespace-pre-wrap">{entry.text}</p>
								<p className="text-xs text-ink-3">
									{when(entry.at)}
									{entry.link && <span> · {entry.link.node}</span>}
								</p>
							</div>
						</li>
					))}
				</ol>
			)}
		</div>
	);
}
