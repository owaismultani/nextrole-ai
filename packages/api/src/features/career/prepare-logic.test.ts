import { describe, expect, it } from "vitest";
import { summarizePreparation } from "@reactive-resume/schema/career-run";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { freshnessSince } from "./automation";
import {
	applyTailoring,
	classifyFailure,
	dayKey,
	MAX_ATTEMPTS,
	nextDayStart,
	paragraphsToHtml,
	retryAfterMs,
} from "./prepare-logic";

describe("tailoring a copy of the resume", () => {
	const baseline = structuredClone(sampleResumeData);
	const first = baseline.sections.experience.items[0];
	if (!first) throw new Error("The sample resume needs an experience entry.");

	it("changes only the summary, experience wording and skill order", () => {
		const skills = baseline.sections.skills.items;
		const reversed = skills.map((item) => item.id).reverse();
		const { data, issues } = applyTailoring(baseline, {
			summary: "<p>Focused on reliability.</p>",
			experience: [{ id: first.id, description: "<p>Reworded without new facts.</p>" }],
			skillOrder: reversed,
		});
		expect(issues).toEqual([]);
		expect(data.summary.content).toBe("<p>Focused on reliability.</p>");
		const item = data.sections.experience.items[0];
		expect(item?.description).toBe("<p>Reworded without new facts.</p>");
		expect(item).toMatchObject({ company: first.company, position: first.position, period: first.period });
		expect(data.sections.skills.items.map((skill) => skill.id)).toEqual(reversed);
		expect(data.sections.education).toEqual(baseline.sections.education);
		expect(baseline.sections.experience.items[0]?.description).toBe(first.description);
	});

	it("drops a rewrite that introduces a figure the resume never had", () => {
		const { data, issues } = applyTailoring(baseline, {
			summary: "<p>Improved revenue by 4711%.</p>",
			experience: [{ id: first.id, description: "<p>Cut costs by 98765 euros.</p>" }],
			skillOrder: [],
		});
		expect(data.summary.content).toBe(baseline.summary.content);
		expect(data.sections.experience.items[0]?.description).toBe(first.description);
		expect(issues).toHaveLength(2);
	});

	it("treats digits inside names such as EC2 or OAuth2 as words, not new figures", () => {
		const { data, issues } = applyTailoring(baseline, {
			summary: "",
			experience: [{ id: first.id, description: "<p>Deployed services on EC2 and S3 behind OAuth2.</p>" }],
		});
		expect(data.sections.experience.items[0]?.description).toBe(
			"<p>Deployed services on EC2 and S3 behind OAuth2.</p>",
		);
		expect(issues).toEqual(["No tailored summary was produced, so your original summary was kept."]);
	});

	it("rewrites project descriptions under the same figure rule", () => {
		const [project, other] = baseline.sections.projects.items;
		if (!project || !other) throw new Error("The sample resume needs two projects.");
		const { data, issues } = applyTailoring(baseline, {
			summary: "<p>x</p>",
			projects: [
				{ id: project.id, description: "<p>Reworded project.</p>" },
				{ id: other.id, description: "<p>Reached 123456 players.</p>" },
			],
		});
		expect(data.sections.projects.items[0]).toMatchObject({
			name: project.name,
			description: "<p>Reworded project.</p>",
		});
		expect(data.sections.projects.items[1]?.description).toBe(other.description);
		expect(issues).toEqual([`Kept your original wording for ${other.name}: the rewrite added figures.`]);
	});

	it("reorders a skill's keywords and adds only ones the resume already shows", () => {
		const skill = baseline.sections.skills.items[0];
		if (!skill) throw new Error("The sample resume needs a skill.");
		const { data } = applyTailoring(baseline, {
			summary: "<p>x</p>",
			skillKeywords: [{ id: skill.id, keywords: ["performance profiling", "Unity", "Kubernetes"] }],
		});
		const keywords = data.sections.skills.items.find((item) => item.id === skill.id)?.keywords;
		expect(keywords?.slice(0, 2)).toEqual(["Performance Profiling", "Unity"]);
		expect(keywords).not.toContain("Kubernetes");
		for (const known of skill.keywords) expect(keywords).toContain(known);
	});

	it("lists requirements the resume does not show as issues, without touching the resume", () => {
		const { data, issues } = applyTailoring(baseline, {
			summary: "<p>x</p>",
			unsupported: ["Java", "Next.js"],
		});
		expect(issues).toEqual(["Not in your resume: Java", "Not in your resume: Next.js"]);
		expect(data.sections).toEqual(baseline.sections);
	});

	it("ignores unknown ids and keeps unlisted skills in place", () => {
		const skills = baseline.sections.skills.items;
		const { data } = applyTailoring(baseline, {
			summary: "",
			experience: [{ id: "not-an-entry", description: "<p>x</p>" }],
			skillOrder: ["missing", ...(skills[1] ? [skills[1].id] : [])],
		});
		expect(data.sections.skills.items).toHaveLength(skills.length);
		expect(data.sections.skills.items[0]?.id).toBe(skills[1]?.id);
		expect(data.sections.experience.items.map((item) => item.description)).toEqual(
			baseline.sections.experience.items.map((item) => item.description),
		);
	});
});

