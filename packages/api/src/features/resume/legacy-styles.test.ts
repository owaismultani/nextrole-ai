import { describe, expect, it } from "vitest";
import { needsLegacyStyleConversion } from "@reactive-resume/pdf/semantic-legacy";
import { copyCoverLetterStyle } from "@reactive-resume/resume/cover-letter";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { migrateLetterStylesheet, migrateResumeStylesheet } from "./legacy-styles";

const legacy = () => {
	const data = structuredClone(sampleResumeData);
	data.metadata.stylesheet = undefined;
	data.metadata.styleRules = [
		{
			id: "rule-1",
			label: "Teal headings",
			enabled: true,
			target: { scope: "global" },
			slots: { heading: { color: "#0f766e" } },
		},
	];
	return data;
};

describe("needsLegacyStyleConversion", () => {
	it("picks legacy mode, and rules without a stylesheet; leaves semantic and plain resumes alone", () => {
		expect(needsLegacyStyleConversion(legacy().metadata)).toBe(true);
		expect(
			needsLegacyStyleConversion({ stylesheet: { mode: "legacy", source: { languageVersion: 1, text: "" } } }),
		).toBe(true);
		expect(needsLegacyStyleConversion({ stylesheet: { mode: "semantic" }, styleRules: [{}] })).toBe(false);
		expect(needsLegacyStyleConversion({ styleRules: [] })).toBe(false);
		expect(needsLegacyStyleConversion(undefined)).toBe(false);
	});
});

describe("migrateResumeStylesheet", () => {
	it("keeps an unapplied draft from the old editor as a comment after the conversion", () => {
		const data = legacy();
		data.metadata.stylesheet = {
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1;\nname { color: red; } /* note */" },
		};
		const text = migrateResumeStylesheet(data)?.source.text ?? "";

		expect(text.indexOf("color: #0f766e;")).toBeLessThan(text.indexOf("Unapplied draft"));
		expect(text).toContain("name { color: red; } /* note *\\/");
	});

	it("returns null for a resume that needs nothing, and the result needs nothing more", () => {
		expect(migrateResumeStylesheet(defaultResumeData)).toBeNull();
		const data = legacy();
		data.metadata.stylesheet = migrateResumeStylesheet(data) ?? undefined;
		expect(migrateResumeStylesheet(data)).toBeNull();
	});
});

describe("migrateLetterStylesheet", () => {
	it("converts a letter's copy of a legacy-styled resume's style", () => {
		const style = copyCoverLetterStyle(legacy());

		expect(migrateLetterStylesheet(style)?.source.text).toContain("color: #0f766e;");
		expect(migrateLetterStylesheet(copyCoverLetterStyle(defaultResumeData))).toBeNull();
	});
});
