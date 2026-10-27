import type { JobPosting } from "./types";
import type { DiscoveryFilters } from "@reactive-resume/schema/career";
import { describe, expect, it } from "vitest";
import { defaultDiscoveryFilters, discoveryFiltersSchema } from "@reactive-resume/schema/career";
import { boardOf, nameFromSlug } from "./boards";
import { workdayPosted } from "./boards/workday";
import { applyFilters } from "./filter";
import { dateOf, employmentOf, salaryOf, workplaceOf } from "./normalize";
import { decode, elements, text } from "./xml";

const posting = (overrides: Partial<JobPosting> = {}): JobPosting => ({
	source: "greenhouse",
	board: "greenhouse:acme",
	url: "https://job-boards.greenhouse.io/acme/jobs/1",
	title: "Senior Backend Engineer",
	company: "Acme",
	location: "Berlin, Germany",
	workplace: null,
	employment: null,
	salary: null,
	postedAt: null,
	description: "Build APIs in Go.",
	...overrides,
});
const filters = (overrides: Partial<DiscoveryFilters> = {}) => discoveryFiltersSchema.parse(overrides);
const decide = (overrides: Partial<JobPosting>, filter: Partial<DiscoveryFilters>, query = "", searched = true) =>
	applyFilters(posting(overrides), filters(filter), query, searched);

describe("applyFilters", () => {
	it("keeps everything with no filters", () => {
		expect(decide({}, {})).toEqual({ ok: true });
	});

	it("matches titles against any listed phrase", () => {
		expect(decide({}, { titles: ["backend engineer", "platform"] }).ok).toBe(true);
		expect(decide({}, { titles: ["frontend"] })).toEqual({ ok: false, reason: "title" });
	});

	it("checks a whole feed's postings for the query's words, but trusts sources that searched", () => {
		expect(decide({}, {}, "backend go", false).ok).toBe(true);
		expect(decide({}, {}, "data scientist", false)).toEqual({ ok: false, reason: "title" });
		expect(decide({}, {}, "data scientist", true).ok).toBe(true);
	});

	it("rejects excluded title words and companies", () => {
		expect(decide({}, { exclude: ["senior"] })).toEqual({ ok: false, reason: "excluded" });
		expect(decide({}, { excludeCompanies: ["acme"] })).toEqual({ ok: false, reason: "company" });
	});

	it("matches places by any comma part, keeps unknown places and worldwide remote roles", () => {
		expect(decide({}, { locations: ["Berlin"] }).ok).toBe(true);
		expect(decide({ location: "Munich, Germany" }, { locations: ["Hamburg, Germany"] }).ok).toBe(true);
		expect(decide({ location: "Dublin" }, { locations: ["Berlin"] })).toEqual({ ok: false, reason: "location" });
		expect(decide({ location: "" }, { locations: ["Berlin"] }).ok).toBe(true);
		expect(decide({ location: "Anywhere", workplace: "remote" }, { locations: ["Berlin"] }).ok).toBe(true);
	});

	it("filters workplace, employment and age only when the posting says", () => {
		expect(decide({ workplace: "onsite" }, { workplace: ["remote"] })).toEqual({ ok: false, reason: "workplace" });
		expect(decide({ workplace: null }, { workplace: ["remote"] }).ok).toBe(true);
		expect(decide({ employment: "contract" }, { employment: ["full-time"] })).toEqual({
			ok: false,
			reason: "employment",
		});
		const old = new Date(Date.now() - 20 * 86_400_000);
		expect(decide({ postedAt: old }, { postedWithinDays: 14 })).toEqual({ ok: false, reason: "posted" });
		expect(decide({ postedAt: null }, { postedWithinDays: 14 }).ok).toBe(true);
	});

	it("compares salaries a year in the same currency, and hides unknown pay only when asked", () => {
		const minSalary = { amount: 80_000, currency: "EUR", period: "year" } as const;
		expect(decide({ salary: salaryOf(60_000, 70_000, "EUR", "year") }, { minSalary })).toEqual({
			ok: false,
			reason: "salary",
		});
		expect(decide({ salary: salaryOf(7_000, null, "EUR", "month") }, { minSalary }).ok).toBe(true);
		expect(decide({ salary: salaryOf(40, null, "EUR", "hour") }, { minSalary }).ok).toBe(true);
		// Another currency can't be compared, so it passes.
		expect(decide({ salary: salaryOf(50_000, null, "USD", "year") }, { minSalary }).ok).toBe(true);
		expect(decide({ salary: null }, { minSalary }).ok).toBe(true);
		expect(decide({ salary: null }, { minSalary, hideUnknownSalary: true })).toEqual({ ok: false, reason: "salary" });
	});
});

