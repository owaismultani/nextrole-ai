import type { Schedule } from "./hooks";
import type { RunState } from "@reactive-resume/schema/career-run";
import { plural, t } from "@lingui/core/macro";
import { cadenceOf, diagnoseRun, runStateOf } from "@reactive-resume/schema/career-run";

type RunReport = NonNullable<Schedule["lastRun"]>;

// The words for cadences and runs. The logic they describe is shared with web in `career-run`.

/** "Hourly", "Every 3 hours", "Daily", ... for a saved cadence. */
export function cadenceLabel(row: Pick<Schedule, "intervalDays" | "intervalMinutes">) {
	const hours = (row.intervalMinutes ?? 0) / 60;
	if (hours === 1) return t`Hourly`;
	if (hours) return t`Every ${hours} hours`;
	const days = row.intervalDays ?? 1;
	if (days === 1) return t`Daily`;
	if (days === 7) return t`Weekly`;
	return t`Every ${days} days`;
}

/** The label for a form value from `everyOf`. */
export function everyLabel(every: string) {
	const { intervalDays, intervalMinutes } = cadenceOf(every);
	if (intervalMinutes) return intervalMinutes === 60 ? t`Every hour` : t`Every ${intervalMinutes / 60} hours`;
	const days = intervalDays ?? 1;
	if (days === 1) return t`Every day`;
	if (days === 7) return t`Every week`;
	return t`Every ${days} days`;
}

export const runState = (row: Schedule): RunState => runStateOf(row);

export const stateLabel = (state: RunState) =>
	({
		running: t`Running now`,
		queued: t`Run queued`,
		paused: t`Paused`,
		failed: t`Last run failed`,
		partial: t`Last run partly succeeded`,
		succeeded: t`Last run succeeded`,
		never: t`Not run yet`,
	})[state];

/** Says what a run's numbers mean, so a quiet schedule can be told apart from a broken one. */
export function diagnose(report: RunReport): string | null {
	const { found, duplicates, rejected, readFailures } = report;
	const filtered = report.filtered ?? 0;
	const failedSources = (report.bySource ?? []).filter((source) => source.status === "failed").length;
	switch (diagnoseRun(report)) {
		case "search":
			return failedSources > 1
				? t`None of the sources answered. They're tried again on the next run; if this keeps happening, check their keys in Settings.`
				: t`The search did not run. Check the web search connection in Settings, then run it again.`;
		case "extraction":
			return t`The search found results, but none of their pages could be read. The sites may block automated reading.`;
		case "stopped":
			return t`The run stopped before it finished. It tries again on its own; if this keeps happening, check your search connection.`;
		case "partial":
			return readFailures > 0
				? t`${readFailures} of ${found} results could not be read, so they were skipped and will be tried again. The rest were processed.`
				: t`Some sources didn't answer this run; the others were searched. They're tried again next time.`;
		case "empty":
			return t`The search returned no results. Try broader roles or places.`;
		case "repeats":
			return t`Every result was already known. Scheduling is working; the search keeps returning the same roles, so try changing what you look for.`;
		case "quiet":
			return filtered > 0
				? t`Nothing new this run: ${duplicates} already known, ${filtered} left out by your filters and ${rejected} not open postings.`
				: t`Nothing new this run: ${duplicates} already known and ${rejected} not open postings.`;
		default:
			return null;
	}
}

/** One line for a list row: what the last run turned up, or why it didn't. */
export function runSummary(row: Schedule): string | null {
	const report = row.lastRun;
	if (!report) return null;
	if (report.outcome === "failed") return t`Last run failed`;
	const fresh = plural(report.matches, { zero: "No new roles", one: "# new role", other: "# new roles" });
	return report.outcome === "partial" && report.readFailures > 0
		? t`${fresh} · ${report.readFailures} unreadable`
		: fresh;
}
