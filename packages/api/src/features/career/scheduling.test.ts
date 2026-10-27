import { describe, expect, it } from "vitest";
import {
	advanceRun,
	canonicalOpportunityUrl,
	nextCareerRun,
	parseListingTitle,
	plainSnippet,
	prepareRunAt,
} from "./scheduling";

describe("career schedule recurrence", () => {
	it.each([
		{
			name: "spring clock change",
			previous: "2026-03-28T08:00:00Z",
			days: 1,
			expected: "2026-03-29T07:00:00.000Z",
		},
		{
			name: "autumn clock change",
			previous: "2026-10-24T07:00:00Z",
			days: 1,
			expected: "2026-10-25T08:00:00.000Z",
		},
		{
			name: "weekly interval crossing a clock change",
			previous: "2026-03-28T08:00:00Z",
			days: 7,
			expected: "2026-04-04T07:00:00.000Z",
		},
	])("keeps Berlin's 09:00 wall time through $name", ({ previous, days, expected }) => {
		expect(nextCareerRun(new Date(previous), days, "Europe/Berlin").toISOString()).toBe(expected);
	});

	it("moves a nonexistent Berlin 02:30 forward to 03:30 on the spring transition", () => {
		expect(nextCareerRun(new Date("2026-03-28T01:30:00Z"), 1, "Europe/Berlin").toISOString()).toBe(
			"2026-03-29T01:30:00.000Z",
		);
	});
});

describe("advancing a repeating schedule", () => {
	const hourly = { intervalDays: null, intervalMinutes: 60, timezone: "Europe/Berlin" };

	it("steps a minute interval by its fixed gap", () => {
		const now = new Date("2026-10-19T10:30:00Z");
		expect(advanceRun(new Date("2026-10-19T10:00:00Z"), hourly, now).toISOString()).toBe("2026-10-19T11:00:00.000Z");
		expect(advanceRun(new Date("2026-10-19T10:00:00Z"), { ...hourly, intervalMinutes: 180 }, now).toISOString()).toBe(
			"2026-10-19T13:00:00.000Z",
		);
	});

	it("coalesces an outage into the next future slot, on the original cadence", () => {
		const now = new Date("2026-10-19T15:20:00Z");
		expect(advanceRun(new Date("2026-10-19T08:00:00Z"), { ...hourly, intervalMinutes: 360 }, now).toISOString()).toBe(
			"2026-10-19T20:00:00.000Z",
		);
	});

	it("moves a due slot to the following one rather than repeating it", () => {
		const at = new Date("2026-10-19T10:00:00Z");
		expect(advanceRun(at, hourly, at).toISOString()).toBe("2026-10-19T11:00:00.000Z");
	});

	it("keeps wall time for day intervals, including through a clock change", () => {
		const daily = { intervalDays: 1, intervalMinutes: null, timezone: "Europe/Berlin" };
		expect(advanceRun(new Date("2026-10-24T07:00:00Z"), daily, new Date("2026-10-24T08:00:00Z")).toISOString()).toBe(
			"2026-10-25T08:00:00.000Z",
		);
		expect(advanceRun(new Date("2026-10-23T07:00:00Z"), daily, new Date("2026-10-25T12:00:00Z")).toISOString()).toBe(
			"2026-10-26T08:00:00.000Z",
		);
	});

	it("leaves a one-off schedule alone", () => {
		const at = new Date("2026-10-19T10:00:00Z");
		expect(advanceRun(at, { intervalDays: null, intervalMinutes: null, timezone: "UTC" }, new Date())).toBe(at);
	});
});

describe("opportunity URL identity", () => {
	it("deduplicates tracking variants while retaining query parameters that identify the job", () => {
		const expected = "https://jobs.example.com/opening?jobId=ACME-42&location=Berlin";
		expect(
			canonicalOpportunityUrl(
				"https://JOBS.example.com:443/opening?utm_source=email&location=Berlin&jobId=ACME-42&fbclid=click&gclid=ad#apply",
			),
		).toBe(expected);
		expect(
			canonicalOpportunityUrl("https://jobs.example.com/opening?jobId=ACME-42&utm_campaign=weekly&location=Berlin"),
		).toBe(expected);
		expect(canonicalOpportunityUrl("https://jobs.example.com/opening?jobId=ACME-43&location=Berlin")).toBe(
			"https://jobs.example.com/opening?jobId=ACME-43&location=Berlin",
		);
		expect(
			canonicalOpportunityUrl(
				"https://www.linkedin.com/jobs/view/designer-at-lumen-42?refId=a&trackingId=b&position=3",
			),
		).toBe("https://www.linkedin.com/jobs/view/designer-at-lumen-42");
	});

	it.each([
		"not a URL",
		"javascript:alert(1)",
		"file:///etc/passwd",
		"https://user:password@jobs.example.com/role",
		"http://localhost/role",
		"http://127.0.0.1/role",
		"http://10.0.0.1/role",
		"http://[::1]/role",
		"https://jobs.internal/role",
		"https://jobs.internal./role",
		"https://router.home.arpa/role",
	])("rejects unsafe or malformed opportunity URL %s", (url) => {
		expect(canonicalOpportunityUrl(url)).toBeNull();
	});
});

describe("listing titles", () => {
	it.each([
		["Reliability engineer at ACME", "ACME"],
		["Reliability engineer - ACME | LinkedIn", "ACME"],
		["ACME: Reliability engineer", "ACME"],
		["Reliability engineer", ""],
	])("reads %s", (title, company) => {
		expect(parseListingTitle(title)).toEqual({ role: "Reliability engineer", company });
	});
});

describe("briefing run time", () => {
	it.each([
		{
			name: "Berlin spring clock change",
			interview: "2026-03-29T12:00:00Z",
			zone: "Europe/Berlin",
			expected: "2026-03-29T06:00:00.000Z",
		},
		{
			name: "Berlin autumn clock change",
			interview: "2026-10-25T12:00:00Z",
			zone: "Europe/Berlin",
			expected: "2026-10-25T07:00:00.000Z",
		},
		{
			// Los Angeles switches at 02:00 local, after 08:00 UTC: the offset must be read at 08:00 local.
			name: "Los Angeles spring clock change",
			interview: "2026-03-08T20:00:00Z",
			zone: "America/Los_Angeles",
			expected: "2026-03-08T15:00:00.000Z",
		},
		{
			name: "Tokyo, a day ahead of UTC",
			interview: "2026-10-09T03:00:00Z",
			zone: "Asia/Tokyo",
			expected: "2026-10-08T23:00:00.000Z",
		},
		{
			name: "an interview at 07:30, which gets it 2 hours before instead",
			interview: "2026-10-08T05:30:00Z",
			zone: "Europe/Berlin",
			expected: "2026-10-08T03:30:00.000Z",
		},
	])("runs a morning briefing at 08:00 local on the interview day: $name", ({ interview, zone, expected }) => {
		expect(prepareRunAt(new Date(interview), "morning", zone).toISOString()).toBe(expected);
	});
});

describe("discovered roles", () => {
	it("reduces a markdown page excerpt to a short plain summary", () => {
		const page =
			"[**Product Manager - B2B SaaS** \\ Remote](https://jobs.example.com/1) ![logo](https://cdn.example.com/a.png) # Apply now";
		expect(plainSnippet(page)).toBe("Product Manager - B2B SaaS Remote Apply now");
		expect(plainSnippet("word ".repeat(200)).length).toBeLessThanOrEqual(321);
	});
});
