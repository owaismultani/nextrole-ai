import type { CareerRunReport } from "./career";
import { describe, expect, it } from "vitest";
import {
	cadenceOf,
	diagnoseRun,
	EVERY_VALUES,
	everyOf,
	rollForwardMinutes,
	runStateOf,
	workspaceAction,
	type WorkspaceActionInput,
} from "./career-run";

const report = (patch: Partial<CareerRunReport> = {}): CareerRunReport => ({
	outcome: "success",
	failure: null,
	trigger: "schedule",
	at: "2026-10-19T10:00:00.000Z",
	queries: ["designer job posting"],
	provider: "tavily",
	sources: ["example.com"],
	found: 6,
	duplicates: 2,
	rejected: 1,
	matches: 3,
	readFailures: 0,
	...patch,
});

describe("cadence", () => {
	it("round-trips every offered option, keeping daily as days", () => {
		for (const every of EVERY_VALUES) expect(everyOf(cadenceOf(every))).toBe(every);
		expect(cadenceOf("d1")).toEqual({ intervalDays: 1, intervalMinutes: null });
		expect(cadenceOf("m360")).toEqual({ intervalDays: null, intervalMinutes: 360 });
	});

	it("reads an existing daily schedule as daily, and falls back to daily for unknown values", () => {
		expect(everyOf({ intervalDays: 1, intervalMinutes: null })).toBe("d1");
		expect(everyOf({ intervalDays: null, intervalMinutes: null })).toBe("d1");
		expect(cadenceOf("nonsense")).toEqual({ intervalDays: 1, intervalMinutes: null });
		expect(cadenceOf("d14")).toEqual({ intervalDays: 14, intervalMinutes: null });
	});

	it("rolls hours forward on a fixed gap, never into the past", () => {
		const at = new Date("2026-10-19T08:00:00Z");
		expect(rollForwardMinutes(at, 180, new Date("2026-10-19T07:00:00Z"))).toBe(at);
		expect(rollForwardMinutes(at, 180, new Date("2026-10-19T12:00:00Z")).toISOString()).toBe(
			"2026-10-19T14:00:00.000Z",
		);
	});
});

describe("telling a quiet schedule from a broken one", () => {
	it("blames the search when it did not run", () => {
		expect(diagnoseRun(report({ outcome: "failed", failure: "search", found: 0 }))).toBe("search");
	});

	it("blames page reading when every result was found but unreadable", () => {
		expect(diagnoseRun(report({ outcome: "failed", failure: "extraction", readFailures: 6, matches: 0 }))).toBe(
			"extraction",
		);
		expect(diagnoseRun(report({ outcome: "failed", failure: "unknown" }))).toBe("stopped");
	});

	it("calls a run with some unreadable pages partial", () => {
		expect(diagnoseRun(report({ outcome: "partial", readFailures: 2 }))).toBe("partial");
	});

	it("blames repeated results, not scheduling, when everything was already known", () => {
		expect(diagnoseRun(report({ found: 4, duplicates: 4, rejected: 0, matches: 0 }))).toBe("repeats");
		expect(diagnoseRun(report({ found: 4, duplicates: 2, rejected: 2, matches: 0 }))).toBe("quiet");
	});

	it("says nothing when new roles were found, and flags an empty search", () => {
		expect(diagnoseRun(report())).toBeNull();
		expect(diagnoseRun(report({ found: 0, duplicates: 0, rejected: 0, matches: 0 }))).toBe("empty");
	});
});

describe("run state", () => {
	const row = (patch: Partial<Parameters<typeof runStateOf>[0]>) => ({
		enabled: true,
		activeRun: null,
		lastRun: null,
		...patch,
	});

	it("puts a run in progress before everything else, then paused, then the last outcome", () => {
		expect(runStateOf(row({ activeRun: "running", enabled: false }))).toBe("running");
		expect(runStateOf(row({ activeRun: "queued" }))).toBe("queued");
		expect(runStateOf(row({ enabled: false, lastRun: report() }))).toBe("paused");
		expect(runStateOf(row({}))).toBe("never");
		expect(runStateOf(row({ lastRun: report() }))).toBe("succeeded");
		expect(runStateOf(row({ lastRun: report({ outcome: "partial" }) }))).toBe("partial");
		expect(runStateOf(row({ lastRun: report({ outcome: "failed", failure: "search" }) }))).toBe("failed");
	});
});

describe("the one thing an application needs", () => {
	const base: WorkspaceActionInput = {
		status: "saved",
		preparation: "none",
		interviewUpcoming: false,
		followUpDue: false,
		hasOffer: false,
		hasFit: true,
	};
	const action = (patch: Partial<WorkspaceActionInput>) => workspaceAction({ ...base, ...patch });

	it("fixes documents that stopped before anything else", () => {
		expect(action({ preparation: "attention", interviewUpcoming: true, status: "interview" })).toEqual({
			kind: "resolve-missing",
			tab: "documents",
		});
	});

	it("keeps document preparation separate from the stage", () => {
		expect(action({ preparation: "ready" })).toEqual({ kind: "review-documents", tab: "documents" });
		// Once applied, ready documents are history, not the next thing to do.
		expect(action({ preparation: "ready", status: "applied" }).kind).toBe("none");
	});

	it("follows the situation: interview, follow-up, offer, fit", () => {
		expect(action({ status: "interview", interviewUpcoming: true })).toEqual({
			kind: "prepare-interview",
			tab: "interviews",
			section: "prepare",
		});
		expect(action({ status: "applied", followUpDue: true })).toEqual({ kind: "follow-up", tab: "messages" });
		expect(action({ status: "offer" }).kind).toBe("add-offer");
		expect(action({ status: "offer", hasOffer: true }).kind).toBe("review-offer");
		expect(action({ hasFit: false }).kind).toBe("check-fit");
	});

	it("asks nothing of a closed application", () => {
		expect(action({ status: "closed", preparation: "attention", followUpDue: true }).kind).toBe("none");
	});
});
