import type { OverviewApplication, Stage, StageKey } from "./overview-logic";
import type { CareerRunReport } from "@reactive-resume/schema/career";
import { describe, expect, it } from "vitest";
import {
	discoveryHealth,
	firstResponsesSince,
	nextActions,
	healthChecks,
	reachedSince,
	stageMap,
	sumReports,
	upcomingInterviews,
} from "./overview-logic";

const now = new Date("2026-10-20T12:00:00Z");
const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000);

const application = (patch: Partial<OverviewApplication> & { id: string }): OverviewApplication => ({
	company: "Acme",
	role: "Engineer",
	status: "saved",
	activity: [],
	...patch,
});

const report = (patch: Partial<CareerRunReport> = {}): CareerRunReport => ({
	outcome: "success",
	failure: null,
	trigger: "schedule",
	at: now.toISOString(),
	queries: ["q"],
	provider: "tavily",
	sources: [],
	found: 5,
	duplicates: 2,
	rejected: 0,
	matches: 3,
	readFailures: 0,
	...patch,
});

describe("funnel counts", () => {
	it("counts each application once per stage, only when it reached the stage inside the window", () => {
		const apps = [
			application({
				id: "a",
				activity: [
					{ type: "stage", stage: "saved", at: day(-40) },
					{ type: "stage", stage: "applied", at: day(-5) },
					{ type: "stage", stage: "applied", at: day(-3) },
					{ type: "note", at: day(-2) },
				],
			}),
			application({ id: "b", activity: [{ type: "stage", stage: "applied", at: day(-45) }] }),
			application({ id: "c", activity: [{ type: "stage", stage: "applied", at: day(-1) }] }),
		];
		expect(reachedSince(apps, "applied", day(-30))).toBe(2);
		expect(reachedSince(apps, "saved", day(-30))).toBe(0);
		expect(reachedSince(apps, "offer", day(-30))).toBe(0);
	});
});

describe("upcoming interviews", () => {
	it("lists open applications' interviews in the next week, soonest first", () => {
		const apps = [
			application({
				id: "a",
				company: "Late",
				activity: [{ type: "interview", at: day(5), kind: "onsite" }],
			}),
			application({
				id: "b",
				company: "Soon",
				activity: [
					{ type: "interview", at: day(1), kind: "technical" },
					{ type: "interview", at: day(-1), kind: "screening" },
					{ type: "interview", at: day(20), kind: "other" },
				],
			}),
			application({ id: "c", status: "closed", activity: [{ type: "interview", at: day(2) }] }),
		];
		expect(upcomingInterviews(apps, now).map((item) => [item.company, item.kind])).toEqual([
			["Soon", "technical"],
			["Late", "onsite"],
		]);
	});
});

describe("discovery health", () => {
	it("flags a failing latest run", () => {
		expect(discoveryHealth([report(), report({ outcome: "failed" })]).failing).toBe(true);
		expect(discoveryHealth([report({ outcome: "failed" }), report()]).failing).toBe(false);
	});

	it("flags repeating results only after five completed runs spanning half a day that found nothing new", () => {
		const hour = 3_600_000;
		const at = (index: number, gap: number) => new Date(now.getTime() + index * gap).toISOString();
		const quiet = (index: number, gap: number) => report({ matches: 0, duplicates: 4, at: at(index, gap) });
		const series = (gap: number, count = 5) => Array.from({ length: count }, (_, index) => quiet(index, gap));
		// Five hourly runs span only four hours: too soon to call the search stale.
		expect(discoveryHealth(series(hour)).repeating).toBe(false);
		expect(discoveryHealth(series(6 * hour)).repeating).toBe(true);
		expect(discoveryHealth(series(6 * hour, 4)).repeating).toBe(false);
		expect(discoveryHealth([...series(6 * hour, 4), report({ at: at(4, 6 * hour) })]).repeating).toBe(false);
		// An empty search is a different problem from repeated results.
		const empty = Array.from({ length: 5 }, (_, index) =>
			report({ matches: 0, duplicates: 0, found: 0, at: at(index, 6 * hour) }),
		);
		expect(discoveryHealth(empty).repeating).toBe(false);
	});

	it("totals the window", () => {
		expect(sumReports([report(), report({ outcome: "failed", found: 0, matches: 0, duplicates: 0 })])).toEqual({
			runs: 2,
			failed: 1,
			found: 5,
			matches: 3,
			duplicates: 2,
			rejected: 0,
			readFailures: 0,
		});
	});
});

