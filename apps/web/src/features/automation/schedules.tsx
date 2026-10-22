import type { Kind, Lead, Schedule } from "../career/schedule-sheet";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { Switch } from "@reactive-resume/ui/components/switch";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { cadenceLabel, repeats, runState, runSummary, stateLabel } from "../career/discovery-run";
import { CareerLoadError } from "../career/load-state";
import { rollForwardRepeat, scheduleKind } from "../career/schedule-sheet";
import { failed } from "../career/section";
import { CollapseRow, Eyebrow, FilterChip, useCareerTime } from "../career/shared";
import { interviewKindOf } from "@/features/applications/interviews";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { orpc } from "@/libs/orpc/client";

type SchedulesProps = {
	deleted: string[];
	onOpenSchedule: (schedule: string) => void;
	className?: string;
};

const KIND_ORDER = ["discovery", "prepare", "follow-up"];

/**
 * Automation → Schedules: every schedule (discovery, interview preparation, follow-up reminders) with its state, a
 * switch, and a link to the application or interview it belongs to. Filterable by kind.
 */
export function Schedules({ deleted, onOpenSchedule, className }: SchedulesProps) {
	const [kindFilter, setKindFilter] = useState<string>("all");
	const queryClient = useQueryClient();
	const { day, time, when } = useCareerTime();
	const queryKey = orpc.career.schedules.queryKey({ input: {} });
	const { data: schedules, isError, refetch } = useQuery(orpc.career.schedules.queryOptions({ input: {} }));
	const applicationQuery = useQuery(applicationsListQueryOptions());
	const applications = applicationQuery.data;
	const save = useMutation({
		...orpc.career.saveSchedule.mutationOptions(),
		onMutate: (input) => {
			const previous = queryClient.getQueryData(queryKey)?.find((item) => item.id === input.id);
			queryClient.setQueryData(queryKey, (current) =>
				current?.map((item) =>
					item.id === input.id
						? {
								...item,
								enabled: input.enabled ?? item.enabled,
								nextRunAt: input.nextRunAt instanceof Date ? input.nextRunAt : item.nextRunAt,
							}
						: item,
				),
			);
			return { previous };
		},
		onSuccess: (saved, input) => {
			const { title } = scheduleKind(input.kind);
			toast.add({
				description: input.enabled ? t`${title} is on · next ${when(saved.nextRunAt)}` : t`${title} paused`,
			});
		},
		onError: (error, _input, context) => {
			const previous = context?.previous;
			if (previous)
				queryClient.setQueryData(queryKey, (current) =>
					current?.map((item) => (item.id === previous.id ? previous : item)),
				);
			failed(error, t`Couldn't change this schedule.`);
		},
	});
	// A stable order (kind, then newest): an update must not reshuffle rows that share a creation time.
	const rows = schedules
		?.filter((row) => !deleted.includes(row.id) && (kindFilter === "all" || row.kind === kindFilter))
		.sort(
			(a, b) =>
				KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
				a.id.localeCompare(b.id),
		);

	const describe = (row: Schedule) => {
		const application = applications?.find((item) => item.id === row.applicationId);
		if (row.kind === "discovery") return row.query;
		if (row.kind === "follow-up") return application ? `${application.company} · ${application.role}` : "";
		const interview = application?.activity.find((entry) => entry.type === "interview" && entry.id === row.interviewId);
		const kind = interview?.type === "interview" ? (interviewKindOf(interview.kind)?.label ?? interview.kind) : null;
		return [application?.company, kind ? t`${kind} interview` : null].filter(Boolean).join(" · ");
	};

	const status = (row: Schedule) => {
		if (!repeats(row) && row.lastQueuedAt) return t`Done · ${day(row.nextRunAt)}`;
		let line = when(row.nextRunAt);
		if (row.kind === "discovery") {
			const clock = time(row.nextRunAt);
			const next = day(row.nextRunAt);
			const days = row.intervalDays ?? 1;
			line = row.intervalMinutes
				? t`${cadenceLabel(row)} · next ${clock}`
				: days === 1
					? t`Daily at ${clock} · next ${next}`
					: days === 7
						? t`Weekly at ${clock} · next ${next}`
						: t`Every ${days} days at ${clock} · next ${next}`;
		} else if (row.kind === "prepare") {
			const lead = row.lead === "2h" ? t`2 hours before` : row.lead === "morning" ? t`Morning of` : t`24 hours before`;
			line = `${lead} · ${line}`;
		}
		return row.enabled ? line : t`Paused · ${line}`;
	};

	const setEnabled = useMutation({
		...orpc.career.setScheduleEnabled.mutationOptions(),
		onSuccess: (saved) => toast.add({ description: saved.enabled ? t`Discovery resumed` : t`Discovery paused` }),
		onError: (error) => failed(error, t`Couldn't change this schedule.`),
	});
	const toggle = (row: Schedule, enabled: boolean) => {
		// Discovery pauses and resumes on the server, which resumes with one prompt run instead of replaying missed ones.
		if (row.kind === "discovery") return setEnabled.mutate({ id: row.id, enabled });
		// A finished one-off reminder has nothing left to run: switching it on means picking a new time.
		if (enabled && !repeats(row) && row.lastQueuedAt && new Date(row.nextRunAt).getTime() <= Date.now())
			return onOpenSchedule(row.id);
		// Turning a repeating schedule back on starts from its next future run: the same time of day, or the same gap.
		const nextRunAt =
			enabled && repeats(row) ? rollForwardRepeat(new Date(row.nextRunAt), row, row.timezone) : new Date(row.nextRunAt);
		save.mutate({
			id: row.id,
			kind: row.kind as Kind,
			applicationId: row.applicationId,
			query: row.query,
			interviewId: row.interviewId,
			lead: row.lead as Lead | null,
			enabled,
			email: row.email,
			nextRunAt,
			timezone: row.timezone,
			intervalDays: row.intervalDays,
			intervalMinutes: row.intervalMinutes,
			aiProviderId: row.aiProviderId,
		});
	};

	return (
		<section
			aria-labelledby="schedules"
			className={cn("overflow-hidden rounded-xl border border-line bg-surface", className)}
		>
			<div className="flex items-center ps-4 pe-2.5 pt-3.5 pb-2.5">
				<Eyebrow className="flex-1">
					<span id="schedules">
						<Trans>Schedules</Trans>
					</span>
				</Eyebrow>
				<Button variant="ghost" size="sm" className="text-ink-2" onClick={() => onOpenSchedule("new")}>
					<Icon name="plus" size={18} />
					<Trans>Add</Trans>
				</Button>
			</div>
			<div role="group" aria-label={t`Schedule kind`} className="flex flex-wrap gap-1.5 px-4 pb-3">
				{[
					{ key: "all", label: t`All` },
					{ key: "discovery", label: t`Discovery` },
					{ key: "follow-up", label: t`Follow-up` },
					{ key: "prepare", label: t`Interview preparation` },
				].map((option) => (
					<FilterChip key={option.key} pressed={kindFilter === option.key} onClick={() => setKindFilter(option.key)}>
						{option.label}
					</FilterChip>
				))}
			</div>
			{isError || applicationQuery.isError ? (
				<div className="border-t border-line px-4 py-3">
					<CareerLoadError
						onRetry={() => {
							void refetch();
							void applicationQuery.refetch();
						}}
					/>
				</div>
			) : !rows ? (
				<Skeleton className="mx-4 mb-3 h-24" />
			) : rows.length === 0 ? (
				<p className="border-t border-line px-4 py-3 text-[13px] text-ink-3">
					{kindFilter === "all" ? <Trans>Nothing scheduled yet.</Trans> : <Trans>No schedules of this kind.</Trans>}
				</p>
			) : (
				<AnimatePresence initial={false}>
					{rows.map((row) => {
						const { icon, title } = scheduleKind(row.kind);
						const done = !repeats(row) && Boolean(row.lastQueuedAt);
						const state = row.kind === "discovery" ? runState(row) : null;
						const summary = row.kind === "discovery" ? runSummary(row) : null;
						return (
							<CollapseRow key={row.id} className="border-t border-line">
								<div className="flex items-start gap-3 px-4 py-3">
									<Icon name={icon} size={20} className="mt-px shrink-0 text-ink-2" />
									<button
										type="button"
										onClick={() => onOpenSchedule(row.id)}
										className="grid min-w-0 flex-1 gap-0.5 rounded-sm text-start"
									>
										<span className="text-sm font-semibold">{title}</span>
										<span className="line-clamp-2 text-xs leading-[17px] text-ink-2">{describe(row)}</span>
										<span className={cn("text-xs", row.enabled && !done ? "text-accent-text" : "text-ink-3")}>
											{status(row)}
										</span>
										{state && (state === "running" || state === "queued") ? (
											<span className="text-xs text-info-text">{stateLabel(state)}</span>
										) : (
											summary && (
												<span
													className={cn(
														"text-xs",
														row.lastRun?.outcome === "failed"
															? "text-danger-text"
															: row.lastRun?.outcome === "partial"
																? "text-warn-text"
																: "text-ink-3",
													)}
												>
													{summary}
												</span>
											)
										)}
									</button>
									{row.applicationId && (
										<Link
											to="/dashboard/applications/$applicationId/{-$tab}"
											params={{
												applicationId: row.applicationId,
												tab: row.kind === "prepare" ? "prepare" : undefined,
											}}
											className="mt-0.5 shrink-0 text-xs text-ink-2 underline"
										>
											{row.kind === "prepare" ? <Trans>Open interview</Trans> : <Trans>Open application</Trans>}
										</Link>
									)}
									<Switch
										aria-label={[title, describe(row)].filter(Boolean).join(" · ")}
										checked={row.enabled}
										onCheckedChange={(enabled) => toggle(row, enabled)}
										className="mt-0.5"
									/>
								</div>
							</CollapseRow>
						);
					})}
				</AnimatePresence>
			)}
			<p className="border-t border-line px-4 pt-2.5 pb-3.5 text-xs leading-[17px] text-ink-3">
				<Trans>Email copies are optional and need a verified address.</Trans>
			</p>
		</section>
	);
}
