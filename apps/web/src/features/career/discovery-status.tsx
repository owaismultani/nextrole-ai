import type { RunState } from "./discovery-run";
import type { Schedule } from "./schedule-sheet";
import type { IconName } from "@reactive-resume/ui/components/icon";
import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { cadenceLabel, diagnose, runState, stateLabel } from "./discovery-run";
import { useCareerTime } from "./shared";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

const TONE: Record<RunState, { icon: IconName; className: string }> = {
	running: { icon: "arrow-clockwise", className: "text-info-text" },
	queued: { icon: "clock", className: "text-info-text" },
	paused: { icon: "clock", className: "text-ink-3" },
	failed: { icon: "warning-circle", className: "text-danger-text" },
	partial: { icon: "warning", className: "text-warn-text" },
	succeeded: { icon: "check-circle", className: "text-accent-text" },
	never: { icon: "clock", className: "text-ink-3" },
};

type DiscoveryStatusProps = {
	schedule: Schedule;
	/** Called once the schedule is paused or resumed, so an open form can follow. */
	onEnabledChange: (enabled: boolean) => void;
};

/**
 * What a discovery schedule is doing and what its last run found, with Run now and Pause. The numbers tell the three
 * causes of a quiet schedule apart: it didn't run (times), it keeps seeing the same roles (duplicates), or pages
 * couldn't be read (read failures).
 */
export function DiscoveryStatus({ schedule, onEnabledChange }: DiscoveryStatusProps) {
	const { when } = useCareerTime();
	const state = runState(schedule);
	const tone = TONE[state];
	const report = schedule.lastRun;
	const diagnosis = report ? diagnose(report) : null;
	const busy = schedule.activeRun !== null;

	const run = useMutation(orpc.career.runSchedule.mutationOptions());
	const toggle = useMutation(orpc.career.setScheduleEnabled.mutationOptions());
	const failed = (error: unknown, fallback: string) =>
		toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback, allowServerMessage: true }) });

	const onRun = () =>
		run.mutate(
			{ id: schedule.id },
			{
				onSuccess: ({ queued }) =>
					toast.add({
						description: queued ? t`Run queued. It starts within a minute.` : t`A run is already queued or running.`,
					}),
				onError: (error) => failed(error, t`Couldn't start this run.`),
			},
		);
	const onToggle = () =>
		toggle.mutate(
			{ id: schedule.id, enabled: !schedule.enabled },
			{
				onSuccess: (saved) => {
					onEnabledChange(saved.enabled);
					toast.add({ description: saved.enabled ? t`Schedule resumed` : t`Schedule paused` });
				},
				onError: (error) => failed(error, t`Couldn't change this schedule.`),
			},
		);

	const nextRun = !schedule.enabled
		? t`Paused`
		: schedule.activeRun === "queued"
			? t`Starts within a minute`
			: when(schedule.nextRunAt);

	return (
		<section aria-label={t`Run status`} className="grid gap-3 rounded-lg border border-line bg-surface p-3.5">
			<div className="flex flex-wrap items-center gap-2">
				<p
					role="status"
					className={cn("flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold", tone.className)}
				>
					<Icon name={tone.icon} size={18} className={cn("shrink-0", state === "running" && "animate-spin")} />
					<span className="truncate">{stateLabel(state)}</span>
				</p>
				<Button variant="secondary" size="sm" loading={run.isPending} disabled={busy} onClick={onRun}>
					<Trans>Run now</Trans>
				</Button>
				<Button variant="secondary" size="sm" loading={toggle.isPending} onClick={onToggle}>
					{schedule.enabled ? <Trans>Pause</Trans> : <Trans>Resume</Trans>}
				</Button>
			</div>

			<dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
				<Fact label={t`Last attempt`}>
					{schedule.lastAttemptedAt ? when(schedule.lastAttemptedAt) : <Trans>Never</Trans>}
				</Fact>
				<Fact label={t`Last success`}>
					{schedule.lastSucceededAt ? when(schedule.lastSucceededAt) : <Trans>Never</Trans>}
				</Fact>
				<Fact label={t`Next run · ${cadenceLabel(schedule)}`}>{nextRun}</Fact>
			</dl>

			{report && (
				<div className="grid gap-2.5 border-t border-line pt-3">
					<dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
						<Count label={t`Queries`} value={report.queries.length} />
						<Count label={t`Sources`} value={report.sources.length} />
						<Count label={t`Found`} value={report.found} />
						<Count label={t`Duplicates`} value={report.duplicates} />
						<Count label={t`Rejected`} value={report.rejected} />
						<Count label={t`New matches`} value={report.matches} tone={report.matches > 0 ? "good" : undefined} />
						<Count
							label={t`Read failures`}
							value={report.readFailures}
							tone={report.readFailures > 0 ? "bad" : undefined}
						/>
					</dl>
					{diagnosis && (
						<p
							className={cn(
								"flex gap-2 rounded-md px-2.5 py-2 text-[13px] leading-[19px]",
								report.outcome === "failed"
									? "bg-danger-soft text-danger-text"
									: report.outcome === "partial"
										? "bg-warn-soft text-warn-text"
										: "bg-sunken text-ink-2",
							)}
						>
							<Icon
								name={report.outcome === "success" ? "info" : "warning-circle"}
								size={16}
								className="mt-0.5 shrink-0"
							/>
							{diagnosis}
						</p>
					)}
					<details className="text-xs text-ink-2">
						<summary className="cursor-pointer text-ink-3">
							<Trans>Searches and sources</Trans>
						</summary>
						<ul className="mt-1.5 grid gap-1">
							{report.queries.map((query) => (
								<li key={query} className="break-words">
									{query}
								</li>
							))}
							<li className="break-words text-ink-3">
								{[report.provider, ...report.sources].filter(Boolean).join(" · ") || t`No sources`}
							</li>
						</ul>
					</details>
					<p className="text-xs text-ink-3">
						{report.trigger === "manual" ? (
							<Trans>Started by you · {when(report.at)}</Trans>
						) : (
							<Trans>Scheduled run · {when(report.at)}</Trans>
						)}
					</p>
				</div>
			)}
		</section>
	);
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-px">
			<dt className="text-ink-3">{label}</dt>
			<dd className="font-medium text-ink">{children}</dd>
		</div>
	);
}

function Count({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" | undefined }) {
	return (
		<div className="grid gap-px">
			<dt className="text-ink-3">{label}</dt>
			<dd
				className={cn(
					"text-base font-semibold tabular-nums",
					tone === "good" && "text-accent-text",
					tone === "bad" && "text-danger-text",
				)}
			>
				{value}
			</dd>
		</div>
	);
}