const idle = { running: 0, queued: 0, deferred: 0, attention: 0, ready: 0, eligibleAt: null };
const schedule = (patch: Partial<NonNullable<Parameters<typeof stageMap>[0]["schedule"]>> = {}) => ({
	enabled: true,
	activeRun: null,
	nextRunAt: new Date(now.getTime() + 600_000),
	...patch,
});
const stages = (patch: Partial<Parameters<typeof stageMap>[0]> = {}) =>
	Object.fromEntries(
		stageMap({
			now,
			schedule: schedule(),
			lastRun: report(),
			documents: { resumes: true, letters: true },
			preparation: idle,
			appliedInWindow: 2,
			...patch,
		}).map((stage) => [stage.key, stage]),
	) as Record<StageKey, Stage>;

describe("the stage map", () => {
	it("walks from the schedule to the person's own steps, and says the last two are theirs", () => {
		const map = stages({ preparation: { ...idle, ready: 3 } });
		expect(map.schedule).toMatchObject({ state: "ok", code: "next" });
		expect(map.search).toMatchObject({ state: "ok", count: 5 });
		expect(map.filter).toMatchObject({ count: 2 });
		expect(map.save).toMatchObject({ state: "ok", count: 3 });
		expect(map.prepare).toMatchObject({ state: "ok", count: 3 });
		expect(map.review).toMatchObject({ state: "yours", count: 3 });
		expect(map.apply).toMatchObject({ state: "yours", count: 2 });
	});

	it("shows paused, running and overdue schedules differently", () => {
		expect(stages({ schedule: null }).schedule).toMatchObject({ state: "off", code: "none" });
		expect(stages({ schedule: schedule({ enabled: false }) }).schedule).toMatchObject({ state: "off", code: "paused" });
		expect(stages({ schedule: schedule({ activeRun: "running" }) }).schedule.state).toBe("running");
		expect(stages({ schedule: schedule({ nextRunAt: new Date(now.getTime() - 3_600_000) }) }).schedule).toMatchObject({
			state: "warn",
			code: "overdue",
		});
	});

	it("places a failure at the step that failed", () => {
		const searchFailed = stages({ lastRun: report({ outcome: "failed", failure: "search", found: 0 }) });
		expect(searchFailed.search.state).toBe("failed");
		expect(searchFailed.read.state).toBe("ok");
		const unreadable = stages({
			lastRun: report({ outcome: "failed", failure: "extraction", readFailures: 5, matches: 0 }),
		});
		expect(unreadable.search.state).toBe("ok");
		expect(unreadable.read).toMatchObject({ state: "failed", count: 5 });
		expect(stages({ lastRun: report({ outcome: "partial", readFailures: 2 }) }).read).toMatchObject({
			state: "warn",
			count: 2,
		});
		expect(stages({ lastRun: null }).search.state).toBe("idle");
	});

	it("reports document preparation as off, running, waiting for the limit, or needing attention", () => {
		const eligibleAt = new Date(now.getTime() + 3_600_000);
		expect(stages({ documents: { resumes: false, letters: false } }).prepare.state).toBe("off");
		expect(stages({ preparation: { ...idle, running: 1, queued: 2 } }).prepare.state).toBe("running");
		expect(stages({ preparation: { ...idle, attention: 1, deferred: 1 } }).prepare.state).toBe("failed");
		expect(stages({ preparation: { ...idle, deferred: 2, eligibleAt } }).prepare).toMatchObject({
			state: "waiting",
			code: "limit",
			at: eligibleAt,
		});
		expect(stages({ preparation: { ...idle, queued: 1 } }).prepare).toMatchObject({ state: "waiting", code: "queued" });
	});
});