describe("defaultDiscoveryFilters", () => {
	it("reads target roles, places, fully remote and minimum pay from Preferences", () => {
		expect(
			defaultDiscoveryFilters({
				targetRoles: ["Backend Engineer"],
				locations: ["Berlin"],
				maxOfficeDays: 0,
				minBase: { amount: 90_000, currency: "EUR", period: "year" },
			}),
		).toMatchObject({
			titles: ["Backend Engineer"],
			locations: ["Berlin"],
			workplace: ["remote"],
			minSalary: { amount: 90_000, currency: "EUR", period: "year" },
		});
	});
});

describe("boardOf", () => {
	it.each([
		["https://boards.greenhouse.io/stripe/jobs/123", "greenhouse", "stripe"],
		["https://job-boards.greenhouse.io/anthropic", "greenhouse", "anthropic"],
		["https://boards.greenhouse.io/embed/job_board?for=acme", "greenhouse", "acme"],
		["https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd", "lever", "palantir"],
		["https://jobs.eu.lever.co/acme", "lever", "eu/acme"],
		["https://jobs.ashbyhq.com/ramp/34413f8d", "ashby", "ramp"],
		["https://apply.workable.com/huggingface/", "workable", "huggingface"],
		["https://jobs.smartrecruiters.com/Visa/744000", "smartrecruiters", "Visa"],
		["https://bunq.recruitee.com/o/head-of-product", "recruitee", "bunq"],
		["https://personio.jobs.personio.de/job/1834171", "personio", "personio"],
		["https://acme.jobs.personio.com/", "personio", "acme.com"],
		[
			"https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/X_JR1",
			"workday",
			"nvidia/wd5/NVIDIAExternalCareerSite",
		],
		["https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", "workday", "nvidia/wd5/NVIDIAExternalCareerSite"],
	])("%s is %s board %s", (url, kind, slug) => {
		expect(boardOf(url)).toEqual({ kind, slug });
	});

	it.each([
		"https://example.com/careers",
		"https://apply.workable.com/j/81B46579FE",
		"https://boards.greenhouse.io/embed/job_board?for=../../internal",
		"https://boards.greenhouse.io/a%2F..%2Fb",
		"https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/site/jobs",
		"not a url",
		"file:///etc/passwd",
	])("ignores %s", (url) => {
		expect(boardOf(url)).toBeNull();
	});

	it("names a company from its board", () => {
		expect(nameFromSlug("acme-corp")).toBe("Acme Corp");
		expect(nameFromSlug("eu/acme")).toBe("Acme");
		expect(nameFromSlug("nvidia/wd5/NVIDIAExternalCareerSite")).toBe("Nvidia");
	});
});

describe("normalizing", () => {
	it("reads employment in the spellings sources use", () => {
		expect(employmentOf("FullTime")).toBe("full-time");
		expect(employmentOf("fulltime_permanent")).toBe("full-time");
		expect(employmentOf("Part Time")).toBe("part-time");
		expect(employmentOf("Contractor")).toBe("contract");
		expect(employmentOf("Intern")).toBe("internship");
		expect(employmentOf("Teilzeit")).toBe("part-time");
		expect(employmentOf("permanent")).toBeNull();
	});

	it("prefers explicit workplace flags, then the title and place", () => {
		expect(workplaceOf({ remote: true, hybrid: true })).toBe("hybrid");
		expect(workplaceOf({ onsite: true })).toBe("onsite");
		expect(workplaceOf({}, "Engineer (Remote)")).toBe("remote");
		expect(workplaceOf({}, "Engineer", "Berlin")).toBeNull();
	});

	it("reads seconds, milliseconds and ISO dates, rejecting far-future ones", () => {
		expect(dateOf(1792528843)?.toISOString()).toBe("2026-10-20T20:40:43.000Z");
		expect(dateOf(1786469891368)?.getUTCFullYear()).toBe(2026);
		expect(dateOf("2026-10-21")?.toISOString()).toBe("2026-10-21T00:00:00.000Z");
		expect(dateOf(Date.now() + 10 * 86_400_000)).toBeNull();
		expect(dateOf("garbage")).toBeNull();
	});

	it("reads Workday's relative dates", () => {
		const now = Date.UTC(2026, 9, 23);
		expect(workdayPosted("Posted Today", now)?.getTime()).toBe(now);
		expect(workdayPosted("Posted Yesterday", now)?.getTime()).toBe(now - 86_400_000);
		expect(workdayPosted("Posted 30+ Days Ago", now)?.getTime()).toBe(now - 30 * 86_400_000);
		expect(workdayPosted("soon", now)).toBeNull();
	});

	it("extracts flat XML elements, CDATA and entities", () => {
		const xml = "<a><item><t>x &amp; y</t></item><itemized>no</itemized><item><t><![CDATA[<b>z</b>]]></t></item></a>";
		expect(elements(xml, "item")).toHaveLength(2);
		expect(elements(xml, "item").map((item) => text(item, "t"))).toEqual(["x & y", "<b>z</b>"]);
		expect(decode("&#9999999;&lt;")).toBe("<");
	});
});
