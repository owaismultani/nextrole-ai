import type { RouterOutput } from "@/libs/orpc/client";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { checkFix, checkText, stageExplain, stageLabel, stageText } from "./pipeline-words";
import { useCareerTime } from "./shared";

type Overview = RouterOutput["career"]["overview"];
type State = Overview["stages"][number]["state"];

const STATE_STYLE: Record<State, { icon: IconName; tone: string; label: () => string }> = {
	ok: { icon: "check-circle", tone: "text-accent-text", label: () => t`Working` },
	running: { icon: "arrow-clockwise", tone: "text-info-text", label: () => t`Running` },
	waiting: { icon: "clock", tone: "text-info-text", label: () => t`Waiting` },
	warn: { icon: "warning", tone: "text-warn-text", label: () => t`Check` },
	failed: { icon: "warning-circle", tone: "text-danger-text", label: () => t`Problem` },
	off: { icon: "clock", tone: "text-ink-3", label: () => t`Off` },
	idle: { icon: "clock", tone: "text-ink-3", label: () => t`Not yet` },
	yours: { icon: "user-circle", tone: "text-ink", label: () => t`Your turn` },
};

/**
 * The pipeline as a row of steps, from the schedule to your own review and applications. Each step says what it is, what
 * it is doing now and why, so nothing that happens in the background is a mystery. The last two are yours.
 */
export function StageMap({ stages }: { stages: Overview["stages"] }) {
	const { when } = useCareerTime();
	return (
		<section aria-labelledby="stage-map" className="grid gap-3">
			<h2 id="stage-map" className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
				<Trans>How your search is going</Trans>
			</h2>
			<ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{stages.map((stage, index) => {
					const style = STATE_STYLE[stage.state];
					const mine = stage.state === "yours";
					return (
						<li
							key={stage.key}
							className={cn(
								"grid content-start gap-1.5 rounded-xl border p-3",
								mine ? "border-dashed border-line-2 bg-sunken" : "border-line bg-surface",
								stage.state === "failed" && "border-danger",
							)}
						>
							<div className="flex items-center gap-2 text-[13px] font-semibold">
								<span className="grid size-5 place-items-center rounded-full bg-sunken text-[11px] text-ink-2 tabular-nums">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1 truncate">{stageLabel(stage.key)}</span>
								{stage.state === "running" ? (
									<Spinner decorative className="size-4" />
								) : (
									<Icon name={style.icon} size={16} className={style.tone} />
								)}
							</div>
							<p className={cn("text-[13px] font-medium", style.tone)}>
								<span className="sr-only">{style.label()}: </span>
								{stageText(stage, when)}
							</p>
							<p className="text-xs leading-[17px] text-ink-3">{stageExplain(stage.key)}</p>
						</li>
					);
				})}
			</ol>
			<p className="text-xs text-ink-3">
				<Trans>
					Dashed steps are yours. The system prepares drafts and stops there: you review and apply, and nothing is sent
					to an employer for you.
				</Trans>
			</p>
		</section>
	);
}

/** Everything that has to be working for the pipeline to run, each with its answer and a fix when it is not fine. */
export function HealthChecklist({ checks }: { checks: Overview["checks"] }) {
	const { when } = useCareerTime();
	const problems = checks.filter((check) => check.status === "fail" || check.status === "warn").length;
	return (
		<section aria-labelledby="health" className="grid gap-3 rounded-xl border border-line bg-surface p-4">
			<h2 id="health" className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
				<Trans>Is everything working?</Trans>
				<span className={cn("tracking-normal normal-case", problems ? "text-warn-text" : "text-accent-text")}>
					{problems === 0 ? t`Yes` : t`${problems} to look at`}
				</span>
			</h2>
			<ul className="grid gap-2">
				{checks.map((check) => {
					const fix = checkFix(check);
					const icon: IconName =
						check.status === "ok"
							? "check-circle"
							: check.status === "info"
								? "info"
								: check.status === "warn"
									? "warning"
									: "warning-circle";
					const tone =
						check.status === "ok"
							? "text-accent-text"
							: check.status === "info"
								? "text-ink-3"
								: check.status === "warn"
									? "text-warn-text"
									: "text-danger-text";
					return (
						<li key={check.key} className="flex items-start gap-2 text-[13px]">
							<Icon name={icon} size={18} className={cn("mt-px shrink-0", tone)} />
							<span className="min-w-0 flex-1 text-ink-2">{checkText(check, when)}</span>
							{fix && (
								<Link to={fix} className="shrink-0 underline">
									<Trans>Fix</Trans>
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