describe("the health checklist", () => {
	const base = {
		now,
		schedule: schedule() as ReturnType<typeof schedule> | null,
		lastRun: report(),
		repeating: false,
		searchConnected: true,
		aiConnected: true,
		documents: { resumes: true, letters: false, hasBaseline: true, used: 3, limit: 10 },
	};
	const statuses = (patch: Partial<typeof base> = {}) =>
		Object.fromEntries(healthChecks({ ...base, ...patch }).map((check) => [check.key, check.status]));

	it("passes when everything is connected and running", () => {
		expect(Object.values(statuses()).every((status) => status === "ok")).toBe(true);
		expect(healthChecks(base).find((check) => check.key === "limit")?.value).toBe(7);
	});

	it("names what is missing, and only asks about documents when they are wanted", () => {
		expect(statuses({ searchConnected: false }).search).toBe("fail");
		expect(statuses({ aiConnected: false }).ai).toBe("fail");
		expect(statuses({ documents: { ...base.documents, hasBaseline: false } }).baseline).toBe("fail");
		const noDocuments = statuses({ documents: { ...base.documents, resumes: false } });
		expect(noDocuments).not.toHaveProperty("ai");
		expect(noDocuments).not.toHaveProperty("limit");
	});

	it("warns about a reached limit, an overdue run, a partial run and repeating results", () => {
		expect(statuses({ documents: { ...base.documents, used: 10 } }).limit).toBe("warn");
		expect(statuses({ schedule: schedule({ nextRunAt: new Date(now.getTime() - 3_600_000) }) })["next-run"]).toBe(
			"warn",
		);
		expect(statuses({ lastRun: report({ outcome: "partial" }) })["last-run"]).toBe("warn");
		expect(statuses({ lastRun: report({ outcome: "failed" }) })["last-run"]).toBe("fail");
		expect(statuses({ repeating: true }).repeating).toBe("warn");
		expect(statuses({ schedule: schedule({ enabled: false }) }).schedule).toBe("info");
		expect(statuses({ schedule: null }).schedule).toBe("warn");
	});
});

describe("first responses", () => {
	const stage = (name: string, offset: number) => ({ type: "stage", stage: name, at: day(offset) });

	it("counts applications sent in the window that have since heard back, once each", () => {
		const apps = [
			application({ id: "a", activity: [stage("applied", -5), stage("screening", -3), stage("interview", -1)] }),
			application({ id: "b", activity: [stage("applied", -5)] }),
			application({ id: "c", activity: [stage("applied", -40), stage("interview", -30)] }),
			application({ id: "d", activity: [stage("saved", -5), stage("screening", -2)] }),
		];
		expect(firstResponsesSince(apps, day(-30))).toBe(1);
	});
});

describe("what to do next", () => {
	const job = (applicationId: string, summary: "attention" | "ready", steps: Array<[string, string, boolean?]>) => ({
		applicationId,
		company: `Co ${applicationId}`,
		role: "Engineer",
		summary,
		steps: steps.map(([kind, status, stale]) => ({
			kind: kind as "resume" | "letter",
			status,
			stale: stale ?? false,
		})),
	});
	const apps = [
		application({ id: "ready", location: "Toronto", appliedAt: day(-9) }),
		application({ id: "late", status: "applied", appliedAt: day(-9), followUpAt: day(-1) }),
		application({ id: "soon", status: "applied", followUpAt: day(2) }),
		application({ id: "far", status: "applied", followUpAt: day(10) }),
		application({ id: "closed", status: "closed", followUpAt: day(-1) }),
		application({ id: "old" }),
		application({ id: "broken" }),
	];
	const jobs = [
		job("ready", "ready", [
			["resume", "done"],
			["letter", "done"],
		]),
		job("old", "ready", [["resume", "done", true]]),
		job("broken", "attention", [
			["resume", "done"],
			["letter", "failed"],
		]),
	];

	it("orders failed documents, then follow-ups, then stale drafts, then ready documents", () => {
		expect(nextActions(jobs, apps, now).map((action) => [action.applicationId, action.kind, action.code])).toEqual([
			["broken", "issue", "failed"],
			["late", "followup", "overdue"],
			["soon", "followup", "due"],
			["old", "stale", "stale"],
			["ready", "ready", "ready"],
		]);
	});

	it("names what is done and what failed, and how long ago the application was sent", () => {
		const [issue, late, , , ready] = nextActions(jobs, apps, now);
		expect(issue).toMatchObject({ done: ["resume"], failed: ["letter"] });
		expect(late).toMatchObject({ appliedDaysAgo: 9, followUpInDays: -1 });
		expect(ready).toMatchObject({ location: "Toronto", done: ["resume", "letter"] });
	});

	it("leaves out far-off and closed follow-ups, and shows a job once", () => {
		const ids = nextActions([...jobs, job("late", "ready", [["resume", "done"]])], apps, now).map(
			(action) => action.applicationId,
		);
		expect(ids).not.toContain("far");
		expect(ids).not.toContain("closed");
		expect(ids.filter((id) => id === "late")).toHaveLength(1);
	});
});
