import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@reactive-resume/ui/components/badge";
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
				className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-2 bg-surface px-4 py-3.5"
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
	const paused = !schedule.enabled;
	// What the search is doing, said once: a paused search is not also "next run: paused".
	const status = paused
		? t`Paused`
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: t`Next run ${when(schedule.nextRunAt)}`;
	const lastRun = paused || state === "running" || state === "queued" ? null : stateLabel(state);
	const setEnabled = (enabled: boolean) =>
		toggle.mutate(
			{ id: schedule.id, enabled },
			{
				onSuccess: (saved) => toast.add({ description: saved.enabled ? t`Discovery resumed` : t`Discovery paused` }),
				onError: (error) => failed(error, t`Couldn't change this schedule.`),
			},
		);

	return (
		<section
			aria-label={t`Saved search`}
			className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface px-5 py-4"
		>
			<span
				aria-hidden="true"
				className={cn(
					"grid size-10 shrink-0 place-items-center rounded-[11px]",
					paused ? "bg-warn-soft text-warn-text" : "bg-accent-soft text-accent-text",
				)}
			>
				<Icon name={paused ? "pause" : "globe-simple"} size={20} />
			</span>
			<div className="grid min-w-0 flex-1 basis-64 gap-1">
				<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
					<p className="min-w-0 text-[15px] leading-snug font-bold wrap-break-word">{schedule.query}</p>
					<Badge variant={paused ? "warn" : state === "failed" ? "danger" : state === "running" ? "info" : "ok"}>
						{paused
							? t`Paused`
							: state === "failed"
								? t`Last run failed`
								: state === "running"
									? t`Running now`
									: t`On`}
					</Badge>
				</div>
				<p className="text-xs text-ink-3">
					{[cadenceLabel(schedule), paused ? null : status, lastRun].filter(Boolean).join(" · ")}
					{paused && (
						<>
							{cadenceLabel(schedule) ? " · " : ""}
							<Trans>Your existing roles are available.</Trans>
						</>
					)}
					{" · "}
					<Link to="/dashboard/automation/discovery" className="text-accent-text hover:underline">
						<Trans>Discovery settings</Trans>
					</Link>
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{paused ? (
					<Button loading={toggle.isPending} onClick={() => setEnabled(true)}>
						<Trans>Resume discovery</Trans>
					</Button>
				) : (
					<Button variant="secondary" loading={toggle.isPending} onClick={() => setEnabled(false)}>
						<Trans>Pause</Trans>
					</Button>
				)}
				<Button
					variant="secondary"
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
				<Button variant="secondary" onClick={() => onEdit(schedule.id)}>
					<Icon name="pencil-simple" size={18} />
					<Trans>Edit search</Trans>
				</Button>
			</div>
		</section>
	);
}
