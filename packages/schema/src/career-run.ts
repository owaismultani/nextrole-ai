import type { CareerRunReport, PreparationError, PreparationKind, PreparationStatus } from "./career";

/**
 * Pure logic for recurring discovery, shared by web and mobile: which cadences exist, where a schedule stands, and
 * what a run's numbers say. Words live in each app, where they are translated.
 */

type Cadence = { intervalDays: number | null; intervalMinutes: number | null };
type Minutes = 60 | 180 | 360;

/** The cadences offered for discovery, in the order shown. "m60" is every 60 minutes; "d1" every day. */
export const EVERY_VALUES: string[] = ["m60", "m180", "m360", "d1", "d3", "d7"];

/** A schedule's cadence as a form value. Daily and longer stay in days, which keep their wall-clock time. */
export const everyOf = ({ intervalDays, intervalMinutes }: Cadence) =>
	intervalMinutes ? `m${intervalMinutes}` : `d${intervalDays ?? 1}`;

/** Inverse of `everyOf`. Anything unrecognised is daily, the long-standing default. */
export function cadenceOf(every: string): { intervalDays: number | null; intervalMinutes: Minutes | null } {
	if (every === "m60" || every === "m180" || every === "m360")
		return { intervalDays: null, intervalMinutes: Number(every.slice(1)) as Minutes };
	const days = Number(every.slice(1));
	return { intervalDays: Number.isInteger(days) && days > 0 ? days : 1, intervalMinutes: null };
}

export const repeats = (row: Cadence) => Boolean(row.intervalDays || row.intervalMinutes);

/** The first run after `now` on a fixed gap of `minutes`. */
export function rollForwardMinutes(at: Date, minutes: number, now = new Date()) {
	if (at > now) return at;
	const gap = minutes * 60_000;
	return new Date(at.getTime() + (Math.floor((now.getTime() - at.getTime()) / gap) + 1) * gap);
}

export type RunState = "running" | "queued" | "paused" | "failed" | "partial" | "succeeded" | "never";

type RunRow = { enabled: boolean; activeRun: "queued" | "running" | null; lastRun: CareerRunReport | null };

/** Where a discovery schedule stands, in the order that matters when reading it. */
export function runStateOf(row: RunRow): RunState {
	if (row.activeRun === "running") return "running";
	if (row.activeRun === "queued") return "queued";
	if (!row.enabled) return "paused";
	if (!row.lastRun) return "never";
	return row.lastRun.outcome === "failed" ? "failed" : row.lastRun.outcome === "partial" ? "partial" : "succeeded";
}

export type Diagnosis = "search" | "extraction" | "stopped" | "partial" | "empty" | "repeats" | "quiet";

/**
 * What a run's numbers say, so a quiet schedule can be told apart from a broken one: the search failed, pages could
 * not be read, the same roles keep coming back, or there was simply nothing new. Null when new roles were found.
 */
export function diagnoseRun(report: CareerRunReport): Diagnosis | null {
	if (report.outcome === "failed")
		return report.failure === "search" ? "search" : report.failure === "extraction" ? "extraction" : "stopped";
	if (report.outcome === "partial") return "partial";
	if (report.found === 0) return "empty";
	if (report.matches > 0) return null;
	return report.duplicates === report.found ? "repeats" : "quiet";
}

// ---- Automation ----

export type PreparationStep = {
	kind: PreparationKind;
	status: PreparationStatus;
	error: PreparationError | null;
};

export type PreparationSummary = "skipped" | "attention" | "generating" | "deferred" | "queued" | "ready";

/**
 * Where a job's document preparation stands. Only requested, non-canceled steps count: a resume-only job is ready
 * once its resume is, and a job whose steps were all canceled is skipped rather than ready. This is about the
 * documents only, never the application's own status, and ready does not mean reviewed or sent.
 */
export function summarizePreparation(steps: PreparationStep[]): PreparationSummary {
	const live = steps.filter((step) => step.status !== "canceled");
	if (live.length === 0) return "skipped";
	if (live.some((step) => step.status === "failed")) return "attention";
	if (live.some((step) => step.status === "running")) return "generating";
	if (live.some((step) => step.status === "queued"))
		return live.every((step) => step.status !== "queued" || step.error === "daily-limit") &&
			live.some((step) => step.error === "daily-limit")
			? "deferred"
			: "queued";
	return "ready";
}

/** A job's documents as the application sees them: a summary, or `none` when nothing was ever prepared for it. */
export type ApplicationPreparation = PreparationSummary | "none";

export type WorkspaceActionInput = {
	status: "saved" | "applied" | "screening" | "interview" | "offer" | "closed";
	preparation: ApplicationPreparation;
	/** A round is still to come. */
	interviewUpcoming: boolean;
	/** A follow-up is due or overdue. */
	followUpDue: boolean;
	/** At least one offer was saved for this application. */
	hasOffer: boolean;
	/** A fit check has been run. */
	hasFit: boolean;
};

export type WorkspaceAction = {
	kind:
		| "resolve-missing"
		| "add-offer"
		| "review-offer"
		| "prepare-interview"
		| "follow-up"
		| "review-documents"
		| "check-fit"
		| "none";
	/** Where the one primary action goes. */
	tab: "summary" | "documents" | "interviews" | "messages";
	section?: "prepare";
};

/**
 * The one thing an application most needs from you, by situation, so every screen offers the same primary action: fix
 * documents that stopped, prepare for the next round, answer a follow-up, review what was made, or review an offer.
 * Closed applications need nothing. Document preparation is separate from the stage: a Saved application can have
 * documents ready, and neither means submitted.
 */
export function workspaceAction(input: WorkspaceActionInput): WorkspaceAction {
	if (input.status === "closed") return { kind: "none", tab: "summary" };
	if (input.preparation === "attention") return { kind: "resolve-missing", tab: "documents" };
	if (input.status === "offer") return { kind: input.hasOffer ? "review-offer" : "add-offer", tab: "summary" };
	if (input.interviewUpcoming) return { kind: "prepare-interview", tab: "interviews", section: "prepare" };
	if (input.followUpDue) return { kind: "follow-up", tab: "messages" };
	if (input.preparation === "ready" && input.status === "saved") return { kind: "review-documents", tab: "documents" };
	if (input.status === "saved" && !input.hasFit) return { kind: "check-fit", tab: "summary" };
	return { kind: "none", tab: "summary" };
}
