import { describe, expect, it } from "vitest";
import { checkBaseline, suggestQuery } from "./baseline-check";
import { defaultResumeData } from "./resume/default";
import { sampleResumeData } from "./resume/sample";

const failing = (data: Parameters<typeof checkBaseline>[0]) =>
	checkBaseline(data)
		.filter((check) => !check.ok)
		.map((check) => check.key);

describe("baseline completeness", () => {
	it("passes a complete resume", () => {
		expect(failing(structuredClone(sampleResumeData))).toEqual([]);
	});

	it("flags every missing part of an empty resume, without blocking anything", () => {
		expect(failing(structuredClone(defaultResumeData))).toEqual(
			expect.arrayContaining(["name", "email", "summary", "experience", "education", "skills"]),
		);
	});

	it("counts undated and thin experience entries, ignoring hidden ones", () => {
		const data = structuredClone(sampleResumeData);
		const [first] = data.sections.experience.items;
		if (!first) throw new Error("The sample needs an experience entry.");
		const second = { ...structuredClone(first), id: "second-entry" };
		data.sections.experience.items.push(second);
		first.period = "";
		delete first.dates;
		second.description = "<p>Did things</p>";
		const checks = checkBaseline(data);
		expect(checks.find((check) => check.key === "experience-dates")).toMatchObject({ ok: false, count: 1 });
		expect(checks.find((check) => check.key === "experience-detail")).toMatchObject({ ok: false, count: 1 });
		first.hidden = true;
		expect(checkBaseline(data).find((check) => check.key === "experience-dates")?.ok).toBe(true);
	});

	it("suggests a search from the headline and location", () => {
		const data = structuredClone(sampleResumeData);
		data.basics.headline = "Senior Software Engineer";
		data.basics.location = "Toronto, Canada";
		expect(suggestQuery(data)).toBe("Senior Software Engineer Toronto, Canada");
		data.basics.location = "";
		expect(suggestQuery(data)).toBe("Senior Software Engineer");
	});
});
