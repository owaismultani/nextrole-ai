import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";
import type { CareerRunReport } from "@reactive-resume/schema/career";

/** The slice of an application the dashboard reads: its status, and the dated stage and interview entries. */
export type OverviewApplication = {
	id: string;
	company: string;
	role: string;
	status: ApplicationStatus;
	activity: Array<{
		type: string;
		id?: string;
		stage?: string;
		at: Date | string;
		kind?: string;
		durationMinutes?: number;
		timezone?: string;
	}>;
	appliedAt?: Date | null;
	location?: string | null;
	followUpAt?: Date | null;
	followUpNote?: string | null;
};

const time = (value: Date | string) => new Date(value).getTime();

/** How many applications reached `stage` at or after `since`: one count per application, however often it moved. */
export function reachedSince(applications: OverviewApplication[], stage: ApplicationStatus, since: Date) {
	return applications.filter((application) =>
		application.activity.some(
			(entry) => entry.type === "stage" && entry.stage === stage && time(entry.at) >= since.getTime(),
		),
	).length;
}

/** Interviews starting from `now` through `now + days`, soonest first, skipping closed applications. */
export function upcomingInterviews(applications: OverviewApplication[], now: Date, days = 7) {
	const end = now.getTime() + days * 86_400_000;
	return applications
		.filter((application) => application.status !== "closed")
		.flatMap((application) =>
			application.activity
				.filter((entry) => entry.type === "interview" && time(entry.at) >= now.getTime() && time(entry.at) <= end)
				.map((entry) => ({
					applicationId: application.id,
					interviewId: entry.id ?? null,
					company: application.company,
					role: application.role,
					at: new Date(entry.at),
					kind: entry.kind ?? "other",
					durationMinutes: entry.durationMinutes ?? 60,
					timezone: entry.timezone ?? "UTC",
				})),
		)
		.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Runs are judged over at least this long, so an hourly schedule is not called stale after a few quiet hours. */
const REPEAT_SPAN_MS = 12 * 3_600_000;

/**
 * What a run of reports (oldest first) says about discovery. `failing`: the latest run failed. `repeating`: the last
 * five runs, spanning at least twelve hours, all completed but found nothing new while still seeing known jobs, so
 * scheduling works and the search keeps returning the same results.
 */
export function discoveryHealth(reports: CareerRunReport[]) {
	const recent = reports.slice(-5);
	const failing = reports.at(-1)?.outcome === "failed";
	const first = recent[0];
	const last = recent.at(-1);
	const spans = first && last ? time(last.at) - time(first.at) >= REPEAT_SPAN_MS : false;
	const repeating =
		recent.length === 5 &&
		spans &&
		recent.every((report) => report.outcome !== "failed" && report.matches === 0 && report.duplicates > 0);
	return { failing, repeating };
}

export function sumReports(reports: CareerRunReport[]) {
	const total = { runs: reports.length, failed: 0, found: 0, matches: 0, duplicates: 0, rejected: 0, readFailures: 0 };
	for (const report of reports) {
		if (report.outcome === "failed") total.failed++;
		total.found += report.found;
		total.matches += report.matches;
		total.duplicates += report.duplicates;
		total.rejected += report.rejected;
		total.readFailures += report.readFailures;
	}
	return total;
}

// ---- The stage map ----

const STAGE_KEYS = ["schedule", "search", "read", "filter", "save", "prepare", "review", "apply"] as const;
export type StageKey = (typeof STAGE_KEYS)[number];
type StageState = "ok" | "running" | "waiting" | "warn" | "failed" | "off" | "idle" | "yours";
export type Stage = {
	key: StageKey;
	state: StageState;
	/** Why it is in this state, as a code each app turns into words. */
	code: string;
	/** A headline number for the stage, when it has one. */
	count: number | null;
	/** The moment that matters for the stage: the next run, or when waiting work may start. */
	at: Date | null;
};

export type StageInput = {
	now: Date;
	schedule: { enabled: boolean; activeRun: "queued" | "running" | null; nextRunAt: Date } | null;
	lastRun: CareerRunReport | null;
	documents: { resumes: boolean; letters: boolean };
	preparation: {
		running: number;
		queued: number;
		deferred: number;
		attention: number;
		ready: number;
		eligibleAt: Date | null;
	};
	appliedInWindow: number;
};

/**
 * Where each step of the pipeline stands, from search to your own review and applications. The last two are yours:
 * the system stops there, and says so.
 */
export function stageMap(input: StageInput): Stage[] {
	const { now, schedule, lastRun, documents, preparation } = input;
	const stage = (
		key: StageKey,
		state: StageState,
		code: string,
		count: number | null = null,
		at: Date | null = null,
	): Stage => ({
		key,
		state,
		code,
		count,
		at,
	});
	const overdue = Boolean(
		schedule?.enabled && !schedule.activeRun && schedule.nextRunAt.getTime() < now.getTime() - 10 * 60_000,
	);
	const scheduleStage = !schedule
		? stage("schedule", "off", "none")
		: !schedule.enabled
			? stage("schedule", "off", "paused")
			: schedule.activeRun
				? stage("schedule", "running", schedule.activeRun, null, null)
				: overdue
					? stage("schedule", "warn", "overdue", null, schedule.nextRunAt)
					: stage("schedule", "ok", "next", null, schedule.nextRunAt);

	const none = !lastRun;
	const searchStage = none
		? stage("search", "idle", "none")
		: lastRun.outcome === "failed" && lastRun.failure === "search"
			? stage("search", "failed", "search-failed")
			: stage("search", "ok", "searched", lastRun.found);
	const readStage = none
		? stage("read", "idle", "none")
		: lastRun.outcome === "failed" && lastRun.failure === "extraction"
			? stage("read", "failed", "none-readable", lastRun.readFailures)
			: lastRun.readFailures > 0
				? stage("read", "warn", "some-unreadable", lastRun.readFailures)
				: stage("read", "ok", "read");
	const filterStage = none
		? stage("filter", "idle", "none")
		: stage("filter", "ok", "filtered", lastRun.duplicates + lastRun.rejected);
	const saveStage = none ? stage("save", "idle", "none") : stage("save", "ok", "saved", lastRun.matches);

	const prepared =
		!documents.resumes && !documents.letters
			? stage("prepare", "off", "off")
			: preparation.running > 0
				? stage("prepare", "running", "generating", preparation.running)
				: preparation.attention > 0
					? stage("prepare", "failed", "attention", preparation.attention)
					: preparation.deferred > 0
						? stage("prepare", "waiting", "limit", preparation.deferred, preparation.eligibleAt)
						: preparation.queued > 0
							? stage("prepare", "waiting", "queued", preparation.queued, preparation.eligibleAt)
							: stage("prepare", "ok", "done", preparation.ready);

	return [
		scheduleStage,
		searchStage,
		readStage,
		filterStage,
		saveStage,
		prepared,
		preparation.ready > 0 ? stage("review", "yours", "ready", preparation.ready) : stage("review", "idle", "none"),
		stage("apply", "yours", "applied", input.appliedInWindow),
	];
}

// ---- The "is everything working" checklist ----

type CheckKey = "schedule" | "next-run" | "search" | "ai" | "baseline" | "limit" | "last-run" | "repeating";
type CheckStatus = "ok" | "warn" | "fail" | "info";
export type Check = { key: CheckKey; status: CheckStatus; at: Date | null; value: number | null };

export type CheckInput = {
	now: Date;
	schedule: { enabled: boolean; activeRun: "queued" | "running" | null; nextRunAt: Date } | null;
	lastRun: CareerRunReport | null;
	repeating: boolean;
	searchConnected: boolean;
	aiConnected: boolean;
	documents: { resumes: boolean; letters: boolean; hasBaseline: boolean; used: number; limit: number };
};

/** Everything a person would check by hand to learn why nothing is happening, each with its answer. */
export function healthChecks(input: CheckInput): Check[] {
	const { now, schedule, lastRun, documents } = input;
	const check = (key: CheckKey, status: CheckStatus, value: number | null = null, at: Date | null = null): Check => ({
		key,
		status,
		at,
		value,
	});
	const wantsDocuments = documents.resumes || documents.letters;
	const checks: Check[] = [
		check("schedule", !schedule ? "warn" : schedule.enabled ? "ok" : "info"),
		check("search", input.searchConnected ? "ok" : "fail"),
	];
	if (schedule?.enabled) {
		const overdue = !schedule.activeRun && schedule.nextRunAt.getTime() < now.getTime() - 10 * 60_000;
		checks.push(check("next-run", overdue ? "warn" : "ok", null, schedule.nextRunAt));
	}
	if (wantsDocuments) {
		checks.push(
			check("ai", input.aiConnected ? "ok" : "fail"),
			check("baseline", documents.hasBaseline ? "ok" : "fail"),
			check("limit", documents.used >= documents.limit ? "warn" : "ok", Math.max(0, documents.limit - documents.used)),
		);
	}
	if (lastRun)
		checks.push(
			check("last-run", lastRun.outcome === "failed" ? "fail" : lastRun.outcome === "partial" ? "warn" : "ok"),
		);
	if (input.repeating) checks.push(check("repeating", "warn"));
	return checks;
}

// ---- Outcomes ----

/**
 * Applications sent in the window that have since heard back: they reached screening, an interview or an offer. One
 * count per application, so a quick reply and a later offer are still one response.
 */
export function firstResponsesSince(applications: OverviewApplication[], since: Date) {
	return applications.filter((application) => {
		const applied = application.activity.some(
			(entry) => entry.type === "stage" && entry.stage === "applied" && time(entry.at) >= since.getTime(),
		);
		const replied = application.activity.some(
			(entry) =>
				entry.type === "stage" &&
				(entry.stage === "screening" || entry.stage === "interview" || entry.stage === "offer"),
		);
		return applied && replied;
	}).length;
}

// ---- What to do next ----

type ActionKind = "issue" | "followup" | "stale" | "ready";
export type Action = {
	kind: ActionKind;
	applicationId: string;
	company: string;
	role: string;
	location: string;
	/** Why it is here, as a code each app turns into words. */
	code: "failed" | "overdue" | "due" | "stale" | "ready";
	/** Which documents are done, and which failed, so the sentence can name them. */
	done: Array<"resume" | "letter">;
	failed: Array<"resume" | "letter">;
	/** Days since the application was sent, and days until (negative: since) the follow-up is due. */
	appliedDaysAgo: number | null;
	followUpInDays: number | null;
};

export type ActionJob = {
	applicationId: string | null;
	company: string;
	role: string;
	summary: "skipped" | "attention" | "generating" | "deferred" | "queued" | "ready";
	steps: Array<{ kind: "resume" | "letter"; status: string; stale: boolean }>;
};

const PRIORITY: Record<ActionKind, number> = { issue: 0, followup: 1, stale: 2, ready: 3 };
const dayDiff = (to: Date, from: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);

/**
 * The things that need a person, most urgent first: a document that failed, a follow-up that is overdue or due soon,
 * drafts that fell out of date, then documents ready to read. A job appears once, as its most urgent reason.
 */
export function nextActions(
	jobs: ActionJob[],
	applications: OverviewApplication[],
	now: Date,
	followUpWindowDays = 3,
): Action[] {
	const byId = new Map(applications.map((application) => [application.id, application]));
	const seen = new Set<string>();
	const out: Action[] = [];
	const base = (id: string, company: string, role: string) => {
		const application = byId.get(id);
		return {
			applicationId: id,
			company,
			role,
			location: application?.location ?? "",
			appliedDaysAgo: application?.appliedAt ? Math.max(0, dayDiff(now, application.appliedAt)) : null,
			followUpInDays: application?.followUpAt ? dayDiff(application.followUpAt, now) : null,
		};
	};
	const push = (action: Action) => {
		if (seen.has(action.applicationId)) return;
		seen.add(action.applicationId);
		out.push(action);
	};
	const kinds = (job: ActionJob, status: string) =>
		job.steps.filter((step) => step.status === status).map((step) => step.kind);

	for (const job of jobs) {
		if (!job.applicationId || job.summary !== "attention") continue;
		push({
			...base(job.applicationId, job.company, job.role),
			kind: "issue",
			code: "failed",
			done: kinds(job, "done"),
			failed: kinds(job, "failed"),
		});
	}
	for (const application of applications) {
		if (application.status === "closed" || !application.followUpAt) continue;
		const days = dayDiff(application.followUpAt, now);
		if (days > followUpWindowDays) continue;
		push({
			...base(application.id, application.company, application.role),
			kind: "followup",
			code: days < 0 ? "overdue" : "due",
			done: [],
			failed: [],
		});
	}
	for (const job of jobs) {
		if (!job.applicationId || job.summary !== "ready") continue;
		const stale = job.steps.some((step) => step.stale);
		push({
			...base(job.applicationId, job.company, job.role),
			kind: stale ? "stale" : "ready",
			code: stale ? "stale" : "ready",
			done: kinds(job, "done"),
			failed: [],
		});
	}
	return out.toSorted(
		(a, b) =>
			PRIORITY[a.kind] - PRIORITY[b.kind] ||
			(a.kind === "followup" ? (a.followUpInDays ?? 0) - (b.followUpInDays ?? 0) : 0),
	);
}
