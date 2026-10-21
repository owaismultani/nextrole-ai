import type { OverviewApplication } from "./overview-logic";
import type { CareerRunReport } from "@reactive-resume/schema/career";
import { describe, expect, it } from "vitest";
import { discoveryHealth, reachedSince, sumReports, upcomingInterviews } from "./overview-logic";

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

	it("flags repeating results only after five completed runs that found nothing new but saw known jobs", () => {
		const quiet = report({ matches: 0, duplicates: 4 });
		expect(discoveryHealth([quiet, quiet, quiet, quiet]).repeating).toBe(false);
		expect(discoveryHealth([quiet, quiet, quiet, quiet, quiet]).repeating).toBe(true);
		expect(discoveryHealth([quiet, quiet, quiet, quiet, report()]).repeating).toBe(false);
		// An empty search is a different problem from repeated results.
		const empty = report({ matches: 0, duplicates: 0, found: 0 });
		expect(discoveryHealth([empty, empty, empty, empty, empty]).repeating).toBe(false);
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