describe("letters", () => {
	it("turns plain paragraphs into escaped HTML", () => {
		expect(paragraphsToHtml("Dear <team>\n\nI & you\nsecond line")).toBe(
			"<p>Dear &lt;team&gt;</p><p>I &amp; you<br>second line</p>",
		);
	});
});

describe("failures and backoff", () => {
	const now = Date.parse("2026-10-19T10:00:00Z");

	it("reads Retry-After as seconds or a date, capped at an hour", () => {
		expect(retryAfterMs({ "retry-after": "120" }, now)).toBe(120_000);
		expect(retryAfterMs({ "retry-after": "Mon, 19 Oct 2026 10:05:00 GMT" }, now)).toBe(300_000);
		expect(retryAfterMs({ "retry-after": "999999" }, now)).toBe(3_600_000);
		expect(retryAfterMs({}, now)).toBeNull();
	});

	it("waits longer after each attempt, never less than the provider asks, and gives up after the limit", () => {
		const waits = [1, 2, 3].map(
			(attempt) => classifyFailure({ statusCode: 503 }, attempt, now).retryAt.getTime() - now,
		);
		expect(waits).toEqual([60_000, 120_000, 240_000]);
		const limited = classifyFailure({ statusCode: 429, responseHeaders: { "retry-after": "1800" } }, 1, now);
		expect(limited).toMatchObject({ code: "rate-limit", final: false });
		expect(limited.retryAt.getTime() - now).toBe(1_800_000);
		expect(classifyFailure({ statusCode: 503 }, MAX_ATTEMPTS, now).final).toBe(true);
		expect(classifyFailure(new Error("boom"), 1, now).code).toBe("unknown");
	});
});

describe("the day the daily limit counts", () => {
	it("resets at local midnight, not UTC midnight", () => {
		const at = new Date("2026-10-19T22:30:00Z");
		expect(dayKey(at, "UTC")).toBe("2026-10-19");
		expect(dayKey(at, "Europe/Berlin")).toBe("2026-10-20");
		expect(nextDayStart(at, "UTC").toISOString()).toBe("2026-10-20T00:00:00.000Z");
		expect(nextDayStart(at, "Europe/Berlin").toISOString()).toBe("2026-10-20T22:00:00.000Z");
	});
});

describe("freshness window", () => {
	const last = new Date("2026-10-19T10:00:00Z");

	it("looks back past the last success by at least two hours, or one interval", () => {
		expect(freshnessSince({ intervalMinutes: 60, lastSucceededAt: last })?.toISOString()).toBe(
			"2026-10-19T08:00:00.000Z",
		);
		expect(freshnessSince({ intervalMinutes: 360, lastSucceededAt: last })?.toISOString()).toBe(
			"2026-10-19T04:00:00.000Z",
		);
	});

	it("searches without a date filter for the first run and for daily schedules", () => {
		expect(freshnessSince({ intervalMinutes: 60, lastSucceededAt: null })).toBeUndefined();
		expect(freshnessSince({ intervalMinutes: null, lastSucceededAt: last })).toBeUndefined();
	});
});

describe("document preparation status", () => {
	type Step = Parameters<typeof summarizePreparation>[0][number];
	const step = (kind: Step["kind"], status: Step["status"], error: Step["error"] = null): Step => ({
		kind,
		status,
		error,
	});

	it("is ready only when every requested, non-canceled document succeeded", () => {
		expect(summarizePreparation([step("resume", "done")])).toBe("ready");
		expect(summarizePreparation([step("resume", "done"), step("letter", "canceled")])).toBe("ready");
		expect(summarizePreparation([step("resume", "done"), step("letter", "queued")])).toBe("queued");
	});

	it("is skipped, not ready, when nothing remains requested", () => {
		expect(summarizePreparation([step("resume", "canceled"), step("letter", "canceled")])).toBe("skipped");
		expect(summarizePreparation([])).toBe("skipped");
	});

	it("puts attention first, then generating, then deferred work", () => {
		expect(summarizePreparation([step("resume", "failed"), step("letter", "running")])).toBe("attention");
		expect(summarizePreparation([step("resume", "running"), step("letter", "queued")])).toBe("generating");
		expect(summarizePreparation([step("resume", "queued", "daily-limit")])).toBe("deferred");
		expect(summarizePreparation([step("resume", "done"), step("letter", "queued", "daily-limit")])).toBe("deferred");
	});
});
