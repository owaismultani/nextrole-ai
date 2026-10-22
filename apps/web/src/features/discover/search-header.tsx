import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { cadenceLabel, runState, stateLabel } from "../career/discovery-run";
import { failed } from "../career/section";
import { useCareerTime } from "../career/shared";
import { orpc } from "@/libs/orpc/client";

type SearchHeaderProps = { deleted: string[]; onEdit: (schedule: string) => void };

/**
 * Discover's header: the saved search, how often it runs, whether it is running or paused, and the controls. Edit
 * search opens the same editor Automation uses, so there is one place the search is defined.
 */
export function SearchHeader({ deleted, onEdit }: SearchHeaderProps) {
	const { when } = useCareerTime();
	const { data: schedules, isError } = useQuery({
		...orpc.career.schedules.queryOptions({ input: {} }),
		refetchInterval: (query) => (query.state.data?.some((row) => row.activeRun) ? 5_000 : false),
	});
	const run = useMutation(orpc.career.runSchedule.mutationOptions());
	const toggle = useMutation(orpc.career.setScheduleEnabled.mutationOptions());
	const schedule =
		schedules
			?.filter((row) => row.kind === "discovery" && !deleted.includes(row.id))
			.sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.createdAt.getTime() - a.createdAt.getTime())[0] ??
		null;

	if (isError)
		return (
			<p role="alert" className="text-sm text-danger-text">
				<Trans>Couldn't load your search.</Trans>
			</p>
		);
	if (!schedules) return <div className="h-[72px] rounded-xl border border-line bg-surface" aria-hidden="true" />;
	if (!schedule)
		return (
			<section
				aria-label={t`Saved search`}
				className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-2 px-4 py-3.5"
			>
				<p className="text-sm text-ink-2">
					<Trans>No saved search yet. Set one up and new roles will appear here.</Trans>
				</p>
				<Button variant="secondary" onClick={() => onEdit("new:discovery")}>
					<Icon name="globe-simple" size={18} />
					<Trans>Set up discovery</Trans>
				</Button>
			</section>
		);

	const state = runState(schedule);
	const busy = schedule.activeRun !== null;
	const next = !schedule.enabled
		? t`Paused`
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: t`Next run ${when(schedule.nextRunAt)}`;

	return (
		<section
			aria-label={t`Saved search`}
			className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3.5"
		>
			<div className="grid min-w-0 flex-1 basis-64 gap-0.5">
				<p className="truncate text-sm font-semibold">{schedule.query}</p>
				<p className="text-xs text-ink-3">
					{[cadenceLabel(schedule), next].join(" · ")}
					{" · "}
					<span
						className={cn(
							state === "failed" && "text-danger-text",
							state === "partial" && "text-warn-text",
							(state === "running" || state === "queued") && "text-info-text",
						)}
					>
						{stateLabel(state)}
					</span>
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					loading={run.isPending}
					disabled={busy}
					onClick={() =>
						run.mutate(
							{ id: schedule.id },
							{
								onSuccess: ({ queued }) =>
									toast.add({
										description: queued
											? t`Run queued. It starts within a minute.`
											: t`A run is already queued or running.`,
									}),
								onError: (error) => failed(error, t`Couldn't start this run.`),
							},
						)
					}
				>
					<Trans>Run now</Trans>
				</Button>
				<Button
					variant="secondary"
					size="sm"
					loading={toggle.isPending}
					onClick={() =>
						toggle.mutate(
							{ id: schedule.id, enabled: !schedule.enabled },
							{
								onSuccess: (saved) =>
									toast.add({ description: saved.enabled ? t`Discovery resumed` : t`Discovery paused` }),
								onError: (error) => failed(error, t`Couldn't change this schedule.`),
							},
						)
					}
				>
					{schedule.enabled ? <Trans>Pause</Trans> : <Trans>Resume</Trans>}
				</Button>
				<Button variant="ghost" size="sm" className="text-ink-2" onClick={() => onEdit(schedule.id)}>
					<Icon name="pencil-simple" size={18} />
					<Trans>Edit search</Trans>
				</Button>
			</div>
		</section>
	);
}
