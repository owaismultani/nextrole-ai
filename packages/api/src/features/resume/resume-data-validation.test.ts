import { describe, expect, it } from "vitest";
import { set } from "es-toolkit/compat";
import { SEMANTIC_CSS_LIMITS_V1 } from "@reactive-resume/resume/stylesheet";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { parseWritableResumeData } from "./resume-data-validation";

describe("parseWritableResumeData", () => {
	it("rejects stylesheet source above the Semantic CSS byte limit", () => {
		const data = structuredClone(defaultResumeData);
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "x".repeat(SEMANTIC_CSS_LIMITS_V1.maxSourceBytes + 1) },
		};

		expect(() => parseWritableResumeData(data)).toThrowError(
			expect.objectContaining({ code: "BAD_REQUEST", status: 400 }),
		);
	});
});

const invalidBounds = [
	["metadata.template", "unknown-template"],
	["metadata.page.format", "a3"],
	["metadata.page.marginX", 500],
	["metadata.typography.body.fontSize", 999],
	["metadata.typography.body.fontWeights", ["950"]],
	["metadata.layout.sidebarWidth", 51],
	["summary.columns", 7],
	["sections.experience.columns", 1.5],
	["sections.skills.items.0.level", 6],
] as const;

describe("strict write bounds", () => {
	it.each(invalidBounds)("rejects %s instead of applying a fallback", (path, value) => {
		const data = structuredClone(sampleResumeData);
		set(data, path, value);
		expect(() => parseWritableResumeData(data)).toThrowError(
			expect.objectContaining({ code: "BAD_REQUEST", status: 400 }),
		);
	});

	it("preserves defaults for omitted fields from older clients", () => {
		const data = structuredClone(defaultResumeData);
		Reflect.deleteProperty(data.summary, "keepTogether");
		Reflect.deleteProperty(data.metadata.page, "hideSectionIcons");
		Reflect.deleteProperty(data.metadata.typography.body, "fontSize");
		expect(parseWritableResumeData(data)).toMatchObject({
			summary: { keepTogether: false },
			metadata: { page: { hideSectionIcons: true }, typography: { body: { fontSize: 11 } } },
		});
	});
});
